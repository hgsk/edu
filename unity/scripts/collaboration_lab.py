"""Two local Git workspaces. Never touches the course repository's index or remotes.

create leaves a real conflict for inspection; resolve records the agreed result;
check proves a fresh clone contains it. Each create uses a new directory.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[2]
PARENT = ROOT / 'test-results'


def git(where, *args, expected=0):
    result = subprocess.run(['git', '-C', str(where), *args], text=True,
                            encoding='utf-8', errors='replace', capture_output=True, timeout=45)
    if result.returncode != expected:
        raise RuntimeError(f'git {args[0]} returned {result.returncode}: {result.stderr}')
    return result.stdout.strip()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding='utf-8', newline='\n')


def identity(repo, who):
    git(repo, 'config', 'user.name', f'Course {who}')
    git(repo, 'config', 'user.email', f'{who.lower()}@example.invalid')
    git(repo, 'config', 'core.autocrlf', 'false')


def commit(repo, message):
    git(repo, 'add', '.')
    git(repo, 'commit', '-m', message)


def report(lab, state, **details):
    data = {'status': state, 'root': str(lab), 'transport': 'LOCAL FILESYSTEM', **details}
    write(lab / 'report.json', json.dumps(data, indent=2))
    print(json.dumps(data))


def create():
    PARENT.mkdir(exist_ok=True)
    lab = PARENT / ('unity-team-' + uuid.uuid4().hex[:10])
    lab.mkdir()
    origin = lab / 'origin.git'; origin.mkdir()
    git(origin, 'init', '--bare', '--initial-branch=main')
    git(lab, 'clone', str(origin), 'alice')
    alice = lab / 'alice'; identity(alice, 'Alice')
    # An actual Unity serialized asset and matching script/meta, not fabricated Unity YAML.
    project = ROOT / 'unity/project'
    for relative in ['Assets/LessonSamples/CourseGameRules.asset',
                     'Assets/LessonSamples/CourseGameRules.asset.meta',
                     'Assets/Scripts/CourseGameRules.cs', 'Assets/Scripts/CourseGameRules.cs.meta']:
        source = project / relative
        destination = alice / relative; destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(source.read_bytes())
    write(alice / '.gitignore', 'Library/\nTemp/\nLogs/\nUserSettings/\n')
    write(alice / 'README.md', '# Local two-person Git exercise\nThis is an asset fixture, not a complete Unity project.\n')
    git(alice, 'lfs', 'install', '--local')
    git(alice, 'lfs', 'track', '*.bin')
    (alice / 'Assets/palette.bin').write_bytes(bytes(range(256)) * 32)
    commit(alice, 'Baseline: preserve asset GUID and track binary with LFS')
    git(alice, 'push', '-u', 'origin', 'main')
    git(lab, 'clone', str(origin), 'bob'); bob = lab / 'bob'; identity(bob, 'Bob')
    git(bob, 'lfs', 'install', '--local')
    asset = 'Assets/LessonSamples/CourseGameRules.asset'
    meta = alice / (asset + '.meta'); digest = hashlib.sha256(meta.read_bytes()).hexdigest()
    git(alice, 'switch', '-c', 'feature/alice')
    write(alice / asset, (alice / asset).read_text(encoding='utf-8').replace('targetScore: 3', 'targetScore: 4'))
    write(alice / 'review-alice.md', 'Alice: target 4 proposed. Reviewer must confirm agreed target.\n')
    commit(alice, 'Alice: propose target 4'); git(alice, 'push', '-u', 'origin', 'feature/alice')
    git(bob, 'switch', '-c', 'feature/bob')
    write(bob / asset, (bob / asset).read_text(encoding='utf-8').replace('targetScore: 3', 'targetScore: 5'))
    write(bob / 'review-bob.md', 'Bob: target 5 proposed. Agreement for this exercise: target 5.\n')
    commit(bob, 'Bob: propose target 5'); git(bob, 'push', '-u', 'origin', 'feature/bob')
    git(alice, 'switch', 'main'); git(alice, 'merge', '--no-ff', 'feature/alice', '-m', 'Integrate Alice after review')
    git(alice, 'fetch', 'origin')
    git(alice, 'merge', '--no-ff', 'origin/feature/bob', '-m', 'Integrate Bob after review', expected=1)
    conflicts = git(alice, 'diff', '--name-only', '--diff-filter=U').splitlines()
    assert conflicts == [asset], conflicts
    pointer = git(alice, 'show', 'HEAD:Assets/palette.bin')
    assert pointer.startswith('version https://git-lfs.github.com/spec/v1')
    assert (bob / 'Assets/palette.bin').read_bytes() == bytes(range(256)) * 32
    report(lab, 'CONFLICT EXPECTED', conflict=asset, metaSha256=digest,
           lfs='PASS: pointer in Git, original bytes in second workspace',
           unmerged=conflicts, review='Local review notes; no hosted pull request was created')


def validate_root(value):
    lab = Path(value).resolve()
    if lab.parent != PARENT.resolve() or not lab.name.startswith('unity-team-'):
        raise ValueError('Expected a generated directory directly under test-results')
    return lab


def resolve(lab):
    old = json.loads((lab / 'report.json').read_text())
    if old['status'] != 'CONFLICT EXPECTED':
        raise ValueError('No expected unresolved exercise; refusing to rewrite')
    alice = lab / 'alice'; asset = old['conflict']
    # Explicit exercise agreement is 5. Preserve Unity file IDs and .meta GUID.
    text = git(alice, 'show', 'origin/feature/bob:' + asset) + '\n'
    assert 'targetScore: 5' in text
    write(alice / asset, text); commit(alice, 'Resolve agreed target 5; preserve both review notes')
    git(alice, 'push', 'origin', 'main')
    report(lab, 'RESOLVED', metaSha256=old['metaSha256'])
    check(lab)


def check(lab):
    old = json.loads((lab / 'report.json').read_text()); alice = lab / 'alice'
    asset = 'Assets/LessonSamples/CourseGameRules.asset'
    assert git(alice, 'status', '--porcelain') == ''
    assert hashlib.sha256((alice / (asset + '.meta')).read_bytes()).hexdigest() == old['metaSha256']
    # Fresh clone verifies recovery from the local shared source, including actual LFS bytes.
    restored = 'restored-' + uuid.uuid4().hex[:6]
    git(lab, 'clone', str(lab / 'origin.git'), restored)
    repo = lab / restored
    assert 'targetScore: 5' in (repo / asset).read_text()
    assert (repo / 'review-alice.md').exists() and (repo / 'review-bob.md').exists()
    assert (repo / 'Assets/palette.bin').read_bytes() == bytes(range(256)) * 32
    assert hashlib.sha256((repo / (asset + '.meta')).read_bytes()).hexdigest() == old['metaSha256']
    report(lab, 'PASS', checks=['real merge conflict', 'agreed resolution', 'both changes retained',
                               'meta GUID unchanged', 'LFS binary round trip', 'fresh clone recovery'],
           metaSha256=old['metaSha256'], head=git(repo, 'rev-parse', 'HEAD'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['create', 'resolve', 'check'])
    parser.add_argument('--root')
    args = parser.parse_args()
    if args.action == 'create': create()
    elif not args.root: parser.error('--root is required')
    elif args.action == 'resolve': resolve(validate_root(args.root))
    else: check(validate_root(args.root))
