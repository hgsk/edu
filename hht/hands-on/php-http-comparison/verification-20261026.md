# localhost HTTP 2方式の実測（2026-10-26）

## 前提と変更範囲

PR #21は2026-10-26 23:29:11 UTCにマージ済みです。その後に届いた「PHPビルトインサーバー方式とPythonによるHTTP静的配信方式を実測してマージ」という追加指示により、別ブランチ・別PRでこの実習を追加しました。CLI/file表示の証拠をHTTP実測へ流用していません。

既存T770iのWSL／wslc3.0.3、公式PHP8.4.27の固定digest、Windows Python、既存Chromeを使いました。新規インストール、OS・VPN・ファイアウォール・アカウント権限・WSL/wslc設定変更はありません。close-test-appsに従い、作成したプロセス・コンテナだけを終了しました。

## 実機で確認したHTTP構成

PHPはコンテナ内の`php -d opcache.enable=0 -d opcache.enable_cli=0 -S 0.0.0.0:8000 -t /work/public`です。HTTP用のbridgeと`--publish 127.0.0.1:ホストポート:8000`を明示し、非root UID65534、限定bind、固有名、終了後除去を維持しました。CLI生成のnetwork noneは変更していません。外向き通信まで遮断する構成ではないことも教材に明記しました。

Windowsの`Get-NetTCPConnection`で実際のPHP待受が['127.0.0.1']のみと確認しました。wslc3.0.3のinspectにはポート欄がなかったため、Dockerのinspect構造があると仮定せず実際のWindows待受を読み取りました。ホストのLAN／インターネット向け公開は行っていません。

- PHP URL：`http://localhost:56484/`
- Python URL：`http://localhost:56485/`
- Pythonはホストの`ThreadingHTTPServer(('127.0.0.1', port), ...)`で`output/`だけを配信。PHPを実行しません。

固定ポートの学生手順はPHP18765／Python18766です。自動実測は衝突を避けるため未使用のループバックポートを選び、同じサーバー起動関数を使いました。

## 実測した動作

1. Windowsのlocalhost HTTPから両方式の文書・CSSが200。HTMLをUTF-8で厳密にデコードし、Chrome実描画でも日本語・通常3店舗を確認。
2. PHPはHTTP再取得ごとに生成IDが変わる。Pythonは生成済みHTMLと同一バイトで、再取得だけでは生成IDも変わらない。
3. 公園店の休業データとCSSを保存。PHPは次のリクエストで変わり、Pythonは古いHTML/CSSのまま。
4. PHP CLIで再生成すると、Python側も営業時間・CSS・生成IDが変わる。
5. 無害な`<b>試作</b> & 確認`は両方式ともエスケープされ、タグの文字として見える。
6. データのPHPファイルを両方式とも配信せず404。PHPビルトインサーバーの未知URLがindexへフォールバックする挙動は実測で発見し、許可ページ以外404にする処理を追加して全検証をやり直しました。
7. 固有名のPHPコンテナ不在、Pythonサーバーの終了、両ポートへの接続不可を確認。

結果は**PASS**、意味を検査する確認9項目、記録したHTTP成功応答24件です。[HTTP URL・ヘッダー・ハッシュ・プロセス・後片付けを含む実測JSON](../../assets/http-comparison-20261026/http-report.json)に保存しました。

## 実画面と終了

Windows上のChromeで、`file://`ではなく上記の`http://localhost:.../`へ接続して6枚を撮影しました。PHP／Pythonそれぞれの通常・条件切替・特殊文字の画面です。[DAY11の各操作の近く](../../docs/workbook/day-11.md#php-http-comparison)に掲載し、全画像の日本語・表示状態・リンクを目視確認しました。ヘッドレスChromeの実描画であり、アドレスバーやPowerShell／VS Codeの操作画面ではありません。

PHP起動CLI PIDは31416、Pythonの検証プロセスPIDは15848。Chrome PIDは44004, 40904, 33596, 52144, 28884, 34464。記録したChromeプロセスは全て終了し、専用プロファイルを使う子プロセスの不在も確認しました。PHPは対象コンテナstopによって終了（CLI終了コード137）し、不在を確認しました。Pythonはshutdown・スレッド終了・server_closeが成功しました。cleanupはいずれもPASSです。既存プロセスや他のコンテナは停止していません。

## CIで判明した更新間隔の修正

最初のLinux HTTP CIでは、短い間隔でdata.phpを更新した直後に古い内容が返り、更新確認が失敗しました。PHPのコードキャッシュ再検査間隔に依存させないため、実習サーバーの起動引数だけに`-d opcache.enable=0 -d opcache.enable_cli=0`を追加しました。グローバルなPHP設定・OS・wslc設定は変更しません。この修正後のコードでT770iの両HTTP方式を再実測し、CIでも同じ即時更新条件を再確認します。

## CIとの区別・残る範囲

ガード4テストはWindows/Dockerのポート情報を模擬してワイルドカード公開を拒否し、静的配信のPHPソース露出・広いマウントを拒否することを確認します。模擬テスト自体を実機証拠とは扱いません。CIはLinux DockerのPHP HTTPとPython HTTPで同じ意味の統合検証を実行し、Windowsブラウザの実測とは区別します。最終headのCIとレビュー確認は追加PRのChecksに残します。

学校PC・初学者の所要時間・回収先、PowerShell／VS Codeのネイティブ操作画面、公開運用・認証・外部接続は未確認です。以前拒否されたview-sourceは使用していません。HTTPサーバーの外部公開を試す必要はありません。
