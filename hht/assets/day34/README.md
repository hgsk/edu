# DAY 3・DAY 4 素材と検証

## 実画面と説明図

- `day3-start-*.png`・`day3-result-*.png`：配布開始データ／講師改善例をChromeで表示して撮影。`*-button.png` は対象リンク周辺をブラウザの撮影範囲として指定した実画面。学生資料は比較しやすい拡大写真を使用。
- `day3-devtools.png`：利用者が2026年10月13日に撮影した実際のChrome画面を、そのまま保存。`http://127.0.0.1:8873/about.html` の対象リンク。右下でID指定の採用とclass指定の上書きを確認。個人情報・認証情報は含まない。
- `day4-start.png`・`day4-result.png`：配布開始データ／講師改善例の店舗案内をChromeで表示して撮影。
- `day4-tag-comparison.png`：`lessons/04/tag-comparison.html`をChromeで表示した実画面。同じclassで同じ見た目になる例と、タグ名のCSS指定で見た目が異なる例。`tag-comparison-checks.json`に適用CSS・置換前後・名前付きsectionの役目・撮影用PID終了の確認を記録。
- `day3-css-map.svg`・`day4-regions.svg`：教材用に作成した説明図。実画面や操作証拠ではない。図中と本文で一例／説明図と明記。
- `markup-purpose.svg`：前書き用の説明図。情報を意味ごとに整理→HTMLで役目を示す→CSSで表現する流れと、同じ構造から縦並び・横並びを選ぶ例。実画面ではなく省略した図と明記。SVGの構文・描画・文字の収まりを確認。
- `markdown-format-preview.png`：`docs/markdown-format-guide.md`の例を、ローカルのmarked GFM対応表示で実ブラウザに表示して撮影。GitHubの実画面ではない。太字・斜体・取り消し線・HTMLのins・表・チェック欄・折りたたみを確認。`markdown-format-checks.json`に10項目と撮影用PID終了を記録。GitHub独自の注意枠・脚注・Mermaidは公式資料の書式確認であり、ライブUI確認は未実施。

掲載先は各回の実習と学生ワークブック。写真・説明図に代替テキストを付け、開始時点・調査・改善例の該当箇所に配置した。

## 検証

対象をDAY 3・4に限定。`browser-checks.json` はブラウザで読んだCSSの実値、`validation.json` は確認結果を保存する。

- PASS：開始ZIPの整合性と内容の読み戻し。
- PASS：改善例で本文の値・リンク先を保持。DAY 4のCSSとほかの2ページを保持。
- PASS：改善例のmain・h1・ID重複・DAY 4の見出し順。
- PASS：ブラウザでDAY 3の3ページの色・内側の余白・角丸が一致。
- PASS：対象資料のローカルリンク、説明図のXML構文。
- NOT RUN：受講者による120分／90分の所要時間実測。時間表は授業進行の見積もり。
- BLOCKED：自動でのネイティブDevTools操作。ブラウザURLを安全制御が確認できなかった。利用者提供の実画面で教材の不足を補った。

表示の目視確認と撮影用プロセスの終了結果は `validation.json` に記録する。既存の利用者のアプリは終了しない。
