using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Audio;
using UnityEngine.UIElements;

public static class AudioPracticeSamples
{
    const string Folder="Assets/LessonSamples/AudioPractice/";
    const BindingFlags Flags=BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static;
    static Material Material(string id,string hex){string path=Folder+id+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(path);if(!m){m=new Material(Shader.Find("Universal Render Pipeline/Lit"));m.color=CourseObjectPalette.Parse(hex);AssetDatabase.CreateAsset(m,path);}return m;}
    static GameObject Shape(string name,string id,string hex,PrimitiveType shape,Vector3 p,Vector3 scale){var go=GameObject.CreatePrimitive(shape);go.name=name;go.transform.position=p;go.transform.localScale=scale;go.GetComponent<Renderer>().sharedMaterial=Material(id,hex);var tag=go.AddComponent<CourseObjectIdentity>();tag.identifier=id;tag.colorHex=hex;tag.colorName=id;return go;}
    static AudioSource Source(GameObject go,string clip,AudioMixerGroup group,bool loop,float blend,float volume){var a=go.AddComponent<AudioSource>();a.clip=clip==null?null:AssetDatabase.LoadAssetAtPath<AudioClip>(clip);a.playOnAwake=false;a.loop=loop;a.spatialBlend=blend;a.volume=volume;a.dopplerLevel=0;a.rolloffMode=AudioRolloffMode.Linear;a.minDistance=1;a.maxDistance=10;a.outputAudioMixerGroup=group;return a;}
    static UIDocument UI(){var go=new GameObject("ExhibitUI");var d=go.AddComponent<UIDocument>();d.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");d.sortingOrder=10;return d;}
    // Authoring helper only, pinned to the course's Editor. Runtime uses public AudioMixer APIs.
    static AudioMixer CreateMixer()
    {
        string path=Folder+"LessonMix.mixer";var mixer=AssetDatabase.LoadAssetAtPath<AudioMixer>(path);if(mixer)return mixer;
        var type=AppDomain.CurrentDomain.GetAssemblies().Select(a=>a.GetType("UnityEditor.Audio.AudioMixerController")).First(t=>t!=null);
        var controller=type.GetMethod("CreateMixerControllerAtPath",Flags).Invoke(null,new object[]{path});
        var master=type.GetProperty("masterGroup",Flags).GetValue(controller);var music=type.GetMethod("CreateNewGroup",Flags).Invoke(controller,new object[]{"Music",false});var sfx=type.GetMethod("CreateNewGroup",Flags).Invoke(controller,new object[]{"SFX",false});
        foreach(var group in new[]{music,sfx})type.GetMethod("AddChildToParent",Flags).Invoke(controller,new[]{group,master});
        var property=type.GetProperty("exposedParameters",Flags);var element=property.PropertyType.GetElementType();var exposed=Array.CreateInstance(element,2);
        int i=0;foreach(var value in new[]{("MasterGain",master),("MusicGain",music)}){var item=Activator.CreateInstance(element);element.GetField("name",Flags).SetValue(item,value.Item1);var guid=value.Item2.GetType().GetMethod("GetGUIDForVolume",Flags).Invoke(value.Item2,null);element.GetField("guid",Flags).SetValue(item,guid);exposed.SetValue(item,i++);}property.SetValue(controller,exposed);
        EditorUtility.SetDirty((UnityEngine.Object)controller);AssetDatabase.SaveAssets();return (AudioMixer)controller;
    }
    static AnimatorController Walk(string name,bool contact)
    {
        string path=Folder+name+".controller";var controller=AssetDatabase.LoadAssetAtPath<AnimatorController>(path);if(controller)return controller;
        var clip=new AnimationClip {name=name,frameRate=60};
        foreach(bool left in new[]{true,false}){var values=left?new[]{.1f,.28f,.4f,.28f,.1f}:new[]{.4f,.28f,.1f,.28f,.4f};var curve=new AnimationCurve();for(int i=0;i<5;i++)curve.AddKey(i*.25f,values[i]);clip.SetCurve(left?"LeftFoot":"RightFoot",typeof(Transform),"localPosition.y",curve);}
        var settings=AnimationUtility.GetAnimationClipSettings(clip);settings.loopTime=true;AnimationUtility.SetAnimationClipSettings(clip,settings);
        AnimationUtility.SetAnimationEvents(clip,new[]{new AnimationEvent{time=contact?.02f:.27f,functionName="FootContact",intParameter=0},new AnimationEvent{time=contact?.52f:.77f,functionName="FootContact",intParameter=1}});
        AssetDatabase.CreateAsset(clip,Folder+name+".anim");controller=AnimatorController.CreateAnimatorControllerAtPath(path);controller.layers[0].stateMachine.AddState("Walk").motion=clip;return controller;
    }
    [MenuItem("教材/サウンドとフォーリーのサンプルを作成")]
    public static void CreateMissing()
    {
        AssetDatabase.Refresh();foreach(var path in Directory.GetFiles(Folder).Where(p=>p.EndsWith(".ogg")||p.EndsWith(".wav"))){var importer=(AudioImporter)AssetImporter.GetAtPath(path);importer.forceToMono=true;var settings=importer.defaultSampleSettings;settings.loadType=AudioClipLoadType.DecompressOnLoad;settings.compressionFormat=AudioCompressionFormat.PCM;importer.defaultSampleSettings=settings;importer.SaveAndReimport();}
        var mixer=CreateMixer();var musicGroup=mixer.FindMatchingGroups("Music").Single();var sfx=mixer.FindMatchingGroups("SFX").Single();var contact=Walk("FootContact",true);var early=Walk("FootEarly",false);
        foreach(int unit in new[]{33,34})foreach(bool complete in new[]{false,true})
        {
            string path="Assets/Scenes/"+(complete?"Completed/":"")+(unit==33?"33-Sound":"34-Foley")+".unity";if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));var floor=GameObject.Find("DisplayFloor");floor.transform.position=new Vector3(0,-.1f,0);floor.transform.localScale=new Vector3(16,.2f,8);
            var document=UI();var camera=Camera.main;camera.orthographic=true;camera.orthographicSize=unit==33?6:4;camera.transform.position=new Vector3(0,7,-10);camera.transform.LookAt(new Vector3(0,1.6f,0));
            if(unit==33){UnityEngine.Object.DestroyImmediate(camera.GetComponent<AudioListener>());
                var emitter=Shape("Exhibit","A","#246C96",PrimitiveType.Cube,new Vector3(-2,.6f,0),Vector3.one);var listener=Shape("Listener","L","#C67B00",PrimitiveType.Capsule,new Vector3(-1,1,0),new Vector3(.4f,.5f,.4f));listener.AddComponent<AudioListener>();
                var lesson=document.gameObject.AddComponent<SoundPracticeLesson>();lesson.music=Source(new GameObject("Music2D"),Folder+"LessonMusic.wav",musicGroup,true,0,.18f);lesson.ambience=Source(emitter,Folder+"LessonAmbience.wav",sfx,true,complete?1:0,.3f);lesson.cue=Source(new GameObject("UICue2D"),"Assets/Art/Chime.wav",sfx,false,0,.35f);lesson.mixer=mixer;lesson.listener=listener.transform;
            }else{
                var actor=new GameObject("Exhibit");actor.transform.position=new Vector3(-1.5f,0,0);var body=Shape("Body","A","#246C96",PrimitiveType.Capsule,new Vector3(-1.5f,1,0),new Vector3(.4f,.65f,.4f));body.transform.SetParent(actor.transform,true);
                var left=Shape("LeftFoot","L","#C67B00",PrimitiveType.Cube,new Vector3(-1.72f,.1f,0),new Vector3(.25f,.1f,.55f));left.transform.SetParent(actor.transform,true);var right=Shape("RightFoot","R","#F4E8A1",PrimitiveType.Cube,new Vector3(-1.28f,.4f,0),new Vector3(.25f,.1f,.55f));right.transform.SetParent(actor.transform,true);
                Shape("Concrete","C","#BAC4CE",PrimitiveType.Cube,new Vector3(-1.5f,0,0),new Vector3(2.4f,.1f,2.5f));Shape("Wood","W","#9D4C7A",PrimitiveType.Cube,new Vector3(1.5f,0,0),new Vector3(2.4f,.1f,2.5f));
                var animator=actor.AddComponent<Animator>();animator.runtimeAnimatorController=complete?contact:early;animator.cullingMode=AnimatorCullingMode.AlwaysAnimate;Source(actor,null,sfx,false,1,.4f).maxDistance=30;
                var lesson=actor.AddComponent<FoleyPracticeLesson>();lesson.document=document;lesson.contactController=contact;lesson.earlyController=early;lesson.synchronized=complete;lesson.leftFoot=left.transform;lesson.rightFoot=right.transform;lesson.concrete=Enumerable.Range(0,3).Select(n=>AssetDatabase.LoadAssetAtPath<AudioClip>(Folder+"footstep_concrete_"+n.ToString("000")+".ogg")).ToArray();lesson.wood=Enumerable.Range(0,3).Select(n=>AssetDatabase.LoadAssetAtPath<AudioClip>(Folder+"footstep_wood_"+n.ToString("000")+".ogg")).ToArray();
            }
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        AssetDatabase.SaveAssets();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();DependencyLesson.ValidateCompleted();
    }
    public static void Verify()
    {
        int events=0;foreach(int unit in new[]{33,34})foreach(bool complete in new[]{false,true}){
            EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+(unit==33?"33-Sound":"34-Foley")+".unity");if(UnityEngine.Object.FindObjectsByType<AudioListener>(FindObjectsSortMode.None).Length!=1)throw new Exception("Exactly one listener required");
            if(unit==33){var l=UnityEngine.Object.FindFirstObjectByType<SoundPracticeLesson>();if(!l.music.clip||!l.ambience.clip||!l.cue.clip||l.ambience.spatialBlend!=(complete?1:0)||l.music.spatialBlend!=0||l.cue.loop||l.music.playOnAwake||!l.music.outputAudioMixerGroup||!l.mixer.GetFloat("MasterGain",out _)||!l.mixer.GetFloat("MusicGain",out _))throw new Exception("Invalid sound references or mixer");}
            else{var l=UnityEngine.Object.FindFirstObjectByType<FoleyPracticeLesson>();if(l.synchronized!=complete||l.concrete.Length!=3||l.wood.Length!=3||l.concrete.Concat(l.wood).Any(c=>!c)||!l.leftFoot||!l.rightFoot)throw new Exception("Invalid Foley references");var clip=((AnimatorController)l.GetComponent<Animator>().runtimeAnimatorController).animationClips.Single();var es=AnimationUtility.GetAnimationEvents(clip);if(es.Length!=2||es[0].time!=(complete?.02f:.27f)||es.Any(e=>e.functionName!="FootContact"))throw new Exception("Invalid contact events");events+=es.Length;}
        }
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/33-34-audio.json",$"{{\"status\":\"PASS\",\"scenes\":4,\"foleyEventsAcrossScenes\":{events},\"listenersPerScene\":1,\"mixerGroups\":3,\"exposedGains\":2}}");Debug.Log("SOUND AND FOLEY SAMPLES: PASS");
    }
}
