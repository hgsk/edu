# 提出方針の更新記録

## 現行方針（2026-10-22）

ユーザーから「Zip提出は廃止だよ」と訂正があったため、全15回を[PR提出](../submissions/README.md)へ統一した。ZIP標準・任意PR・DAY 4のWORKLOG免除という以前の案内は適用しない。開始ZIPは練習素材として残す。各DAYでWORKLOG・画面・証拠を提出し、CIと講師レビューを確認する。授業の評価基準は変更しない。

以下は以前の判断の照合記録であり、現在の提出指示ではない。

---

# Git方針と提出経路の履歴照合（2026-10-07）

## 確認結果

照合したmainは `dc736882615c30bc63c65acaac2d1337b347ae5b`。全コミット履歴、ISSUES.md・学生入口・提出入口の変更履歴、関連Issue #1/#3/#5/#7、PR #2/#4/#6/#8の本文・コメントを確認した。後続変更にGitHub利用案とPR採点はあるが、ISSUE-02の選択Aを撤回してGit/GitHubを必須にする明示的な決定は確認できない。

したがってISSUE-02の「VS Code＋ローカルファイル／Gitは必須から除外」を維持する。全15回のZIP提出を具体化し、PR＋CIは任意経路として案内する。この修正は新たな必須環境・評価基準を導入するものではない。

## 根拠

| 履歴・仕様 | 確認した内容 |
|---|---|
| [890329e](https://github.com/hgsk/edu/commit/890329ec2a15d90b516ea6968b86a78ba9defed0)／[PR #2](https://github.com/hgsk/edu/pull/2) | 講座判断を確定。ISSUE-02は選択A、Git必須を除外。ISSUES.mdはこの後、照合時点まで変更なし |
| [19b21f5](https://github.com/hgsk/edu/commit/19b21f540e8d9574cefdcbcf86e80c3912b6dc91)／[PR #4](https://github.com/hgsk/edu/pull/4) | VS Codeでルートを開く運用。個人コピーとブランチの両方を記載し、Gitなしのバックアップも維持 |
| [e591a3a](https://github.com/hgsk/edu/commit/e591a3a0227e7fff5037cc9295d73110e53269c1)／[PR #6](https://github.com/hgsk/edu/pull/6) | 15回の完成条件・WORKLOG・提出構成を追加。DAY 1のGitなし代替を記載 |
| [f987076](https://github.com/hgsk/edu/commit/f98707617796a3089760050d852969affb3e1aee)と後続GitHub.md改稿 | GitHub/Codespaces活用の学校関係者向け案内。ISSUE-02の撤回・選択変更は記録されていない |
| [3d4e284](https://github.com/hgsk/edu/commit/3d4e284025969494f809326e2a150c8c43f7fdd7) | DAY 1を具体化。Gitコマンド中心だが、バックアップ代替を残している |
| [d49f36d](https://github.com/hgsk/edu/commit/d49f36da28bcceef15bc0d894311452a8dd440c4)と後続採点修正 | Student Assignment CIとPR手順を追加。Git非必須を上書きする判断記録はない |
| [ISSUE-06](../ISSUES.md#issue-06-評価方法)／[評価ルーブリック](./rubric.md) | 参加ルート／制作ルート。CIを授業合否へ置き換える決定はない |

## 反映内容

- [提出入口](../submissions/README.md)と[ZIP手順](../submissions/local-submission.md): 回収、ソース比較、WORKLOG、証拠、版管理、講師レビュー、再提出を全15回で共通化。
- 学生入口、ワークブック、講師ガイド: 個人コピーの確認を標準とし、Gitのソース管理確認とDAY 1のGit操作を任意にする。
- 完成条件とルーブリック: 証拠は共通。CI結果、課題完成、講師レビュー、授業合否を区別する。
- Qualityのコース検証: ZIP経路、15回の案内、8項目、関連リンクとGit非必須方針の整合を検証する。
