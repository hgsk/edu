using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

// Put this on the same GameObject as the Humanoid Animator.
[RequireComponent(typeof(Animator))]
public sealed class VrmBoneLesson : MonoBehaviour
{
    [InspectorName("目標")] public Transform target;
    [InspectorName("UIドキュメント")] public UIDocument document;
    [InspectorName("IKの重み"),Range(0,1)] public float ikWeight;
    [InspectorName("ボーンを表示")] public bool showBones=true;
    Animator animator; Label status; int callbacks; bool alternate;
    readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    static readonly HumanBodyBones[] chain={HumanBodyBones.RightUpperArm,HumanBodyBones.RightLowerArm,HumanBodyBones.RightHand};
    [InspectorName("ボーンの目印")] public Transform[] markers;
    [Serializable] public class Control {public string action;public float x,y;}
    [Serializable] public class State {public Vector3 hand,shoulder,target;public bool humanoid,bonesVisible;public float weight,distance,phase,footY,leftHandY,leftHandZ;public int callbacks,skinnedMeshes,boneCount;public Control[] buttons;}
    void Start()
    {
        animator=GetComponent<Animator>();
        if(!animator.isHuman||!target||!document||markers==null||markers.Length!=3){Debug.LogError("VRM lesson: valid Humanoid, target, document and 3 markers required",this);enabled=false;return;}
        var root=document.rootVisualElement;root.Clear();var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=680;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=12;panel.style.paddingLeft=12;panel.style.paddingTop=10;panel.style.paddingBottom=10;panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label("VRM・人型ボーン・IK / U32");title.style.whiteSpace=WhiteSpace.Normal;title.style.color=Color.white;title.style.fontSize=21;panel.Add(title);
        status=new Label();status.name="status";status.style.color=Color.white;status.style.fontSize=17;status.style.whiteSpace=WhiteSpace.Normal;panel.Add(status);
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"ik","IK 0 / 1",()=>ikWeight=ikWeight>.5f?0:1);
        Add(row,"target","目標を移動",()=>{alternate=!alternate;target.position=new Vector3(.35f,alternate?1.45f:1.25f,alternate?.25f:.15f);});
        Add(row,"bones","ボーン目印を切替",()=>showBones=!showBones);
        Add(row,"pose","ポーズ 0 / 0.5",()=>{animator.speed=0;float phase=animator.GetCurrentAnimatorStateInfo(0).normalizedTime%1<.25f?.5f:0;animator.Play("Wave",0,phase);});
        Add(row,"play","動きを再生",()=>animator.speed=1);
    }
    void Add(VisualElement row,string key,string text,Action action){var b=new Button(action){text=text};b.style.width=125;b.style.height=32;b.style.marginRight=5;b.style.color=Color.black;b.style.backgroundColor=new Color(.96f,.91f,.63f);row.Add(b);buttons.Add(key,b);}
    void OnAnimatorIK(int layer)
    {
        if(!animator||!target)return;callbacks++;
        animator.SetIKPositionWeight(AvatarIKGoal.RightHand,ikWeight);
        animator.SetIKPosition(AvatarIKGoal.RightHand,target.position);
        animator.SetIKRotationWeight(AvatarIKGoal.RightHand,0);
    }
    void LateUpdate()
    {
        if(!animator)return;
        for(int i=0;i<3;i++){markers[i].GetComponent<Renderer>().enabled=showBones;markers[i].position=animator.GetBoneTransform(chain[i]).position;}
        if(status!=null)status.text=$"IKの重み {ikWeight:0} ／ 手から目標Tまで {Distance():0.000} m ／ ボーン付きメッシュ {GetComponentsInChildren<SkinnedMeshRenderer>().Length}個";
    }
    float Distance()=>Vector3.Distance(animator.GetBoneTransform(HumanBodyBones.RightHand).position,target.position);
    public State Capture()
    {
        if(!animator||buttons.Count==0||document.rootVisualElement.panel==null)return null;
        var size=document.rootVisualElement.panel.visualTree.worldBound;var controls=new List<Control>();
        foreach(var p in buttons){var r=p.Value.worldBound;float x=r.center.x/size.width,y=r.center.y/size.height;if(!(r.width>0&&r.height>0)||!float.IsFinite(x)||!float.IsFinite(y))return null;controls.Add(new Control{action=p.Key,x=x,y=y});}
        int count=0;foreach(var mesh in GetComponentsInChildren<SkinnedMeshRenderer>())count+=mesh.bones.Length;
        return new State{hand=animator.GetBoneTransform(HumanBodyBones.RightHand).position,shoulder=animator.GetBoneTransform(HumanBodyBones.RightUpperArm).position,target=target.position,humanoid=animator.isHuman,weight=ikWeight,distance=Distance(),footY=animator.GetBoneTransform(HumanBodyBones.RightFoot).position.y,leftHandY=animator.GetBoneTransform(HumanBodyBones.LeftHand).position.y,leftHandZ=animator.GetBoneTransform(HumanBodyBones.LeftHand).position.z,phase=animator.GetCurrentAnimatorStateInfo(0).normalizedTime%1,callbacks=callbacks,skinnedMeshes=GetComponentsInChildren<SkinnedMeshRenderer>().Length,boneCount=count,bonesVisible=showBones,buttons=controls.ToArray()};
    }
}
