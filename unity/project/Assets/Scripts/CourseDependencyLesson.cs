using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument)),DisallowMultipleComponent]
public sealed class CourseDependencyLesson : MonoBehaviour
{
    [InspectorName("展示物")] public GameObject exhibit;
    [InspectorName("指定の移動先")] public CourseDestination intendedDestination;
    Label status;
    readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    [Serializable] public class ActionButton {public string action;public float x,y;}
    [Serializable] public class State {public bool valid,attached,enabled;public string reason,target;public ActionButton[] buttons;}
    public static bool Check(GameObject actor,CourseDestination intended,out string reason)
    {
        if(!actor){reason="Exhibit reference missing";return false;}
        if(!actor.activeInHierarchy){reason="Exhibit inactive";return false;}
        if(!actor.TryGetComponent<SafeExhibitDriver>(out var driver)){reason="SafeExhibitDriver not attached";return false;}
        if(actor.GetComponents<SafeExhibitDriver>().Length!=1){reason="Duplicate SafeExhibitDriver";return false;}
        if(!driver.Check(out reason))return false;
        if(!intended || driver.Destination!=intended){reason="Destination differs from scene contract D";return false;}
        if(!driver.enabled){reason="SafeExhibitDriver disabled";return false;}
        return true;
    }
    public bool Check(out string reason)=>Check(exhibit,intendedDestination,out reason);
    void OnEnable()
    {
        if(!Application.isPlaying)return;
        var root=GetComponent<UIDocument>().rootVisualElement;root.Clear();buttons.Clear();
        var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=620;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=16;
        panel.style.paddingLeft=16;panel.style.paddingRight=16;panel.style.paddingTop=12;panel.style.paddingBottom=12;
        panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label("コンポーネントの依存関係 / U28");title.style.whiteSpace=WhiteSpace.Normal;title.style.color=Color.white;title.style.fontSize=22;title.style.whiteSpace=WhiteSpace.Normal;panel.Add(title);
        status=new Label();status.name="status";status.style.color=Color.white;status.style.fontSize=18;status.style.whiteSpace=WhiteSpace.Normal;status.style.marginTop=12;panel.Add(status);
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;row.style.marginTop=12;panel.Add(row);
        Add(row,"check","確認",()=>Refresh());Add(row,"clear","参照を外す",()=>Assign(null));Add(row,"restore","Dへの参照を戻す",()=>Assign(intendedDestination));Refresh();
    }
    void Add(VisualElement parent,string key,string text,Action action)
    {var b=new Button(action){text=text,name="dependency-"+key};b.style.width=170;b.style.height=38;b.style.marginRight=8;b.style.color=new Color(.02f,.03f,.04f);b.style.backgroundColor=new Color(.96f,.91f,.63f);parent.Add(b);buttons.Add(key,b);}
    void Assign(CourseDestination value){if(exhibit && exhibit.TryGetComponent<SafeExhibitDriver>(out var driver))driver.Configure(value);Refresh();}
    void Refresh(){if(status!=null)status.text=(Check(out var reason)?"確認済み：":"実行停止：")+CourseJapanese.Text(reason);}
    void Update(){Refresh();}
    public State Capture()
    {
        var root=GetComponent<UIDocument>().rootVisualElement;
        if(root.panel==null || buttons.Count!=3)return null;
        var bounds=root.panel.visualTree.worldBound;if(!(bounds.width>0 && bounds.height>0))return null;
        var values=new List<ActionButton>();
        foreach(var pair in buttons){var rect=pair.Value.worldBound;float x=rect.center.x/bounds.width,y=rect.center.y/bounds.height;if(!(rect.width>0 && rect.height>0)||float.IsNaN(x)||float.IsInfinity(x)||float.IsNaN(y)||float.IsInfinity(y))return null;values.Add(new ActionButton{action=pair.Key,x=x,y=y});}
        SafeExhibitDriver driver=null;bool attached=exhibit && exhibit.TryGetComponent(out driver);
        return new State {valid=Check(out var reason),reason=reason,attached=attached,enabled=driver && driver.enabled,target=driver && driver.Destination?driver.Destination.name:"NONE",buttons=values.ToArray()};
    }
}
