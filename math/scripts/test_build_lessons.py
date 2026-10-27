"""Test generation without writing output files."""
import unittest
from build_lessons import SOURCE, generate


class GenerationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding='utf-8')

    def test_all_units_and_deterministic_output(self):
        result = generate(self.source)
        self.assertEqual(result, generate(self.source))
        self.assertEqual(result.count('"id":'), 28)

    def test_missing_chapter_rejected(self):
        with self.assertRaises(ValueError):
            generate('# empty')

    def test_missing_unit_rejected(self):
        with self.assertRaises(ValueError):
            generate(self.source.replace('#### B01 ', '#### X01 ', 1))

    def test_duplicate_chapter_rejected(self):
        with self.assertRaises(ValueError):
            generate(self.source + '\n<a id="math-course"></a>')

    def test_missing_reading_check_rejected(self):
        with self.assertRaises(ValueError):
            generate(self.source.replace('**読み取り確認：**', '**質問欠落：**', 1))

    def test_nonfinite_answer_rejected(self):
        import re
        invalid = re.sub(r'\*\*確認値：\*\* [^\n]+', '**確認値：** NaN', self.source, count=1)
        with self.assertRaises(ValueError):
            generate(invalid)

    def test_policy_and_reasoning_from_canonical_source(self):
        import json
        result = generate(self.source)
        payload = result.split('globalThis.MATH_LESSONS = ', 1)[1].split(';\nglobalThis.MATH_CALCULATION_POLICY', 1)[0]
        lessons = json.loads(payload)
        self.assertEqual(sum(len(item['reasoning']) for item in lessons), 39)
        self.assertEqual(sum(bool(item['reasoning']) for item in lessons), 28)
        self.assertIn('手で速く計算することを分けます', result)
        self.assertTrue(all('##### 計算を確かめる' not in item['body'] for item in lessons))
        for item in lessons:
            for case in item['reasoning']:
                self.assertIn(case['correct'], ('A', 'B', 'C'))
                self.assertGreaterEqual(len(case['rubric'].split('；')), 3)

    def test_missing_reasoning_rubric_rejected(self):
        with self.assertRaises(ValueError):
            generate(self.source.replace('**評価の観点：**', '**評価欠落：**', 1))

    def test_invalid_reasoning_choice_rejected(self):
        import re
        invalid = re.sub(r'\*\*判断：\*\* [ABC]', '**判断：** D', self.source, count=1)
        with self.assertRaises(ValueError):
            generate(invalid)

    def test_missing_calculation_policy_rejected(self):
        with self.assertRaises(ValueError):
            generate(self.source.replace('### 計算の取り組み方', '### 方針欠落', 1))


if __name__ == '__main__':
    unittest.main()
