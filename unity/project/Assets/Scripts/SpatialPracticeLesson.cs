using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public sealed class SpatialPracticeLesson : MonoBehaviour
{
    [InspectorName("操作キャラクター")] public CharacterController actor;
    [InspectorName("目標")] public Transform goal;
    [InspectorName("外観部品の親")] public GameObject kitRoot;
    [InspectorName("当たり判定の壁")] public Renderer[] blockoutWalls;
    [InspectorName("キットバッシュ")] public bool kitbash;
    Vector3 origin;Label status;bool skin=true;string last="READY";
    readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    [Serializable] public class Control{public string action;public float x,y;}
    [Serializable] public class State{public bool reached,kitVisible;public float x,z;public int kitParts;public string last;public Control[] buttons;}
    void OnEnable()
    {
        if(!Application.isPlaying)return;
        if(!actor || !goal || blockoutWalls==null || blockoutWalls.Length!=2){Debug.LogError("Spatial lesson: assign actor, goal and two wall renderers",this);enabled=false;return;}
        origin=actor.transform.position;buttons.Clear();
        var root=GetComponent<UIDocument>().rootVisualElement;root.Clear();
        var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=680;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=12;panel.style.paddingLeft=12;panel.style.paddingTop=10;panel.style.paddingBottom=10;panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label(kitbash?"キットバッシュ / U31":"グレイボックス / U30");title.style.whiteSpace=WhiteSpace.Normal;title.style.color=Color.white;title.style.fontSize=21;panel.Add(title);
        status=new Label();status.name="status";status.style.whiteSpace=WhiteSpace.Normal;status.style.color=Color.white;status.style.fontSize=17;panel.Add(status);
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"forward","前進 +Z",()=>Step(Vector3.forward*.5f));Add(row,"back","後退 -Z",()=>Step(Vector3.back*.5f));Add(row,"left","左 -X",()=>Step(Vector3.left*.5f));Add(row,"right","右 +X",()=>Step(Vector3.right*.5f));Add(row,"reset","初期状態に戻す",ResetActor);
        if(kitbash)Add(row,"skin","外観 表示 / 非表示",()=>{if(!kitRoot){last="NO KIT IN START";return;}skin=!skin;ApplySkin();});
        ApplySkin();Refresh();
    }
    void Add(VisualElement row,string key,string text,Action action){var button=new Button(action){text=text};button.style.width=125;button.style.height=32;button.style.marginRight=5;button.style.color=new Color(.02f,.03f,.04f);button.style.backgroundColor=new Color(.96f,.91f,.63f);row.Add(button);buttons.Add(key,button);}
    void ApplySkin(){if(!kitRoot)return;kitRoot.SetActive(skin);foreach(var wall in blockoutWalls)wall.enabled=true;}
    void ResetActor(){actor.enabled=false;actor.transform.position=origin;actor.enabled=true;last="RESET";Refresh();}
    void Step(Vector3 delta){var before=actor.transform.position;actor.Move(delta);last=(actor.transform.position-before).magnitude<delta.magnitude*.4f?"BLOCKED":"MOVED";Refresh();}
    bool Reached(){var delta=actor.transform.position-goal.position;delta.y=0;return delta.magnitude<.7f;}
    void Refresh(){if(status!=null)status.text=(Reached()?"目標に到着":CourseJapanese.Text(last))+" ／ WASDキー・ボタンで0.5m移動"+(kitbash?" ／ 外観 "+(kitRoot?(skin?"表示":"非表示"):"なし"):"");}
    void Update()
    {
        if(Keyboard.current!=null){var k=Keyboard.current;var move=new Vector3((k.dKey.isPressed?1:0)-(k.aKey.isPressed?1:0),0,(k.wKey.isPressed?1:0)-(k.sKey.isPressed?1:0));if(move.sqrMagnitude>0)Step(move.normalized*(2.5f*Time.deltaTime));}
        Refresh();
    }
    public State Capture()
    {
        var root=GetComponent<UIDocument>().rootVisualElement;if(root.panel==null)return null;var bounds=root.panel.visualTree.worldBound;
        var controls=new List<Control>();foreach(var pair in buttons){var rect=pair.Value.worldBound;float x=rect.center.x/bounds.width,y=rect.center.y/bounds.height;if(!(rect.width>0&&rect.height>0)||float.IsNaN(x)||float.IsInfinity(x)||float.IsNaN(y)||float.IsInfinity(y))return null;controls.Add(new Control{action=pair.Key,x=x,y=y});}
        return new State{reached=Reached(),kitVisible=kitRoot&&kitRoot.activeSelf,kitParts=kitRoot&&kitRoot.activeSelf?kitRoot.GetComponentsInChildren<MeshRenderer>().Length:0,x=actor.transform.position.x,z=actor.transform.position.z,last=last,buttons=controls.ToArray()};
    }
}
