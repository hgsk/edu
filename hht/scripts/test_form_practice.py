"""Exercise the real local HTTP receiver without launching a browser."""
from http.client import HTTPConnection
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import socket
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
SITES = {
    "day07": "day07",
    "day08": "day08",
    "day7-basic": "instructor/day78-basic/day7",
    "day8-basic": "instructor/day78-basic/day8",
    "day8-sticky": "instructor/day78-sticky",
}


def load_server(path):
    spec = importlib.util.spec_from_file_location("practice_server", path)
    module = importlib.util.module_from_spec(spec)
    with patch("sys.dont_write_bytecode", True):
        spec.loader.exec_module(module)
    return module


implementation = load_server(ROOT / "day07/server.py")
make_server = implementation.make_server
MAX_BODY = implementation.MAX_BODY
PracticeHandler = implementation.PracticeHandler


class FormPracticeTest(unittest.TestCase):
    def setUp(self):
        self.server = make_server(ROOT / SITES["day08"])
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.cleanup)

    def cleanup(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.assertFalse(self.thread.is_alive())

    def request(self, body, path="/complete.html", content_type="application/x-www-form-urlencoded"):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            connection.request("POST", path, body=body,
                               headers={"Content-Type": content_type})
            response = connection.getresponse()
            return response.status, response.getheader("Location"), response.read()
        finally:
            connection.close()

    def valid(self, **changes):
        fields = {"name": "練習用カフェ太郎", "email": "cafe-test@example.com",
                  "message": "営業時間を確認したいです。"}
        fields.update(changes)
        return urlencode(fields)

    def test_post_redirects_without_input_in_url_and_completion_is_readable(self):
        status, location, body = self.request(self.valid())
        self.assertEqual((status, location, body), (303, "complete.html", b""))
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            for _ in range(2):
                connection.request("GET", "/complete.html")
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertIn("入力練習が完了しました", response.read().decode())
        finally:
            connection.close()

    def test_received_fields_are_logged_once_as_json_including_repeated_fields(self):
        fields = {"name": "練習用カフェ太郎", "email": "cafe-test@example.com",
                  "message": "営業時間を確認したいです。\n\x1b[31m練習",
                  "interest": ["coffee", "food"]}
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            status, _, _ = self.request(urlencode(fields, doseq=True))
            self.assertEqual(status, 303)
            connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
            try:
                connection.request("GET", "/complete.html")
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                response.read()
            finally:
                connection.close()
        lines = output.getvalue().splitlines()
        self.assertEqual(len(lines), 1)
        self.assertTrue(lines[0].startswith("[POST受信] "))
        record = json.loads(lines[0].removeprefix("[POST受信] "))
        self.assertEqual(record["path"], "/complete.html")
        self.assertEqual(record["fields"]["name"], [fields["name"]])
        self.assertEqual(record["fields"]["message"], [fields["message"]])
        self.assertEqual(record["fields"]["interest"], ["coffee", "food"])
        self.assertNotIn("\x1b", output.getvalue())

    def test_invalid_field_values_are_logged_as_received_not_accepted(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(self.request(self.valid(email="invalid"))[0], 400)
        record = json.loads(output.getvalue().removeprefix("[POST受信] "))
        self.assertEqual(record["fields"]["email"], ["invalid"])

    def test_malformed_encoding_is_not_logged_as_form_fields(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(self.request(b"\xff")[0], 400)
        self.assertEqual(output.getvalue(), "")

    def test_terminal_encoding_does_not_break_submission_or_json(self):
        raw = io.BytesIO()
        output = io.TextIOWrapper(raw, encoding="cp932")
        try:
            with contextlib.redirect_stdout(output):
                self.assertEqual(self.request(self.valid(name="練習用カフェ😀"))[0], 303)
            line = raw.getvalue().decode("cp932")
            record = json.loads(line.removeprefix("[POST受信] "))
            self.assertEqual(record["fields"]["name"], ["練習用カフェ😀"])
        finally:
            output.close()

    def test_required_fields_and_email_are_checked_on_server(self):
        for fields in ({"name": ""}, {"message": " "}, {"email": "cafe-test"}):
            with self.subTest(fields=fields):
                status, location, body = self.request(self.valid(**fields))
                self.assertEqual(status, 400)
                self.assertIsNone(location)
                self.assertIn("入力内容を確認してください", body.decode())

    def test_missing_duplicate_and_invalid_encoding_are_rejected(self):
        for body in ("email=a%40b&message=x", self.valid()+"&name=extra", b"\xff",
                     b"name=%FF", "&".join(f"field{n}=x" for n in range(31))):
            with self.subTest(body=body):
                self.assertEqual(self.request(body)[0], 400)

    def test_unsupported_endpoint_type_and_body_size_are_rejected(self):
        self.assertEqual(self.request(self.valid(), path="/about.html")[0], 404)
        self.assertEqual(self.request("{}", content_type="application/json")[0], 415)
        self.assertEqual(self.request("x" * (MAX_BODY + 1))[0], 413)
        self.assertEqual(self.request("")[0], 400)

    def test_incomplete_request_body_times_out(self):
        with patch.object(PracticeHandler, "timeout", 0.1):
            connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
            try:
                connection.request("POST", "/complete.html", body=b"x", headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": "100",
                })
                response = connection.getresponse()
                self.assertEqual(response.status, 408)
                response.read()
            finally:
                connection.close()

    def test_all_supplied_forms_use_post_and_all_completion_pages_exist(self):
        for site, relative in SITES.items():
            directory = ROOT / relative
            self.assertEqual((directory / "server.py").read_bytes(),
                             (ROOT / "day07/server.py").read_bytes())
            self.assertTrue((directory / "complete.html").is_file())
            if site == "day07":
                continue  # Students add the form in DAY 7.
            source = (directory / "about.html").read_text(encoding="utf-8")
            self.assertIn('action="complete.html" method="post"', source)

    def test_copied_day_folders_receive_post_without_the_rest_of_the_repository(self):
        for day in ("day07", "day08"):
            with self.subTest(day=day), tempfile.TemporaryDirectory() as temp:
                directory = Path(temp) / day
                shutil.copytree(ROOT / day, directory)
                local = load_server(directory / "server.py")
                self.assertEqual(local.SITE_DIR, directory)
                with local.make_server() as server:
                    thread = threading.Thread(target=server.serve_forever, daemon=True)
                    thread.start()
                    connection = HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                    try:
                        connection.request("POST", "/complete.html", body=self.valid(),
                                           headers={"Content-Type": "application/x-www-form-urlencoded"})
                        response = connection.getresponse()
                        self.assertEqual(response.status, 303)
                        self.assertEqual(response.getheader("Location"), "complete.html")
                        response.read()
                        connection.request("GET", "/complete.html")
                        response = connection.getresponse()
                        self.assertEqual(response.status, 200)
                        self.assertIn("入力練習が完了しました", response.read().decode())
                    finally:
                        connection.close()
                        server.shutdown()
                        thread.join(timeout=3)
                        self.assertFalse(thread.is_alive())

    def test_repeated_start_reuses_the_same_listener(self):
        port = self.server.server_port
        for _ in range(2):
            self.assertIsNone(implementation.start_or_reuse(ROOT / "day08", port))
        output = io.StringIO()
        with patch.object(implementation, "SITE_DIR", ROOT / "day08"), patch(
                "sys.argv", ["server.py", "--port", str(port)]), contextlib.redirect_stdout(output):
            implementation.main()
        self.assertIn("起動済みです", output.getvalue())
        connection = HTTPConnection("127.0.0.1", port, timeout=3)
        try:
            connection.request("GET", implementation.STATUS_PATH)
            response = connection.getresponse()
            self.assertEqual(json.loads(response.read()), implementation.identity(ROOT / "day08"))
        finally:
            connection.close()

    def test_other_folder_is_not_reused_or_stopped(self):
        with self.assertRaisesRegex(implementation.StartupError, "別のフォルダー"):
            implementation.start_or_reuse(ROOT / "day07", self.server.server_port)
        self.assertTrue(self.thread.is_alive())

    def test_simultaneous_starts_create_one_listener(self):
        with make_server(ROOT / "day08") as reserved:
            port = reserved.server_port
        barrier = threading.Barrier(2)
        started, reused, failures = [], [], []

        def start():
            try:
                barrier.wait(timeout=3)
                server = implementation.start_or_reuse(ROOT / "day08", port)
                if server is None:
                    reused.append(True)
                else:
                    thread = threading.Thread(target=server.serve_forever, daemon=True)
                    started.append((server, thread))
                    thread.start()
            except Exception as error:
                failures.append(error)

        workers = [threading.Thread(target=start, daemon=True) for _ in range(2)]
        try:
            for worker in workers:
                worker.start()
            for worker in workers:
                worker.join(timeout=4)
            self.assertTrue(all(not worker.is_alive() for worker in workers))
            self.assertEqual(failures, [])
            self.assertEqual(len(started), 1)
            self.assertEqual(len(reused), 1)
        finally:
            for server, thread in started:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)
                self.assertFalse(thread.is_alive())

    def test_another_version_is_not_reused(self):
        self.server.practice_identity = dict(self.server.practice_identity, code_id="old-version")
        with self.assertRaisesRegex(implementation.StartupError, "版が異なります"):
            implementation.start_or_reuse(ROOT / "day08", self.server.server_port)
        self.assertTrue(self.thread.is_alive())

    def test_other_application_is_not_reused(self):
        self.server.practice_identity = {"app": "other-app"}
        with self.assertRaisesRegex(implementation.StartupError, "別のアプリ"):
            implementation.start_or_reuse(ROOT / "day08", self.server.server_port)
        self.assertTrue(self.thread.is_alive())

    def test_port_without_a_ready_http_server_has_a_finite_wait(self):
        with socket.socket() as listener:
            if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
                listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            port = listener.getsockname()[1]
            started = time.monotonic()
            with self.assertRaisesRegex(implementation.StartupError, "使用できません"):
                implementation.start_or_reuse(ROOT / "day08", port)
            self.assertLess(time.monotonic() - started, 4)


if __name__ == "__main__":
    unittest.main()
