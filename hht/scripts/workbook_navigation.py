"""Check that workbook links identify the DAY promised by their entry point."""

from pathlib import PurePath
import re


def workbook_day_link_errors(relative_path: PurePath, document: str) -> list[str]:
    errors = []
    parts = relative_path.parts
    pack_day = None
    if (len(parts) == 3 and parts[0] == "lessons"
            and parts[1].isdigit() and parts[2] == "README.md"):
        pack_day = int(parts[1])

    for match in re.finditer(
        r"\[([^\]\n]*)\]\(([^)\s]*(?:student-workbook|day-?\d{2})\.md)(?:#([^)]*))?\)", document
    ):
        label, target, fragment = match.groups()
        file_day = re.search(r"(?:^|/)day-?(\d{2})\.md$", target)
        destination = re.fullmatch(r"day-(\d+)(?:-.+)?", fragment or "")
        fragment_day = int(destination.group(1)) if destination else None
        actual_day = int(file_day.group(1)) if file_day else fragment_day
        if file_day and fragment_day is not None and actual_day != fragment_day:
            errors.append(f"Workbook file {target} disagrees with #{fragment}")
        if pack_day is not None and actual_day != pack_day:
            errors.append(
                f"Lesson pack {pack_day:02d} must link to DAY {pack_day}; found #{fragment}"
            )
        label_day = re.search(r"\bDAY\s+(\d+)\b", label, flags=re.IGNORECASE)
        if label_day and actual_day != int(label_day.group(1)):
            errors.append(f"Workbook link label {label!r} points to #{fragment}")
    return errors
