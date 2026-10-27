"""Check distributed starting data, not a student's completed exercise.

The workbook remains the authority for assignments. The JSON stores only
machine-checkable input facts and the workbook phrases that rely on them.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from html.parser import HTMLParser
import json
from pathlib import Path
from workbook_files import read_workbook
import re
from urllib.parse import unquote, urlsplit
from zipfile import ZipFile, BadZipFile


@dataclass
class Element:
    tag: str
    attrs: dict
    text: str = ""
    children: list = field(default_factory=list)

    def walk(self):
        yield self
        for child in self.children:
            yield from child.walk()


class Document(HTMLParser):
    VOID = set("area base br col embed hr img input link meta param source track wbr".split())

    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Element("document", {})
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Element(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        for node in self.stack:
            node.text += data

    def find(self, tag=None, cls=None, attrs=None, text=None):
        return [node for node in self.root.walk()
                if (tag is None or node.tag == tag)
                and (cls is None or cls in node.attrs.get("class", "").split())
                and all(node.attrs.get(k) == v for k, v in (attrs or {}).items())
                and (text is None or text in node.text)]


def validate(root: Path) -> list[str]:
    errors = []
    def check(ok, message):
        if not ok:
            errors.append(message)

    contract = json.loads((root / "scripts/course-site-contract.json").read_text(encoding="utf-8"))
    workbook = read_workbook(root)
    distributed_zips = set(re.findall(r"\]\(\.\./(lessons/[^)]+\.zip)\)", workbook))
    configured_zips = {site["zip"] for site in contract["sites"] if "zip" in site}
    check(distributed_zips == configured_zips, "Workbook distribution ZIP coverage differs from contract")
    for phrase in contract["workbook_phrases"]:
        check(phrase in workbook, f"Workbook premise changed; review contract: {phrase}")

    for site in contract["sites"]:
        directory = root / site["directory"]
        docs = {}
        for filename in contract["pages"]:
            path = directory / filename
            if not path.is_file():
                errors.append(f"Missing page: {path.relative_to(root)}")
                continue
            doc = docs[filename] = Document(path.read_text(encoding="utf-8"))
            label = f"{site['directory']}/{filename}"
            nav = doc.find(tag="nav")
            links = [n for n in nav[0].walk() if n.tag == "a"] if len(nav) == 1 else []
            check([(n.text.strip(), n.attrs.get("href")) for n in links] ==
                  [tuple(item) for item in contract["navigation"]], f"{label}: navigation names/order/routes")
            check([n.attrs.get("href") for n in links if n.attrs.get("aria-current") == "page"] == [filename],
                  f"{label}: current navigation page")
            for rule in contract["checks"]:
                if filename not in rule["pages"]:
                    continue
                found = doc.find(**rule["match"])
                check(len(found) == rule["count"], f"{label}: {rule['label']} expected {rule['count']}, found {len(found)}")
            buttons = doc.find(tag="a", cls="menu-button", text="メニューを見る")
            expected_href = "#menu-list" if filename == "menu.html" else "menu.html"
            check(len(buttons) == 1 and buttons[0].attrs.get("href") == expected_href,
                  f"{label}: メニューを見る link -> {expected_href}")
            if filename == "menu.html":
                cards = doc.find(tag="article", cls="menu-card")
                products = []
                for card in cards:
                    headings = [n.text.strip() for n in card.walk() if n.tag == "h2"]
                    prices = [n.text.strip() for n in card.walk() if "price" in n.attrs.get("class", "").split()]
                    products.append([headings, prices])
                check(products == [[[name], [price]] for name, price in contract["products"]],
                      f"{label}: starting product names/count/prices")
            if filename == "index.html":
                check("10:00〜19:00（ラストオーダー18:30）" in re.sub(r"\s+", "", doc.root.text),
                      f"{label}: starting visible hours")
                scripts = doc.find(tag="script", attrs={"type": "application/ld+json"})
                try:
                    check(len(scripts) == 1 and json.loads(scripts[0].text)["openingHours"] == contract["openingHours"],
                          f"{label}: starting JSON-LD openingHours")
                except (ValueError, KeyError):
                    errors.append(f"{label}: invalid JSON-LD openingHours")
            if filename == "about.html":
                for text in contract["about_text"]:
                    check(text in doc.root.text, f"{label}: starting information missing: {text}")
            for node in doc.root.walk():
                for attribute in ("href", "src"):
                    value = node.attrs.get(attribute)
                    if value is None:
                        continue
                    url = urlsplit(value)
                    if url.scheme or url.netloc:
                        continue
                    target = path.parent / unquote(url.path) if url.path else path
                    check(target.is_file(), f"{label}: missing {attribute} target {value}")
                    if url.fragment and target.is_file() and target.suffix == ".html":
                        ids = Document(target.read_text(encoding="utf-8")).find(attrs={"id": unquote(url.fragment)})
                        check(len(ids) == 1, f"{label}: fragment {value} expected one target, found {len(ids)}")
            ids = [n.attrs["id"] for n in doc.root.walk() if "id" in n.attrs]
            check(len(ids) == len(set(ids)), f"{label}: duplicate id")
        for css in directory.rglob("*.css"):
            for value in re.findall(r"url\(\s*['\"]?([^'\")]+)", css.read_text(encoding="utf-8")):
                if not urlsplit(value).scheme and not value.startswith("#"):
                    check((css.parent / unquote(value)).is_file(), f"{css.relative_to(root)}: missing CSS image {value}")
        # Intentional teaching faults are explicit: do not repair them to match the base site.
        for rule in site.get("source_contains", []):
            check(rule["text"] in (directory / rule["file"]).read_text(encoding="utf-8"),
                  f"{site['directory']}: missing exercise premise {rule['text']}")
        if "zip" in site:
            try:
                with ZipFile(root / site["zip"]) as archive:
                    actual = {n: archive.read(n) for n in archive.namelist() if not n.endswith("/")}
                    expected = {site["zip_prefix"] + "/" + p.relative_to(directory).as_posix(): p.read_bytes()
                                for p in directory.rglob("*") if p.is_file()}
                    check(actual == expected, f"{site['zip']}: ZIP differs from start directory (names or bytes)")
            except (OSError, BadZipFile):
                errors.append(f"{site['zip']}: unreadable ZIP")
    return errors


if __name__ == "__main__":
    failures = validate(Path(__file__).resolve().parents[1])
    for failure in failures:
        print(f"FAIL: {failure}")
    print(f"COURSE SITE CONSISTENCY: {'FAIL' if failures else 'PASS'}")
    raise SystemExit(bool(failures))
