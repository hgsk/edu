# 撮影・検証記録

## U36：当たり判定（2026年10月18日）

36単元・開始36／完成36の72シーンです。予定のイベント・時間と非同期処理をU38へまとめ、制作予定14単元と合わせて全50単元を維持します。依頼・操作・完成条件の正本は[U36](../hht/docs/workbook/unity.md#unity-36)です。

- **PASS：実シーンと撮影。** 動的な球A、通過センサーG、壁W、床Fを配置し、専用Layerを設定。開始の壁はTrigger、完成は通常のColliderです。Inspector、Trigger通過、衝突停止、Layerによる衝突除外、Raycastの検索条件を実際のEditorで操作し、5枚を撮影しました。日本語UIと番号・形・凡例を併用しています。[構成検査](evidence/36-collision.json)・[実操作の記録](evidence/36-native-actions.json)。
- **PASS：実WebGL。** 72シーンの起動と既存操作に加え、Gの入場・退場各1回、Wとの衝突開始1回、X約1.35mでの停止を確認。Triggerの壁とLayerによる衝突除外では通過します。衝突除外中もRaycastはWを検出し、マスクとTrigger条件によりW／G／該当なしを区別しました。[実行記録](../hht/assets/unity/webgl-verification.json)。
- **PASS：復元と表示の修正。** 初回のブラウザ検査でシーン終了後の衝突設定の復元漏れを検出し、旧掲載を維持しました。参照先のオブジェクトの破棄順に依存せず、保存したLayer番号で元の設定へ戻すよう修正。別シーンへ移った後の復元と再入場を再検査しました。説明パネルが模型を隠さないカメラへ変更し、画像を撮り直して横長の実WebGL画面も確認。文字欠け警告は0件です。
- **PASS：配布と掲載。** 生成処理の再実行で開始・完成シーンのSHA-256が変わらないことを確認。全72シーン・227個の識別対象で、色の重複なし、Material値の床とのコントラスト3:1以上。Python検査10件、正本HTML、教材入力・WebGL成果物ハッシュ、本文157画像のデコードとalt、390／1440px表示、ローカル参照289件の欠落0、meta欠落0を確認しました。数学28単元の生成内容も一致しています。[配色](evidence/object-palette.json)・[配布検査](../hht/assets/unity/sample-delivery-checks.json)・[撮影一覧](../hht/assets/unity/screenshot-manifest.json)。
- **PASS：ワークブックと終了。** U24→U06→U31→U32→U33→U34→U18→U35→U36を連続起動し、Quit完了8回、iframe1個、U36の実際の衝突とセンサー通知を確認。撮影用Editor、検証用ChromiumとHTTPサーバーを終了し、制御ファイルを削除しました。利用者の既存VS CodeとChromeは維持しています。[終了記録](evidence/36-cleanup.json)。
- **NOT RUN：対象外・追加環境。** 2D専用の実装・シーンはU41の予定範囲です。3DとのAPIの違いは本文で説明しています。全教室PC・別OS・別ブラウザでの実行は未実施です。

## 日本語UI・TMPフォント（2026年10月18日）

- **PASS：フォント。** 公式Noto Sans JP RegularとOFL 1.1を同梱。uGUIの旧TextをTextMeshProUGUIへ移行し、TMP Settingsの既定フォントを設定しました。UI Toolkitには同じ元フォントから作成したTextCoreフォントとPanelTextSettingsを設定。Dynamic SDF・元フォント同梱・791文字の事前収録を確認しました。[設定記録](evidence/japanese-fonts.json)・[出所と設定](project/Assets/Fonts/README.md)。
- **PASS：表示と操作。** 35単元・開始35／完成35の70シーンに日本語設定を適用。見出し、説明、ボタン、状態、凡例、独自Inspector、生成ウィンドウと教材メニューを日本語化しました。Unity標準の部品名・API・アセット名は正式名を維持します。uGUI／UI Toolkitの実クリック、14種類のHUD・UI、ゲームループ・保存、依存管理、物理、通路、IK、サウンド、地形のブラウザ検査が通り、文字欠け警告は0件です。[実行記録](../hht/assets/unity/webgl-verification.json)。
- **PASS：撮影。** 現在のEditor・Windows Player・WebGLで実画面を撮影し、本文152画像の参照とデコード、altを検査。ブラウザ撮影の一部はナビゲーションを除いた実キャンバスだけを掲載し、UIの画素は加工していません。Undoの写真は復元先の開始設定例として示します。[撮影一覧](../hht/assets/unity/screenshot-manifest.json)・[WebGL画像の元ファイルと切り抜き範囲](evidence/japanese-capture-provenance.json)。
- **PASS：ビルドと掲載。** Windows単独ビルドはSucceeded・エラー0。WebGLを実ビルドし、教材入力と成果物ハッシュ、正本HTMLの一致を確認。ワークブックでU24→U06→U31→U32→U33→U34→U18→U35を連続起動し、Quit完了7回とiframe1個を確認しました。VFX Graphの粒子は従来どおりEditor専用です。[Windows記録](evidence/japanese-windows-build.json)。
- **PASS：資料と終了。** Python検査10件、390／1440pxの表示、ローカル参照278件の欠落0、meta欠落0。数学28単元の生成内容も正本と一致。撮影用Editor・Player、検証用ChromiumとHTTPサーバーを終了し、撮影制御ファイルを削除しました。利用者の既存VS CodeとChromeは維持しています。[配布検査](../hht/assets/unity/sample-delivery-checks.json)・[終了記録](evidence/japanese-cleanup.json)。
- **NOT RUN：追加環境。** 任意の入力文字・絵文字、別OS・別ブラウザ・教室PC全台での確認。元フォントにない文字はDynamicでも追加できません。Copilot単元は引き続き保留です。

## U35：市街・Terrainのプロシージャル生成（2026年10月18日）

作成済みは35単元・開始35／完成35の70シーンです。アセット・2D制作の予定をU41へまとめ、制作予定15単元と合わせて全50単元を維持します。依頼・手順・完成条件の正本は[U35](../hht/docs/workbook/unity.md#unity-35)です。

- **PASS：生成と実画面。** UI Toolkit製EditorWindowでSeed、街区数、道路幅、建物高、地形の起伏を変更し、実際のTerrainData.SetHeightsと道路・建物の生成を確認しました。開始・ウィンドウ・生成後・Undo・Terrain設定・斜め表示・真上表示の7枚を撮影。U22／U28のCLI写真も35シーンの結果へ更新し、本文画像は149枚です。[構成記録](evidence/35-procedural-map.json)・[操作記録](evidence/35-native-actions.json)・[撮影一覧](../hht/assets/unity/screenshot-manifest.json)。
- **PASS：再生成・Undo・保存。** CLIの18検査で、同設定の再現、出力の非増殖、入力範囲・非有限値の拒否、所有していない子・領域外へ移動した生成物・外部TerrainCollider・共有TerrainDataの拒否、個人物体の保持、Undo／Redo、保存後の再読込を確認しました。Recipeの識別値をUndo登録より前に確定するよう修正し、Redoでも設定・実際の配置・地形・識別値が一致することを検査しています。[検査記録](evidence/35-procedural-tests.json)。
- **PASS：独立レビュー。** 読み取り専用の2回のレビューで、所有範囲外の生成物、対話中シーンの置換、共有データ参照、生成時の資産新規作成に関する指摘を解消。通常のGenerateは既存の専用TerrainDataだけを変更し、資産の新規作成はCLI専用セットアップへ分離しています。[レビュー記録](evidence/35-independent-review.json)。CLIセットアップの異常終了では新規教材資産が残る場合があり、既存資産を上書きして復旧する実装にはしていません。
- **PASS：実WebGL。** TerrainとTerrain Physicsの標準モジュールを有効にして実ビルド。70シーンと既存操作を検査し、U35の開始4棟・道路2本、完成9棟・道路4本、識別値CA9467BB／C398198B、地形の高さ約0.120〜3.433m、TerrainColliderへのRaycast、視点・凡例・図中番号の切替が通りました。完成の図中番号は13個です。U18の開閉検査は定期報告の更新を待つよう補強し、全件を再実行しました。[実行記録](../hht/assets/unity/webgl-verification.json)。
- **PASS：ワークブック内の実行。** U24→U06→U31→U32→U33→U34→U18→U35を連続起動し、Quit完了7回とiframeが1個であることを確認。U35の真上表示とTerrainColliderへのRaycastを検査し、[埋め込み画面](../hht/assets/unity/35-webgl-workbook.png)を目視しました。
- **PASS：表示と配布。** Pythonの生成検査10件、正本HTMLと入力・成果物ハッシュの一致、149画像の実デコード、教材390／1440px表示、ローカル参照402件・欠落0、meta欠落0。70シーン・219個の物体識別用配色検査が通りました。U35の白黒・deuteranopia・protanopiaを撮影・目視し、建物・道路・Terrainの形、図中番号、凡例を確認しました。
- **NOT RUN／範囲外：** Safari・実機スマートフォン、NavMesh、交通、建物内部、樹木・草、異なるUnity版での生成一致は未検証です。WebGLは保存済み結果の観察用で、EditorWindow・生成・Undo・資産保存はUnity Editorで行います。
- **PASS：終了。** 撮影用Editor2プロセス、ログ撮影用VS Codeウィンドウ、検証用ブラウザとHTTPサーバーを終了。記録したPIDの不在とheadlessプロセスの残存0を確認しました。[終了記録](../hht/assets/unity/procedural-cleanup.json)。

## U18：HUD・UIパターンギャラリー（2026年10月18日）

既存U18へ14パターンを追加し、U16から比較用に参照します。34単元・開始34／完成34の68シーンを維持しています。依頼・手順・完成条件の正本は[U18](../hht/docs/workbook/unity.md#unity-18)です。

- **PASS：実装と実画面。** U18の開始・完成に同じギャラリーを配置。体力、弾薬、目標・模式マップ、ホットバー、タイトル、ポーズ、設定、所持品、会話、クエスト、確認、リザルト、読込・エラー、通知・ヘルプの14例を切り替えられます。各例14枚と確認ダイアログ1枚をUnity Editorで撮影し、U18の開始・完成・Playも更新しました。本文画像は142枚、ローカル参照391件・欠落0、meta欠落0。[構成](evidence/18-ui-gallery.json)・[撮影操作](evidence/18-gallery-native-actions.json)・[撮影一覧](../hht/assets/unity/screenshot-manifest.json)。
- **PASS：実WebGL。** 再ビルド後に68シーンを起動し、14例すべての表示・実クリック・状態変化を検査。HPとProgressBar、装填数、目標、スロット選択、無効Continue、設定の編集中／適用済み、所持品の空状態、会話、完了タブ、確認1回、再試行、通知解除を確認しました。クリック後の検査は定期報告の更新を待ちます。[実行記録](../hht/assets/unity/webgl-verification.json)。
- **PASS：キャンセルとフォーカス。** ネイティブ画面でCancelの初期フォーカスとEsc後の戻り先を確認。WebGLでは背景クリック後にUIフォーカスが外れてもEscを受け取れるよう、Input Systemでギャラリー全体のEscを処理します。背景の入力遮断、キャンセル時の件数保持、開いたボタンへのフォーカス復帰が通りました。
- **PASS：教材内の実行。** U24→U06→U31→U32→U33→U34→U18をワークブック内で連続起動。切替前のQuit完了6回、iframeが常に1個、U18のギャラリーを開いてHPを75へ変更できることを検査し、[埋め込み画面](../hht/assets/unity/18-webgl-workbook.png)を目視しました。
- **PASS：資料と表示。** 生成処理10テスト、正本HTMLと入力・成果物ハッシュの一致、142画像のデコード、U18へのナビゲーションと教材390／1440px表示を確認。WebGLは390px幅でPrevious／Nextと閉じる操作を検査しました。HUDの白黒・deuteranopia・protanopiaを撮影・目視し、名称・数値・バーを確認。全68シーンの物体識別用配色検査も通っています。
- **対象範囲：** ポーズ・音量・Fullscreen・セーブ件数・読込はUI内部のサンプル状態です。実際のゲーム停止、設定の永続化、通信、ファイル削除を実装済みとは扱いません。ホットバーのクールダウン・ロックは固定表示です。実機スマートフォン・Safariでの操作はNOT RUNです。
- **PASS：終了。** 撮影用Editor、検証用Chromium、HTTPサーバーを終了。[終了記録](../hht/assets/unity/gallery-cleanup.json)。利用者のアプリは維持しています。

## U33・U34：サウンドとフォーリー（2026年10月18日）

実施済みは34単元、開始34・完成34の68シーンです。制作予定16単元と合わせて全50単元を維持し、Audio MixerをU33へ、性能計測と自動テストをU45へまとめています。条件の正本は[U33](../hht/docs/workbook/unity.md#unity-33)・[U34](../hht/docs/workbook/unity.md#unity-34)です。

- **PASS：構成と音源。** 追加4シーンのClip・グループ・Controller・左右の足の参照、各シーンのAudioListener 1個、Mixer 3グループと公開音量2個、Animation Event合計4個を検査しました。[構成記録](evidence/33-34-audio.json)。足音6ファイルはKenney Impact SoundsのCC0音源で、ライセンス原文と出所・SHA-256を保存。合成旋律と距離比較用の合成音を加えた8ファイルの照合も通っています。[出所記録](project/Assets/LessonSamples/AudioPractice/sources.json)。マイク収録を行ったとは扱いません。
- **PASS：実画面。** AudioSourceの開始設定、Audio Mixerと公開音量、3D音の再生、フォーリーの開始設定・カーブとイベント・接地・木の床の7枚を撮影しました。U22／U28のCLI結果画像を34シーンの出力へ更新し、本文の画像は127枚です。[撮影一覧](../hht/assets/unity/screenshot-manifest.json)。
- **PASS：実WebGLとPCM。** 最終版を実ビルドし、68シーンをChromiumで起動。Web Audioの出力経路をAnalyserNodeで測定し、2D音の遠／近RMS比は1.019、3D音は0.224、Master消音時は0。Musicの公開音量−12dB、UI cueの非ゼロ出力、停止後の無音も確認しました。Unityによるノードの再接続にメーターが追従するよう検査を修正しています。[実行記録](../hht/assets/unity/webgl-verification.json)。
- **PASS：接地と操作。** 不一致例のイベント時の高さは0.187065m、完成例は0.000154m。足音のPCM出力、コンクリート／木、速度1／1.6、停止後のstep数と無音、U33のMaster消音を残してU34へ入る場合の初期化が通りました。高さは足のローカル座標を基準にした計測で、地面の自動判定ではありません。
- **PASS：ワークブック内の実行。** HTTPでU24→U06→U31→U32→U33→U34を連続して開き、各実行と1個のiframeを確認しました。切替前のQuit完了5回も検査。新単元のリンクは既存と同じindex.html付きのURLへ修正しています。終了失敗・5秒のタイムアウト・連続クリックからの復帰も別のブラウザー検査で通っています。埋め込みの[サウンド画面](../hht/assets/unity/33-webgl-workbook.png)・[フォーリー画面](../hht/assets/unity/34-webgl-workbook.png)を目視確認しました。
- **PASS：配色と資料。** 68シーン・196個の識別対象に、色の重複なし、Material値の床とのコントラスト3:1以上を確認しました。[配色記録](evidence/object-palette.json)。U33／U34の白黒・deuteranopia・protanopiaを撮影・目視し、物体・床・凡例と文字を確認しています。Python 10検査、既存HTML講座、数学28単元、ローカル参照366件・欠落0、meta欠落0、本文127画像のデコード、390／1440px表示が通っています。入力・成果物ハッシュと正本HTMLの一致もPASSです。
- **NOT RUN：主観的な聴感と別端末。** 実スピーカー／ヘッドホンを通した聴きやすさ、Safari・スマートフォンでの発音、マイク録音は未実施です。Unity 6.3 WebGLのMixerは音量制御の範囲だけを扱い、残響などの非対応エフェクトを実装済みとは扱いません。
- **PASS：終了。** 撮影用Editor、ログ表示用VS Code、検証用ChromiumとHTTPサーバーを終了。記録したPIDの不在と、利用者の既存VS Codeウィンドウ保持を確認しました。[終了記録](../hht/assets/unity/audio-cleanup.json)。

## U32：VRoid・VRMのボーン、メッシュ、アニメーションとIK（2026年10月18日）

実施済みは32単元、開始32・完成32の64シーンです。制作予定18単元と合わせて全50単元を維持し、TerrainをU40の環境描画へまとめています。条件の正本は[U32](../hht/docs/workbook/unity.md#unity-32)です。

- **PASS：モデルと導入。** 導入済みVRoid Studio 2.7.0の新規男性ベースからCourseAvatarを作成し、`.vroid`原本とVRM 1.0を書き出しました。個人の既存モデルは使っていません。Unity内のVRMと書き出し原本のSHA-256一致、VRM1メタデータ、作者Unity Course、利用・改変・再配布条件を確認しました。[モデル記録](evidence/32-model-source.json)、[原本の案内](source-models/README.md)。UniVRMのglTF／VRM-1.0はv0.131.3のUPM Git参照で固定し、packages-lockも保存しています。
- **PASS：シーン構成。** 2シーンのAvatarがValidかつHumanoid、ControllerのIK Pass有効、Target・UIDocument・補助球の参照、開始の重み0／完成の重み1を検査しました。合計4個のSkinned Mesh Renderer、316本のボーン参照、Mesh・bindposesを確認。Clipにはモデルの中立姿勢を残し、体の基準位置・向きと、演習用の左肘・左右上腕のカーブを設定しました。[構成記録](evidence/32-vrm.json)。
- **PASS：実操作と撮影。** 標準OnAnimatorIKで右手がTへ到達し、目標を移動しても距離は0.001m未満。重み0では約0.529mに離れました。補助球の非表示、Clip時刻0／0.5で左手の高さが約0.214m変わることも確認しています。[操作記録](evidence/32-native-actions.json)。VRoid編集・書き出し・条件、Unity開始・Skinned Mesh Renderer、IK・目標移動・FK・補助球非表示の実画面9枚を追加し、U22／U28の検査画像も32シーンへ更新しました。本文の画像は120枚です。
- **PASS：WebGLと掲載。** 実ビルド後に64シーンを起動。U32は開始の距離約0.315mから、IK有効で約0.0000003mとなること、移動先への追従、補助球切替、2つのClip時刻と左手位置の変化、再生再開、完成の重み1を実クリックで検査しました。既存の入力・UI・ゲームループ・保存読込・依存停止・物理・通路・キット切替の検査も通っています。[実行記録](../hht/assets/unity/webgl-verification.json)。本文からU24／U06／U31／U32を起動し、iframeが1つであることと、U32の全身・操作・凡例が見えることを確認しました。[埋め込み画面](../hht/assets/unity/32-webgl-workbook.png)。ビルド中に教材案内の番号を修正した初回は入力変更検知で掲載を停止し、確定後の再ビルドで入力・成果物ハッシュ一致を確認しています。
- **PASS：表示と資料。** Python 10検査、既存HTML講座の検査、数学28単元の生成一致、対象資料のローカル参照347件・欠落0、meta欠落0。本文390／1440px表示と画像120枚の実デコードも確認しました。[表示検査](../hht/assets/unity/browser-verification.json)、[配布検査](../hht/assets/unity/sample-delivery-checks.json)。64シーン・識別対象178個の色重複なし、床とのMaterial値コントラスト最低3。U32のグレースケール／deuteranopia／protanopiaはブラウザーの色覚特性シミュレーションで撮影・目視し、暗い背景に対する輪郭、番号と名前の凡例を確認しています。[グレースケール](../hht/assets/unity/32-vision-achromatopsia.png)。
- **範囲：** この演習のシーンではFace／Bodyを識別用URP Unlit材質へ変更しています。VRM原本の外見は保持しています。Vrm10Instanceは無効にしてAnimatorと標準Humanoid IKを検証し、VRMの表情・視線・Spring Bone・Constraintの更新、MToonの再現性、Animation Riggingの実装は扱っていません。Animation Riggingは追加パッケージという位置づけを本文で説明しています。Copilot Agentは引き続き保留です。
- **PASS：終了確認。** 撮影用VRoid、Unity Editor3回分、VS Codeのログ表示3窓、WebGL検査と教材表示のChromium、HTTPサーバーを終了しました。元から開いていた利用者のVS Codeと他アプリは保持しています。[終了記録](../hht/assets/unity/vrm-cleanup.json)。

## U30・U31：グレイボックスとキットバッシュ（2026年10月18日）

実施済みは31単元、開始31・完成31の62シーンです。レンダリングの発展内容をU40へまとめ、残る19単元と合わせて全50単元を維持しています。条件の正本は[U30](../hht/docs/workbook/unity.md#unity-30)と[U31](../hht/docs/workbook/unity.md#unity-31)です。

- **PASS：空間と部品の保存済みデータ。** 直径0.9mのCharacterControllerに対し、開始の開口0.2m・完成の開口2mを検査。4シーンの参照・基礎壁のColliderと表示、門のPrefab接続を検査しました。門は3種類の元Prefabを4インスタンスとしてネストし、外観メッシュ4個・外観側Collider 0を確認しています。素材は教材用の標準プリミティブから作成し、外部素材は導入していません。[構成記録](evidence/30-31-spatial.json)、[部品メモ](spatial-kit-notes.md)。
- **PASS：実操作と撮影。** 狭い開口ではZ約−0.95でBLOCKED、広げた開口ではZ=3.6でGOALを確認。門の外観ON／OFFの両方でもGOALへ到達しました。[操作記録](evidence/30-31-native-actions.json)。開始Editor・停止Play・完成GOAL、組立前Editor・Prefab階層とInspector・外観ONのPlay・OFFのGOALの7枚を追加。U22／U28のCLI検査画像を31シーンの出力へ更新し、本文の画像は111枚です。
- **PASS：WebGL。** 本文・画像・コードを確定した後、実ビルドして62シーンをブラウザーで起動。追加単元では中央前進の停止／通過、Reset、開始にキットがない場合の表示、外観4部品の表示切替と両状態の通過を実クリックで検査しました。既存の入力・UI・保存読込・U28依存停止・U29物理操作も通っています。[実行記録](../hht/assets/unity/webgl-verification.json)。本文からU24／U06／U31へ切り替え、iframeが1つであることを検査し、門・操作・出口が見える埋め込み画面を目視確認しました。入力と成果物のハッシュ一致はPASSです。
- **PASS：表示と静的検査。** Python 10検査、既存HTML講座の検査、数学28単元の生成一致、392個のローカル参照先、Assetsのmeta欠落0。本文390／1440px表示、画像111枚の実デコードを確認しました。物体の色はシーン内で重複せず、床とのMaterial値のコントラストは最低3。62シーン・識別対象164個の検査も通っています。U31のグレースケール・2種類の色覚特性シミュレーションを撮影・目視し、番号・名前の凡例も確認しています。
- **範囲：** 平面内の小さな通路と装飾の演習です。重力・ジャンプ・AI経路探索、外部アセットの導入・購入は行っていません。小さなEditorのGame画面ではUIと凡例が重なるため、本文にMaximize操作を記載しました。撮影と通過確認は見渡せる表示サイズで行っています。
- **PASS：終了確認。** 撮影用Editor 33944／68552、VS Codeのログ表示2窓、検証用ChromiumとHTTPサーバーを終了しました。利用者が元から開いていたアプリは保持しています。[終了記録](../hht/assets/unity/spatial-cleanup.json)。

## U29：物理演算で作るローコード・サンドボックス（2026年10月18日）

実施済みは29単元、開始29・完成29の58シーンです。2D制作と2D物理の予定をU30へまとめ、残る21単元と合わせて全50単元を維持しています。条件の正本は[学生ワークブックのU29](../hht/docs/workbook/unity.md#unity-29)です。

- **PASS：サンプル構成。** 球・坂・積み木3個、5部品のPrefab、色分けした表示Materialと摩擦・反発用Physics Materialを収録。開始は水平、完成は15度の坂です。球1個・積み木3個を配布スクリプトで制御し、受講者は主にInspectorで配置・質量・摩擦・反発を調整します。4 Rigidbodyの重力・初期Kinematic・Colliderと参照を検査し、既存を含めMissing Scriptは0でした。
- **PASS：実画面。** 開始Editor、完成PlayのDrop前、物理演算による積み木の移動、Physics MaterialのInspectorの4枚を撮影。球をDropして積み木3個が動くこと、Resetで配置と静止状態へ戻ることを確認しました。[操作記録](evidence/29-native-actions.json)、[カメラ調整後の再確認](evidence/29-camera-verification.json)。U22のCLI画像とU28の依存検査画像も29シーンの出力へ更新しました。本文の実画面は104枚です。
- **PASS：WebGL最終版。** 初回候補の本文埋め込みで操作パネルが球の上部に重なることを目視で発見し、カメラの向きを調整。実画面2枚を撮り直して再ビルドしました。最終版の58シーンを起動し、U29の落下・衝突で積み木3個が動くこと、Reset後の位置と速度、Dropの連打で球が増えないこと、実際の傾斜30度・反発係数0.8への切替、実行中の設定変更拒否を確認しました。既存の入力・UI・U24保存読込・U28停止復元も通っています。[実行記録](../hht/assets/unity/webgl-verification.json)。本文からU24／U06／U29を開き、iframeが1つであることと、U29の球全体がパネルの下に見えることを確認しました。入力と成果物のハッシュ一致はPASSです。
- **PASS：表示・静的検査。** Pythonの10検査、既存HTML講座の検査、数学28単元の生成一致、366個の相対リンクとAssetsのmeta欠落0。最終の画像104枚の実デコードと本文390／1440px表示を確認しました。U29の全色覚・2種類の色覚特性シミュレーションを撮影し、色の違いに加え明るさと名前の凡例で部品を区別できるか目視確認しました。シミュレーションは全ての利用者の見え方を保証するものではありません。
- **範囲：** 物理演算の結果を固定軌道・一定個数の得点として保証しません。操作対象は球1個・積み木3個の小さなサンドボックスです。部品数や勝敗の拡張は別途配列・検査・判定を見直します。今回の教材は外部公開していません。
- **PASS：終了確認。** 所有する撮影用Editor 60904／41052、VS Codeのログ表示2窓、検証用ChromiumとHTTPサーバーを終了しました。2回目のEditorは最初の15秒待機後にも終了処理中でしたが、PID消失を確認してからビルドを再開しています。既存の利用者のアプリは保持しました。[終了記録](../hht/assets/unity/sandbox-cleanup.json)。

## U28：コンポーネントの依存管理と設定漏れの防止（2026年10月18日）

実施済みは28単元、開始28・完成28の56シーンです。残る22単元と合わせて全50単元を維持し、CopilotはU50で保留しています。条件の正本は[学生ワークブックのU28](../hht/docs/workbook/unity.md#unity-28)です。

- **PASS：依存管理の17検査。** 必須動作スクリプトの欠落、RequireComponentによるRigidbody／BoxCollider追加、重複禁止属性、未設定・自分自身・破棄後の参照、無効なActor／Collider／Driver／UIDocument、Rigidbodyの設定、OnValidateの速度補正、シーン契約との不一致、契約自体の欠落、Prefab複製間の内部参照を検査しました。完成側の不備は実ビルドと同じValidateSceneで拒否します。[機械記録](evidence/28-dependency-tests.json)。DisallowMultipleComponentの検査は属性宣言の確認です。
- **PASS：実画面。** InspectorのNoneと診断、開始PlayのBLOCKED、完成PlayのREADY、完成28シーンのCLI検査結果を実際のUnity／VS Codeで撮影。参照をRestore Dで戻し、Clear referenceで外して停止する操作も確認しました。[操作記録](evidence/28-native-actions.json)。完成シーンの初期化順により移動先を誤って無効扱いした問題を実行で発見し、設定されたenabledとactiveInHierarchyの確認に修正して再実行しています。U22のCLI画像も28／28へ更新しました。本文の実画面は100枚です。
- **PASS：静的検査。** Pythonの10検査、既存HTML講座の検査、数学28単元の生成一致、351個の相対リンク、Assetsのmeta欠落0。閲覧用HTMLの390／1440px表示と画像100枚の実デコードを確認しました。
- **PASS：WebGL。** 本文・画像・コードを確定した後に実ビルドし、56シーンをブラウザーで起動。U28では開始の停止、実クリックによる復元後の移動、参照解除後700msの移動停止、再復元、完成のD参照を確認しました。従来の入力・uGUI／UI Toolkit・U24の保持／重複保存防止／Unity再起動後の保存読込も通っています。[実行記録](../hht/assets/unity/webgl-verification.json)。本文からU24／U06／U28へ切り替えてiframeが1つであることを確認し、U28の埋め込み画面も目視確認しました。入力・成果物ハッシュの一致はPASSです。
- **範囲：** U28の型・値・参照を明示した契約であり、全てのSerializeFieldを必須と見なす汎用検査ではありません。学習用開始シーンのDestination未設定だけをビルド時に許可します。他の方式・サービスの未実施範囲は下の既存記録を参照してください。
- **PASS：終了確認。** 所有する撮影用Editor、VS Codeのログ表示2窓、検証用ChromiumとHTTPサーバーを終了しました。既存の利用者のアプリは保持しています。[終了記録](../hht/assets/unity/dependency-cleanup.json)。

## U25〜U27：バージョン管理・データ共有・複数人開発（2026年10月18日）

実施済みは27単元、開始27・完成27の54シーンです。残る23単元を整理して全50単元に収め、CopilotはU50で保留しています。条件の正本は学生ワークブックです。

- **PASS：GitとLFS。** ローカルbare共有先とAlice／Bobの2作業コピーで、同じ実SOの4／5の競合を再現。合意した5へ解決し、両者の記録・metaのSHA-256・LFSの実データを新しいcloneで照合しました。解決済みへの再実行、演習外パスを拒否する失敗系も確認。[機械記録](evidence/25-27-collaboration.json)。外部へのpushやPR作成は行っていません。
- **PASS：共有部品。** Editorでunitypackageを書き出し、元アセット・metaのバイト列を照合。unitypackageとローカルUPMをそれぞれ独立した新規プロジェクトへ導入し、2 PrefabのGUID・Material・識別スクリプトを検査しました。UPMにはasmdef・metaを含め、URPのGraphics／Quality設定後、Scene上で青いAと淡い紫のD、名前ラベルを実描画で確認しました。最終版の生成スクリプトも別の新規UPMプロジェクトでコンパイル・参照検査を通し、共有元欠落時の拒否を確認しました。
- **PASS：実画面。** VS Codeのソース管理・実競合・解決後履歴、Unityの共有元PrefabとUPM由来の配置結果、U27の重複配置と完成Playを撮影。U22のCLI画面も27／27の出力で撮り直しました。本文の画像は96枚です。
- **PASS：静的検査。** Pythonの10検査、既存HTML講座の検査、数学28単元の生成一致、300個の相対リンクとAssetsのmeta欠落0。教材の390／1440pxの表示・全画像デコードも確認しています。
- **PASS：WebGL最終検査。** 最終版を実ビルドして全54シーンを実起動。追加6シーンはA／Dの有無・色・X座標を検査し、入力の長押し・停止、uGUI／UI Toolkitの実クリック、U24の得点保持・Root1個・再保存の重複防止・Retry・同じブラウザー環境でのUnity再起動後の保存読込を確認しました。ワークブック本文からU24／U06／U27へ切り替え、iframeが1つのまま実行できることも確認。本文・画像・スクリプトと成果物のハッシュ一致はPASSです。先行候補では本文変更の検出とUI初回座標のNaNにより掲載を拒否しました。後者はUI配置と有限値を確認してから通知する修正で解消し、上記全体検査を通しています。
- **制限／NOT RUN：** UVCS・Perforce・SVN、クラウドのPR／ロック／CI、Git URL・registry・遠隔Addressables・クラウドセーブは方式の比較であり、実接続は未実施です。UPMはmanifestから導入して検査。Package Managerからの手動tgz導入は未実施で、最小検査用プロジェクトではPackage Manager／Projectの内容一覧が空表示になりました。教材の `Course > Inspect shared prefabs` から実際のパッケージ内Prefabを選び、参照・配置・描画を確認する経路を記載しました。
- **PASS：起動物の終了。** 撮影用Editor 3952／53416／42724／58536／60352と、WebGL・本文埋め込み・静的閲覧のChromium 49712／56300／61324の終了を確認しました。演習生成の最終検査用Editor 61428も終了しました。HTTPリスナーと撮影用ウィンドウは残っていません。既存の利用者のVS Codeを保持しています。[終了記録](../hht/assets/unity/collaboration-cleanup.json)。

## U24：ゲームループ・共有プレイデータ・セーブ管理（2026年10月18日）

U24を教材化し、開始24・完成24の48シーンを収録しました。既存のU24 ScriptableObjectの予定枠を、SOの設定・実行中のセッション・永続記録を比較する単元へ拡充しています。U25〜U50は制作予定（Copilotは保留）のままで、全体は50単元です。

- **PASS：実画面。** Start・加点・シーン再読込・Result + Save・再保存・Retryを実際のUIクリックで確認。得点2の再読込で表示側のインスタンスIDが40226→40346へ変わり、得点2・Root1個を維持しました。結果保存はv2・最高得点3・完了件数1で、再保存しても件数1です。Retryは今回得点0、最高得点3。Stop／Play後はTITLE・今回得点0・最高得点3、別インスタンスID40436として再初期化されました。[実記録](evidence/24-native-loop.json)。
- **PASS：保存の失敗系。** 正常往復、バックアップ、破損した本体の回復、正常バックアップの保持、v1からv2へのメモリー上の移行、未来版の保護、必須フィールド欠落、範囲違反、書き込み先がファイルの場合の失敗を含む10件。[記録](evidence/24-loop-save-tests.json)。新規作成した検査専用フォルダーだけを使用し、後片付けしています。実際の講座用保存先はこの検査で破壊していません。
- **PASS：教材とUnity。** CLIのシーン検査は開始24・完成24・終了コード0。U22の実出力画像も24シーンずつの結果へ更新。U24の実画面6枚を追加し、掲載本文の画像は88枚です。Pythonの生成器・成果物検査10件、既存HHT検査、数学28単元の生成一致もPASS。
- **PASS：WebGL。** 全48シーンを実ビルドして起動。U24の開始例は再読込で得点をリセット、完成例は実際に表示側のインスタンスを作り直して得点2・Playing・Root1個を保持しました。ResultのIndexedDB同期完了、再保存で件数が増えないこと、Retryの得点リセット、ページ再読込での今回得点0・最高得点3・完了件数1の復元もPASS。[ランタイム検査](../hht/assets/unity/webgl-verification.json)・[実描画](../hht/assets/unity/24-webgl-result.png)。保存ファイルの書き込みだけでなく、ゲームを開始し直して読み出した値を照合しています。
- **PASS：ワークブック。** 本文内のU24完成例でStart・加点・結果・保存完了を実クリックし、U06へ切り替えても実行枠が1つであることを確認。[本文内の実画面](../hht/assets/unity/webgl-workbook.png)。88画像の実デコード・altと、1440px／390pxでの本文表示・目次移動・横はみ出しなし、276ローカル参照と全metaを確認しました。
- **終了確認：PASS。** 撮影用Editor・追加VS Codeウィンドウ、ビルド用CLI・Editor、検証用Chromiumと一時HTTPサーバーを終了確認。Editor終了後に残った撮影用PowerShell起動元だけをコマンドで照合して停止しました。既存アプリは維持しています。[今回の終了記録](../hht/assets/unity/loop-cleanup.json)。commit・push・外部ホスティングへのアップロードはしていません。

教材の構成は単一プロセス・単一スロットのサンプルです。複数起動の排他、クラウド同期、改ざん対策、全OSや電源断での原子性を検証したものではありません。Domain Reloadを省略する設定でのPlay反復、ブラウザプロセス終了後の再起動、モバイル実機での一時停止、教室PCと受講者による全手順の通し試行はNOT RUNです。Nativeの新設講座用スロット（`persistentDataPath/EduCourseLoop`）に作成した最高得点3の記録は、保存動作の成果として残しています。

## Shader Graphと50単元の構成（2026年10月18日）

U23 Shader Graphを追加し、開始23・完成23の46シーンを収録しました。Colorプロパティの接続、Materialへの適用、Unlitの実行結果を扱います。実画面は開始・Graph・完成Playの3枚を追加。U22のCLI検査画面も23シーンずつの最新出力に差し替えました。

- **PASS：** グラフ2個のインポートとShaderエラー検査、Material参照、46シーン・98識別対象の配色検査、CLIの終了コード0。U23の開始・完成をEditorで開き、Graph接続と橙のGame表示を目視確認しました。
- **PASS：** 更新コマンドからWebGL実ビルド、全46シーンの実起動、入力の長押し・停止、両UIの実クリック、教材への差し替え、入力・成果物ハッシュ検査。U23は[開始の青](../hht/assets/unity/23-webgl-start.png)と[完成の橙](../hht/assets/unity/23-webgl-complete.png)をブラウザの実描画でも確認しました。
- **PASS：** 正本・HTML一致、82画像の実デコードとalt、1440px／390pxのレイアウト、10テスト、既存HHT検査、数学28単元の生成一致。[配布データ検査](../hht/assets/unity/sample-delivery-checks.json)。
- **PASS：** ワークブックからU23完成を直接起動し、U06完成へ切り替えても実行枠が1つであることを確認。[本文内の実画面](../hht/assets/unity/webgl-workbook.png)。埋め込み検査で、URLの単元判定が22までに固定されていた不具合を発見しました。現在は表示中の選択肢から判定し、WebGL検査の初回起動をU23のURLにして回帰を検出します。修正後の再ビルド・全46シーン検査・本文内起動はすべてPASSです。
- **終了確認：PASS。** 撮影用Unity EditorとVS Codeの追加ウィンドウ、ビルドCLI・Editor、ブラウザと一時HTTPサーバーを終了確認。Editor終了後も残った撮影用PowerShell起動元だけを照合して停止しました。既存のVS Codeウィンドウなどは維持しています。[今回の終了記録](../hht/assets/unity/shadergraph-cleanup.json)。commit・push・外部ホスティングへのアップロードはしていません。
- **制作予定：** U24のScriptableObjectからU49までをワークブックへ整理し、U50のCopilot Agentは保留と明記しました。本文・スクリーンショット・サンプルを実装したのはU23までです。既存単元のタッチ入力・IKなどの拡充候補も、検証済み内容と分けています。受講者が全操作を最初から入力する通し試行と教室PCでの確認はNOT RUNです。

## オブジェクトの配色と識別表示（2026年10月18日）

開始22・完成22シーンの床、立方体、球、カプセル、Sprite、粒子を役割別の配色へ変更しました。各単元の準備欄に色と識別名を追記し、EditorとGameに暗い背景の白文字ラベル、Game右下に凡例を付けています。色だけで対象を判断しない構成です。U10の材質変更とU12の照明変更は学習内容として維持しています。

- **設定値検査：PASS。** 全44シーン・94識別対象で色の重複、材質との一致、床との設定色コントラスト3:1以上を確認。[機械記録](evidence/object-palette.json)。同じ形のAとDは約4.3:1、2DのMarkerとCamera背景は約4.2:1です。これはsRGB設定値の比で、照明・陰影を含む全描画ピクセルの適合保証ではありません。
- **実画面：PASS。** 開始・操作例・完成シーンを新配色で撮影。MonoBehaviour、物理、Animator、Timeline、uGUI、UI Toolkit、VFXのPlay画面も更新しました。UIの実クリックでWelcome!への変化と、Editorでの粒子表示を再確認しています。Windows実行版も再ビルド（Succeeded、エラー0、約25.6秒）し、[起動画面](../hht/assets/unity/21-player.jpg)を撮り直しました。
- 配色と名前の正本は[ワークブックの共通説明](../hht/docs/workbook/unity.md#unity-course)。掲載画像は79枚です。[画像ハッシュ一覧](../hht/assets/unity/screenshot-manifest.json)。
- **WebGL更新：PASS。** 更新コマンドは終了コード0。全44シーンの起動・識別データ、D長押しと離した後の停止、uGUI・UI Toolkitの実クリックを確認しました。HTTPのワークブックからU18・U06の完成例を起動し、本文内プレイヤーが1つに保たれることも確認。正本・生成HTML・掲載WebGLの最新性、79画像の実デコード、1440px／390px表示、10テスト、既存HHT検査と数学28単元の一致もPASSです。
- **見え方の確認：PASS。** ブラウザの実ランタイムに色覚シミュレーションを適用し、[白黒](../hht/assets/unity/palette-achromatopsia.png)、[緑の感度を変えた表示](../hht/assets/unity/palette-deuteranopia.png)、[赤の感度を変えた表示](../hht/assets/unity/palette-protanopia.png)で形と名前ラベルを目視確認。同形の立方体も[白黒で明るさを比較](../hht/assets/unity/palette-prefab-achromatopsia.png)しました。自動記録のCAPTUREDは撮影の意味で、目視判定はこの記録へ分けています。
- **終了確認：PASS。** 撮影用Editor・Windows実行版、ビルド用CLI・Editor、3つの検証用Chromiumと一時HTTPサーバーは終了確認済み。残った撮影用PowerShell起動元をコマンドで照合し、最初に非表示で起動した実行版をパス・開始時刻で照合して、それぞれ停止しました。既存アプリは維持しています。[今回の終了記録](../hht/assets/unity/palette-cleanup.json)。Copilot Agentは引き続き保留。commit・push・外部アップロードはしていません。

色を唯一の識別手段にしない方針は[W3Cの色の使用の解説](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)を参照しています。コントラストの設計基準は[非テキストのコントラストの解説](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)を参考にしています。色覚シミュレーションは当事者による使用確認の代わりにはしていません。

## WebGLの自動更新とワークブック掲載（2026年10月18日）

**PASS：** `python unity/scripts/build_course.py` からWebGLビルド、44シーンのブラウザ検査、掲載データの差し替え、HTML生成、最新性検査まで終了コード0で完了しました。掲載先は `unity/webgl`、入力・成果物ハッシュは[manifest.json](webgl/manifest.json)です。教材・シーン・スクリプト・参照画像の変更や成果物破損は `--check` で拒否します。Qualityにも同じ検証を追加しました。

- Unity 6000.3.25f1へWeb Build Supportを追加し、WebGL2で実ビルド。開始22・完成22を1つのプレイヤーに収録しました。
- 44シーンで実ランタイムのシーン名と起動完了を照合。D長押しの移動・離した後の停止、uGUIとUI Toolkitの実クリックを確認。[ブラウザ検査記録](../hht/assets/unity/webgl-verification.json)。音の聴取は未確認です。
- HTTPで開いた教材からU18完成、U06完成を実際に起動。本文内プレイヤーが1つに保たれることを確認。[ワークブック内の実画面](../hht/assets/unity/webgl-workbook.png)。file URLではWebGLを起動できないため、実行画面にHTTPで開く案内を表示します。
- 正本との一致、78画像の実デコード・alt、1440px／390pxの表示、既存HHT検証、数学28単元の生成一致を確認。Pythonの教材生成・成果物検査は10テストがPASS。
- 失敗系は古い入力、破損・欠落ファイル、シーン不足、Editor起動中、ビルド中の教材変更を検査。CLI失敗（試験用終了コード17）で更新コマンドが1を返し、掲載済みmanifestとHTMLのハッシュが変わらないことも確認しました。
- 保存監視のVS Codeタスクを追加。自動タスクの実行許可はVS Code設定に従います。常駐監視タスクをこの検証で残してはいません。再試行は1つの保存内容につき最大3回です。

**制約：** U19のVFX GraphはCompute Shaderが必要なためWebGL2では非対応です。ビルド時にVFXコンポーネントだけを除き、元シーンは維持しています。ブラウザには制約を明記し、代替粒子をVFX Graphの実行結果として掲載していません。U17のGizmo、Inspector編集、保存、ビルドとCLI操作はEditor側で確認します。[VFX Graph公式の要件](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.3/manual/System-Requirements.html)。

**終了確認：PASS。** 2回のビルド用CLI・Editor、WebGL検査・ワークブック検査・画像検査のChromium、一時HTTPサーバーは終了。生成用Resourcesカタログと差し替え用旧ディレクトリも残っていません。既存アプリは維持しました。[終了記録](../hht/assets/unity/webgl-cleanup.json)。commit・push・外部ホスティングへのアップロードは未実施です。

## 追加分：単元別サンプルとUnity CLI（2026年10月18日）

この追加時点で22単元、開始22・完成22の44シーン、掲載実画面77枚を収録しました。[シーン一覧](samples.md)と[学生ワークブック](../hht/docs/workbook/unity.md#unity-course)から参照します。GitHub Copilot Agentは依頼により保留し、準備データを `Assets/Scenes/Deferred` へ分けました。手書き参考コードをAgentの実行結果として掲載していません。

**PASS：今回の追加**

- 全22完成シーンをUnity Editorで開き、各単元に実画面を追加。専用素材は `Assets/LessonSamples` へ保存。
- Unity CLI 1.0.0-beta.8からUnity 6000.3.25f1を実行し、`LessonSamples.Verify` が終了コード0。全44シーンの存在、完成シーンのMissing Script、Camera、Prefab複製、Timeline接続、UIとVFXの参照を確認。[機械記録](../hht/assets/unity/lesson-samples-report.json)。見た目や全操作の合格を判定する検査ではありません。
- CLIのInspect・Verifyの実出力をVS Codeで開いて撮影。[環境確認ログ](evidence/22-cli-inspect.txt)、[検査ログ](evidence/22-cli-verify.txt)。ターミナルの入力画面としては扱っていません。
- CLIラッパーの失敗系：CLIコマンド欠落、教材Editor起動中をそれぞれ終了コード1で拒否。既存Editorを自動終了しないことを確認。
- 完成UI Toolkit：STUDENT EXHIBITとスタイルを実表示し、Startの実クリックでWelcome!へ変更。[記録](../hht/assets/unity/completed-ui-runtime.json)。完成VFX：Playで粒子表示、生存粒子32を取得。[記録](../hht/assets/unity/completed-vfx-runtime.json)。
- HTML再生成と正本一致、生成器5テスト、77画像の実デコード・alt、1440px／390pxの目次移動と横はみ出しなしを確認。既存HHT検証と数学28単元の生成一致もPASS。
- 44シーンの配置、288件のローカル参照、Assets全ファイルのmetaを確認。[配布検査](../hht/assets/unity/sample-delivery-checks.json)。画像のサイズ・SHA-256は[画像一覧](../hht/assets/unity/screenshot-manifest.json)を更新。

**PASS：今回の終了確認**

撮影用Unity Editor（PID 12532）は通常終了。残ったCLI起動元（PID 39896）は実行パス・開始時刻を再照合して停止しました。検査のUnity CLIは終了コード0で終了し、Unityプロセスの残存なしを確認。教材撮影用VS Codeウィンドウだけを閉じ、同じプロセスの既存ブック用ウィンドウは維持しました。検証用Chromium（PID 45228）も終了。撮影制御ファイルを削除し、ローカルサーバーは起動していません。[追加分の終了記録](../hht/assets/unity/additions-cleanup.json)。

**NOT RUN／保留：** 全44シーンの全操作を通した試行、キー長押しと音の聴取、教室PCでの確認は未実施です。Windowsビルドの成功は以下の初回記録で、今回の追加後に再ビルドしていません。Copilot Agentの実行・撮影と単元化は保留中です。commit・push・外部公開は行っていません。

## 初回21単元の記録

撮影日：2026年10月18日（日本時間）。教材はローカルのedu作業ツリーに追加しています。外部公開・pushは実施していません。

**撮影環境：** Unity 6000.3.25f1、Windows、Direct3D 12、GeForce RTX 3080。URP／VFX Graph 17.3.0、Input System 1.20.0、Timeline 1.8.13、uGUI 2.0.0。Editorは英語表示です。UI ElementsはUI Toolkitとして扱います。

**画像：** 全21単元に開始画面と操作箇所の画面を配置し、VFX設定詳細、主なPlay結果、Windows実行結果を加えた実画面51枚を掲載しています。画像は `../hht/assets/unity/` に保存し、すべて代替テキスト付きで手順の近くから参照しています。Unityの画面はComputer UseのWindowsキャプチャで取得しました。シーンの切替・選択・配置例には専用Editorスクリプトを使用しています。画像を生成したり、架空の画面へ描き換えたりはしていません。

**PASS：教材構造と表示**

- ワークブックにU01〜U21を収録。各単元の依頼・範囲・完成条件・準備・手順・報告欄を確認。
- `python unity/scripts/build_course.py --check`：正本とHTMLの一致、単元の順序と必須項目、画像参照を検査。
- `python -m unittest discover -s unity/scripts -p test_build_course.py`：正常系、単元欠落、完成条件欠落、画像欠落、HTMLエスケープの5件を確認。
- `node unity/scripts/verify_browser.cjs`：1440px・390pxで目次移動、横はみ出しの有無、掲載画像の実デコード、alt、JavaScriptエラーを確認。入力ファイル欠落時は終了コード1となり、ブラウザを閉じる失敗系も確認。
- ブラウザ実画面：`reader-1440.png`、`reader-390.png`。機械記録：[browser-verification.json](../hht/assets/unity/browser-verification.json)。
- 既存の `python hht/scripts/validate-course.py` もPASS。既存数学編の生成内容との一致もPASS。
- 掲載した実画面のファイル一覧・サイズ・SHA-256：[screenshot-manifest.json](../hht/assets/unity/screenshot-manifest.json)。

**PASS：専用Unityプロジェクト**

- 21シーン、実行用スクリプト、Sprite、Material、Prefab、Animator Controller、Clip、Timeline、音、両方式のUI、VFXを生成し、コンパイル後のEditorで開いて撮影。
- MonoBehaviour：Y座標0.5から0.6657への時間変化とGame表示を確認。
- 物理：高さ約3から約0まで落下し、床の上で停止することを確認。
- Animator：開始時X=-1から約-0.6908への変化とGame表示を確認。
- Timeline：再生時刻約0.49秒でXが約0.3005へ変化し、Gameへ反映されることを確認。
- uGUI：実際のマウスクリックでStartがWelcome!へ変化。
- UI Toolkit：実際のマウスクリックでReadyがWelcome!へ変化。
- VFX：SceneとGameの両方で粒子を確認。約1.48秒のランタイム取得で生存粒子62個。
- Windows開発ビルド：Succeeded、エラー0件、約54.4秒。生成exeをEditorの外で起動し、床と展示物の表示を撮影。
- 機械記録：[runtime-checks.json](../hht/assets/unity/runtime-checks.json)、[build-result.json](../hht/assets/unity/build-result.json)。生存粒子数が開始直後に-1の場合はまだ取得できていない値として扱い、正の値を取得してから判定しています。

**NOT RUN：授業前に補完する確認**

- U06の物理キーボードでのA・D長押しと離した時の停止。自動操作の短いキー送信2回では移動を確認できませんでした。割当画面とコードの確認を、長押しの動作確認の代わりにしていません。教室PCでGameへフォーカスし、長押しの実入力を試して補完します。
- U15の人による聴取。Audio Source、Clip、音量、Loop、Listenerの設定画面は確認しましたが、実際に聞こえたとは判定していません。教室の音声出力で確認します。
- 全手順を受講者が最初から入力して仕上げる通し試行、全ての数値変更の比較、全教室PC・GPU・画面比率・別OSでの実行。写真に写った開始データだけで各単元の課題を合格扱いにしません。

**PASS：終了確認**

撮影用Editor（PID 5732）と表示用Windows実行ファイル（PID 35412）は通常終了を確認しました。最初に非表示で起動した同一ビルド（PID 14612）は通常終了要求後も残ったため、パス・開始時刻を再照合した上でそのPIDだけを停止しました。初期起動のEditor 23076・再起動前41952も終了しています。既存の他プロジェクトのEditorやブラウザは終了していません。教材検証用Chromiumも各実行後の終了を確認しています。Unity教材の表示確認はfile URLで行いました。既存教材検査が内部起動した一時HTTPサーバーは検査のfinallyでshutdownされ、検査プロセスの終了を確認しています。

[cleanup.json](../hht/assets/unity/cleanup.json)に対象PIDと終了方法を記録しました。撮影制御ファイルは削除済みで、通常の教材起動時に撮影やビルドを再実行しません。Library・Temp・Builds・ログ等はプロジェクト内の `.gitignore` で配布対象から除外しています。
