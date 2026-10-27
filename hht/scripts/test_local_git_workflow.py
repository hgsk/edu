"""Check that the current site can be edited and recorded in local Git."""
from pathlib import Path
import os
import subprocess
import tempfile
import unittest


class LocalGitWorkflowTest(unittest.TestCase):
    def test_existing_site_records_css_changes_without_replacing_html(self):
        for day in (5, 6):
            with self.subTest(day=day), tempfile.TemporaryDirectory() as name:
                root = Path(name)
                env = {**os.environ, "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1"}
                def git(*args):
                    result = subprocess.run(["git", "-c", f"core.hooksPath={root / 'no-hooks'}", *args], cwd=root, env=env, capture_output=True, timeout=30)
                    self.assertEqual(result.returncode, 0, result.stderr.decode(errors="replace"))
                    return result.stdout
                git("init", "-b", "main")
                git("config", "user.name", "learner")
                git("config", "user.email", "learner@example.invalid")
                site = root / "hht/starter-site"
                site.mkdir(parents=True)
                html = site / "menu.html"
                css = site / "style.css"
                html.write_text("<h1>Menu</h1>", encoding="utf-8")
                css.write_text("a { padding: 0; }", encoding="utf-8")
                git("add", "hht/starter-site")
                git("commit", "-m", "Existing site")
                git("tag", f"day{day:02d}-start")
                css.write_text("a { padding: 8px 12px; }", encoding="utf-8")
                self.assertIn(b"padding", git("diff"))
                git("add", "hht/starter-site/style.css")
                git("commit", "-m", f"DAY {day} CSS update")
                git("tag", f"day{day:02d}-end")
                self.assertEqual(html.read_text(encoding="utf-8"), "<h1>Menu</h1>")
                self.assertEqual(git("status", "--short"), b"")
                self.assertIn(b"padding: 0", git("show", f"day{day:02d}-start:hht/starter-site/style.css"))
                self.assertFalse((root / "hht/practice").exists())


if __name__ == "__main__":
    unittest.main()
