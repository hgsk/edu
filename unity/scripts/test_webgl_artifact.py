"""Build-independent tests for stale-input and corrupted-output rejection."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
import webgl_artifact as artifact


class ArtifactTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        (self.directory / 'Build').mkdir()
        for name in ['course.loader.js', 'course.framework.js', 'course.data', 'course.wasm']:
            (self.directory / 'Build' / name).write_bytes(b'fixture')
        (self.directory / 'index.html').write_text('fixture')
        self.catalog = self.directory / 'catalog.json'
        self.catalog.write_text(json.dumps({'scenes': [{'key': f'{i:02}-{v}'} for i in range(1, 37) for v in ['start', 'complete']]}))
        self.inputs = patch.object(artifact, 'inputs', return_value={'source': 'one'})
        self.inputs.start()
        self.addCleanup(self.inputs.stop)

    def test_normal_record_and_check(self):
        artifact.record(self.directory)
        self.assertEqual(artifact.check(self.directory)['sceneCount'], 72)

    def test_source_change_rejected(self):
        artifact.record(self.directory)
        with patch.object(artifact, 'inputs', return_value={'source': 'two'}):
            with self.assertRaisesRegex(AssertionError, 'stale'):
                artifact.check(self.directory)

    def test_corruption_rejected(self):
        artifact.record(self.directory)
        (self.directory / 'Build/course.wasm').write_bytes(b'changed')
        with self.assertRaisesRegex(AssertionError, 'changed'):
            artifact.check(self.directory)

    def test_documentation_migration_keeps_all_runtime_hashes(self):
        artifact.record(self.directory)
        snapshot = TemporaryDirectory()
        self.addCleanup(snapshot.cleanup)
        previous = Path(snapshot.name) / 'before.json'
        root_patch = patch.object(artifact, 'ROOT', Path(snapshot.name))
        root_patch.start()
        self.addCleanup(root_patch.stop)
        previous.write_text((self.directory / 'manifest.json').read_text())
        artifact.record(self.directory, previous)
        report = artifact.check(self.directory)
        self.assertIs(report['compiledArtifactsRebuilt'], False)
        report['documentationMigration']['unchangedArtifactFiles'] = {}
        (self.directory / 'manifest.json').write_text(json.dumps(report))
        with self.assertRaisesRegex(AssertionError, 'changed runtime files'):
            artifact.check(self.directory)

    def test_documentation_migration_checks_saved_manifest_identity(self):
        artifact.record(self.directory)
        snapshot = TemporaryDirectory()
        self.addCleanup(snapshot.cleanup)
        previous = Path(snapshot.name) / 'before.json'
        previous.write_text((self.directory / 'manifest.json').read_text())
        root_patch = patch.object(artifact, 'ROOT', Path(snapshot.name))
        root_patch.start()
        self.addCleanup(root_patch.stop)
        artifact.record(self.directory, previous)
        original = json.loads((self.directory / 'manifest.json').read_text())
        for field, message in [('previousManifestSha256', 'manifest hash mismatch'),
                               ('previousFingerprint', 'fingerprint mismatch')]:
            with self.subTest(field=field):
                report = json.loads(json.dumps(original))
                report['documentationMigration'][field] = '0' * 64
                (self.directory / 'manifest.json').write_text(json.dumps(report))
                with self.assertRaisesRegex(AssertionError, message):
                    artifact.check(self.directory)

    def test_documentation_migration_rejects_changed_runtime(self):
        artifact.record(self.directory)
        snapshot = TemporaryDirectory()
        self.addCleanup(snapshot.cleanup)
        previous = Path(snapshot.name) / 'before.json'
        root_patch = patch.object(artifact, 'ROOT', Path(snapshot.name))
        root_patch.start()
        self.addCleanup(root_patch.stop)
        previous.write_text((self.directory / 'manifest.json').read_text())
        (self.directory / 'Build/course.wasm').write_bytes(b'changed runtime')
        with self.assertRaisesRegex(AssertionError, 'must not change runtime'):
            artifact.record(self.directory, previous)

    def test_missing_file_rejected(self):
        (self.directory / 'Build/course.wasm').unlink()
        with self.assertRaisesRegex(AssertionError, 'Missing'):
            artifact.record(self.directory)

    def test_missing_scenes_rejected(self):
        self.catalog.write_text('{"scenes":[]}')
        with self.assertRaisesRegex(AssertionError, 'incomplete'):
            artifact.record(self.directory)


if __name__ == '__main__':
    unittest.main()
