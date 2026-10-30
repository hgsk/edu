from pathlib import Path
import tempfile
import unittest
from check_student_submission import check, FIELDS


class SubmissionChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.work = self.root / 'portfolio'
        self.records = self.root / 'submissions/day10'
        self.work.mkdir()
        (self.work / 'index.html').write_text('<h1>作業紹介</h1>', encoding='utf-8')
        for folder in ('screenshots', 'evidence'):
            (self.records / folder).mkdir(parents=True)
        self.log = self.records / 'WORKLOG.md'
        self.log.write_text('\n'.join(f'- {f}: 実際の記録' for f in FIELDS)
                            .replace('バージョン: 実際の記録', 'バージョン: abc1234')
                            .replace('確認URL: 実際の記録', '確認URL: http://localhost:5500/'), encoding='utf-8')
        (self.records / 'screenshots/check.png').write_bytes(b'\x89PNG\r\n\x1a\n')
        (self.records / 'evidence/report.md').write_text('表示とリンクを確認', encoding='utf-8')

    def result(self, day=10, work='portfolio', records='submissions/day10'):
        return check(self.root, day, work, records)

    def test_local_unpublished_portfolio_passes(self):
        self.assertEqual(self.result(), [])

    def test_each_day_and_current_day_directory(self):
        self.work.rename(self.root / 'day04')
        for day in range(1, 16):
            self.assertEqual(self.result(day, 'day04'), [])

    def test_empty_or_placeholder_worklog_fails(self):
        for value in ('', 'TODO', '未記入'):
            self.log.write_text('- 依頼: '+value, encoding='utf-8')
            self.assertTrue(self.result())

    def test_missing_evidence_fails(self):
        (self.records / 'evidence/report.md').unlink()
        self.assertIn('Missing evidence file', self.result())

    def test_fake_image_fails(self):
        (self.records / 'screenshots/check.png').write_text('not an image')
        self.assertTrue(any('screenshot' in e for e in self.result()))

    def test_path_escape_rejected(self):
        self.assertTrue(self.result(work='../other'))

    def test_symlink_rejected(self):
        try:
            (self.work / 'escape.html').symlink_to(self.log)
        except OSError:
            self.skipTest('Symlinks unavailable')
        self.assertEqual(self.result(), ['Symbolic links are not submission evidence'])

    def test_student_code_is_never_executed(self):
        (self.work / 'evil.py').write_text('raise RuntimeError("must not execute")')
        self.assertEqual(self.result(), [])

    def test_repository_root_is_supported(self):
        self.assertEqual(self.result(work="."), [])

    def test_invalid_day_rejected(self):
        self.assertTrue(self.result(16))


if __name__ == '__main__':
    unittest.main()
