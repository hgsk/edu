using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class SpatialPracticeSamples
{
    const string Folder="Assets/LessonSamples/SpatialPractice/";
    static Material Material(string id,string hex){string path=Folder+id+".mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);if(!material){material=new Material(Shader.Find("Universal Render Pipeline/Lit"));material.color=CourseObjectPalette.Parse(hex);material.SetFloat("_Smoothness",.1f);AssetDatabase.CreateAsset(material,path);}return material;}
    static void Identify(GameObject go,string id,string hex){go.GetComponent<Renderer>().sharedMaterial=Material(id,hex);var tag=go.GetComponent<CourseObjectIdentity>()??go.AddComponent<CourseObjectIdentity>();tag.identifier=id;tag.colorHex=hex;tag.colorName=id;}
    static GameObject Shape(string name,PrimitiveType shape,string id,string hex,Vector3 position,Vector3 scale){var go=GameObject.CreatePrimitive(shape);go.name=name;go.transform.position=position;go.transform.localScale=scale;Identify(go,id,hex);return go;}
    static void CreateKit()
    {
        foreach(string part in new[]{"SideModule","HeaderModule","SignModule"})
        {
            if(File.Exists(Folder+part+".prefab"))continue;
            var root=new GameObject(part);bool sign=part=="SignModule",side=part=="SideModule";
            var mesh=Shape(part+"Mesh",sign?PrimitiveType.Cylinder:PrimitiveType.Cube,"K0","#81D8D0",side?new Vector3(0,1.2f,0):Vector3.zero,side?new Vector3(.7f,2.4f,.3f):sign?new Vector3(.6f,.06f,.6f):new Vector3(3.4f,.5f,.3f));
            mesh.transform.SetParent(root.transform,true);UnityEngine.Object.DestroyImmediate(mesh.GetComponent<Collider>());if(sign)mesh.transform.rotation=Quaternion.Euler(90,0,0);
            PrefabUtility.SaveAsPrefabAsset(root,Folder+part+".prefab");UnityEngine.Object.DestroyImmediate(root);
        }
        if(File.Exists(Folder+"GateAssembly.prefab"))return;
        var gate=new GameObject("GateAssembly");
        var parts=new[]{"SideModule","SideModule","HeaderModule","SignModule"};var colors=new[]{"#81D8D0","#E6DBF5","#D69C83","#E9B872"};var positions=new[]{new Vector3(-1.35f,0,-.65f),new Vector3(1.35f,0,-.65f),new Vector3(0,2.65f,-.65f),new Vector3(0,2.65f,-.9f)};
        for(int i=0;i<4;i++){var part=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Folder+parts[i]+".prefab"));part.name=parts[i]+(i+1);part.transform.SetParent(gate.transform,false);part.transform.localPosition=positions[i];var mesh=part.GetComponentInChildren<MeshRenderer>();Identify(mesh.gameObject,"K"+(i+1),colors[i]);PrefabUtility.RecordPrefabInstancePropertyModifications(mesh);PrefabUtility.RecordPrefabInstancePropertyModifications(mesh.GetComponent<CourseObjectIdentity>());}
        PrefabUtility.SaveAsPrefabAsset(gate,Folder+"GateAssembly.prefab");UnityEngine.Object.DestroyImmediate(gate);
    }
    static void UpdateCladding()
    {
        foreach(string part in new[]{"SideModule","HeaderModule"}){var root=PrefabUtility.LoadPrefabContents(Folder+part+".prefab");var mesh=root.GetComponentInChildren<MeshRenderer>();var scale=mesh.transform.localScale;scale.z=.3f;mesh.transform.localScale=scale;PrefabUtility.SaveAsPrefabAsset(root,Folder+part+".prefab");PrefabUtility.UnloadPrefabContents(root);}
        var gate=PrefabUtility.LoadPrefabContents(Folder+"GateAssembly.prefab");foreach(Transform child in gate.transform){var p=child.localPosition;p.z=child.name.StartsWith("Sign")?-.9f:-.65f;child.localPosition=p;PrefabUtility.RecordPrefabInstancePropertyModifications(child);}PrefabUtility.SaveAsPrefabAsset(gate,Folder+"GateAssembly.prefab");PrefabUtility.UnloadPrefabContents(gate);
    }
    [MenuItem("教材/グレイボックスとキットバッシュを作成")]
    public static void CreateMissing()
    {
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);CreateKit();UpdateCladding();
        foreach(int id in new[]{30,31})foreach(bool complete in new[]{false,true})
        {
            string path="Assets/Scenes/"+(complete?"Completed/":"")+(id==30?"30-Graybox":"31-Kitbash")+".unity";if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));
            var floor=GameObject.Find("DisplayFloor");floor.transform.position=new Vector3(0,-.1f,0);floor.transform.localScale=new Vector3(10,.2f,10);
            var player=Shape("Exhibit",PrimitiveType.Capsule,"A","#246C96",new Vector3(0,1,-3.4f),Vector3.one);UnityEngine.Object.DestroyImmediate(player.GetComponent<Collider>());var actor=player.AddComponent<CharacterController>();actor.height=2;actor.radius=.45f;actor.skinWidth=.03f;actor.stepOffset=.1f;
            bool open=id==31||complete;float center=open?2.5f:1.6f;
            var left=Shape("WallLeft",PrimitiveType.Cube,"L","#C67B00",new Vector3(-center,1,0),new Vector3(3,2,1));
            var right=Shape("WallRight",PrimitiveType.Cube,"R","#BAC4CE",new Vector3(center,1,0),new Vector3(3,2,1));
            var start=Shape("Entrance",PrimitiveType.Cylinder,"S","#9D4C7A",new Vector3(0,.02f,-3.4f),new Vector3(1,.02f,1));UnityEngine.Object.DestroyImmediate(start.GetComponent<Collider>());
            var goal=Shape("Exit",PrimitiveType.Cylinder,"G","#F4E8A1",new Vector3(0,.02f,3.4f),new Vector3(1,.02f,1));UnityEngine.Object.DestroyImmediate(goal.GetComponent<Collider>());
            GameObject kit=null;if(id==31&&complete){kit=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"GateAssembly.prefab"));left.GetComponent<Renderer>().enabled=true;right.GetComponent<Renderer>().enabled=true;}
            var ui=new GameObject("ExhibitUI");var document=ui.AddComponent<UIDocument>();document.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");document.sortingOrder=10;
            var lesson=ui.AddComponent<SpatialPracticeLesson>();lesson.actor=actor;lesson.goal=goal.transform;lesson.blockoutWalls=new[]{left.GetComponent<Renderer>(),right.GetComponent<Renderer>()};lesson.kitRoot=kit;lesson.kitbash=id==31;
            var camera=Camera.main;camera.orthographic=true;camera.orthographicSize=8;camera.transform.position=new Vector3(7,16,-12);camera.transform.LookAt(new Vector3(0,2.5f,0));
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        foreach(int id in new[]{30,31})foreach(bool complete in new[]{false,true}){var finalScene=EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+(id==30?"30-Graybox":"31-Kitbash")+".unity");Camera.main.transform.position=new Vector3(7,16,-12);Camera.main.transform.LookAt(new Vector3(0,2.5f,0));foreach(var wall in UnityEngine.Object.FindFirstObjectByType<SpatialPracticeLesson>().blockoutWalls)wall.enabled=true;EditorSceneManager.SaveScene(finalScene);}
        AssetDatabase.SaveAssets();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();
    }
    public static void Verify()
    {
        int parts=0;
        foreach(int id in new[]{30,31})foreach(bool complete in new[]{false,true})
        {
            var scene=EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+(id==30?"30-Graybox":"31-Kitbash")+".unity");var lesson=UnityEngine.Object.FindFirstObjectByType<SpatialPracticeLesson>();
            if(!lesson || !lesson.actor || !lesson.goal || lesson.blockoutWalls.Length!=2)throw new Exception("Spatial references missing");
            float width=lesson.blockoutWalls[1].bounds.min.x-lesson.blockoutWalls[0].bounds.max.x;float expected=id==30&&!complete?.2f:2;
            if(Mathf.Abs(width-expected)>.01f || Mathf.Abs(lesson.actor.radius-.45f)>.001f)throw new Exception("Opening / character dimensions differ");
            foreach(var wall in lesson.blockoutWalls)if(!wall.GetComponent<BoxCollider>().enabled)throw new Exception("Keep blockout collision");
            if(id==31&&complete){if(!lesson.kitRoot || !PrefabUtility.IsPartOfPrefabInstance(lesson.kitRoot))throw new Exception("Kit must remain a Prefab instance");var nested=lesson.kitRoot.transform.Cast<Transform>().Select(t=>PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(t.gameObject)).ToArray();if(nested.Length!=4 || nested.Distinct().Count()!=3 || nested.Count(path=>path==Folder+"SideModule.prefab")!=2 || !nested.Contains(Folder+"HeaderModule.prefab") || !nested.Contains(Folder+"SignModule.prefab"))throw new Exception("Kit nested Prefab sources differ");parts=lesson.kitRoot.GetComponentsInChildren<MeshRenderer>().Length;if(parts!=4 || lesson.kitRoot.GetComponentsInChildren<Collider>().Length!=0)throw new Exception("Kit visual parts / collider separation invalid");if(lesson.blockoutWalls.Any(w=>!w.enabled))throw new Exception("Keep base walls visible to match collision");}
            else if(lesson.kitRoot)throw new Exception("Unexpected kit in blockout scene");
        }
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/30-31-spatial.json","{\"status\":\"PASS\",\"scenes\":4,\"openingStart\":0.2,\"openingComplete\":2,\"characterDiameter\":0.9,\"kitMeshes\":"+parts+",\"visualColliders\":0}");Debug.Log("SPATIAL PRACTICE: PASS (4 scenes / 0.2m to 2m opening / nested kit Prefabs)");
    }
}
