"""Simulated CLI contracts only. These tests do not execute wslc or prove hardware support."""

import json
import subprocess
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from php_container_runtime import Blocked, ContainerRuntime, REQUIRED_OPTIONS, check_process_security, cli_text, json_rows
from run_php_cli import execute, student_source


IMAGE = "docker.io/library/php:8.4.27-cli-bookworm@sha256:" + "a" * 64


class SimulatedCLI:
    def __init__(self, *, options=None, version="99.0.0", wide=False):
        self.options = set(REQUIRED_OPTIONS if options is None else options)
        self.version, self.wide = version, wide
        self.calls = []
        self.containers = []
        self.output = "<p>日本語 &amp; 確認</p>\n".encode()
        self.exit_code = 0
        self.run_timeout = False
        self.list_failure = False
        self.list_bytes = None
        self.stop_failure = False

    def encoded(self, text):
        return text.encode("utf-16-le" if self.wide else "utf-8")

    def __call__(self, args, **kwargs):
        self.calls.append(list(args))
        self.assert_no_shell(kwargs)
        output, error, code = b"", b"", 0
        if args[-1] == "--version" or args[-1] == "version":
            output = self.encoded("WSL バージョン: " + self.version)
        elif args[-2:] == ["run", "--help"]:
            output = self.encoded("\n".join(sorted(self.options)))
        elif "pull" in args:
            pass
        elif "image" in args and "inspect" in args:
            output = self.encoded(json.dumps([{"RepoDigests": [IMAGE.split(":8.4", 1)[0] + "@sha256:" + "a" * 64]}]))
        elif "run" in args:
            name = args[args.index("--name") + 1]
            if self.run_timeout:
                self.containers = [name]
                raise subprocess.TimeoutExpired(args, 45)
            output, code = self.output, self.exit_code
        elif "list" in args:
            if self.list_failure:
                error, code = b"Access denied", 1
            else:
                output = self.list_bytes if self.list_bytes is not None else self.encoded(json.dumps([{"Names": name} for name in self.containers]))
        elif "stop" in args:
            if self.stop_failure:
                code = 1
            else:
                self.containers = [name for name in self.containers if name != args[-1]]
        elif "remove" in args:
            self.containers = [name for name in self.containers if name != args[-1]]
        return subprocess.CompletedProcess(args, code, output, error)

    @staticmethod
    def assert_no_shell(kwargs):
        if kwargs.get("shell"):
            raise AssertionError("Container CLI must not run through a shell")


def simulated_runtime(cli=None):
    cli = cli or SimulatedCLI()
    runtime = ContainerRuntime("wslc", runner=cli, platform="win32", which=lambda name: "C:/Program Files/WSL/" + name)
    return runtime, cli


