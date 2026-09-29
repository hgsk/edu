# GitHub / Codespaces を使ったWeb学習標準

本資料は、HHTのWeb学習においてGitHubとGitHub Codespacesをどのように活用するかを、**講師・担任・学校関係者向け**に整理した方針です。

目的は、単にGitやクラウドIDEを教えることではありません。  
Web制作・Web開発の学習を、**再現可能な開発環境、提出、レビュー、障害調査、成果物管理まで一つの流れとして学べる形にすること**です。

---

## 1. 位置づけ

GitHub / Codespacesは、Web学習における共通基盤として利用します。

```text
教材
  ↓
Codespacesで開発
  ↓
Gitで履歴を残す
  ↓
GitHubへpush
  ↓
Pull Request / 提出
  ↓
レビュー・自動確認
  ↓
成果物・ポートフォリオ
```

この仕組みにより、完成したWebページだけでなく、

- どのように作業したか
- どの単位で変更したか
- 問題をどう修正したか
- 他者のレビューをどう反映したか
- テストやビルドを通せたか

といった**開発プロセスそのものを学習対象にできます**。

---

## 2. Web学習での主なメリット

### 学習環境を揃えやすい

CodespacesとDev Containerを利用すると、教材側で次のような環境を定義できます。

- Node.js
- PHP / Composer
- Git
- MySQL / MariaDB / PostgreSQL
- Docker / Docker Compose
- ESLint / Prettier
- 必要なVS Code拡張
- Web表示用ポート

これにより、

- PCごとにNode.jsのバージョンが違う
- PATHが通らない
- Windowsだけ挙動が違う
- 必要なソフトが入っていない

といった環境差による授業停止を減らせます。

### 学生の作業履歴が残る

GitHub上には、

- commit
- branch
- diff
- Pull Request
- review
- GitHub Actions

が残ります。

そのため、提出物だけを見るのではなく、**学習の過程や改善の履歴も確認できます**。

### 自宅・学校で同じ学習を続けやすい

ブラウザからCodespaceを開けば、学校PC、自宅PC、貸出端末などでも同じ構成を再現しやすくなります。

---

## 3. 基本的な学習フロー

学生には、まず次の流れを習慣化します。

```text
Repositoryを開く
  ↓
Codespaceを起動
  ↓
課題を確認
  ↓
編集
  ↓
ブラウザで確認
  ↓
commit
  ↓
push
  ↓
提出 / Pull Request
```

初学者には環境構築を最初から要求せず、まずは制作とGitの基本操作に集中させます。

その後、

```text
HTML / CSS
  ↓
JavaScript
  ↓
Git / GitHub
  ↓
HTTP
  ↓
PHP / Node.js
  ↓
Database
  ↓
Docker
  ↓
CI/CD
  ↓
SSH / SFTP
```

と、徐々に下位レイヤーを開示していきます。

Codespacesは「環境構築を学ばなくてよい仕組み」ではなく、**難しい部分を段階的に学ぶための入口**として位置づけます。

---

## 4. WordPressなどOSSサービスの構築

Codespaces上では、WordPressなどのOSSサービスも教材化できます。

推奨はDocker Composeを使った構成です。

```text
Codespace
├─ WordPress / PHP
├─ MariaDB
├─ 必要に応じて管理ツール
└─ Webポート
      ↓
Port Forwarding
      ↓
Browser
```

学習項目としては、次の内容につなげられます。

- WordPress初期構築
- PHPとWebサーバーの関係
- DB接続
- theme / plugin
- ファイル権限
- environment variables
- backup / restore
- migration
- バージョンアップ
- 障害調査
- Docker Compose
- サービス間通信

同じ考え方で、nginx、Apache、Node.js、PostgreSQL、Redis、小規模APIなども扱えます。

### 本番環境としては使わない

Codespaceは**開発・実験・演習用**です。

```text
ソースコード → Git
DBデータ     → dump / fixture
環境設定     → devcontainer / compose
秘密情報     → Secrets等
```

という形で、いつでも再構築できる状態を基本とします。

---

## 5. SSH / SFTP演習

### SSH

SSHは次の2段階に分けます。

1. 自分のCodespaceへSSHしてLinux操作を学ぶ
2. Codespaceから外部の練習サーバーへSSHする

これにより、

- Linux shell
- process確認
- log確認
- 権限
- サーバー操作
- 障害調査

へ自然に接続できます。

### SFTP

SFTPは、Codespaceから学生専用の練習サーバー領域へ接続する形を基本とします。

```text
Codespace
   │
   │ SFTP
   ↓
学生専用の練習サーバー領域
```

演習では、

1. 接続先の確認
2. remote pathの確認
3. アップロード
4. Web表示確認
5. 問題発生時の復旧

