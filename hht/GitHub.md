# GitHub / Codespaces を使ったWeb開発教育方針

HHTでGitHubとGitHub Codespacesを、単なる提出先やクラウドIDEではなく、**学校標準の再現可能なWeb開発環境**として利用するための方針です。

対象はHTML/CSS/JavaScriptだけでなく、PHP、WordPress、Node.js、データベース、SSH/SFTP、Docker、CI/CD、チーム開発までを含みます。

---

## 1. ねらい

GitHubを使う最大の目的は、完成物だけでなく**開発過程そのものを教育・評価対象にすること**です。

```text
Issue
  ↓
作業ブランチ
  ↓
commit
  ↓
Pull Request
  ↓
レビュー
  ↓
修正
  ↓
CI
  ↓
merge / deploy
```

これにより、次の能力を継続的に確認できます。

- 要件を読んで作業を分解する
- 変更単位を考えてcommitする
- 差分を確認する
- 他人のコードをレビューする
- 指摘を受けて修正する
- test / lint / buildを通す
- 公開前後の確認を行う
- 障害時に以前の状態へ戻す

最終成果物だけではなく、**「開発者としてどう作業したか」**を残すことを重視します。

---

## 2. HHTでの基本構成

HHTでは次の役割分担を基本とします。

| 役割 | GitHub上の仕組み |
|---|---|
| 教材 | Repository / Markdown |
| 開発環境 | Codespaces |
| 環境定義 | `.devcontainer/` |
| 課題・作業依頼 | Issues / 教材内の依頼文 |
| 作業単位 | branch |
| 提出 | Pull Request / submissions |
| レビュー | Pull Request Review |
| 自動確認 | GitHub Actions |
| 開発履歴 | commit / diff |
| 成果物 | Repository |
| 公開演習 | CodespacesのPort Forwarding / 外部練習サーバー |

GitHub Classroomは2026年8月28日にサービス終了しているため、HHTではClassroomを前提にしません。

代わりに、

```text
GitHub Organization / Repository
        +
Template相当の教材
        +
Codespaces
        +
devcontainer
        +
Issues / PR
        +
GitHub Actions
```

を基本構成とします。

---

## 3. Codespacesを学校標準環境にする

Codespacesの価値はブラウザ版VS Codeそのものではなく、**教材と開発環境を同じRepositoryから再現できること**にあります。

学生は原則として次の流れで作業します。

```text
Repositoryを開く
  ↓
Codespaceを起動
  ↓
自分のbranch / copyを確認
  ↓
課題を読む
  ↓
編集
  ↓
ブラウザ確認
  ↓
commit
  ↓
push
  ↓
PR / 提出
```

これにより、授業時間を次のような環境差トラブルに消費しにくくなります。

- Node.jsやPHPのバージョンが違う
- PATHが通っていない
- Windowsだけ動作が異なる
- 必要なVS Code拡張がない
- DBの初期設定が違う
- npm / Composer等の依存関係が揃わない

### 環境はRepository側で定義する

将来的にはリポジトリルートへ`.devcontainer/devcontainer.json`を置き、授業で必要なものを定義します。

例:

- Node.js
- PHP / Composer
- Git / GitHub CLI
- Docker / Docker Compose
- MySQL / MariaDB / PostgreSQL
- ESLint / Prettier
- Playwright等のテストツール
- 授業で使用するVS Code拡張
- 自動ForwardするWebポート

Dev ContainerはCodespacesだけの仕組みにせず、ローカルVS Code + Dev Containersでも利用できる構成を目指します。

```text
                 Repository
                     │
              .devcontainer
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
   GitHub Codespaces       Local VS Code
      初学者標準            Docker利用者
```

---

## 4. 初学者と上級者で抽象化レベルを変える

最初から環境構築をすべて学生へ要求しません。

### 初期

学生は、

1. Codespaceを起動する
2. ファイルを編集する
3. Webページを確認する
4. commitする

ことに集中します。

### 中期

次に、

- Node.js
- npm
- PHP
- Web Server
- DB
- Linux shell
- environment variables

を理解します。

### 後期

さらに、

- devcontainer
- Docker
- Docker Compose
- CI/CD
- SSH
- SFTP
- サーバー運用

へ進みます。

つまりCodespacesを**環境構築を教えない仕組み**ではなく、下層を段階的に開示するための抽象化層として使います。

---

## 5. Webアプリの表示

Codespace内でWebサーバーを起動し、Port Forwardingでブラウザから確認できます。

例:

```bash
npm run dev
```

```bash
php -S 0.0.0.0:8000
```

転送ポートは原則として**private**を使用します。

