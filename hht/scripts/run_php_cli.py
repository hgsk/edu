"""Student wslc launcher. Never reads or overlays instructor solutions."""

import argparse
from pathlib import Path
import re
import shutil
import sys
import tempfile

from php_container_runtime import Blocked, ContainerRuntime, SECURITY_PROBE, check_process_security


ROOT = Path(__file__).resolve().parents[1]
EXERCISE = ROOT / "hands-on/php-cli-template"


def student_source(path):
    source = Path(path).resolve()
    if source.parent == source or source in {Path.home().resolve(), ROOT.parent.resolve()}:
        raise Blocked("Mount only the student exercise folder, not a drive, home, or repository root")
    for name in ("hello.php", "data.php", "render.php", "build.php", "templates/index.php"):
        if not (source / name).is_file():
            raise Blocked(f"Not a complete exercise copy: missing {name}")
    return source


def execute(source, action, runtime, image):
    # ContainerRuntime's readiness gate applies before every operation.
    runtime.probe()
    runtime.pull(image)
    if not any(value.endswith("@" + image.split("@", 1)[1]) for value in runtime.image_digests(image)):
        raise Blocked("Image digest does not match the pinned official image")
    check_process_security(runtime.run(source, image, "php", "-r", SECURITY_PROBE))
    if runtime.run(source, image, "php", "-r", "echo PHP_VERSION;") != b"8.4.27":
        raise Blocked("Runtime PHP version does not match the pinned PHP 8.4.27")
    if action == "version":
        return runtime.run(source, image, "php", "--version")
    if action == "check":
        results = ROOT.parent / "test-results/php-cli-student"
        results.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=results) as temp:
            work = Path(temp)
            (work / "source/templates").mkdir(parents=True)
            for name in ("hello.php", "data.php", "render.php", "build.php", "templates/index.php"):
                shutil.copy2(source / name, work / "source" / name)
            shutil.copytree(EXERCISE / "tests", work / "tests")
            return runtime.run(work, image, "php", "/work/tests/check.php", "/work/source")
    command = ["php", "hello.php"] if action == "hello" else ["php", "build.php", *(["--stdout"] if action == "stdout" else [])]
    return runtime.run(source, image, *command)


def main():
    parser = argparse.ArgumentParser(description="Run only your exercise copy through safety-checked wslc")
    parser.add_argument("--source", required=True, help="Your php-template-work folder")
    parser.add_argument("--action", choices=["version", "hello", "build", "stdout", "check"], required=True)
    args = parser.parse_args()
    source = student_source(args.source)
    image = (EXERCISE / "image.txt").read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"docker\.io/library/php:8\.4\.27-cli-bookworm@sha256:[0-9a-f]{64}", image):
        raise Blocked("Use the reviewed official PHP image pinned by digest")
    output = execute(source, args.action, ContainerRuntime("wslc"), image)
    sys.stdout.buffer.write(output)  # Do not re-encode HTML using Windows shell defaults.


if __name__ == "__main__":
    try:
        main()
    except Blocked as error:
        raise SystemExit("BLOCKED: " + str(error)) from error
