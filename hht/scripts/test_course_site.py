"""Regression tests: broken materials must fail without changing repository files."""
from pathlib import Path
import shutil
import tempfile
import unittest

from course_site import validate


ROOT = Path(__file__).resolve().parents[1]


class CourseSiteTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for directory in ("references/cafe-site", "instructor/lessons/03", "instructor/lessons/04", "day03", "day04", "docs/workbook"):
            shutil.copytree(ROOT / directory, self.root / directory)
        for file in ("scripts/course-site-contract.json", "docs/student-workbook.md"):
            destination = self.root / file
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / file, destination)

    def replace(self, file, old, new):
        path = self.root / file
        source = path.read_text(encoding="utf-8")
        self.assertIn(old, source)
        path.write_text(source.replace(old, new), encoding="utf-8")

    def fails_with(self, text):
        self.assertTrue(any(text in error for error in validate(self.root)), text)

    def test_current_material_including_intentional_exercise_faults(self):
        self.assertEqual(validate(self.root), [])

    def test_missing_button(self):
        self.replace("references/cafe-site/about.html", '<a class="button menu-button" href="menu.html">メニューを見る</a>', "")
        self.fails_with("メニューを見る link")

    def test_missing_fragment(self):
        self.replace("references/cafe-site/menu.html", 'id="menu-list"', 'id="different"')
        self.fails_with("fragment #menu-list")

    def test_navigation_route(self):
        self.replace("references/cafe-site/menu.html", 'href="about.html"', 'href="missing.html"')
        self.fails_with("navigation names/order/routes")
        self.fails_with("missing href target")

    def test_missing_product(self):
        self.replace("references/cafe-site/menu.html", "アイスカフェラテ", "別の商品")
        self.fails_with("starting product names/count/prices")

    def test_hours_display_and_metadata(self):
        self.replace("references/cafe-site/index.html", "10:00", "09:30")
        self.fails_with("starting visible hours")
        self.fails_with("starting JSON-LD openingHours")

    def test_stale_zip(self):
        self.replace("day03/menu.html", "税込", "税込み")
        self.fails_with("ZIP differs")

    def test_workbook_premise_drift(self):
        self.replace("docs/workbook/common.md", "どのDAYも、他のDAYを終えていなくても始められます。", "トップだけを確認。")
        self.fails_with("Workbook premise changed")

    def test_missing_asset(self):
        (self.root / "references/cafe-site/css/style.css").unlink()
        self.fails_with("missing href target css/style.css")

    def test_new_distribution_needs_coverage(self):
        path = self.root / "docs/student-workbook.md"
        with path.open("a", encoding="utf-8") as stream:
            stream.write("\n[新しい開始データ](../instructor/lessons/05/day5-start.zip)\n")
        self.fails_with("distribution ZIP coverage")

    def test_duplicate_target(self):
        self.replace("references/cafe-site/menu.html", '<h1>メニュー</h1>', '<h1 id="menu-list">メニュー</h1>')
        self.fails_with("duplicate id")


if __name__ == "__main__":
    unittest.main()
