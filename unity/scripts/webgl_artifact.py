"""Fingerprint WebGL inputs and verify the published local artifact; no Unity needed."""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'unity/webgl'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inputs():
    paths = [ROOT / 'hht/docs/workbook/unity.md']
    for directory in ['unity/project/Assets', 'unity/project/Packages', 'unity/project/ProjectSettings', 'unity/scripts']:
        paths += [p for p in (ROOT / directory).rglob('*') if p.is_file()
                  and '__pycache__' not in p.parts and p.suffix not in ('.pyc', '.log')]
    paths += list((ROOT / 'unity').glob('*.js'))
    paths += list((ROOT / 'unity').glob('*.css'))
    paths += [ROOT / 'unity/docs/course-design.md', ROOT / 'unity/README.md', ROOT / 'unity/samples.md']
    paths += [ROOT / 'unity/package.json']
    paths += [ROOT / 'unity/references.md', ROOT / 'unity/instructor.md', ROOT / 'unity/spatial-kit-notes.md']
    paths += [p for p in (ROOT / 'unity/source-models').rglob('*') if p.is_file()]
    chapter = (ROOT / 'hht/docs/workbook/unity.md').read_text(encoding='utf-8').split('<a id="unity-course"></a>')[1]
    paths += [ROOT / 'hht/assets/unity' / name for name in set(re.findall(r'!\[[^\]]*\]\(../../assets/unity/([^)]*)\)', chapter))
              if name not in {'webgl-runtime.png', 'reader-1440.png', 'reader-390.png'}]
    ignored = {'unity/project/Assets/Resources/WebCourseCatalog.json',
               'unity/project/Assets/Resources/WebCourseCatalog.json.meta',
               'unity/project/Assets/Resources.meta'}
    return {p.relative_to(ROOT).as_posix(): digest(p) for p in sorted(set(paths))
            if p.relative_to(ROOT).as_posix() not in ignored}


def fingerprint(values=None):
    return hashlib.sha256(json.dumps(inputs() if values is None else values, sort_keys=True).encode()).hexdigest()


def record(directory, documentation_migration_from=None):
    catalog = json.loads((directory / 'catalog.json').read_text(encoding='utf-8'))
    expected = {f'{i:02}-{v}' for i in range(1, 37) for v in ['start', 'complete']}
    assert {e['key'] for e in catalog['scenes']} == expected, '72-scene catalog is incomplete'
    for pattern in ['*.loader.js', '*.framework.js', '*.data', '*.wasm']:
        assert list((directory / 'Build').glob(pattern)), f'Missing Web build file: {pattern}'
    values = inputs()
    report = {'schema': 1, 'status': 'PASS', 'fingerprint': fingerprint(values),
              'inputs': values, 'sceneCount': 72, 'vfxGraph': 'EDITOR_ONLY',
              'files': {p.relative_to(directory).as_posix(): digest(p)
                        for p in sorted(directory.rglob('*')) if p.is_file() and p.name != 'manifest.json'}}
    if documentation_migration_from is not None:
        documentation_migration_from = documentation_migration_from.resolve()
        assert documentation_migration_from.is_relative_to(ROOT.resolve()), 'Previous manifest must stay inside the repository'
        previous = json.loads(documentation_migration_from.read_text(encoding='utf-8'))
        assert previous['status'] == 'PASS' and previous['sceneCount'] == 72
        assert previous['files'] == report['files'], 'Documentation migration must not change runtime artifact files'
        report['compiledArtifactsRebuilt'] = False
        report['documentationMigration'] = {
            'kind': 'workbook-split',
            'previousManifestPath': documentation_migration_from.relative_to(ROOT.resolve()).as_posix(),
            'previousManifestSha256': digest(documentation_migration_from),
            'previousFingerprint': previous['fingerprint'],
            'unchangedArtifactFiles': previous['files'],
        }
    (directory / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def check(directory=OUTPUT):
    report = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    assert report['status'] == 'PASS' and report['sceneCount'] == 72
    assert report['fingerprint'] == fingerprint(), 'WebGL is stale: run python unity/scripts/build_course.py'
    if report.get('compiledArtifactsRebuilt') is False:
        migration = report['documentationMigration']
        assert migration['kind'] == 'workbook-split', 'Unknown documentation-only migration'
        assert migration['unchangedArtifactFiles'] == report['files'], 'Documentation migration changed runtime files'
        assert re.fullmatch(r'[0-9a-f]{64}', migration['previousManifestSha256'])
        assert re.fullmatch(r'[0-9a-f]{64}', migration['previousFingerprint'])
        prior_path = (ROOT / migration['previousManifestPath']).resolve()
        assert prior_path.is_relative_to(ROOT.resolve()), 'Previous manifest path escapes repository'
        assert digest(prior_path) == migration['previousManifestSha256'], 'Previous manifest hash mismatch'
        prior = json.loads(prior_path.read_text(encoding='utf-8'))
        assert prior['fingerprint'] == migration['previousFingerprint'], 'Previous fingerprint mismatch'
        assert prior['files'] == migration['unchangedArtifactFiles'], 'Previous artifact file evidence mismatch'


    for name, sha in report['files'].items():
        path = (directory / name).resolve()
        assert path.is_relative_to(directory.resolve()), 'Invalid artifact path'
        assert path.is_file() and digest(path) == sha, f'WebGL artifact missing or changed: {name}'
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['fingerprint', 'record', 'check'])
    parser.add_argument('--directory', type=Path, default=OUTPUT)
    parser.add_argument('--documentation-migration-from', type=Path)
    args = parser.parse_args()
    try:
        if args.action == 'fingerprint':
            print(fingerprint())
        elif args.action == 'record':
            record(args.directory, args.documentation_migration_from)
            print('PASS: documentation-only migration; runtime hashes unchanged; no rebuild'
                  if args.documentation_migration_from else 'PASS: recorded WebGL inputs and artifact hashes')
        else:
            check(args.directory)
            print('PASS: WebGL matches current teaching material and all artifact hashes')
    except (AssertionError, OSError, ValueError, KeyError) as error:
        raise SystemExit(f'FAIL: {error}')
