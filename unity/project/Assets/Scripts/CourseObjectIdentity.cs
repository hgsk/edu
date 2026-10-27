using UnityEngine;

// The identifier remains available when colors are hard to distinguish.
public class CourseObjectIdentity : MonoBehaviour
{
    [InspectorName("識別番号")] public string identifier;
    [InspectorName("色名")] public string colorName;
    [InspectorName("色コード")] public string colorHex;
#if UNITY_EDITOR
    void OnDrawGizmos()
    {
        var renderer=GetComponent<Renderer>();
        if(identifier=="F")return;
        var style=new GUIStyle(UnityEditor.EditorStyles.whiteLabel);
        style.normal.textColor=Color.white;
        style.padding=new RectOffset(4,4,2,2);
        var position=renderer?renderer.bounds.center+Vector3.up*(renderer.bounds.extents.y+.12f):transform.position+Vector3.up*1.5f;
        string caption=identifier+" "+CourseJapanese.ObjectName(name,identifier);
        UnityEditor.Handles.BeginGUI();
        var point=UnityEditor.HandleUtility.WorldToGUIPoint(position);
        var size=style.CalcSize(new GUIContent(caption));
        var rect=new Rect(point.x-size.x*.5f,point.y-size.y,size.x,size.y);
        UnityEditor.EditorGUI.DrawRect(rect,new Color(.03f,.045f,.065f,.97f));
        GUI.Label(rect,caption,style);
        UnityEditor.Handles.EndGUI();
    }
#endif
}
