# 第10単元 スタイルと命名


[目次](../README.md) · [前の単元：第9単元 状態と永続化](./lesson09.md) · [次の単元：第11単元 Scene Graph入門](./lesson11.md)


**この単元で学ぶこと：** Epic公式の命名の流儀（すべてPascalCase）を理解し、変えられる名前と変えられない名前を区別できるようになります。


## 公式の流儀は「全部PascalCase」です


Verseの公式スタイルでは、自作の定義も含めて、識別子はPascalCase（各単語の先頭を大文字）で書きます。  
クラス名、関数名、変数名、引数名、`@editable` の項目名まで、すべてです。

```verse
GameManager := class(creative_device):
    @editable
    StartButton : button_device = button_device{}

    var CurrentScore : int = 0

    OnBegin<override>()<suspends> : void =
        StartButton.InteractedWithEvent.Subscribe(HandleStartPressed)

    HandleStartPressed(AgentArg : agent) : void =
        set CurrentScore = CurrentScore + 1
        PrintScore()

    PrintScore() : void =
        Print("Score: {CurrentScore}")
```


## camelCaseでも動きますが、流儀ではありません


```verse
gameManager := class(creative_device):
    var currentScore : int = 0
```


コンパイラは小文字始まりの識別子も受け付けるので、この書き方でも動きます。  
ただし、公式のサンプルやテンプレートはすべてPascalCaseです。  
公開する島や共同開発では、流儀をそろえる方が読み手に親切です。


## 変えられない名前


命名の自由があるのは、自分の定義だけです。  
次はAPI側の正式名なので、そのまま書きます。


- **上書きする関数名：** `OnBegin` のような基底側の名前は、1文字でも違うと別の関数として扱われ、上書きになりません。

- **APIのメンバー名：** `InteractedWithEvent`、`Print`、`GetPlayers` などは定義どおりに書きます。

- **デバイスの型名：** `button_device`、`creative_device` のような型名は、小文字とアンダースコアの表記が正式名です。ここだけPascalCaseの例外として覚えます。

- **キーワードと組み込みの値：** `true`、`false`、`void` などは小文字です。


💡 **ヒント：**

> 「大文字にすべきか」で迷ったら、自分が今書いている名前が「自分の定義か、APIの名前か」を先に判断します。  
> 自分の定義ならPascalCase、APIの名前なら公式ドキュメントの表記どおりです。


## 確認


- [ ] 自作のクラス、関数、変数をすべてPascalCaseで書ける

- [ ] `button_device` がPascalCaseにならない理由を説明できる

- [ ] `OnBegin` の名前を変えてはいけない理由を説明できる


**演習：** 次のcamelCaseの断片を、すべて公式の流儀へ直してください。`spawnCounter`（クラス名）、`var killCount : int`、`CountKill(attackerAgent : agent)`。ただし `creative_device` はそのままにします。


[目次](../README.md) · [前の単元：第9単元 状態と永続化](./lesson09.md) · [次の単元：第11単元 Scene Graph入門](./lesson11.md)
