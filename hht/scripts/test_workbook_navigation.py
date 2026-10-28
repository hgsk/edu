from pathlib import PurePosixPath
import unittest

from workbook_navigation import workbook_day_link_errors


class WorkbookNavigationTests(unittest.TestCase):
    def check_links(self, path, text):
        return workbook_day_link_errors(PurePosixPath(path), text)

    def test_matching_lesson_links_for_all_fifteen_days(self):
        for day in range(1, 16):
            with self.subTest(day=day):
                self.assertEqual([], self.check_links(
                    f"instructor/lessons/{day:02d}/README.md",
                    f"[正本](../../../docs/student-workbook.md#day-{day})",
                ))

    def test_existing_but_wrong_day_is_rejected_without_day_in_label(self):
        errors = self.check_links("instructor/lessons/02/README.md",
                                  "[正本](../../../docs/student-workbook.md#day-1)")
        self.assertIn("Lesson pack 02 must link to DAY 2; found #day-1", errors)

    def test_day_one_cannot_accidentally_link_to_day_ten(self):
        self.assertTrue(self.check_links("instructor/lessons/01/README.md",
                                        "[正本](../../../docs/student-workbook.md#day-10)"))

    def test_portal_label_must_agree_with_destination(self):
        self.assertTrue(self.check_links("student/README.md",
                                        "[DAY 2](../docs/student-workbook.md#day-1)"))

    def test_label_is_checked_even_when_pack_destination_is_correct(self):
        self.assertTrue(self.check_links("instructor/lessons/02/README.md",
                                        "[DAY 1](../../../docs/student-workbook.md#day-2)"))

    def test_matching_section_and_legacy_heading_fragments_are_allowed(self):
        for fragment in ("day-2-actions", "day-2-創業10年を直して"):
            with self.subTest(fragment=fragment):
                self.assertEqual([], self.check_links("instructor/lessons/02/README.md",
                    f"[DAY 2](../../../docs/student-workbook.md#{fragment})"))

    def test_previous_day_link_in_another_document_is_allowed(self):
        self.assertEqual([], self.check_links("docs/day2-notes.md",
                                             "[DAY 1](./student-workbook.md#day-1)"))

    def test_unrelated_document_link_is_ignored(self):
        self.assertEqual([], self.check_links("instructor/lessons/02/README.md",
                                             "[DAY 1](../../../docs/curriculum.md#day-1)"))

    def test_split_lesson_links_for_all_fifteen_days(self):
        for day in range(1, 16):
            with self.subTest(day=day):
                self.assertEqual([], self.check_links(
                    f"instructor/lessons/{day:02d}/README.md",
                    f"[正本](../../../docs/workbook/day-{day:02d}.md#day-{day})",
                ))

    def test_wrong_split_file_is_rejected_without_day_in_label(self):
        self.assertTrue(self.check_links("instructor/lessons/02/README.md",
            "[正本](../../../docs/workbook/day-01.md#day-1)"))

    def test_split_filename_and_fragment_must_agree(self):
        self.assertTrue(self.check_links("instructor/lessons/02/README.md",
            "[DAY 2](../../../docs/workbook/day-02.md#day-1)"))

    def test_split_portal_label_must_agree_with_filename(self):
        self.assertTrue(self.check_links("student/README.md",
            "[DAY 2](../docs/workbook/day-01.md#day-1)"))

    def test_matching_split_file_without_fragment_is_allowed(self):
        self.assertEqual([], self.check_links("instructor/lessons/02/README.md",
            "[DAY 2](../../../docs/workbook/day-02.md)"))


    def test_current_canonical_files_are_checked(self):
        for day in range(1, 16):
            with self.subTest(day=day):
                self.assertEqual([], self.check_links(
                    f"instructor/lessons/{day:02d}/README.md",
                    f"[DAY {day}](../../../docs/workbook/day{day:02d}.md)",
                ))
        self.assertTrue(self.check_links("instructor/lessons/02/README.md",
            "[DAY 2](../../../docs/workbook/day01.md)"))


if __name__ == "__main__":
    unittest.main()
