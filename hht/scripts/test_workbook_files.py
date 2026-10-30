"""Verify the split workbook layout and its single-source consumers."""
from pathlib import Path
import shutil
import tempfile
import unittest

from workbook_files import DAY_NAMES, PART_NAMES, read_workbook, workbook_paths, hint_format_errors

ROOT = Path(__file__).resolve().parents[1]


class WorkbookFilesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(ROOT / "docs/workbook", self.root / "docs/workbook")
        shutil.copy2(ROOT / "docs/student-workbook.md", self.root / "docs/student-workbook.md")

    def test_all_parts_are_in_the_short_index(self):
        index = (self.root / "docs/student-workbook.md").read_text(encoding="utf-8")
        self.assertLessEqual(len(index.splitlines()), 60)
        self.assertNotIn("**完成条件:**", index)
        self.assertEqual(len(workbook_paths(self.root)), len(PART_NAMES))
        for name in PART_NAMES:
            self.assertIn("./workbook/" + name, index)

    def test_day_files_hold_unique_acceptance_and_navigation(self):
        for number, name in enumerate(DAY_NAMES, 1):
            text = (self.root / "docs/workbook" / name).read_text(encoding="utf-8")
            self.assertTrue(text.startswith(f"# DAY {number} "))
            self.assertEqual(text.count("**完成条件:**"), 1)
            self.assertIn("../student-workbook.md", text)
            self.assertIn("#local-git-workflow", text)
            self.assertIn("PR", text)

    def test_hint_format_policy(self):
        self.assertEqual(hint_format_errors("💡 **ヒント：**\n> 説明です。"), [])
        for invalid in ("💡 **ヒント：** 同じ行の説明", "> 💡 **ヒント：**\n> 説明", "💡 **ヒント：**\n引用でない説明", "**ヒント：**\n> 説明", "💡 **ヒント：**\n> 一文目\n引用でない二文目"):
            with self.subTest(invalid=invalid):
                self.assertEqual(hint_format_errors(invalid), [1])
        self.assertEqual(hint_format_errors("```markdown\n**ヒント：** 形式の例\n```"), [])

    def test_missing_day_is_rejected(self):
        (self.root / "docs/workbook/day06.md").unlink()
        with self.assertRaisesRegex(ValueError, "exactly DAY 1-15"):
            read_workbook(self.root)

    def test_extra_day_is_rejected(self):
        (self.root / "docs/workbook/day16.md").write_text("duplicate", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "exactly DAY 1-15"):
            read_workbook(self.root)

    def test_day_edit_is_read_without_updating_another_copy(self):
        path = self.root / "docs/workbook/day05.md"
        with path.open("a", encoding="utf-8") as stream:
            stream.write("\nUnique split-source change\n")
        self.assertIn("Unique split-source change", read_workbook(self.root))

    def test_links_are_independent_of_root_alias(self):
        with tempfile.TemporaryDirectory() as directory:
            alias = Path(directory) / "alias"
            try:
                alias.symlink_to(self.root, target_is_directory=True)
            except OSError as error:
                self.skipTest(f"Directory symlinks unavailable: {error}")
            self.assertEqual(read_workbook(alias), read_workbook(self.root))

    def test_legacy_input_and_screenshot_checks_get_rebased_links(self):
        text = read_workbook(self.root)
        self.assertIn("](../assets/workbook/targets/day05.png)", text)
        self.assertIn("](../instructor/lessons/03/day3-start.zip)", text)
        self.assertIn("hht/day05", text)


if __name__ == "__main__":
    unittest.main()
