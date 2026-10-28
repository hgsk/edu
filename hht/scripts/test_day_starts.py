"""Check isolation, reproducibility and failure handling of per-day preparation."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import os
import unittest

from day_starts import validate

ROOT = Path(__file__).resolve().parents[1]


class IndependentStartsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.root = self.repo / 'hht'
        (self.repo / 'README.md').write_text('learner', encoding='utf-8')
        for number in range(1, 16):
            shutil.copytree(ROOT / f'day{number:02d}', self.root / f'day{number:02d}')
        shutil.copytree(ROOT / 'docs/workbook', self.root / 'docs/workbook')
        (self.root / 'scripts').mkdir()
        shutil.copy2(ROOT / 'scripts/day-starts.json', self.root / 'scripts/day-starts.json')

    def test_snapshots_are_self_contained(self):
        self.assertEqual(validate(self.root), [])

    def test_missing_file_is_rejected(self):
        (self.root / 'day15/reference-cafe/index.html').unlink()
        self.assertTrue(any('DAY 15' in e for e in validate(self.root)))

    def test_external_day_reference_is_rejected(self):
        p = self.root / 'day07/about.html'
        with p.open('a', encoding='utf-8') as stream:
            stream.write('<a href="../day06/menu.html">previous</a>')
        self.assertTrue(any('external local file' in e for e in validate(self.root)))

    def test_later_days_include_their_prerequisites(self):
        read = lambda day, name: (self.root / f'day{day:02d}' / name).read_text(encoding='utf-8')
        self.assertNotIn('id="contact"', read(7, 'about.html'))
        self.assertIn('id="contact"', read(8, 'about.html'))
        self.assertIn('min-width: 600px', read(10, 'css/style.css'))
        self.assertIn('09:30-19:00', read(12, 'index.html'))
        self.assertIn('550円', read(12, 'menu.html'))
        self.assertIn('id="notice"', read(13, 'index.html'))
        self.assertIn('reference-cafe/index.html', read(15, 'index.html'))
        self.assertIn('本人の制作実績ではありません', read(15, 'index.html'))

    def test_fresh_clone_contains_all_days_without_preparation(self):
        env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_CONFIG_NOSYSTEM': '1'}
        def git(*args, cwd=None):
            result = subprocess.run(['git', '-c', f'core.hooksPath={self.repo / "no-hooks"}', *args],
                                    cwd=cwd or self.repo, env=env, capture_output=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
        git('init', '-b', 'main')
        git('config', 'user.name', 'learner')
        git('config', 'user.email', 'learner@example.invalid')
        git('config', 'core.autocrlf', 'false')
        git('add', '.')
        git('commit', '-m', 'All lesson files are ready')
        checkout = self.repo / 'fresh-clone'
        git('clone', '--quiet', '--no-hardlinks', str(self.repo), str(checkout))
        self.assertEqual(validate(checkout / 'hht'), [])
        self.assertFalse((checkout / 'hht/scripts/prepare-day.ps1').exists())
        for number in range(1, 16):
            page = checkout / f'hht/day{number:02d}/index.html'
            self.assertTrue(page.is_file())
            before = page.read_bytes()
            page.write_bytes(before + b'\n<!-- my exercise -->\n')
            self.assertEqual((self.root / f'day{number:02d}/index.html').read_bytes(), before)

    def test_generated_preparation_instructions_are_rejected(self):
        p = self.root / 'docs/workbook/day06.md'
        with p.open('a', encoding='utf-8') as stream:
            stream.write('\nprepare-day.ps1 -Day 6\n')
        self.assertTrue(any('still requires generated lesson files' in e for e in validate(self.root)))


if __name__ == '__main__':
    unittest.main()
