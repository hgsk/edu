# 全15回のZIP提出と講師レビュー

標準環境はVS Code＋ローカルファイルです。Git/GitHubアカウント、コミット、PR、CIは不要です。各DAYの正本を先に確認し、共通形式を使う回では以下の手順を繰り返します。完成条件は[15日分のチェックシート](../student/assignment-checks.md)、評価は[ルーブリック](../docs/rubric.md)を使います。

> **DAY 4の標準ZIP提出は例外です。** [DAY 4正本の作業・提出手順](../docs/workbook/day-04.md#day-4-actions)を使います。独立した開始ZIPを使うため、このページの継続サイト・WORKLOG・格納位置の手順には進みません。提出内容・記録・保存先はDAY 4正本を参照してください。任意の学生PR採点は別経路で、DAY 4の標準ZIPがCIで採点されるわけではありません。

## 初回に用意するもの

- 講師が配布した自分用の教材フォルダー。VS CodeでREADME.mdとhhtが見える位置を開く。
- 教材フォルダーの**外**に「保存用」と「提出用」のフォルダーを作る。自分の提出番号は講師が割り当てた匿名の番号を使う。
- 講師から回収先、期限、返却先の案内を受け取る。学校のLMS／共有フォルダーが配布されている場合はそこへZIPを添付する。GitHubへのログインは不要。
- 回収先の案内がない場合は、ZIPをUSBへコピーして授業内で講師に渡す。講師が自分の回収フォルダーへコピーし、提出番号・DAY・版を確認して受領を返す。受領確認までは自分のコピーを消さない。架空のURLや未配布のアカウントを作らない。

講師は回収先を他の学生から見えない状態にし、USB回収では受領したZIP名と日時を管理する。返却は同じ学校の提出経路、または授業内のUSB受け渡しで行う。

## 作業前と作業後を保存する

1. 編集前に、保存用フォルダー内へ `day-01-20261007-1330-before` のようなフォルダーを作る。DAY・日時は実際の値を使う。
2. 現在の `hht/starter-site` と `hht/portfolio` を、それぞれstarter-site、portfolioの名前で**フォルダーごとコピー**する。HTMLだけでなくCSS・画像も含める。以後、この保存コピーは編集せず、可能なら読み取り専用にする。
3. 作業中の教材コピーで編集し、ブラウザで確認する。
4. 保存用フォルダー内へ `day-01-20261007-1500-after-r1` のような別フォルダーを作り、保存済みのstarter-siteとportfolioを同じ構成でコピーする。作業前コピーを上書きしない。
5. この2つの**実際のフォルダー名**を開始・変更後のバージョンIDとしてWORKLOGへ記録する。次回は前回の作業後を基に作業前を保存する。DAY 14はportfolioの編集前も必ず残す。

このフォルダー名は保存状態を指す識別子です。GitのSHAを捏造しません。開始時点のコピーを忘れた場合は「BLOCKED（作業前コピーなし）」と記録して講師へ相談し、後から作ったものを作業前と称しません。

## 毎回ZIPを作って提出する

1. 教材内に `hht/submissions/day-01` を作り、[WORKLOGの8項目](./README.md#必ず提出するもの)を記入する。DAYごとにday-02〜day-15へ変える。
2. screenshotsに実画像を1枚以上、evidenceに各DAYで必要な比較表・確認メール・復元記録などを1ファイル以上保存する。各DAYで指定された画面幅・操作・証拠は省略しない。
3. VS Codeで、作業前と作業後の対象ファイルを開く。片方を右クリックして「比較対象として選択」、もう片方を右クリックして「選択項目と比較」し、対象外を変えていないか確認する。追加・削除したファイルも一覧にする。
4. evidenceに `changes.md` を作り、「相対パス／変更前／変更後／理由」を記録する。変更なしのファイルや依頼の対象外も明記する。HTML・CSSの比較自体はbefore／afterのソースから講師が再現できる。
5. 提出用フォルダー内に `s001-day-01-r1` のようなフォルダーを作る。s001は講師が割り当てた提出番号に置き換える。
6. 保存した作業前・作業後の中身をbefore、afterへコピーする。その日のday-01だけをhht/submissions/day-01へコピーする。公開・復元に必要な回では、practice-serverの対象ファイルと公開対象一覧も同梱する。
7. この提出用フォルダーを、OSの「ZIPに圧縮」で `s001-day-01-r1.zip` にする。ZIPを別の場所へ展開し、画像・CSSを含むこととafter/starter-site/index.htmlまたはafter/portfolio/index.htmlを開けることを確認する。
8. 案内された学校の回収先へ提出する。案内がない場合は上記のUSB回収を使う。受領日時と提出したZIP名を自分の手元に残す。

| ZIP内の位置 | 内容 |
|---|---|
| before/starter-site、before/portfolio | 保存した作業前の全ソース |
| after/starter-site、after/portfolio | 保存した作業後の全ソース |
| hht/submissions/day-NN/WORKLOG.md | そのDAYの8項目。バージョンIDとソース位置を対応させる |
| hht/submissions/day-NN/screenshots | 指定された画面・操作結果 |
| hht/submissions/day-NN/evidence | changes.md、各DAYの証拠、公開対象一覧など |
| hht/practice-server/staging、production、backups | 使用した公開・復元の対象ファイルだけ。必要な回のみ |

作業中のhht/starter-site、hht/portfolioが編集の正本です。ZIP内のbefore／afterは講師が比較・表示するための保存コピーです。教材一式、.git、講師用回答、接続票、認証情報は同梱しません。原本を編集しない規則と、ZIPへソースを同梱する規則を区別してください。

## WORKLOG・証拠・URLの書き方

- 8項目を自分の結果で埋める。「質問なし」「未確認なし」は理由を添える。未実施はNOT RUN、阻害要因がある場合はBLOCKEDと書く。途中でも実施した工程を提出する。
- バージョン欄には `開始=保存したbeforeのID / 変更後=保存したafterのID / 提出版=r1` と、ZIP内のbefore／afterへの対応を書く。公開前バックアップはソース用コピーとは分けて記録する。
- 確認URLには実際に開いたローカル、ステージング、公開相当のURLと確認時刻を書く。localhostやfileのURLは講師のPCから同じものを開けないため、ZIP内の表示対象パスと起動方法も添える。ローカルURLをインターネット公開URLと称しない。
- 例: ZIPを展開したフォルダーから `python -m http.server 8000 --directory after/starter-site` を起動し、`http://localhost:8000/` を開く。Pythonが使えない場合はindex.htmlをブラウザで直接開き、HTTPでの確認はNOT RUNと記録する。DAY 1のHTTP確認は講師の確認環境で補う。
- 模擬公開の表示例: 展開したフォルダーから `python -m http.server 8001 --directory hht/practice-server/staging` 。ポートが使用中なら番号を変える。DAY 15のポートフォリオはカフェを上書きせず、`hht/practice-server/staging/portfolio` と `production/portfolio` にportfolioのページ・CSS・使用画像を同じ相対位置で配置する。公開前のproduction/portfolioをbackups内の別フォルダーへ保存し、表示パスを記録する。
- DAY 13・15ではproductionの公開前ファイルをbackupsへ保存し、対象一覧を照合して公開する。復元するファイルと戻す位置を復元記録に書く。承認は提出・受領・CIのPASSで代用しない。

## 全15回の確認対象

下表はZIPに添える証拠の案内です。詳しい完成条件と必要な画面は[課題の完成条件](../student/assignment-checks.md)で確認します。共通形式を使う回にはWORKLOG、before／after、changes.md、画面を付けます。DAY 4の標準ZIPは[正本の提出欄](../docs/workbook/day-04.md#day-4-submission)を参照し、以下の共通形式を適用しません。

| DAY | 対象ソース | その回の主な証拠・公開記録 |
|---:|---|---|
| 01 | starter-site | DevTools、375px、開始・変更後ID、ソースとstagingの復元、受領返信 |
| 02 | starter-site | 検索結果、対象／対象外、メタ情報、確認依頼 |
| 03 | starter-site | 3ページのボタン、CSS競合、返信 |
| 04 | [DAY 4正本を参照](../docs/workbook/day-04.md#day-4-submission) | 標準ZIPは共通形式の対象外 |
| 05 | starter-site | 3ページ、Tab順、200%拡大 |
| 06 | starter-site | 1件・4件・7件、スマホ画面、レイアウトの理由 |
| 07 | starter-site | 架空データの入力、Tab順、実送信しない旨 |
| 08 | starter-site | 固定する／しない2案、320px、200%拡大 |
| 09 | starter-site | 出自・利用条件、変換前後の寸法・容量、PC／スマホ |
| 10 | starter-site | 問題再現、320px・768px・1280px |
| 11 | starter-site | 5件の影響範囲、対象外、staging、確認メール、承認状態 |
| 12 | starter-site | 指摘対応表、focus操作、前後比較、再確認依頼 |
| 13 | starter-site | 明示承認、採用案、公開前バックアップ、production、公開後チェック |
| 14 | portfolio | 企画、掲載可否、ワイヤー、HTML、ペアレビュー |
| 15 | portfolio | 3画面幅、拡大・Tab、公開前バックアップ、production、発表メモ |

## 講師レビューと再提出

1. 講師は元ZIPを提出番号／DAY／版ごとに保持し、作業用コピーへ展開する。学生提出のプログラムやスクリプトは実行せず、HTML・CSS・画像と記録を確認する。
2. DAY 4の標準ZIPは[正本の提出欄](../docs/workbook/day-04.md#day-4-submission)に沿って確認する。それ以外の共通形式ではWORKLOGの8項目、画面、証拠、before／afterがそろうかを確認する。作業前は初回配布物または前回の受領版と照合し、作業記録に書かれていない変更も比較する。
3. [完成条件](../student/assignment-checks.md)の各項目を同じ順序で確認する。ZIPを自分の環境で表示し、幅・200%拡大・Tab・画像・リンクなど人が判断する項目も確認する。模擬公開と復元は記録・ファイルを照合し、必要なら授業内で学生に再現してもらう。
4. 学校の非公開評価記録に、下の形式でレビューを残して返す。CI欄は `NOT APPLICABLE（ZIP提出）`。それによって課題の完成条件を省略しない。
5. 学生は指摘をその回の作業記録に写し、修正、再確認する（共通形式はevidenceの対応表、DAY 4の標準ZIPはsubmission.md）。修正版はr2、r3と版を増やし、新しい作業後IDで保存する。元の開始時点beforeと以前のZIPは保持する。
6. 同じDAYの新しいZIPを再提出し、その回の作業記録（DAY 4の標準ZIPはsubmission.md、共通形式はWORKLOG）へ前版名・指摘・変更・再確認を追記する。講師は指摘と修正を対応させ、最終のレビュー結果を返す。

| レビュー記録の項目 | 記録する内容 |
|---|---|
| 提出の識別 | 提出番号、DAY、ZIP名、版、受領日時、before／afterのID |
| 完成条件ごとの結果 | PASS／FAIL／NOT RUN／BLOCKED／理由付きNOT APPLICABLE、根拠となるファイル・画面 |
| 指摘と次の作業 | 指摘番号、対象パス、直す内容、再確認方法 |
| 再提出確認 | 前版、新版、指摘への対応、再確認結果、レビュー日時 |
| 評価 | 形成的評価4観点、ルーブリック、参加／制作ルートの確認を区別 |

未確認をPASSにしません。課題の完成、講師レビューの完了、授業の合否は別に記録します。Git/GitHub利用の有無やCIのPASSだけで成績を決めません。