までを一連の作業として扱います。

秘密鍵、password、tokenなどはRepositoryへcommitしません。

---

## 6. 講師による学生環境の確認

Codespaces導入の大きな利点は、講師が学生PCそのものを直接触らなくても、**同じ状態を再現して調査しやすいこと**です。

学生のRepositoryやbranchが確認できれば、講師は次を確認できます。

- ソースコード
- commit履歴
- diff
- branch
- Pull Request
- GitHub Actions
- devcontainer
- Docker Compose
- lock file

学生から、

> このcommitで動きません

と報告してもらえば、講師側で同じcommitから環境を再現できます。

```text
学生の不具合
   ↓
commit SHA / branch
   ↓
講師側で同じ状態を再現
   ↓
原因調査
```

### 学生本人のCodespaceへ直接入る運用にはしない

通常は、講師が学生本人のCodespaceへ直接SSHして調査するのではなく、再現調査を基本とします。

未commitの状態や、その瞬間のprocessを確認する必要がある場合は、

- 画面共有
- Terminal出力
- `git status`
- `docker compose ps`
- `docker compose logs`
- 必要な変更のcommit / push

を使います。

これにより、学生自身にも**再現条件を説明する、ログを残す、問題を切り分ける**という実務的な習慣を身につけさせます。

---

## 7. GitHub Actionsの活用

GitHub Actionsは、自動採点だけでなく最低限の品質確認に利用できます。

```text
push / Pull Request
      ↓
lint
      ↓
test
      ↓
build
      ↓
必要に応じてE2E
```

自動化しやすい項目は機械に任せ、講師は、

- UI / UX
- 可読性
- 要件理解
- 設計
- 説明
- レビューへの対応

など、人が見るべき部分に時間を使えます。

---

## 8. 保存とセキュリティの基本

学生には次を明確にします。

```text
Codespace = 作業環境
Git       = バージョン記録
GitHub    = 共有・提出・成果物
```

授業終了時は、

1. `git status`
2. 必要な変更をcommit
3. push
4. GitHub上で確認

までを基本動作とします。

Repositoryへ次の情報は入れません。

- password
- SSH private key
- API token
- 個人情報
- 本番DB dump
- 実在顧客の認証情報

DB、SSH、管理画面などのポートも、理由なくpublicにしません。

---

## 9. 将来の研修への接続

Web学習でGitHub / Codespaces / Dev Containerを使うと、その後の技術研修へ同じ考え方を引き継げます。

### Linux OS研修

Web演習で使ったshell、SSH、process、権限、log、Dockerの知識を、そのままLinux OS研修へ接続できます。

### システム開発研修

Issue、branch、Pull Request、review、CI/CDを継続利用できるため、チームによるシステム開発演習へ移行しやすくなります。

### ゲーム・アプリ開発演習

Git、GitHub、Issue、Pull Request、Actionsといった開発プロセスは、Web以外でも共通です。

ゲーム開発やモバイルアプリ開発では実行環境そのものは別途必要になりますが、**ソース管理・課題管理・レビュー・CIという開発習慣はそのまま引き継げます**。

---

## 10. 他学科への波及メリット

GitHubはプログラミング専用の仕組みではありません。

他学科でも、

- Markdownによる資料作成
- ファイルの変更履歴
- チームでの共同作業
- Issueによる課題管理
- レビュー
- 成果物のポートフォリオ化

に利用できます。

特に、デザイン、映像、ゲーム、ネットワーク、AI、企画系の学科と共同制作する場合、**共通の作業履歴と課題管理の場を持てること**が大きなメリットです。

Web学習を入口にGitHubの基本を身につけておくことで、学科をまたいだ共同制作でも同じ開発プロセスを共有しやすくなります。

---

## 11. 運用原則

1. GitHub / Codespacesは「Web学習標準」として扱う。
2. 初学者の環境差はCodespacesでできるだけ吸収する。
3. 開発環境はDev Container等で再現可能にする。
4. Codespaceを成果物の保存場所にはしない。
5. 学生の作業履歴はGitで残す。
6. 講師は学生PCを直接直すより、commitから再現して調査する。
7. WordPress等のOSSはDocker Composeで再現可能にする。
8. SSH / SFTPは安全な練習環境で行う。
9. GitHub Actionsで機械的な確認を自動化する。
10. Web学習で身につけた開発習慣を、Linux、システム開発、ゲーム、アプリ、他学科との共同制作へつなげる。

---

## 参考

- GitHub Codespaces: https://docs.github.com/en/codespaces
- GitHub Codespaces security: https://docs.github.com/en/codespaces/reference/security-in-github-codespaces
- GitHub CLI + Codespaces: https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-with-github-cli
- Forwarding ports: https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- Dev Container Specification: https://containers.dev/
