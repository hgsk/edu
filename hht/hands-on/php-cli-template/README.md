# PHP CLIコンテナで店舗案内を生成する

[DAY 11のPHP追加課題](../../docs/workbook/day11.md#php-cli-template)が、依頼・用語・操作・完成条件の正本です。Python/Jinja2と同じ店舗案内を、PHP自身の構文で生成して比較します。フォーム課題は別の選択実習として残します。

- `starter/`：本人の作業場所へコピーする開始データ。
- `tests/`：PHP CLIだけで動く確認スクリプト。別ライブラリ不要。
- `instructor/`：講師用正解例と検証記録。
- `image.txt`：修正版公式CLIのタグ＋index digest。2026-10-25にamd64配信を確認し、2026-10-26にwslcでPHP 8.4.27を実行しました。

学生の実行環境はMicrosoftの**WSL Containers（wslc.exe）**です。WSL 2.9.3以上に同梱され、PodmanやDocker Engineを別途導入する手順はありません。操作はWindows PowerShellから配布済みの安全確認ランチャーを使います。

**2026-10-26の状態：T770iのwslc 3.0.3で実行・保存・UTF-8・29項目を実測しました。** 明示された実習方針に従い`--cap-drop`・`--security-opt`は必須にせず、非root・ネットワークなし・限定マウントを維持します。省く保護と実測値は[今回の検証記録](./instructor/verification-20261026.md)を参照してください。[2026-10-25](./instructor/verification-20261025.md)・[2026-10-21](./instructor/verification-20261021.md)の記録は当時の履歴です。

- 学生本人のコピーだけを実行：`python hht/scripts/run_php_cli.py --source php-template-work --action build`
- 講師用正解例の検査：`python hht/scripts/verify_php_cli.py --runtime wslc`
- Linux CIの比較検証：同じ検査の`--runtime docker`。これをwslc実機の成功と扱いません。
