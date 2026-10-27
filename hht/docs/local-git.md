# ローカルGitの操作手順

変更前後を比べ、作業の区切りを履歴へ残します。  
授業での進め方は[共通手順](./workbook/common.md#local-git-workflow)を参照します。

## DAY 1だけ：リポジトリを用意する

講師から受け取った教材の**自分用コピー**を開きます。  
`README.md`と`hht`が見えるフォルダーがルートです。  
教材ZIPは配布のために展開できます。  
既にGitリポジトリとして配布されている場合は、`git init`と初期コミットを繰り返さず、本人のブランチを用意する所から始めます。

```powershell
git --version
git init -b main
git config --local user.name "s001"
git config --local user.email "s001@example.invalid"
git status --short
```

`user.name`と`user.email`は履歴に残る作者名です。  
上のメールは練習用の架空アドレスで、ログイン用ではありません。  
講師の指定があれば、その値を使います。  
Gitが動かなければ、インストールやPATHの設定を講師と直します。

初期状態に個人情報・秘密鍵・パスワード・大きな作業用出力がないか確認します。  
初回の配布データだけを対象に、開始状態を記録します。

```powershell
git add .
git diff --cached --stat
git commit -m "教材の開始状態を記録"
git switch -c student/s001
```

2日目以降は、同じフォルダーと本人のブランチを開きます。  
既に `student/s001`がある場合は、`git switch student/s001`で選びます。  
毎回初期化したり、教材を取り直して履歴を消したりしません。

<a id="practice-baseline"></a>

## DAY 3・4：配布状態も先にコミットする

DAY 3・4は開始ZIPを展開します。  
いずれも本人のリポジトリ内の `hht/practice/dayNN`へ置きます。  
DAY 3なら `hht/practice/day03/about.html`、DAY 4なら `hht/practice/day04/about.html`が開ける位置に置きます。  
既存の練習フォルダーがあれば上書きせず、講師と確認します。

以下はDAY 3の例です。  
内容を直す前に配布状態を記録しておくと、あとで修正差分を読めます。

```powershell
git add hht/practice/day03
git diff --cached --stat
git commit -m "DAY 03 配布状態を記録"
```

DAY 4は、パス・メッセージ・タグをその日の番号へ読み替えます。  
DAY 5・6は今使っているサイトで差分を確認し、そのまま開始タグを付けます。  
このコミット後に、次の開始タグを付けます。

## 毎回の開始：開始タグを付ける

```powershell
git branch --show-current
git status --short
git tag day01-start
```

ブランチが `student/s001`で、`status --short`が空か確認します。  
空でなければ、残った変更を読み、前回の作業として記録してから開始します。  
既存のタグは上書きしません。  
タグは、あとから「この日の作業前」を探す目印です。

## 編集・確認の後：差分を読んでコミットする

VS Codeの「ソース管理」で変更ファイルを開き、変更前後を見比べます。  
HTMLやCSS、使った画像、その日の記録を選んで「＋」でステージします。  
DAY 3・4の練習フォルダーも、教材リポジトリの中で記録します。  
ブラウザのDevToolsで試した変更は、必要なものを実ファイルへ書き戻します。

以下はDAY 1の例です。  
対象パスは、その日のワークブックで使ったファイルへ読み替えます。

```powershell
git diff -- hht/starter-site
git add hht/starter-site
git diff --cached
git commit -m "DAY 01 表示確認と作業記録"
git tag day01-end
git log -3 --oneline
git status --short
```

DAY 3は `hht/practice/day03`、DAY 4は `hht/practice/day04`の変更も選びます。  
DAY 5・6は、実際に改修した既存サイトのファイルを選びます。  
DAY 14・15は `hht/portfolio`を選びます。  
画像や作業記録が未追跡のまま残っていないか確認します。  

![VS Codeのソース管理で、変更前後のHTMLとコミット欄を表示した実画面](../assets/vscode/10-source-control-diff.jpg)

画像は既存のGit差分操作例です。  
画像内の古いブランチ名ではなく、本人の `student/s001`を確認します。

作業記録には、既知の作業タグ名（例：`day01-end`）を書いてからコミットできます。  
記録自身のコミットIDを事前に書こうとして、コミットを繰り返す必要はありません。
