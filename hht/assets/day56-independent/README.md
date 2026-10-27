# DAY 5・6の独立開始データの検証

正本は[DAY 5](../../docs/workbook/day05.md)と[DAY 6](../../docs/workbook/day06.md)です。
各回専用の開始フォルダーを配布データとして用意しました。
DAY 3・4の成果物の移行は求めません。

- `validation.json`：開始ファイルのハッシュと検証結果。
- `course-validation.log`：教材・配布データの検証。
- `course-site-tests.log`・`workbook-tests.log`：既存の入力前提と正本読込みの回帰検証。
- `bundle-tests.log`：全7テスト成功。
  DAY 3・4のタグが存在しない新しいリポジトリで、DAY 5・DAY 6それぞれの配布状態のコミット、基本編、bundle、別cloneによる復元を確認しました。
- `browser-checks.json`：専用データだけで基本編のCSSを適用し、本文の保持、3ページの移動、390/1100pxを確認しました。
  起動したブラウザのPIDと終了確認も記録しています。
- `day05-start.png`・`day06-start.png`：各回の専用データの実画面。
- `day05-result.png`・`day06-result.png`：基本編のCSSを適用した実画面。
  日別本文の完成例にも掲載しています。

これまでの制作物と原本のstarter-siteは変更していません。
共通手順・提出構成図・開始データ検証も、独立実習の場所に合わせています。
DAY 7の継続サイトの案内とは分離しました。
