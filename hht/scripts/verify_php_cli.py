"""Verify official PHP CLI with wslc (Windows student) or native Docker (Linux CI)."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import shutil
import tempfile

from php_container_runtime import Blocked, ContainerRuntime, SECURITY_PROBE, check_process_security


ROOT = Path(__file__).resolve().parents[1]
EXERCISE = ROOT / "hands-on/php-cli-template"
IMAGE = (EXERCISE / "image.txt").read_text(encoding="utf-8").strip()


def main():
    parser = argparse.ArgumentParser(description="wslc student runtime; fail closed on missing isolation features")
    parser.add_argument("--runtime", choices=["wslc", "docker"], default="wslc")
    parser.add_argument("--check-runtime", action="store_true", help="Read version/help only; never pull/start containers")
    args = parser.parse_args()
    if not re.fullmatch(r"docker\.io/library/php:8\.4\.27-cli-bookworm@sha256:[0-9a-f]{64}", IMAGE):
        raise SystemExit("Review and pin the patched official PHP 8.4.27 image by digest")
    result_dir = ROOT.parent / "test-results/php-cli"
    result_dir.mkdir(parents=True, exist_ok=True)
    runtime = ContainerRuntime(args.runtime)
    try:
        runtime.probe()
    except Blocked as error:
        runtime.report["blocker"] = str(error)
    runtime.report["checked_at_utc"] = datetime.now(timezone.utc).isoformat()
    (result_dir / "runtime-report.json").write_bytes((json.dumps(runtime.report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps(runtime.report, ensure_ascii=False, indent=2))
    if not runtime.report["ready"]:
        raise SystemExit("BLOCKED: " + runtime.report["blocker"])
    if args.check_runtime:
        return
    runtime.pull(IMAGE)
    digests = runtime.image_digests(IMAGE)
    locked_digest = IMAGE.split("@", 1)[1]
    if not any(digest.endswith("@" + locked_digest) for digest in digests):
        raise Blocked("Pulled image RepoDigests do not match the locked official digest")
    print("IMAGE: " + IMAGE)
    print("RepoDigests: " + json.dumps(digests))

    def run(work, *command, expected=0):
        output = runtime.run(work, IMAGE, *command, expected=expected)
        print(output.decode("utf-8"), end="")
        return output

    with tempfile.TemporaryDirectory(dir=result_dir) as directory:
        work = Path(directory)
        solution, starter = work / "solution", work / "starter"
        for target in (solution, starter):
            shutil.copytree(EXERCISE / "starter", target, ignore=shutil.ignore_patterns("output"))
        shutil.copytree(EXERCISE / "instructor/solution", solution, dirs_exist_ok=True)
        shutil.copytree(EXERCISE / "tests", work / "tests")
        security = runtime.run(work, IMAGE, "php", "-r", SECURITY_PROBE)
        check_process_security(security)
        (result_dir / "process-security.json").write_bytes(security)
        print("PROCESS SECURITY: non-root, CapEff=0, CapBnd=0, NoNewPrivs=1, loopback only: PASS")
        version = run(work, "php", "-r", "echo PHP_VERSION;")
        if version != b"8.4.27":
            raise RuntimeError(f"Expected pinned PHP 8.4.27, got {version!r}")
        for file in work.rglob("*.php"):
            run(work, "php", "-l", "/work/" + file.relative_to(work).as_posix())
        run(work, "php", "/work/tests/check.php", "/work/solution")
        negative = run(work, "php", "/work/tests/check.php", "/work/starter", expected=1)
        if b"FAIL " not in negative or b"ERROR:" in negative:
            raise RuntimeError("Unfinished starter must fail checks, not infrastructure")
        run(work, "php", "/work/solution/build.php")
        saved = (solution / "output/index.html").read_bytes()
        stdout = run(work, "php", "/work/solution/build.php", "--stdout")
        if saved != stdout or saved.startswith((b"\xff\xfe", b"\xef\xbb\xbf")):
            raise RuntimeError("UTF-8 file bytes and container stdout differ")
        saved.decode("utf-8")
        (result_dir / "index.html").write_bytes(saved)
    print("PHP CLI EXERCISE: PASS")


if __name__ == "__main__":
    try:
        main()
    except Blocked as error:
        raise SystemExit("BLOCKED: " + str(error)) from error
