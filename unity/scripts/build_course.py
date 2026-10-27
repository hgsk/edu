"""Build the offline Unity reader from the canonical workbook; validate its assets."""
import argparse
import html
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'hht/docs/workbook/unity.md'
OUTPUT = ROOT / 'unity/index.html'


def inline(text):
    text = html.escape(text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    def link(m):
        url = m[2]
        if url.startswith('../../assets/'):
            url = '../hht/' + url[6:]
        elif url.startswith('../../../unity/'):
            url = './' + url[len('../../../unity/'):]
        return f'<a href="{url}">{m[1]}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, text)


def build(source):
    start = '<a id="unity-course"></a>'
    if source.count(start) != 1:
        raise ValueError('Expected one canonical Unity chapter')
    chapter = source.split(start, 1)[1]
    units = re.findall(r'^#### U(\d{2}) (.+)$', chapter, re.M)
    if [code for code, _ in units] != [f'{i:02}' for i in range(1, 37)]:
        raise ValueError('Expected U01-U36 in order')
    for part in re.split(r'^#### U\d{2} ', chapter, flags=re.M)[1:]:
        for label in ['依頼者・見る人', '困りごと', '変更', '完成条件', '準備', '確認して報告']:
            if f'**{label}：**' not in part:
                raise ValueError(f'Missing field: {label}')
        if len(re.findall(r'!\[[^\]]+\]\(', part)) < 2:
            raise ValueError('Each unit needs start and operation/result screenshots')
    result, list_kind, in_code = [], None, False
    for line in chapter.splitlines():
        if line.startswith('```'):
            if list_kind:
                result.append(f'</{list_kind}>'); list_kind = None
            result.append('</code></pre>' if in_code else '<pre><code>')
            in_code = not in_code
            continue
        if in_code:
            result.append(html.escape(line) + '\n')
            continue
        kind = 'ol' if re.match(r'^\d+\. ', line) else 'ul' if line.startswith('- ') else None
        if kind != list_kind and list_kind:
            result.append(f'</{list_kind}>')
            list_kind = None
        if not line.strip():
            continue
        if kind:
            if list_kind is None:
                result.append(f'<{kind}>'); list_kind = kind
            result.append('<li>' + inline(re.sub(r'^(?:\d+\. |\- )', '', line)) + '</li>')
        elif (anchor := re.fullmatch(r'<a id="(unity-\d{2})"></a>', line)):
            result.append(f'<div id="{anchor[1]}" class="anchor"></div>')
        elif (heading := re.match(r'^(#{2,4}) (.+)', line)):
            level = len(heading[1]) - 1
            result.append(f'<h{level}>' + inline(heading[2]) + f'</h{level}>')
        elif (img := re.fullmatch(r'!\[([^\]]+)\]\(([^)]+)\)', line)):
            path = (SOURCE.parent / img[2]).resolve()
            if not path.is_relative_to(ROOT / 'hht/assets/unity') or not path.is_file():
                raise ValueError(f'Missing or unexpected screenshot: {img[2]}')
            src = '../hht/assets/unity/' + path.name
            alt = html.escape(img[1], quote=True)
            result.append(f'<figure><a href="{src}"><img loading="lazy" src="{src}" alt="{alt}"></a><figcaption>{alt}（クリックで拡大）</figcaption></figure>')
        else:
            rendered = inline(line)
            rendered = re.sub(r'<a href="(\./webgl/[^\"]*)">', r'<a data-webgl href="\1">', rendered)
            result.append('<p>' + rendered + '</p>')
    if list_kind:
        result.append(f'</{list_kind}>')
    nav = ''.join(f'<a href="#unity-{code}">U{code} {html.escape(title)}</a>' for code, title in units)
    return '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unity操作基礎講座 | edu</title><link rel="stylesheet" href="style.css"></head>
<body><a class="skip" href="#main">本文へ</a><header><a href="../README.md">edu</a><span>Unity操作基礎講座</span><a href="README.md">講座案内</a></header>
<div class="layout"><aside><details open><summary>36単元の目次</summary><nav aria-label="単元">''' + nav + '''</nav></details><a href="../hht/docs/workbook/unity.md#unity-course">学生ワークブック（正本）</a></aside>
<main id="main">''' + '\n'.join(result) + '''<footer><p><a href="verification.md">撮影・検証記録</a> · <a href="references.md">用語と公式資料</a></p></footer></main></div><script src="workbook-player.js"></script></body></html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--html-only', action='store_true', help='Internal rendering step; does not build WebGL')
    args = parser.parse_args()
    if not args.check and not args.html_only:
        raise SystemExit(subprocess.call(['pwsh', '-NoProfile', '-File', str(ROOT / 'unity/scripts/Update-Course.ps1')], cwd=ROOT))
    value = build(SOURCE.read_text(encoding='utf-8'))
    if args.check:
        from webgl_artifact import check
        check()
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding='utf-8') != value:
            raise SystemExit('FAIL: regenerate unity/index.html')
        print(f'PASS: 36 units, required fields, {value.count("<figure>")} screenshot references, canonical HTML')
    else:
        OUTPUT.write_text(value, encoding='utf-8', newline='\n')
        print('PASS: generated unity/index.html')


if __name__ == '__main__':
    main()
