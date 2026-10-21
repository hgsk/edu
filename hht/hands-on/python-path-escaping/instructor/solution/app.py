"""安全な通常アプリ。入力はHTML本文の文字列として表示する。"""

from pathlib import Path

from flask import Flask, abort, render_template, request
from jinja2 import StrictUndefined


def displayed_message(message):
    # TODO A: ルートが受け取ったmessageを、そのまま文字列として返す。
    return message


def selected_view(arguments):
    # TODO B: queryのviewを取得（既定full）。full/compact以外は400。
    view = arguments.get("view", "full")
    if view not in {"full", "compact"}:
        abort(400)
    return view


def create_app():
    app = Flask(__name__, template_folder=str(Path(__file__).resolve().parent / "templates"))
    app.config["TRUSTED_HOSTS"] = ["localhost", "127.0.0.1"]
    app.jinja_env.undefined = StrictUndefined
    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/notice/<path:message>")
    def notice(message):
        if not message.strip() or len(message) > 160:
            abort(400)
        # テンプレートのパスは固定。messageからファイル名を作らない。
        return render_template("notice.html", message=displayed_message(message), view=selected_view(request.args))

    @app.after_request
    def constrain_response(response):
        response.headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5002, debug=False, use_reloader=False)
