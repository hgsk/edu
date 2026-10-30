"""Enforce the confirmed slide policy without inventing grading or PR destinations."""
from pathlib import Path
import re

TITLES = {
    10: '伝える内容を決め、ベースを作る',
    11: '情報が伝わるベースを完成させる',
    12: '同じ作品で、伝わりにくい所を直す',
    13: '余裕があれば、近くの人に見てもらう',
    14: '必要なフィードバックを反映する',
    15: '伝わるページとして仕上げる',
}


def validate(root: Path) -> list[str]:
    errors = []
    common = (root / 'docs/workbook/common.md').read_text(encoding='utf-8')
    for term in ('破棄前に教材の外へコピー', '未追跡ファイル', 'Pull',
                 '作品では変更を破棄しません', 'Documents/portfolio',
                 '全15回ともGitHub PRで提出', '提出用ZIPの作成・圧縮・USB回収は行いません',
                 '提出先が未案内なら', '講師の閲覧権限', 'コミットSHA'):
        if term not in common:
            errors.append(f'Current workflow missing safeguard: {term}')
    for n, title in TITLES.items():
        text = (root / f'docs/workbook/day{n:02}.md').read_text(encoding='utf-8')
        for term in (f'# DAY {n} {title}', 'Documents/portfolio', '同じ作品',
                     'Git', 'submission-policy', '必須にしません', f'legacy-workbook/day{n:02}.md'):
            if term not in text:
                errors.append(f'DAY {n} slide alignment missing: {term}')
        for obsolete in (f'git tag -f day{n:02}-end', f'`hht/day{n:02}/` のファイルを編集', '公開URLで表示を確認した'):
            if obsolete in text:
                errors.append(f'DAY {n} reintroduced old workflow: {obsolete}')
        archive = root / f'docs/legacy-workbook/day{n:02}.md'
        if not archive.exists() or '旧構成の参考資料' not in archive.read_text(encoding='utf-8'):
            errors.append(f'DAY {n} legacy data must be explicitly marked')
        for portal in ('student/README.md', 'docs/student-workbook.md',
                       'student/assignment-checks.md', f'instructor/lessons/{n:02}/README.md'):
            document = (root / portal).read_text(encoding='utf-8')
            if title not in document or f'day{n:02}.md' not in document:
                errors.append(f'{portal} does not route to current DAY {n}')
    return errors
