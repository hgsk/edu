# URLのパスで画面を変え、エスケープを比較する

[DAY 11のパス・エスケープ実習](../../docs/legacy-workbook/day11.md#python-path-escaping)が、操作・考察・合格条件の正本です。Flaskフォーム課題の後に、HTTPルーティングとHTML出力を学びます。

- `starter/`：安全な通常アプリの開始データ。
- `tests/`：通常アプリと教育用比較の共通検査。
- `comparison/`：**独立した教育専用比較アプリ**。明示フラグなしでは起動しません。固定した無害HTML以外は拒否し、通常アプリ正解には含めません。
- `instructor/`：通常アプリの正解例と検証記録。

Cookie取得、JavaScript、外部送信、ファイル書換えは使いません。PHP CLIのHTML生成課題とは実行モデルが異なります。
