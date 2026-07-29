"""Validate the course structure, fixtures, local links, images, and HTTP serving."""

from __future__ import annotations

import contextlib
import functools
import http.server
from pathlib import Path
import re
import socketserver
import threading
import urllib.request

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


curriculum = (ROOT / "docs/curriculum.md").read_text(encoding="utf-8")
lesson_count = len(re.findall(r"^## 第\d+回 ", curriculum, flags=re.MULTILINE))
require(lesson_count == 15, f"Expected 15 lessons; found {lesson_count}")

lesson_blocks = re.split(r"(?=^## 第\d+回 )", curriculum, flags=re.MULTILINE)
lesson_blocks = [block for block in lesson_blocks if re.match(r"^## 第\d+回 ", block)]
require(len(lesson_blocks) == 15, f"Expected 15 lesson blocks; found {len(lesson_blocks)}")
for block in lesson_blocks:
    title = block.splitlines()[0]
    for marker in ("**この回のゴール:**", "**120分:**", "**やってみよう:**", "**提出物:**", "**できたかチェック:**"):
        require(marker in block, f"{title} missing {marker}")
    timing_match = re.search(r"\*\*120分:\*\* ([^\n]+)", block)
    if timing_match:
        minutes = [int(value) for value in re.findall(r"(\d+)分", timing_match.group(1))]
        require(sum(minutes) == 120, f"{title} timing sums to {sum(minutes)}, not 120")

advanced = (ROOT / "docs/advanced-curriculum.md").read_text(encoding="utf-8")
advanced_lesson_count = len(re.findall(r"^### 第\d+回 ", advanced, flags=re.MULTILINE))
require(
    advanced_lesson_count == 16,
    f"Expected 16 advanced lessons; found {advanced_lesson_count}",
)

requirements = {
    "受注メールとCC": ("CC", "受領返信"),
    "ブラウザ確認と編集": ("ブラウザ", "エディター"),
    "クライアント確認": ("確認", "OK"),
    "サーバー公開": ("ステージング", "公開"),
    "AI画像生成": ("AI", "プロンプト"),
    "カメラマン依頼": ("撮影", "お願い"),
    "画像形式最適化": ("WebP", "AVIF"),
    "添付文章と校正": ("文章", "質問"),
    "ダミー箇所確認": ("ダミー", "どこ"),
    "営業時間横断修正": ("営業時間", "構造化データ"),
    "ラストオーダー影響": ("ラストオーダー",),
    "対象商品の価格限定": ("価格", "まとめて変更"),
    "更新年度と意味": ("フッター", "年"),
}
for group, terms in requirements.items():
    for term in terms:
        require(term in curriculum, f"Curriculum missing [{group}] term: {term}")

advanced_requirements = {
    "ディレクション": ("要件定義", "WBS", "制作指示", "受入基準"),
    "設計": ("サイトマップ", "ユーザーフロー", "Figma", "ワイヤー"),
    "WordPress": ("WordPress", "オリジナルテーマ", "バックアップ", "復元"),
    "EC": ("商品マスター", "SKU", "購入導線", "テスト注文", "EC-CUBE", "バックアップ・復元"),
    "SEO": ("SEO", "301", "Search Console"),
    "制作環境": ("Figma", "WordPress", "EC-CUBE"),
    "応募・継続": ("24時間以内", "ポートフォリオ", "応募文"),
}
for group, terms in advanced_requirements.items():
    for term in terms:
        require(term in advanced, f"Advanced course missing [{group}] term: {term}")

readme = (ROOT / "README.md").read_text(encoding="utf-8")
for match in re.finditer(r"\]\((\./[^)]+)\)", readme):
    relative = match.group(1)
    require((ROOT / relative).exists(), f"Broken README link: {relative}")

