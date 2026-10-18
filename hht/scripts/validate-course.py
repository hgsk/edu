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

from workbook_navigation import workbook_day_link_errors


ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


curriculum = (ROOT / "docs/curriculum.md").read_text(encoding="utf-8")
workbook_index_path = ROOT / "docs/student-workbook.md"
workbook_root = ROOT / "docs/workbook"
workbook_day_paths = [workbook_root / f"day-{number:02d}.md" for number in range(1, 16)]
workbook_paths = [workbook_index_path, workbook_root / "overview.md", *workbook_day_paths]
workbook_documents = {}
for path in workbook_paths:
    require(path.is_file(), f"Missing workbook document: {path.relative_to(ROOT)}")
    workbook_documents[path] = path.read_text(encoding="utf-8") if path.is_file() else ""
workbook_index = workbook_documents[workbook_index_path]
workbook = "\n".join(workbook_documents.values())
require(set(workbook_root.glob("day-*.md")) == set(workbook_day_paths),
        "Workbook must have DAY 01-15 files exactly once")
require(not re.search(r"^## DAY \d+ ", workbook_index, re.MULTILINE),
        "Workbook index must not duplicate DAY content")
require("**完成条件:**" not in workbook_index,
        "Workbook index must not duplicate acceptance conditions")
require("**完成条件:**" not in workbook_documents[workbook_root / "overview.md"],
        "Workbook common instructions must not duplicate DAY acceptance conditions")
require("./workbook/overview.md" in workbook_index,
        "Workbook index must link to the common instructions")


