# 提出フォルダーの使い方

各自のブランチで、授業回ごとに次のフォルダーを作ります。

```text
submissions/
└─ day-01/
   ├─ WORKLOG.md
   ├─ screenshots/
   └─ evidence/
```

## 必ず提出するもの

- `WORKLOG.md`: 依頼、質問、変更、対象外、確認、未確認、URL、バージョン
- `screenshots/`: 指定された画面幅や操作結果。**実画像を1枚以上**入れる
- `evidence/`: 比較表、校正表、確認メール案、復元記録など。**1ファイル以上**入れる

HTML・CSS本体は`hht/starter-site`または`hht/portfolio`を直接更新し、同じファイルを提出フォルダーへ重複コピーしません。講師はコミット差分と`WORKLOG.md`を対応させて確認します。

ファイル名に氏名、メールアドレス、パスワード、接続先を入れません。

## PRで提出してCI判定を受ける

1回のPRには**1日分だけ**を入れます。たとえばDAY 1なら、少なくとも次を含めます。

```text
hht/submissions/day-01/WORKLOG.md
hht/submissions/day-01/screenshots/<確認画面>.png
hht/submissions/day-01/evidence/<確認記録>.md
```

加えて、その日の課題で変更した`hht/starter-site`、`hht/portfolio`、必要な模擬公開ファイルをコミットします。

PRを`main`向けに作成すると、`Student Assignment / Grade student submission`が実行されます。判定結果はGitHub ActionsのJob Summaryに、各チェックの**PASS / FAIL**として表示されます。

### CIが確認すること

- DAY 01〜15のどの提出かを`WORKLOG.md`のパスから判定
- 課題対象外の教材・CI・採点コードを変更していない
- WORKLOGの必須8項目が未記入やプレースホルダーのままではない
- スクリーンショットと確認証拠が提出されている
- パスワード、秘密鍵、GitHub tokenなどをコミットしていない
- 各DAYの依頼に対応する、機械判定可能なHTML・CSS・記録条件を満たしている

学生PRのファイルは採点中に**実行しません**。CIは`main`側の採点スクリプトを使い、PRから採点ルールやworkflowを書き換えても合格にならない構成です。

### CIで判定しないこと

見た目の良し悪し、文章の説得力、画像の印象、実際のTab操作など、人が見ないと判断できない項目は完全自動化しません。CIはその場合、スクリーンショットや記録が提出されているところまで確認し、最終判断は講師レビューで行います。

CIがFAILになったら、Job Summaryで赤い項目だけを直し、同じPRへ追加コミットしてください。講師の指示があるまでPRをmergeしません。
