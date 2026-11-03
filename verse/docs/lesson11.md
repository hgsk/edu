# 第11単元 Scene Graph入門


[目次](../README.md) · [前の単元：第10単元 スタイルと命名](./lesson10.md) · [次の単元：第12単元 他言語からの移行](./lesson12.md)


**この単元で学ぶこと：** Scene Graphの3要素（entity、component、prefab）と、カスタムコンポーネントの基本形を説明できるようになります。


## Scene Graphとは


Scene Graphは、島の中のあらゆるオブジェクトを、1つの階層構造で表す枠組みです。  
EpicはUE6のゲームプレイの基盤としてこの構造を採用する計画で、UEFNでは先行してBeta提供されています。  
これまでの「デバイスを置いて連携させる」形に加えて、「部品を組み合わせてオブジェクトを作る」形が使えるようになります。


中心の考え方は3つです。


- **entity：** コンポーネントと子entityの入れ物です。
  それ自体では何もしません。

- **component：** データと振る舞いを持つ再利用可能な部品です。
  entityに何を持たせるかで、そのentityが何者かが決まります。
  同じ種類のコンポーネントは、1つのentityに1つまでです。

- **prefab：** entityとコンポーネントの階層をまとめた再利用テンプレートです。
  何度も配置でき、元を直すと配置済みの全体へ反映されます。


組み込みのコンポーネントには、位置を決めるTransform、見た目のMesh、ライト、Niagaraのエフェクト、音、キーフレームで動かすKeyframed Movementなどがあります。


## カスタムコンポーネントの基本形


Verseで部品を作るときは、`component` を土台にクラスを定義します。

```verse
using { /Verse.org/SceneGraph }

my_component := class<final_super>(component):
    @editable
    Speed : float = 1.0

    OnBeginSimulation<override>() : void =
        (super:)OnBeginSimulation()

    OnSimulate<override>()<suspends> : void =
        # 継続的な処理を書きます
        Sleep(1.0)

    OnEndSimulation<override>() : void =
        (super:)OnEndSimulation()
```


デバイスとの違いは、ライフサイクルの名前と動き方です。


- `OnBeginSimulation` は、シミュレーション開始時に呼ばれます。
  デバイスと違い、編集モードでもプレイ中でも動きます。

- `OnSimulate` は継続処理の場所です。
  中断可能で、コンポーネントが破棄されると自動でキャンセルされます。

- `OnEndSimulation` は終了時の後片付けの場所です。


## Entityから部品を取る


コンポーネントの中では、自分の所属する `Entity` から、他のコンポーネントを取得できます。  
取得は失敗可能なので、`if` で受けるのが定型です。

```verse
using { /Verse.org/SceneGraph }
using { /UnrealEngine.com/Temporary/Diagnostics }

door_component := class<final_super>(component):
    OnBeginSimulation<override>() : void =
        (super:)OnBeginSimulation()
        if (MeshComponent := Entity.GetComponent[mesh_component]):
            MeshComponent.EntityEnteredEvent.Subscribe(OnMeshEntered)

    OnMeshEntered(OtherEntity : entity) : void =
        Print("別のentityが触れました")
```


位置は `Entity.GetGlobalTransform()` で取得できます。  
「デバイスのイベント購読」と同じ考え方が、コンポーネント同士の連携にもそのまま使われている点に注目してください。


## 設定をデータクラスで持つ


繰り返し使う設定は、`<concrete>` なデータクラスに切り出すと、エディタ上で並べて編集できます。

```verse
keyframe_segment := class<concrete>:
    TargetEntity : ?entity = false
    AnimationDuration : float = 2.0
```


💡 **ヒント：**

> Scene GraphはBetaで、版ごとにモジュールのパスやAPIが変わることがあります。  
> 写経するときは、手元のUEFNの版に合った公式ドキュメントで、パスと名前を確認してから書いてください。


## 確認


- [ ] entity、component、prefabの役割の違いを説明できる

- [ ] デバイスとコンポーネントで、ライフサイクルの名前がどう違うか説明できる

- [ ] `Entity.GetComponent[mesh_component]` が失敗可能で、`if` で受ける理由を説明できる


**演習：** 自分のentityのMeshコンポーネントを探し、見つかったらログへ出すコンポーネントを書いてください。


[目次](../README.md) · [前の単元：第10単元 スタイルと命名](./lesson10.md) · [次の単元：第12単元 他言語からの移行](./lesson12.md)
