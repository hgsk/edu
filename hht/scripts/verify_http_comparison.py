"""Real HTTP integration checks. --browser adds actual Windows Chrome screenshots."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

from serve_http_comparison import IMAGE, ROOT, php_server, prepare_php, static_server


def free_port():
    with socket.socket() as connection:
        connection.bind(('127.0.0.1', 0))
        return connection.getsockname()[1]


def request(url, records):
    with urllib.request.urlopen(url, timeout=5) as response:
        data = response.read()
        records.append({'url': url, 'status': response.status, 'content_type': response.headers.get('Content-Type'),
                        'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
        if response.status != 200:
            raise AssertionError('Expected HTTP 200')
        return data, response.headers


def render_id(data):
    return re.search('生成ID：([^<]+)', data.decode('utf-8')).group(1)


def screenshot(url, output, identities):
    chrome = Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    if not chrome.is_file():
        raise RuntimeError('Existing Windows Chrome is required; never install automatically')
    args = [str(chrome), '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--window-size=1280,900', f'--user-data-dir={output.parent / (output.stem + "-profile")}',
            f'--screenshot={output}', url]
    process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    identity = {'pid': process.pid, 'executable': str(chrome), 'started_epoch': time.time(), 'url': url, 'screenshot': output.name}
    try:
        _, error = process.communicate(timeout=40)
        if process.returncode or not output.is_file() or output.stat().st_size < 1000:
            raise RuntimeError('Browser capture failed: ' + error.decode('utf-8', errors='replace'))
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        identity.update(exit_code=process.returncode, cleanup='PASS: recorded process exited')
        identities.append(identity)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', choices=['wslc', 'docker'], default='wslc')
    parser.add_argument('--browser', action='store_true')
    args = parser.parse_args()
    output = ROOT.parent / 'test-results/http-comparison'
    output.mkdir(parents=True, exist_ok=True)
    report = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'runtime': args.runtime,
              'image': IMAGE, 'requests': [], 'browser': [], 'assertions': []}

    def passed(message):
        report['assertions'].append(message)
        print('PASS ' + message, flush=True)

    try:
        with tempfile.TemporaryDirectory(dir=output) as directory:
            source = Path(directory) / 'HTTP 実測 作業'
            shutil.copytree(ROOT / 'hands-on/php-http-comparison/starter', source)
            runtime = prepare_php(source, args.runtime)
            runtime.run(source, IMAGE, 'php', '/work/build.php')
            php_port, static_port = free_port(), free_port()
            while static_port == php_port:
                static_port = free_port()
            with php_server(source, php_port, runtime, output) as php, static_server(source, static_port) as static:
                report.update(php_server=php, static_server=static, runtime_report=runtime.report)
                passed('both HTTP listeners are host loopback only')

                def capture(state):
                    for mode, server in [('php', php), ('static', static)]:
                        html, headers = request(server['url'], report['requests'])
                        text = html.decode('utf-8')
                        assert headers.get_content_type() == 'text/html'
                        assert '公園店' in text and '<?php' not in text
                        assert b'\xef\xbb\xbf' != html[:3]
                        (output / f'{mode}-{state}.html').write_bytes(html)
                        css, css_headers = request(server['url'] + 'style.css', report['requests'])
                        assert css_headers.get_content_type() == 'text/css'
                        assert b'font-family' in css
                        if args.browser:
                            screenshot(server['url'], output / f'{mode}-{state}.png', report['browser'])
                    passed(state + ': HTTP HTML/CSS and Japanese UTF-8')

                capture('normal')
                php1, _ = request(php['url'], report['requests'])
                php2, _ = request(php['url'], report['requests'])
                static1, _ = request(static['url'], report['requests'])
                static2, _ = request(static['url'], report['requests'])
                assert render_id(php1) != render_id(php2)
                assert static1 == static2 == (source / 'output/index.html').read_bytes()
                passed('PHP executes per request; Python serves unchanged saved HTML bytes')
                with urllib.request.urlopen(static['url'] + 'style.css') as response:
                    old_css = response.read()
                data = (source / 'data.php').read_bytes()
                changed = data.replace(b"'closed' => true", b"'closed' => false")
                (source / 'data.php').write_bytes(changed)
                css = source / 'public/style.css'
                css.write_bytes(css.read_bytes().replace(b'#183544', b'#6b2133') + '/* 更新確認 */\n'.encode('utf-8'))
                dynamic, _ = request(php['url'], report['requests'])
                stale, _ = request(static['url'], report['requests'])
                assert '本日休業' not in dynamic.decode('utf-8') and '本日休業' in stale.decode('utf-8')
                dynamic_css, _ = request(php['url'] + 'style.css', report['requests'])
                static_css, _ = request(static['url'] + 'style.css', report['requests'])
                assert dynamic_css != old_css and static_css == old_css
                assert render_id(stale) == render_id(static1)
                passed('data/CSS saves update PHP immediately; static remains old until build')
                runtime.run(source, IMAGE, 'php', '/work/build.php')
                fresh, _ = request(static['url'], report['requests'])
                fresh_css, _ = request(static['url'] + 'style.css', report['requests'])
                assert '本日休業' not in fresh.decode('utf-8') and fresh_css == dynamic_css
                assert render_id(fresh) != render_id(static1)
                capture('condition')
                passed('rebuild updates static HTML/CSS and render ID')
                (source / 'data.php').write_bytes(changed.replace('週末のお知らせ & ご案内'.encode(), '<b>試作</b> & 確認'.encode()))
                runtime.run(source, IMAGE, 'php', '/work/build.php')
                for server in (php, static):
                    special, _ = request(server['url'], report['requests'])
                    assert '&lt;b&gt;試作&lt;/b&gt; &amp; 確認' in special.decode('utf-8')
                    assert '<b>試作</b>' not in special.decode('utf-8')
                    try:
                        urllib.request.urlopen(server['url'] + 'data.php', timeout=3)
                    except urllib.error.HTTPError as error:
                        assert error.code == 404
                    else:
                        raise AssertionError('Private PHP data must not be exposed')
                capture('special')
                passed('special characters escaped and private PHP data not exposed')
            for port in (php_port, static_port):
                with socket.socket() as connection:
                    connection.settimeout(1)
                    assert connection.connect_ex(('127.0.0.1', port)) != 0
            passed('both server ports closed and owned container absent after cleanup')
        report['result'] = 'PASS'
    finally:
        (output / 'http-report.json').write_bytes((json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print('HTTP COMPARISON: PASS', flush=True)


if __name__ == '__main__':
    main()
