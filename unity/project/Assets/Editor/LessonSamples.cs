using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;
using UnityEngine.UIElements;
using UnityEngine.VFX;

public static class LessonSamples
{
    public static string[] Names => EduSetup.Names.Concat(new[]{"22-UnityCLI","23-ShaderGraph","24-GameLoop","25-VersionControl","26-DataSharing","27-TeamDevelopment","28-ComponentSafety","29-PhysicsSandbox","30-Graybox","31-Kitbash","32-VrmBones","33-Sound","34-Foley","35-ProceduralMap","36-Collision"}).ToArray();
    const string Complete="Assets/Scenes/Completed/";
    const string Data="Assets/LessonSamples/";

    [MenuItem("教材/不足する単元サンプルを作成")]
    public static void CreateMissing()
    {
        Directory.CreateDirectory(Complete);Directory.CreateDirectory(Data);AssetDatabase.Refresh();
        // The original 21 start scenes are intentionally left untouched.
        for(int id=22;id<=22;id++)
        {
            string path="Assets/Scenes/"+Names[id-1]+".unity";
            if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");
            if(id==23) GameObject.Find("Exhibit").AddComponent<AgentPracticeMover>();
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        for(int id=1;id<=22;id++)
        {
            string dest=Complete+Names[id-1]+".unity";
            if(File.Exists(dest))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/"+Names[id-1]+".unity");
            var go=GameObject.Find(id==5?"Marker":"Exhibit");
            switch(id)
            {
                case 2:go.name="WelcomeExhibit";break;
                case 3:go.transform.localPosition=new Vector3(2,1,0);go.transform.localEulerAngles=new Vector3(0,30,0);break;
                case 4:SetFloat(go.GetComponent<ExhibitMover>(),"speed",1);break;
                case 5:go.transform.position=new Vector3(2,1,0);go.GetComponent<SpriteRenderer>().color=new Color(1,.8f,.6f);break;
                case 6:go.GetComponent<ExhibitMover>().useKeyboard=true;break;
                case 7:
                    var clone=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Exhibit.prefab"));
                    clone.name="ExhibitRight";clone.transform.position=new Vector3(2,.5f,0);break;
                case 8:go.GetComponent<Rigidbody>().useGravity=true;go.GetComponent<Rigidbody>().isKinematic=false;break;
                case 9:
                    GameObject.Find("Sphere").transform.position=new Vector3(2,.5f,2);
                    var capsule=GameObject.CreatePrimitive(PrimitiveType.Capsule);capsule.name="Capsule";capsule.transform.position=new Vector3(-2,.5f,0);break;
                case 10:
                    var mat=new Material(AssetDatabase.LoadAssetAtPath<Material>("Assets/Art/Exhibit.mat"));
                    mat.color=new Color(1,.45f,.12f);mat.SetFloat("_Smoothness",.8f);
                    AssetDatabase.CreateAsset(mat,Data+"StudentExhibit.mat");go.GetComponent<Renderer>().sharedMaterial=mat;break;
                case 11:Camera.main.fieldOfView=60;break;
                case 12:
                    var light=UnityEngine.Object.FindFirstObjectByType<Light>();light.transform.rotation=Quaternion.Euler(50,25,0);light.intensity=.8f;light.color=new Color(1,.88f,.7f);break;
                case 13:
                    string controllerPath=Data+"ExhibitSlow.controller";
                    AssetDatabase.CopyAsset("Assets/Animation/Exhibit.controller",controllerPath);
                    var ctrl=AssetDatabase.LoadAssetAtPath<AnimatorController>(controllerPath);
                    ctrl.layers[0].stateMachine.states[0].state.speed=.5f;
                    go.GetComponent<Animator>().runtimeAnimatorController=ctrl;EditorUtility.SetDirty(ctrl);break;
                case 14:
                    string timelinePath=Data+"ExhibitDelayed.playable";
                    AssetDatabase.CopyAsset("Assets/Animation/Exhibit.playable",timelinePath);
                    var timeline=AssetDatabase.LoadAssetAtPath<TimelineAsset>(timelinePath);
                    var track=timeline.GetOutputTracks().OfType<AnimationTrack>().Single();track.GetClips().Single().start=1;
                    var director=go.GetComponent<PlayableDirector>();director.playableAsset=timeline;
                    director.SetGenericBinding(track,go.GetComponent<Animator>());EditorUtility.SetDirty(timeline);EditorUtility.SetDirty(track);break;
                case 15:
                    var audio=go.GetComponent<AudioSource>();audio.volume=.15f;audio.loop=false;audio.spatialBlend=0;break;
                case 17:go.GetComponent<RangeGizmo>().radius=3;break;
                case 18:
                    string uxml=File.ReadAllText("Assets/UI/Exhibit.uxml").Replace("UNITY EXHIBIT","STUDENT EXHIBIT").Replace("Exhibit.uss","../UI/Exhibit.uss");
                    File.WriteAllText(Data+"StudentExhibit.uxml",uxml);AssetDatabase.ImportAsset(Data+"StudentExhibit.uxml");
                    GameObject.Find("ExhibitUI").GetComponent<UIDocument>().visualTreeAsset=AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(Data+"StudentExhibit.uxml");break;
                case 19:
                    string vfx=File.ReadAllText("Assets/Art/Exhibit.vfx");
                    var pattern=new Regex(@"m_SerializableObject: 64(?=\r?\n    m_Space: -1\r?\n  m_Property:\r?\n    name: Rate)");
                    if(pattern.Matches(vfx).Count!=1)throw new InvalidOperationException("Expected exactly one Rate slot");
                    File.WriteAllText(Data+"ExhibitHalfRate.vfx",pattern.Replace(vfx,"m_SerializableObject: 32"));
                    AssetDatabase.ImportAsset(Data+"ExhibitHalfRate.vfx");
                    GameObject.Find("WelcomeParticles").GetComponent<VisualEffect>().visualEffectAsset=AssetDatabase.LoadAssetAtPath<VisualEffectAsset>(Data+"ExhibitHalfRate.vfx");break;
                case 20:go.GetComponent<DebugProbe>().showWarning=false;break;
                case 23:UnityEngine.Object.DestroyImmediate(go.GetComponent<AgentPracticeMover>());go.AddComponent<AgentReviewedMover>();break;
            }
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),dest);
        }
        AssetDatabase.SaveAssets();Verify();
    }

    static void SetFloat(UnityEngine.Object target,string field,float value)
    {var so=new SerializedObject(target);so.FindProperty(field).floatValue=value;so.ApplyModifiedPropertiesWithoutUndo();}

    [MenuItem("教材/単元サンプルを検査")]
    public static void Verify()
    {
        // Save no scenes. This checks the actual serialized references after opening each sample.
        foreach(string name in Names)
        {
            string start="Assets/Scenes/"+name+".unity",done=Complete+name+".unity";
            if(!File.Exists(start)||!File.Exists(done))throw new InvalidOperationException("Missing sample: "+name);
            EditorSceneManager.OpenScene(done);
            foreach(var go in UnityEngine.Object.FindObjectsByType<GameObject>(FindObjectsSortMode.None))
                if(GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(go)>0)throw new InvalidOperationException("Missing script: "+name);
            if(Camera.main==null)throw new InvalidOperationException("Missing camera: "+name);
            if(name.StartsWith("07-") && UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None).Length<3)throw new InvalidOperationException("Prefab copies missing");
            if(name.StartsWith("14-"))
            {
                var director=UnityEngine.Object.FindFirstObjectByType<PlayableDirector>();
                foreach(var output in director.playableAsset.outputs)
                    if(director.GetGenericBinding(output.sourceObject)==null)throw new InvalidOperationException("Timeline binding missing");
            }
            if(name.StartsWith("18-") && GameObject.Find("ExhibitUI").GetComponent<UIDocument>().visualTreeAsset==null)throw new InvalidOperationException("UXML missing");
            if(name.StartsWith("19-") && UnityEngine.Object.FindFirstObjectByType<VisualEffect>().visualEffectAsset==null)throw new InvalidOperationException("VFX missing");
        }
        var report="{\"status\":\"PASS\",\"startScenes\":36,\"completedScenes\":36,\"missingScripts\":0,\"timelineBindings\":\"PASS\",\"uiAndVfxReferences\":\"PASS\"}";
        File.WriteAllText("lesson-samples-report.json",report);Debug.Log("LESSON SAMPLES: PASS (36 start + 36 completed)");
        EditorSceneManager.OpenScene(Complete+"22-UnityCLI.unity");
    }
    [MenuItem("教材/Copilot演習を保留")]
    public static void DeferCopilot()
    {
        Directory.CreateDirectory("Assets/Scenes/Deferred");AssetDatabase.Refresh();
        foreach(var pair in new[]{
            new[]{"Assets/Scenes/23-CopilotAgent.unity","Assets/Scenes/Deferred/23-CopilotAgent-Start.unity"},
            new[]{Complete+"23-CopilotAgent.unity","Assets/Scenes/Deferred/23-CopilotAgent-Reference.unity"}})
            if(File.Exists(pair[0])) {var error=AssetDatabase.MoveAsset(pair[0],pair[1]);if(!string.IsNullOrEmpty(error))throw new IOException(error);}
        Verify();
    }
}
