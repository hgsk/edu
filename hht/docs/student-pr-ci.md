# PR提出者によるCIの振り分け

Student Assignmentはmain向けの非draft PRを確認します。PRを更新した人ではなく、GitHubが記録したPR提出者を判定に使います。

- 講師アカウント`hgsk`が`hgsk/edu`内のブランチから提出し、学生成果物を変更しない場合は教材保守として採点対象外にします。Qualityは実行します。
- `hht/submissions/`内で教材として扱う例外は`README.md`と`local-submission.md`の2ファイルだけです。それ以外の提出ファイル、`hht/starter-site/`、`hht/portfolio/`、`hht/practice-server/`の変更は、提出者が`hgsk`でも採点します。
- その他の提出者、forkからの提出、変更一覧が空の場合は採点します。WORKLOGがない提出や教材・CI・採点ルールだけを改変する学生PRもFAILになります。学生PRに講師が追加コミットしても免除されません。

振り分けと採点はbaseコミット側のスクリプトを使用します。PR側のコードは実行せず、読み取り権限と認証情報を保存しないcheckoutを維持します。ラベル・PR本文・ブランチ名による免除はありません。

この振り分けはCIの対象を決めるもので、ZIP提出、各DAYの完成条件、評価基準、講師レビューの方針を変更しません。
