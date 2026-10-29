"""Read the split workbook as validation input without storing a duplicate book."""
from pathlib import Path
import os
import re
from urllib.parse import urlsplit


DAY_NAMES = tuple(f"day{number:02d}.md" for number in range(1, 16))
PART_NAMES = ("introduction.md", "common.md", *DAY_NAMES, "unity.md", "math.md")


def workbook_paths(root: Path) -> list[Path]:
    directory = root / "docs/workbook"
    found = {path.name for path in directory.glob("day*.md")}
    if found != set(DAY_NAMES):
        raise ValueError(f"Workbook must contain exactly DAY 1-15: {sorted(found)}")
    return [directory / name for name in PART_NAMES]


def read_workbook(root: Path) -> str:
    """Normalize relative links to docs/ for existing input/figure validators."""
    # Canonicalize before joining links: Windows TEMP may use a path alias.
    root = root.resolve()
    docs = root / "docs"
    index = (docs / "student-workbook.md").read_text(encoding="utf-8")
    chunks = [index]
    for path in workbook_paths(root):
        text = path.read_text(encoding="utf-8")
        def normalize(match):
            ref = match.group(1)
            parsed = urlsplit(ref)
            if parsed.scheme or parsed.netloc or not parsed.path:
                return ref
            target = (path.parent / parsed.path).resolve()
            relative = os.path.relpath(target, docs).replace("\\", "/")
            return relative + ("?" + parsed.query if parsed.query else "") + ("#" + parsed.fragment if parsed.fragment else "")
        chunks.append(re.sub(r"(?<=\]\()([^\n)]+)(?=\))", normalize, text))
    return "\n\n".join(chunks)


def hint_format_errors(text: str) -> list[int]:
    """Require a standalone hint label followed immediately by quoted prose."""
    lines = text.splitlines()
    errors = []
    fenced = False
    for index, line in enumerate(lines):
        if re.match(r"^\s*(```|~~~)", line):
            fenced = not fenced
            continue
        if fenced or not re.match(r"^\s*(?:>\s*)?(?:💡\s*)?(?:\*\*)?ヒント(?:[：:]|\*\*)", line):
            continue
        if (line.rstrip() != "💡 **ヒント：**" or index + 1 == len(lines)
                or not lines[index + 1].startswith("> ")
                or not lines[index + 1][2:].strip()):
            errors.append(index + 1)
            continue
        following = index + 1
        while following < len(lines) and lines[following].strip():
            if not lines[following].startswith("> ") and lines[following] != ">":
                errors.append(index + 1)
                break
            following += 1
    return errors