glossary = (ROOT / "docs/glossary.md").read_text(encoding="utf-8")
glossary_rows = len(re.findall(r"^\| [^|-].* \|$", glossary, flags=re.MULTILINE))
require(glossary_rows >= 100, f"Expected at least 100 glossary table rows; found {glossary_rows}")
for match in re.finditer(r"!\[[^\]]*\]\((\.\./[^)]+)\)", glossary):
    relative = match.group(1)
    require(
        (ROOT / "docs" / relative).resolve().exists(),
        f"Broken glossary image: {relative}",
    )

required_fixtures = [
    "fixtures/emails/01-initial-request.md",
    "fixtures/emails/02-hero-request.md",
    "fixtures/emails/03-content-request.md",
    "fixtures/emails/04-hours-and-price.md",
    "fixtures/emails/05-copyright-year.md",
    "fixtures/emails/06-photographer-delivery.md",
    "fixtures/attachments/about-copy.md",
    "fixtures/photographer-delivery/hero-ai-master.png",
    "fixtures/photographer-delivery/simulated-shoot-001.jpg",
    "starter-site/images/hero-cafe.webp",
    "practice-server/staging/.gitkeep",
    "practice-server/production/.gitkeep",
    "practice-server/backups/.gitkeep",
    "references/textbook/sample_files.zip",
    "references/textbook/toc-html-css-1.png",
    "references/textbook/toc-html-css-2.png",
    "references/textbook/toc-javascript-1.png",
    "references/textbook/toc-javascript-2.png",
    "references/textbook/sample_files/chapter1/1-1/013URL.txt",
    "references/textbook/sample_files/chapter2/2-1/025/index.html",
    "references/textbook/sample_files/chapter3/3-1/084/index.html",
    "references/textbook/sample_files/chapter4/4-1/139/index.html",
]
for relative in required_fixtures:
    require((ROOT / relative).exists(), f"Missing fixture: {relative}")

expected_images = {
    "fixtures/photographer-delivery/hero-ai-master.png": "PNG",
    "fixtures/photographer-delivery/simulated-shoot-001.jpg": "JPEG",
    "starter-site/images/hero-cafe.webp": "WEBP",
    "assets/glossary/workflow.webp": "WEBP",
    "assets/glossary/website-layers.webp": "WEBP",
    "assets/glossary/ec-cycle.webp": "WEBP",
}
for relative, expected_format in expected_images.items():
    with Image.open(ROOT / relative) as image:
        require(image.format == expected_format, f"{relative}: {image.format} != {expected_format}")
        require(image.width >= 1200 and image.height >= 600, f"{relative}: image is too small")
        print(f"IMAGE {expected_format} {image.width}x{image.height}: {relative}")

handler = functools.partial(
    http.server.SimpleHTTPRequestHandler,
    directory=str(ROOT / "starter-site"),
)
with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        for relative in [
            "index.html",
            "menu.html",
            "about.html",
            "css/style.css",
            "images/hero-cafe.webp",
        ]:
            with contextlib.closing(
                urllib.request.urlopen(
                    f"http://127.0.0.1:{server.server_address[1]}/{relative}",
                    timeout=3,
                )
            ) as response:
                require(response.status == 200, f"HTTP {response.status}: {relative}")
                print(f"HTTP 200: {relative}")
    finally:
        server.shutdown()
        thread.join(timeout=3)

issues = (ROOT / "ISSUES.md").read_text(encoding="utf-8")
open_issues = len(re.findall(r"^- 状態: OPEN$", issues, flags=re.MULTILINE))

print(f"LESSONS: {lesson_count}")
print("FOUNDATION HOURS: 15 x 120 minutes = 30 hours")
print(f"ADVANCED LESSONS: {advanced_lesson_count}")
print(f"REQUIREMENT GROUPS: {len(requirements)}")
print(f"ADVANCED REQUIREMENT GROUPS: {len(advanced_requirements)}")
print(f"GLOSSARY TABLE ROWS: {glossary_rows}")
print(f"FIXTURES: {len(required_fixtures)}")
print(f"OPEN DECISIONS: {open_issues}")

if ERRORS:
    for error in ERRORS:
        print(f"FAIL: {error}")
    raise SystemExit(1)

print("COURSE VALIDATION: PASS")