必要な演習だけOrganization内共有を検討し、public公開は目的とリスクを確認した場合だけ使用します。

DBポートは通常外部公開しません。

---

## 6. WordPressなどのOSSサービス構築

Codespaces上でもWordPress等のOSSサービス構築演習は可能です。

推奨構成はDocker Composeです。

```text
Codespace
│
├─ WordPress / PHP
├─ MariaDB
├─ 必要に応じて phpMyAdmin 等
└─ Webポート
      ↓
Port Forwarding
      ↓
Browser
```

教材として扱える内容:

- WordPressの初期構築
- PHPとWebサーバーの関係
- DB接続
- `wp-config.php`
- theme / plugin
- ファイル権限
- environment variables
- DB backup / restore
- uploadsの扱い
- バージョンアップ
- migration
- 障害調査
- Docker Compose
- サービス間通信

WordPress以外にも、同じ方法で次のようなサービスを扱えます。

- nginx / Apache
- PHP
- Node.js
- MySQL / MariaDB
- PostgreSQL
- Redis
- CMS
- 小規模なAPIサーバー

### Codespaceを本番サーバーにはしない

Codespaceは**開発・実験・演習環境**として扱います。

Codespaceを削除すれば、その環境固有のデータは失われる可能性があります。

したがって、

```text
ソースコード → Git
DBデータ     → dump / fixture
環境設定     → devcontainer / compose
秘密情報     → Secrets等
```

として、必要なものを再構築できる状態にします。

---

## 7. SSH

SSHには2種類あるため、授業では区別します。

### A. 自分のCodespaceへSSHする

GitHub CLIを使うと、自分が作成したCodespaceへSSHできます。

```bash
gh codespace list
gh codespace ssh
```

用途:

- Linux shellの練習
- GUIを使わない作業
- process確認
- log確認
- CLIでの障害調査

これは通常のVPSへSSHする演習の前段として使えます。

### B. Codespaceから外部サーバーへSSHする

CodespaceをSSHクライアントとして使い、学校が用意した練習サーバーへ接続できます。

```text
Student
   ↓
Codespace
   ↓ SSH
Training Server
```

こちらは実務のサーバー管理に近い演習です。

既存の[演習運営手順](./docs/exercise-operations.md)にある段階B・Aの考え方と組み合わせます。

---

## 8. SFTP

SFTPも実施できます。

ただし、**CodespaceをSFTPサーバーとして学生同士で利用する構成は基本にしません**。

推奨するのは、

```text
Codespace
   │
   │ SFTP
   ↓
学生専用の練習サーバー領域
```

です。

学生ごとに、

- host
- port
- username
- SSH key
- remote path

を分離します。

演習では次を確認します。

1. 接続先を確認する
2. `pwd`等で現在位置を確認する
3. アップロード対象を確認する
4. バックアップを作る
5. SFTPで対象ファイルだけ送る
6. HTTPで表示確認する
7. 問題があれば対象ファイルだけ戻す

秘密鍵、password、token等はRepositoryへcommitしません。

詳細な公開ルールは[演習運営手順](./docs/exercise-operations.md)を優先します。

---

## 9. 講師による学生環境の調査

ここはCodespaces運用で重要です。

### 講師が確認できるもの

学生のRepositoryまたは作業branchを講師が閲覧できれば、次を確認できます。

- ソースコード
- commit履歴
- diff
- branch
- Pull Request
- review履歴
- GitHub Actionsの結果
- devcontainer設定
- Docker Compose等の環境定義

学生が「動きません」と報告した場合は、学生のcommit SHAを指定して講師側に同じ環境を再現します。

```text
学生
「このcommitで動きません」
        │
        ↓
commit SHA / branch
        │
        ↓
講師自身のCodespaceで再現
        │
        ↓
原因調査
```

これは各学生PCを直接調査する方式より再現性が高くなります。

### 講師が直接確認できないもの

**Codespaceそのものへの接続は作成者に限定されます。**

そのため講師が学生本人のCodespaceへ勝手にSSHして、

- 未commitファイル
- 現在動いているprocess
- shell history
- 一時ファイル
- container内部のその瞬間の状態

を直接確認する運用にはしません。

### ライブ環境を確認したい場合

学生本人に次の情報を取得してもらいます。

```bash
git status
git log --oneline -n 10
pwd
ls
ps aux
docker compose ps
docker compose logs
```

必要に応じて、

- 画面共有
- Terminal出力の共有
- commit / push
- logファイルの提出

を行います。

**障害調査できる状態をcommitとして残すこと自体を教育対象にします。**

---

