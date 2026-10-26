"""wslc student runtime; optional privilege reductions remain enabled for Linux CI."""

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import uuid


class Blocked(RuntimeError):
    """The requested runtime cannot establish the exercise's existing safety contract."""


REQUIRED_OPTIONS = {"--rm", "--name", "--network", "--mount", "--workdir", "--user"}
DOCKER_PRIVILEGE_OPTIONS = {"--cap-drop", "--security-opt"}


def cli_text(data):
    """Decode Windows CLI diagnostics, never container HTML/stdout payload bytes."""
    encoding = "utf-16" if data.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-16-le" if b"\0" in data[:100] else "utf-8-sig"
    return data.decode(encoding).replace("\r\r\n", "\n").strip()


def json_rows(data):
    text = cli_text(data)
    if not text:
        raise ValueError("Empty CLI response is not proof of an empty container list")
    try:
        value = json.loads(text)
        rows = value if isinstance(value, list) else [value]
    except json.JSONDecodeError:
        rows = [json.loads(line) for line in text.splitlines() if line.strip()]
    if not all(isinstance(row, dict) for row in rows):
        raise ValueError("Expected container CLI JSON objects")
    return rows


def version_tuple(text):
    match = re.search(r"\b(\d+)\.(\d+)\.(\d+)(?:\.\d+)?\b", text)
    if not match:
        raise Blocked("Runtime version could not be identified")
    return tuple(map(int, match.groups()))


def check_process_security(data, *, require_reduced_privileges=False):
    """Check effective Linux process controls in addition to the requested CLI flags."""
    status = json.loads(data.decode("utf-8"))
    for field in ("CapEff", "CapBnd"):
        if not isinstance(status.get(field), str) or not re.fullmatch(r"[0-9a-fA-F]+", status[field]):
            raise Blocked(f"Container {field} could not be recorded")
        if require_reduced_privileges and int(status[field], 16) != 0:
            raise Blocked(f"Container {field} is not zero")
    uids = status.get("Uid", "").split()
    if len(uids) != 4 or not all(uid.isdecimal() and int(uid) > 0 for uid in uids):
        raise Blocked("Container must run as a non-root UID")
    if status.get("NoNewPrivs") not in {"0", "1"}:
        raise Blocked("Container NoNewPrivs could not be recorded")
    if require_reduced_privileges and status["NoNewPrivs"] != "1":
        raise Blocked("Linux Docker CI requires NoNewPrivs=1")
    if set(status.get("interfaces", ["UNKNOWN"])) != {"lo"}:
        raise Blocked("Container network is not limited to loopback")
    return status


SECURITY_PROBE = """$s = file_get_contents('/proc/self/status'); $r = []; foreach (['Uid', 'CapEff', 'CapBnd', 'NoNewPrivs'] as $k) { if (preg_match('/^' . $k . ':\\s*(.+)$/m', $s, $m)) $r[$k] = trim($m[1]); } $r['interfaces'] = array_map('basename', glob('/sys/class/net/*')); echo json_encode($r);"""


