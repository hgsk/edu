"""Instructor-only rehearsal, not a student grader. Never reads the answer example."""
import argparse
from collections import Counter
import difflib
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[2]


def edit(source):
    # Move the actual supplied paragraphs, rather than retyping their values.
    paragraphs = re.findall(r'<p>.*?</p>', source)
    assert len(paragraphs) == 6, 'The start pack changed; review the lesson before rehearsing'
    intro, dummy, hours, closed, address, _copyright = paragraphs
    start = source.index('    <div class="section">')
    end = source.index('    <footer', start)
    center = f'''    <main class="section">
      <h1>店舗案内</h1>
      <section>
        <h2>営業時間</h2>
        {hours}
        {closed.replace('<p>', '<p>定休日：')}
      </section>
      <section>
        <h2>アクセス</h2>
        {address.replace('<p>', '<p>住所：')}
      </section>
      <section>
        <h2>私たちについて</h2>
        {intro}
        {dummy}
        <a class="menu-button" href="menu.html">メニューを見る</a>
      </section>
    </main>
'''
    return source[:start] + center + source[end:]


class Structure(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.tags = []
        self.links = []
        self.text = []
        self.feed(source)
        assert not self.stack, self.stack

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, tuple(self.stack)))
        self.links.extend(v for k, v in attrs if k == 'href')
        if tag not in {'meta', 'link', 'br', 'img', 'input', 'hr'}:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, f'unbalanced {tag}'

    def handle_data(self, value):
        if value.strip():
            self.text.append((tuple(self.stack), value.strip()))


def verify(before, after):
    old = (before/'about.html').read_text(encoding='utf-8')
    new = (after/'about.html').read_text(encoding='utf-8')
    a, b = Structure(old), Structure(new)
    assert sum(tag == 'main' for tag, _ in b.tags) == 1
    assert sum(tag == 'section' and parent[-1:] == ('main',) for tag, parent in b.tags) == 3
    assert [text for tags, text in b.text if tags[-1:] == ('h2',)] == ['営業時間', 'アクセス', '私たちについて']
    def body_values(parsed):
        return Counter(re.sub(r'^(定休日：|住所：)', '', text)
                       for tags, text in parsed.text if 'body' in tags and not any(t.startswith('h') and t[1:].isdigit() for t in tags))
    assert body_values(a) == body_values(b), 'body wording changed'
    assert Counter(a.links) == Counter(b.links), 'href changed'
    for tag in ['header', 'footer', 'head']:
        assert re.search(fr'<{tag}\b.*?</{tag}>', old, re.S)[0] == re.search(fr'<{tag}\b.*?</{tag}>', new, re.S)[0]
    for name in ['index.html', 'menu.html', 'css/style.css']:
        assert (before/name).read_bytes() == (after/name).read_bytes(), name


