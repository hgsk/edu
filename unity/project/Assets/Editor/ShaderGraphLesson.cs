using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class ShaderGraphLesson
{
    const string Folder="Assets/LessonSamples/ShaderGraph/";
    public static void CreateMissing()
    {
        AssetDatabase.Refresh();
        foreach(bool complete in new[]{false,true})
        {
            string variant=complete?"Complete":"Start";
            string path="Assets/Scenes/"+(complete?"Completed/":"")+"23-ShaderGraph.unity";
            if(File.Exists(path))continue;
            var shader=AssetDatabase.LoadAssetAtPath<Shader>(Folder+"Exhibit"+variant+".shadergraph");
            if(!shader || ShaderUtil.ShaderHasError(shader))throw new Exception("Shader Graph import failed: "+variant);
            var material=new Material(shader);
            material.SetColor("_BaseColor",CourseObjectPalette.Parse(complete?"#C67B00":"#246C96"));
            AssetDatabase.CreateAsset(material,Folder+"Exhibit"+variant+".mat");
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");
            var exhibit=GameObject.Find("Exhibit");exhibit.GetComponent<Renderer>().sharedMaterial=material;
            var identity=exhibit.GetComponent<CourseObjectIdentity>();
            identity.colorHex=complete?"#C67B00":"#246C96";identity.colorName=complete?"橙（Shader Graph完成例）":"青";
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        AssetDatabase.SaveAssets();LessonSamples.Verify();CourseObjectPalette.Verify();
    }
    public static void OpenGraph(bool complete)
    {AssetDatabase.OpenAsset(AssetDatabase.LoadAssetAtPath<Shader>(Folder+"Exhibit"+(complete?"Complete":"Start")+".shadergraph"));}
    public static void Verify()
    {
        foreach(bool complete in new[]{false,true})
        {
            string variant=complete?"Complete":"Start";
            var shader=AssetDatabase.LoadAssetAtPath<Shader>(Folder+"Exhibit"+variant+".shadergraph");
            var mat=AssetDatabase.LoadAssetAtPath<Material>(Folder+"Exhibit"+variant+".mat");
            if(!shader || ShaderUtil.ShaderHasError(shader) || !mat || mat.shader!=shader)
                throw new Exception("Invalid Shader Graph lesson: "+variant);
        }
        Debug.Log("SHADER GRAPH LESSON: PASS");
    }
}
