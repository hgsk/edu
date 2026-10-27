using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

// The learner configures geometry and physics in Inspector; this script only supplies the controls.
[RequireComponent(typeof(UIDocument))]
public sealed class PhysicsSandboxLesson : MonoBehaviour
{
    [InspectorName("球")] public Rigidbody ball;
    [InspectorName("斜面")] public Transform ramp;
    [InspectorName("箱・区画数")] public Rigidbody[] blocks;
    [InspectorName("低反発の材質")] public PhysicsMaterial soft;
    [InspectorName("高反発の材質")] public PhysicsMaterial bouncy;
    Vector3[] positions;Quaternion[] rotations;
    bool running, steep, highBounce;
    Label status; readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    [Serializable] public class Control {public string action;public float x,y;}
    [Serializable] public class State {public bool running,steep,highBounce;public int moved;public float ballY,angle,restitution,speed;public int bodies;public Control[] buttons;}
    Rigidbody[] Bodies {get {var list=new List<Rigidbody>{ball};list.AddRange(blocks);return list.ToArray();}}
    void OnEnable()
    {
        if(!Application.isPlaying)return;
        if(!ball || !ramp || blocks==null || blocks.Length!=3 || Array.Exists(blocks,b=>!b || !b.GetComponent<Collider>()) || !ball.GetComponent<Collider>() || !ramp.GetComponent<Collider>() || !soft || !bouncy){enabled=false;Debug.LogError("U29: wire ball, ramp, three blocks and Physics Materials",this);return;}
        var bodies=Bodies;positions=new Vector3[bodies.Length];rotations=new Quaternion[bodies.Length];
        for(int i=0;i<bodies.Length;i++){positions[i]=bodies[i].position;rotations[i]=bodies[i].rotation;}
        var root=GetComponent<UIDocument>().rootVisualElement;root.Clear();buttons.Clear();
        var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=660;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=12;panel.style.paddingLeft=12;panel.style.paddingTop=10;panel.style.paddingBottom=10;panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label("物理サンドボックス / U29");title.style.whiteSpace=WhiteSpace.Normal;title.style.color=Color.white;title.style.fontSize=21;panel.Add(title);
        status=new Label();status.name="status";status.style.color=Color.white;status.style.whiteSpace=WhiteSpace.Normal;status.style.fontSize=17;panel.Add(status);
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"drop","落下開始",()=>{if(running)return;foreach(var body in Bodies){body.isKinematic=false;body.WakeUp();}running=true;});
        Add(row,"reset","初期状態に戻す",ResetBodies);
        Add(row,"tilt","傾斜 15° / 30°",()=>{if(running)return;steep=!steep;ramp.localEulerAngles=new Vector3(0,0,steep?-30:-15);});
        Add(row,"bounce","反発 弱 / 強",()=>{if(running)return;highBounce=!highBounce;ball.GetComponent<Collider>().sharedMaterial=highBounce?bouncy:soft;});
        ResetBodies();
    }
    void Add(VisualElement row,string key,string caption,Action action){var b=new Button(action){text=caption};b.style.width=148;b.style.height=34;b.style.marginRight=6;b.style.color=new Color(.02f,.03f,.04f);b.style.backgroundColor=new Color(.96f,.91f,.63f);row.Add(b);buttons.Add(key,b);}
    void ResetBodies()
    {
        var bodies=Bodies;
        for(int i=0;i<bodies.Length;i++){var body=bodies[i];if(!body.isKinematic){body.linearVelocity=Vector3.zero;body.angularVelocity=Vector3.zero;}body.isKinematic=true;body.position=positions[i];body.rotation=rotations[i];body.Sleep();}
        running=false;Physics.SyncTransforms();
    }
    float MaxSpeed(){float value=0;foreach(var b in Bodies)value=Mathf.Max(value,b.linearVelocity.magnitude+b.angularVelocity.magnitude);return value;}
    int Moved(){int n=0;for(int i=0;i<blocks.Length;i++)if(Vector3.Distance(blocks[i].position,positions[i+1])>.2f || Quaternion.Angle(blocks[i].rotation,rotations[i+1])>15)n++;return n;}
    void Update(){if(status!=null)status.text=(running?"物理演算中":"編集・待機中")+" ／ 傾斜 "+Mathf.RoundToInt(Mathf.Abs(Mathf.DeltaAngle(0,ramp.eulerAngles.z)))+"° ／ 反発 "+(highBounce?"強":"弱")+" ／ 動いた箱 "+Moved()+"/3";}
    public State Capture()
    {
        if(positions==null)return null;var root=GetComponent<UIDocument>().rootVisualElement;if(root.panel==null)return null;var bounds=root.panel.visualTree.worldBound;
        var controls=new List<Control>();foreach(var pair in buttons){var rect=pair.Value.worldBound;float x=rect.center.x/bounds.width,y=rect.center.y/bounds.height;if(!(rect.width>0 && rect.height>0)||float.IsNaN(x)||float.IsInfinity(x)||float.IsNaN(y)||float.IsInfinity(y))return null;controls.Add(new Control{action=pair.Key,x=x,y=y});}
        return new State{running=running,steep=steep,highBounce=highBounce,moved=Moved(),ballY=ball.position.y,angle=Mathf.Abs(Mathf.DeltaAngle(0,ramp.eulerAngles.z)),restitution=ball.GetComponent<Collider>().sharedMaterial.bounciness,speed=MaxSpeed(),bodies=Bodies.Length,buttons=controls.ToArray()};
    }
}
