# 第4単元 デバイス連携


[目次](../README.md) · [前の単元：第3単元 構文の基礎](./lesson03.md) · [次の単元：第5単元 失敗可能式とoption](./lesson05.md)


**この単元で学ぶこと：** `@editable` で配置済みデバイスを参照し、イベントを `Subscribe` して処理をつなぐ、UEFNで最も頻出する型を書けるようになります。


## デバイス同士をつなぐ考え方


UEFNでは、ボタンのようなデバイスを島へ配置し、Verseのデバイスから「そのボタンが押されたら、この処理をする」とつなぎます。  
つなぎ方は2段階です。


1. `@editable` で、配置済みのデバイスへの参照を受け取る欄を用意します。  
2. `OnBegin` で、そのデバイスのイベントへ自分の関数を `Subscribe`（購読）します。


## コードを読む


```verse
using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /UnrealEngine.com/Temporary/Diagnostics }

GameManager := class(creative_device):
    @editable
    StartButton : button_device = button_device{}

    @editable
    ScoreToWin : int = 10

    var CurrentScore : int = 0

    OnBegin<override>()<suspends> : void =
        StartButton.InteractedWithEvent.Subscribe(HandleStartPressed)

    HandleStartPressed(Agent : agent) : void =
        set CurrentScore = CurrentScore + 1
        Print("現在のスコア: {CurrentScore}")
        if (CurrentScore >= ScoreToWin):
            Print("目標達成です")
```


### @editable


`@editable` を付けた項目は、UEFNの詳細パネルに現れます。  
島に配置したボタンデバイスを `StartButton` の欄へ割り当てると、コードからそのボタンを操作できるようになります。  
`ScoreToWin` のような数値も `@editable` にすると、コードを書き換えずにエディタ側で調整できます。


### Subscribe


`StartButton.InteractedWithEvent` は「ボタンが押された」というイベントです。  
`Subscribe(HandleStartPressed)` で、そのイベントが起きるたびに `HandleStartPressed` が呼ばれるよう登録します。  
登録はゲーム開始直後の `OnBegin` で行うのが定型です。


### agentとplayer


イベントの handler には、操作した人の `agent` が渡ってきます。  
プレイヤーとしての情報が必要なときは、変換して取り出します。

```verse
    HandleStartPressed(Agent : agent) : void =
        if (Player := player[Agent]):
            Print("プレイヤーがボタンを押しました")
```


`player[Agent]` は失敗するかもしれない変換です。  
そのため `if` の条件の中で受け取っています。  
この「失敗可能」な呼び出しの仕組みは、次の単元で正式に扱います。


💡 **ヒント：**

> イベントが発火しないときは、順番に確かめます。  
> 詳細パネルでデバイスが割り当てられているか、`Subscribe` の行が `OnBegin` の中にあるか、handler の引数の型がイベントと合っているか、の3点です。


## 確認


- [ ] `@editable` の欄と、島に配置したデバイスの割り当ての関係を説明できる

- [ ] `Subscribe` が「起きたら呼ぶ」登録であることを説明できる

- [ ] `agent` から `player` へ変換するときに `if` が必要な理由を説明できる


**演習：** 上の `GameManager` を改造し、ボタンが押された回数を数え、10回目で「目標達成です」と出すコードを書いてください。目標回数は `@editable` で変えられるようにしてください。


[目次](../README.md) · [前の単元：第3単元 構文の基礎](./lesson03.md) · [次の単元：第5単元 失敗可能式とoption](./lesson05.md)
