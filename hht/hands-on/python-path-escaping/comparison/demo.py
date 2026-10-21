"""教育専用。任意HTMLを受理せず、固定の無害な見出しだけを比較する。"""

import argparse
from pathlib import Path

from flask import Flask, abort, render_template
from markupsafe import Markup


DEMO_TEXT = '<h2 class="demo-red">臨時休業（架空）</h2>'


def create_demo_app(enabled=False):
    app = Flask(__name__, template_folder=str(Path(__file__).resolve().parent / "templates"))
    app.config["TRUSTED_HOSTS"] = ["localhost", "127.0.0.1"]
    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True

    @app.get("/")
    def index():
        return render_template("index.html", demo_text=DEMO_TEXT, enabled=enabled)

    @app.get("/compare/<path:message>")
    def compare(message):
        if not enabled:
            abort(404)
        if message != DEMO_TEXT:
            abort(400)
        # 任意の入力へMarkupを付けない。比較するのは上の固定・無害な定数だけ。
        return render_template("compare.html", message=message, demo_html=Markup(DEMO_TEXT))

    @app.after_request
    def constrain_response(response):
        # この例はHTML表示の比較のみ。スクリプト・外部リソース・フォーム送信を禁止。
        response.headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    return app


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="教育用の固定HTML比較。公開禁止")
    parser.add_argument("--allow-unsafe-comparison", action="store_true")
    args = parser.parse_args()
    if not args.allow_unsafe_comparison:
        parser.error("比較モードは明示フラグが必要です。通常アプリへ混入させません")
    create_demo_app(enabled=True).run(host="127.0.0.1", port=5001, debug=False, use_reloader=False)
