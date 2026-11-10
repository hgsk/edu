"""Receive practice-only POSTs and print their fields; never save or mail them."""
import argparse
import errno
from functools import partial
import hashlib
from http.client import HTTPConnection, HTTPException
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import socket
import sys
import threading
import time
from urllib.parse import parse_qs

SITE_DIR = Path(__file__).resolve().parent
MAX_BODY = 16384
STATUS_PATH = "/__practice_status"
CODE_ID = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
POST_LOG_LOCK = threading.Lock()


class StartupError(RuntimeError):
    pass


class PracticeServer(ThreadingHTTPServer):
    # On Windows, SO_REUSEADDR could allow two servers to bind the same port.
    allow_reuse_address = not hasattr(socket, "SO_EXCLUSIVEADDRUSE")

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class PracticeHandler(SimpleHTTPRequestHandler):
    timeout = 10

    def do_GET(self):
        if self.path != STATUS_PATH:
            super().do_GET()
            return
        body = json.dumps(self.server.practice_identity).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/complete.html":
            self.send_error(404, "Unknown practice endpoint")
            return
        if self.headers.get_content_type() != "application/x-www-form-urlencoded":
            self.send_error(415, "Use an HTML form")
            return
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self.send_error(400, "Invalid Content-Length")
            return
        if length < 0:
            self.send_error(400, "Invalid Content-Length")
            return
        if length > MAX_BODY:
            self.send_error(413, "Form body is too large")
            return
        try:
            values = parse_qs(self.rfile.read(length).decode("utf-8"),
                              keep_blank_values=True, max_num_fields=30,
                              encoding="utf-8", errors="strict")
        except TimeoutError:
            self.send_error(408, "Form body timed out")
            return
        except (UnicodeError, ValueError):
            self.send_error(400, "Invalid form encoding")
            return
        # JSON keeps newlines and terminal control characters escaped, and keeps
        # repeated fields (such as checked menu items) as arrays.
        record = {"path": self.path, "fields": values}
        with POST_LOG_LOCK:
            encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
            payload = json.dumps(record, ensure_ascii=False)
            try:
                payload.encode(encoding)
            except UnicodeEncodeError:
                payload = json.dumps(record, ensure_ascii=True)
            prefix = "[POST受信] ".encode(encoding, errors="backslashreplace").decode(encoding)
            print(prefix + payload, flush=True)
        for field in ("name", "email", "message"):
            if len(values.get(field, [])) != 1 or not values[field][0].strip():
                self.form_error()
                return
        if not re.fullmatch(r"[^\s@]+@[^\s@]+", values["email"][0]):
            self.form_error()
            return
        # POST/Redirect/GET: refreshing the completion page does not resend the body.
        # Input is printed above, but is not put in a URL, saved, or emailed.
        self.send_response(303)
        self.send_header("Location", "complete.html")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def form_error(self):
        body = ("<!DOCTYPE html><html lang=\"ja\"><meta charset=\"utf-8\">"
                "<title>入力内容の確認</title><h1>入力内容を確認してください</h1>"
                "<p>名前・メール・問い合わせ内容は必須です。</p>"
                "<p>メールは cafe-test@example.com のような形式で入力してください。</p>"
                "<p>ブラウザの「戻る」でフォームへ戻り、入力を直してください。</p>"
                "</html>").encode("utf-8")
        self.send_response(400)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def identity(directory):
    path = os.path.normcase(str(Path(directory).resolve()))
    return {"app": "hht-form-practice", "protocol": 1, "code_id": CODE_ID,
            "site_id": hashlib.sha256(path.encode("utf-8")).hexdigest()}


def make_server(directory=None, port=0):
    directory = directory or SITE_DIR
    handler = partial(PracticeHandler, directory=str(directory))
    server = PracticeServer(("127.0.0.1", port), handler)
    server.practice_identity = identity(directory)
    return server


def start_or_reuse(directory, port):
    try:
        return make_server(directory, port)
    except OSError as error:
        if error.errno not in (errno.EADDRINUSE, errno.EACCES) and getattr(
                error, "winerror", None) not in (10048, 10013):
            raise
    # Another invocation may have bound its socket just before starting its loop.
    expected = identity(directory)
    for attempt in range(5):
        connection = HTTPConnection("127.0.0.1", port, timeout=0.25)
        try:
            connection.request("GET", STATUS_PATH)
            response = connection.getresponse()
            data = response.read(4097)
            if response.status != 200 or len(data) > 4096:
                raise StartupError(f"ポート{port}は別のアプリが使用中です。")
            try:
                actual = json.loads(data)
            except (ValueError, UnicodeError) as error:
                raise StartupError(f"ポート{port}は別のアプリが使用中です。") from error
            if actual == expected:
                return None
            if isinstance(actual, dict) and actual.get("app") == expected["app"]:
                if actual.get("site_id") != expected["site_id"]:
                    raise StartupError(
                        f"ポート{port}では別のフォルダーのサーバーが起動中です。"
                        "起動元のターミナルでCtrl+Cを押してから実行してください。")
                raise StartupError(
                    "起動中のサーバーとファイルの版が異なります。"
                    "起動元のターミナルでCtrl+Cを押し、起動し直してください。")
            raise StartupError(f"ポート{port}は別のアプリが使用中です。")
        except (OSError, HTTPException):
            if attempt < 4:
                time.sleep(0.05)
        finally:
            connection.close()
    raise StartupError(f"ポート{port}を使用できません。講師に相談してください。")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    directory = SITE_DIR
    if not all((directory / name).is_file() for name in ("about.html", "complete.html")):
        parser.error("practice pages are missing")
    try:
        server = start_or_reuse(directory, args.port)
    except (OSError, StartupError) as error:
        parser.exit(1, f"起動できません: {error}\n")
    url = f"http://127.0.0.1:{args.port}/about.html"
    if server is None:
        print(f"起動済みです: {url}", flush=True)
        return
    with server:
        print(f"起動しました: {url}", flush=True)
        print("練習用サーバーです。終了は、このターミナルでCtrl+Cを押します。", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
