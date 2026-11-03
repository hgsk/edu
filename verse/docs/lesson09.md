# 第9単元 状態と永続化


[目次](../README.md) · [前の単元：第8単元 コレクション](./lesson08.md) · [次の単元：第10単元 スタイルと命名](./lesson10.md)


**この単元で学ぶこと：** `var` と `set` による状態管理と、セッションをまたいで残る永続化データの持ち方（`persistable` と `weak_map`）を説明できるようになります。


## 状態はvarで持ちます


ゲーム中の状態は、`var` の変数やマップに持ちます。  
`var` で宣言したマップは、キーへの代入で中身を更新できます。

```verse
    var XPByPlayer : [player]int = map{}

    AddXP(Player : player, Amount : int) : void =
        var Current : int = 0
        if (Existing := XPByPlayer[Player]):
            set Current = Existing
        set XPByPlayer[Player] = Current + Amount
```


検索が失敗可能なので、「あれば使う、なければ0から始める」を `if` で書くのが定型です。  
この書き方は、第5単元の `option` の考え方そのものです。


## 通常の状態は、セッション限りです


`var` に持った値は、そのゲームのセッションの中だけ有効です。  
島を出て入り直すと、値は初期状態に戻ります。  
経験値やハイスコアのように、次回も残したいデータには、永続化の仕組みを使います。


## 永続化データの持ち方


永続化できるデータは、型に `<persistable>` を付けたクラスで表します。  
プレイヤーとデータを結びつける置き場には、`weak_map` を使います。

```verse
    PlayerProgress := class<concrete><persistable>:
        var XP : int = 0
        var Level : int = 1

    var ProgressByPlayer : weak_map(player, PlayerProgress) = map{}

    GetOrCreateProgress(Player : player) : PlayerProgress =
        if (Progress := ProgressByPlayer[Player]):
            Progress
        else:
            NewProgress := PlayerProgress{}
            set ProgressByPlayer[Player] = NewProgress
            NewProgress
```


- **`<persistable>`：** この型のデータは保存対象にできる、という印です。保存できない型をフィールドに含めるとエラーになります。

- **`weak_map`：** キーは弱く保持されます。プレイヤーが長く不在でも、置き場自体が壊れないための仕組みです。

- **取得の定型：** 検索して、あればそれを返し、なければ作って入れてから返す、という形にします。


💡 **ヒント：**

> 永続化データは、後から型を変更すると、保存済みのデータとの互換性が問題になります。  
> フィールドの追加や変更は、公開済みの島では慎重に行うものだと覚えておいてください。


## 確認


- [ ] `var` のマップを更新するときの「あれば使う、なければ初期値」の形が書ける

- [ ] 通常の `var` と永続化データの、残る期間の違いを説明できる

- [ ] `<persistable>` と `weak_map` がそれぞれ何のためにあるか説明できる


**演習：** ハイスコアを永続化する型 `PlayerBest`（フィールドは `var BestScore : int = 0`）を定義し、プレイヤーの記録を取得する関数を書いてください。


[目次](../README.md) · [前の単元：第8単元 コレクション](./lesson08.md) · [次の単元：第10単元 スタイルと命名](./lesson10.md)
