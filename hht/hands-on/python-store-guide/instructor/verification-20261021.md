# Python追加課題の検証記録（2026-10-21）

## 対象と配置

独立した新規cloneの`codex/hht-python-templates-t770i`で実施。基点は読み取り取得したmain `1d8f0f364dfbe7e97b3b793f08b081214951e3cd`。PR #20は未マージ、head `d846e871da9f2aa5e30bfac72f8627b83a239618`で、DAY4の13ファイルに関する変更と確認した。PR #20を取り込まず、その変更ファイルは編集していない。他のローカル作業場所は上書きしていない。

HHCという別コースはこのリポジトリ内に見つからず、依頼文の暫定解釈に従って既存HHTのDAY11へ選択追加課題として配置。HTML/CSS中心の15回は維持し、Python既習やインストール済みを前提にしない準備手順を追加した。学習内容・提出・評価条件はDAY11のみを正本とし、目次、DAY12、学生・講師入口、カリキュラム、評価からリンクする。

## 実測

- Windows、Python 3.14.6、Jinja2 3.1.6、MarkupSafe 3.0.3、Flask 3.1.2。課題専用の仮想環境でrequirementsから導入した。
- 店舗案内：7テストPASS。別データ4店舗、空リスト、営業・休業両方、HTMLに見える文字列、未定義キー、テンプレート欠落、生成物の直接編集が再生成で戻ることを確認。未完成スターターは期待どおりFAIL。
- フォーム：10テストPASS。必須・空白・41/121文字の拒否と保存0件、40/120文字の受理、正常保存、303→GET、再読込で増えないこと、SQLに見える値の文字列保存、一覧・エラー再表示のエスケープ、JSON/multipartの415、過大送信の413、外部OriginとHost、最大20件の順序を確認。
- 実HTTPサーバーを2プロセス連続起動し、通常のurlencoded POSTで保存→プロセス終了→同じDBで再起動→GETで残存を検証。テスト側の各プロセスはfinallyで終了、waitし`cleanup PASS`。完了後のプロセス一覧にもテストのHTTP子プロセスは残っていなかった。
- 実Chromeで開始・完成・営業状態切替を確認。フォームを送信し、`架空ラテ`と`週末 & <試作>`を保存。半角空白3つの商品名はPython側で拒否され、メモを保持してエラー表示、一覧は増えなかった。同じ作業コピーを停止・再起動した後も1行が残った。
- 375px幅で両課題を確認し、見出し・本文・入力欄・一覧が読めた。撮影後は画面幅を元に戻した。
- 生成した通常HTMLをhtml-validateで検査。DOCTYPE表記とテンプレート制御行の空白を修正し、PASSを確認した。
- 既存の教材検証、DAYリンク13テスト、学生PR採点8テストはPASS。追加課題のCIはWindows/Linux × Python 3.11/3.14で、同じ17テストと未完成スターターの拒否を実行する。

テストの実行入口：`python hht/scripts/verify_python_exercises.py`。結果は[実行ログ](../../../assets/python-exercises-tests.log)を参照。

## 画面と検証範囲

- 店舗案内：[開始](../../../assets/python-store-guide/start.png)・[完成](../../../assets/python-store-guide/result.png)・[切替](../../../assets/python-store-guide/toggled.png)・[375px](../../../assets/python-store-guide/narrow.png)
- フォーム：[開始](../../../assets/python-form-notes/start.png)・[保存](../../../assets/python-form-notes/saved.png)・[不正入力](../../../assets/python-form-notes/invalid.png)・[再起動後](../../../assets/python-form-notes/restarted.png)・[375px](../../../assets/python-form-notes/narrow.png)

実際に動いているHTML・Flaskの画面を撮影した。ターミナルとVS Codeのネイティブ画面は利用できず未撮影のため、その操作説明の実画面要件は未完了。再開条件は対象UIを撮影できる環境での操作リハーサル。`view-source:`画面の撮影はブラウザURL制限で拒否され、迂回せず実ファイル・パーサー・テストで照合した。想像の画面は使っていない。

学校PCでのPython導入可否、macOS実機、初学者本人の理解度・所要時間、学校の回収先での受領、ZIP圧縮メニューのマウス操作は未確認。環境固有の一時フォルダー権限・localhost接続制限は検証権限を得て再実行し、教材のためにネットワーク設定や認証設定は変更していない。新規アカウント・外部公開・実サイトへの送信は行っていない。

## 後片付け

ブラウザの検証用タブは閉じた。撮影用HTTPサーバーPID 47356、FlaskのスターターPID 15568、完成例PID 37964、再起動後PID 55836を、実行パス・開始時刻と照合して終了・不在確認した。コンソールプロセスはGUIの終了要求に対応せず、記録したPIDだけを停止した。後片付けPASS。元から利用者が開いていたタブ・アプリは閉じていない。
