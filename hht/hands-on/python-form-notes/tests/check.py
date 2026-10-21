"""Usage: python check.py path/to/student-copy. DBとHTTPは一時コピー内で検査。"""

from html.parser import HTMLParser
from contextlib import closing
import importlib.util
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.parse
import urllib.error
import urllib.request


SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None


class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class FormChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)
        shutil.copy2(SOURCE / "app.py", self.work / "app.py")
        shutil.copytree(SOURCE / "templates", self.work / "templates")
        spec = importlib.util.spec_from_file_location("exercise", self.work / "app.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.factory = module.create_app
        self.db = self.work / "instance/notes.sqlite3"
        self.app = self.factory(self.db)
        self.app.testing = True
        self.client = self.app.test_client()

    def rows(self):
        with closing(sqlite3.connect(self.db)) as db:
            return db.execute("SELECT item, note FROM entries ORDER BY id").fetchall()

    def test_get_form_and_empty_list(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        tags = Tags(response.text).tags
        self.assertTrue(any(t == "form" and a.get("method", "").lower() == "post" and a.get("action") == "/" for t, a in tags))
        self.assertTrue(any(t == "input" and a.get("name") == "item" for t, a in tags))
        self.assertTrue(any(t == "textarea" and a.get("name") == "note" for t, a in tags))
        self.assertIn("まだ保存されていません", response.text)
        self.assertEqual(self.rows(), [])

    def test_invalid_inputs_are_not_saved(self):
        for data, error in [({}, "商品名は必須です"), ({"item": "  "}, "商品名は必須です"),
                            ({"item": "あ" * 41}, "商品名は40文字以内です"),
                            ({"item": "架空ラテ", "note": "あ" * 121}, "メモは120文字以内です")]:
            with self.subTest(data=data):
                response = self.client.post("/", data=data, content_type="application/x-www-form-urlencoded")
                self.assertEqual(response.status_code, 400)
                self.assertIn(error, response.text)
                self.assertEqual(self.rows(), [])

    def test_boundaries_trim_and_optional_note(self):
        for data in [{"item": "あ" * 40, "note": "い" * 120}, {"item": "  架空ラテ  "}]:
            response = self.client.post("/", data=data)
            self.assertEqual(response.status_code, 303)
        self.assertEqual(self.rows(), [("あ" * 40, "い" * 120), ("架空ラテ", "")])

    def test_save_redirect_display_and_refresh(self):
        response = self.client.post("/", data={"item": "架空ラテ", "note": "限定メニュー"})
        self.assertEqual(response.status_code, 303)
        self.assertEqual(response.headers["Location"], "/")
        for _ in range(2):
            page = self.client.get("/")
            self.assertIn("架空ラテ", page.text)
            self.assertIn("限定メニュー", page.text)
        self.assertEqual(self.rows(), [("架空ラテ", "限定メニュー")])

    def test_sql_parameters_and_html_escaping(self):
        item = "x'); DROP TABLE entries;--"
        note = '<script>alert("x")</script> & <img src=x onerror=alert(1)>'
        self.assertEqual(self.client.post("/", data={"item": item, "note": note}).status_code, 303)
        self.assertEqual(self.rows(), [(item, note)])
        page = self.client.get("/").text
        self.assertIn("&lt;script&gt;", page)
        self.assertIn("&amp;", page)
        self.assertFalse(any(t in {"script", "img"} for t, _ in Tags(page).tags))
        self.assertIn("DROP TABLE entries", page)

    def test_error_redisplay_is_escaped(self):
        note = '<img src=x onerror="alert(1)">'
        response = self.client.post("/", data={"item": "", "note": note})
        self.assertEqual(response.status_code, 400)
        self.assertIn("&lt;img", response.text)
        self.assertFalse(any(t == "img" for t, _ in Tags(response.text).tags))
        self.assertEqual(self.rows(), [])

    def test_json_multipart_and_oversize_rejected(self):
        self.assertEqual(self.client.post("/", json={"item": "架空ラテ"}).status_code, 415)
        self.assertEqual(self.client.post("/", data={"item": "架空ラテ"}, content_type="multipart/form-data").status_code, 415)
        self.assertEqual(self.client.post("/", data={"item": "あ" * 5000}).status_code, 413)
        self.assertEqual(self.rows(), [])

    def test_get_does_not_save_and_external_origin_rejected(self):
        self.assertEqual(self.client.get("/?item=架空ラテ&note=test").status_code, 200)
        self.assertEqual(self.client.post("/", data={"item": "架空ラテ"}, headers={"Origin": "https://example.invalid"}).status_code, 403)
        self.assertEqual(self.client.get("/", headers={"Host": "example.invalid"}).status_code, 400)
        self.assertEqual(self.rows(), [])

    def test_newest_twenty(self):
        for number in range(22):
            self.assertEqual(self.client.post("/", data={"item": f"架空商品{number:02d}"}).status_code, 303)
        page = self.client.get("/").text
        self.assertNotIn("架空商品00", page)
        self.assertIn("架空商品02", page)
        self.assertLess(page.index("架空商品21"), page.index("架空商品20"))
        self.assertEqual(len(self.rows()), 22)

    def test_real_http_process_restart_keeps_database(self):
        # 本物のHTTPサーバーを2回起動し、同じファイルDBを読み直す。
        # 起動した各プロセスはfinallyで必ず終了・waitし、終了を確認する。
        runner = (
            "import runpy,sys; from pathlib import Path; from werkzeug.serving import make_server; "
            "app=runpy.run_path(sys.argv[1])['create_app'](sys.argv[2]); "
            "server=make_server('127.0.0.1',0,app); "
            "ready=Path(sys.argv[3]); pending=ready.with_suffix('.tmp'); "
            "pending.write_text(str(server.server_port)); pending.replace(ready); server.serve_forever()"
        )
        for iteration in range(2):
            ready = self.work / f"ready-{iteration}.txt"
            process = subprocess.Popen([sys.executable, "-c", runner, str(self.work / "app.py"), str(self.db), str(ready)],
                                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                deadline = time.monotonic() + 10
                while not ready.exists() and time.monotonic() < deadline and process.poll() is None:
                    time.sleep(0.03)
                self.assertTrue(ready.exists(), "HTTP server did not start")
                url = f"http://127.0.0.1:{ready.read_text()}/"
                if iteration == 0:
                    data = urllib.parse.urlencode({"item": "再起動用の架空ラテ", "note": "保存確認"}).encode()
                    with urllib.request.urlopen(url, data=data, timeout=5) as response:
                        self.assertIn("再起動用の架空ラテ", response.read().decode())
                else:
                    with urllib.request.urlopen(url, timeout=5) as response:
                        self.assertIn("再起動用の架空ラテ", response.read().decode())
                    self.assertEqual(self.rows(), [("再起動用の架空ラテ", "保存確認")])
            except urllib.error.HTTPError as error:
                status = error.code
                error.close()
                self.fail(f"Expected successful HTTP form save/read, got {status}")
            finally:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
                self.assertIsNotNone(process.poll(), "Test HTTP process cleanup failed")
                print(f"HTTP test PID {process.pid}: cleanup PASS", flush=True)


if __name__ == "__main__":
    if SOURCE is None or not (SOURCE / "app.py").is_file():
        raise SystemExit("Usage: python check.py path/to/student-copy")
    unittest.main(argv=[sys.argv[0]], verbosity=2)