## 10. 講師による再現調査を基本にする理由

従来型の授業では、

```text
先生、自分のPCだけ動きません
```

に対して学生のPCを直接触る必要がありました。

HHTでは、

```text
Repository
+
commit SHA
+
devcontainer
+
依存関係lock file
```

を揃えることで、講師側で同じ状態を再現できるようにします。

これにより学生にも、

- 状態を説明する
- 再現条件を書く
- エラーメッセージを残す
- Gitへ保存する
- 問題を切り分ける

という実務的な障害報告を習慣化できます。

---

## 11. GitHub Actions

GitHub Actionsは自動採点だけでなく、最低限の品質ゲートとして使います。

例:

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

採点例:

| 項目 | 自動化 |
|---|---|
| HTML構文 | 自動 |
| lint | 自動 |
| unit test | 自動 |
| build | 自動 |
| リンク確認 | 一部自動 |
| UI/UX | 講師 |
| 可読性 | 講師 |
| 要件理解 | 講師 |
| コミュニケーション | 講師 |

単純な確認を自動化し、講師は設計、UX、説明、レビューなど人間が見るべき部分へ時間を使います。

---

## 12. 保存場所の原則

学生には次を明確にします。

```text
Codespace = 作業PC
Git       = バージョン記録
GitHub    = 共有・提出・成果物
```

「Codespaceにファイルがあるから保存済み」とは考えません。

授業終了時は原則として、

1. `git status`
2. 必要な変更をcommit
3. push
4. GitHub上でcommitを確認

まで行います。

---

## 13. セキュリティ

Repositoryへ次を入れません。

- password
- SSH private key
- API token
- 個人情報
- 本番DB dump
- 実在顧客の認証情報

公開ポートも必要最小限にします。

特に、

- DB
- SSH
- 管理画面
- phpMyAdmin等

を理由なくpublicにしません。

学生ごとの練習環境は可能な限り分離します。

---

## 14. 費用とアカウント

基本はGitHub Freeを入口とし、教育機関・学生についてGitHub Educationの対象になる場合はEducation特典を利用します。

2026年9月時点では、認証済み学生は個人アカウントでGitHub Codespacesを月180 core-hoursまで利用できる案内があります。

ただし料金、無料枠、Education特典は変更される可能性があるため、**授業設計を特定の無料枠の数値に依存させません**。

原則:

- 軽量なWeb授業は小さいmachine typeを使う
- 不要なCodespaceは停止する
- 不要になったCodespaceは削除する
- Gitへ保存して環境を使い捨て可能にする

---

## 15. HHTでの推奨到達形

最終的には次の構成を目指します。

```text
HHT Repository
│
├─ hht/
│   ├─ student/
│   ├─ instructor/
│   ├─ docs/
│   ├─ lessons/
│   ├─ starter-site/
│   └─ submissions/
│
├─ .devcontainer/
│   └─ devcontainer.json
│
├─ compose.yaml
│
└─ .github/
    └─ workflows/
```

教育の進行は、

```text
HTML/CSS
  ↓
JavaScript
  ↓
Git / GitHub
  ↓
HTTP
  ↓
PHP / Node
  ↓
Database
  ↓
WordPress / OSS
  ↓
Docker
  ↓
SSH / SFTP
  ↓
CI/CD
  ↓
チーム開発
```

とし、すべて同じRepository・Codespaces・Gitの考え方で接続します。

---

## 16. HHTでの運用原則

1. 初学者の環境差はCodespacesで吸収する。
2. 開発環境は可能な限りコードとしてRepositoryへ置く。
3. Codespaceを成果物の保存場所にしない。
4. 学生の作業履歴はGitで残す。
5. 講師は学生のPCを直接直すより、同じcommitを再現する。
6. WordPress等のOSSはDocker Composeで再現可能にする。
7. SSH/SFTPは学生専用の練習領域で行う。
8. 認証情報はGitへ入れない。
9. GitHub Actionsで機械的確認を自動化する。
10. GitHubの操作そのものではなく、実務の開発プロセスを学ばせる。

---

## 参考

- GitHub Codespaces documentation: https://docs.github.com/en/codespaces
- GitHub Codespaces security: https://docs.github.com/en/codespaces/reference/security-in-github-codespaces
- GitHub CLI + Codespaces: https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-with-github-cli
- Forwarding ports: https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- GitHub Education for students: https://docs.github.com/en/education/about-github-education/github-education-for-students/about-github-education-for-students
- Dev Container Specification: https://containers.dev/
- GitHub Classroom deprecation: https://github.blog/changelog/2026-08-27-github-classroom-deprecated/
