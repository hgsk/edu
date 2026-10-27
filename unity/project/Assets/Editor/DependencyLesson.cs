using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class DependencyLesson
{
    const string Name="28-ComponentSafety";
    const string Prefab="Assets/LessonSamples/DependencyRig.prefab";
    public static void CreateMissing()
    {
        if(!File.Exists(Prefab))
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);
            var rig=new GameObject("DependencyRig");
            var a=GameObject.CreatePrimitive(PrimitiveType.Cube);a.name="Exhibit";a.transform.SetParent(rig.transform);a.transform.position=new Vector3(-1.4f,.5f,0);
            var d=GameObject.CreatePrimitive(PrimitiveType.Cube);d.name="ExhibitRight";d.transform.SetParent(rig.transform);d.transform.position=new Vector3(1.4f,.5f,0);var target=d.AddComponent<CourseDestination>();
            foreach(var go in new[]{a,d})
            {
                bool right=go==d;var tag=go.AddComponent<CourseObjectIdentity>();tag.identifier=right?"D":"A";tag.colorHex=right?"#E6DBF5":"#246C96";tag.colorName=right?"淡い紫":"青";
                go.GetComponent<Renderer>().sharedMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/Art/Palette/"+(right?"D-ExhibitRight":"A-Exhibit")+".mat");
            }
            var driver=a.AddComponent<SafeExhibitDriver>();a.GetComponent<Rigidbody>().isKinematic=true;a.GetComponent<Rigidbody>().useGravity=false;driver.Configure(target);
            PrefabUtility.SaveAsPrefabAsset(rig,Prefab);
        }
        foreach(bool complete in new[]{false,true})
        {
            string path="Assets/Scenes/"+(complete?"Completed/":"")+Name+".unity";if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));
            var rig=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Prefab));
            var driver=rig.GetComponentInChildren<SafeExhibitDriver>();var target=rig.GetComponentInChildren<CourseDestination>();
            if(!complete){driver.Configure(null);PrefabUtility.RecordPrefabInstancePropertyModifications(driver);}
            var ui=new GameObject("ExhibitUI");var doc=ui.AddComponent<UIDocument>();doc.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");doc.sortingOrder=10;
            var lesson=ui.AddComponent<CourseDependencyLesson>();lesson.exhibit=driver.gameObject;lesson.intendedDestination=target;
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        AssetDatabase.SaveAssets();Verify();Tests();LessonSamples.Verify();CourseObjectPalette.Verify();
    }
    public static void Verify()
    {
        foreach(bool complete in new[]{false,true})
        {
            EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+Name+".unity");
            var lesson=UnityEngine.Object.FindFirstObjectByType<CourseDependencyLesson>();string reason="";
            if(!lesson || lesson.Check(out reason)!=complete)throw new Exception("Dependency sample wiring differs from expected variant");
            if(!complete && !reason.StartsWith("Destination missing"))throw new Exception("Start must reproduce the missing reference");
        }
        Debug.Log("DEPENDENCY SAMPLES: PASS");
    }
    [MenuItem("教材/完成サンプルの依存関係を検査")]
    public static void ValidateCompleted()
    {
        if(EditorApplication.isPlaying)throw new Exception("Stop Play before scene validation");
        if(UnityEngine.SceneManagement.SceneManager.GetActiveScene().isDirty)throw new Exception("Save the current scene first; validation opens completed samples");
        int count=0;
        foreach(string name in LessonSamples.Names)
        {
            var scene=EditorSceneManager.OpenScene("Assets/Scenes/Completed/"+name+".unity");
            foreach(var go in scene.GetRootGameObjects().SelectMany(root=>root.GetComponentsInChildren<Transform>(true)).Select(t=>t.gameObject))
                if(GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(go)>0)throw new Exception(name+": Missing Script on "+go.name);
            ValidateScene(scene,false);
            count++;
        }
        Debug.Log("COMPLETED DEPENDENCIES: PASS ("+count+" scenes)");
    }
    static void Assert(bool value,string name){if(!value)throw new Exception("Dependency test: "+name);}
    static void Reject(Action action,string name){try{action();}catch(BuildFailedException){return;}throw new Exception("Expected dependency rejection: "+name);}
    public static void ValidateScene(UnityEngine.SceneManagement.Scene scene,bool allowTrainingFailure)
    {
        var contracts=scene.GetRootGameObjects().SelectMany(root=>root.GetComponentsInChildren<CourseDependencyLesson>(true)).ToArray();
        if(scene.name==Name && contracts.Length!=1)throw new BuildFailedException("U28 needs exactly one scene contract");
        bool training=allowTrainingFailure && scene.path=="Assets/Scenes/28-ComponentSafety.unity";
        foreach(var lesson in contracts)
        {
            var document=lesson.GetComponent<UIDocument>();
            if(!lesson.isActiveAndEnabled || !document || !document.enabled || !document.panelSettings)throw new BuildFailedException("Dependency UI contract is disabled or missing UIDocument / PanelSettings");
            if(!lesson.Check(out var reason) && !(training && reason.StartsWith("Destination missing")))throw new BuildFailedException(scene.path+": "+reason);
        }
    }
    public static void Tests()
    {
        EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);var a=new GameObject("Fixture A");var d=new GameObject("Fixture D");int n=0;
        try
        {
            var target=d.AddComponent<CourseDestination>();
            Assert(!CourseDependencyLesson.Check(a,target,out var reason)&&reason.Contains("not attached"),"detect driver omission");n++;
            var driver=a.AddComponent<SafeExhibitDriver>();Assert(a.GetComponent<Rigidbody>() && a.GetComponent<BoxCollider>(),"RequireComponent auto attachment");n++;
            Assert(Attribute.IsDefined(typeof(SafeExhibitDriver),typeof(DisallowMultipleComponent)),"single driver declaration");n++;
            var body=a.GetComponent<Rigidbody>();body.isKinematic=true;body.useGravity=false;
            Assert(!driver.Check(out reason)&&reason.StartsWith("Destination missing"),"missing external reference");n++;
            driver.Configure(target);Assert(driver.Initialize()&&CourseDependencyLesson.Check(a,target,out reason),"valid setup");n++;
            a.SetActive(false);Assert(!CourseDependencyLesson.Check(a,target,out reason),"inactive actor");a.SetActive(true);n++;
            var serialized=new SerializedObject(driver);serialized.FindProperty("speed").floatValue=-1;serialized.ApplyModifiedPropertiesWithoutUndo();Assert(driver.Speed>=.1f,"OnValidate clamps own scalar");n++;
            body.isKinematic=false;Assert(!driver.Check(out reason),"wrong Rigidbody mode");body.isKinematic=true;n++;
            a.GetComponent<BoxCollider>().enabled=false;Assert(!driver.Check(out reason),"disabled collider");a.GetComponent<BoxCollider>().enabled=true;n++;
            driver.Configure(a.AddComponent<CourseDestination>());Assert(!driver.Check(out reason),"self reference");driver.Configure(target);n++;
            driver.enabled=false;Assert(!CourseDependencyLesson.Check(a,target,out reason),"disabled driver");Assert(driver.Initialize(),"explicit recovery");n++;
            Assert(!CourseDependencyLesson.Check(a,a.GetComponent<CourseDestination>(),out reason),"wrong scene contract");n++;
            var scene=UnityEngine.SceneManagement.SceneManager.GetActiveScene();scene.name=Name;
            Reject(()=>ValidateScene(scene,false),"missing scene contract");n++;
            var contractObject=new GameObject("Contract fixture");var contract=contractObject.AddComponent<CourseDependencyLesson>();contract.exhibit=a;contract.intendedDestination=target;
            var document=contract.GetComponent<UIDocument>();document.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");
            document.enabled=false;Reject(()=>ValidateScene(scene,false),"disabled required UI");document.enabled=true;n++;
            ValidateScene(scene,false);driver.Configure(null);Reject(()=>ValidateScene(scene,false),"invalid completed scene blocks build");driver.Configure(target);driver.Initialize();n++;
            UnityEngine.Object.DestroyImmediate(contractObject);
            var asset=AssetDatabase.LoadAssetAtPath<GameObject>(Prefab);var one=(GameObject)PrefabUtility.InstantiatePrefab(asset);var two=(GameObject)PrefabUtility.InstantiatePrefab(asset);
            Assert(one.GetComponentInChildren<SafeExhibitDriver>().Destination==one.GetComponentInChildren<CourseDestination>() && two.GetComponentInChildren<SafeExhibitDriver>().Destination==two.GetComponentInChildren<CourseDestination>(),"Prefab internal reference isolation");n++;
            UnityEngine.Object.DestroyImmediate(one);UnityEngine.Object.DestroyImmediate(two);UnityEngine.Object.DestroyImmediate(d);
            Assert(!driver.Initialize()&&!driver.enabled,"destroyed reference blocks execution");n++;
            Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/28-dependency-tests.json","{\"status\":\"PASS\",\"checks\":"+n+",\"prefabReferences\":\"PASS\"}");Debug.Log("DEPENDENCY TESTS: PASS ("+n+")");
        }
        finally{if(a)UnityEngine.Object.DestroyImmediate(a);if(d)UnityEngine.Object.DestroyImmediate(d);}
    }
}

[CustomEditor(typeof(SafeExhibitDriver))]
public class SafeExhibitDriverInspector : JapaneseCourseInspector
{
    public override void OnInspectorGUI(){DrawJapaneseFields();var driver=(SafeExhibitDriver)target;bool valid=driver.Check(out var message);EditorGUILayout.HelpBox(CourseJapanese.Text(message),valid?MessageType.Info:MessageType.Error);}
}

// Reuse the same check for any Player build containing this scene, not only the workbook's builder.
public class DependencyBuildGate : IProcessSceneWithReport
{
    public int callbackOrder=>10;
    public void OnProcessScene(UnityEngine.SceneManagement.Scene scene,BuildReport report)
    {
        if(report==null)return;
        DependencyLesson.ValidateScene(scene,true);
    }
}
