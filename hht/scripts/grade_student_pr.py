#!/usr/bin/env python3
"""Grade HHT student pull requests using trusted rules from the base branch.

The grader only reads student files. It never executes scripts from the PR.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
from typing import Iterable


WORKLOG_FIELDS = (
    "依頼", "質問", "変更した場所", "変更しなかった場所",
    "確認したこと", "未確認", "バージョン", "確認URL",
)
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def has_image_signature(path: Path) -> bool:
    data = path.read_bytes()[:16]
    suffix = path.suffix.lower()
    if suffix == ".png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if suffix in {".jpg", ".jpeg"}:
        return data.startswith(b"\xff\xd8\xff")
    if suffix == ".webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False
TEXT_SUFFIXES = {".md", ".html", ".css", ".txt", ".json", ".js", ".csv", ".yml", ".yaml"}
SECRET_PATTERNS = (
    (re.compile(r"-----BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY-----"), "秘密鍵"),
    (re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"), "GitHub classic token"),
    (re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"), "GitHub fine-grained token"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key"),
    (re.compile(r"(?i)\b(?:password|passwd|passphrase)\s*[:=]\s*[^\s<>{}\[\]]{4,}"), "password"),
    (re.compile(r"パスワード\s*[:：=]\s*[^\s<>{}\[\]]{4,}"), "パスワード"),
)
PLACEHOLDER_PATTERNS = (
    re.compile(r"<[^>]+>"), re.compile(r"TODO", re.I), re.compile(r"TBD", re.I),
    re.compile(r"ここに"), re.compile(r"未記入"),
)


@dataclass
class Check:
    ok: bool
    name: str
    detail: str = ""


class Result:
    def __init__(self, day: int):
        self.day = day
        self.checks: list[Check] = []

    def add(self, ok: bool, name: str, detail: str = "") -> None:
        self.checks.append(Check(bool(ok), name, detail))

    @property
    def passed(self) -> bool:
        return all(check.ok for check in self.checks)

    def render_text(self) -> str:
        lines = []
        for check in self.checks:
            mark = "PASS" if check.ok else "FAIL"
            suffix = f" — {check.detail}" if check.detail else ""
            lines.append(f"[{mark}] {check.name}{suffix}")
        state = "PASS" if self.passed else "FAIL"
        passed = sum(c.ok for c in self.checks)
        lines.append(f"\nRESULT: {state} ({passed}/{len(self.checks)} checks)")
        return "\n".join(lines)

    def render_markdown(self) -> str:
        state = "✅ PASS" if self.passed else "❌ FAIL"
        rows = [f"## HHT DAY {self.day:02d} CI判定: {state}", "", "| 判定 | チェック | 詳細 |", "|---|---|---|"]
        for check in self.checks:
            mark = "✅" if check.ok else "❌"
            detail = check.detail.replace("|", "\\|").replace("\n", " ")
            rows.append(f"| {mark} | {check.name} | {detail} |")
        rows += ["", "CIは機械判定できる受入条件を確認します。画面の見やすさなど、人の判断が必要な項目は提出証拠も確認してください。", ""]
        return "\n".join(rows)


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str | None]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append((tag, dict(attrs)))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append((tag, dict(attrs)))


def parse_html(path: Path) -> SiteParser:
    parser = SiteParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="strict")


def normalize_changed_files(changed_files: Iterable[str]) -> list[str]:
    result = []
    for item in changed_files:
        path = item.strip().replace("\\", "/")
        if path and not path.startswith("../") and "/../" not in path:
            result.append(path)
    return sorted(set(result))


def detect_day(changed_files: list[str]) -> tuple[int | None, str | None]:
    matches = []
    for path in changed_files:
        m = re.fullmatch(r"hht/submissions/day-(\d{2})/WORKLOG\.md", path)
        if m:
            matches.append(int(m.group(1)))
    matches = sorted(set(matches))
    if len(matches) != 1:
        return None, f"変更されたWORKLOG.mdは1日分だけ必要です（検出: {matches or 'なし'}）"
    if not 1 <= matches[0] <= 15:
        return None, f"DAY番号が範囲外です: {matches[0]}"
    return matches[0], None


def extract_worklog_fields(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for field in WORKLOG_FIELDS:
        m = re.search(rf"(?m)^\s*-\s*{re.escape(field)}\s*[:：]\s*(.*)$", text)
        fields[field] = m.group(1).strip() if m else ""
    return fields


def is_placeholder(value: str) -> bool:
    if not value.strip():
        return True
    return any(pattern.search(value) for pattern in PLACEHOLDER_PATTERNS)


def has_terms(text: str, terms: Iterable[str]) -> bool:
    lower = text.lower()
    return all(term.lower() in lower for term in terms)


def any_term(text: str, terms: Iterable[str]) -> bool:
    lower = text.lower()
    return any(term.lower() in lower for term in terms)


def site_html_files(root: Path) -> list[Path]:
    return sorted((root / "hht/starter-site").glob("*.html"))


def all_site_text(root: Path) -> str:
    return "\n".join(read_text(path) for path in site_html_files(root))


def count_class(root: Path, class_name: str) -> int:
    count = 0
    for path in site_html_files(root):
        parser = parse_html(path)
        for _, attrs in parser.tags:
            if class_name in (attrs.get("class") or "").split():
                count += 1
    return count


def changed_under(changed_files: list[str], prefix: str) -> list[str]:
    return [p for p in changed_files if p.startswith(prefix)]


def check_allowed_paths(result: Result, day: int, changed_files: list[str]) -> None:
    prefixes = [f"hht/submissions/day-{day:02d}/"]
    if day <= 13:
        prefixes.append("hht/starter-site/")
    if day in {1, 11, 13, 15}:
        prefixes += ["hht/practice-server/staging/", "hht/practice-server/backups/", "hht/practice-server/production/"]
    if day >= 14:
        prefixes.append("hht/portfolio/")
    bad = [path for path in changed_files if not any(path.startswith(prefix) for prefix in prefixes)]
    result.add(not bad, "課題対象外のファイルを変更していない", ", ".join(bad[:8]) if bad else "")


def check_symlinks(result: Result, student: Path, changed_files: list[str]) -> None:
    symlinks = [path for path in changed_files if (student / path).is_symlink()]
    result.add(not symlinks, "提出ファイルにシンボリックリンクがない", ", ".join(symlinks[:8]) if symlinks else "")


def scan_secrets(result: Result, student: Path, changed_files: list[str]) -> None:
    findings: list[str] = []
    for rel in changed_files:
        path = student / rel
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            text = read_text(path)
        except (UnicodeDecodeError, OSError):
            continue
        for pattern, label in SECRET_PATTERNS:
            if pattern.search(text):
                findings.append(f"{rel}: {label}")
    result.add(not findings, "秘密情報らしき文字列を提出していない", "; ".join(findings[:5]) if findings else "")


def check_worklog(result: Result, student: Path, day: int) -> tuple[str, dict[str, str]]:
    path = student / f"hht/submissions/day-{day:02d}/WORKLOG.md"
    if not path.is_file():
        result.add(False, "WORKLOG.mdがある")
        return "", {field: "" for field in WORKLOG_FIELDS}
    text = read_text(path)
    fields = extract_worklog_fields(text)
    result.add(True, "WORKLOG.mdがある")
    for field, value in fields.items():
        result.add(not is_placeholder(value), f"WORKLOG: {field}を記入", value[:80] if value else "未記入")
    return text, fields


def require_submission_evidence(result: Result, student: Path, day: int, changed_files: list[str]) -> None:
    prefix = f"hht/submissions/day-{day:02d}/"
    screenshots = [p for p in changed_files if p.startswith(prefix + "screenshots/") and Path(p).suffix.lower() in IMAGE_SUFFIXES]
    evidence = [p for p in changed_files if p.startswith(prefix + "evidence/") and p != prefix + "evidence/.gitkeep"]
    result.add(bool(screenshots), "スクリーンショットを提出", "screenshots/ に画像を1枚以上")
    result.add(bool(evidence), "確認証拠を提出", "evidence/ に記録を1ファイル以上")
    for rel in screenshots:
        path = student / rel
        if path.exists():
            size = path.stat().st_size
            result.add(0 < size <= 5 * 1024 * 1024, f"画像サイズ: {Path(rel).name}", f"{size} bytes")
            result.add(has_image_signature(path), f"画像形式: {Path(rel).name}", "拡張子と画像ヘッダーを確認")
    for rel in evidence:
        path = student / rel
        if path.is_file():
            result.add(path.stat().st_size > 0, f"証拠ファイル: {Path(rel).name}", f"{path.stat().st_size} bytes")


def check_url(result: Result, fields: dict[str, str], required: bool) -> None:
    value = fields.get("確認URL", "")
    if required:
        ok = bool(re.search(r"https?://[^\s<>]+", value)) and not is_placeholder(value)
        result.add(ok, "確認URLを実値で記録", value[:100])
    else:
        result.add(bool(value.strip()) and not is_placeholder(value), "確認URLまたは「なし」を明記", value[:100])


def check_versions(result: Result, fields: dict[str, str], two: bool = False) -> None:
    value = fields.get("バージョン", "")
    ids = re.findall(r"\b[0-9a-f]{7,40}\b", value, flags=re.I)
    ok = len(set(ids)) >= 2 if two else bool(ids) or "なし" in value
    name = "開始・変更後の2つのバージョンIDを記録" if two else "バージョン情報を記録"
    result.add(ok, name, value[:120])


def grade_day1(result: Result, base: Path, student: Path, changed: list[str], worklog: str, fields: dict[str, str]) -> None:
    base_index = read_text(base / "hht/starter-site/index.html")
    student_index = read_text(student / "hht/starter-site/index.html")
    old = "<h1>一杯から、街の日常をあたためる。</h1>"
    new = "<h1>DAY1練習：一杯から、街の日常をあたためる。</h1>"
    result.add(new in student_index, "DAY1練習のh1変更がある")
    result.add(student_index.replace(new, old, 1) == base_index, "DAY1ではh1以外のindex.htmlを変更していない")
    result.add("創業10年" in student_index and "創業10年" in read_text(student / "hht/starter-site/about.html"), "DAY2の本文変更を先叐りしていない")
    check_versions(result, fields, two=True)
    check_url(result, fields, required=True)
    result.add(has_terms(worklog, ("DevTools", "375", "Console", "復元")), "WORKLOGにDevTools・375px・Console・復元を記録")
    if changed_under(changed, "hht/practice-server/staging/"):
        result.add(bool(changed_under(changed, "hht/practice-server/backups/")), "模擬公開を使った場合はbackupsへ復元用コピーを残す")


def grade_day2(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    text = all_site_text(student)
    result.add("地域と歩んで12年" in text, "依頼された「地域と歩んで12年」を反映")
    result.add("創業10年" in text, "一括置換せず、少なくとも1件は対象外として残す")
    result.add(any_term(worklog, ("変更しなかった", "対象外")), "変更しなかった候補の理由を記録")
    check_versions(result, fields)


def grade_day3(result: Result, student: Path, changed: list[str], worklog: str, fields: dict[str, str]) -> None:
    result.add(count_class(student, "button") >= 2, "共通.button classを複数箇所で利用")
    inline = re.compile(r"\sstyle\s*=", re.I)
    result.add(not any(inline.search(read_text(p)) for p in site_html_files(student)), "インラインstyleを追加していない")
    result.add(bool(changed_under(changed, "hht/starter-site/css/")), "CSSファイルを変更")
    result.add(any_term(worklog, ("Styles", "上書き", "競合")), "CSS競合またはStyles確認を記録")
    check_versions(result, fields)


def grade_day4(result: Result, student: Path, changed: list[str], worklog: str, fields: dict[str, str]) -> None:
    result.add(any(p.startswith("hht/starter-site/") and p.endswith(".html") for p in changed), "HTML構造を変更")
    for path in site_html_files(student):
        tags = [tag for tag, _ in parse_html(path).tags]
        result.add(tags.count("main") == 1, f"{path.name}: mainが1つ")
        result.add(tags.count("h1") == 1, f"{path.name}: h1が1つ")
    result.add(any_term(worklog, ("文章", "変更しなかった", "構造")), "文章を勝手に変えていないことを記録")
    check_versions(result, fields)


def nav_signature(path: Path) -> list[str]:
    hrefs = []
    for tag, attrs in parse_html(path).tags:
        if tag == "a" and attrs.get("href") in {"index.html", "menu.html", "about.html"}:
            hrefs.append(attrs["href"] or "")
    if len(hrefs) >= 4 and hrefs[0] == "index.html":
        hrefs = hrefs[1:]
    return hrefs[:3]


def grade_day5(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    pages = [student / f"hht/starter-site/{name}" for name in ("index.html", "menu.html", "about.html")]
    signatures = [nav_signature(path) for path in pages]
    result.add(all(sig == signatures[0] for sig in signatures[1:]), "3ページのナビゲーション順が一致")
    for path in pages:
        result.add(read_text(path).count('aria-current="page"') == 1, f"{path.name}: aria-currentが1つ")
    css = read_text(student / "hht/starter-site/css/style.css")
    result.add(":focus-visible" in css or ":focus" in css, "キーボードfocusの見た目がある")
    result.add(any_term(worklog, ("Tab", "200%")), "Tabキーと200%拡大の確認を記録")
    check_versions(result, fields)


def grade_day6(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    text = all_site_text(student)
    result.add(text.count("menu-card") >= 4, "商品カードが4件以上ある")
    css = read_text(student / "hht/starter-site/css/style.css")
    result.add(bool(re.search(r"\.menu-grid[^{}]*\{[^{}]*display\s*:\s*(?:grid|flex)", css, re.S)), "カード一覧にGridまたはFlexboxを使用")
    result.add("@media" in css, "画面幅に応じたCSSがある")
    result.add(any_term(worklog, ("1件", "4件", "7件")), "1件・4件・7件の増減テストを記録")
    result.add(any_term(worklog, ("Grid", "Flex")), "Grid/Flexboxの選択理由を記録")
    check_versions(result, fields)


def grade_day7(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    tags = [item for parser in (parse_html(p) for p in site_html_files(student)) for item in parser.tags]
    forms = [attrs for tag, attrs in tags if tag == "form"]
    result.add(bool(forms), "form要素がある")
    inputs = [(tag, attrs) for tag, attrs in tags if tag in {"input", "textarea", "select"}]
    labels_for = {attrs.get("for") for tag, attrs in tags if tag == "label" and attrs.get("for")}
    ids = [attrs.get("id") for _, attrs in inputs if attrs.get("type") not in {"hidden", "submit"}]
    result.add(bool(ids) and all(item in labels_for for item in ids), "入力欄のidとlabel[for]が対応")
    types = {attrs.get("type") for tag, attrs in tags if tag == "input"}
    result.add("email" in types, "メール欄がtype=email")
    result.add(any(tag == "textarea" for tag, _ in inputs), "問い合わせ内容のtextareaがある")
    result.add(all(not (attrs.get("action") or "").strip() or attrs.get("action") == "#" for attrs in forms), "実送信先を設定していない")
    result.add(any_term(worklog, ("架空", "Tab", "送信しない")), "架空データ・Tab・実送信しない旨を記録")
    check_versions(result, fields)


def grade_day8(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    result.add(any_term(worklog, ("固定しない", "通常", "案")), "固定しない案も比較")
    result.add(any_term(worklog, ("320", "200%")), "320pxと200%拡大の確認を記録")
    css = read_text(student / "hht/starter-site/css/style.css")
    z_values = [int(v) for v in re.findall(r"z-index\s*:\s*(-?\d+)", css)]
    result.add(not z_values or max(z_values) <= 100, "極端に大きいz-indexを使っていない", str(z_values) if z_values else "")
    check_versions(result, fields)


def grade_day9(result: Result, student: Path, changed: list[str], worklog: str, fields: dict[str, str]) -> None:
    image_dir = student / "hht/starter-site/images"
    candidates = sorted([p for p in image_dir.iterdir() if p.is_file() and p.suffix.lower() in {".webp", ".avif"}])
    changed_images = [p for p in changed if p.startswith("hht/starter-site/images/") and Path(p).suffix.lower() in {".webp", ".avif"}]
    implementation_changed = any(p.startswith("hht/starter-site/") and Path(p).suffix.lower() in {".html", ".css"} for p in changed)
    site_source = all_site_text(student) + "\n" + read_text(student / "hht/starter-site/css/style.css")
    referenced = any(p.name in site_source for p in candidates)
    result.add(bool(changed_images) or (implementation_changed and referenced), "WebP/AVIF画像を実装または成果物として変更")
    if candidates:
        result.add(any(p.stat().st_size <= 300 * 1024 for p in candidates), "300KB以下のWebP/AVIF候補がある", ", ".join(f"{p.name}={p.stat().st_size//1024}KB" for p in candidates[:5]))
    result.add(any_term(worklog, ("出自", "利用", "権利")), "画像の出自・利用条件を記録")
    result.add(any_term(worklog, ("PC", "スマホ", "文字")), "PC・スマホ・文字可読性の確認を記録")
    check_versions(result, fields)


def grade_day10(result: Result, student: Path, changed: list[str], worklog: str, fields: dict[str, str]) -> None:
    result.add(bool(changed_under(changed, "hht/starter-site/css/")), "レスポンシブCSSを変更")
    css = read_text(student / "hht/starter-site/css/style.css")
    result.add("@media" in css, "media queryがある")
    result.add(any(term in css for term in ("max-width", "clamp(", "%", "rem")), "可変幅向けCSSを使用")
    result.add(has_terms(worklog, ("320", "768", "1280")), "320px・768px・1280pxの確認を記録")
    result.add(any_term(worklog, ("横スクロール", "はみ出し")), "修正前後のはみ出し確認を記録")
    check_versions(result, fields)


def grade_day11(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    index = read_text(student / "hht/starter-site/index.html")
    menu = read_text(student / "hht/starter-site/menu.html")
    all_text = all_site_text(student)
    result.add(all(token in all_text for token in ("9:30", "550円", "18:30")), "営業時間・価格・ラストオーダーの値を反映")
    result.add("520円" in menu and "850円" in menu, "対象外のホット/セット価格を維持")
    result.add('"openingHours": "Mo-Tu,Th-Su 09:30-19:00"' in index, "JSON-LDの開店時刻も09:30へ更新")
    year = datetime.now().year
    result.add(all(str(year) in read_text(p) and "&copy; 2024" not in read_text(p) for p in site_html_files(student)), f"全ページの著作権表示に{year}を反映")
    result.add("コーヒーを通して地域の人がゆっくりつながれる場所を目指しています" in all_text, "支給原稿の本文を反映")
    result.add(any_term(worklog, ("5件", "確認依頼中", "対象外")), "5件管理・確認依頼中・対象外を記録")
    check_url(result, fields, required=True)
    check_versions(result, fields)


def grade_day12(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    css = read_text(student / "hht/starter-site/css/style.css")
    result.add("transition" in css, "transitionを使用")
    result.add(":hover" in css, "hover状態がある")
    result.add(":focus-visible" in css or ":focus" in css, "focus状態がある")
    result.add(any_term(worklog, ("写真", "変更しなかった", "OK")), "OK済み写真を変更しない判断を記録")
    result.add(any_term(worklog, ("見出し", "スマホ", "再確認")), "見出し修正と再確認を記録")
    check_versions(result, fields)


def grade_day13(result: Result, student: Path, worklog: str, fields: dict[str, str]) -> None:
    css = read_text(student / "hht/starter-site/css/style.css")
    result.add("prefers-reduced-motion" in css, "prefers-reduced-motionへ対応")
    result.add(any_term(worklog, ("承認", "公開", "未対応")), "承認・公開・未対応事項を記録")
    result.add(any_term(worklog, ("バックアップ", "復元", "戻")), "公開前へ戻せる記録がある")
    check_url(result, fields, required=True)
    check_versions(result, fields)


def grade_day14(result: Result, student: Path, changed: list[str], worklog: str, fields: dict[str, str]) -> None:
    index = student / "hht/portfolio/index.html"
    text = read_text(index)
    tags = [tag for tag, _ in parse_html(index).tags]
    result.add("DAY 14:" not in text and "ここに、自分のポートフォリオ" not in text, "ポートフォリオの初期プレースホルダーを置き換え")
    result.add(tags.count("h1") == 1, "ポートフォリオにh1が1つ")
    result.add(sum(tags.count(tag) for tag in ("section", "article")) >= 2, "実績・自己紹介などを複数セクションへ構成")
    result.add(any_term(worklog, ("見てほしい", "伝えたい", "実績", "個人情報")), "対象読者・目的・実績・個人情報確認を記録")
    result.add(bool(changed_under(changed, "hht/submissions/day-14/evidence/")), "ワイヤーフレーム/レビュー証拠を提出")
    check_versions(result, fields)


def grade_day15(result: Result, student: Path, changed: list[str], worklog: str, fields: dict[str, str]) -> None:
    result.add(bool(changed_under(changed, "hht/portfolio/")), "ポートフォリオを更新")
    css_path = student / "hht/portfolio/css/style.css"
    css = read_text(css_path) if css_path.exists() else ""
    result.add(bool(css.strip()), "ポートフォリオCSSがある")
    result.add("@media" in css, "ポートフォリオにレスポンシブCSSがある")
    result.add(":focus" in css, "キーボードfocusのCSSがある")
    result.add(has_terms(worklog, ("320", "768", "1280", "200%", "Tab")), "3画面幅・200%・Tabの確認を記録")
    result.add(any_term(worklog, ("2分", "発表")), "2分発表の記録がある")
    check_url(result, fields, required=True)
    check_versions(result, fields)


DAY_GRADERS = {
    1: grade_day1, 2: grade_day2, 3: grade_day3, 4: grade_day4, 5: grade_day5,
    6: grade_day6, 7: grade_day7, 8: grade_day8, 9: grade_day9, 10: grade_day10,
    11: grade_day11, 12: grade_day12, 13: grade_day13, 14: grade_day14, 15: grade_day15,
}


def grade_submission(base: Path, student: Path, changed_files: Iterable[str]) -> Result:
    changed = normalize_changed_files(changed_files)
    day, error = detect_day(changed)
    result = Result(day or 0)
    if error:
        result.add(False, "提出DAYを特定", error)
        return result
    assert day is not None
    result.day = day
    result.add(True, "提出DAYを特定", f"DAY {day:02d}")
    check_allowed_paths(result, day, changed)
    check_symlinks(result, student, changed)
    scan_secrets(result, student, changed)
    worklog, fields = check_worklog(result, student, day)
    require_submission_evidence(result, student, day, changed)

    grader = DAY_GRADERS[day]
    if day == 1:
        grader(result, base, student, changed, worklog, fields)
    elif day in {3, 4, 9, 10, 14, 15}:
        grader(result, student, changed, worklog, fields)
    else:
        grader(result, student, worklog, fields)

    work_product = [p for p in changed if not p.startswith(f"hht/submissions/day-{day:02d}/")]
    result.add(bool(work_product), "提出記録だけでなく制作物も変更")
    return result


def load_changed_files(path: Path | None, student: Path) -> list[str]:
    if path:
        return path.read_text(encoding="utf-8").splitlines()
    proc = subprocess.run(
        ["git", "-C", str(student), "diff", "--name-only", "HEAD^1", "HEAD^2"],
        check=True, text=True, stdout=subprocess.PIPE,
    )
    return proc.stdout.splitlines()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--student", type=Path, required=True)
    parser.add_argument("--changed-files", type=Path)
    parser.add_argument("--summary", type=Path)
    args = parser.parse_args()

    changed = load_changed_files(args.changed_files, args.student)
    result = grade_submission(args.base.resolve(), args.student.resolve(), changed)
    print(result.render_text())
    if args.summary:
        args.summary.write_text(result.render_markdown(), encoding="utf-8")
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
