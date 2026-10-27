using System;
using System.Collections;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

// One Web build contains all samples. Editor and native players are unaffected.
public class WebCoursePlayer : MonoBehaviour
{
    [Serializable] public class Entry { public string key; public string path; }
    [Serializable] public class Catalog { public Entry[] scenes; }
    [Serializable] public class Snapshot
    {
        public string key, scene, label, graphics;
        public float x, y, time, buttonX, buttonY;
        public bool ready,collisionPairIgnored;
        public CollisionPracticeLesson.State collision;
        public Identity[] objects;
        public CourseGameLesson.State loop;
        public CourseDependencyLesson.State safety;
        public PhysicsSandboxLesson.State sandbox;
        public SpatialPracticeLesson.State spatial;
        public VrmBoneLesson.State vrm;
        public SoundPracticeLesson.State sound;
        public FoleyPracticeLesson.State foley;public UIPatternGallery.State gallery;public ProceduralMapLesson.State procedural;
    }
    [Serializable] public class Identity { public string id, name, hex; public float x, y, z; }
    Catalog catalog;
    string current;
    bool loading;
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void CourseSnapshot(string json);
#endif
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        var go = new GameObject("WebCoursePlayer");
        DontDestroyOnLoad(go);
        go.AddComponent<WebCoursePlayer>();
#endif
    }
    void Start()
    {
        catalog=JsonUtility.FromJson<Catalog>(Resources.Load<TextAsset>("WebCourseCatalog").text);
        LoadSample("01-start");
    }
    public void LoadSample(string key)
    {
        if(loading || !Array.Exists(catalog.scenes,e=>e.key==key))return;
        StartCoroutine(Open(key));
    }
    IEnumerator Open(string key)
    {
        loading=true;
        var entry=Array.Find(catalog.scenes,e=>e.key==key);
        yield return SceneManager.LoadSceneAsync(entry.path);
        yield return null;
        current=key;loading=false;
        Report();
    }
    float nextReport;
    void Update() { if(!loading && Time.unscaledTime>=nextReport){nextReport=Time.unscaledTime+.25f;Report();} }
    void Report()
    {
        var exhibit=GameObject.Find("Exhibit");
        var uiObject=GameObject.Find("ExhibitUI");
        var doc=uiObject?uiObject.GetComponent<UIDocument>():null;
        var text=UnityEngine.Object.FindFirstObjectByType<TMPro.TMP_Text>();
        var pos=exhibit?exhibit.transform.position:Vector3.zero;
        float bx=0,by=0;
        if(doc) {
            var button=doc.rootVisualElement.Q<UnityEngine.UIElements.Button>();
            if(button!=null){var panel=doc.rootVisualElement.panel.visualTree.worldBound;bx=button.worldBound.center.x/panel.width;by=button.worldBound.center.y/panel.height;}
        } else {
            var button=UnityEngine.Object.FindFirstObjectByType<UnityEngine.UI.Button>();
            if(button){var p=RectTransformUtility.WorldToScreenPoint(null,button.transform.position);bx=p.x/Screen.width;by=1-p.y/Screen.height;}
        }
        // Wait for valid UI geometry rather than emitting NaN, which is invalid JSON.
        if(float.IsNaN(bx) || float.IsInfinity(bx) || float.IsNaN(by) || float.IsInfinity(by))return;
        var lesson=UnityEngine.Object.FindFirstObjectByType<CourseGameLesson>();
        var loopState=lesson?lesson.Capture():null;
        if(lesson && loopState==null)return;
        var dependency=UnityEngine.Object.FindFirstObjectByType<CourseDependencyLesson>();
        var safety=dependency?dependency.Capture():null;if(dependency && safety==null)return;
        var sandboxLesson=UnityEngine.Object.FindFirstObjectByType<PhysicsSandboxLesson>();
        var sandbox=sandboxLesson?sandboxLesson.Capture():null;if(sandboxLesson && sandbox==null)return;
        var spatialLesson=UnityEngine.Object.FindFirstObjectByType<SpatialPracticeLesson>();
        var spatial=spatialLesson?spatialLesson.Capture():null;if(spatialLesson && spatial==null)return;
        var vrmLesson=FindFirstObjectByType<VrmBoneLesson>();var vrm=vrmLesson?vrmLesson.Capture():null;if(vrmLesson && vrm==null)return;
        var soundLesson=FindFirstObjectByType<SoundPracticeLesson>();var sound=soundLesson?soundLesson.Capture():null;if(soundLesson && sound==null)return;
        var foleyLesson=FindFirstObjectByType<FoleyPracticeLesson>();var foley=foleyLesson?foleyLesson.Capture():null;if(foleyLesson && foley==null)return;
        var galleryLesson=FindFirstObjectByType<UIPatternGallery>();var gallery=galleryLesson?galleryLesson.Capture():null;if(galleryLesson && gallery==null)return;
        var proceduralLesson=FindFirstObjectByType<ProceduralMapLesson>();var procedural=proceduralLesson?proceduralLesson.Capture():null;if(proceduralLesson && procedural==null)return;
        var collisionLesson=FindFirstObjectByType<CollisionPracticeLesson>();var collision=collisionLesson?collisionLesson.Capture():null;if(collisionLesson&&collision==null)return;
        int ballLayer=LayerMask.NameToLayer("CourseBall"),wallLayer=LayerMask.NameToLayer("CourseWall");
        var value=new Snapshot {key=current,scene=SceneManager.GetActiveScene().name,
            collision=collision,collisionPairIgnored=ballLayer>=0&&wallLayer>=0&&Physics.GetIgnoreLayerCollision(ballLayer,wallLayer),
            x=pos.x,y=pos.y,time=Time.time,ready=!loading,
            label=doc?doc.rootVisualElement.Q<Label>("status")?.text:text?text.text:"",
            graphics=SystemInfo.graphicsDeviceType.ToString(),buttonX=bx,buttonY=by,
            loop=loopState,
            safety=safety,
            sandbox=sandbox,
            spatial=spatial,
            vrm=vrm,sound=sound,foley=foley,gallery=gallery,procedural=procedural,
            objects=Array.ConvertAll(UnityEngine.Object.FindObjectsByType<CourseObjectIdentity>(FindObjectsSortMode.None),
                tag=>new Identity {id=tag.identifier,name=tag.name,hex=tag.colorHex,x=tag.transform.position.x,y=tag.transform.position.y,z=tag.transform.position.z})};
#if UNITY_WEBGL && !UNITY_EDITOR
        CourseSnapshot(JsonUtility.ToJson(value));
#endif
    }
}
