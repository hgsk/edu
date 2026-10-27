using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class PhysicsSandboxSamples
{
    const string Folder="Assets/LessonSamples/PhysicsSandbox/";
    [MenuItem("教材/物理サンドボックスを作成")]
    public static void CreateMissing()
    {
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
        foreach(bool bounce in new[]{false,true}){string path=Folder+(bounce?"Bouncy":"Soft")+".physicMaterial";if(!File.Exists(path)){var m=new PhysicsMaterial(bounce?"Bouncy":"Soft"){dynamicFriction=.1f,staticFriction=.1f,bounciness=bounce?.8f:.05f,bounceCombine=PhysicsMaterialCombine.Maximum,frictionCombine=PhysicsMaterialCombine.Minimum};AssetDatabase.CreateAsset(m,path);}}
        foreach(bool complete in new[]{false,true})
        {
            string path="Assets/Scenes/"+(complete?"Completed/":"")+"29-PhysicsSandbox.unity";if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));
            GameObject.Find("DisplayFloor").transform.localScale=new Vector3(12,.2f,6);
            var ball=Create("Exhibit",PrimitiveType.Sphere,"A","#246C96",new Vector3(-2.8f,3,0),Vector3.one*.8f,true);ball.GetComponent<Rigidbody>().mass=3;
            var ramp=Create("Ramp",PrimitiveType.Cube,"R","#C67B00",new Vector3(-1,1,0),new Vector3(5,.3f,1.8f),false);ramp.transform.rotation=Quaternion.Euler(0,0,complete?-15:0);
            var colors=new[]{"#F4E8A1","#E6DBF5","#81D8D0"};var blocks=new Rigidbody[3];
            for(int i=0;i<3;i++){var block=Create("Block"+(i+1),PrimitiveType.Cube,"B"+(i+1),colors[i],new Vector3(2.3f,.4f+i*.8f,0),Vector3.one*.78f,true);blocks[i]=block.GetComponent<Rigidbody>();}
            ball.GetComponent<Collider>().sharedMaterial=AssetDatabase.LoadAssetAtPath<PhysicsMaterial>(Folder+"Soft.physicMaterial");ramp.GetComponent<Collider>().sharedMaterial=AssetDatabase.LoadAssetAtPath<PhysicsMaterial>(Folder+"Soft.physicMaterial");
            var ui=new GameObject("ExhibitUI");var document=ui.AddComponent<UIDocument>();document.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");document.sortingOrder=10;
            var game=ui.AddComponent<PhysicsSandboxLesson>();game.ball=ball.GetComponent<Rigidbody>();game.ramp=ramp.transform;game.blocks=blocks;game.soft=AssetDatabase.LoadAssetAtPath<PhysicsMaterial>(Folder+"Soft.physicMaterial");game.bouncy=AssetDatabase.LoadAssetAtPath<PhysicsMaterial>(Folder+"Bouncy.physicMaterial");
            var camera=Camera.main;camera.transform.position=new Vector3(6,5,-11);camera.transform.LookAt(new Vector3(0,2,0));camera.fieldOfView=45;
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        foreach(bool complete in new[]{false,true}){var scene=EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+"29-PhysicsSandbox.unity");var floor=GameObject.Find("DisplayFloor");floor.transform.localScale=new Vector3(12,.2f,6);floor.transform.position=new Vector3(0,-.1f,0);Camera.main.transform.LookAt(new Vector3(0,2,0));EditorSceneManager.SaveScene(scene);}
        EditorSceneManager.OpenScene("Assets/Scenes/Completed/29-PhysicsSandbox.unity");
        foreach(string part in new[]{"Exhibit","Ramp","Block1","Block2","Block3"})if(!File.Exists(Folder+part+".prefab"))PrefabUtility.SaveAsPrefabAsset(GameObject.Find(part),Folder+part+".prefab");
        AssetDatabase.SaveAssets();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();
    }
    static GameObject Create(string name,PrimitiveType shape,string id,string hex,Vector3 position,Vector3 scale,bool dynamic)
    {
        var go=GameObject.CreatePrimitive(shape);go.name=name;go.transform.position=position;go.transform.localScale=scale;
        string path=Folder+id+".mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);if(!material){material=new Material(Shader.Find("Universal Render Pipeline/Lit"));material.color=CourseObjectPalette.Parse(hex);material.SetFloat("_Smoothness",.1f);AssetDatabase.CreateAsset(material,path);}go.GetComponent<Renderer>().sharedMaterial=material;
        var tag=go.AddComponent<CourseObjectIdentity>();tag.identifier=id;tag.colorHex=hex;tag.colorName=id;
        if(dynamic){var body=go.AddComponent<Rigidbody>();body.isKinematic=true;body.useGravity=true;body.collisionDetectionMode=CollisionDetectionMode.ContinuousSpeculative;body.constraints=RigidbodyConstraints.FreezePositionZ|RigidbodyConstraints.FreezeRotationX|RigidbodyConstraints.FreezeRotationY;}
        return go;
    }
    public static void Verify()
    {
        foreach(bool complete in new[]{false,true})
        {
            var scene=EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+"29-PhysicsSandbox.unity");var game=UnityEngine.Object.FindFirstObjectByType<PhysicsSandboxLesson>();
            if(!game || !game.ball || !game.ramp || game.blocks.Length!=3 || !game.soft || !game.bouncy)throw new Exception("Sandbox references missing");
            foreach(var body in new[]{game.ball,game.blocks[0],game.blocks[1],game.blocks[2]})if(!body.isKinematic || !body.useGravity || !body.GetComponent<Collider>())throw new Exception("Sandbox initial physics setup invalid");
            float angle=Mathf.DeltaAngle(0,game.ramp.eulerAngles.z);if(Mathf.Abs(angle-(complete?-15:0))>.1f)throw new Exception("Sandbox start / completed ramp differs");
        }
        Debug.Log("PHYSICS SANDBOX: PASS (2 scenes / 4 bodies / 3 blocks)");
    }
}
