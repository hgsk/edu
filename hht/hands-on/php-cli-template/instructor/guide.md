# PHP CLI実習 進行・正解例

[DAY 11の正本](../../../docs/workbook/day-11.md#php-cli-template)を参照してください。PHPはコンテナの1回のCLI処理でHTMLを生成し、FlaskはHTTP要求時にHTMLを返す、という違いから始めます。Pythonと同じ店舗データ・出力条件を使い、構文の差と共通の情報構造を比べます。

`starter/`を別コピーへ複製し、`solution/`の`hello.php`・`data.php`・`templates/index.php`だけを重ねると正解例になります。Webサーバー、PHP-FPM、Composerは使いません。`render.php`の`htmlspecialchars`とUTF-8指定は保持します。固定した手元のテンプレートだけをincludeし、パス入力からファイル名を作りません。

教師用確認は`python hht/scripts/verify_php_cli.py`です。既存Docker Serverと固定修正版公式イメージを必須にし、各PHPファイルのlint、29項目、未完成スターターの拒否、Docker stdoutとホストに直接保存したファイルのバイト一致を確認する設計です。実行した各コンテナは固有名で追跡し、終了後の不在を確認します。CIは生成HTMLも検査し、成功時だけArtifactを保存します。

**現在はBLOCKEDです。** 実行結果・digest・スクリーンショットを推測して記入しません。[公式確認とローカル環境の記録](./verification-20261021.md)に従い、準備完了後に操作リハーサルを行ってください。CIで動いても、T770iのPowerShell手順を実測したことにはなりません。
