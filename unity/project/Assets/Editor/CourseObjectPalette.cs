using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class CourseObjectPalette
{
    const string Folder="Assets/Art/Palette/";
    public static Color Parse(string hex) {ColorUtility.TryParseHtmlString(hex,out var color);return color;}
    static Material Mat(string name,string hex)
    {
        string path=Folder+name+".mat";
        var mat=AssetDatabase.LoadAssetAtPath<Material>(path);
        if(!mat){mat=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(mat,path);}
        mat.color=Parse(hex);mat.SetFloat("_Metallic",0);mat.SetFloat("_Smoothness",.12f);EditorUtility.SetDirty(mat);return mat;
    }
    [MenuItem("教材/識別用の配色を適用")]
    public static void ApplyAll()
    {
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
        var floor=Mat("F-Floor","#080C11");var exhibit=Mat("A-Exhibit","#246C96");
        var sphere=Mat("B-Sphere","#C67B00");var capsule=Mat("C-Capsule","#F4E8A1");var right=Mat("D-ExhibitRight","#E6DBF5");
        var original=AssetDatabase.LoadAssetAtPath<Material>("Assets/Art/Exhibit.mat");original.color=exhibit.color;EditorUtility.SetDirty(original);
        var student=AssetDatabase.LoadAssetAtPath<Material>("Assets/LessonSamples/StudentExhibit.mat");student.color=sphere.color;EditorUtility.SetDirty(student);
        // Preserve the Sprite GUID and shape, removing the old orange texture tint.
        var texture=new Texture2D(64,64);texture.SetPixels(Enumerable.Repeat(Color.white,4096).ToArray());texture.Apply();
        File.WriteAllBytes("Assets/Art/Marker.png",texture.EncodeToPNG());UnityEngine.Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset("Assets/Art/Marker.png",ImportAssetOptions.ForceUpdate);
        foreach(string path in new[]{"Assets/Art/Exhibit.vfx","Assets/LessonSamples/ExhibitHalfRate.vfx"})
        {
            var text=File.ReadAllText(path);
            // VFX gradients serialize linear RGB; retain alpha keys and timing.
            var cyan=Parse("#81D8D0").linear;
            string color=FormattableString.Invariant($"\"color\":{{\"r\":{cyan.r},\"g\":{cyan.g},\"b\":{cyan.b},\"a\":1.0}}");
            text=Regex.Replace(text,"\"color\":\\{[^}]+\\}",_=>color);
            File.WriteAllText(path,text);AssetDatabase.ImportAsset(path);
        }
        foreach(string path in Directory.GetFiles("Assets/Scenes","*.unity",SearchOption.AllDirectories))
        {
            EditorSceneManager.OpenScene(path);
            foreach(var renderer in UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None))
            {
                string id,hex,colorName;Material material;
                switch(renderer.name)
                {
                    case "DisplayFloor":id="F";hex="#080C11";colorName="黒に近い紺";material=floor;break;
                    case "Sphere":id="B";hex="#C67B00";colorName="橙";material=sphere;break;
                    case "Capsule":id="C";hex="#F4E8A1";colorName="淡い黄";material=capsule;break;
                    case "ExhibitRight":id="D";hex="#E6DBF5";colorName="淡い紫";material=right;break;
                    case "Marker":id="M";hex="#9D4C7A";colorName="赤紫";material=null;break;
                    case "Exhibit":case "WelcomeExhibit":
                        id="A";bool graphLesson=path.Contains("23-ShaderGraph");
                        bool changed=path.Replace('\\','/').Contains("Completed/10-") || (graphLesson && path.Replace('\\','/').Contains("Completed/"));
                        hex=changed?"#C67B00":"#246C96";colorName=changed?"橙（材質変更の完成例）":"青";
                        material=graphLesson?AssetDatabase.LoadAssetAtPath<Material>("Assets/LessonSamples/ShaderGraph/Exhibit"+(changed?"Complete":"Start")+".mat"):changed?student:exhibit;break;
                    default:continue;
                }
                if(renderer is SpriteRenderer sprite)sprite.color=Parse(hex);else renderer.sharedMaterial=material;
                var tag=renderer.GetComponent<CourseObjectIdentity>()??renderer.gameObject.AddComponent<CourseObjectIdentity>();
                tag.identifier=id;tag.colorHex=hex;tag.colorName=colorName;
            }
            var overlay=GameObject.Find("ObjectIdentifiers")??new GameObject("ObjectIdentifiers");
            var particles=GameObject.Find("WelcomeParticles");
            if(particles){var tag=particles.GetComponent<CourseObjectIdentity>()??particles.AddComponent<CourseObjectIdentity>();tag.identifier="V";tag.colorHex="#81D8D0";tag.colorName="明るい青緑";}
            var doc=overlay.GetComponent<UIDocument>()??overlay.AddComponent<UIDocument>();
            doc.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");doc.sortingOrder=100;
            if(!overlay.GetComponent<CourseIdentityOverlay>())overlay.AddComponent<CourseIdentityOverlay>();
            if(Camera.main)Camera.main.backgroundColor=Parse("#D9E0E5");
            var button=UnityEngine.Object.FindFirstObjectByType<UnityEngine.UI.Button>();
            if(button){button.GetComponent<UnityEngine.UI.Image>().color=Parse("#F4E8A1");var text=button.GetComponentInChildren<TMPro.TMP_Text>();text.color=Parse("#101820");text.fontStyle=TMPro.FontStyles.Bold;}
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        }
        var prefab=PrefabUtility.LoadPrefabContents("Assets/Prefabs/Exhibit.prefab");prefab.GetComponent<Renderer>().sharedMaterial=exhibit;
        PrefabUtility.SaveAsPrefabAsset(prefab,"Assets/Prefabs/Exhibit.prefab");PrefabUtility.UnloadPrefabContents(prefab);
        AssetDatabase.SaveAssets();Verify();
    }
    [MenuItem("教材/識別用の配色を検査")]
    public static void Verify()
    {
        int scenes=0,objects=0;
        foreach(string name in LessonSamples.Names)foreach(string prefix in new[]{"","Completed/"})
        {
            EditorSceneManager.OpenScene("Assets/Scenes/"+prefix+name+".unity");scenes++;
            var tags=UnityEngine.Object.FindObjectsByType<CourseObjectIdentity>(FindObjectsSortMode.None);
            var floor=tags.Single(t=>t.identifier=="F");
            foreach(var tag in tags)
            {
                objects++;
                if(tag.identifier!="F" && Contrast(Parse(tag.colorHex),Parse(floor.colorHex))<3)throw new Exception("Insufficient material contrast: "+name+" "+tag.name);
                if(tag.identifier=="V")continue;
                var renderer=tag.GetComponent<Renderer>();var terrain=tag.GetComponent<Terrain>();var color=terrain?terrain.terrainData.terrainLayers[0].diffuseTexture.GetPixel(0,0):renderer is SpriteRenderer sprite?sprite.color:renderer.sharedMaterial.color;
                if(Vector4.Distance(color,Parse(tag.colorHex))>.01f)throw new Exception("Incorrect object material: "+name+" "+tag.name);
            }
            foreach(var renderer in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
                if(!renderer.GetComponent<CourseObjectIdentity>())throw new Exception("Unidentified visible object: "+renderer.name);
            if(tags.GroupBy(t=>t.colorHex).Any(g=>g.Count()>1))throw new Exception("Duplicate object color: "+name);
        }
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/object-palette.json",$"{{\"status\":\"PASS\",\"scenes\":{scenes},\"objects\":{objects},\"materialVsFloorMinimum\":3,\"note\":\"Material sRGB values; rendered lighting is checked separately.\"}}");
        Debug.Log("OBJECT PALETTE: PASS");
    }
    static float Lum(Color c){Func<float,float> f=x=>x<=.04045f?x/12.92f:Mathf.Pow((x+.055f)/1.055f,2.4f);return .2126f*f(c.r)+.7152f*f(c.g)+.0722f*f(c.b);}
    static float Contrast(Color a,Color b){float x=Lum(a),y=Lum(b);return (Mathf.Max(x,y)+.05f)/(Mathf.Min(x,y)+.05f);}
}