class ContainerRuntime:
    def __init__(self, kind="wslc", *, runner=None, which=None, platform=None):
        self.kind = kind
        self.runner = runner or subprocess.run
        self.which = which or shutil.which
        self.platform = platform or sys.platform
        self.prefix = None
        self.report = {"runtime": kind, "ready": False}

    def call(self, args, timeout=20):
        try:
            return self.runner(args, capture_output=True, timeout=timeout)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise Blocked(f"CLI unavailable or timed out: {args[0]}: {error}") from error

    def checked(self, args, timeout=20):
        result = self.call(args, timeout)
        if result.returncode:
            raise Blocked(f"CLI failed ({result.returncode}): {cli_text(result.stderr or result.stdout)}")
        return result.stdout

    def probe(self):
        if self.kind == "wslc":
            if self.platform != "win32":
                raise Blocked("Use Windows PowerShell and wslc.exe for the student runtime")
            executable = self.which("wslc.exe") or self.which("wslc")
            if not executable:
                raise Blocked("wslc.exe is unavailable; WSL update/install requires approval")
            wsl = self.which("wsl.exe") or self.which("wsl")
            if not wsl:
                raise Blocked("wsl.exe is unavailable; do not install automatically")
            wsl_version = cli_text(self.checked([wsl, "--version"]))
            cli_version = cli_text(self.checked([executable, "version"]))
            self.report.update(wsl_version=wsl_version.splitlines()[0], cli_version=cli_version)
            if min(version_tuple(wsl_version), version_tuple(cli_version)) < (2, 9, 3):
                raise Blocked("WSL and wslc must be 2.9.3+; update requires approval")
            self.prefix = [executable]
        elif self.kind == "docker":
            if self.platform != "linux":
                raise Blocked("Docker is the Linux CI comparison backend, not the Windows student runtime")
            executable = self.which("docker")
            if not executable or str(Path(executable).resolve()).startswith(("/mnt/c/", "/mnt/wsl/")):
                raise Blocked("A native Linux Docker Engine is required for the CI backend")
            self.prefix = [executable, "--host", "unix:///var/run/docker.sock"]
        else:
            raise Blocked("Only wslc (student) and native Linux docker (CI) are supported")
        help_text = cli_text(self.checked([*self.prefix, "run", "--help"]))
        options = set(re.findall(r"(?<![\w-])--[a-z][a-z-]*", help_text))
        required = REQUIRED_OPTIONS | (DOCKER_PRIVILEGE_OPTIONS if self.kind == "docker" else set())
        missing = sorted(required - options)
        self.report.update(executable=executable, run_options=sorted(options), missing_options=missing,
                           privilege_reductions=self.kind == "docker",
                           omitted_options=sorted(DOCKER_PRIVILEGE_OPTIONS) if self.kind == "wslc" else [])
        if missing:
            raise Blocked("Missing required isolation options: " + ", ".join(missing) + "; no container was started")
        if self.kind == "docker":
            self.checked([*self.prefix, "info"])
        self.report["ready"] = True
        return self.report

    def require_ready(self):
        if not self.report["ready"]:
            raise Blocked("Runtime isolation probe must succeed before pull/run")

    def pull(self, image):
        self.require_ready()
        self.checked([*self.prefix, "pull", image], timeout=180)

    def image_digests(self, image):
        self.require_ready()
        rows = json_rows(self.checked([*self.prefix, "image", "inspect", image]))
        digests = [digest for row in rows for digest in row.get("RepoDigests", [])]
        if not digests or not all(isinstance(digest, str) for digest in digests):
            raise Blocked("Image inspect did not provide verifiable RepoDigests")
        return digests

    def run_args(self, work, image, command, name):
        self.require_ready()
        user = "65534:65534" if self.kind == "wslc" else f"{os.getuid()}:{os.getgid()}"
        privilege_args = ["--cap-drop", "ALL", "--security-opt", "no-new-privileges"] if self.kind == "docker" else []
        return [*self.prefix, "run", "--rm", "--name", name, "--network", "none",
                *privilege_args, "--user", user,
                "--mount", f"type=bind,source={work},target=/work", "--workdir", "/work", image, *command]

    def present(self, name):
        # A failed inspect/list is UNKNOWN, not proof that a container is absent.
        data = self.checked([*self.prefix, "container", "list", "--all", "--format", "json", "--filter", f"name={name}"])
        # Both CLIs emit JSON lines and no bytes for a successful zero-row list.
        # checked() already rejects access errors; only successful empty output means absent.
        if not data.strip():
            return False
        try:
            rows = json_rows(data)
        except (ValueError, UnicodeError) as error:
            raise Blocked("Container cleanup status is unknown: invalid list JSON") from error
        for row in rows:
            names = row.get("Names", row.get("Name"))
            if isinstance(names, str):
                names = [names]
            if not isinstance(names, list) or not all(isinstance(item, str) for item in names):
                raise Blocked("Container cleanup status is unknown: missing names")
            if name in [item.lstrip("/") for item in names]:
                return True
        return False

    def cleanup(self, name):
        if self.present(name):
            self.call([*self.prefix, "container", "stop", name], timeout=20)
            if self.present(name):
                self.checked([*self.prefix, "container", "remove", "--force", name])
            if self.present(name):
                raise Blocked(f"Container cleanup failed: {name}")
        print(f"Container {name}: absent; cleanup PASS", file=sys.stderr)

    def run(self, work, image, *command, expected=0):
        name = "hht-php-" + uuid.uuid4().hex
        args = self.run_args(work, image, command, name)
        try:
            result = self.call(args, timeout=45)
            if result.returncode != expected:
                raise RuntimeError(f"Container command exit {result.returncode}, expected {expected}: {cli_text(result.stderr)}")
            if result.stderr:
                print(cli_text(result.stderr), file=sys.stderr)
            return result.stdout  # Preserve raw UTF-8 bytes; do not decode/re-encode HTML.
        finally:
            self.cleanup(name)
