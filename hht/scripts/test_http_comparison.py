"""Guard tests; real HTTP behavior is tested by verify_http_comparison.py."""

import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

from php_container_runtime import Blocked
from serve_http_comparison import published_addresses, source_folder, static_server


class HttpGuards(unittest.TestCase):
    def test_windows_listener_rejects_lan_wildcard_empty_and_unknown(self):
        runtime = Mock(kind='wslc')
        for addresses in ([], ['0.0.0.0'], ['::'], ['192.168.1.2'], ['127.0.0.1', '0.0.0.0']):
            runtime.checked.return_value = json.dumps(addresses).encode()
            with self.subTest(addresses=addresses), self.assertRaises(Blocked):
                published_addresses(runtime, 'owned', 18765)
        runtime.checked.return_value = b'"127.0.0.1"'
        self.assertEqual(published_addresses(runtime, 'owned', 18765), ['127.0.0.1'])

    def test_docker_published_bindings_must_be_loopback(self):
        runtime = Mock(kind='docker', prefix=['docker'])
        for ip in ['127.0.0.1', '0.0.0.0']:
            runtime.checked.return_value = json.dumps([{'NetworkSettings': {'Ports': {'8000/tcp': [{'HostIp': ip}]}}}]).encode()
            if ip == '127.0.0.1':
                self.assertEqual(published_addresses(runtime, 'owned', 18765), [ip])
            else:
                with self.assertRaises(Blocked):
                    published_addresses(runtime, 'owned', 18765)

    def test_static_server_refuses_php_source_and_missing_build(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            with self.assertRaises(Blocked), static_server(source, 0):
                pass
            output = source / 'output'
            output.mkdir()
            for file in ['index.html', 'style.css', 'secret.php']:
                (output / file).write_text('test', encoding='utf-8')
            with self.assertRaises(Blocked), static_server(source, 0):
                pass

    def test_source_guard_refuses_broad_or_incomplete_mounts(self):
        from serve_http_comparison import ROOT
        for path in [Path.home(), ROOT.parent, Path(Path.cwd().anchor)]:
            with self.subTest(path=path), self.assertRaises(Blocked):
                source_folder(path)


if __name__ == '__main__':
    unittest.main()
