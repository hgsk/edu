"""Capture the real VS Code renderer on an ephemeral Windows CI desktop."""
import json
import os
from pathlib import Path
import subprocess
import shutil
from check_day4_practice import package
import time
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
out = root/'test-results/day4'
pack = out/'day4-s000'
profile = Path(os.environ['RUNNER_TEMP'])/'day4-code-profile'
settings = profile/'User/settings.json'
settings.parent.mkdir(parents=True, exist_ok=True)
settings.write_text(json.dumps({'security.workspace.trust.enabled': False, 'workbench.startupEditor': 'none',
    'window.title': 'DAY4 rehearsal - ${activeEditorShort}', 'editor.fontSize': 16, 'editor.experimentalEditContextEnabled': False, 'window.zoomLevel': 0,
    'telemetry.telemetryLevel': 'off', 'update.mode': 'none'}), encoding='utf-8')
expected_source = (pack/'after/about.html').read_text(encoding='utf-8')
(pack/'after/about.html').write_bytes((pack/'before/about.html').read_bytes())
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
            (out/'vscode-before-edit.html').write_text(page.content(), encoding='utf-8')
            page.screenshot(path=str(out/'vscode-before-edit.png'), full_page=True)
            editor = page.locator('.monaco-diff-editor .monaco-editor .view-lines').last
            editor.click(position={'x': 50, 'y': 10})
            page.keyboard.press('Control+A')
            page.keyboard.insert_text(expected_source)
            page.keyboard.press('Control+S')
            for _ in range(40):
                if (pack/'after/about.html').read_text(encoding='utf-8') == expected_source:
                    break
                time.sleep(.25)
            else:
                raise AssertionError('VS Code edit/save did not reach the file')
            expect(page.locator('.monaco-diff-editor').first).to_contain_text('営業時間')
            page.screenshot(path=str(out/'vscode-diff.png'), full_page=True)
            shutil.copy2(out/'vscode-diff.png', pack/'screenshots/html-diff.png')
            package(out, pack)  # Final ZIP includes the real VS Code screenshot and saved file.
            (out/'vscode-renderer.txt').write_text(page.locator('body').inner_text(), encoding='utf-8')
            (out/'vscode-result.json').write_text(json.dumps({'result':'PASS', 'app':'Microsoft VS Code 1.105.1',
                'verified':'real modified editor typed and saved; disk equals expected HTML; before/after diff visible',
                'context_menu_clicks':'NOT RUN', 'human_comprehension':'NOT RUN'}), encoding='utf-8')
        finally:
            browser.close()
finally:
    subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], check=False, capture_output=True)
