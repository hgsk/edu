"""Local-only PHP request rendering versus Python static HTTP serving."""

import argparse
from contextlib import contextmanager
import functools
import http.server
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import uuid

from php_container_runtime import Blocked, ContainerRuntime, SECURITY_PROBE, check_process_security, cli_text, json_rows

ROOT = Path(__file__).resolve().parents[1]
IMAGE = (ROOT / 'hands-on/php-cli-template/image.txt').read_text(encoding='utf-8').strip()


def source_folder(value):
    source = Path(value).resolve()
    if source in {Path.home().resolve(), ROOT.parent.resolve()} or source.parent == source:
        raise Blocked('Use only your HTTP exercise copy')
    for file in ('data.php', 'render.php', 'build.php', 'public/index.php', 'public/style.css', 'templates/page.php'):
        if not (source / file).is_file():
            raise Blocked('Incomplete HTTP exercise: ' + file)
    return source


def prepare_php(source, kind):
    runtime = ContainerRuntime(kind)
    runtime.probe()
    runtime.pull(IMAGE)
    if not any(digest.endswith('@' + IMAGE.split('@')[1]) for digest in runtime.image_digests(IMAGE)):
        raise Blocked('Official image digest mismatch')
    status = runtime.run(source, IMAGE, 'php', '-r', SECURITY_PROBE)
    runtime.report['process_security_cli'] = check_process_security(status, require_reduced_privileges=kind == 'docker')
    if runtime.run(source, IMAGE, 'php', '-r', 'echo PHP_VERSION;') != b'8.4.27':
        raise Blocked('Expected official PHP 8.4.27')
    return runtime


def wait_http(url, process=None):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise Blocked('PHP server exited; read its server log')
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        time.sleep(.2)
    raise Blocked('Localhost HTTP startup timed out')


def published_addresses(runtime, name, port):
    if runtime.kind == 'wslc':
        # wslc 3.0.3 inspect omits published-port metadata. Read actual Windows listeners.
        command = f'@(Get-NetTCPConnection -State Listen -LocalPort {int(port)} -ErrorAction Stop | Select-Object -ExpandProperty LocalAddress) | ConvertTo-Json -Compress'
        data = runtime.checked(['powershell.exe', '-NoProfile', '-Command', command])
        value = json.loads(cli_text(data))
        addresses = value if isinstance(value, list) else [value]
    else:
        row = json_rows(runtime.checked([*runtime.prefix, 'container', 'inspect', name]))[0]
        bindings = row.get('NetworkSettings', {}).get('Ports', {}).get('8000/tcp') or []
        addresses = [entry.get('HostIp') for entry in bindings]
    if not addresses or any(address not in {'127.0.0.1', '::1'} for address in addresses):
        raise Blocked('HTTP must be published only on host loopback: ' + repr(addresses))
    return addresses


@contextmanager
def php_server(source, port, runtime, result_dir):
    if '--publish' not in runtime.report['run_options']:
        raise Blocked('Runtime does not support loopback port publishing')
    name = 'hht-http-' + uuid.uuid4().hex
    args = runtime.run_args(source, IMAGE, ['php', '-S', '0.0.0.0:8000', '-t', '/work/public'], name)
    # HTTP is an explicit separate profile; offline CLI generation stays network none.
    args[args.index('--network') + 1] = 'bridge'
    args[args.index(IMAGE):args.index(IMAGE)] = ['--publish', f'127.0.0.1:{port}:8000']
    # Refuse a port already in use; never stop or replace another service.
    with socket.socket() as available:
        available.bind(('127.0.0.1', port))
    result_dir.mkdir(parents=True, exist_ok=True)
    info = {'name': name, 'url': f'http://localhost:{port}/', 'runtime': runtime.kind, 'command': args}
    with (result_dir / 'php-server.log').open('wb') as log:
        process = subprocess.Popen(args, stdout=log, stderr=subprocess.STDOUT)
        info.update(cli_pid=process.pid, started_epoch=time.time(), executable=args[0])
        try:
            wait_http(info['url'], process)
            info['host_listeners'] = published_addresses(runtime, name, port)
            yield info
        finally:
            try:
                runtime.cleanup(name)
                info['container_cleanup'] = 'PASS'
            finally:
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.terminate()
                    process.wait(timeout=5)
                info['cli_exit_code'] = process.returncode


class StaticHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


@contextmanager
def static_server(source, port):
    directory = source / 'output'
    if not (directory / 'index.html').is_file() or not (directory / 'style.css').is_file():
        raise Blocked('Run --mode build before static serving')
    if any(directory.rglob('*.php')):
        raise Blocked('Never expose PHP source through a static server')
    handler = functools.partial(StaticHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    info = {'url': f'http://localhost:{port}/', 'host_listeners': [server.server_address[0]], 'directory': str(directory),
            'pid': os.getpid(), 'executable': sys.executable, 'started_epoch': time.time()}
    try:
        yield info
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()
        if thread.is_alive():
            raise Blocked('Static server thread did not stop')
        info['server_cleanup'] = 'PASS'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--mode', choices=['build', 'php', 'static'], required=True)
    parser.add_argument('--port', type=int)
    parser.add_argument('--runtime', choices=['wslc', 'docker'], default='wslc', help='docker is Linux CI only')
    args = parser.parse_args()
    source = source_folder(args.source)
    if args.port is not None and not 1024 <= args.port <= 65535:
        parser.error('Use a local unprivileged port from 1024 to 65535')
    results = ROOT.parent / 'test-results/http-comparison'
    if args.mode == 'build':
        runtime = prepare_php(source, args.runtime)
        print(runtime.run(source, IMAGE, 'php', '/work/build.php').decode('utf-8'), end='')
        return
    context = static_server(source, args.port or 18766) if args.mode == 'static' else php_server(source, args.port or 18765, prepare_php(source, args.runtime), results)
    info = {}
    try:
        with context as info:
            print(json.dumps(info, ensure_ascii=False, indent=2), flush=True)
            print('Open this localhost HTTP URL in Windows. Ctrl+C stops only this server.', flush=True)
            while True:
                time.sleep(.5)
    except KeyboardInterrupt:
        print('Stopped. ' + json.dumps(info, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Blocked as error:
        raise SystemExit('BLOCKED: ' + str(error)) from error
