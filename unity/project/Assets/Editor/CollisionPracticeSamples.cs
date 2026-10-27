using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class CollisionPracticeSamples
{
    const string Name="36-Collision";
    const string Folder="Assets/LessonSamples/Collision/";
    static Material Material(string id,string hex,bool unlit=false){string path=Folder+id+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(path);if(!m){m=new Material(Shader.Find(unlit?"Universal Render Pipeline/Unlit":"Universal Render Pipeline/Lit"));m.color=CourseObjectPalette.Parse(hex);AssetDatabase.CreateAsset(m,path);}return m;}
    static GameObject Shape(string name,string id,string hex,PrimitiveType shape,Vector3 position,Vector3 scale){var go=GameObject.CreatePrimitive(shape);go.name=name;go.transform.position=position;go.transform.localScale=scale;go.GetComponent<Renderer>().sharedMaterial=Material(id,hex);var tag=go.AddComponent<CourseObjectIdentity>();tag.identifier=id;tag.colorHex=hex;tag.colorName=id=="A"?"青":id=="W"?"橙":"赤紫";return go;}
    static int Layer(string name){int existing=LayerMask.NameToLayer(name);if(existing>=0)return existing;var settings=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset")[0]);var layers=settings.FindProperty("layers");for(int i=8;i<32;i++)if(string.IsNullOrEmpty(layers.GetArrayElementAtIndex(i).stringValue)){layers.GetArrayElementAtIndex(i).stringValue=name;settings.ApplyModifiedPropertiesWithoutUndo();return i;}throw new Exception("教材専用レイヤーの空きがありません。");}
    public static void CreateMissing()
    {
        if(!Application.isBatchMode)throw new InvalidOperationException("教材Editorを閉じてCLIから実行してください。");
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();int ballLayer=Layer("CourseBall"),wallLayer=Layer("CourseWall"),sensorLayer=Layer("CourseSensor");
        foreach(bool complete in new[]{false,true}){
            string path="Assets/Scenes/"+(complete?"Completed/":"")+Name+".unity";if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));
            var floor=GameObject.Find("DisplayFloor");floor.transform.position=new Vector3(0,-.15f,0);floor.transform.localScale=new Vector3(12,.2f,5);
            var ui=new GameObject("ExhibitUI");var doc=ui.AddComponent<UIDocument>();doc.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");doc.sortingOrder=10;var lesson=ui.AddComponent<CollisionPracticeLesson>();
            var ball=Shape("Exhibit","A","#246C96",PrimitiveType.Sphere,new Vector3(-4,.6f,0),Vector3.one*.8f);ball.layer=ballLayer;var rb=ball.AddComponent<Rigidbody>();rb.useGravity=false;rb.constraints=RigidbodyConstraints.FreezePositionY|RigidbodyConstraints.FreezePositionZ|RigidbodyConstraints.FreezeRotation;rb.collisionDetectionMode=CollisionDetectionMode.ContinuousDynamic;rb.isKinematic=true;var probe=ball.AddComponent<CollisionPracticeProbe>();probe.lesson=lesson;lesson.ball=rb;
            var wall=Shape("CollisionWall","W","#C67B00",PrimitiveType.Cube,new Vector3(2,.85f,0),new Vector3(.5f,1.8f,2.5f));wall.layer=wallLayer;lesson.wall=wall.GetComponent<BoxCollider>();lesson.wall.isTrigger=!complete;
            var sensor=Shape("TriggerSensor","G","#9D4C7A",PrimitiveType.Cube,new Vector3(-1,.8f,0),new Vector3(1.2f,1.6f,2));sensor.layer=sensorLayer;lesson.sensor=sensor.GetComponent<BoxCollider>();lesson.sensor.isTrigger=true;sensor.GetComponent<MeshRenderer>().enabled=false;
            var line=sensor.AddComponent<LineRenderer>();line.sharedMaterial=Material("SensorWire","#9D4C7A",true);line.useWorldSpace=false;line.widthMultiplier=.035f;line.positionCount=16;line.SetPositions(new[]{new Vector3(-.5f,-.5f,-.5f),new Vector3(.5f,-.5f,-.5f),new Vector3(.5f,-.5f,.5f),new Vector3(-.5f,-.5f,.5f),new Vector3(-.5f,-.5f,-.5f),new Vector3(-.5f,.5f,-.5f),new Vector3(.5f,.5f,-.5f),new Vector3(.5f,-.5f,-.5f),new Vector3(.5f,.5f,-.5f),new Vector3(.5f,.5f,.5f),new Vector3(.5f,-.5f,.5f),new Vector3(.5f,.5f,.5f),new Vector3(-.5f,.5f,.5f),new Vector3(-.5f,-.5f,.5f),new Vector3(-.5f,.5f,.5f),new Vector3(-.5f,.5f,-.5f)});
            Camera.main.orthographic=true;Camera.main.orthographicSize=5;Camera.main.transform.position=new Vector3(5,8,-12);Camera.main.transform.LookAt(new Vector3(0,2.5f,0));
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        AssetDatabase.SaveAssets();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();
    }
    public static void Verify()
    {
        foreach(bool complete in new[]{false,true}){EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+Name+".unity");var lesson=UnityEngine.Object.FindFirstObjectByType<CollisionPracticeLesson>();if(!lesson||!lesson.ball||!lesson.wall||!lesson.sensor||!lesson.sensor.isTrigger||lesson.wall.isTrigger==complete||lesson.ball.useGravity||lesson.ball.GetComponent<CollisionPracticeProbe>().lesson!=lesson)throw new Exception("当たり判定のサンプル参照が不正です。");if(Physics.GetIgnoreLayerCollision(lesson.ball.gameObject.layer,lesson.wall.gameObject.layer))throw new Exception("球と壁の衝突がProject Settingsで無効です。");JapaneseCourseFonts.VerifyScene(EditorSceneManager.GetActiveScene());}
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/36-collision.json","{\"status\":\"PASS\",\"scenes\":2,\"scope\":\"3D collider, trigger, layer pair and raycast\"}");
    }
    public static void UpdateViews()
    {
        if(!Application.isBatchMode)throw new InvalidOperationException("CLI専用です。");
        foreach(bool complete in new[]{false,true}){EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+Name+".unity");Camera.main.transform.LookAt(new Vector3(0,2.5f,0));EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());}
        Verify();
    }
}
