using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

// Local samples only: no remote repository or cloud account is created.
public static class CollaborationLesson
{
    const string Folder="Assets/LessonSamples/TeamSharing";
    static readonly string[] Names={"25-VersionControl","26-DataSharing","27-TeamDevelopment"};
    public static void CreateMissing()
    {
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
        foreach(string name in new[]{"Exhibit","ExhibitRight"})
        {
            string path=Folder+"/"+name+".prefab";
            if(File.Exists(path))continue;
            var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name=name;
            var tag=go.AddComponent<CourseObjectIdentity>();bool right=name=="ExhibitRight";
            tag.identifier=right?"D":"A";tag.colorHex=right?"#E6DBF5":"#246C96";tag.colorName=right?"淡い紫":"青";
            // Copy the materials into the shared asset folder so the package is self-contained.
            var source=AssetDatabase.LoadAssetAtPath<Material>("Assets/Art/Palette/"+(right?"D-ExhibitRight":"A-Exhibit")+".mat");
            if(!source)throw new Exception("Palette material not found");
            string matPath=Folder+"/"+name+".mat";
            if(!File.Exists(matPath))AssetDatabase.CreateAsset(new Material(source),matPath);
            go.GetComponent<Renderer>().sharedMaterial=AssetDatabase.LoadAssetAtPath<Material>(matPath);
            PrefabUtility.SaveAsPrefabAsset(go,path);UnityEngine.Object.DestroyImmediate(go);
        }
        foreach(string name in Names)foreach(bool complete in new[]{false,true})
        {
            string path="Assets/Scenes/"+(complete?"Completed/":"")+name+".unity";
            if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");
            UnityEngine.Object.DestroyImmediate(GameObject.Find("Exhibit"));
            var left=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/Exhibit.prefab"));
            left.name="Exhibit";left.transform.position=new Vector3(complete?-1.4f:0,.5f,0);
            if(complete || name.StartsWith("27"))
            {
                var right=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/ExhibitRight.prefab"));
                right.name="ExhibitRight";right.transform.position=new Vector3(complete?1.4f:.35f,.5f,0);
            }
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        AssetDatabase.SaveAssets();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();
        ExportShared();
    }
    public static void ExportShared()
    {
        string parent=Path.GetFullPath(Path.Combine(Application.dataPath,"../../../test-results"));Directory.CreateDirectory(parent);
        AssetDatabase.ExportPackage(new[]{Folder,"Assets/Scripts/CourseObjectIdentity.cs"},Path.Combine(parent,"TeamSharing.unitypackage"),ExportPackageOptions.Recurse|ExportPackageOptions.IncludeDependencies);
        Debug.Log("TEAM SHARING EXPORT: PASS (test-results/TeamSharing.unitypackage)");
    }
    public static void Verify()
    {
        foreach(string name in Names)foreach(bool complete in new[]{false,true})
        {
            EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+name+".unity");
            var left=GameObject.Find("Exhibit");var right=GameObject.Find("ExhibitRight");
            if(!left || !PrefabUtility.IsPartOfPrefabInstance(left))throw new Exception("Shared prefab reference missing");
            if((complete || name.StartsWith("27"))!=!!right)throw new Exception("Integration objects missing");
            if(complete && Vector3.Distance(left.transform.position,right.transform.position)<2)throw new Exception("Integrated roles overlap");
        }
        Debug.Log("COLLABORATION LESSONS: PASS (6 scenes, linked prefabs, separated roles)");
    }
}
