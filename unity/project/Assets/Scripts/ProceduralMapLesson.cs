using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public sealed class ProceduralMapLesson : MonoBehaviour
{
    [InspectorName("生成設定")] public ProceduralMapRecipe recipe;
    [InspectorName("識別用の凡例")] public GameObject identityLegend;
    bool top,labels=true;Label status;VisualElement panel,root;readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();readonly Dictionary<CourseObjectIdentity,Label> markers=new Dictionary<CourseObjectIdentity,Label>();
    [Serializable] public class Control{public string action;public float x,y;}
    [Serializable] public class State{public int seed,blocks,buildings,roads,worldLabels;public float roadWidth,relief,minHeight,maxHeight;public bool top,labels,terrainHit;public float colliderHeight;public string hash;public Control[] buttons;}
    void OnEnable()
    {
        if(!Application.isPlaying)return;
        if(!recipe||!recipe.generatedRoot||!recipe.terrainData){Debug.LogError("Assign the saved procedural map",this);enabled=false;return;}
        root=GetComponent<UIDocument>().rootVisualElement;root.Clear();buttons.Clear();markers.Clear();
        panel=new VisualElement();panel.style.marginLeft=12;panel.style.marginTop=12;panel.style.paddingLeft=10;panel.style.paddingRight=10;panel.style.paddingTop=8;panel.style.paddingBottom=8;panel.style.maxWidth=590;panel.style.width=Length.Percent(94);panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label("市街マップと地形の自動生成 / U35");title.style.whiteSpace=WhiteSpace.Normal;title.style.color=Color.white;title.style.fontSize=20;panel.Add(title);
        status=new Label();status.name="status";status.style.whiteSpace=WhiteSpace.Normal;status.style.color=Color.white;status.style.fontSize=14;panel.Add(status);
        var note=new Label("保存した生成結果を表示中。生成・元に戻す操作は「教材 > 市街マップ生成」で行います。");note.style.whiteSpace=WhiteSpace.Normal;note.style.color=Color.white;note.style.fontSize=12;panel.Add(note);
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"view","真上 / 斜めから見る",()=>{top=!top;View();});Add(row,"labels","凡例 表示 / 非表示",()=>{labels=!labels;if(identityLegend)identityLegend.SetActive(labels);});View();
        status.text=$"乱数シード {recipe.seed} ／ {recipe.blocks}×{recipe.blocks}区画 ／ 道幅 {recipe.roadWidth:F1}m ／ 起伏 {recipe.relief:F1}m ／ 構成ID {recipe.layoutHash}";
        foreach(var tag in recipe.generatedRoot.GetComponentsInChildren<CourseObjectIdentity>().Where(t=>t.identifier.StartsWith("B")||t.identifier.StartsWith("R"))){
            var marker=new Label(tag.identifier){pickingMode=PickingMode.Ignore};marker.style.position=Position.Absolute;marker.style.fontSize=13;marker.style.color=Color.white;marker.style.backgroundColor=new Color(.03f,.045f,.065f,.97f);marker.style.paddingLeft=4;marker.style.paddingRight=4;root.Add(marker);markers.Add(tag,marker);
        }
    }
    void Add(VisualElement row,string key,string text,Action action){var b=new Button(action){text=text,name=key};b.style.height=32;b.style.marginRight=6;b.style.color=Color.black;b.style.backgroundColor=new Color(.96f,.91f,.63f);row.Add(b);buttons.Add(key,b);}
    void View(){var c=Camera.main;if(!c)return;c.orthographic=true;c.orthographicSize=top?29:30;c.transform.position=top?new Vector3(0,60,0):new Vector3(30,38,-43);c.transform.LookAt(Vector3.zero,top?Vector3.forward:Vector3.up);}
    void LateUpdate(){if(root?.panel==null||!Camera.main)return;var size=root.panel.visualTree.worldBound;foreach(var pair in markers){var tag=pair.Key;var renderer=tag.GetComponent<Renderer>();var point=renderer.bounds.center+Vector3.up*(renderer.bounds.extents.y+.2f);if(tag.identifier.StartsWith("R")){if(tag.name.StartsWith("RoadX"))point.z=-recipe.blocks*4-1.5f;else point.x=-recipe.blocks*4-1.5f;}
            var screen=Camera.main.WorldToScreenPoint(point);float x=screen.x/Screen.width*size.width,y=(1-screen.y/Screen.height)*size.height;pair.Value.style.display=labels&&screen.z>0&&y>panel.resolvedStyle.height+12?DisplayStyle.Flex:DisplayStyle.None;pair.Value.style.left=x-10;pair.Value.style.top=y-10;}}
    public State Capture(){var root=GetComponent<UIDocument>().rootVisualElement;if(root.panel==null||buttons.Count==0)return null;var size=root.panel.visualTree.worldBound;var controls=new List<Control>();foreach(var pair in buttons){var rect=pair.Value.worldBound;if(rect.width<=0||size.width<=0||size.height<=0)return null;controls.Add(new Control{action=pair.Key,x=rect.center.x/size.width,y=rect.center.y/size.height});}
        var heights=recipe.terrainData.GetHeights(0,0,65,65).Cast<float>().ToArray();var tags=recipe.generatedRoot.GetComponentsInChildren<CourseObjectIdentity>();
        var collider=recipe.generatedRoot.GetComponentInChildren<TerrainCollider>();RaycastHit contact=default;bool hit=collider&&collider.Raycast(new Ray(new Vector3(20,20,20),Vector3.down),out contact,40);float hitY=hit?contact.point.y:0;
        return new State{worldLabels=markers.Values.Count(l=>l.resolvedStyle.display==DisplayStyle.Flex),terrainHit=hit,colliderHeight=hitY,seed=recipe.seed,blocks=recipe.blocks,buildings=tags.Count(t=>t.identifier.StartsWith("B")),roads=tags.Count(t=>t.identifier.StartsWith("R")),roadWidth=recipe.roadWidth,relief=recipe.relief,minHeight=heights.Min()*ProceduralMapRecipe.Height,maxHeight=heights.Max()*ProceduralMapRecipe.Height,top=top,labels=labels,hash=recipe.layoutHash,buttons=controls.ToArray()};}
}
