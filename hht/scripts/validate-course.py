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

first_lesson = lesson_blocks[0]
for term in ("デプロイ", "バージョン管理", "バックアップ", "復元", "自習"):
    require(term in first_lesson, f"Lesson 1 missing early self-study setup term: {term}")

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

textbook_coverage = {
    "HTMLメタ情報": ("meta description", "OGP"),
    "HTML構造詳細": ("空要素", "入れ子", "文字実体参照"),
    "リンクとパス": ("相対・絶対・ルート相対パス", "target"),
    "CSS競合": ("詳細度", "!important", "インラインCSS"),
    "CSS初期化": ("reset", "normalize", "sanitize"),
    "フォーム選択部品": ("checkbox", "radio", "placeholder", "method", "action"),
    "レスポンシブ読解": ("only screen", "リキッドレイアウト"),
    "対応状況": ("ブラウザ対応状況",),
}
coverage_source = curriculum + (ROOT / "docs/textbook-guide.md").read_text(encoding="utf-8")
for group, terms in textbook_coverage.items():
    for term in terms:
        require(term in coverage_source, f"Textbook coverage missing [{group}] term: {term}")

workbook = (ROOT / "docs/student-workbook.md").read_text(encoding="utf-8")
workbook_days = re.split(r"(?=^## DAY \d+ )", workbook, flags=re.MULTILINE)
workbook_days = [block for block in workbook_days if re.match(r"^## DAY \d+ ", block)]
require(len(workbook_days) == 15, f"Expected 15 workbook days; found {len(workbook_days)}")
for block in workbook_days:
    title = block.splitlines()[0]
    for marker in (
        "からの",
        "**今日のミッション:**",
        "**作戦会議:**",
        "**今日覚える技:**",
        "**制作メモ:**",
        "**星チェック:**",
    ):
        require(marker in block, f"{title} missing {marker}")
    require(
        any(
            marker in block
            for marker in ("**返信チャレンジ:**", "**相談チャレンジ:**", "**発表チャレンジ:**")
        ),
        f"{title} missing communication challenge",
    )
for match in re.finditer(r"!\[[^\]]+\]\((\.\./assets/workbook/[^)]+)\)", workbook):
    relative = match.group(1)
    require(
        (ROOT / "docs" / relative).resolve().exists(),
        f"Broken workbook image: {relative}",
    )

portfolio_brief = (ROOT / "docs/portfolio-project.md").read_text(encoding="utf-8")
for term in ("見てほしい", "制作実績", "個人情報", "portfolio/index.html", "portfolio/css/style.css", "2分間"):
    require(term in portfolio_brief, f"Portfolio project missing term: {term}")
for relative in ("portfolio/index.html", "portfolio/css/style.css"):
    require((ROOT / relative).exists(), f"Missing portfolio starter file: {relative}")
require("ポートフォリオ" in lesson_blocks[13], "Lesson 14 must be a portfolio lesson")
require("ポートフォリオ" in lesson_blocks[14], "Lesson 15 must be a portfolio lesson")
for term in ("差し戻し", "最終承認", "公開"):
    require(
        term in "".join(lesson_blocks[10:13]),
        f"Lessons 11-13 missing accelerated client-work term: {term}",
    )

assignment_checks = (ROOT / "student/assignment-checks.md").read_text(encoding="utf-8")
assignment_blocks = re.split(r"(?=^## DAY \d+ )", assignment_checks, flags=re.MULTILINE)
assignment_blocks = [block for block in assignment_blocks if re.match(r"^## DAY \d+ ", block)]
require(len(assignment_blocks) == 15, f"Expected 15 assignment quality blocks; found {len(assignment_blocks)}")
for block in assignment_blocks:
    title = block.splitlines()[0]
    for marker in ("**入力:**", "**完成物:**", "**完成条件:**", "**証拠:**", "**追加チャレンジ:**"):
        require(marker in block, f"{title} missing quality marker {marker}")
    condition_count = len(re.findall(r"^- ", block, flags=re.MULTILINE))
    require(condition_count >= 4, f"{title} needs at least four acceptance conditions")

