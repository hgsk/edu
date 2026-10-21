"""Assemble instructor solutions in temporary copies; verify starters fail as expected."""

from pathlib import Path
import shutil
import runpy
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]


def main():
    html_output = ROOT.parent / "test-results/python-exercises"
    html_output.mkdir(parents=True, exist_ok=True)
    for name in ("python-store-guide", "python-form-notes"):
        exercise = ROOT / "hands-on" / name
        with tempfile.TemporaryDirectory() as temp:
            solution = Path(temp) / name
            shutil.copytree(exercise / "starter", solution,
                            ignore=shutil.ignore_patterns("__pycache__", "output", "instance", ".venv"))
            shutil.copytree(exercise / "instructor/solution", solution, dirs_exist_ok=True,
                            ignore=shutil.ignore_patterns("__pycache__", "output", "instance"))
            subprocess.run([sys.executable, str(exercise / "tests/check.py"), str(solution)], check=True)
            if name == "python-store-guide":
                subprocess.run([sys.executable, str(solution / "render.py")], check=True)
                shutil.copy2(solution / "output/index.html", html_output / "store.html")
            else:
                app = runpy.run_path(str(solution / "app.py"))["create_app"]()
                client = app.test_client()
                (html_output / "form-empty.html").write_bytes(client.get("/").data)
                (html_output / "form-error.html").write_bytes(client.post("/", data={"item": "  ", "note": "確認"}).data)
                client.post("/", data={"item": "架空ラテ", "note": "週末 & <試作>"})
                (html_output / "form-saved.html").write_bytes(client.get("/").data)
            starter = subprocess.run([sys.executable, str(exercise / "tests/check.py"), str(exercise / "starter")],
                                     capture_output=True, text=True, encoding="utf-8")
            if starter.returncode == 0 or "FAILED (failures=" not in starter.stderr or "errors=" in starter.stderr:
                print(starter.stdout, starter.stderr)
                raise SystemExit(f"{name}: starter must fail assertions, not infrastructure")
            print(f"{name}: solution PASS; unfinished starter correctly rejected", flush=True)


if __name__ == "__main__":
    main()
