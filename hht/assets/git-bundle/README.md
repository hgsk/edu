# ローカルGit・bundle提出への修正記録

正本は[学生ワークブック](../../docs/student-workbook.md#local-git-bundle-flow)です。
全15回をローカルGitの開始・提出タグとbundleの受け渡しへつなぎました。
開始ZIPは配布用として残し、提出にGitHub・Codespaces・Push・PRを要求しません。

- `bundle-tests.log`：5テスト成功。
  全15回の履歴・タグ・制作ファイル・バイナリ・記録を別cloneで照合しました。
  DAY 3・4の配布状態のコミットと開始タグからの復元も検証しています。
- `negative-policy-checks.json`：Git任意の混入とDAY 15の提出名欠落を拒否しました。
- `course-validation.log`：講座全体の検証結果。
- `demo-transcript.log`：隔離した見本で実行したGitの原本ログ。
- `demo-state.json`：実際のbundle・復元先・コミット。
- `browser-checks.json`：撮影元とブラウザのPID・終了確認。
- `restored-menu.png`：復元したサイトの実ブラウザ画面。
- `flow.svg`：概念図であり、操作画面ではありません。

**未完了：** PowerShellでbundleコマンドを操作する新規スクリーンショット。
`computer-use`の`sky.launch_app`が、`product policy blocks this app`としてPowerShellの起動を拒否しました。
別ツールや別アプリでこの制限を迂回していません。
再開には、撮影可能なGit操作画面が利用できる環境、または講師が撮影した実画面が必要です。
GitのCLI検証と、操作画面の撮影可否は区別しています。

ガイドには既存の実VS Code差分画面と、新たに撮影した復元後の実ブラウザ画面を掲載しました。
未取得の操作画面や、想像した画面は掲載していません。
