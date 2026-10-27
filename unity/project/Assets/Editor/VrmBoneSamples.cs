using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;
using UniVRM10;

public static class VrmBoneSamples
{
    const string Folder="Assets/LessonSamples/VrmPractice/";
    static Material Material(string id,string hex){string path=Folder+id+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(path);if(!m){m=new Material(Shader.Find("Universal Render Pipeline/Unlit"));m.color=CourseObjectPalette.Parse(hex);AssetDatabase.CreateAsset(m,path);}return m;}
    static void Tag(GameObject go,string id,string hex){var tag=go.AddComponent<CourseObjectIdentity>();tag.identifier=id;tag.colorHex=hex;tag.colorName=id;}
    static Transform Marker(string name,string id,string hex,Vector3 position,float scale){var go=GameObject.CreatePrimitive(PrimitiveType.Sphere);go.name=name;go.transform.position=position;go.transform.localScale=Vector3.one*scale;UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());go.GetComponent<Renderer>().sharedMaterial=Material(id,hex);Tag(go,id,hex);return go.transform;}
    [MenuItem("教材/VRoidボーンサンプルを作成")]
    public static void CreateMissing()
    {
        AssetDatabase.Refresh();var source=AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"CourseAvatar.vrm");if(!source)throw new Exception("Import the exported VRM 1.0 first");
        string clipPath=Folder+"Wave.anim";var clip=AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPath);
        if(!clip){clip=new AnimationClip {name="Wave",frameRate=30};foreach(string muscle in new[]{"Left Arm Down-Up","Right Arm Down-Up"}){if(!HumanTrait.MuscleName.Contains(muscle))throw new Exception("Unknown Humanoid muscle "+muscle);clip.SetCurve("",typeof(Animator),muscle,AnimationCurve.Linear(0,-.35f,2,-.35f));}clip.SetCurve("",typeof(Animator),"Left Forearm Stretch",new AnimationCurve(new Keyframe(0,-.5f),new Keyframe(1,.3f),new Keyframe(2,-.5f)));var settings=AnimationUtility.GetAnimationClipSettings(clip);settings.loopTime=true;AnimationUtility.SetAnimationClipSettings(clip,settings);AssetDatabase.CreateAsset(clip,clipPath);}
        string ctrlPath=Folder+"Wave.controller";var ctrl=AssetDatabase.LoadAssetAtPath<AnimatorController>(ctrlPath);if(!ctrl){ctrl=AnimatorController.CreateAnimatorControllerAtPath(ctrlPath);var layers=ctrl.layers;layers[0].iKPass=true;ctrl.layers=layers;ctrl.layers[0].stateMachine.AddState("Wave").motion=clip;}
        foreach(bool complete in new[]{false,true})
        {
            string path="Assets/Scenes/"+(complete?"Completed/":"")+"32-VrmBones.unity";if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));
            var floor=GameObject.Find("DisplayFloor");floor.transform.position=new Vector3(0,-.06f,0);floor.transform.localScale=new Vector3(4,.1f,4);
            var model=(GameObject)PrefabUtility.InstantiatePrefab(source);model.name="Exhibit";model.transform.position=Vector3.zero;
            var vrm=model.GetComponent<Vrm10Instance>();vrm.UpdateType=Vrm10Instance.UpdateTypes.None;vrm.enabled=false; // This unit isolates Animator + Unity IK; no VRM spring/constraint evaluation.
            var animator=model.GetComponent<Animator>();if(!animator||!animator.avatar||!animator.avatar.isHuman)throw new Exception("Imported VRM must have a Humanoid Avatar");animator.runtimeAnimatorController=ctrl;animator.applyRootMotion=false;animator.cullingMode=AnimatorCullingMode.AlwaysAnimate;
            int meshIndex=0;foreach(var renderer in model.GetComponentsInChildren<SkinnedMeshRenderer>()){string id="M"+(++meshIndex);string hex=meshIndex==1?"#81D8D0":"#E6DBF5";renderer.sharedMaterials=renderer.sharedMaterials.Select(_=>Material(id,hex)).ToArray();Tag(renderer.gameObject,id,hex);renderer.updateWhenOffscreen=true;}
            var target=Marker("Target","T","#F4E8A1",new Vector3(.35f,1.25f,.15f),.12f);
            var markers=new[]{Marker("Shoulder","B1","#246C96",Vector3.zero,.09f),Marker("Elbow","B2","#C67B00",Vector3.zero,.085f),Marker("Hand","B3","#9D4C7A",Vector3.zero,.08f)};
            var ui=new GameObject("ExhibitUI");var doc=ui.AddComponent<UIDocument>();doc.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");doc.sortingOrder=10;
            var lesson=model.AddComponent<VrmBoneLesson>();lesson.target=target;lesson.document=doc;lesson.ikWeight=complete?1:0;lesson.markers=markers;
            Camera.main.orthographic=true;Camera.main.orthographicSize=1.65f;Camera.main.transform.position=new Vector3(0,1.8f,4);Camera.main.transform.LookAt(new Vector3(0,1.35f,0));Camera.main.backgroundColor=CourseObjectPalette.Parse("#080C11");
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        foreach(bool complete in new[]{false,true}){var scene=EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+"32-VrmBones.unity");UnityEngine.Object.FindFirstObjectByType<VrmBoneLesson>().target.position=new Vector3(.35f,1.25f,.15f);Camera.main.transform.LookAt(new Vector3(0,1.35f,0));Camera.main.backgroundColor=CourseObjectPalette.Parse("#080C11");EditorSceneManager.SaveScene(scene);}
        InitializeClipBodyPose();AssetDatabase.SaveAssets();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();
    }
    public static void Verify()
    {
        int meshCount=0,bones=0;foreach(bool complete in new[]{false,true}){
            EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+"32-VrmBones.unity");var l=UnityEngine.Object.FindFirstObjectByType<VrmBoneLesson>();var a=l.GetComponent<Animator>();var ctrl=(AnimatorController)a.runtimeAnimatorController;
            if(!a.avatar.isValid||!a.avatar.isHuman||!ctrl.layers[0].iKPass||l.ikWeight!=(complete?1:0)||l.markers.Length!=3||!l.target||!l.document)throw new Exception("Invalid VRM lesson references");
            foreach(var r in l.GetComponentsInChildren<SkinnedMeshRenderer>()){meshCount++;bones+=r.bones.Length;if(!r.sharedMesh||r.sharedMesh.bindposes.Length==0||r.bones.Any(b=>!b))throw new Exception("Invalid skin");}
        }
        if(meshCount==0||bones==0)throw new Exception("Missing skinned VRoid mesh");Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/32-vrm.json",$"{{\"status\":\"PASS\",\"meshesAcrossTwoScenes\":{meshCount},\"boneReferences\":{bones},\"humanoid\":true,\"ikPass\":true}}");Debug.Log("VRM BONE SAMPLES: PASS");
    }
    [MenuItem("教材/VRoidの基準ポーズを設定")]
    public static void InitializeClipBodyPose()
    {
        var source=AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"CourseAvatar.vrm");
        var sample=UnityEngine.Object.Instantiate(source);var a=sample.GetComponent<Animator>();
        var pose=new HumanPose();using(var handler=new HumanPoseHandler(a.avatar,a.transform))handler.GetHumanPose(ref pose);
        var clip=AssetDatabase.LoadAssetAtPath<AnimationClip>(Folder+"Wave.anim");
        // Unkeyed Humanoid muscles default to their midpoint, which bends the knees.
        // Preserve the imported neutral stance for every muscle outside the exercise.
        for(int i=0;i<HumanTrait.MuscleCount;i++)
            if(!new[]{"Left Arm Down-Up","Right Arm Down-Up","Left Forearm Stretch"}.Contains(HumanTrait.MuscleName[i]))
                clip.SetCurve("",typeof(Animator),HumanTrait.MuscleName[i],AnimationCurve.Constant(0,2,pose.muscles[i]));
        foreach(var value in new[]{("RootT.x",pose.bodyPosition.x),("RootT.y",pose.bodyPosition.y),("RootT.z",pose.bodyPosition.z),("RootQ.x",pose.bodyRotation.x),("RootQ.y",pose.bodyRotation.y),("RootQ.z",pose.bodyRotation.z),("RootQ.w",pose.bodyRotation.w)})
            clip.SetCurve("",typeof(Animator),value.Item1,AnimationCurve.Constant(0,2,value.Item2));
        Debug.Log("VRM neutral body position "+pose.bodyPosition+" humanScale "+a.humanScale);
        UnityEngine.Object.DestroyImmediate(sample);EditorUtility.SetDirty(clip);AssetDatabase.SaveAssets();
    }
}
