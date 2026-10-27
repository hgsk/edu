using System.Collections.Generic;
using System.Reflection;
using UnityEditor;
using UnityEngine;

// Limit the translated inspector to our course components; Unity and package inspectors are unchanged.
[CanEditMultipleObjects]
public class JapaneseCourseInspector : Editor
{
    static readonly Dictionary<string,string> Labels=new Dictionary<string,string> {
        {"music","音楽"},{"ambience","環境音"},{"cue","操作音"},{"contactController","接地時の制御"},{"earlyController","早めの制御"},{"concrete","コンクリートの足音"},{"wood","木の足音"},{"leftFoot","左足"},{"rightFoot","右足"},
        {"blocks","箱・区画数"},{"targetScore","目標得点"},{"speed","移動速度"},{"distance","移動距離"},{"radius","半径"},{"material","材質"},{"target","対象"},{"range","範囲"},{"interval","間隔"},{"duration","継続時間"},{"useKeyboard","キーボードで操作"}
    };
    protected void DrawJapaneseFields()
    {
        serializedObject.Update();var p=serializedObject.GetIterator();bool enter=true;
        while(p.NextVisible(enter)){
            enter=false;string label=p.displayName;
            var field=target.GetType().GetField(p.name,BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance);
            var caption=field?.GetCustomAttribute<InspectorNameAttribute>();
            if(caption!=null)label=caption.displayName;else if(Labels.TryGetValue(p.name,out string translated))label=translated;
            if(p.name=="m_Script")label="スクリプト";
            using(new EditorGUI.DisabledScope(p.name=="m_Script"))EditorGUILayout.PropertyField(p,new GUIContent(label,p.tooltip),true);
        }
        serializedObject.ApplyModifiedProperties();
    }
    public override void OnInspectorGUI()=>DrawJapaneseFields();
}
[CanEditMultipleObjects,CustomEditor(typeof(CollisionPracticeLesson))] public class JapaneseCollisionInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(CollisionPracticeProbe))] public class JapaneseCollisionProbeInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(ExhibitButton))] public class JapaneseButtonInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(ExhibitMover))] public class JapaneseMoverInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(CourseObjectIdentity))] public class JapaneseIdentityInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(CourseGameLesson))] public class JapaneseLoopInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(CourseGameRules))] public class JapaneseRulesInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(CourseDependencyLesson))] public class JapaneseDependencyInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(PhysicsSandboxLesson))] public class JapaneseSandboxInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(SpatialPracticeLesson))] public class JapaneseSpatialInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(VrmBoneLesson))] public class JapaneseVrmInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(SoundPracticeLesson))] public class JapaneseSoundInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(FoleyPracticeLesson))] public class JapaneseFoleyInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(ProceduralMapRecipe))] public class JapaneseMapRecipeInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(ProceduralMapLesson))] public class JapaneseMapInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(UIPatternGallery))] public class JapaneseGalleryInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(RangeGizmo))] public class JapaneseGizmoInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(AgentPracticeMover))] public class JapaneseAgentPracticeInspector:JapaneseCourseInspector{}
[CanEditMultipleObjects,CustomEditor(typeof(AgentReviewedMover))] public class JapaneseAgentReviewedInspector:JapaneseCourseInspector{}
