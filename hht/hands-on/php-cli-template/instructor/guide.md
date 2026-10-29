# PHP CLI・wslc実習 進行と検証

課題条件は[DAY 11の正本](../../../docs/legacy-workbook/day11.md#php-cli-template)を参照します。ユーザー指定のWSL Containers（wslc.exe）を標準とし、Podman導入やUbuntu内のDocker Engine準備は求めません。WSLは基盤、wslcは同梱コンテナCLIです。[Microsoft公式手順](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-containers)はWSL 2.9.3以上を要件にしています。

## 学生の作業と正解例を分ける

`starter/`を本人の`php-template-work`へコピーします。学生は`run_php_cli.py --source <本人のコピー> --action version|hello|build|stdout|check`を使います。このランチャーは正解例を読み込まず、checkでは本人の必要な5ファイルだけを一時コピーして検査します。ドライブ・ホーム・リポジトリ全体をマウント元にはしません。

`instructor/solution/`は講師用です。`verify_php_cli.py`が別の一時コピーへstarterと正解例を重ね、通常・条件分岐・特殊文字・29チェックと開始データの不合格を検証します。学生へこの正解検証コマンドを実習結果の確認として使わせません。

## 起動前と実行中の安全条件

Windowsでの読取確認：

```powershell
python hht/scripts/verify_php_cli.py --runtime wslc --check-runtime
```

実行する場合は`--check-runtime`を外します。wslcとWSLのバージョン、runのhelpで必要な指定を確認し、ネットワークnone、非rootユーザー、作業コピーだけのマウントを保持します。2026-10-26の明示指示に従い、wslcでは全capability削除とno-new-privilegesの2指定を省きます。この2指定だけがないことを理由に停止しません。`--privileged`やOS・VPN・ファイアウォール・アカウント権限・wslc設定の変更は加えません。

起動可能なバックエンドでは、固定imageのRepoDigests・実行PHP 8.4.27に加え、Linuxの`/proc/self/status`で非root UIDとインターフェースがloのみであることを照合し、CapEff・CapBnd・NoNewPrivsも実測記録します。T770iではCapEff=0、CapBnd=00000000a80425fb、NoNewPrivs=0でした。将来の権限取得を禁止したとは説明しません。Linux Docker CIだけは従来どおり2指定を加え、CapEff=0・CapBnd=0・NoNewPrivs=1も要求します。stdoutは生バイトで比較し、WindowsのCLI診断のUTF-16処理と混同しません。

各コンテナに固有名を付け、終了後の不在を確認します。残存時は対象名だけをstop→必要ならremoveします。接続拒否・不明なJSON形式はcleanup失敗として扱い、不在のPASSにしません。wslc 3.0.3の実測では一覧はJSON-linesで、正常終了かつ0行の空応答が不在を表します。inspect失敗とは区別します。pruneや他人のコンテナ削除はしません。

## 検証の意味を区別する

```text
python -m unittest discover -s hht/scripts -p test_php_container_runtime.py -v
```

これはCLIを模擬した契約テストです。現行wslcの引数・Windowsパス・JSON・バイト処理、非root・ネットワーク指定がない場合の停止、アクセス拒否時の停止、学生コピーと正解例の分離、cleanupを検査します。wslcによるコンテナ実行の実測ではありません。

Linux CIは明示的に`python hht/scripts/verify_php_cli.py --runtime docker`を使います。既存のネイティブLinux Docker EngineでPHPと生成HTMLを実測する比較バックエンドであり、Windowsの授業手順の代用にはしません。CIは検証JSONと生成HTMLをArtifactへ保存します。

実機の状態・digest・制約・スクリーンショットの未確認範囲は[2026-10-26検証記録](./verification-20261026.md)にまとめます。省く権限縮小は明記した2指定だけです。自動更新・導入・代替ランタイムへの切替は用意しません。
