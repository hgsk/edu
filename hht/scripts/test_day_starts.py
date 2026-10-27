"""Check isolation, reproducibility and failure handling of per-day preparation."""
from pathlib import Path
import shutil
import subprocess
import tempfile
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
        shutil.copytree(ROOT / 'lessons', self.root / 'lessons')
        shutil.copytree(ROOT / 'docs/workbook', self.root / 'docs/workbook')
        (self.root / 'scripts').mkdir()
        shutil.copy2(ROOT / 'scripts/day-starts.json', self.root / 'scripts/day-starts.json')

    def test_snapshots_are_self_contained(self):
        self.assertEqual(validate(self.root), [])

    def test_missing_file_is_rejected(self):
        (self.root / 'lessons/15/start/reference-cafe/index.html').unlink()
        self.assertTrue(any('DAY 15' in e for e in validate(self.root)))

    def test_external_day_reference_is_rejected(self):
        p = self.root / 'lessons/07/start/about.html'
        with p.open('a', encoding='utf-8') as stream:
            stream.write('<a href="../../06/start/menu.html">previous</a>')
        self.assertTrue(any('external local file' in e for e in validate(self.root)))

    def test_later_days_include_their_prerequisites(self):
        read = lambda day, name: (self.root / f'lessons/{day:02d}/start' / name).read_text(encoding='utf-8')
        self.assertNotIn('id="contact"', read(7, 'about.html'))
        self.assertIn('id="contact"', read(8, 'about.html'))
        self.assertIn('min-width: 600px', read(10, 'css/style.css'))
        self.assertIn('09:30-19:00', read(12, 'index.html'))
        self.assertIn('550円', read(12, 'menu.html'))
        self.assertIn('id="notice"', read(13, 'index.html'))
        self.assertIn('reference-cafe/index.html', read(15, 'index.html'))
        self.assertIn('本人の制作実績ではありません', read(15, 'index.html'))

    @unittest.skipUnless(shutil.which('pwsh') or shutil.which('powershell'), 'PowerShell required')
    def test_prepare_each_day_and_preserve_existing_work(self):
        shell = shutil.which('pwsh') or shutil.which('powershell')
        script = ROOT / 'scripts/prepare-day.ps1'
        for day in range(1, 16):
            # No other day's source or completed exercise exists in this repository.
            isolated = self.repo / f'isolated-{day}'
            isolated.mkdir()
            (isolated / 'README.md').write_text('learner', encoding='utf-8')
            shutil.copytree(self.root / f'lessons/{day:02d}/start',
                            isolated / f'hht/lessons/{day:02d}/start')
            args = [shell, '-NoProfile', '-File', str(script), '-Day', str(day), '-RepositoryRoot', str(isolated)]
            result = subprocess.run(args, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
            site = isolated / f'hht/practice/day{day:02d}'
            self.assertTrue((site / 'index.html').is_file())
            (site / 'learner-note.txt').write_text('keep my work', encoding='utf-8')
            repeated = subprocess.run(args, capture_output=True)
            self.assertNotEqual(repeated.returncode, 0)
            self.assertEqual((site / 'learner-note.txt').read_text(), 'keep my work')
        for invalid in ('0', '16'):
            result = subprocess.run([shell, '-NoProfile', '-File', str(script), '-Day', invalid,
                                     '-RepositoryRoot', str(self.repo)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)

        missing = self.repo / 'missing-input'
        missing.mkdir()
        (missing / 'README.md').write_text('learner', encoding='utf-8')
        result = subprocess.run([shell, '-NoProfile', '-File', str(script), '-Day', '7',
                                 '-RepositoryRoot', str(missing)], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((missing / 'hht/practice/day07').exists())


if __name__ == '__main__':
    unittest.main()