def rehearse(out):
    out.mkdir(parents=True, exist_ok=False)
    with ZipFile(ROOT/'hht/lessons/04/day4-start.zip') as z:
        expected = {str(p.relative_to(ROOT/'hht/lessons/04/start')).replace('\\', '/')
                    for p in (ROOT/'hht/lessons/04/start').rglob('*') if p.is_file()}
        actual = {n.removeprefix('day4-start/') for n in z.namelist() if not n.endswith('/')}
        assert actual == expected
        for n in actual:
            assert z.read('day4-start/'+n) == (ROOT/'hht/lessons/04/start'/n).read_bytes()
        z.extractall(out/'download')
    pack = out/'day4-s000'
    shutil.copytree(out/'download/day4-start', pack/'before')
    shutil.copytree(pack/'before', pack/'after')
    old = (pack/'before/about.html').read_text(encoding='utf-8')
    new = edit(old)
    (pack/'after/about.html').write_text(new, encoding='utf-8')
    verify(pack/'before', pack/'after')
    # Check that the rehearsal's assertions catch common destructive mistakes.
    for broken in [new.replace('創業10年。', ''), new.replace('水曜日', '木曜日'),
                   new.replace('href="menu.html"', 'href="missing.html"'),
                   new.replace('</main>', '<main></main></main>'),
                   new.replace('</section>', '</div>', 1)]:
        (pack/'after/about.html').write_text(broken, encoding='utf-8')
        try:
            verify(pack/'before', pack/'after')
        except AssertionError:
            pass
        else:
            raise AssertionError('invalid edit was accepted')
    (pack/'after/about.html').write_text(new, encoding='utf-8')
    diff = ''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile='before/about.html', tofile='after/about.html'))
    (out/'about.diff').write_text(diff, encoding='utf-8')
    (out/'diff.html').write_text('<!doctype html><meta charset="utf-8"><title>DAY4 HTML diff</title><pre>'+escape(diff)+'</pre>', encoding='utf-8')
    # This is a test author's design, never a student's observation.
    (pack/'wireframe.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="680" height="640" viewBox="0 0 680 640"><rect width="680" height="640" fill="white"/>
<g fill="none" stroke="black"><rect x="20" y="20" width="640" height="70"/><rect x="20" y="110" width="640" height="400"/><rect x="40" y="160" width="600" height="80"/><rect x="40" y="260" width="600" height="80"/><rect x="40" y="360" width="600" height="120"/><rect x="20" y="530" width="640" height="50"/></g>
<g font-family="sans-serif" font-size="22"><text x="40" y="60">header / nav</text><text x="40" y="140">main: 店舗案内</text><text x="60" y="210">1. 営業時間・定休日</text><text x="60" y="310">2. アクセス・住所</text><text x="60" y="410">3. 店舗紹介・仮文章・メニューリンク</text><text x="40" y="565">footer</text><text x="20" y="620">来店できる時間 → 場所 → お店を知る</text></g></svg>''', encoding='utf-8')
    (pack/'submission.md').write_text('''# DAY4 検証用提出メモ（実在学生の提出ではない）
提出番号: s000 / 版: r1
最優先: 来店可能な時間。次に場所、最後に紹介。
main: ページの中心を一つにする。section: 時間・場所・紹介を話題ごとにまとめる。
見出し: 店舗案内 → 営業時間 → アクセス → 私たちについて
本文比較: before/afterの段落を項目名以外で照合し一致。HTML差分はscreenshots/html-diff.png。
index.html・menu.html・css/style.css: バイト一致。header・footer・head・href: 保持。
佐藤さんへ: 時間と場所を先にしました。初来店の人が時間と住所を探せる順です。beforeとafterで本文を比較しました。
ペア確認: NOT RUN（相手不在）。実在学生の理解・学校への提出・受領: NOT RUN。
''', encoding='utf-8')
    return pack


def package(out, pack):
    zip_path = out/'day4-s000-r1.zip'
    with ZipFile(zip_path, 'w', ZIP_DEFLATED) as z:
        for p in pack.rglob('*'):
            if p.is_file():
                z.write(p, p.relative_to(out))
    with ZipFile(zip_path) as z:
        z.extractall(out/'reopened')
    reopened = out/'reopened/day4-s000'
    verify(reopened/'before', reopened/'after')
    for p in pack.rglob('*'):
        if p.is_file():
            assert p.read_bytes() == (reopened/p.relative_to(pack)).read_bytes()
    return reopened


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--browser', action='store_true')
    args = parser.parse_args()
    out = args.output.resolve()
    pack = rehearse(out)
    if args.browser:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            try:
                page = browser.new_page(viewport={'width': 1280, 'height': 900})
                shots = pack/'screenshots'
                shots.mkdir()
                for phase in ['before', 'after']:
                    page.goto((pack/phase/'about.html').as_uri())
                    page.screenshot(path=str(shots/(phase+'.png')), full_page=True)
                assert page.locator('main').count() == 1
                assert page.locator('main > section > h2').all_text_contents() == ['営業時間', 'アクセス', '私たちについて']
                assert page.locator('main').evaluate('(el) => getComputedStyle(el).paddingTop') != '0px'
                page.goto((out/'diff.html').as_uri())
                page.screenshot(path=str(shots/'html-diff.png'), full_page=True)
                (out/'wireframe.html').write_text('<!doctype html><meta charset="utf-8"><img alt="Verification wireframe" src="day4-s000/wireframe.svg">', encoding='utf-8')
                page.goto((out/'wireframe.html').as_uri())
                page.locator('img').screenshot(path=str(pack/'wireframe.png'))
                (pack/'wireframe.svg').unlink()
                with (pack/'submission.md').open('a', encoding='utf-8') as f:
                    f.write('ブラウザ確認: ChromiumでCSS表示と構造を確認。PNGを実画面から保存。\n')
                reopened = package(out, pack)
                for width in [1280, 375]:
                    page.set_viewport_size({'width': width, 'height': 900})
                    page.goto((reopened/'after/about.html').as_uri())
                    assert page.locator('main > section > h2').all_text_contents() == ['営業時間', 'アクセス', '私たちについて']
                    assert page.locator('main').evaluate('(el) => getComputedStyle(el).paddingTop') != '0px'
                    page.screenshot(path=str(out/f'reopened-{width}.png'), full_page=True)
                    for name in ['ホーム', 'メニュー', '店舗案内']:
                        page.get_by_role('navigation').get_by_role('link', name=name, exact=True).click()
                        assert page.locator('h1').count() == 1
                with (pack/'submission.md').open('a', encoding='utf-8') as f:
                    f.write('再展開確認: after/about.htmlを375/1280pxで表示、CSSと3ページのリンク移動PASS。\n')
                package(out, pack)  # Rebuild after recording the verification.
                assert (out/'reopened/day4-s000/submission.md').read_bytes() == (pack/'submission.md').read_bytes()
            finally:
                browser.close()
    else:
        package(out, pack)
    (out/'result.json').write_text(json.dumps({'result':'PASS', 'browser': args.browser, 'negative_cases':5,
        'school_submission':'NOT RUN', 'student_comprehension':'NOT RUN', 'vscode_mouse_operations':'NOT RUN'}, indent=2), encoding='utf-8')
    print('PASS: ZIP -> edit -> compare -> submission ZIP -> re-extract', out)