talk_guide = (ROOT / "docs/instructor-talk-guide.md").read_text(encoding="utf-8")
talk_lessons = re.split(r"(?=^## 第\d+回 )", talk_guide, flags=re.MULTILINE)
talk_lessons = [block for block in talk_lessons if re.match(r"^## 第\d+回 ", block)]
require(len(talk_lessons) == 15, f"Expected 15 instructor talk lessons; found {len(talk_lessons)}")
for block in talk_lessons:
    title = block.splitlines()[0]
    require("**最初の5分**" in block, f"{title} missing opening 5-minute talk")
    require("**最後の5分**" in block, f"{title} missing closing 5-minute talk")
    require("講師なら" in block, f"{title} closing talk missing instructor approach")
    require("？" in block, f"{title} missing a friendly question")
    require("褒める" in block, f"{title} missing a student praise point")

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
repository_readme = (ROOT.parent / "README.md").read_text(encoding="utf-8")
for term in ("リポジトリのルート", "Visual Studio Code", "作業ブランチ"):
    require(term in repository_readme, f"Repository README missing VS Code workflow term: {term}")
for document_name, document in {
    "course README": readme,
    "curriculum": curriculum,
    "student workbook": workbook,
    "lesson packs": (ROOT / "lessons/README.md").read_text(encoding="utf-8"),
}.items():
    require(
        "リポジトリのルート" in document and ("VS Code" in document or "Visual Studio Code" in document),
        f"{document_name} missing repository-root VS Code rule",
    )
student_portal = (ROOT / "student/README.md").read_text(encoding="utf-8")
instructor_portal = (ROOT / "instructor/README.md").read_text(encoding="utf-8")
require("15日分のお仕事" in student_portal, "Student portal missing 15-day navigation")
require("講師トークガイド" not in student_portal, "Student portal exposes instructor talk guide")
require("講師トークガイド" in instructor_portal, "Instructor portal missing instructor talk guide")
require("取り扱いに注意する資料" in instructor_portal, "Instructor portal missing protected-material guidance")
for portal_name, portal_path in {
    "student": ROOT / "student/README.md",
    "instructor": ROOT / "instructor/README.md",
}.items():
    portal = portal_path.read_text(encoding="utf-8")
    for match in re.finditer(r"\]\((\.\./[^)#]+)(?:#[^)]+)?\)", portal):
        relative = match.group(1)
        require(
            (portal_path.parent / relative).resolve().exists(),
            f"{portal_name} portal broken link: {relative}",
        )
for match in re.finditer(r"\]\((\./[^)]+)\)", readme):
    relative = match.group(1)
    require((ROOT / relative).exists(), f"Broken README link: {relative}")

lesson_pack_root = ROOT / "lessons"
lesson_pack_files = [lesson_pack_root / f"{number:02d}" / "README.md" for number in range(1, 16)]
require(len([path for path in lesson_pack_files if path.exists()]) == 15, "Expected 15 lesson packs")
for number, path in enumerate(lesson_pack_files, start=1):
    if not path.exists():
        continue
    pack = path.read_text(encoding="utf-8")
    for marker in ("## 今日使う資料", "**生徒:**", "**講師:**", "**進行:**", "## 今日できるもの"):
        require(marker in pack, f"Lesson pack {number:02d} missing {marker}")
    for match in re.finditer(r"\]\((\.\./\.\./[^)#]+)(?:#[^)]+)?\)", pack):
        relative = match.group(1)
        require(
            (path.parent / relative).resolve().exists(),
            f"Lesson pack {number:02d} broken link: {relative}",
        )

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
    "assets/workbook/01-request-arrives.webp": "WEBP",
    "assets/workbook/02-build-and-check.webp": "WEBP",
    "assets/workbook/03-client-approval.webp": "WEBP",
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
