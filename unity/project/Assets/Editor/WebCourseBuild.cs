using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEngine.VFX;

public class WebCourseBuild : IProcessSceneWithReport
{
    public int callbackOrder => 0;
    public void OnProcessScene(Scene scene, BuildReport report)
    {
        if(report==null || report.summary.platform!=BuildTarget.WebGL)return;
        JapaneseCourseFonts.VerifyScene(scene);
        // VFX Graph requires compute shaders; do not pretend it works on WebGL2.
        foreach(var root in scene.GetRootGameObjects())
            foreach(var vfx in root.GetComponentsInChildren<VisualEffect>(true))
                UnityEngine.Object.DestroyImmediate(vfx);
    }
    public static void Build()
    {
        if(!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.WebGL,BuildTarget.WebGL))
            throw new InvalidOperationException("Install Web Build Support for this exact Editor version.");
        LessonSamples.Verify();
        CollisionPracticeSamples.Verify();
        CourseObjectPalette.Verify();
        ShaderGraphLesson.Verify();
        GameLoopLesson.Verify();
        CollaborationLesson.Verify();
        PhysicsSandboxSamples.Verify();
        SpatialPracticeSamples.Verify();
        VrmBoneSamples.Verify();
        AudioPracticeSamples.Verify();UIPatternSamples.Verify();ProceduralMapSamples.Tests();ProceduralMapSamples.Verify();
        DependencyLesson.Tests();
        DependencyLesson.Verify();
        DependencyLesson.ValidateCompleted();
        GameLoopLesson.SaveTests();
        var entries=LessonSamples.Names.SelectMany(name=>new[]{
            new WebCoursePlayer.Entry {key=name.Substring(0,2)+"-start",path="Assets/Scenes/"+name+".unity"},
            new WebCoursePlayer.Entry {key=name.Substring(0,2)+"-complete",path="Assets/Scenes/Completed/"+name+".unity"}
        }).ToArray();
        Directory.CreateDirectory("Assets/Resources");
        File.WriteAllText("Assets/Resources/WebCourseCatalog.json",JsonUtility.ToJson(new WebCoursePlayer.Catalog {scenes=entries}));
        AssetDatabase.Refresh();
        PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.dataCaching=false;
        PlayerSettings.WebGL.threadsSupport=false;
        PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL,new[]{GraphicsDeviceType.OpenGLES3});
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL,false);
        PlayerSettings.WebGL.template="PROJECT:Course";
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes=entries.Select(e=>e.path).ToArray(),target=BuildTarget.WebGL,
            locationPathName="Builds/WebGL",options=BuildOptions.None
        });
        if(report.summary.result!=BuildResult.Succeeded)
            throw new InvalidOperationException("Web build failed: "+report.summary.result+" errors="+report.summary.totalErrors);
        File.WriteAllText("Builds/WebGL/catalog.json",JsonUtility.ToJson(new WebCoursePlayer.Catalog {scenes=entries},true));
        Debug.Log("WEB COURSE BUILD: PASS (72 scenes)");
    }
}
