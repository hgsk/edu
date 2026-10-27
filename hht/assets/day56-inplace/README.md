# DAY 5・6を既存サイト改修へ統一

正本は[DAY 5](../../docs/workbook/day05.md)と[DAY 6](../../docs/workbook/day06.md)です。
開始データをコピーする手順を外し、今あるサイトのファイルを同じ場所で改修します。
Day3・Day4の完成物は要求せず、Gitの開始タグとbundle提出は維持します。
発展課題の内容増減試験も、今のHTMLで一時変更して戻す流れです。

- `course-validation.log`：教材・参照リンク検証。
- `course-site-tests.log`・`workbook-tests.log`：入力前提と正本の回帰検証。
- `bundle-tests.log`：全7テスト成功。
  既存サイトを同じ場所で改修し、HTMLを保持したままbundleから復元できることを確認しました。
  DAY 3・4のタグや、新しいday05/day06練習フォルダーがない場合も検証しています。

前の作業で生成した開始フォルダーは、当時のSHA-256記録と一致したものだけ削除しました。
原本のstarter-siteと、受講者の制作ファイルは変更していません。
