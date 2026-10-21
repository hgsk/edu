"""localhost限定の教材。認証・完全なCSRF対策を備えた公開システムではない。"""

from contextlib import closing
from pathlib import Path
import sqlite3

from flask import Flask, abort, redirect, render_template, request, url_for
from jinja2 import StrictUndefined


def read_form(form):
    # TODO A: nameがitemとnoteの値を取得し、前後の空白を除く。
    return "", ""


def validate(item, note):
    # TODO B: 必須・長さを検査し、エラーの文字列リストを返す。
    return ["入力チェックが未実装です"]


def save_entry(db, item, note):
    # TODO C: パラメーター化したINSERTとコミット。
    raise NotImplementedError("保存処理を実装してください")


def list_entries(db):
    # TODO D: 新しい順で20件のSELECT結果を返す。
    return []


def create_app(database=None):
    app = Flask(__name__, template_folder=str(Path(__file__).resolve().parent / "templates"))
    app.config.update(MAX_CONTENT_LENGTH=4096, TRUSTED_HOSTS=["localhost", "127.0.0.1"])
    app.jinja_env.undefined = StrictUndefined
    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True
    db_path = Path(database) if database else Path(__file__).resolve().parent / "instance" / "notes.sqlite3"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    app.config["DATABASE"] = str(db_path)

    def connect():
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        return db

    with closing(connect()) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, item TEXT NOT NULL, note TEXT NOT NULL)")

    @app.route("/", methods=["GET", "POST"])
    def index():
        item, note, errors = "", "", []
        if request.method == "POST":
            if request.mimetype != "application/x-www-form-urlencoded":
                abort(415)
            # 外部Origin付きの送信を拒否。ただしCSRFトークンの代用ではない。
            origin = request.headers.get("Origin")
            if origin and origin != request.host_url.rstrip("/"):
                abort(403)
            item, note = read_form(request.form)
            errors = validate(item, note)
            if not errors:
                with closing(connect()) as db:
                    save_entry(db, item, note)
                return redirect(url_for("index"), code=303)
        with closing(connect()) as db:
            entries = list_entries(db)
        return render_template("index.html", item=item, note=note, errors=errors, entries=entries), 400 if errors else 200

    return app


if __name__ == "__main__":
    # 外部公開しない。debugと自動再起動も使わない。
    create_app().run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
