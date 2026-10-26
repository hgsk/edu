# PHP CLI追加実習：確認済み事項とブロッカー

## 公式情報とバージョン選定

2026-10-21に[PHP公式告知](https://www.php.net/archive/2026.php)と[8.4.27のリリース告知](https://www.php.net/releases/8_4_27.php)を読み、緊急修正版8.4.27を最低条件として選んだ。採用予定タグは`php:8.4.27-cli-bookworm`。`latest`、8.4の可変タグ、8.4.26、RC版へフォールバックしない。

現在の教材・検証スクリプトではレジストリ選択を曖昧にしないため、完全修飾名`docker.io/library/php:8.4.27-cli-bookworm`を使う。

[Docker Official Image](https://hub.docker.com/_/php)と[公式タグ定義](https://github.com/docker-library/official-images/blob/master/library/php)を確認。確認時の定義には安定版8.4.26と8.4.27RC1が掲載され、修正版安定CLIは未掲載だった。レジストリの`docker manifest inspect docker.io/library/php:8.4.27-cli-bookworm`は`no such manifest`。Docker Hub APIの同タグは404だった。他の修正済み系列8.5.12／8.3.36／8.2.35の`-cli-bookworm`も404だった。

従って、選定タグの公開・pull・digest・実行PHPバージョンはまだ確認できていない。タグが取得できるまでこの実習は実行不可。公開後にpullし、`php --version`が修正版であることとRepoDigestを記録する。バージョン付きタグも再ビルドでdigestが変わり得るため、厳密な授業時点の再現には確認したdigestを併記する。

### 全バリアントの切り分け（15:34 UTC追記）

公式定義は修正版へ更新されたが、定義への掲載とレジストリ配信は別だった。8.4.27／8.5.12／8.3.36／8.2.35についてHubのCLIタグ一覧は各0件。さらに公式定義に載った`-cli`、`-cli-trixie`、`-cli-bookworm`、`-cli-alpine`、`-cli-alpine3.24`、`-cli-alpine3.23`の計24タグを`registry-1.docker.io`へ直接HEAD確認し、全件404だった。bookwormだけの欠落ではなく、適切な公開済み代替は見つからなかった。[確認時刻付きの生データ](../../../assets/php-fixed-cli-manifests-20261021.json)を保存した。未修正版・RC・非公式イメージへは変更していない。タグ確認のためのCI反復実行はしていない。

## T770iローカル環境

**現在の実行方針は、利用者指定のWSL内のネイティブLinuxランタイムである。** 下のWindows CLI確認は過去の調査記録であり、Docker Desktopを現在の前提にしない。WSL自体はコンテナランタイムではない。

Docker Client `29.5.3-rd`（Rancher Desktop同梱）は存在する。`docker version`の既定エンドポイント`npipe:////./pipe/docker_engine`、登録済み`desktop-linux`の`npipe:////./pipe/dockerDesktopLinuxEngine`は、ともにパイプが存在せず接続失敗。Docker Serverバージョンは取得できなかった。Docker/Rancherの稼働プロセスと対応パイプも見つからなかった。

導入・起動、規約承諾、仮想化・OS・ネットワーク設定、永続コンテキスト変更、別環境への切替は行っていない。古いホストPHPを代用して実行済み扱いにしない。

### 既存WSLの読み取り確認

`Ubuntu`と`Ubuntu-24.04`が既存のWSL2として存在した。利用者の更新指定に従って各ディストリビューションへ読み取りコマンドを実行した。

- Ubuntu：通常ユーザーUID/GID 1000。PATH上のDockerはRancher Desktop由来。`/usr/bin/docker`も`/mnt/wsl/docker-desktop/cli-tools/usr/bin/docker`へのリンクで、ネイティブEngineではなかった。
- Ubuntu-24.04：既定ユーザーはroot。PATH上のDockerは同様にRancher Desktop由来。授業でrootユーザーを標準とせず、Ubuntuの通常ユーザーを対象にする。
- 両方でネイティブのdockerd／Podman／containerd実体、対応稼働プロセス、`/var/run/docker.sock`とrootlessソケットは見つからず、ローカルソケット指定の`docker version`も失敗した。Windows連携CLIがあることを実行可能の根拠にはしない。
- UbuntuのPython3は既存。subuid/subgidは通常ユーザー向けに既存の65536範囲があり、user.max_user_namespacesは127782だった。newuidmap/newgidmapは見つからなかった。これらは読み取っただけで変更していない。
- 教材ルートをWindowsの`wsl -d Ubuntu --cd <教材ルート> --exec pwd`で渡し、対応する`/mnt/c/.../edu`を取得できることは実測した。教材のコピー先はWSL本人用の`$HOME/hht/php-template-work`とし、コンテナへはLinux絶対パスを渡す。

既存環境だけでは実行できない。導入候補はUbuntu通常ユーザー向けのrootless Podmanとuidmap等の依存パッケージ。パッケージ導入には管理者権限と承認が必要で、Linux側のディスク・既定パッケージ設定が変わる。コンテナ保存先は通常ユーザーの`~/.local/share/containers`となる。sudo権限やdockerグループの追加、subuid/subgid・sysctl・ファイアウォールの変更、常駐デーモンの公開はこの案に含めない。追加変更が必要と分かった場合も無断で行わず、別途確認する。**導入は未実施・承認待ち。**

## 実測の状態

- ローカルでの公式コンテナ実行、PHP構文チェック、通常・条件分岐・特殊文字の実行テスト：**BLOCKED**。
- WSL Bashからネイティブランタイムを実行して生成HTMLを保存する手順の実測：**BLOCKED**。Windows PowerShellの`>`を使わず、PHPの`file_put_contents`でUTF-8バイトを書き出す設計は実装済みだが、検証済みとは呼ばない。
- PHP生成HTMLの実ブラウザ表示・操作スクリーンショット：**未実施**。Python版の画像をPHP版の証拠へ流用していない。以前拒否された`view-source:`は再試行していない。
- PHPの自動テストとCI：実装済み。CIも公式修正版のpullに失敗したらFAILで止まり、旧版へ切り替えない。CIで実行できてもT770iのローカル手順検証とは区別する。

## 再開条件

T770iのWSL Ubuntuで、管理者が準備済みまたは承認を得て導入したネイティブDocker Engine／rootless Podmanを通常ユーザーで利用でき、選定した修正版公式CLIタグが取得できること。Docker Desktopへ戻して代替しない。再開後は正解例と未完成スターター、stdoutとファイルのバイト一致・UTF-8、ブラウザ表示、実操作画面、コンテナ不在まで確かめて記録を更新する。それまではDraft PRの未完了項目として扱う。
