using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public class CourseGameLesson : MonoBehaviour
{
    [InspectorName("ゲームルール")] public CourseGameRules rules;
    [InspectorName("シーン再読込後も保持")] public bool keepAcrossSceneReload;
    CourseSessionRoot app;
    VisualElement root;
    Label phase,score,saved,ownership,status;
    readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    [Serializable] public class ActionButton {public string action;public float x,y;}
    [Serializable] public class State
    {public string phase,saveStatus;public int score,best,runs,pending,roots,sceneInstance,saveRevision;public bool saving,keep;public ActionButton[] buttons;}
    void OnEnable()
    {
        if(!Application.isPlaying)return;
        app=CourseSessionRoot.Ensure(rules);if(!keepAcrossSceneReload)app.NewSession();
        root=GetComponent<UIDocument>().rootVisualElement;root.Clear();buttons.Clear();
        var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=620;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=16;
        panel.style.paddingLeft=16;panel.style.paddingRight=16;panel.style.paddingTop=12;panel.style.paddingBottom=12;
        panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=Line(panel,"ゲームループ・セッション・セーブ");title.style.fontSize=22;
        phase=Line(panel,"");score=Line(panel,"");saved=Line(panel,"");ownership=Line(panel,"");
        status=Line(panel,"");status.name="status";
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"start","開始",app.StartRun);Add(row,"collect","+1",app.Collect);Add(row,"finish","結果と保存",app.Finish);Add(row,"retry","再試行",app.Retry);
        Add(row,"reload","シーンを再読込",()=>{if(!app.Saving)SceneManager.LoadSceneAsync(SceneManager.GetActiveScene().buildIndex);});
        Add(row,"reset","新しいセッション",app.NewSession);Add(row,"save","保存",app.Save);Add(row,"load","読込",app.Load);
        var note=Line(panel,"SO：ルール ／ セッション：メモリ ／ JSON：保存データ");note.style.fontSize=15;
        app.Changed+=Refresh;Refresh();
    }
    static Label Line(VisualElement parent,string text)
    {var label=new Label(text);label.style.color=Color.white;label.style.fontSize=18;label.style.marginBottom=7;label.style.whiteSpace=WhiteSpace.Normal;parent.Add(label);return label;}
    void Add(VisualElement parent,string action,string text,Action handler)
    {
        var button=new Button(handler){text=text,name="loop-"+action};button.style.width=140;button.style.height=38;button.style.marginRight=5;button.style.marginBottom=6;
        button.style.backgroundColor=CourseColor("#F4E8A1");button.style.color=CourseColor("#101820");button.style.fontSize=17;parent.Add(button);buttons.Add(action,button);
    }
    static Color CourseColor(string hex){ColorUtility.TryParseHtmlString(hex,out var color);return color;}
    void Refresh()
    {
        phase.text="状態："+CourseJapanese.Text(app.Phase.ToString());score.text=$"今回の得点：{app.Score} / {app.Target}";
        saved.text=$"保存済み最高点：{app.SavedBest} ／ 完了：{app.SavedRuns}回 ／ 未保存：{app.PendingRuns}回";
        ownership.text=$"シーン再読込時の保持：{(keepAcrossSceneReload?"有効":"無効")} ／ 管理元：{UnityEngine.Object.FindObjectsByType<CourseSessionRoot>(FindObjectsSortMode.None).Length}個 ／ 画面ID：{GetInstanceID()}";
        status.text="保存状態："+CourseJapanese.Text(app.StorageStatus);
        foreach(var button in buttons.Values)button.SetEnabled(!app.Saving);
        buttons["start"].SetEnabled(!app.Saving && app.Phase==CoursePhase.Title);
        buttons["collect"].SetEnabled(!app.Saving && app.Phase==CoursePhase.Playing);
        buttons["finish"].SetEnabled(!app.Saving && app.Phase==CoursePhase.Playing && app.Score>=app.Target);
        buttons["retry"].SetEnabled(!app.Saving && app.Phase==CoursePhase.Result);
    }
    void OnDisable(){if(app)app.Changed-=Refresh;}
    public State Capture()
    {
        if(!app || root==null || root.panel==null)return null;
        var values=new List<ActionButton>();var bounds=root.panel.visualTree.worldBound;
        if(!(bounds.width>0 && bounds.height>0))return null;
        foreach(var entry in buttons)
        {
            var rect=entry.Value.worldBound;
            float x=rect.center.x/bounds.width,y=rect.center.y/bounds.height;
            // UI Toolkit can expose an unresolved rectangle on the first frame after loading.
            if(!(rect.width>0 && rect.height>0) || float.IsNaN(x) || float.IsInfinity(x) || float.IsNaN(y) || float.IsInfinity(y))return null;
            values.Add(new ActionButton {action=entry.Key,x=x,y=y});
        }
        return new State {phase=app.Phase.ToString(),saveStatus=app.StorageStatus,score=app.Score,best=app.SavedBest,runs=app.SavedRuns,
            pending=app.PendingRuns,saving=app.Saving,saveRevision=app.SaveRevision,keep=keepAcrossSceneReload,roots=UnityEngine.Object.FindObjectsByType<CourseSessionRoot>(FindObjectsSortMode.None).Length,sceneInstance=GetInstanceID(),buttons=values.ToArray()};
    }
}
