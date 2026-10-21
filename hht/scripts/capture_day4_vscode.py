"""Capture the real VS Code renderer on an ephemeral Windows CI desktop."""
import json
import os
from pathlib import Path
import subprocess
import time
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
out = root/'test-results/day4'
pack = out/'day4-s000'
profile = Path(os.environ['RUNNER_TEMP'])/'day4-code-profile'
settings = profile/'User/settings.json'
settings.parent.mkdir(parents=True, exist_ok=True)
settings.write_text(json.dumps({'security.workspace.trust.enabled': False, 'workbench.startupEditor': 'none',
    'window.title': 'DAY4 rehearsal - ${activeEditorShort}', 'editor.fontSize': 16, 'window.zoomLevel': 0,
    'telemetry.telemetryLevel': 'off', 'update.mode': 'none'}), encoding='utf-8')
exe = Path(os.environ['RUNNER_TEMP'])/'day4-vscode/Code.exe'
process = subprocess.Popen([str(exe), '--user-data-dir', str(profile), '--disable-extensions',
    '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes', '--new-window',
    '--remote-debugging-port=9222', str(pack), '--diff', str(pack/'before/about.html'), str(pack/'after/about.html')])
try:
    with sync_playwright() as pw:
        browser = None
        for _ in range(80):
            try:
                browser = pw.chromium.connect_over_cdp('http://127.0.0.1:9222', timeout=1500)
                break
            except Exception:
                time.sleep(.5)
        if browser is None:
            raise RuntimeError('VS Code debug renderer did not start')
        try:
            page = browser.contexts[0].pages[0]
            expect(page.locator('.monaco-diff-editor').first).to_be_visible(timeout=60000)
            page.screenshot(path=str(out/'vscode-diff.png'), full_page=True)
            (out/'vscode-renderer.txt').write_text(page.locator('body').inner_text(), encoding='utf-8')
            (out/'vscode-result.json').write_text(json.dumps({'result':'PASS', 'app':'Microsoft VS Code 1.105.1',
                'verified':'actual diff editor visible with before/after opened',
                'context_menu_clicks':'NOT RUN', 'human_comprehension':'NOT RUN'}), encoding='utf-8')
        finally:
            browser.close()
finally:
    subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], check=False, capture_output=True)
