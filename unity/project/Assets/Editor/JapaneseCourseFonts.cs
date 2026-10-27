using System;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;
using UnityEngine.UIElements;

public static class JapaneseCourseFonts
{
    const string Folder="Assets/Fonts/";
    public static TMP_FontAsset Tmp=>AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(Folder+"NotoSansJP-TMP.asset");
    public static void VerifyScene(UnityEngine.SceneManagement.Scene scene)
    {
        var settings=AssetDatabase.LoadAssetAtPath<PanelTextSettings>(Folder+"JapanesePanelTextSettings.asset");
        if(!Tmp||!settings||!settings.defaultFontAsset)throw new Exception("日本語フォントが未設定です");
        foreach(var root in scene.GetRootGameObjects()){
            if(root.GetComponentsInChildren<UnityEngine.UI.Text>(true).Length>0)throw new Exception("旧Textが残っています："+scene.path);
            foreach(var text in root.GetComponentsInChildren<TMP_Text>(true))if(text.font!=Tmp)throw new Exception("TMP日本語フォントの割当漏れ："+text.name);
            foreach(var doc in root.GetComponentsInChildren<UIDocument>(true))if(!doc.panelSettings||doc.panelSettings.textSettings!=settings)throw new Exception("UI Toolkit日本語設定の割当漏れ："+doc.name);
        }
    }
    public static void Install()
    {
        if(EditorApplication.isPlaying)throw new InvalidOperationException("再生を停止してください");
        var essential=Directory.GetFiles("Library/PackageCache","TMP Essential Resources.unitypackage",SearchOption.AllDirectories).Single();
        if(!AssetDatabase.LoadAssetAtPath<TMP_Settings>("Assets/TextMesh Pro/Resources/TMP Settings.asset"))AssetDatabase.ImportPackage(essential,false);
        AssetDatabase.Refresh();
        var font=AssetDatabase.LoadAssetAtPath<Font>(Folder+"NotoSansJP-Regular.otf");
        if(!font)throw new Exception("日本語フォントがありません");
        string characters=string.Concat(Directory.GetFiles("Assets/Scripts","*.cs").Concat(Directory.GetFiles("Assets/Editor","*.cs")).Concat(Directory.GetFiles("Assets","*.uxml",SearchOption.AllDirectories)).Select(File.ReadAllText));
        string required=characters;
        characters+=new string(Enumerable.Range(32,95).Concat(Enumerable.Range(0x3000,0x100)).Concat(Enumerable.Range(0xff01,0x60)).Select(x=>(char)x).ToArray());
        FontEngine.LoadFontFace(font,48);
        string unsupported=new string(required.Where(c=>c>0x3000&&!char.IsControl(c)&&!FontEngine.TryGetGlyphIndex(c,out _)).Distinct().ToArray());
        if(unsupported.Length>0)throw new Exception("日本語の原稿に未収録文字があります："+unsupported);
        characters=new string(characters.Where(c=>!char.IsControl(c)&&FontEngine.TryGetGlyphIndex(c,out _)).Distinct().OrderBy(c=>c).ToArray());
        // Dynamic source fallback supports learner-entered Japanese beyond this prewarmed corpus.
        var tmp=Tmp;
        if(!tmp){tmp=TMP_FontAsset.CreateFontAsset(font,48,6,GlyphRenderMode.SDFAA,2048,2048,TMPro.AtlasPopulationMode.Dynamic,true);tmp.name="NotoSansJP-TMP";AssetDatabase.CreateAsset(tmp,Folder+"NotoSansJP-TMP.asset");}
        if(!tmp.TryAddCharacters(characters,out string missing))throw new Exception("TMP missing glyphs: "+missing);
        SaveSubassets(tmp,tmp.material,tmp.atlasTextures);
        SetClearOnBuild(tmp,false);
        var text=AssetDatabase.LoadAssetAtPath<UnityEngine.TextCore.Text.FontAsset>(Folder+"NotoSansJP-UIToolkit.asset");
        if(!text){text=UnityEngine.TextCore.Text.FontAsset.CreateFontAsset(font,48,6,GlyphRenderMode.SDFAA,2048,2048,UnityEngine.TextCore.Text.AtlasPopulationMode.Dynamic,true);text.name="NotoSansJP-UIToolkit";AssetDatabase.CreateAsset(text,Folder+"NotoSansJP-UIToolkit.asset");}
        if(!text.TryAddCharacters(characters,out missing))throw new Exception("UI Toolkit missing glyphs: "+missing);
        SaveSubassets(text,text.material,text.atlasTextures);
        SetClearOnBuild(text,false);
        var settings=AssetDatabase.LoadAssetAtPath<PanelTextSettings>(Folder+"JapanesePanelTextSettings.asset");
        if(!settings){settings=ScriptableObject.CreateInstance<PanelTextSettings>();AssetDatabase.CreateAsset(settings,Folder+"JapanesePanelTextSettings.asset");}
        settings.defaultFontAsset=text;EditorUtility.SetDirty(settings);
        SetClearOnBuild(settings,false);
        foreach(string guid in AssetDatabase.FindAssets("t:PanelSettings",new[]{"Assets"})){var panel=AssetDatabase.LoadAssetAtPath<PanelSettings>(AssetDatabase.GUIDToAssetPath(guid));panel.textSettings=settings;EditorUtility.SetDirty(panel);}
        var tmpSettings=new SerializedObject(TMP_Settings.instance);tmpSettings.FindProperty("m_defaultFontAsset").objectReferenceValue=tmp;tmpSettings.ApplyModifiedPropertiesWithoutUndo();
        SetClearOnBuild(TMP_Settings.instance,false);
        foreach(string guid in AssetDatabase.FindAssets("t:Scene",new[]{"Assets/Scenes"})){
            var scene=EditorSceneManager.OpenScene(AssetDatabase.GUIDToAssetPath(guid));
            foreach(var old in UnityEngine.Object.FindObjectsByType<UnityEngine.UI.Text>(FindObjectsInactive.Include,FindObjectsSortMode.None)){
                var go=old.gameObject;string content=old.text;float size=old.fontSize;Color color=old.color;bool raycast=old.raycastTarget;
                var greeting=UnityEngine.Object.FindFirstObjectByType<ExhibitButton>();
                UnityEngine.Object.DestroyImmediate(old);var label=go.AddComponent<TextMeshProUGUI>();label.font=tmp;label.text=content=="Start"?"開始":content=="Welcome!"?"ようこそ！":content;label.fontSize=size;label.color=color;label.raycastTarget=raycast;label.alignment=TextAlignmentOptions.Center;
                if(greeting)greeting.status=label;
            }
            foreach(var label in UnityEngine.Object.FindObjectsByType<TMP_Text>(FindObjectsInactive.Include,FindObjectsSortMode.None)){label.font=tmp;EditorUtility.SetDirty(label);}
            EditorSceneManager.SaveScene(scene);
        }
        AssetDatabase.SaveAssets();
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/japanese-fonts.json",JsonUtility.ToJson(new Report{status="PASS",characters=characters.Length,tmpAtlases=tmp.atlasTextures.Length,toolkitAtlases=text.atlasTextures.Length,scenes=LessonSamples.Names.Length*2},true));
        Debug.Log("JAPANESE FONTS: PASS ("+characters.Length+" characters)");
    }
    static void SaveSubassets(UnityEngine.Object asset,Material material,Texture2D[] textures){foreach(var item in new UnityEngine.Object[]{material}.Concat(textures))if(item&&!AssetDatabase.Contains(item))AssetDatabase.AddObjectToAsset(item,asset);EditorUtility.SetDirty(asset);foreach(var item in textures)EditorUtility.SetDirty(item);}
    static void SetClearOnBuild(UnityEngine.Object asset,bool value){var data=new SerializedObject(asset);var property=data.FindProperty("m_ClearDynamicDataOnBuild");if(property!=null){property.boolValue=value;data.ApplyModifiedPropertiesWithoutUndo();}}
    [Serializable] class Report {public string status;public int characters,tmpAtlases,toolkitAtlases,scenes;}
}
