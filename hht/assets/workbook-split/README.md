# ワークブック分割の検証記録

[学生ワークブック](../../docs/student-workbook.md)は目次だけにしました。
課題・完成条件の正本は、目次から参照する日別本文と共通手順です。

- `docs/workbook/day01.md`〜`day15.md`へ各回の本文を移しました。
- 前書き・共通手順・Unity編・数学編も別ファイルへ移しました。
- 比較対象の本文をリポジトリ内へ重複保存していません。
- `workbook_files.py`による結合は、既存の入力データ・画像検証の実行時だけです。

## 証拠

- `migration-map.json`：移行先と旧アンカーの対応。
- `content-and-links.json`：全15回と共通・追加講座の本文保持、585リンクと215画像の参照確認。
  比較では見出し階層・追加ナビ・移動したリンク先・空白を除外しています。
  前書きの開き方は新しい構成に合わせて更新しました。
- `browser-checks.json`：目次19項目、DAY 5・6の画像、次の回と目次へ戻る操作、数学読者の28単元読込み。
  撮影用ブラウザのPIDと終了確認も記録しています。
- `index-preview.png`・`day05-preview.png`・`day06-preview.png`：実際のMarkdownをブラウザで表示したプレビュー。
  VS Codeの操作画面ではありません。
- `test-results.json`と各ログ：教材・生成元・回帰テスト。

## Unityの文書移行

ランタイムのBuildファイルは再ビルドしていません。
旧manifestの全成果物ファイルと現物のハッシュが完全一致する場合だけ、文書位置の移行として入力指紋を更新しました。
`compiledArtifactsRebuilt: false`と、旧manifestのハッシュ・不変ファイル集合を記録し、checkでも検査します。
旧manifestは`unity-manifest-before.json`へ保管しています。