def markdown_prose(document: str) -> str:
    """Ignore examples inside fenced code when checking Markdown destinations."""
    lines = []
    fence = None
    for line in document.splitlines():
        match = re.match(r"^\s*(`{3,}|~{3,})", line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None:
            lines.append(line)
    return "\n".join(lines)


def markdown_anchors(document: str) -> set[str]:
    prose = markdown_prose(document)
    anchors = set(re.findall(r'<a id="([^"]+)"></a>', prose))
    counts = {}
    for heading in re.findall(r"^#+ (.+)$", prose, re.MULTILINE):
        heading = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", heading)
        base = re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
        count = counts.get(base, 0)
        counts[base] = count + 1
        anchors.add(base if count == 0 else f"{base}-{count}")
    return anchors


def validate_markdown_links(path: Path, document: str) -> None:
    for match in re.finditer(r"\]\(([^)\s]+)\)", markdown_prose(document)):
        url = match.group(1)
        if re.match(r"[\w+.-]+:", url) or url.startswith("//"):
            continue
        relative, _, fragment = url.partition("#")
        target = (path.parent / relative).resolve() if relative else path.resolve()
        require(target.exists(), f"Broken link in {path.relative_to(ROOT.parent)}: {url}")
        if target.is_file() and target.suffix == ".md" and fragment:
            require(fragment in markdown_anchors(target.read_text(encoding="utf-8")),
                    f"Broken anchor in {path.relative_to(ROOT.parent)}: {url}")


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
        require(
            term in workbook or term in curriculum,
            f"Canonical course content missing [{group}] term: {term}",
        )

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

workbook_days = []
for number, path in enumerate(workbook_day_paths, 1):
    document = workbook_documents[path]
    headings = re.findall(r"^## DAY (\d+) ", markdown_prose(document), re.MULTILINE)
    require(headings == [str(number)], f"{path.name} must contain only DAY {number}")
    match = re.search(r"^## DAY \d+ ", document, re.MULTILINE)
    workbook_days.append(document[match.start():] if match else "")
require(len(workbook_days) == 15, f"Expected 15 workbook days; found {len(workbook_days)}")
for block in workbook_days:
    title = block.splitlines()[0] if block else "Missing DAY"
    require("からの" in block, f"{title} missing client/request context")
    require("## 今日の目的" in block or "**今日のミッション:**" in block, f"{title} missing learning purpose")
    require("## 今日のゴール" in block or "**完成条件:**" in block, f"{title} missing completion goal")
    require("## STEP 1" in block or "### ① " in block, f"{title} missing step-by-step procedure")
    require(
        "## 完了チェック" in block or "## 最終チェック" in block or "**星チェック:**" in block,
        f"{title} missing completion checklist",
    )
    require(
        any(term in block for term in ("報告", "返信", "確認を依頼", "発表")),
        f"{title} missing communication/reporting task",
    )
for path, document in workbook_documents.items():
    validate_markdown_links(path, document)

portfolio_brief = (ROOT / "docs/portfolio-project.md").read_text(encoding="utf-8")
for term in ("見てほしい", "制作実績", "個人情報", "portfolio/index.html", "portfolio/css/style.css", "2分間"):
    require(term in portfolio_brief, f"Portfolio project missing term: {term}")
for relative in ("portfolio/index.html", "portfolio/css/style.css"):
    require((ROOT / relative).exists(), f"Missing portfolio starter file: {relative}")
release_approval = ROOT / "student/requests/day13-release-approval.md"
require(release_approval.exists(), "Missing Day 13 explicit release approval")
if release_approval.exists():
    approval_text = release_approval.read_text(encoding="utf-8")
    for term in ("採用案", "最終承認", "公開可", "公開後"):
        require(term in approval_text, f"Day 13 release approval missing term: {term}")
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
for number, block in enumerate(workbook_days, start=1):
    title = block.splitlines()[0] if block else "Missing DAY"
    for marker in ("**入力:**", "**完成物:**", "**完成条件:**", "**証拠:**", "**追加チャレンジ:**"):
        require(marker in block, f"{title} missing quality marker {marker}")
    require(
        block.count("**完成条件:**") == 1,
        f"{title} must have exactly one canonical acceptance block",
    )
    condition_count = len(re.findall(r"^- ", block, flags=re.MULTILINE))
    require(condition_count >= 4, f"{title} needs at least four acceptance conditions")
    if number <= len(assignment_blocks):
        index_block = assignment_blocks[number - 1]
        require(
            f"../docs/workbook/day-{number:02d}.md#day-{number}-done)" in index_block,
            f"Assignment index DAY {number} must link to its canonical completion section",
        )
        require(
            "**完成条件:**" not in index_block,
            f"Assignment index DAY {number} must not duplicate acceptance conditions",
        )

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
require(
    "./hht/docs/student-workbook.md" in repository_readme,
    "Repository README must link directly to the canonical student workbook",
)
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

# Keep the local submission route usable for all fifteen lessons.
submissions = (ROOT / "submissions/README.md").read_text(encoding="utf-8")
local_submission_path = ROOT / "submissions/local-submission.md"
local_submission = local_submission_path.read_text(encoding="utf-8")
local_days = [int(value) for value in re.findall(r"^\| (\d{2}) \|", local_submission, re.MULTILINE)]
require(local_days == list(range(1, 16)), "ZIP submission must cover DAY 01-15 exactly once in order")
for field in ("依頼", "質問", "変更した場所", "変更しなかった場所", "確認したこと", "未確認", "バージョン", "確認URL"):
    require(field in submissions, f"Submission instructions missing WORKLOG field: {field}")
for term in ("before/starter-site", "before/portfolio", "after/starter-site", "after/portfolio",
             "WORKLOG.md", "screenshots", "evidence", "changes.md", "受領", "再提出", "NOT APPLICABLE（ZIP提出）"):
    require(term in local_submission, f"ZIP route missing source/evidence/review requirement: {term}")
for name, document in {"student portal": student_portal, "workbook": workbook,
                       "submissions": submissions, "instructor portal": instructor_portal}.items():
    require("local-submission.md" in document, f"{name} must link to the non-Git route")
require("## 標準のZIPで提出する" in submissions, "ZIP must be the standard submission route")
require("## 任意のPRで提出してCI判定を受ける" in submissions, "PR submission must remain optional")
rubric = (ROOT / "docs/rubric.md").read_text(encoding="utf-8")
require("加点・減点はしません" in rubric and "授業の合否を意味しません" in rubric,
        "Rubric must separate submission tools/CI from course grading")
decision_text = (ROOT / "ISSUES.md").read_text(encoding="utf-8")
issue_02 = decision_text.split("## ISSUE-02 ", 1)[1].split("## ISSUE-03 ", 1)[0]
require("- 選択: A" in issue_02 and "Gitは必須から除外" in issue_02,
        "ISSUE-02 local-file policy must remain explicit")

submission_documents = [ROOT.parent / "README.md", ROOT / "README.md", ROOT / "ISSUES.md",
                        ROOT / "GitHub.md", ROOT / "student/README.md", ROOT / "instructor/README.md",
                        ROOT / "submissions/README.md", local_submission_path,
                        ROOT / "student/assignment-checks.md", ROOT / "docs/student-workbook.md",
                        ROOT / "docs/rubric.md", ROOT / "docs/exercise-operations.md",
                        ROOT / "docs/submission-policy-history.md", *workbook_paths[1:]]
for path in submission_documents:
    document = path.read_text(encoding="utf-8") if path.is_file() else ""
    for match in re.finditer(r"\]\((\.{1,2}/[^)#]+)(?:#([^)]*))?\)", document):
        target = (path.parent / match.group(1)).resolve()
        require(target.exists(), f"Broken submission link in {path.name}: {match.group(1)}")
        if target.is_file() and target.suffix == ".md" and match.group(2):
            target_text = target.read_text(encoding="utf-8")
            anchors = markdown_anchors(target_text)
            require(match.group(2) in anchors, f"Broken submission anchor in {path.name}: {match.group(0)}")

# DAY links must land on the matching lesson, not only a similarly named heading.
# Check the actual document IDs and local fragment links, including the top TOC.
for path, document in workbook_documents.items():
    explicit_ids = re.findall(r'<a id="([^"]+)"></a>', markdown_prose(document))
    require(len(explicit_ids) == len(set(explicit_ids)), f"{path.name} has duplicate navigation IDs")
workbook_anchors = markdown_anchors(workbook_index)
for number in range(1, 16):
    document = workbook_documents[workbook_day_paths[number - 1]]
    explicit_ids = re.findall(r'<a id="([^"]+)"></a>', markdown_prose(document))
    require(
        re.search(rf'<a id="day-{number}"></a>\s+## DAY {number} ', document) is not None,
        f"DAY {number} ID must be immediately before the matching DAY heading",
    )
    for suffix in ("concepts", "actions", "done"):
        require(f"day-{number}-{suffix}" in explicit_ids, f"DAY {number} missing {suffix} destination")
        require(f"day-{number}-{suffix}" in workbook_anchors,
                f"Workbook index missing legacy DAY {number} {suffix} anchor")
        require(f"./workbook/day-{number:02d}.md#day-{number}-{suffix})" in workbook_index,
                f"Workbook index must link to DAY {number} {suffix}")
    require(f"day-{number}" in workbook_anchors, f"Workbook index missing legacy DAY {number} anchor")
    require(f"./workbook/day-{number:02d}.md#day-{number})" in workbook_index,
            f"Workbook index must link directly to DAY {number}")
    require("../student-workbook.md#workbook-days" in document, f"DAY {number} missing index navigation")
    for adjacent in (number - 1, number + 1):
        if 1 <= adjacent <= 15:
            require(f"day-{adjacent:02d}.md#day-{adjacent})" in document,
                    f"DAY {number} missing navigation to DAY {adjacent}")

# All entry pages and lesson packs use real destinations in the canonical workbook.
for entry in [ROOT.parent / "README.md", *ROOT.rglob("*.md")]:
    document = entry.read_text(encoding="utf-8")
    relative_entry = entry.relative_to(ROOT) if entry.is_relative_to(ROOT) else Path(entry.name)
    for error in workbook_day_link_errors(relative_entry, markdown_prose(document)):
        require(False, f"{entry.relative_to(ROOT.parent)}: {error}")
    for match in re.finditer(r'\]\(([^)\s]*student-workbook\.md)#([^)]+)\)', document):
        require(match.group(2) in workbook_anchors, f"Broken workbook entry in {entry.relative_to(ROOT.parent)}: {match.group(2)}")
    for match in re.finditer(r'\]\(([^)\s]*(?:workbook/)?(?:day-\d{2}|overview)\.md)(?:#([^)]*))?\)', markdown_prose(document)):
        target = (entry.parent / match.group(1)).resolve()
        if target.parent == workbook_root.resolve():
            require(target.is_file(), f"Missing split workbook entry in {entry.relative_to(ROOT.parent)}: {match.group(1)}")
            if target.is_file() and match.group(2):
                require(match.group(2) in markdown_anchors(target.read_text(encoding="utf-8")),
                        f"Broken split workbook entry in {entry.relative_to(ROOT.parent)}: {match.group(2)}")

lesson_pack_root = ROOT / "lessons"
lesson_pack_files = [lesson_pack_root / f"{number:02d}" / "README.md" for number in range(1, 16)]
require(len([path for path in lesson_pack_files if path.exists()]) == 15, "Expected 15 lesson packs")
for number, path in enumerate(lesson_pack_files, start=1):
    if not path.exists():
        continue
    pack = path.read_text(encoding="utf-8")
    require(f"../../docs/workbook/day-{number:02d}.md#day-{number})" in pack,
            f"Lesson pack {number:02d} must link to its matching DAY")
    for marker in ("## 今日使う資料", "**生徒:**", "**講師:**", "**進行:**", "## 今日できるもの"):
        require(marker in pack, f"Lesson pack {number:02d} missing {marker}")
    for match in re.finditer(r"\]\((\.\./\.\./[^)#]+)(?:#[^)]+)?\)", pack):
        relative = match.group(1)
        require(
            (path.parent / relative).resolve().exists(),
            f"Lesson pack {number:02d} broken link: {relative}",
        )

glossary = (ROOT / "docs/glossary.md").read_text(encoding="utf-8")
glossary_terms = len(re.findall(r"^- \*\*[^*\n]+\*\*: ", glossary, flags=re.MULTILINE))
require(glossary_terms >= 100, f"Expected at least 100 glossary definition entries; found {glossary_terms}")
require(
    not re.search(r"^\| 用語 \|", glossary, flags=re.MULTILINE),
    "Glossary definitions must use lists instead of tables",
)
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
print(f"GLOSSARY DEFINITION ENTRIES: {glossary_terms}")
print(f"FIXTURES: {len(required_fixtures)}")
print(f"OPEN DECISIONS: {open_issues}")

if ERRORS:
    for error in ERRORS:
        print(f"FAIL: {error}")
    raise SystemExit(1)

print("COURSE VALIDATION: PASS")
