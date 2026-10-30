# フォーム受信・保存 進行・検証

依頼・課題条件は[DAY 11の正本](../../../docs/legacy-workbook/day11.md#python-form)を参照します。先にテンプレート課題で変数・繰り返し・条件分岐を経験してから、別枠120〜150分を目安に進めます。初学者の所要時間は未実測です。

FlaskはJinja2を標準で使え、SQLiteはPython標準のため、DBサーバーや追加アカウントを必要としません。学生はA〜Eだけを編集します。初回GETと未実装表示、キーの対応、サーバー側エラー、INSERT、SELECT、再起動後の読込を順に確認します。HTTP配線・接続管理・初期テーブル・開発サーバーは配布済みです。

正解例は`solution/app.py`と`solution/templates/index.html`です。`starter/`を別の検証コピーへ複製し、正解例2ファイルだけを重ねます。DBは常に検証コピー内に作り、学生のDBを使いません。`instance/`、SQLite、仮想環境はGit除外済みです。

```text
python hht/scripts/verify_python_exercises.py
```

上のルートからのコマンドは通常のHTTP送信、入力不正、境界値、SQLへ見える文字列、HTMLエスケープ、再読込の重複防止、保存件数と表示順、別プロセス再起動後の永続化を検証します。HTTP検証プロセスはfinallyで終了し、終了コード取得まで確認します。

外部Originの拒否とHost制限は補助だけです。CSRFトークン・認証・認可・本番サーバー・運用設計は未実装です。公開可能なアプリと説明しません。ローカル実習中も無関係のWebサイトからの送信に注意し、終了後はサーバーを止めます。機械検査だけで学生の理解・授業合否を判定しません。

一次資料：[Flask Quickstart](https://flask.palletsprojects.com/en/stable/quickstart/)・[SQLiteとの接続](https://flask.palletsprojects.com/en/stable/tutorial/database/)・[セキュリティの考慮点](https://flask.palletsprojects.com/en/stable/web-security/)。今回の実測は[検証記録](../../python-store-guide/instructor/verification-20261021.md)へまとめます。
