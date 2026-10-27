# 用語と参照資料

**基本の用語**

- **Scene：** 場面の構成を保存するファイル。
- **GameObject：** コンポーネントを組み合わせる単位。
- **Component：** 動作、描画、入力などを担当する部品。
- **Asset：** Projectで管理する画像、音、スクリプトなどのデータ。
- **Inspector：** 選択対象の設定を確認・編集するパネル。
- **Play Mode：** Editor内でゲームを実行して確認する状態。

**UIの選び方**

| 確認する点 | uGUI | UI Toolkit（旧称UI Elements） |
|---|---|---|
| 構造 | Canvas配下のGameObject | UXMLのVisualElementツリー |
| 見た目 | Image、Text、各Component | USSのスタイル |
| 操作の接続 | ButtonのOn Clickなど | C#のイベント登録など |
| 編集する場所 | Scene、Inspector | UI Builder、Inspector |

本講座はそれぞれ独立したシーンで扱います。両方の方式を同じ画面で混ぜる必要はありません。

**配布データ**

- `project/Assets/Scenes/`：単元ごとの操作開始データ。
- `project/Assets/Scripts/`：短い実行用コード。入力、移動、UI、Gizmo、ログを扱います。
- `project/Assets/UI/`：UI Toolkitの構造とスタイル。
- `project/Assets/Art/`：教材用の単色Sprite、Material、合成した短音など。
- VFXの開始GraphはUnity VFX GraphパッケージのSimple Loopテンプレートを教材プロジェクトへ複製したものです。第三者アセットとしてUnityのライセンス条件を維持します。独自制作素材とは区別します。

**公式資料（撮影対象のバージョンに対応）**

