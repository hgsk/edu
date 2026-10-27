using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class ProceduralMapSamples
{
    public const string Name="35-ProceduralMap";
    static TerrainData NewData(string path){if(File.Exists(path))throw new InvalidOperationException("Existing asset preserved: "+path);var data=new TerrainData{heightmapResolution=65,size=new Vector3(48,8,48),terrainLayers=new[]{AssetDatabase.LoadAssetAtPath<TerrainLayer>(ProceduralMapWindow.Folder+"Ground.terrainlayer")}};AssetDatabase.CreateAsset(data,path);return data;}
    public static void CreateMissing()
    {
        if(!Application.isBatchMode)throw new InvalidOperationException("Sample setup is CLI-only to preserve the interactive Editor's scenes and Undo history.");
        ProceduralMapWindow.EnsureMaterials();
        foreach(bool complete in new[]{false,true}){
            string path="Assets/Scenes/"+(complete?"Completed/":"")+Name+".unity";if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));
            var floor=GameObject.Find("DisplayFloor");floor.transform.position=new Vector3(0,-.2f,0);floor.transform.localScale=new Vector3(52,.2f,52);
            var go=new GameObject("Exhibit");var r=go.AddComponent<ProceduralMapRecipe>();r.seed=complete?73:35;r.blocks=complete?3:2;r.roadWidth=complete?3:2;r.buildingHeight=complete?8:3;r.relief=complete?4:0;
            r.terrainData=NewData(ProceduralMapWindow.Folder+(complete?"CompleteTerrain":"StartTerrain")+".asset");
            var ui=new GameObject("ExhibitUI");var doc=ui.AddComponent<UIDocument>();doc.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");doc.sortingOrder=10;var lesson=ui.AddComponent<ProceduralMapLesson>();lesson.recipe=r;lesson.identityLegend=GameObject.Find("ObjectIdentifiers");
            Camera.main.orthographic=true;Camera.main.orthographicSize=30;Camera.main.transform.position=new Vector3(30,38,-43);Camera.main.transform.LookAt(Vector3.zero);
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);ProceduralMapWindow.Generate(r,r);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        }
        AssetDatabase.SaveAssets();Tests();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();DependencyLesson.ValidateCompleted();
    }
    public static void Verify()
    {
        foreach(bool complete in new[]{false,true}){
            EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+Name+".unity");var r=UnityEngine.Object.FindFirstObjectByType<ProceduralMapRecipe>();
            if(!r||r.ValidateInputs()!=null||!r.generatedRoot||r.layoutHash!=r.ActualHash())throw new Exception("Saved procedural geometry does not match its signature");
            ProceduralMapWindow.CheckTarget(r);var tags=r.generatedRoot.GetComponentsInChildren<CourseObjectIdentity>();
            if(tags.Count(t=>t.identifier.StartsWith("B"))!=r.blocks*r.blocks||tags.Count(t=>t.identifier.StartsWith("R"))!=(r.blocks-1)*2)throw new Exception("Procedural counts differ");
            var plan=r.Plan();for(int i=0;i<plan.Length;i++){var building=r.generatedRoot.Find("Building"+(i+1));if(!building||Vector3.Distance(building.localPosition,plan[i].position)>.001f||Vector3.Distance(building.localScale,plan[i].scale)>.001f)throw new Exception("Saved buildings differ from Recipe inputs");}
            var expected=r.Heights();var actual=r.terrainData.GetHeights(0,0,65,65);for(int z=0;z<65;z++)for(int x=0;x<65;x++)if(Mathf.Abs(actual[z,x]-expected[z,x])>.00002f)throw new Exception("Saved terrain differs from Recipe inputs");
            var terrain=r.generatedRoot.GetComponentInChildren<Terrain>();if(!terrain||terrain.terrainData!=r.terrainData||terrain.GetComponent<TerrainCollider>().terrainData!=r.terrainData)throw new Exception("Terrain rendering/collision data mismatch");
            if(r.generatedRoot.GetComponentsInChildren<Renderer>().Any(v=>!v.GetComponent<Collider>()))throw new Exception("Generated collision missing");
            var lesson=UnityEngine.Object.FindFirstObjectByType<ProceduralMapLesson>();if(!lesson||lesson.recipe!=r||!lesson.identityLegend)throw new Exception("Procedural runtime reference missing");
        }
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/35-procedural-map.json","{\"status\":\"PASS\",\"scenes\":2,\"terrainResolution\":65,\"startBuildings\":4,\"completeBuildings\":9,\"startRoads\":2,\"completeRoads\":4}");Debug.Log("PROCEDURAL MAP SAMPLES: PASS");
    }
    public static void Tests()
    {
        if(!Application.isBatchMode)throw new InvalidOperationException("Run procedural tests through the CLI to preserve the interactive Editor's Undo history.");
        string stem=ProceduralMapWindow.Folder+"__test_"+Guid.NewGuid().ToString("N"),scenePath=stem+".unity",dataPath=stem+".asset",shared=stem+"_shared.unity";int count=0;
        void Check(bool value,string label){if(!value)throw new Exception("Procedural test: "+label);count++;}
        void Reject(Action action,string label){try{action();}catch(InvalidOperationException){count++;return;}throw new Exception("Expected rejection: "+label);}
        try{
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);var go=new GameObject("Recipe");var r=go.AddComponent<ProceduralMapRecipe>();r.terrainData=NewData(dataPath);EditorSceneManager.SaveScene(go.scene,scenePath);
            var outside=new GameObject("Keep user object");outside.transform.position=new Vector3(1,2,3);
            ProceduralMapWindow.Generate(r,r);string first=r.ActualHash();Check(first==r.layoutHash,"recorded actual geometry");
            Check(r.Plan().Length==4,"building plan count");Check(r.Heights()[32,32]==ProceduralMapRecipe.Ground/ProceduralMapRecipe.Height,"road platform flat");
            Undo.ClearAll();ProceduralMapWindow.Generate(r,r);Check(first==r.ActualHash(),"same seed reproducible");Check(r.generatedRoot.GetComponentsInChildren<Terrain>().Length==1,"regeneration does not accumulate outputs");
            var input=new GameObject("Inputs").AddComponent<ProceduralMapRecipe>();input.blocks=0;var previous=r.generatedRoot;Reject(()=>ProceduralMapWindow.Generate(r,input),"invalid blocks");Check(previous==r.generatedRoot&&r.ActualHash()==first,"invalid input leaves output untouched");
            input.blocks=2;input.roadWidth=float.NaN;Reject(()=>ProceduralMapWindow.Generate(r,input),"nonfinite input");input.roadWidth=2;
            var personal=new GameObject("Personal object");personal.transform.SetParent(r.generatedRoot);Reject(()=>ProceduralMapWindow.Generate(r,input),"unowned child");personal.transform.SetParent(null);
            var moved=r.generatedRoot.GetComponentsInChildren<ProceduralMapPart>().First(p=>p.transform!=r.generatedRoot&&p.GetComponent<Renderer>());moved.transform.SetParent(null);Reject(()=>ProceduralMapWindow.Generate(r,input),"owned object outside output");moved.transform.SetParent(r.generatedRoot);
            var extraCollider=new GameObject("External collider");extraCollider.AddComponent<TerrainCollider>().terrainData=r.terrainData;Reject(()=>ProceduralMapWindow.Generate(r,input),"external TerrainCollider");UnityEngine.Object.DestroyImmediate(extraCollider);
            EditorSceneManager.SaveScene(go.scene);AssetDatabase.SaveAssets();AssetDatabase.CopyAsset(scenePath,shared);Reject(()=>ProceduralMapWindow.Generate(r,input),"shared TerrainData");AssetDatabase.DeleteAsset(shared);
            input.seed=73;input.blocks=3;input.roadWidth=3;input.buildingHeight=8;input.relief=4;
            Undo.ClearAll();ProceduralMapWindow.Generate(r,input);string changed=r.ActualHash();Check(changed!=first,"changed seed/parameters change geometry");Check(r.Plan().Length==9,"changed density");
            Undo.PerformUndo();Check(r&&r.generatedRoot&&r.seed==35&&r.ActualHash()==first&&r.layoutHash==first,"Undo restores settings, objects and terrain heights: seed="+r.seed+" root="+r.generatedRoot+" actual="+r.ActualHash()+" expected="+first+" terrains="+r.GetComponentsInChildren<Terrain>().Length);
            Undo.PerformRedo();Check(r&&r.generatedRoot&&r.seed==73&&r.ActualHash()==changed&&r.layoutHash==changed,"Redo restores generated map");Check(outside&&outside.transform.position==new Vector3(1,2,3)&&personal,"personal objects preserved");
            UnityEngine.Object.DestroyImmediate(input.gameObject);EditorSceneManager.SaveScene(go.scene);AssetDatabase.SaveAssets();EditorSceneManager.OpenScene(scenePath);r=UnityEngine.Object.FindFirstObjectByType<ProceduralMapRecipe>();Check(r.ActualHash()==changed,"save and reopen keeps output");
        }finally{
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);foreach(string path in new[]{shared,scenePath,dataPath})if(File.Exists(path))AssetDatabase.DeleteAsset(path);Undo.ClearAll();AssetDatabase.Refresh();
        }
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/35-procedural-tests.json",$"{{\"status\":\"PASS\",\"checks\":{count},\"sameSeed\":true,\"undoRedo\":true,\"sharedDataRejected\":true,\"unownedChildrenPreserved\":true}}");Debug.Log("PROCEDURAL MAP TESTS: PASS ("+count+")");
    }
}
