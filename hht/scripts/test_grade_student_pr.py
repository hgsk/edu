from pathlib import Path
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grade_student_pr import grade_submission


BASE_INDEX = '''<!DOCTYPE html>\n<html lang="ja"><body><main><h1>一杯から、街の日常をあたためる。</h1><p>創業10年。</p></main></body></html>\n'''
ABOUT = '''<!DOCTYPE html>\n<html lang="ja"><body><main><h1>店舗案内</h1><p>創業10年。</p></main></body></html>\n'''
MENU = '''<!DOCTYPE html>\n<html lang="ja"><body><main><h1>メニュー</h1></main></body></html>\n'''


def write(path: Path, content: str | bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content, encoding="utf-8")


def worklog(day: int, *, versions="開始=c3b08cc / 変更後=deadbee", url="http://localhost:8001/") -> str:
    return f'''# DAY {day} 作業記録\n- 依頼: 課題依頼を確認\n- 質問: なし\n- 変更した場所: 対象HTML\n- 変更しなかった場所: 対象外は変更しなかった\n- 確認したこと: DevTools / 375 / Console / 復元 / 対象外確認\n- 未確認: なし\n- バージョン: {versions}\n- 確認URL: {url}\n'''


class GraderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.base = self.tmp / "base"
        self.student = self.tmp / "student"
        for root in (self.base, self.student):
            write(root / "hht/starter-site/index.html", BASE_INDEX)
            write(root / "hht/starter-site/about.html", ABOUT)
            write(root / "hht/starter-site/menu.html", MENU)
            write(root / "hht/starter-site/css/style.css", ".button{display:inline-block}\n")

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def add_submission(self, day: int, text: str) -> list[str]:
        prefix = f"hht/submissions/day-{day:02d}"
        write(self.student / f"{prefix}/WORKLOG.md", text)
        write(self.student / f"{prefix}/screenshots/check.png", b"\x89PNG\r\n\x1a\nFAKE")
        write(self.student / f"{prefix}/evidence/report.md", "確認記録")
        return [
            f"{prefix}/WORKLOG.md",
            f"{prefix}/screenshots/check.png",
            f"{prefix}/evidence/report.md",
        ]

    def test_day1_pass(self):
        changed = self.add_submission(1, worklog(1))
        text = BASE_INDEX.replace(
            "<h1>一杯から、街の日常をあたためる。</h1>",
            "<h1>DAY1練習：一杯から、街の日常をあたためる。</h1>",
        )
        write(self.student / "hht/starter-site/index.html", text)
        changed.append("hht/starter-site/index.html")
        result = grade_submission(self.base, self.student, changed)
        self.assertTrue(result.passed, result.render_text())

    def test_day1_rejects_scope_creep(self):
        changed = self.add_submission(1, worklog(1))
        text = BASE_INDEX.replace(
            "<h1>一杯から、街の日常をあたためる。</h1>",
            "<h1>DAY1練習：一杯から、街の日常をあたためる。</h1>",
        )
        write(self.student / "hht/starter-site/index.html", text)
        write(self.student / "hht/docs/student-workbook.md", "改変")
        changed += ["hht/starter-site/index.html", "hht/docs/student-workbook.md"]
        result = grade_submission(self.base, self.student, changed)
        self.assertFalse(result.passed)
        self.assertIn("課題対象外", result.render_text())

    def test_secret_detection(self):
        changed = self.add_submission(1, worklog(1) + "\npassword: hunter2\n")
        text = BASE_INDEX.replace(
            "<h1>一杯から、街の日常をあたためる。</h1>",
            "<h1>DAY1練習：一杯から、街の日常をあたためる。</h1>",
        )
        write(self.student / "hht/starter-site/index.html", text)
        changed.append("hht/starter-site/index.html")
        result = grade_submission(self.base, self.student, changed)
        self.assertFalse(result.passed)
        self.assertIn("秘密情報", result.render_text())

    def test_day2_targeted_text_change_pass(self):
        log = worklog(2, versions="変更=abcdef1", url="なし") + "\n対象外: about.htmlの創業10年は変更しなかった\n"
        changed = self.add_submission(2, log)
        write(self.student / "hht/starter-site/index.html", BASE_INDEX.replace("創業10年", "地域と歩んで12年", 1))
        changed.append("hht/starter-site/index.html")
        result = grade_submission(self.base, self.student, changed)
        self.assertTrue(result.passed, result.render_text())


if __name__ == "__main__":
    unittest.main()
