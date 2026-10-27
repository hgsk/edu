"""Validate independent, self-contained lesson snapshots without changing them."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit


def validate(root: Path) -> list[str]:
    errors = []
    manifest = json.loads((root / 'scripts/day-starts.json').read_text(encoding='utf-8'))
    if set(manifest['days']) != {f'{n:02d}' for n in range(1, 16)}:
        errors.append('Independent starts must cover DAY 1-15')
    for number, expected in manifest['days'].items():
        start = (root / f'lessons/{number}/start').resolve()
        actual = {p.relative_to(start).as_posix(): p for p in start.rglob('*') if p.is_file()}
        if set(actual) != set(expected):
            errors.append(f'DAY {number} start file coverage differs from manifest')
        for name, path in actual.items():
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected.get(name):
                errors.append(f'DAY {number} start changed: {name}')
            if path.suffix not in ('.html', '.css'):
                continue
            text = path.read_text(encoding='utf-8')
            refs = re.findall(r'(?:href|src)=["\']([^"\']+)', text)
            refs += re.findall(r'url\(["\']?([^\s)"\']+)', text)
            for ref in refs:
                parsed = urlsplit(ref)
                if parsed.scheme or parsed.netloc or not parsed.path:
                    continue
                target = (path.parent / unquote(parsed.path)).resolve()
                if not target.is_relative_to(start) or not target.is_file():
                    errors.append(f'DAY {number} start has missing/external local file: {name}: {ref}')
        workbook = (root / f'docs/workbook/day{number}.md').read_text(encoding='utf-8')
        for phrase in (f'prepare-day.ps1 -Day {int(number)}', f'hht/practice/day{number}'):
            if phrase not in workbook:
                errors.append(f'DAY {number} missing independent start instruction: {phrase}')
    return errors
