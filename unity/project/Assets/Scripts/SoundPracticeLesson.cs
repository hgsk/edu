using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Audio;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public sealed class SoundPracticeLesson : MonoBehaviour
{
    [InspectorName("音楽")] public AudioSource music;
    [InspectorName("環境音")] public AudioSource ambience;
    [InspectorName("操作音")] public AudioSource cue;
    [InspectorName("音量ミキサー")] public AudioMixer mixer;
    [InspectorName("聞く位置")] public Transform listener;
    bool started,far,quiet,muted,solo;int cues;Label status;
    readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    [Serializable] public class Control{public string action;public float x,y;}
    [Serializable] public class State{public bool started,musicPlaying,ambiencePlaying,far,solo;public float blend,distance,musicDb,masterDb;public int cues;public Control[] buttons;}
    void Start()
    {
        if(!music||!ambience||!cue||!mixer||!listener){Debug.LogError("Sound lesson: assign all sources, mixer and listener",this);enabled=false;return;}
        mixer.SetFloat("MusicGain",0);mixer.SetFloat("MasterGain",0);
        var root=GetComponent<UIDocument>().rootVisualElement;root.Clear();var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=680;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=12;panel.style.paddingLeft=12;panel.style.paddingTop=10;panel.style.paddingBottom=10;panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label("サウンド / U33");title.style.whiteSpace=WhiteSpace.Normal;title.style.color=Color.white;title.style.fontSize=21;panel.Add(title);status=new Label {name="status"};status.style.color=Color.white;status.style.fontSize=17;status.style.whiteSpace=WhiteSpace.Normal;panel.Add(status);
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"play","再生 / 停止",()=>{started=!started;if(started){music.Play();ambience.Play();}else{music.Stop();ambience.Stop();cue.Stop();}});
        Add(row,"cue","UI操作音",()=>{cue.PlayOneShot(cue.clip);cues++;});
        Add(row,"distance","聞く位置 近 / 遠",()=>{far=!far;listener.position=new Vector3(far?6:-1,1,0);});
        Add(row,"music","音楽 0 / -12dB",()=>{quiet=!quiet;mixer.SetFloat("MusicGain",quiet?-12:0);});
        Add(row,"master","全体ミュート切替",()=>{muted=!muted;mixer.SetFloat("MasterGain",muted?-80:0);});
        Add(row,"solo","立体音のみ聞く",()=>{solo=!solo;music.mute=solo;});
    }
    void Add(VisualElement row,string key,string text,Action action){var b=new Button(action){text=text};b.style.width=150;b.style.height=32;b.style.marginRight=5;b.style.color=Color.black;b.style.backgroundColor=new Color(.96f,.91f,.63f);row.Add(b);buttons.Add(key,b);}
    void Update(){if(status!=null){mixer.GetFloat("MusicGain",out float gain);mixer.GetFloat("MasterGain",out float master);status.text=$"{(started?"再生中":"停止中")} ／ 立体音の割合 {ambience.spatialBlend:0} ／ 聞く位置 {(far?"遠い":"近い")} ／ 音楽 {gain:0}dB・全体 {master:0}dB";}}
    public State Capture(){if(!mixer||buttons.Count==0)return null;var root=GetComponent<UIDocument>().rootVisualElement;if(root.panel==null)return null;var size=root.panel.visualTree.worldBound;var controls=new List<Control>();foreach(var p in buttons){var r=p.Value.worldBound;float x=r.center.x/size.width,y=r.center.y/size.height;if(!(r.width>0&&r.height>0)||!float.IsFinite(x)||!float.IsFinite(y))return null;controls.Add(new Control{action=p.Key,x=x,y=y});}mixer.GetFloat("MusicGain",out float gain);mixer.GetFloat("MasterGain",out float master);return new State{started=started,musicPlaying=music.isPlaying,ambiencePlaying=ambience.isPlaying,far=far,solo=solo,blend=ambience.spatialBlend,distance=Vector3.Distance(listener.position,ambience.transform.position),musicDb=gain,masterDb=master,cues=cues,buttons=controls.ToArray()};}
}
