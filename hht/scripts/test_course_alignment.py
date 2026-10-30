"""Reject regressions that could lose work or restore superseded assignments."""
from pathlib import Path
import shutil
import tempfile
import unittest
from course_alignment import validate

ROOT = Path(__file__).resolve().parents[1]


class SlideAlignmentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for folder in ('docs', 'student', 'instructor/lessons'):
            shutil.copytree(ROOT / folder, self.root / folder)

    def replace(self, path, before, after):
        file = self.root / path
        text = file.read_text(encoding='utf-8')
        self.assertIn(before, text)
        file.write_text(text.replace(before, after), encoding='utf-8')

    def test_current_material_passes(self):
        self.assertEqual(validate(self.root), [])

    def test_discard_before_preservation_is_rejected(self):
        self.replace('docs/workbook/common.md', '破棄前に教材の外へコピー', '破棄後に教材の外へコピー')
        self.assertTrue(any('safeguard' in e for e in validate(self.root)))

    def test_zip_submission_regression_is_rejected(self):
        self.replace('docs/workbook/common.md', '全15回ともGitHub PRで提出', '提出用ZIPを作成')
        self.assertTrue(any('GitHub PR' in e for e in validate(self.root)))

    def test_old_day10_assignment_is_rejected(self):
        self.replace('docs/workbook/day10.md', '# DAY 10 伝える内容を決め、ベースを作る', '# DAY 10 スマホでボタンが押しにくい')
        self.assertTrue(any('DAY 10' in e for e in validate(self.root)))

    def test_teacher_entry_drift_is_rejected(self):
        self.replace('instructor/lessons/13/README.md', '余裕があれば、近くの人に見てもらう', 'カフェサイトを承認・公開しよう')
        self.assertTrue(any('lessons/13' in e for e in validate(self.root)))


if __name__ == '__main__':
    unittest.main()
