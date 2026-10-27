using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.UI;
using UnityEngine.Playables;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.Timeline;
using UnityEngine.UI;
using UnityEngine.UIElements;
using UnityEngine.VFX;
using Button = UnityEngine.UI.Button;
using Image = UnityEngine.UI.Image;

// Rebuild is explicit and refuses to overwrite a previously generated course.
// The capture bridge only operates scenes inside this dedicated project.
[InitializeOnLoad]
public static class EduSetup
{
    public static readonly string[] Names = {
        "01-Editor", "02-Scene", "03-Transform", "04-MonoBehaviour", "05-2D",
        "06-Input", "07-Prefab", "08-Physics", "09-3D", "10-Material",
        "11-Camera", "12-Lighting", "13-Animator", "14-Timeline", "15-Audio",
        "16-uGUI", "17-Gizmo", "18-UIToolkit", "19-VFXGraph", "20-Debug", "21-Build"
    };
    static string lastCommand=SessionState.GetString("EduCaptureLastCommand","");
    static double lastRuntimeRecord;
    [Serializable] class Command { public int lesson; public string stage; public string token; }
    static EduSetup() { EditorApplication.update += Poll; }

    [MenuItem("教材/基本サンプルを初回作成")]
    public static void Create()
    {
        if (File.Exists("Assets/Scenes/01-Editor.unity"))
            throw new InvalidOperationException("Course already exists; refusing to overwrite.");
        Directory.CreateDirectory("Assets/Scenes");
        Directory.CreateDirectory("Assets/Art");
        Directory.CreateDirectory("Assets/Animation");
        Directory.CreateDirectory("Assets/Prefabs");
        AssetDatabase.Refresh();
        var data = ScriptableObject.CreateInstance<UniversalRendererData>();
        AssetDatabase.CreateAsset(data, "Assets/Art/ExhibitRenderer.asset");
        var pipeline = UniversalRenderPipelineAsset.Create(data);
        AssetDatabase.CreateAsset(pipeline, "Assets/Art/ExhibitURP.asset");
        GraphicsSettings.defaultRenderPipeline = pipeline;
        QualitySettings.renderPipeline = pipeline;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        mat.color = new Color(.12f, .72f, .64f);
        AssetDatabase.CreateAsset(mat, "Assets/Art/Exhibit.mat");
        var tex = new Texture2D(64, 64);
        tex.SetPixels(Enumerable.Repeat(new Color(.98f, .55f, .18f),4096).ToArray());
        tex.Apply(); File.WriteAllBytes("Assets/Art/Marker.png",tex.EncodeToPNG());
        AssetDatabase.ImportAsset("Assets/Art/Marker.png");
        var imp = (TextureImporter)AssetImporter.GetAtPath("Assets/Art/Marker.png");
        imp.textureType = TextureImporterType.Sprite; imp.spritePixelsPerUnit = 32; imp.SaveAndReimport();
        var clip = new AnimationClip { name = "ExhibitMove", frameRate = 30 };
        clip.SetCurve("",typeof(Transform),"localPosition.x",AnimationCurve.EaseInOut(0,-1,2,1));
        var clipSettings=AnimationUtility.GetAnimationClipSettings(clip);clipSettings.loopTime=true;
        AnimationUtility.SetAnimationClipSettings(clip,clipSettings);
        AssetDatabase.CreateAsset(clip,"Assets/Animation/ExhibitMove.anim");
        var controller = AnimatorController.CreateAnimatorControllerAtPath("Assets/Animation/Exhibit.controller");
        controller.AddMotion(clip);
        // A quiet, deterministic teaching sound; no third-party media.
        using (var writer = new BinaryWriter(File.Create("Assets/Art/Chime.wav")))
        {
            int count=22050; writer.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); writer.Write(36+count*2);
            writer.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt ")); writer.Write(16);writer.Write((short)1);writer.Write((short)1);
            writer.Write(22050);writer.Write(44100);writer.Write((short)2);writer.Write((short)16);
            writer.Write(System.Text.Encoding.ASCII.GetBytes("data"));writer.Write(count*2);
            for(int i=0;i<count;i++) writer.Write((short)(Math.Sin(i*2*Math.PI*440/22050)*1500*(1.0-i/(double)count)));
        }
        var vfxPackage = UnityEditor.PackageManager.PackageInfo.GetAllRegisteredPackages()
            .Single(p => p.name == "com.unity.visualeffectgraph");
        File.Copy(Path.Combine(vfxPackage.resolvedPath,"Editor/Templates/02_Simple_Loop.vfx"), "Assets/Art/Exhibit.vfx");
        var actions = ScriptableObject.CreateInstance<InputActionAsset>();
        var map = actions.AddActionMap("Exhibit");
        map.AddAction("Move",InputActionType.Value).AddCompositeBinding("1DAxis")
            .With("Negative","<Keyboard>/a").With("Positive","<Keyboard>/d");
        File.WriteAllText("Assets/Exhibit.inputactions",actions.ToJson());
        AssetDatabase.Refresh();
        for(int i=1;i<=21;i++) MakeScene(i);
        EditorBuildSettings.scenes = new[] {new EditorBuildSettingsScene("Assets/Scenes/21-Build.unity",true)};
        AssetDatabase.SaveAssets();
        File.WriteAllText("setup-status.json", "{\"status\":\"PASS\",\"scenes\":21}");
        Show(1,"before");
    }

    static GameObject Cube(string name,Vector3 pos,Vector3 scale)
    {
        var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name=name;
        go.transform.position=pos;go.transform.localScale=scale;
        go.GetComponent<Renderer>().sharedMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/Art/Exhibit.mat");
        return go;
    }
    static void MakeScene(int id)
    {
        EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects,NewSceneMode.Single);
        var cam=Camera.main;cam.transform.position=new Vector3(6,4,-8);cam.transform.LookAt(Vector3.up*.5f);
        cam.backgroundColor=new Color(.07f,.11f,.17f);cam.clearFlags=CameraClearFlags.SolidColor;
        Cube("DisplayFloor",new Vector3(0,-.6f,0),new Vector3(8,.2f,6));
        var exhibit=Cube("Exhibit",Vector3.up*.5f,Vector3.one);
        switch(id)
        {
            case 3:
                var parent=new GameObject("DisplayRoot");exhibit.transform.SetParent(parent.transform);break;
            case 4: exhibit.AddComponent<ExhibitMover>(); break;
            case 5:
                UnityEngine.Object.DestroyImmediate(exhibit);
                exhibit=new GameObject("Marker",typeof(SpriteRenderer));
                exhibit.GetComponent<SpriteRenderer>().sprite=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Art/Marker.png");
                cam.orthographic=true;cam.orthographicSize=4;cam.transform.position=new Vector3(0,0,-10);cam.transform.rotation=Quaternion.identity;break;
            case 6: exhibit.AddComponent<ExhibitMover>().useKeyboard=true;break;
            case 7:
                var prefab=PrefabUtility.SaveAsPrefabAsset(exhibit,"Assets/Prefabs/Exhibit.prefab");
                UnityEngine.Object.DestroyImmediate(exhibit);exhibit=(GameObject)PrefabUtility.InstantiatePrefab(prefab);break;
            case 8: exhibit.transform.position=Vector3.up*3;exhibit.AddComponent<Rigidbody>();break;
            case 9:
                var sphere=GameObject.CreatePrimitive(PrimitiveType.Sphere);sphere.name="Sphere";sphere.transform.position=new Vector3(2,.5f,0);break;
            case 11: cam.fieldOfView=45;break;
            case 12: RenderSettings.ambientLight=Color.gray;break;
            case 13: exhibit.AddComponent<Animator>().runtimeAnimatorController=AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/Animation/Exhibit.controller");break;
            case 14:
                var director=exhibit.AddComponent<PlayableDirector>();
                var timeline=ScriptableObject.CreateInstance<TimelineAsset>();
                AssetDatabase.CreateAsset(timeline,"Assets/Animation/Exhibit.playable");
                var track=timeline.CreateTrack<AnimationTrack>(null,"Exhibit position");
                track.trackOffset=TrackOffset.ApplySceneOffsets;
                var tc=track.CreateClip<AnimationPlayableAsset>();tc.duration=2;
                ((AnimationPlayableAsset)tc.asset).clip=AssetDatabase.LoadAssetAtPath<AnimationClip>("Assets/Animation/ExhibitMove.anim");
                director.playableAsset=timeline;director.SetGenericBinding(track,exhibit.AddComponent<Animator>());director.playOnAwake=true;break;
            case 15:
                var audio=exhibit.AddComponent<AudioSource>();audio.clip=AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Art/Chime.wav");audio.playOnAwake=true;audio.volume=.15f;break;
            case 16: MakeCanvas(exhibit);break;
            case 17: exhibit.AddComponent<RangeGizmo>();break;
            case 18:
                var panel=ScriptableObject.CreateInstance<PanelSettings>();
                AssetDatabase.CreateAsset(panel,"Assets/UI/ExhibitPanel.asset");
                var ui=new GameObject("ExhibitUI",typeof(UIDocument));
                ui.GetComponent<UIDocument>().panelSettings=panel;
                ui.GetComponent<UIDocument>().visualTreeAsset=AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/UI/Exhibit.uxml");
                ui.AddComponent<ExhibitUI>();break;
            case 19:
                var vfx=new GameObject("WelcomeParticles",typeof(VisualEffect));
                vfx.GetComponent<VisualEffect>().visualEffectAsset=AssetDatabase.LoadAssetAtPath<VisualEffectAsset>("Assets/Art/Exhibit.vfx");break;
            case 20: exhibit.AddComponent<DebugProbe>();break;
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),"Assets/Scenes/"+Names[id-1]+".unity");
    }
    static void MakeCanvas(GameObject exhibit)
    {
        var c=new GameObject("Canvas",typeof(Canvas),typeof(CanvasScaler),typeof(GraphicRaycaster));
        c.GetComponent<Canvas>().renderMode=RenderMode.ScreenSpaceOverlay;
        var scaler=c.GetComponent<CanvasScaler>();scaler.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize;scaler.referenceResolution=new Vector2(1280,720);
        new GameObject("EventSystem",typeof(EventSystem),typeof(InputSystemUIInputModule));
        var b=new GameObject("StartButton",typeof(RectTransform),typeof(Image),typeof(Button));b.transform.SetParent(c.transform,false);
        b.GetComponent<RectTransform>().sizeDelta=new Vector2(260,70);b.GetComponent<Image>().color=new Color(.08f,.5f,.45f);
        var t=new GameObject("Label",typeof(RectTransform),typeof(TMPro.TextMeshProUGUI));t.transform.SetParent(b.transform,false);
        var rt=t.GetComponent<RectTransform>();rt.anchorMin=Vector2.zero;rt.anchorMax=Vector2.one;rt.sizeDelta=Vector2.zero;
        var text=t.GetComponent<TMPro.TextMeshProUGUI>();text.font=JapaneseCourseFonts.Tmp;text.text="開始";text.fontSize=30;text.alignment=TMPro.TextAlignmentOptions.Center;
        var handler=exhibit.AddComponent<ExhibitButton>();handler.status=text;
        UnityEditor.Events.UnityEventTools.AddPersistentListener(b.GetComponent<Button>().onClick,handler.Begin);
    }
    static void Poll()
    {
        if(EditorApplication.isPlaying && File.Exists("capture-command.json") && EditorApplication.timeSinceStartup-lastRuntimeRecord>.5)
        {
            lastRuntimeRecord=EditorApplication.timeSinceStartup;
            var exhibit=GameObject.Find("Exhibit");
            var uiObject=GameObject.Find("ExhibitUI");
            var ui=uiObject?uiObject.GetComponent<UIDocument>():null;
            var effect=UnityEngine.Object.FindFirstObjectByType<VisualEffect>();
            var label=UnityEngine.Object.FindFirstObjectByType<TMPro.TMP_Text>();
            File.WriteAllText("runtime-status.json",JsonUtility.ToJson(new RuntimeStatus {
                scene=UnityEngine.SceneManagement.SceneManager.GetActiveScene().name,
                time=Time.time,position=exhibit?exhibit.transform.position:Vector3.zero,
                ugui=label?label.text:"",uitoolkit=ui?ui.rootVisualElement.Q<Label>("status")?.text:"",
                particles=effect?effect.aliveParticleCount:0,vrm=UnityEngine.Object.FindFirstObjectByType<VrmBoneLesson>()?.Capture(),sound=UnityEngine.Object.FindFirstObjectByType<SoundPracticeLesson>()?.Capture(),foley=UnityEngine.Object.FindFirstObjectByType<FoleyPracticeLesson>()?.Capture(),gallery=UnityEngine.Object.FindFirstObjectByType<UIPatternGallery>()?.Capture()
            }));
        }
        if(EditorApplication.isCompiling || EditorApplication.isUpdating || !File.Exists("capture-command.json"))return;
        string raw;
        try {raw=File.ReadAllText("capture-command.json");} catch(IOException) {return;}
        if(string.IsNullOrWhiteSpace(raw)||raw==lastCommand)return;lastCommand=raw;
        SessionState.SetString("EduCaptureLastCommand",raw);
        try {
            var c=JsonUtility.FromJson<Command>(raw);
            if(c.lesson<1||c.lesson>LessonSamples.Names.Length)throw new ArgumentOutOfRangeException("lesson");
            if(EditorApplication.isPlaying){EditorApplication.isPlaying=false;lastCommand=null;SessionState.EraseString("EduCaptureLastCommand");return;}
            if(c.stage=="build") BuildWindows();
            else if(c.stage=="deferCopilot") LessonSamples.DeferCopilot();
            else if(c.stage=="palette") CourseObjectPalette.ApplyAll();
            else Show(c.lesson,c.stage);
            if(c.stage=="after") EditorApplication.delayCall += () => {
                foreach(var w in Resources.FindObjectsOfTypeAll<EditorWindow>())
                    if(w.GetType().Name.Contains("InputAction") || new[]{"AnimatorControllerTool","TimelineWindow","Builder","VFXViewWindow","BuildProfileWindow","ConsoleWindow"}.Contains(w.GetType().Name))
                    {w.position=new Rect(290,170,940,690);w.Focus();}
            };
            File.WriteAllText("capture-status.json",JsonUtility.ToJson(c));
        } catch(Exception e){Debug.LogException(e);File.WriteAllText("capture-status.json",e.ToString());}
    }
    static void Show(int id,string stage)
    {
        foreach(var w in Resources.FindObjectsOfTypeAll<EditorWindow>())
            if(w.GetType().Name.Contains("InputAction") || new[]{"AnimatorControllerTool","TimelineWindow","Builder","VFXViewWindow","BuildProfileWindow","ConsoleWindow"}.Contains(w.GetType().Name))w.Close();
        // Explicitly discard only transient capture changes in this owned sample scene.
        var sceneNames=LessonSamples.Names;
        EditorSceneManager.OpenScene("Assets/Scenes/"+(stage.StartsWith("complete")?"Completed/":"")+sceneNames[id-1]+".unity",OpenSceneMode.Single);
        var go=GameObject.Find(id==24?"ExhibitUI":id==5?"Marker":id==2&&stage.StartsWith("complete")?"WelcomeExhibit":"Exhibit");Selection.activeGameObject=go;
        if(id==18) Selection.activeGameObject=GameObject.Find("ExhibitUI");
        if(id==19) Selection.activeGameObject=GameObject.Find("WelcomeParticles");
        foreach(var component in go.GetComponents<Component>())
            UnityEditorInternal.InternalEditorUtility.SetIsInspectorExpanded(component,
                !(component is CourseObjectIdentity) && (component is Transform || component is MonoBehaviour || component is Animator || component is AudioSource || component is PlayableDirector || (id==8 && component is Rigidbody)));
        var view=SceneView.GetWindow<SceneView>();view.in2DMode=id==5;
        view.LookAt(new Vector3(0,.5f,0),id==5?Quaternion.identity:Quaternion.Euler(22,-25,0),id==32?2.5f:id==35?35:id>=30?8:5);
        if(stage=="complete"||stage=="completePlay")
        {if(stage=="completePlay")EditorApplication.isPlaying=true;else view.Focus();return;}
        if(stage=="before") {view.Focus();return;}
        if(stage=="play") {EditorApplication.isPlaying=true;return;}
        switch(id)
        {
            case 2: go.name="WelcomeExhibit";break;
            case 3:go.transform.position=new Vector3(2,1,0);go.transform.rotation=Quaternion.Euler(0,30,0);break;
            case 5:go.transform.position=new Vector3(2,1,0);break;
            case 6:AssetDatabase.OpenAsset(AssetDatabase.LoadAssetAtPath<InputActionAsset>("Assets/Exhibit.inputactions"));return;
            case 7:
                var copy=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Exhibit.prefab"));copy.name="ExhibitRight";copy.transform.position=new Vector3(2,.5f,0);
                copy.GetComponent<Renderer>().sharedMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/Art/Palette/D-ExhibitRight.mat");
                var tag=copy.AddComponent<CourseObjectIdentity>();tag.identifier="D";tag.colorHex="#E6DBF5";tag.colorName="淡い紫";break;
            case 10:
                go.GetComponent<Renderer>().sharedMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/LessonSamples/StudentExhibit.mat");
                Selection.activeObject=go.GetComponent<Renderer>().sharedMaterial;break;
            case 11:Selection.activeGameObject=Camera.main.gameObject;break;
            case 12:Selection.activeGameObject=UnityEngine.Object.FindFirstObjectByType<Light>().gameObject;break;
            case 13:AssetDatabase.OpenAsset(AssetDatabase.LoadAssetAtPath<AnimatorController>("Assets/Animation/Exhibit.controller"));return;
            case 14:EditorApplication.ExecuteMenuItem("Window/Sequencing/Timeline");return;
            case 15:Selection.activeGameObject=go;break;
            case 16:Selection.activeGameObject=GameObject.Find("StartButton");break;
            case 18:AssetDatabase.OpenAsset(AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/UI/Exhibit.uxml"));return;
            case 19:
                AssetDatabase.OpenAsset(AssetDatabase.LoadAssetAtPath<VisualEffectAsset>("Assets/Art/Exhibit.vfx"));
                if(stage=="detail") EditorApplication.delayCall += () => {
                    var w=Resources.FindObjectsOfTypeAll<EditorWindow>().First(x=>x.GetType().Name=="VFXViewWindow");
                    w.position=new Rect(30,140,1200,900);
                    w.rootVisualElement.schedule.Execute(()=> {
                        var graph=w.rootVisualElement.Q<UnityEditor.Experimental.GraphView.GraphView>();
                        var node=graph.nodes.ToList().Where(x=>x.GetType().Name=="VFXContextUI").OrderBy(x=>x.GetPosition().y).First();
                        var p=node.GetPosition().position;
                        graph.UpdateViewTransform(new Vector3(520-p.x,110-p.y,0),Vector3.one);
                    }).StartingIn(1000);
                };
                return;
            case 20:EditorApplication.ExecuteMenuItem("Window/General/Console");Debug.Log("Exhibit ready",go);return;
            case 21:EditorApplication.ExecuteMenuItem("File/Build Profiles");return;
            case 23:ShaderGraphLesson.OpenGraph(stage=="detail");return;
            case 24:Selection.activeGameObject=GameObject.Find("ExhibitUI");break;
            case 35:ProceduralMapWindow.Open();return;
            case 33:if(stage=="detail"){AssetDatabase.OpenAsset(AssetDatabase.LoadAssetAtPath<UnityEngine.Audio.AudioMixer>("Assets/LessonSamples/AudioPractice/LessonMix.mixer"));return;}break;
            case 34:if(stage=="detail"){Selection.activeGameObject=go;var animationWindow=EditorWindow.GetWindow<AnimationWindow>();animationWindow.animationClip=AssetDatabase.LoadAssetAtPath<AnimationClip>("Assets/LessonSamples/AudioPractice/FootContact.anim");animationWindow.Show();return;}break;
            case 29:Selection.activeObject=AssetDatabase.LoadAssetAtPath<PhysicsMaterial>("Assets/LessonSamples/PhysicsSandbox/Bouncy.physicMaterial");break;
        }
        view.Focus();
    }
    static void BuildWindows()
    {
        Directory.CreateDirectory("Builds/Windows");
        PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes=new[]{"Assets/Scenes/21-Build.unity"},
            locationPathName="Builds/Windows/Exhibit.exe",target=BuildTarget.StandaloneWindows64,
            options=BuildOptions.Development
        });
        File.WriteAllText("build-result.json",JsonUtility.ToJson(new BuildResult {
            result=report.summary.result.ToString(),errors=report.summary.totalErrors,
            seconds=report.summary.totalTime.TotalSeconds
        }));
    }
    [Serializable] class BuildResult {public string result;public int errors;public double seconds;}
    [Serializable] class RuntimeStatus {public string scene;public float time;public Vector3 position;public string ugui;public string uitoolkit;public int particles;public VrmBoneLesson.State vrm;public SoundPracticeLesson.State sound;public FoleyPracticeLesson.State foley;public UIPatternGallery.State gallery;}
}
