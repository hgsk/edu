# 第10単元 スタイルと命名


[目次](../README.md) · [前の単元：第9単元 状態と永続化](./lesson09.md) · [次の単元：第11単元 Scene Graph入門](./lesson11.md)


**この単元で学ぶこと：** Epic公式の命名の流儀（型名はlower_snake_case、それ以外はPascalCase）を理解し、変えられる名前と変えられない名前を区別できるようになります。


## 公式の流儀は「型名だけ小文字」です


Verseの公式スタイルガイドでは、名前の種類によって規則が分かれます。  
クラスや構造体のような「型」の名前は、単語を小文字にしてアンダースコアでつなぐlower_snake_caseで書きます。  
関数名、変数名、引数名、`@editable` の項目名のような、それ以外の名前はPascalCase（各単語の先頭を大文字）で書きます。

```verse
game_manager := class(creative_device):
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


この例では、`game_manager` が型の名前なのでlower_snake_caseです。  
`StartButton`、`CurrentScore`、`HandleStartPressed` は型ではないのでPascalCaseです。  
`button_device` や `creative_device` が小文字なのも、例外ではなく型名の規則どおりです。  


## 流儀と違う書き方でも動きます


```verse
gameManager := class(creative_device):
    var currentScore : int = 0
```


上の例は、型名も変数名も公式の流儀とは違う書き方をしたものです。  
コンパイラは名前の付け方を厳密には強制しないので、この書き方でも動きます。  
ただし、公式のサンプルやテンプレートは、型名はlower_snake_case、それ以外はPascalCaseでそろえられています。  
公開する島や共同開発では、流儀をそろえる方が読み手に親切です。


## 変えられない名前


命名の自由があるのは、自分の定義だけです。  
次はAPI側の正式名なので、そのまま書きます。


- **上書きする関数名：** `OnBegin` のような基底側の名前は、1文字でも違うと別の関数として扱われ、上書きになりません。

- **APIのメンバー名：** `InteractedWithEvent`、`Print`、`GetPlayers` などは定義どおりに書きます。

- **型名（デバイスを含む）：** `button_device`、`creative_device` のような型名は、lower_snake_caseの表記が正式名です。
  自作のクラス名も型名なので、同じ規則で書きます。

- **キーワードと組み込みの値：** `true`、`false`、`void` などは小文字です。


💡 **ヒント：**

> 「どちらの書き方か」で迷ったら、自分が今書いている名前が「型の名前か、それ以外か」を先に判断します。  
> 型名ならlower_snake_case、それ以外ならPascalCaseです。  
> APIの名前は、どちらの場合も公式ドキュメントの表記どおりに書きます。


## 確認


- [ ] 自作の型名をlower_snake_caseで、関数や変数をPascalCaseで書ける

- [ ] `button_device` がlower_snake_caseである理由を、型名の規則から説明できる

- [ ] `OnBegin` の名前を変えてはいけない理由を説明できる


**演習：** 次の断片を、公式の流儀へ直してください。  
`spawnCounter`（クラス名）、`var killCount : int`、`CountKill(attackerAgent : agent)`。  
ただし `creative_device` はそのままにします。


[目次](../README.md) · [前の単元：第9単元 状態と永続化](./lesson09.md) · [次の単元：第11単元 Scene Graph入門](./lesson11.md)
