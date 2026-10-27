# Unity操作基礎講座

Unity Editorの操作から、2D・3D、スクリプト、入力、アニメーション、UI、エフェクト、実行ファイルの作成までを学ぶ36単元です。

**[実画面付き教材を開く](./index.html)** · **[学生ワークブックのUnity編](../hht/docs/workbook/unity.md#unity-course)**

学習内容・依頼・完成条件・提出物の正本は学生ワークブックです。講座の目的と範囲は[設計資料](./docs/course-design.md)、名称と技術資料は[参照資料](./references.md)、授業の進行は[講師向けメモ](./instructor.md)を使います。

## 教材プロジェクト

Unity Hubから `unity/project` を追加して開きます。Unity **6000.3.25f1** を使用します。初回はパッケージ取得とインポートに時間がかかります。`Assets/Scenes` に単元番号付きのシーンがあります。学習者は自分用のコピーで操作してください。

指定された11単元はScene、MonoBehaviour、2D、Input、Timeline、Animator、3D、uGUI、Gizmo、UI Elements／UI Toolkit、VFX Graphです。追加10単元は導入・Editor、GameObject／Transform、Prefab、物理、マテリアル、カメラ、ライティング、音、デバッグ、ビルドです。学習順はワークブックを参照します。

**教材を更新する人へ：** 本文はワークブックで編集し、`python unity/scripts/build_course.py` でWebGLのビルド、72シーンのブラウザ検査、閲覧用HTMLの再生成を一括実行します。`--check` は正本との一致、36単元の構造と画像参照、およびWebGLの入力・成果物ハッシュが最新かを確認します。実画面の撮影記録と検証範囲は[検証記録](./verification.md)を参照してください。

ブラウザの表示確認は `node unity/scripts/verify_browser.cjs` を使用します。Playwrightが必要です。既存インストールを利用する場合は `PLAYWRIGHT_MODULE` にモジュールの絶対パスを指定できます。画像とJSONの検証記録を `hht/assets/unity/` へ出力し、起動したChromiumを終了します。

`Assets/Editor/EduSetup.cs` は教材制作者が開始データを初期生成したコードです。生成済みのシーンがある場合は上書きを拒否します。通常の受講では再実行しません。撮影用の変更は保存済みシーンへ書き戻しません。

[単元別の開始・完成サンプル一覧](./samples.md)に72シーンをまとめています。Unity CLI単元を追加しました。GitHub Copilot Agent単元は保留中です。

## WebGL付き教材の更新

Windows上のPowerShell 7、Unity CLI、指定EditorのWeb Build Support、Python、Node.js、PlaywrightとChromiumが必要です。モジュール追加は `unity install-modules -e 6000.3.25f1 -m webgl`。ブラウザ検査には `npm install --prefix unity` と `npx --prefix unity playwright install chromium` を使えます。既存のPlaywrightは `PLAYWRIGHT_MODULE` で指定できます。

教材用Editorで保存して閉じ、`python unity/scripts/build_course.py` またはVS Codeの「Unity教材をWebGL付きで更新」を実行します。毎回実ビルドし、全72シーンの起動と入力・UIの操作をブラウザで検査します。成功したデータだけを `unity/webgl` に置きます。失敗時は旧掲載データを維持し、コマンドは終了コード1で停止します。ビルド中の教材変更も検出します。

「Unity教材の保存を監視してWebGL更新」タスクは保存をまとめて検出します。フォルダーを開いた時の自動タスク実行はVS Codeの許可設定に従います。手動で開始する場合は `pwsh -NoProfile -File unity/scripts/Update-Course.ps1 -Watch`、停止はCtrl+Cです。監視はこのタスクが動いている間だけ有効です。

`python unity/scripts/build_course.py --check` はUnityなしで古いビルドや欠落を拒否します。GitHubのQuality検証にも同じゲートを追加しています。CIでのUnityライセンス設定は不要です。教材を更新した人がWindowsでビルドして、`unity/webgl` と更新した教材を一緒に保存します。

WebGLはfile URLでは動きません。リポジトリのルートで `python -m http.server 8000 --bind 127.0.0.1` を実行し、`http://127.0.0.1:8000/unity/index.html` を開きます。終了はCtrl+Cです。ワークブックの各単元から開始・完成へリンクし、HTTP版の教材ではクリックしたプレイヤー1つだけを本文内に表示します。静的サイトへ配布する場合も `unity/webgl` を含む同じ階層を維持してください。今回の仕組みは外部サイトへの自動アップロードは行いません。

U19のVFX GraphはCompute Shaderが必要なためWebGL2では粒子を表示しません。代替エフェクトに置き換えず、Editor確認が必要な旨を実行画面に表示します。U17のGizmoもEditor専用です。Editorのパネル操作、ビルド、CLIはブラウザから実行できません。

U18には、体力・弾薬・目標・ホットバーから設定・所持品・確認・読込まで、14種類を操作できる[HUD・UIギャラリー](index.html#unity-18)があります。U16のuGUIとの比較にも使えます。
