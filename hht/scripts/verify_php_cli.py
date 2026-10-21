"""Official PHP CLI checks. Fail closed when the local engine or patched image is unavailable."""

from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import uuid


ROOT = Path(__file__).resolve().parents[1]
EXERCISE = ROOT / "hands-on/php-cli-template"
IMAGE = (EXERCISE / "image.txt").read_text(encoding="utf-8").strip()


def main():
    if IMAGE != "php:8.4.27-cli-bookworm":
        raise SystemExit("Review and verify the patched image/version before changing this pin")
    try:
        subprocess.run(["docker", "version"], check=True, timeout=20)
        subprocess.run(["docker", "pull", IMAGE], check=True, timeout=180)
    except (OSError, subprocess.SubprocessError) as error:
        raise SystemExit(f"BLOCKED: Docker engine or patched official image unavailable: {error}")

    result_dir = ROOT.parent / "test-results/php-cli"
    result_dir.mkdir(parents=True, exist_ok=True)

    def run(work, *command, expected=0):
        name = "hht-php-" + uuid.uuid4().hex
        args = ["docker", "run", "--rm", "--name", name, "--network", "none",
                "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
                "--mount", f"type=bind,source={work},target=/work", "--workdir", "/work"]
        if os.name != "nt":
            args.extend(["--user", f"{os.getuid()}:{os.getgid()}"])
        args.extend([IMAGE, *command])
        try:
            result = subprocess.run(args, capture_output=True, timeout=45)
            print(result.stdout.decode("utf-8", errors="replace"), end="")
            if result.stderr:
                print(result.stderr.decode("utf-8", errors="replace"), end="")
            if result.returncode != expected:
                raise RuntimeError(f"Container command exit {result.returncode}, expected {expected}")
            return result.stdout
        finally:
            # --rm handles normal exits. Clean up only this unique test container after interruption.
            exists = subprocess.run(["docker", "container", "inspect", name], capture_output=True, timeout=10)
            if exists.returncode == 0:
                subprocess.run(["docker", "rm", "--force", name], check=True, capture_output=True, timeout=15)
                if subprocess.run(["docker", "container", "inspect", name], capture_output=True, timeout=10).returncode == 0:
                    raise RuntimeError(f"Container cleanup failed: {name}")
            print(f"Container {name}: absent; cleanup PASS")

    subprocess.run(["docker", "image", "inspect", IMAGE, "--format", "{{json .RepoDigests}}"], check=True, timeout=15)
    with tempfile.TemporaryDirectory(dir=result_dir) as directory:
        work = Path(directory)
        solution = work / "solution"
        starter = work / "starter"
        for target in (solution, starter):
            shutil.copytree(EXERCISE / "starter", target, ignore=shutil.ignore_patterns("output"))
        shutil.copytree(EXERCISE / "instructor/solution", solution, dirs_exist_ok=True)
        shutil.copytree(EXERCISE / "tests", work / "tests")
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
            raise RuntimeError("UTF-8 file bytes and Docker stdout differ")
        saved.decode("utf-8")
        (result_dir / "index.html").write_bytes(saved)
    print("PHP CLI EXERCISE: PASS")


if __name__ == "__main__":
    main()
