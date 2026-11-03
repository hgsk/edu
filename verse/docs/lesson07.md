# 第7単元 非同期処理


[目次](../README.md) · [前の単元：第6単元 エフェクトシステム](./lesson06.md) · [次の単元：第8単元 コレクション](./lesson08.md)


**この単元で学ぶこと：** `spawn{ }`、`Sleep`、イベントの `Await`、`race` を使って、「待ちながら他の処理を進める」コードを書けるようになります。


## スレッドではなく、協調的な中断です


Verseの非同期は、OSのスレッドではありません。  
1つの流れの中で、`<suspends>` な呼び出しのところでだけ処理が他へ移ります。  
競合の心配は少なく、代わりに「どこで中断しうるか」が効果で明示されます。


使う部品は4つです。


- **`Sleep(秒数)`：** 指定した秒数だけ待ちます。

- **`spawn{ }`：** 処理を別のタスクとして投げ、呼び出し側は先へ進みます。

- **`Await()`：** イベントが起きるまで待ち、起きたらその内容を受け取ります。

- **`race`：** 複数の処理を並べ、最初に終わったものを採用して、残りをキャンセルします。


## コードを読む


```verse
using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /UnrealEngine.com/Temporary/Diagnostics }

start_manager := class(creative_device):
    @editable
    StartButton : button_device = button_device{}

    OnBegin<override>()<suspends> : void =
        spawn{ CountDown() }
        spawn{ WatchButton() }

    CountDown()<suspends> : void =
        Sleep(3.0)
        Print("カウントダウン終了です")

    WatchButton()<suspends> : void =
        Agent := StartButton.InteractedWithEvent.Await()
        Print("ボタンが押されました")
```


`OnBegin` は2つのタスクを投げて、すぐに終わります。  
`CountDown` は3秒待ってから表示し、`WatchButton` はボタンが押されるまで待ってから表示します。  
どちらが先に表示されるかは、実際の操作と時間の経過で決まります。


## raceで「先に起きた方」を取る


制限時間とボタンの両方を待つような場面では、`race` を使います。

```verse
    WaitEither()<suspends> : void =
        race:
            Sleep(10.0)
            StartButton.InteractedWithEvent.Await()
        Print("どちらかが起きました")
```


`race` の中では複数の処理が並行に進み、最初に完了した時点で残りはキャンセルされます。  
ただし、キャンセルは「そのタスクの続きを実行しない」という意味です。  
キャンセルされたタスクが既に行った変更（表示した文字、有効にしたデバイス、書き換えた状態）は、自動では取り消されません。  
失敗コンテキストの巻き戻し（第5単元・第6単元）は、失敗した計算の中だけの仕組みで、非同期タスクのキャンセルとは別物です。  
後片付けが必要な処理は、`defer` で登録しておきます。

```verse
    WatchBriefly()<suspends> : void =
        Print("見張りを開始します")
        defer Print("見張りを終了します")
        Sleep(10.0)
```

この例では、10秒たって終わるときも、外からキャンセルされるときも、終了の表示が必ず出ます。


💡 **ヒント：**

> `spawn{ }` で投げたタスクは、デバイスが破棄されると自動でキャンセルされます。  
> 止め忘れの心配は少ない代わりに、長時間のタスクは「途中で消えるかもしれない前提」で書きます。


## SubscribeとAwaitの使い分け


- 繰り返し起きる出来事には `Subscribe`（第4単元）を使います。

- 一度だけ待てばよい出来事には `Await` を使います。

- 両方を同じイベントへ併用することもできます。


## 確認


- [ ] `spawn{ }` した処理と、呼び出し側の進み方の関係を説明できる

- [ ] `race` で負けた側の処理はキャンセルされ、実行済みの変更は残ることを説明できる

- [ ] 後片付けを `defer` で登録する理由を説明できる

- [ ] `Subscribe` と `Await` の使い分けを説明できる


**演習：** ボタンが押されるか、5秒経過するかのどちらかで「受付終了です」と表示する関数を、`race` を使って書いてください。


[目次](../README.md) · [前の単元：第6単元 エフェクトシステム](./lesson06.md) · [次の単元：第8単元 コレクション](./lesson08.md)
