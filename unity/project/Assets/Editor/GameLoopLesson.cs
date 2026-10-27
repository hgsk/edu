using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

public static class GameLoopLesson
{
    const string Rules="Assets/LessonSamples/CourseGameRules.asset";
    public static void CreateMissing()
    {
        var rules=AssetDatabase.LoadAssetAtPath<CourseGameRules>(Rules);
        if(!rules){rules=ScriptableObject.CreateInstance<CourseGameRules>();AssetDatabase.CreateAsset(rules,Rules);}
        foreach(bool complete in new[]{false,true})
        {
            string path="Assets/Scenes/"+(complete?"Completed/":"")+"24-GameLoop.unity";
            if(File.Exists(path))continue;
            EditorSceneManager.OpenScene("Assets/Scenes/01-Editor.unity");
            var ui=new GameObject("ExhibitUI");var doc=ui.AddComponent<UIDocument>();
            doc.panelSettings=AssetDatabase.LoadAssetAtPath<PanelSettings>("Assets/UI/ExhibitPanel.asset");doc.sortingOrder=10;
            var lesson=ui.AddComponent<CourseGameLesson>();lesson.rules=rules;lesson.keepAcrossSceneReload=complete;
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),path);
        }
        AssetDatabase.SaveAssets();Verify();LessonSamples.Verify();CourseObjectPalette.Verify();SaveTests();
    }
    public static void Verify()
    {
        foreach(bool complete in new[]{false,true})
        {
            EditorSceneManager.OpenScene("Assets/Scenes/"+(complete?"Completed/":"")+"24-GameLoop.unity");
            var lesson=UnityEngine.Object.FindFirstObjectByType<CourseGameLesson>();
            if(!lesson || !lesson.rules || lesson.rules.targetScore!=3 || lesson.keepAcrossSceneReload!=complete)
                throw new Exception("Invalid loop lesson wiring");
            if(UnityEngine.Object.FindObjectsByType<CourseSessionRoot>(FindObjectsSortMode.None).Length!=0)
                throw new Exception("Persistent owner must be created by Ensure at runtime");
        }
        Debug.Log("GAME LOOP LESSON: PASS");
    }
    static void Check(bool condition,string name){if(!condition)throw new Exception("Save test failed: "+name);}
    static void Reject(Action action,string name)
    {try{action();}catch(IOException){return;}catch(InvalidDataException){return;}catch(UnauthorizedAccessException){return;}throw new Exception("Expected rejection: "+name);}
    public static void SaveTests()
    {
        string parent=Path.GetFullPath(Path.Combine(Application.dataPath,"../../../test-results"));
        string temp=Path.Combine(parent,"loop-save-tests-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(temp);
        int count=0;
        try
        {
            var store=new CourseSaveStore(temp);var data=store.Load(out _);Check(data.bestScore==0 && !store.WriteBlocked,"new slot");count++;
            data.bestScore=3;data.completedRuns=1;store.Write(data);Check(store.Load(out _).bestScore==3,"round trip");count++;
            data.bestScore=4;data.completedRuns=2;store.Write(data);Check(File.Exists(store.FilePath+".bak"),"backup exists");count++;
            File.WriteAllText(store.FilePath,"{broken");data=store.Load(out var message);Check(data.bestScore==3 && message.StartsWith("RECOVERED"),"corrupt primary recovery");count++;
            store.Write(data);Check(store.Load(out _).bestScore==3 && File.ReadAllText(store.FilePath+".bak").Contains("bestScore"),"healthy backup retained");count++;
            string legacy="{\"version\":1,\"highScore\":7}";File.WriteAllText(store.FilePath,legacy);data=store.Load(out message);
            Check(data.version==2 && data.bestScore==7 && File.ReadAllText(store.FilePath)==legacy,"migration without overwrite");count++;
            string future="{\"version\":99,\"bestScore\":900,\"completedRuns\":5}";File.WriteAllText(store.FilePath,future);
            store.Load(out _);Reject(()=>store.Write(CourseSaveData.New()),"future schema");Check(File.ReadAllText(store.FilePath)==future,"future data preserved");count++;
            string missing="{\"version\":2}";File.WriteAllText(store.FilePath,missing);File.Delete(store.FilePath+".bak");
            store.Load(out _);Check(store.WriteBlocked,"missing required fields");Reject(()=>store.Write(CourseSaveData.New()),"damaged slot");Check(File.ReadAllText(store.FilePath)==missing,"damaged preserved");count++;
            var invalid=CourseSaveData.New();invalid.bestScore=-1;Reject(()=>store.Write(invalid),"range validation");count++;
            string blocked=Path.Combine(temp,"blocked");File.WriteAllText(blocked,"keep");var failure=new CourseSaveStore(blocked);
            Reject(()=>failure.Write(CourseSaveData.New()),"write failure");Check(File.ReadAllText(blocked)=="keep","write failure preserves existing file");count++;
            string report=Path.GetFullPath(Path.Combine(Application.dataPath,"../../evidence/24-loop-save-tests.json"));
            File.WriteAllText(report,"{\"status\":\"PASS\",\"tests\":"+count+",\"nativeReplacement\":\"PASS\",\"backupRecovery\":\"PASS\",\"migration\":\"PASS\",\"futureAndCorruptPreserved\":\"PASS\",\"writeFailure\":\"PASS\"}");
            Debug.Log("LOOP SAVE TESTS: PASS ("+count+")");
        }
        finally
        {
            // Only the newly created, verified repository-local test folder is removed.
            if(Path.GetDirectoryName(temp)!=parent)throw new Exception("Unexpected test folder");
            foreach(string file in Directory.GetFiles(temp,"*",SearchOption.AllDirectories))File.Delete(file);
            var directories=Directory.GetDirectories(temp,"*",SearchOption.AllDirectories);Array.Sort(directories,(a,b)=>b.Length.CompareTo(a.Length));
            foreach(string directory in directories)Directory.Delete(directory,false);Directory.Delete(temp,false);
        }
    }
}