- [Unity 6.3 Manual](https://docs.unity3d.com/6000.3/Documentation/Manual/index.html)：Editor、Scene、コンポーネント、Build Profiles。
- [MonoBehaviour API](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/MonoBehaviour.html)：StartやUpdateなど。
- [Input System 1.20](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.20/manual/index.html)：入力デバイス、Input Actions。
- [Timeline 1.8](https://docs.unity3d.com/Packages/com.unity.timeline@1.8/manual/index.html)：トラック、Clip、Binding。
- [UI Toolkit](https://docs.unity3d.com/6000.3/Documentation/Manual/UIElements.html)：UXML、USS、UI Builder。
- [uGUI 2.0](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/index.html)：Canvas、Rect Transform、Button。
- [VFX Graph 17.3](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.3/manual/index.html)：グラフと対応環境。

画面の撮影日・使用パッケージ・確認範囲は[検証記録](./verification.md)を参照します。公式ページの内容は将来変わることがあります。

**Unity CLI：** [公式の利用手順](https://docs.unity.com/en-us/unity-cli/use-unity-cli)と[リリースノート](https://docs.unity.com/en-us/unity-cli/release-notes)。撮影環境は1.0.0-beta.8。Editorのバージョンとは別に記録します。

- [Shader Graph 17.3：作成・ノード接続・Materialへの適用](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.3/manual/Getting-Started.html)。
- [ScriptableObject](https://docs.unity3d.com/6000.1/Documentation/Manual/class-ScriptableObject.html)：共有データをアセットとして保持する仕組み。U24で制作予定。
- [Unity 6.3 マニュアル](https://docs.unity3d.com/6000.3/Documentation/Manual/index.html)：主要分野の構成を整理する際の参照。

- [更新と実行順](https://docs.unity3d.com/ja/current/Manual/managing-update-order.html)：UnityのPlayer loopとイベント関数。
- [DontDestroyOnLoad](https://docs.unity3d.com/jp/current/ScriptReference/Object.DontDestroyOnLoad.html)：シーン変更とルートGameObjectの寿命。
- [persistentDataPath](https://docs.unity3d.com/kr/current/ScriptReference/Application-persistentDataPath.html)：OS別の保存先とWebのIndexedDB。
- [JsonUtility](https://docs.unity3d.com/jp/current/ScriptReference/JsonUtility.html)：Unityのシリアライズ規則。
- [WebGLのファイル保存と同期](https://docs.unity3d.com/cn/2022.1/Manual/webgl-debugging.html)：FS.syncfsによる非同期同期。現行Editorの生成コードと実ランタイムでも検証します。

## バージョン管理・共有・共同制作

- [Unityのバージョン管理](https://docs.unity3d.com/jp/current/Manual/class-VersionControlSettings.html)：metaとシリアライズ。
- [UnityでのScene・Prefabの共同編集](https://unity.com/blog/author-scenes-and-prefabs-with-verson-control)：Smart Mergeと担当分割。
- [Gitのワークフロー](https://git-scm.com/docs/gitworkflows)：共有ブランチと統合。
- [Git LFSのロック](https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-lock.adoc)：サーバー側のロック。
- [Unity Version Control導入ガイド](https://learn.unity.com/tutorial/unity-version-control-guide)：UVCSの構成。
- [Unity 6.3のasset package](https://docs.unity.com/en-us/engine/6000.3/manual/assets-and-media/asset-packages)：unitypackageによる配布。
- [UPMパッケージの共有](https://docs.unity.com/en-us/engine/6000.0/manual/packages-list/cus-pkg-development/cus-share)：ローカル・Git・レジストリ配布。
- [Addressablesの遠隔配信](https://docs.unity3d.com/ja/Packages/com.unity.addressables@1.20/manual/RemoteContentDistribution.html)：カタログと配信先。

## U28 コンポーネントの依存管理

- [RequireComponent](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/RequireComponent.html)：追加時に同じGameObjectへ必要な型を補います。既存インスタンスの新たな依存は自動修復しません。
- [DisallowMultipleComponent](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/DisallowMultipleComponent.html)：同じ型の重複追加を制限します。
- [Reset](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/MonoBehaviour.Reset.html) と [OnValidate](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/MonoBehaviour.OnValidate.html)：Editorでの初期値と値の検査。
- [TryGetComponent](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Component.TryGetComponent.html)：同じオブジェクトの取得と失敗判定。
- [IProcessSceneWithReport](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Build.IProcessSceneWithReport.html)：ビルドするシーンの検査。

- [Physics Materialの摩擦・反発・Combine](https://docs.unity3d.com/6000.3/Documentation/Manual/class-PhysicsMaterial.html)
- [Rigidbodyの設定](https://docs.unity3d.com/6000.3/Documentation/Manual/class-Rigidbody.html)

- [Sceneのグリッドとスナップ](https://docs.unity3d.com/6000.3/Documentation/Manual/GridSnapping.html)
- [Prefabの作成](https://docs.unity3d.com/6000.3/Documentation/Manual/CreatingPrefabs.html)
- [ネストしたPrefab](https://docs.unity3d.com/6000.3/Documentation/Manual/NestedPrefabs.html)

- [Unity 6.3 Humanoid IK](https://docs.unity3d.com/6000.3/Documentation/Manual/InverseKinematics.html)
- [Animation Rigging 1.4](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/index.html)
- [UniVRM VRM1.0の導入](https://vrm.dev/univrm1/install/)
- [UniVRMのURP材質](https://vrm.dev/univrm1/material/)
- [UniVRM v0.131.3](https://github.com/vrm-c/UniVRM/releases/tag/v0.131.3)
- [VRoid Studio](https://vroid.com/studio)

- [AudioSource](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/AudioSource.html)
- [Audio Mixer](https://docs.unity3d.com/6000.3/Documentation/Manual/AudioMixer.html)
- [WebGLのオーディオ対応範囲](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-audio.html)
- [Animation Eventによる足音の同期](https://docs.unity3d.com/6000.3/Documentation/Manual/AnimationEventsOnImportedClips.html)
- [Kenney Impact Sounds / CC0](https://kenney.nl/assets/impact-sounds)

- [TerrainData.SetHeights：正規化した高さ配列](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/TerrainData.SetHeights.html)
- [Undo.RegisterCompleteObjectUndo](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Undo.RegisterCompleteObjectUndo.html)
- [EditorWindow](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/EditorWindow.html)

- [Noto Sans JPの公式配布](https://github.com/notofonts/noto-cjk/tree/main/Sans/SubsetOTF/JP)
- [同梱したフォントのOFLライセンス](project/Assets/Fonts/OFL.txt)
- [UI ToolkitのPanel Text Settings](https://docs.unity3d.com/6000.3/Documentation/Manual/UIE-text-setting-asset.html)
- [TextMeshProのフォントアセット](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/TextMeshPro/FontAssets.html)

## 当たり判定（U36）

- [ColliderとRigidbodyの組合せ](https://docs.unity3d.com/6000.3/Documentation/Manual/collider-types-interaction.html)
- [Physics.Raycast](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Physics.Raycast.html)
- [Physics.IgnoreLayerCollision](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Physics.IgnoreLayerCollision.html)
