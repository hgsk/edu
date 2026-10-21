# PHP CLI追加実習：確認済み事項とブロッカー

## 公式情報とバージョン選定

2026-10-21に[PHP公式告知](https://www.php.net/archive/2026.php)と[8.4.27のリリース告知](https://www.php.net/releases/8_4_27.php)を読み、緊急修正版8.4.27を最低条件として選んだ。採用予定タグは`php:8.4.27-cli-bookworm`。`latest`、8.4の可変タグ、8.4.26、RC版へフォールバックしない。

[Docker Official Image](https://hub.docker.com/_/php)と[公式タグ定義](https://github.com/docker-library/official-images/blob/master/library/php)を確認。確認時の定義には安定版8.4.26と8.4.27RC1が掲載され、修正版安定CLIは未掲載だった。レジストリの`docker manifest inspect docker.io/library/php:8.4.27-cli-bookworm`は`no such manifest`。Docker Hub APIの同タグは404だった。他の修正済み系列8.5.12／8.3.36／8.2.35の`-cli-bookworm`も404だった。

従って、選定タグの公開・pull・digest・実行PHPバージョンはまだ確認できていない。タグが取得できるまでこの実習は実行不可。公開後にpullし、`php --version`が修正版であることとRepoDigestを記録する。バージョン付きタグも再ビルドでdigestが変わり得るため、厳密な授業時点の再現には確認したdigestを併記する。

## T770iローカル環境

Docker Client `29.5.3-rd`（Rancher Desktop同梱）は存在する。`docker version`の既定エンドポイント`npipe:////./pipe/docker_engine`、登録済み`desktop-linux`の`npipe:////./pipe/dockerDesktopLinuxEngine`は、ともにパイプが存在せず接続失敗。Docker Serverバージョンは取得できなかった。Docker/Rancherの稼働プロセスと対応パイプも見つからなかった。

導入・起動、規約承諾、仮想化・OS・ネットワーク設定、永続コンテキスト変更、別環境への切替は行っていない。古いホストPHPを代用して実行済み扱いにしない。

## 実測の状態

- ローカルでの公式コンテナ実行、PHP構文チェック、通常・条件分岐・特殊文字の実行テスト：**BLOCKED**。
- PowerShellからコンテナを実行して生成HTMLを保存する手順の実測：**BLOCKED**。ホストの`>`を使わず、PHPの`file_put_contents`でUTF-8バイトを書き出す設計は実装済みだが、検証済みとは呼ばない。
- PHP生成HTMLの実ブラウザ表示・操作スクリーンショット：**未実施**。Python版の画像をPHP版の証拠へ流用していない。以前拒否された`view-source:`は再試行していない。
- PHPの自動テストとCI：実装済み。CIも公式修正版のpullに失敗したらFAILで止まり、旧版へ切り替えない。CIで実行できてもT770iのローカル手順検証とは区別する。

## 再開条件

学校管理者が許可した既存DockerのLinuxエンジンがT770iで利用可能になり、選定した修正版公式CLIタグがレジストリで取得できること。導入やOS設定変更が必要なら利用者の判断を得る。再開後は正解例と未完成スターターの検査、stdoutとファイルのバイト一致・UTF-8、ブラウザ表示、実操作画面、コンテナ不在まで確かめて記録を更新する。それまではDraft PRの未完了項目として扱う。
