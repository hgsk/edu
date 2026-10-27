using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public class CourseIdentityOverlay : MonoBehaviour
{
    CourseObjectIdentity[] targets;
    Label[] labels;
    VisualElement root;
    void OnEnable()
    {
        if(!Application.isPlaying)return;
        root=GetComponent<UIDocument>().rootVisualElement;
        root.Clear();root.pickingMode=PickingMode.Ignore;
        root.style.position=Position.Absolute;root.style.left=0;root.style.top=0;
        root.style.width=Length.Percent(100);root.style.height=Length.Percent(100);
        targets=Object.FindObjectsByType<CourseObjectIdentity>(FindObjectsSortMode.None).OrderBy(x=>x.identifier).ToArray();
        labels=new Label[targets.Length];
        var legend=new VisualElement {pickingMode=PickingMode.Ignore};
        legend.style.position=Position.Absolute;legend.style.right=8;legend.style.bottom=8;
        legend.style.backgroundColor=new Color(.03f,.045f,.065f,.97f);
        legend.style.paddingLeft=8;legend.style.paddingRight=8;legend.style.paddingTop=5;legend.style.paddingBottom=5;
        foreach(var target in targets)
        {
            var line=new VisualElement {pickingMode=PickingMode.Ignore};line.style.flexDirection=FlexDirection.Row;
            ColorUtility.TryParseHtmlString(target.colorHex,out var color);
            var swatch=new VisualElement {pickingMode=PickingMode.Ignore};swatch.style.width=14;swatch.style.height=14;
            swatch.style.marginRight=6;swatch.style.marginTop=3;swatch.style.backgroundColor=color;
            swatch.style.borderTopWidth=1;swatch.style.borderBottomWidth=1;swatch.style.borderLeftWidth=1;swatch.style.borderRightWidth=1;
            swatch.style.borderTopColor=Color.white;swatch.style.borderBottomColor=Color.white;swatch.style.borderLeftColor=Color.white;swatch.style.borderRightColor=Color.white;
            line.Add(swatch);var text=new Label(target.identifier+" "+CourseJapanese.ObjectName(target.name,target.identifier));text.style.color=Color.white;text.style.fontSize=13;text.pickingMode=PickingMode.Ignore;
            line.Add(text);legend.Add(line);
        }
        root.Add(legend);
        for(int i=0;i<targets.Length;i++)
        {
            if(targets[i].identifier=="F")continue;
            var label=new Label(targets[i].identifier+" "+CourseJapanese.ObjectName(targets[i].name,targets[i].identifier)) {pickingMode=PickingMode.Ignore};
            label.style.position=Position.Absolute;label.style.color=Color.white;
            label.style.backgroundColor=new Color(.03f,.045f,.065f,.97f);label.style.fontSize=13;
            label.style.paddingLeft=4;label.style.paddingRight=4;label.style.paddingTop=2;label.style.paddingBottom=2;
            root.Add(label);labels[i]=label;
        }
    }
    void LateUpdate()
    {
        if(root==null || Camera.main==null)return;
        float width=root.resolvedStyle.width,height=root.resolvedStyle.height;
        if(float.IsNaN(width)||width<=0||height<=0)return;
        bool interfaceScene=GameObject.Find("ExhibitUI")!=null;
        for(int i=0;i<targets.Length;i++)
        {
            if(labels[i]==null || targets[i]==null)continue;
            if(interfaceScene){labels[i].style.display=DisplayStyle.None;continue;}
            var renderer=targets[i].GetComponent<Renderer>();
            var position=renderer?renderer.bounds.center+Vector3.up*(renderer.bounds.extents.y+.12f):targets[i].transform.position+Vector3.up*1.5f;
            var p=Camera.main.WorldToScreenPoint(position);
            labels[i].style.display=p.z>0?DisplayStyle.Flex:DisplayStyle.None;
            labels[i].style.left=Mathf.Clamp(p.x/Screen.width*width-50,4,Mathf.Max(4,width-165));
            labels[i].style.top=Mathf.Clamp((1-p.y/Screen.height)*height-22,4,Mathf.Max(4,height-25));
        }
    }
}
