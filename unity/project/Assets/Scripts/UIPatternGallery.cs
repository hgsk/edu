using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using UnityEngine.InputSystem;

[RequireComponent(typeof(UIDocument))]
public sealed class UIPatternGallery : MonoBehaviour
{
    [InspectorName("ギャラリーの構造")] public VisualTreeAsset galleryAsset;
    [InspectorName("ギャラリーの見た目")] public StyleSheet galleryStyle;
    public static readonly string[] Titles={"体力・スタミナHUD","戦闘HUD","目標と地図","ショートカット枠","タイトルメニュー","ポーズメニュー","設定","所持品","会話と選択肢","クエスト一覧","確認ダイアログ","結果","読込とエラー","通知と補足表示"};
    static readonly string[] Purposes={
        "体力とスタミナは画面の端に置き、バーと正確な数値を併記します。",
        "照準の周囲を空け、装填数・予備弾・再装填状態を分けて表示します。",
        "次の目標を示します。略図にも現在地の目印と凡例を付けます。",
        "枠に番号を付け、選択中・使用可否・待ち時間を区別します。",
        "開始操作を明確にし、「続きから」が選べない理由を示します。",
        "「再開」を見つけやすくし、設定を開いてもプレイ状態を保持します。",
        "編集中と適用済みの値を分けます。この見本は端末の設定を変更しません。",
        "所持品の選択枠に詳細欄と「使う」操作を組み合わせます。",
        "話者・本文・選択肢を分け、選択肢を読みやすく操作しやすくします。",
        "進行中と完了済みの課題を分け、進捗と選択中の課題を示します。",
        "操作の結果を明記します。取消では保持し、確定では一度だけ処理します。",
        "結果・正確な得点・次の操作を、重要度に合わせて配置します。",
        "分かる範囲の進捗とエラーの理由、再試行する操作を示します。",
        "小さな出来事は操作を妨げない通知にします。補足表示はキーボードでも開けるようにします。"};
    VisualElement root,overlay,shell,preview,modalLayer;UIDocument[] identityDocuments;Button launcher,modalOpener;Label feedback;
    bool open,modal;int pattern,health=100,ammo=12,objective=1,slot=1,volume=60,appliedVolume=60,item=1,progress,backgroundClicks,items=3;bool fullscreen,appliedFullscreen,completed,error,toast;string result="準備完了";
    [Serializable] public class Control{public string action;public float x,y;}
    [Serializable] public class State{public bool open,modal,error,completed,toast;public int pattern,count,health,ammo,objective,slot,volume,appliedVolume,item,progress,backgroundClicks,items;public string title,result,focus,previewText;public float[] bars;public Control[] buttons;}
    void Start()
    {
        if(!galleryAsset||!galleryStyle){Debug.LogError("Assign the gallery UXML and USS",this);enabled=false;return;}
        root=GetComponent<UIDocument>().rootVisualElement;identityDocuments=FindObjectsByType<CourseIdentityOverlay>(FindObjectsSortMode.None).Select(c=>c.GetComponent<UIDocument>()).ToArray();
        launcher=new Button(()=>SetOpen(true)){text="HUD・UIギャラリー（14種類）",name="gallery-open"};
        launcher.style.position=Position.Absolute;launcher.style.left=12;launcher.style.bottom=12;launcher.style.width=270;launcher.style.height=38;launcher.style.color=Color.black;launcher.style.backgroundColor=(Color)new Color32(244,232,161,255);root.Add(launcher);
        var tree=galleryAsset.Instantiate();tree.style.position=Position.Absolute;tree.style.left=0;tree.style.right=0;tree.style.top=0;tree.style.bottom=0;tree.styleSheets.Add(galleryStyle);root.Add(tree);overlay=tree;
        shell=tree.Q("gallery-shell");preview=tree.Q("gallery-preview");feedback=tree.Q<Label>("gallery-feedback");
        tree.Q<Button>("gallery-prev").clicked+=()=>Select((pattern+13)%14);
        tree.Q<Button>("gallery-next").clicked+=()=>Select((pattern+1)%14);
        tree.Q<Button>("gallery-reset").clicked+=ResetExample;
        tree.Q<Button>("gallery-close").clicked+=()=>SetOpen(false);
        var catalog=tree.Q<ScrollView>("gallery-catalog");for(int i=0;i<14;i++){int index=i;Add(catalog,"pattern-"+i,$"{i+1:00} {Titles[i]}",()=>Select(index));}

        root.RegisterCallback<GeometryChangedEvent>(_=>ApplyLayout());Select(0);SetOpen(false);ApplyLayout();
    }
    void Update(){if(open && Keyboard.current!=null && Keyboard.current.escapeKey.wasPressedThisFrame){if(modal)CloseModal(false);else SetOpen(false);}}
    void ApplyLayout(){if(overlay==null||root.panel==null)return;bool compact=root.panel.visualTree.worldBound.width<650;overlay.EnableInClassList("compact",compact);overlay.Q<ScrollView>("gallery-catalog").style.display=compact?DisplayStyle.None:DisplayStyle.Flex;}
    void SetOpen(bool value){if(modal)CloseModal(false);open=value;foreach(var d in identityDocuments)d.rootVisualElement.style.display=value?DisplayStyle.None:DisplayStyle.Flex;root.Q("panel")?.SetEnabled(!value);launcher.SetEnabled(!value);overlay.style.display=value?DisplayStyle.Flex:DisplayStyle.None;if(value)overlay.Q<Button>("gallery-next").Focus();else launcher.Focus();}
    void Select(int index){if(modal)CloseModal(false);pattern=index;foreach(var b in overlay.Q<ScrollView>("gallery-catalog").Query<Button>().ToList())b.EnableInClassList("selected",b.name=="pattern-"+index);ResetExample();}
    void ResetExample(){health=100;ammo=12;objective=1;slot=1;volume=appliedVolume=60;fullscreen=appliedFullscreen=false;item=1;progress=0;backgroundClicks=0;items=3;completed=error=toast=false;result="準備完了";Render();}
    Label Text(VisualElement parent,string value,string css="demo-small"){var l=new Label(value);l.AddToClassList(css);parent.Add(l);return l;}
    VisualElement Box(VisualElement parent,string css="demo-card"){var v=new VisualElement();v.AddToClassList(css);parent.Add(v);return v;}
    Button Add(VisualElement parent,string name,string label,Action action){var b=new Button(()=>{action();var target=root?.Q<Button>(name);if(target!=null&&target.enabledInHierarchy)target.Focus();}){text=label,name=name};parent.Add(b);return b;}
    ProgressBar Bar(VisualElement parent,string title,int value,string extra=""){var b=new ProgressBar{lowValue=0,highValue=100,value=value,title=title};b.AddToClassList("demo-bar");if(extra!="")b.AddToClassList(extra);parent.Add(b);return b;}
    void Change(string text){result=text;Render();}
    void Render()
    {
        preview.Clear();overlay.Q<Label>("gallery-pattern").text=$"{pattern+1:00} / 14  {Titles[pattern]}";overlay.Q<Label>("gallery-purpose").text=Purposes[pattern];
        overlay.Q<Label>("gallery-guidance").text="確認点：目的・情報の優先順位・配置・フォーカス・空欄・無効・エラー状態。値はこの見本内だけで使います。";
        switch(pattern)
        {
            case 0:
                Text(preview,"配置見本 ／ ゲーム画面", "hud-watermark");var vitals=Box(preview,"hud-vitals");Text(vitals,"プレイヤー01");Bar(vitals,$"体力 {health} / 100",health);Bar(vitals,"スタミナ 60 / 100",60,"stamina");var actions=Box(preview,"hud-actions");
                Add(actions,"damage","25ダメージを受ける",()=>{health=Mathf.Max(0,health-25);Change("被ダメージ：体力の数値とバーを更新しました");});Add(actions,"heal","体力を100に戻す",()=>{health=100;Change("体力を回復しました");});break;
            case 1:
                Text(preview,"配置見本 ／ ゲーム画面", "hud-watermark");Text(preview,"[ + ]", "hud-crosshair");var combat=Box(preview,"hud-ammo");
                Text(combat,$"装填数 {ammo} / 12", "demo-value");Text(combat,"予備弾 48");var fireControls=Box(preview,"hud-controls");
                Add(fireControls,"fire","1発撃つ",()=>{if(ammo>0){ammo--;Change("発射しました");}else Change("弾切れ：再装填してください");});Add(fireControls,"reload","再装填",()=>{ammo=12;Change("再装填しました");});break;
            case 2:
                Text(preview,"配置見本 ／ ゲーム画面", "hud-watermark");var map=Box(preview,"hud-map");Text(map,"北 ↑", "demo-value");Text(map,"[P] -- [A] -- [G]", "demo-value");Text(map,"P：プレイヤー ／ A：端末 ／ G：出口");
                var task=Box(preview,"hud-objective");Text(task,$"目標 {objective} / 3", "demo-value");Text(task,new[]{"端末Aへ移動する","端末Aを起動する","出口Gへ移動する"}[objective-1]);Add(task,"advance","次の目標へ",()=>{objective=Mathf.Min(3,objective+1);Change("目標が進みました");});break;
            case 3:
                Text(preview,"配置見本 ／ ゲーム画面", "hud-watermark");Text(preview,"番号付きの操作枠");var hotbar=Box(preview,"hud-hotbar");for(int i=1;i<=4;i++){int n=i;var b=Add(hotbar,"slot-"+i,$"[{i}] {(i==4?"未解放":i==3?"2.0s":i==slot?"選択中":"準備完了")}",()=>{slot=n;Change("選択した枠："+n);});b.SetEnabled(i<3);}Text(preview,"枠3と4は使用不可です：待ち時間中／未解放。");break;
            case 4:
                Text(preview,"軌道ステーション", "demo-title");Text(preview,"探索ゲームの見本");Add(preview,"new-game","はじめから",()=>Change("開始を選択しました"));Add(preview,"continue","続きから（データなし）",()=>{}).SetEnabled(false);Add(preview,"title-settings","設定",()=>Select(6));break;
            case 5:
                Text(preview,"一時停止中", "demo-title");Text(preview,"一時停止画面の見本です。ギャラリーはUnityのゲームループを停止しません。");Add(preview,"resume","再開",()=>Change("再開を選択しました"));Add(preview,"pause-settings","設定",()=>Select(6));Add(preview,"return-title","タイトルへ戻る",()=>Select(4));break;
            case 6:
                Text(preview,"設定", "demo-title");var slider=new SliderInt("音量",0,100){value=volume,name="volume-slider",showInputField=true};preview.Add(slider);var valueLabel=Text(preview,$"編集中 {volume}% ／ 適用済み {appliedVolume}%");slider.RegisterValueChangedCallback(e=>{volume=e.newValue;valueLabel.text=$"編集中 {volume}% ／ 適用済み {appliedVolume}%";});
                var toggle=new Toggle("全画面（見本）"){value=fullscreen,name="fullscreen-toggle"};toggle.RegisterValueChangedCallback(e=>fullscreen=e.newValue);preview.Add(toggle);
                var optionRow=Box(preview,"demo-row");Add(optionRow,"volume-down","-10",()=>{volume=Mathf.Max(0,volume-10);Render();});Add(optionRow,"volume-up","+10",()=>{volume=Mathf.Min(100,volume+10);Render();});Add(optionRow,"apply","適用",()=>{appliedVolume=volume;appliedFullscreen=fullscreen;Change($"音量 {volume}% を適用 ／ 全画面 {(appliedFullscreen?"有効":"無効")}（見本内のみ）");});break;
            case 7:
                Text(preview,"所持品", "demo-title");var inventory=Box(preview,"demo-row");var grid=Box(inventory,"inventory-grid");for(int i=1;i<=6;i++){int n=i;Add(grid,"item-"+i,i<=3?$"[{i}] アイテム{i}":$"[{i}] 空欄",()=>{item=n;Change(n<=3?"アイテムを選択しました":"空の枠です");});}
                var detail=Box(inventory,"inventory-detail");Text(detail,item<=3?$"アイテム{item} ／ 回復 +25 ／ 所持数 {items}":"この枠は空です", "demo-value");Add(detail,"use-item","選択した物を使う",()=>{items=Mathf.Max(0,items-1);Change("1個使いました");}).SetEnabled(item<=3&&items>0);break;
            case 8:
                Text(preview,"技術者ミラ", "demo-title");Text(preview,"東門は閉まっています。どちらへ進みますか？", "demo-value");Add(preview,"choice-east","東門について聞く",()=>Change("ミラ：端末Aで通行カードを探してください。"));Add(preview,"choice-west","西側の道へ進む",()=>Change("ミラ：目印のある整備通路を進んでください。"));break;
            case 9:
                Text(preview,"クエスト一覧", "demo-title");var tabs=Box(preview,"demo-row");Add(tabs,"active-tab","進行中",()=>{completed=false;Change("進行中の課題");});Add(tabs,"completed-tab","完了済み",()=>{completed=true;Change("完了した課題");});Text(preview,completed?"[完了] 着陸地点を調べる":"[1/3] 電源を復旧する\n[0/2] 修理部品を集める", "demo-value");break;
            case 10:
                Text(preview,"セーブデータ", "demo-title");Text(preview,$"練習用データ：{items}件", "demo-value");Add(preview,"background-action","背面のカウンター："+backgroundClicks,()=>{backgroundClicks++;Change("背面の操作を実行しました");});modalOpener=Add(preview,"open-modal","練習用データを1件削除…",OpenModal);break;
            case 11:
                Text(preview,"ミッション完了", "demo-title");Text(preview,"得点 1,250 ／ 時間 02:34", "demo-value");Bar(preview,"ボーナス 75 / 100",75);Add(preview,"next-level","続ける",()=>Change("次のミッションを選択しました"));Add(preview,"retry-result","再試行",()=>Change("再試行を選択しました"));break;
            case 12:
                Text(preview,error?"読込失敗":"読込中", "demo-title");Bar(preview,$"{progress} / 100",progress);Text(preview,error?"接続が切れました。進捗は保持されています。":progress==100?"次へ進めます":"次のエリアを準備中です。進捗は見本です。");
                Add(preview,"load-step","25%進める",()=>{progress=Mathf.Min(100,progress+25);Change(progress==100?"読込完了":"読込中…");}).SetEnabled(!error&&progress<100);Add(preview,"load-error","エラーを試す",()=>{error=true;Change("エラー：再試行できます");});Add(preview,"load-retry","再試行",()=>{error=false;progress=0;Change("再試行を開始しました");}).SetEnabled(error);break;
            case 13:
                Text(preview,"通知と補足", "demo-title");Add(preview,"show-toast","鍵を拾う",()=>{toast=true;Change("鍵を入手しました：操作を妨げない通知");});
                if(toast){var notice=Box(preview);Text(notice,"[完了] 所持品に鍵を追加しました", "demo-value");Add(notice,"dismiss-toast","通知を閉じる",()=>{toast=false;Change("通知を閉じました");root.Q<Button>("show-toast").Focus();});}
                var tip=Text(preview,"「ヘルプ」にフォーカスするか、マウスを重ねて補足を読みます。");var help=Add(preview,"tooltip-help","ヘルプ [?]",()=>{tip.text="鍵で目印のある門を開けます。Enterキーでもヘルプを開けます。";result="ヘルプを表示中";});help.RegisterCallback<FocusInEvent>(_=>tip.text="鍵で目印のある門を開けます。");help.RegisterCallback<MouseEnterEvent>(_=>tip.text="鍵で目印のある門を開けます。");break;
        }
        feedback.text="状態："+result;
    }
    void OpenModal(){if(modal)return;modal=true;shell.SetEnabled(false);modalLayer=Box(overlay,"demo-modal-backdrop");var box=Box(modalLayer,"demo-modal");Text(box,"練習用データを1件削除しますか？", "demo-title");Text(box,"見本データを1件削除します。取消を選ぶと現在の件数を保持します。");Add(box,"modal-cancel","取消",()=>CloseModal(false)).Focus();Add(box,"modal-confirm","1件削除",()=>CloseModal(true));}
    void CloseModal(bool confirm){if(!modal)return;modal=false;modalLayer.RemoveFromHierarchy();shell.SetEnabled(true);if(confirm){items=Mathf.Max(0,items-1);result="見本データを1件削除しました";Render();}else{result="取り消しました：変更なし";feedback.text="状態："+result;}modalOpener?.Focus();}
    public State Capture(){if(root?.panel==null||launcher==null)return null;var size=root.panel.visualTree.worldBound;var controls=new List<Control>();foreach(var b in root.Query<Button>().ToList()){var r=b.worldBound;if(r.width<=0||r.height<=0||!b.visible||!b.enabledInHierarchy)continue;float x=r.center.x/size.width,y=r.center.y/size.height;if(float.IsFinite(x)&&float.IsFinite(y)&&x>=0&&x<=1&&y>=0&&y<=1)controls.Add(new Control{action=b.name,x=x,y=y});}return new State{open=open,modal=modal,error=error,completed=completed,toast=toast,pattern=pattern,count=14,health=health,ammo=ammo,objective=objective,slot=slot,volume=volume,appliedVolume=appliedVolume,item=item,progress=progress,backgroundClicks=backgroundClicks,items=items,title=Titles[pattern],result=result,previewText=string.Join(" | ",preview.Query<Label>().ToList().Select(l=>l.text)),bars=preview.Query<ProgressBar>().ToList().Select(b=>b.value).ToArray(),focus=(root.focusController.focusedElement as VisualElement)?.name,buttons=controls.ToArray()};}
}
