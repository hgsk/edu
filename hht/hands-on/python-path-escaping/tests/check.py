"""Usage: python check.py path/to/student-copy. Fixed localhost HTML teaching example only."""

import hashlib
from html.parser import HTMLParser
import importlib.util
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from urllib.parse import quote


SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None
COMPARISON = Path(__file__).resolve().parents[1] / "comparison"
PAYLOAD = '<h2 class="demo-red">臨時休業（架空）</h2>'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.nodes, self.stack = [], []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "text": "", "parents": list(self.stack)}
        self.nodes.append(node)
        if tag not in {"meta", "br", "hr", "img", "input", "link"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1]["tag"] == tag:
            self.stack.pop()

    def handle_data(self, text):
        for node in self.stack:
            node["text"] += text

    def with_id(self, identity):
        return next(n for n in self.nodes if n["attrs"].get("id") == identity)

    def inside(self, identity, tag):
        parent = self.with_id(identity)
        return [n for n in self.nodes if n["tag"] == tag and any(p is parent for p in n["parents"])]


class RouteChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)
        shutil.copy2(SOURCE / "app.py", self.work / "app.py")
        shutil.copytree(SOURCE / "templates", self.work / "templates")
        app = load(self.work / "app.py", "route_exercise").create_app()
        app.testing = True
        self.client = app.test_client()
        self.demo_module = load(COMPARISON / "demo.py", "fixed_comparison")

    def notice(self, message, query=""):
        return self.client.get("/notice/" + quote(message, safe="") + query)

    def test_path_changes_text_and_decodes_utf8_once(self):
        self.assertEqual(self.client.get("/").status_code, 200)
        for text in ("週末メニュー", "本日の案内", "A & B", "a/b", "%3Ch2%3E"):
            with self.subTest(text=text):
                response = self.notice(text)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(Page(response.text).with_id("message")["text"], text)

    def test_html_is_literal_text_in_default_page(self):
        for payload in (PAYLOAD, '<script>not_executed</script>', '<img src=x onerror="not_executed">'):
            response = self.notice(payload)
            self.assertEqual(response.status_code, 200)
            page = Page(response.text)
            self.assertEqual(page.with_id("message")["text"], payload)
            self.assertEqual(page.inside("message", "h2") + page.inside("message", "script") + page.inside("message", "img"), [])
            self.assertIn("&lt;", response.text)

    def test_query_choice_is_separate_from_path(self):
        full = self.notice("お知らせ")
        compact = self.notice("お知らせ", "?view=compact")
        self.assertIn("表示モード：full", full.text)
        self.assertIn("表示モード：compact", compact.text)
        self.assertIn('id="explanation"', full.text)
        self.assertNotIn('id="explanation"', compact.text)
        self.assertEqual(Page(compact.text).with_id("message")["text"], "お知らせ")
        self.assertEqual(self.client.get("/notice?message=お知らせ").status_code, 404)

    def test_length_unknown_view_and_host_are_rejected(self):
        self.assertEqual(self.notice("a" * 160).status_code, 200)
        self.assertEqual(self.notice("a" * 161).status_code, 400)
        self.assertEqual(self.notice("   ").status_code, 400)
        self.assertEqual(self.notice("test", "?view=../../templates").status_code, 400)
        self.assertEqual(self.client.get("/", headers={"Host": "example.invalid"}).status_code, 400)

    def test_values_are_not_used_as_template_or_file_paths(self):
        response = self.notice("templates/index.html")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Page(response.text).with_id("message")["text"], "templates/index.html")
        self.assertEqual(self.client.get("/compare/" + quote(PAYLOAD, safe="")).status_code, 404)

    def test_comparison_disabled_by_default(self):
        client = self.demo_module.create_demo_app().test_client()
        response = client.get("/compare/" + quote(PAYLOAD, safe=""))
        self.assertEqual(response.status_code, 404)

    def test_same_fixed_input_creates_heading_only_in_comparison(self):
        client = self.demo_module.create_demo_app(enabled=True).test_client()
        response = client.get("/compare/" + quote(PAYLOAD, safe=""))
        self.assertEqual(response.status_code, 200)
        page = Page(response.text)
        self.assertEqual(page.with_id("safe-output")["text"], PAYLOAD)
        self.assertEqual(page.inside("safe-output", "h2"), [])
        headings = page.inside("unsafe-output", "h2")
        self.assertEqual(len(headings), 1)
        self.assertEqual(headings[0]["text"], "臨時休業（架空）")
        self.assertEqual(headings[0]["attrs"]["class"], "demo-red")
        self.assertFalse(any(n["tag"] in {"script", "img", "iframe", "form"} for n in page.nodes))
        self.assertIn("default-src 'none'", response.headers["Content-Security-Policy"])
        self.assertIn("form-action 'none'", response.headers["Content-Security-Policy"])

    def test_comparison_rejects_other_html_and_does_not_rewrite_source(self):
        paths = [self.work / "app.py", *list((self.work / "templates").glob("*.html")), COMPARISON / "demo.py"]
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
        client = self.demo_module.create_demo_app(enabled=True).test_client()
        for payload in ("plain text", '<script>not_executed</script>', '<img src="https://example.invalid/x">'):
            self.assertEqual(client.get("/compare/" + quote(payload, safe="")).status_code, 400)
        self.notice(PAYLOAD)
        client.get("/compare/" + quote(PAYLOAD, safe=""))
        self.assertEqual(before, {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})


if __name__ == "__main__":
    if SOURCE is None or not (SOURCE / "app.py").is_file():
        raise SystemExit("Usage: python check.py path/to/student-copy")
    unittest.main(argv=[sys.argv[0]], verbosity=2)
