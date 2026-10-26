# wslc対応の検証記録（2026-10-25）

## 対象

既存PR #21の`codex/hht-python-templates-t770i`で作業。開始時のローカル・リモートheadはともに`c68fba3`、作業ツリーはcleanでした。repoのAGENTS.mdと講座設計を確認。workspace／親フォルダーの`.agents/skills`と個人スキル一覧を調べましたが、wslc/PHP固有の適用スキルはありませんでした。他の課題・未マージPR・利用者の変更を上書きしていません。

## 実機で読取確認した部分

[Microsoft現行手順](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-containers)はwslcがWSLに同梱され、最低WSL 2.9.3と説明しています。T770iでは次を確認しました。

- `wsl --version`：WSL 3.0.3.0、Linux kernel 6.18.54.1-1。
- `wslc version`：3.0.3.0。実体は`C:\Program Files\WSL\wslc.exe`。
- `wslc run --help`：`--network`、`--user`、`--mount`、`--workdir`、`--rm`あり。**`--cap-drop`・`--security-opt`なし**。
- container/image inspectとcontainer listのhelpも確認。wslcは`--format json`を示し、DockerのGo template文字列をそのまま使う前提を外しました。対象が存在しないcontainer inspectはJSON `[]`＋「見つかりません」のstderr・終了1でした。
- `verify_php_cli.py --runtime wslc --check-runtime`は不足する2項目を示してBLOCKED。pull・コンテナ起動へ進まないことを実測しました。[実機のreadiness JSON](../../../assets/wslc-readiness-20261025.json)を保存しています。

WSL更新・Podman／Docker Engine導入・権限追加・設定変更は行っていません。wslcの存在確認はできましたが、現在の安全条件でwslcのPHP実行が利用可能とは判定していません。

## 公式PHPイメージの配信確認

2026-10-21の空index／404という調査結果から状態が変わっています。2026-10-25 03:35 UTC、公式Registryの`docker.io/library/php:8.4.27-cli-bookworm`は以下を返しました。

- index digest：`sha256:496b5e02fe9fe44fcfb715023b931048111dc4e0bc719789d83c906be9f04b05`
- `linux/amd64` manifest：`sha256:a2d10c137d6ec9a41331e8e03e9d5468c85bfa8b1971436ffb2ad4f19d890e27`
- arm/v7、arm64/v8、386、ppc64leのLinux manifestも掲載。

[確認時刻付きのRegistry記録](../../../assets/php-image-20261025.json)を保存し、image.txtをタグ＋index digestで固定しました。キャッシュやlatestで代用しません。これは配信メタデータの確認であり、T770iでPHPバージョンを実行確認した結果ではありません。

## 模擬テストとCI実測を区別する

- ローカルのアダプター契約テストはCLIを模擬します。現行3.0.3の機能不足、将来十分な機能があると仮定した引数構築、Windowsパス・UTF-16診断とUTF-8本文の分離、拒否時の停止、cleanupの不確実な結果、学生コピーに正解例を重ねないことを検査します。
- 模擬wslcの「成功」は実機のマウント・成功時のinspect JSON・コンテナ実行の成功を意味しません。実機で不足オプションを外して試すことはしていません。
- Linux CIはネイティブDockerで、固定digest、実行PHP 8.4.27、実際のCapEff／CapBnd／NoNewPrivs／UID／ネットワーク、PHP29項目、開始データの拒否、stdoutと保存ファイルのUTF-8バイト一致、生成HTMLを検査します。最終コミットの実測結果はPRのCIを参照します。Linux CI成功をwslc実機成功と扱いません。

## 残る制約・再開条件

T770iのwslcでは、既存のcapability削除とno-new-privilegesを指定できません。これを省略する、rootで代用する、別ランタイムを勝手に導入する等の回避はしません。必要な機能を提供することが確認できた環境で、readiness→実効隔離→PHP実行→保存・ブラウザ表示→cleanupを順に再検証する必要があります。最低バージョン達成を理由に自動更新は行わず、更新で不足が解消すると断言もしません。

wslc実機でのPHP29項目、Windowsバインドマウント、UTF-8保存、成功時のJSON、通常・条件分岐・特殊文字のブラウザ画面、ターミナル／VS Codeの実操作スクリーンショットは未確認です。repo AGENTS.mdの操作画面要件は未完了として残しています。想像の画面やPython版画像をPHPの証拠へ流用しません。以前拒否されたview-sourceは再試行していません。

ローカルではコンテナ・Webサーバー・GUIアプリを起動していません。readinessのCLI読取プロセスは終了済みです。模擬テストのcleanup PASSは模擬応答の検査であり、実コンテナを片付けた証拠ではありません。CIでは固有名で起動したコンテナの実際の不在を確認します。
