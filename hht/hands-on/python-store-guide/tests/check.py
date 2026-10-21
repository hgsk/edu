"""Usage: python check.py path/to/student-copy (ローカルの自分のコードだけを検査)."""

import ast
from html.parser import HTMLParser
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.stack = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "text": "", "parent": self.stack[-1] if self.stack else None}
        self.nodes.append(node)
        if tag not in {"meta", "br", "hr", "img", "input", "link"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1]["tag"] == tag:
            self.stack.pop()

    def handle_data(self, data):
        for node in self.stack:
            node["text"] += data

    def select(self, tag, **attrs):
        return [n for n in self.nodes if n["tag"] == tag and all(n["attrs"].get(k) == v for k, v in attrs.items())]


def load_data(path):
    # data.pyはリテラル代入だけを読み、検査のために実行しない。
    values = {}
    for node in ast.parse(path.read_text(encoding="utf-8")).body:
        if isinstance(node, ast.Assign):
            for name in node.targets:
                if isinstance(name, ast.Name):
                    values[name.id] = ast.literal_eval(node.value)
    return values["SHOP"], values["BRANCHES"]


class ExerciseChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name) / "work"
        self.work.mkdir()
        for name in ("render.py", "data.py"):
            shutil.copy2(SOURCE / name, self.work / name)
        shutil.copytree(SOURCE / "templates", self.work / "templates")

    def run_render(self):
        # 別の作業ディレクトリから実行しても出力先が一定であること。
        return subprocess.run([sys.executable, str(self.work / "render.py")],
                              cwd=self.temp.name, capture_output=True, text=True,
                              encoding="utf-8", timeout=10)

    def render_data(self, shop, branches):
        (self.work / "data.py").write_text(f"SHOP = {shop!r}\nBRANCHES = {branches!r}\n", encoding="utf-8")
        # 同一秒の再実行で古いデータのpycを使わない。
        shutil.rmtree(self.work / "__pycache__", ignore_errors=True)
        result = self.run_render()
        self.assertEqual(result.returncode, 0, result.stderr)
        html = (self.work / "output/index.html").read_text(encoding="utf-8")
        return html, Page(html)

    def assert_page(self, shop, branches):
        html, page = self.render_data(shop, branches)
        self.assertEqual(len(page.select("main")), 1)
        self.assertEqual([n["text"].strip() for n in page.select("h1")], [shop["name"]])
        self.assertEqual([n["text"].strip() for n in page.select("p", id="notice")], [shop["notice"]])
        lists = page.select("ul", id="branches")
        self.assertEqual(len(lists), 1)
        items = [n for n in page.select("li") if n["parent"] is lists[0]]
        self.assertEqual(len(items), len(branches))
        for item, branch in zip(items, branches):
            names = [n["text"].strip() for n in page.select("h3") if n["parent"] is item]
            states = [n["text"].strip() for n in page.select("p") if n["parent"] is item]
            self.assertEqual(names, [branch["name"]])
            self.assertEqual(states, ["本日休業" if branch["closed"] else f"営業時間：{branch['hours']}"])
        self.assertNotIn("{{", html)
        self.assertNotIn("{%", html)
        return html, page

    def test_assignment_data_and_output(self):
        shop, branches = load_data(SOURCE / "data.py")
        self.assertEqual(shop, {"name": "NORTH LIGHT COFFEE", "notice": "<臨時案内> & 週末"})
        self.assertEqual(branches, [
            {"name": "駅前店", "hours": "09:00〜19:00", "closed": False},
            {"name": "公園店", "hours": "11:00〜18:00", "closed": True},
            {"name": "港店", "hours": "12:00〜17:00", "closed": False},
        ])
        self.assert_page(shop, branches)

    def test_changed_data_and_both_conditions(self):
        self.assert_page({"name": "TEST CAFE", "notice": "変更後"}, [
            {"name": "A", "hours": "08:00〜09:00", "closed": True},
            {"name": "B", "hours": "20:00〜21:00", "closed": False},
            {"name": "C", "hours": "06:00〜07:00", "closed": True},
            {"name": "D", "hours": "14:00〜15:00", "closed": False},
        ])

    def test_empty_branch_list(self):
        self.assert_page({"name": "店舗なし", "notice": "準備中"}, [])

    def test_html_is_text_not_executable_markup(self):
        payload = '<script>alert("x")</script> & <img src=x onerror="alert(1)">'
        html, page = self.assert_page({"name": payload, "notice": payload}, [
            {"name": payload, "hours": payload, "closed": False},
        ])
        self.assertEqual(page.select("script") + page.select("img"), [])
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("&amp;", html)

    def test_typo_fails_without_overwriting_last_output(self):
        output = self.work / "output/index.html"
        output.parent.mkdir()
        output.write_text("LAST GOOD OUTPUT", encoding="utf-8")
        (self.work / "templates/index.html").write_text("{{ shop.missing_key }}", encoding="utf-8")
        result = self.run_render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("UndefinedError", result.stderr)
        self.assertEqual(output.read_text(encoding="utf-8"), "LAST GOOD OUTPUT")

    def test_missing_template_fails(self):
        (self.work / "templates/index.html").rename(self.work / "templates/saved.html")
        result = self.run_render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("TemplateNotFound", result.stderr)

    def test_generation_overwrites_manual_output_edits(self):
        shop, branches = load_data(SOURCE / "data.py")
        self.render_data(shop, branches)
        output = self.work / "output/index.html"
        expected = output.read_bytes()
        output.write_text("MANUAL EDIT", encoding="utf-8")
        result = self.run_render()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(output.read_bytes(), expected)


if __name__ == "__main__":
    if SOURCE is None or not (SOURCE / "render.py").is_file():
        raise SystemExit("Usage: python check.py path/to/student-copy")
    unittest.main(argv=[sys.argv[0]], verbosity=2)
