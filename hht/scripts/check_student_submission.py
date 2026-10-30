"""Read submission evidence only; never execute a student's source or award grades."""
from pathlib import Path
import argparse
import re

FIELDS = ('依頼', '質問', '変更した場所', '変更しなかった場所',
          '確認したこと', '未確認', 'バージョン', '確認URL')
PLACEHOLDER = re.compile(r'^(?:TODO|TBD|未記入|ここに.*|[.．…\-]+|<.*>)$', re.I)


def inside(root: Path, relative: str) -> Path:
    part = Path(relative)
    if part.is_absolute() or '..' in part.parts or (not part.parts and relative != '.'):
        raise ValueError('Use a relative path within the submission')
    path = root / part
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError('Path leaves submission')
    for parent in (path, *path.parents):
        if parent == root:
            break
        if parent.is_symlink():
            raise ValueError('Symbolic links are not submission evidence')
    return path


def check(root: Path, day: int, work_root: str, records_root: str) -> list[str]:
    errors = []
    if day not in range(1, 16):
        return ['DAY must be 1-15']
    try:
        work = inside(root, work_root)
        records = inside(root, records_root)
        # Refuse links anywhere in submitted material before opening any files.
        for folder in (work, records):
            if not folder.is_dir():
                errors.append(f'Missing folder: {folder.relative_to(root)}')
                continue
            for path in folder.rglob('*'):
                inside(root, path.relative_to(root).as_posix())
    except ValueError as exc:
        return [str(exc)]
    log = records / 'WORKLOG.md'
    if not log.is_file():
        errors.append('Missing WORKLOG.md')
    else:
        text = log.read_text(encoding='utf-8-sig')
        values = dict(re.findall(r'^\s*-\s*([^:：\n]+)[:：]\s*(.*?)\s*$', text, re.M))
        for field in FIELDS:
            value = values.get(field, '').strip()
            if not value or PLACEHOLDER.fullmatch(value):
                errors.append(f'WORKLOG missing value: {field}')
        if not re.search(r'\b[0-9a-f]{7,40}\b', values.get('バージョン', ''), re.I):
            errors.append('Record the tested source commit SHA')
        # localhost/file URLs are valid; external publication is optional.
        if not re.search(r'(?:https?://|file:///)', values.get('確認URL', '')):
            errors.append('Record the actual local or public verification URL')
    images = []
    for path in (records / 'screenshots').glob('*'):
        if path.is_file():
            with path.open('rb') as stream:
                header = stream.read(16)
            if (header.startswith(b'\x89PNG\r\n\x1a\n') or header.startswith(b'\xff\xd8\xff')
                    or (header[:4] == b'RIFF' and header[8:12] == b'WEBP')):
                images.append(path)
    if not images:
        errors.append('Missing screenshot with PNG/JPEG/WebP signature')
    if not any(p.is_file() and p.stat().st_size for p in (records / 'evidence').rglob('*')):
        errors.append('Missing evidence file')
    if not any(p.is_file() for p in work.rglob('*.html')):
        errors.append('Missing HTML source in work folder')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--student', type=Path, required=True)
    parser.add_argument('--day', type=int, required=True)
    parser.add_argument('--work-root', required=True)
    parser.add_argument('--records-root', required=True)
    parser.add_argument('--summary', type=Path)
    args = parser.parse_args()
    try:
        errors = check(args.student.resolve(), args.day, args.work_root, args.records_root)
    except (OSError, UnicodeError, ValueError) as exc:
        errors = [f'Cannot read submission: {type(exc).__name__}']
    # Never echo student contents into logs or GitHub workflow command syntax.
    report = '# Student Assignment: evidence check\n\n'
    report += 'FAIL\n' if errors else 'PASS\n'
    report += '\n'.join('- ' + e for e in errors)
    report += '\n\n形式・証拠の確認です。点数・合否・完成・公開承認は講師が判断します。\n'
    print(report)
    if args.summary:
        args.summary.write_text(report, encoding='utf-8')
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())
