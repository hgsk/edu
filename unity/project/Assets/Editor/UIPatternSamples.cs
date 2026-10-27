using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class UIPatternSamples
{
    [MenuItem("教材/UIギャラリーを追加")]
    public static void AddGallery()
    {
        AssetDatabase.Refresh();
        foreach(bool complete in new[]{false,true}){
            var scene=EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+"18-UIToolkit.unity");
            var document=UnityEngine.Object.FindFirstObjectByType<UIDocument>();
            var gallery=document.GetComponent<UIPatternGallery>();if(!gallery)gallery=document.gameObject.AddComponent<UIPatternGallery>();
            gallery.galleryAsset=AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/UI/PatternGallery.uxml");gallery.galleryStyle=AssetDatabase.LoadAssetAtPath<StyleSheet>("Assets/UI/PatternGallery.uss");EditorSceneManager.SaveScene(scene);
        }
        Verify();LessonSamples.Verify();CourseObjectPalette.Verify();DependencyLesson.ValidateCompleted();
    }
    public static void Verify(){foreach(bool complete in new[]{false,true}){EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+"18-UIToolkit.unity");var g=UnityEngine.Object.FindFirstObjectByType<UIPatternGallery>();if(!g||!g.galleryAsset||!g.galleryStyle||UIPatternGallery.Titles.Length!=14)throw new Exception("Missing UI pattern gallery");var tree=g.galleryAsset.CloneTree();foreach(string name in new[]{"gallery-shell","gallery-preview","gallery-catalog","gallery-content","gallery-pattern","gallery-feedback","gallery-prev","gallery-next","gallery-reset","gallery-close"})if(tree.Q(name)==null)throw new Exception("Missing gallery element: "+name);}
        Directory.CreateDirectory("../evidence");File.WriteAllText("../evidence/18-ui-gallery.json","{\"status\":\"PASS\",\"scenes\":2,\"patterns\":14,\"shell\":\"UXML\",\"styles\":\"USS\"}");Debug.Log("UI PATTERN GALLERY: PASS (14 patterns / 2 scenes)");}
}
