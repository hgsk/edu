# PHPリクエスト実行とPython静的HTTP配信

課題条件・操作・提出・合格条件の正本は[DAY11](../../docs/workbook/day-11.md#php-http-comparison)です。

`starter/`は前のPHP CLIを踏まえた比較用の完成した最小コードです。正解を補う処理はなく、学生はデータとCSSを変えて更新時期の違いを記録します。`data.php`・`render.php`・`templates/`は配信対象外、PHPは`public/`、Pythonは生成済み`output/`だけを配信します。

`serve_http_comparison.py`はbuild・php・staticを分けます。PHP HTTPのみbridgeとホスト127.0.0.1限定ポートを使い、CLI生成のnetwork noneは維持します。OSやセキュリティ設定を変えません。

講師向けの自動実測は`python hht/scripts/verify_http_comparison.py --runtime wslc --browser`です。これは教材の開始コードを独立コピーで検証するもので、学生の提出物を採点するコマンドではありません。Linux CIは明示的に`--runtime docker`を使います。模擬ガードテストは`test_http_comparison.py`で区別します。

実機・画面・制約は[検証記録](./verification-20261026.md)を参照してください。PHPビルトインサーバーとPython簡易HTTPサーバーは公開運用向けではありません。
