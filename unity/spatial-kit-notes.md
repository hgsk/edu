# SpatialPractice 配布部品の技術メモ

課題・完成条件の正本は[U31](../hht/docs/workbook/unity.md#unity-31)です。

**出所：** 本教材の生成コード `SpatialPracticeSamples.cs` がUnity標準のCube／Cylinderから作成します。外部のモデル・テクスチャは導入していません。教材外の素材を追加するときは、その配布元の利用条件と参照元を別途記録してください。

- **SideModule：** 空の親の原点を足元に置き、子メッシュの寸法を0.7×2.4×0.3とします。2つのインスタンスを柱として使います。
- **HeaderModule：** 中央原点、寸法3.4×0.5×0.3の梁です。
- **SignModule：** 中央原点、CylinderをX方向90度回転した看板です。
- **GateAssembly：** 上記の4インスタンスをネストしたPrefabです。根のScaleは1。各部品のMaterial・識別番号と配置はインスタンスのOverridesです。
- **座標：** Yが上、Zが前後、Xが左右。柱はX=±1.35、Z=−0.65。梁はY=2.65、Z=−0.65。看板はY=2.65、Z=−0.9です。
- **当たり判定：** 装飾PrefabはColliderを持ちません。シーン内の基礎壁のBox Colliderを使用します。基礎壁は外観をONにしても表示を保ちます。

SceneとPrefabの保存済みデータを検査する入口は `SpatialPracticeSamples.Verify` です。入力の変化を含めた検査は教材更新コマンドのWebGL検証で行います。
