using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.UIElements;
using UnityEngine;
using UnityEngine.UIElements;

public sealed class ProceduralMapWindow : EditorWindow
{
    public const string Folder="Assets/LessonSamples/ProceduralMaps/";
    ObjectField target;IntegerField seed,blocks;FloatField road,height,relief;Label feedback;
    static readonly string[] Colors={"#246C96","#E6DBF5","#C67B00","#F4E8A1","#9D4C7A","#73AFB5","#BCD8EA","#E3A98A","#90A4D9"};
    [MenuItem("教材/市街マップ生成")]
    public static void Open(){var w=GetWindow<ProceduralMapWindow>("市街マップ生成",true,typeof(SceneView));w.titleContent=new GUIContent("市街マップ生成");w.minSize=new Vector2(400,390);w.Show();}
    public void CreateGUI()
    {
        var root=rootVisualElement;root.style.unityFontDefinition=FontDefinition.FromSDFFont(AssetDatabase.LoadAssetAtPath<UnityEngine.TextCore.Text.FontAsset>("Assets/Fonts/NotoSansJP-UIToolkit.asset"));root.style.paddingLeft=14;root.style.paddingRight=14;root.style.paddingTop=14;
        var title=new Label("市街マップと地形 / U35");title.style.fontSize=21;root.Add(title);
        var note=new Label("入力を確認してから生成します。生成対象の出力だけを置き換え、元に戻す操作で直前のマップを復元できます。");note.style.whiteSpace=WhiteSpace.Normal;root.Add(note);
        target=new ObjectField("生成設定"){objectType=typeof(ProceduralMapRecipe),allowSceneObjects=true};root.Add(target);
        seed=new IntegerField("乱数シード");blocks=new IntegerField("一辺の区画数（2〜3）");road=new FloatField("道幅（m）");height=new FloatField("建物の最高高さ（m）");relief=new FloatField("地形の起伏（m）");
        foreach(var field in new VisualElement[]{seed,blocks,road,height,relief}){field.style.marginTop=8;root.Add(field);}
        target.RegisterValueChangedCallback(_=>Read());
        var preview=new Button(()=>Execute(false)){text="入力を確認"};preview.style.marginTop=14;root.Add(preview);
        var generate=new Button(()=>Execute(true)){text="市街マップと地形を生成"};generate.style.marginTop=6;root.Add(generate);
        var frame=new Button(()=>{var r=target.value as ProceduralMapRecipe;if(r&&r.generatedRoot){Selection.activeGameObject=r.generatedRoot.gameObject;SceneView.lastActiveSceneView?.FrameSelected();}}){text="生成結果に視点を合わせる"};root.Add(frame);
        feedback=new Label("現在のシーンにある生成設定を選択してください。");feedback.style.whiteSpace=WhiteSpace.Normal;feedback.style.marginTop=12;root.Add(feedback);
        target.value=FindFirstObjectByType<ProceduralMapRecipe>();Read();
    }
    void Read(){if(!(target.value is ProceduralMapRecipe r))return;seed.value=r.seed;blocks.value=r.blocks;road.value=r.roadWidth;height.value=r.buildingHeight;relief.value=r.relief;}
    void Execute(bool generate)
    {
        if(!(target.value is ProceduralMapRecipe r)){feedback.text="先に生成設定を選択してください。";return;}
        // Validate a detached input copy before touching the scene or its asset.
        var temp=new GameObject("Validation inputs"){hideFlags=HideFlags.HideAndDontSave};
        try{var inputs=temp.AddComponent<ProceduralMapRecipe>();inputs.seed=seed.value;inputs.blocks=blocks.value;inputs.roadWidth=road.value;inputs.buildingHeight=height.value;inputs.relief=relief.value;
            var reason=inputs.ValidateInputs();if(reason!=null)throw new InvalidOperationException(reason);
            CheckTarget(r);if(!generate){feedback.text=$"確認済み：建物{inputs.blocks*inputs.blocks}個・道路{(inputs.blocks-1)*2}本・高さマップ65×65。まだ生成していません。";return;}
            Generate(r,inputs);feedback.text=$"生成済み：シード{r.seed} ／ {r.layoutHash}。Ctrl+Zで前の出力へ戻せます。";
        }catch(Exception e){feedback.text="停止："+CourseJapanese.Text(e.Message);Debug.LogWarning("Procedural Map: "+e.Message);}
        finally{DestroyImmediate(temp);}
    }
    public static void CheckTarget(ProceduralMapRecipe r)
    {
        if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("生成前に再生を停止してください。");
        if(!r||!r.gameObject.scene.IsValid()||r.gameObject.scene!=EditorSceneManager.GetActiveScene()||string.IsNullOrEmpty(r.gameObject.scene.path))throw new InvalidOperationException("保存済みの現在のシーンにある生成設定を選んでください。");
        if(r.transform.position!=Vector3.zero||r.transform.rotation!=Quaternion.identity||r.transform.lossyScale!=Vector3.one)throw new InvalidOperationException("生成設定は原点・回転なし・拡大率1にしてください。");
        if(!r.terrainData||r.terrainData.heightmapResolution!=65)throw new InvalidOperationException("専用の65×65のTerrainDataを指定してください。");
        string path=AssetDatabase.GetAssetPath(r.terrainData);
        if(!path.StartsWith(Folder,StringComparison.Ordinal))throw new InvalidOperationException("TerrainDataは次のフォルダーの専用アセットにしてください："+Folder);
        foreach(string assetPath in AssetDatabase.GetAllAssetPaths().Where(p=>p.StartsWith("Assets/",StringComparison.Ordinal)&&p!=path&&p!=r.gameObject.scene.path&&!AssetDatabase.IsValidFolder(p))){
            if(AssetDatabase.GetDependencies(assetPath,false).Contains(path))throw new InvalidOperationException("TerrainDataが他のシーンやアセットと共有されています。複製してから割り当ててください。");
        }
        if(FindObjectsByType<ProceduralMapPart>(FindObjectsInactive.Include,FindObjectsSortMode.None).Any(p=>p.owner==r&&(!r.generatedRoot||(p.transform!=r.generatedRoot&&!p.transform.IsChildOf(r.generatedRoot)))))throw new InvalidOperationException("生成物がGeneratedMapの外に移動・複製されています。階層を戻してから再生成してください。");
        if(r.generatedRoot){
            if(r.generatedRoot.parent!=r.transform||r.generatedRoot.GetComponent<ProceduralMapPart>()?.owner!=r)throw new InvalidOperationException("生成物の所有者がこの生成設定と一致しません。");
            foreach(var child in r.generatedRoot.GetComponentsInChildren<Transform>(true))if(child.GetComponent<ProceduralMapPart>()?.owner!=r)throw new InvalidOperationException("生成対象に所有外の物体があります："+child.name+"。手作業の物体をGeneratedMapの外へ移動してください。");
        }
        if(FindObjectsByType<Terrain>(FindObjectsInactive.Include,FindObjectsSortMode.None).Any(t=>t.terrainData==r.terrainData&&(!r.generatedRoot||!t.transform.IsChildOf(r.generatedRoot))))throw new InvalidOperationException("TerrainDataが生成対象の外でも使われています。");
        if(FindObjectsByType<TerrainCollider>(FindObjectsInactive.Include,FindObjectsSortMode.None).Any(t=>t.terrainData==r.terrainData&&(!r.generatedRoot||!t.transform.IsChildOf(r.generatedRoot))))throw new InvalidOperationException("TerrainDataの衝突判定が生成対象の外でも使われています。");
        if(FindObjectsByType<ProceduralMapRecipe>(FindObjectsInactive.Include,FindObjectsSortMode.None).Any(other=>other!=r&&other.terrainData==r.terrainData))throw new InvalidOperationException("TerrainDataが別の生成設定にも割り当てられています。");
    }
    public static void Generate(ProceduralMapRecipe r,ProceduralMapRecipe inputs)
    {
        string reason=inputs.ValidateInputs();if(reason!=null)throw new InvalidOperationException(reason);CheckTarget(r);
        // Compute everything before creating an Undo group or modifying saved objects.
        var plan=inputs.Plan();var heights=inputs.Heights();
        // Interactive generation must never create or overwrite project assets.
        foreach(string name in Enumerable.Range(1,9).Select(i=>"B"+i).Concat(Enumerable.Range(1,4).Select(i=>"R"+i)).Concat(new[]{"Terrain"}))
            if(!AssetDatabase.LoadAssetAtPath<Material>(Folder+name+".mat"))throw new InvalidOperationException("教材の材質がありません："+name+"。配布されたアセットを復元してください。");
        Undo.IncrementCurrentGroup();int group=Undo.GetCurrentGroup();Undo.SetCurrentGroupName("市街マップと地形の生成");
        try{
            Undo.RegisterCompleteObjectUndo(r.terrainData,"Terrain heights");Undo.RegisterCompleteObjectUndo(r,"Recipe settings and output");
            if(r.generatedRoot)Undo.DestroyObjectImmediate(r.generatedRoot.gameObject);
            r.seed=inputs.seed;r.blocks=inputs.blocks;r.roadWidth=inputs.roadWidth;r.buildingHeight=inputs.buildingHeight;r.relief=inputs.relief;
            var output=new GameObject("GeneratedMap");output.transform.SetParent(r.transform,false);Mark(output,r);r.generatedRoot=output.transform;
            r.terrainData.size=new Vector3(ProceduralMapRecipe.Size,ProceduralMapRecipe.Height,ProceduralMapRecipe.Size);r.terrainData.SetHeights(0,0,heights);
            var terrain=Terrain.CreateTerrainGameObject(r.terrainData);terrain.name="Terrain";terrain.transform.SetParent(output.transform,false);terrain.transform.localPosition=new Vector3(-24,0,-24);Mark(terrain,r);Identity(terrain,"T","#B8C99A");terrain.GetComponent<Terrain>().materialTemplate=AssetDatabase.LoadAssetAtPath<Material>(Folder+"Terrain.mat");terrain.GetComponent<Terrain>().drawInstanced=false;
            int roadIndex=0;for(int i=0;i<r.blocks-1;i++){
                float coordinate=(i-(r.blocks-2)*.5f)*ProceduralMapRecipe.Spacing;
                Shape(r,"RoadX"+(i+1),"R"+(++roadIndex),new[]{"#71879F","#BCC6D2","#8795AB","#D4DCE6"}[roadIndex-1],new Vector3(coordinate,ProceduralMapRecipe.Ground+.04f,0),new Vector3(r.roadWidth,.08f,r.blocks*8));
                Shape(r,"RoadZ"+(i+1),"R"+(++roadIndex),new[]{"#71879F","#BCC6D2","#8795AB","#D4DCE6"}[roadIndex-1],new Vector3(0,ProceduralMapRecipe.Ground+.05f,coordinate),new Vector3(r.blocks*8,.08f,r.roadWidth));
            }
            for(int i=0;i<plan.Length;i++)Shape(r,"Building"+(i+1),"B"+(i+1),Colors[i],plan[i].position,plan[i].scale);
            r.layoutHash=r.ActualHash();Undo.RegisterCreatedObjectUndo(output,"Generated map objects");Undo.FlushUndoRecordObjects();Undo.CollapseUndoOperations(group);
            EditorUtility.SetDirty(r.terrainData);EditorUtility.SetDirty(r);EditorSceneManager.MarkSceneDirty(r.gameObject.scene);
        }catch{Undo.RevertAllDownToGroup(group);throw;}
    }
    static void Mark(GameObject go,ProceduralMapRecipe r){go.AddComponent<ProceduralMapPart>().owner=r;}
    static void Identity(GameObject go,string id,string hex){var tag=go.AddComponent<CourseObjectIdentity>();tag.identifier=id;tag.colorHex=hex;tag.colorName=id;}
    static void Shape(ProceduralMapRecipe r,string name,string id,string hex,Vector3 p,Vector3 scale){var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name=name;go.transform.SetParent(r.generatedRoot,false);go.transform.localPosition=p;go.transform.localScale=scale;go.GetComponent<Renderer>().sharedMaterial=AssetDatabase.LoadAssetAtPath<Material>(Folder+id+".mat");Mark(go,r);Identity(go,id,hex);}
    public static void EnsureMaterials()
    {
        if(!Application.isBatchMode)throw new InvalidOperationException("Course asset setup is CLI-only; interactive generation uses existing assets.");
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
        foreach(string name in Enumerable.Range(1,9).Select(i=>"B"+i).Concat(Enumerable.Range(1,4).Select(i=>"R"+i)).Concat(new[]{"Terrain"}))
            if(File.Exists(Folder+name+".mat")&&!AssetDatabase.LoadAssetAtPath<Material>(Folder+name+".mat"))throw new InvalidOperationException("Existing asset preserved: "+name);
        if(File.Exists(Folder+"GroundColor.asset")&&!AssetDatabase.LoadAssetAtPath<Texture2D>(Folder+"GroundColor.asset"))throw new InvalidOperationException("Existing GroundColor asset preserved.");
        if(File.Exists(Folder+"Ground.terrainlayer")&&!AssetDatabase.LoadAssetAtPath<TerrainLayer>(Folder+"Ground.terrainlayer"))throw new InvalidOperationException("Existing Ground layer preserved.");
        var ids=Enumerable.Range(1,9).Select(i=>(id:"B"+i,hex:Colors[i-1])).Concat(new[]{("R1","#71879F"),("R2","#BCC6D2"),("R3","#8795AB"),("R4","#D4DCE6")});
        foreach(var pair in ids)if(!AssetDatabase.LoadAssetAtPath<Material>(Folder+pair.Item1+".mat")){var m=new Material(Shader.Find("Universal Render Pipeline/Lit"));m.color=CourseObjectPalette.Parse(pair.Item2);AssetDatabase.CreateAsset(m,Folder+pair.Item1+".mat");}
        if(!AssetDatabase.LoadAssetAtPath<TerrainLayer>(Folder+"Ground.terrainlayer")){
            var tex=AssetDatabase.LoadAssetAtPath<Texture2D>(Folder+"GroundColor.asset");if(!tex){tex=new Texture2D(2,2);tex.SetPixels(Enumerable.Repeat(CourseObjectPalette.Parse("#B8C99A"),4).ToArray());tex.Apply();AssetDatabase.CreateAsset(tex,Folder+"GroundColor.asset");}
            var layer=new TerrainLayer{diffuseTexture=tex,tileSize=new Vector2(48,48)};AssetDatabase.CreateAsset(layer,Folder+"Ground.terrainlayer");
        }
        if(!AssetDatabase.LoadAssetAtPath<Material>(Folder+"Terrain.mat")){var mat=new Material(Shader.Find("Universal Render Pipeline/Terrain/Lit"));AssetDatabase.CreateAsset(mat,Folder+"Terrain.mat");}
    }
}