class AdapterContractTests(unittest.TestCase):
    def test_current_303_help_missing_controls_blocks_before_pull_or_run(self):
        cli = SimulatedCLI(options=REQUIRED_OPTIONS - {"--cap-drop", "--security-opt"}, version="3.0.3", wide=True)
        runtime, _ = simulated_runtime(cli)
        with self.assertRaisesRegex(Blocked, "--cap-drop, --security-opt"):
            runtime.probe()
        self.assertEqual(runtime.report["missing_options"], ["--cap-drop", "--security-opt"])
        self.assertFalse(runtime.report["ready"])
        self.assertFalse(any("pull" in cmd or ("run" in cmd and "--help" not in cmd) for cmd in cli.calls))

    def test_network_alias_does_not_count_as_network_isolation_option(self):
        runtime, _ = simulated_runtime(SimulatedCLI(options=(REQUIRED_OPTIONS - {"--network"}) | {"--network-alias"}))
        with self.assertRaisesRegex(Blocked, "--network"):
            runtime.probe()

    def test_old_wsl_is_blocked_without_update_or_fallback(self):
        runtime, cli = simulated_runtime(SimulatedCLI(version="2.9.2"))
        with self.assertRaisesRegex(Blocked, "update requires approval"):
            runtime.probe()
        self.assertTrue(all("--update" not in command for command in cli.calls))

    def test_missing_wslc_does_not_install_or_try_another_runtime(self):
        cli = SimulatedCLI()
        runtime = ContainerRuntime("wslc", runner=cli, platform="win32", which=lambda name: None)
        with self.assertRaisesRegex(Blocked, "update/install requires approval"):
            runtime.probe()
        self.assertEqual(cli.calls, [])

    def test_permission_denial_stops_without_elevation(self):
        def denied(*args, **kwargs):
            raise PermissionError("Denied")
        runtime = ContainerRuntime("wslc", runner=denied, platform="win32", which=lambda name: name)
        with self.assertRaisesRegex(Blocked, "Denied"):
            runtime.probe()

    def test_unprobed_runtime_cannot_pull_or_run(self):
        runtime, cli = simulated_runtime()
        with self.assertRaises(Blocked):
            runtime.pull(IMAGE)
        with self.assertRaises(Blocked):
            runtime.run_args("C:/work", IMAGE, ["php", "--version"], "test")
        self.assertEqual(cli.calls, [])

    def test_simulated_supported_wslc_keeps_isolation_and_windows_path_as_one_argument(self):
        runtime, _ = simulated_runtime()
        runtime.probe()
        args = runtime.run_args("C:/course files/日本語", IMAGE, ["php", "build.php"], "owned")
        self.assertEqual(args[args.index("--mount") + 1], "type=bind,source=C:/course files/日本語,target=/work")
        for flag, value in [("--network", "none"), ("--cap-drop", "ALL"), ("--security-opt", "no-new-privileges"), ("--user", "65534:65534")]:
            self.assertEqual(args[args.index(flag) + 1], value)
        self.assertEqual(args[-3:], [IMAGE, "php", "build.php"])
        self.assertFalse(set(args) & {"--privileged", "--publish", "-p", "--detach"})

    def test_wslc_stdout_bytes_are_not_reencoded(self):
        runtime, cli = simulated_runtime(SimulatedCLI(wide=True))
        runtime.probe()
        self.assertEqual(runtime.run("C:/work", IMAGE, "php", "build.php", "--stdout"), cli.output)
        self.assertFalse(any("remove" in command for command in cli.calls))

    def test_image_inspection_uses_json_without_docker_template_syntax(self):
        runtime, cli = simulated_runtime(SimulatedCLI(wide=True))
        runtime.probe()
        self.assertTrue(runtime.image_digests(IMAGE)[0].endswith("a" * 64))
        self.assertEqual(cli.calls[-1][-3:], ["image", "inspect", IMAGE])

    def test_cleanup_denial_is_unknown_not_absent(self):
        runtime, cli = simulated_runtime()
        runtime.probe()
        cli.list_failure = True
        with self.assertRaisesRegex(Blocked, "Access denied"):
            runtime.cleanup("owned")
        self.assertFalse(any("remove" in command for command in cli.calls))

    def test_cleanup_empty_output_or_unknown_schema_is_not_absence(self):
        for value in (b"", b"[{}]", b"not JSON"):
            with self.subTest(value=value):
                runtime, cli = simulated_runtime()
                runtime.probe()
                cli.list_bytes = value
                with self.assertRaises(Blocked):
                    runtime.cleanup("owned")
                self.assertFalse(any("remove" in command for command in cli.calls))

    def test_cleanup_stops_then_removes_only_owned_name_when_required(self):
        runtime, cli = simulated_runtime()
        runtime.probe()
        cli.containers, cli.stop_failure = ["owned", "someone-elses-container"], True
        runtime.cleanup("owned")
        self.assertEqual(cli.containers, ["someone-elses-container"])
        actions = [command for command in cli.calls if "stop" in command or "remove" in command]
        self.assertEqual([command[-1] for command in actions], ["owned", "owned"])

    def test_failed_command_still_checks_cleanup(self):
        runtime, cli = simulated_runtime()
        runtime.probe()
        cli.exit_code = 7
        with self.assertRaisesRegex(RuntimeError, "exit 7"):
            runtime.run("C:/work", IMAGE, "php", "build.php")
        self.assertIn("list", cli.calls[-1])

    def test_timeout_uses_named_container_cleanup(self):
        runtime, cli = simulated_runtime()
        runtime.probe()
        cli.run_timeout = True
        with self.assertRaisesRegex(Blocked, "timed out"):
            runtime.run("C:/work", IMAGE, "php", "build.php")
        self.assertEqual(cli.containers, [])
        self.assertTrue(any("stop" in command for command in cli.calls))

    def test_docker_ci_keeps_native_socket_and_nonroot_user(self):
        cli = SimulatedCLI()
        runtime = ContainerRuntime("docker", runner=cli, which=lambda name: "/usr/bin/docker", platform="linux")
        runtime.probe()
        with patch("php_container_runtime.os.getuid", return_value=1001, create=True), patch("php_container_runtime.os.getgid", return_value=1001, create=True):
            args = runtime.run_args("/tmp/work", IMAGE, ["php", "--version"], "owned")
        self.assertIn("unix:///var/run/docker.sock", args)
        self.assertEqual(args[args.index("--user") + 1], "1001:1001")

    def test_cli_json_handles_utf16_arrays_and_docker_json_lines(self):
        self.assertEqual(cli_text("wslc 3.0.3.0\r\r\n".encode("utf-16-le")), "wslc 3.0.3.0")
        self.assertEqual(json_rows(b'{"Names":"a"}\n{"Names":"b"}'), [{"Names": "a"}, {"Names": "b"}])

    def test_successful_empty_docker_json_lines_means_no_rows(self):
        cli = SimulatedCLI()
        runtime = ContainerRuntime("docker", runner=cli, which=lambda name: "/usr/bin/docker", platform="linux")
        runtime.probe()
        cli.list_bytes = b""
        self.assertFalse(runtime.present("owned"))

    def test_effective_process_security_requires_all_controls(self):
        valid = {"Uid": "1001 1001 1001 1001", "CapEff": "0000000000000000", "CapBnd": "0000000000000000", "NoNewPrivs": "1", "interfaces": ["lo"]}
        self.assertEqual(check_process_security(json.dumps(valid).encode()), valid)
        for change in ({"CapBnd": "1"}, {"CapEff": "1"}, {"NoNewPrivs": "0"}, {"Uid": "0 0 0 0"}, {"Uid": "1001 1001 0 1001"}, {"interfaces": ["lo", "eth0"]}):
            with self.subTest(change=change), self.assertRaises(Blocked):
                check_process_security(json.dumps(valid | change).encode())


class StudentLauncherContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "student"
        (self.source / "templates").mkdir(parents=True)
        for name in ("hello.php", "data.php", "render.php", "build.php", "templates/index.php"):
            (self.source / name).write_bytes(b"INCOMPLETE STUDENT COPY")
        self.runtime = Mock(spec=ContainerRuntime)
        self.runtime.image_digests.return_value = ["docker.io/library/php@sha256:" + "a" * 64]
        self.secure = json.dumps({"Uid": "65534 65534 65534 65534", "CapEff": "0", "CapBnd": "0", "NoNewPrivs": "1", "interfaces": ["lo"]}).encode()

    def test_mount_guard_rejects_home_and_repository_roots(self):
        from run_php_cli import ROOT
        for path in (Path.home(), ROOT.parent, Path(Path.cwd().anchor)):
            with self.subTest(path=path), self.assertRaises(Blocked):
                student_source(path)
        self.assertEqual(student_source(self.source), self.source.resolve())

    def test_runtime_block_never_pulls_or_runs_student_code(self):
        self.runtime.probe.side_effect = Blocked("Missing isolation")
        with self.assertRaisesRegex(Blocked, "Missing isolation"):
            execute(self.source, "build", self.runtime, IMAGE)
        self.runtime.pull.assert_not_called()
        self.runtime.run.assert_not_called()

    def test_effective_security_failure_blocks_student_build(self):
        self.runtime.run.return_value = self.secure.replace(b'"NoNewPrivs": "1"', b'"NoNewPrivs": "0"')
        with self.assertRaises(Blocked):
            execute(self.source, "build", self.runtime, IMAGE)
        self.assertEqual(self.runtime.run.call_count, 1)

    def test_check_uses_student_copy_without_instructor_overlay_or_extra_files(self):
        (self.source / "not-needed.txt").write_text("exclude", encoding="utf-8")
        before = (self.source / "data.php").read_bytes()

        def command(work, image, *args):
            if args == ("php", "-r", "echo PHP_VERSION;"):
                return b"8.4.27"
            if args[:2] == ("php", "-r"):
                return self.secure
            self.assertEqual(args, ("php", "/work/tests/check.php", "/work/source"))
            self.assertEqual((work / "source/data.php").read_bytes(), before)
            self.assertFalse((work / "source/not-needed.txt").exists())
            self.assertFalse((work / "instructor").exists())
            return b"SIMULATED CHECK OUTPUT"

        self.runtime.run.side_effect = command
        self.assertEqual(execute(self.source, "check", self.runtime, IMAGE), b"SIMULATED CHECK OUTPUT")
        self.assertEqual((self.source / "data.php").read_bytes(), before)

    def test_stdout_payload_is_returned_without_encoding_conversion(self):
        raw = "<p>日本語</p>\n".encode("utf-8")
        self.runtime.run.side_effect = [self.secure, b"8.4.27", raw]
        self.assertEqual(execute(self.source, "stdout", self.runtime, IMAGE), raw)
        self.assertEqual(self.runtime.run.call_args.args[2:], ("php", "build.php", "--stdout"))

    def test_runtime_version_mismatch_blocks_before_student_code(self):
        self.runtime.run.side_effect = [self.secure, b"8.4.26"]
        with self.assertRaisesRegex(Blocked, "Runtime PHP version"):
            execute(self.source, "build", self.runtime, IMAGE)
        self.assertEqual(self.runtime.run.call_count, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
