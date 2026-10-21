# PHP CLIコンテナで店舗案内を生成する

[DAY 11のPHP追加課題](../../docs/workbook/day-11.md#php-cli-template)が、依頼・用語・操作・提出・完成条件の正本です。Python/Jinja2と同じ店舗案内を、PHP自身の構文で生成して比較します。フォーム課題は別の選択実習として残します。

- `starter/`：本人の作業場所へコピーする開始データ。
- `tests/`：PHP CLIだけで動く確認スクリプト。別ライブラリ不要。
- `instructor/`：講師用正解例と検証記録。
- `image.txt`：採用予定の修正版CLIタグ。公開待ちで、実行確認済みを意味しません。

実行環境は**WSL2内のネイティブDocker Engine、またはrootless Podman**です。WSL自体はコンテナランタイムではなく、Docker Desktop／Rancher Desktopの連携CLIを前提にしません。

**2026-10-21の状態：実行検証はBLOCKED。** T770iの既存WSLではネイティブランタイムが見つからず、修正版4系列の公式CLI全24タグもレジストリ確認時に404でした。旧版・RC・`latest`へ置き換えて進めません。詳細は[検証記録](./instructor/verification-20261021.md)を参照してください。
