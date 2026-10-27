"""Checks source drift and the principal invalid-input cases of the reader builder."""
import unittest
from unittest.mock import patch
import build_course


class CourseBuildTest(unittest.TestCase):
    def setUp(self):
        self.source = build_course.SOURCE.read_text(encoding='utf-8')

    def test_real_source(self):
        result = build_course.build(self.source)
        self.assertGreaterEqual(result.count('<figure>'), 43)
        self.assertEqual(result.count('<h3>U'), 36)
        self.assertNotIn('数学編', result)
        self.assertIn('<pre><code>', result)
        self.assertIn('SetIKPositionWeight', result)
        self.assertIn('../hht/assets/unity/18-after.png', result)

    def test_missing_unit_rejected(self):
        with self.assertRaisesRegex(ValueError, 'U01-U36'):
            build_course.build(self.source.replace('#### U36 ', '#### U99 '))

    def test_missing_condition_rejected(self):
        with self.assertRaisesRegex(ValueError, '完成条件'):
            build_course.build(self.source.replace('**完成条件：**', '**条件：**'))

    def test_missing_screenshot_rejected(self):
        with patch.object(build_course.Path, 'is_file', return_value=False):
            with self.assertRaisesRegex(ValueError, 'screenshot'):
                build_course.build(self.source)

    def test_markup_escaped(self):
        self.assertEqual(build_course.inline('<script>'), '&lt;script&gt;')


if __name__ == '__main__':
    unittest.main()
