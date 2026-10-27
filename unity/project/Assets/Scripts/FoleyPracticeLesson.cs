using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

[RequireComponent(typeof(Animator),typeof(AudioSource))]
public sealed class FoleyPracticeLesson : MonoBehaviour
{
    [InspectorName("UIドキュメント")] public UIDocument document;
    [InspectorName("接地時の制御")] public RuntimeAnimatorController contactController;
    [InspectorName("早めの制御")] public RuntimeAnimatorController earlyController;
    [InspectorName("コンクリートの足音")] public AudioClip[] concrete;
    [InspectorName("木の足音")] public AudioClip[] wood;
    [InspectorName("左足")] public Transform leftFoot;
    [InspectorName("右足")] public Transform rightFoot;
    [InspectorName("接地と音を同期")] public bool synchronized;
    Animator animator;AudioSource source;bool walking,wooden,fast;int steps,variant;float lastHeight,pitch=1;string clipName="NONE",lastFoot="NONE";Label status;
    readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    [Serializable] public class Control{public string action;public float x,y;}
    [Serializable] public class State{public bool walking,wooden,synchronized;public int steps,variant;public float height,pitch,speed;public string clip,foot;public Control[] buttons;}
    void Start()
    {
        animator=GetComponent<Animator>();source=GetComponent<AudioSource>();
        if(!source.outputAudioMixerGroup||!document||!contactController||!earlyController||concrete==null||wood==null||concrete.Length!=3||wood.Length!=3||!leftFoot||!rightFoot){Debug.LogError("Foley lesson: assign clips, controllers, UI and feet",this);enabled=false;return;}
        // Each course scene starts independently of the other scene's mixer controls.
        source.outputAudioMixerGroup.audioMixer.SetFloat("MasterGain",0);
        animator.runtimeAnimatorController=synchronized?contactController:earlyController;animator.enabled=false;
        var root=document.rootVisualElement;root.Clear();var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=680;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=12;panel.style.paddingLeft=12;panel.style.paddingTop=10;panel.style.paddingBottom=10;panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label("フォーリー・アニメーションイベント / U34");title.style.whiteSpace=WhiteSpace.Normal;title.style.color=Color.white;title.style.fontSize=21;panel.Add(title);status=new Label {name="status"};status.style.color=Color.white;status.style.fontSize=16;status.style.whiteSpace=WhiteSpace.Normal;panel.Add(status);var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"walk","歩行 / 停止",()=>{walking=!walking;animator.enabled=walking;if(walking)animator.Play("Walk",0,0);else source.Stop();});
        Add(row,"surface","コンクリート / 木",()=>{wooden=!wooden;transform.position=new Vector3(wooden?1.5f:-1.5f,0,0);source.Stop();});
        Add(row,"pace","歩行速度 1 / 1.6",()=>{fast=!fast;animator.speed=fast?1.6f:1;});
        Add(row,"sync","接地時 / 早め",()=>{synchronized=!synchronized;animator.runtimeAnimatorController=synchronized?contactController:earlyController;if(walking)animator.Play("Walk",0,0);});
    }
    void Add(VisualElement row,string key,string text,Action action){var b=new Button(action){text=text};b.style.width=150;b.style.height=32;b.style.marginRight=5;b.style.color=Color.black;b.style.backgroundColor=new Color(.96f,.91f,.63f);row.Add(b);buttons.Add(key,b);}
    // Called by Animation Events on this Animator, never by an Update timer.
    public void FootContact(int foot)
    {
        if(!walking||!source)return;var clips=wooden?wood:concrete;variant=steps%clips.Length;pitch=(steps%2==0)?.96f:1.04f;source.pitch=pitch;source.PlayOneShot(clips[variant]);clipName=clips[variant].name;lastFoot=foot==0?"LEFT":"RIGHT";lastHeight=(foot==0?leftFoot:rightFoot).localPosition.y-.1f;steps++;
    }
    void Update(){if(status!=null)status.text=$"{(walking?"歩行中":"停止中")} | {(synchronized?"接地時":"早め")} | {(wooden?"木":"コンクリート")} ／ 足音 {steps}回 {CourseJapanese.Text(lastFoot)}\n音源：{(clipName=="NONE"?"未再生":clipName)} ／ 音程 {pitch:0.00} ／ 接地からの高さ {lastHeight:0.000} m";}
    public State Capture(){if(!animator||buttons.Count==0||document.rootVisualElement.panel==null)return null;var size=document.rootVisualElement.panel.visualTree.worldBound;var controls=new List<Control>();foreach(var p in buttons){var r=p.Value.worldBound;float x=r.center.x/size.width,y=r.center.y/size.height;if(!(r.width>0&&r.height>0)||!float.IsFinite(x)||!float.IsFinite(y))return null;controls.Add(new Control{action=p.Key,x=x,y=y});}return new State{walking=walking,wooden=wooden,synchronized=synchronized,steps=steps,variant=variant,height=lastHeight,pitch=pitch,speed=animator.speed,clip=clipName,foot=lastFoot,buttons=controls.ToArray()};}
}
