using System;
using System.IO;
using System.Runtime.InteropServices;
using UnityEngine;

public enum CoursePhase {Title,Playing,Result}
public sealed class CoursePlaySession
{
    public CoursePhase Phase {get;internal set;}=CoursePhase.Title;
    public int Score {get;internal set;}
    public int Best {get;internal set;}
    public int PendingRuns {get;internal set;}
}

// The only persistent owner. Scene objects subscribe to it, never the reverse.
public class CourseSessionRoot : MonoBehaviour
{
    public static CourseSessionRoot Instance {get;private set;}
    CoursePlaySession Session {get;set;}=new CoursePlaySession();
    CourseSaveData Profile {get;set;}
    public CoursePhase Phase => Session.Phase;
    public int Score => Session.Score;
    public int PendingRuns => Session.PendingRuns;
    public int SavedBest => Profile.bestScore;
    public int SavedRuns => Profile.completedRuns;
    public string StorageStatus {get;private set;}
    public bool Saving {get;private set;}
    public int SaveRevision {get;private set;}
    public int Target => Mathf.Clamp(rules.targetScore,1,1000);
    public event Action Changed;
    CourseGameRules rules;
    CourseSaveStore store;
    CourseSaveData pending;
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void CourseSyncSave(string receiver);
#endif
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    static void ResetStatics(){Instance=null;}
    public static CourseSessionRoot Ensure(CourseGameRules rules)
    {
        if(!rules)throw new ArgumentNullException(nameof(rules));
        if(!Instance)new GameObject("CourseSessionRoot").AddComponent<CourseSessionRoot>();
        Instance.rules=rules;return Instance;
    }
    void Awake()
    {
        if(Instance && Instance!=this){Destroy(gameObject);return;}
        Instance=this;DontDestroyOnLoad(gameObject);
        store=new CourseSaveStore(Path.Combine(Application.persistentDataPath,"EduCourseLoop"));
        Profile=store.Load(out var status);StorageStatus=status;
    }
    void OnDestroy(){if(Instance==this)Instance=null;}
    void Notify(){Changed?.Invoke();}
    public void NewSession(){if(Saving)return;Session=new CoursePlaySession();Load();}
    public void StartRun(){if(Saving || Session.Phase!=CoursePhase.Title)return;Session.Score=0;Session.Phase=CoursePhase.Playing;Notify();}
    public void Collect(){if(Saving || Session.Phase!=CoursePhase.Playing)return;Session.Score=Mathf.Min(Target,Session.Score+1);Notify();}
    public void Finish()
    {
        if(Saving || Session.Phase!=CoursePhase.Playing || Session.Score<Target)return;
        Session.Phase=CoursePhase.Result;Session.Best=Math.Max(Session.Best,Session.Score);Session.PendingRuns++;Notify();Save();
    }
    public void Retry(){if(Saving || Session.Phase!=CoursePhase.Result)return;Session.Score=0;Session.Phase=CoursePhase.Playing;Notify();}
    public void Load(){if(Saving)return;Profile=store.Load(out var status);StorageStatus=status;Notify();}
    public void Save()
    {
        if(Saving)return;
        pending=new CourseSaveData {version=2,bestScore=Math.Max(Profile.bestScore,Session.Best),completedRuns=Profile.completedRuns+Session.PendingRuns};
        try
        {
            store.Write(pending);Saving=true;StorageStatus="SYNCING...";Notify();
#if UNITY_WEBGL && !UNITY_EDITOR
            CourseSyncSave(gameObject.name);
#else
            OnStorageSync("OK");
#endif
        }
        catch(Exception e) when(e is IOException || e is InvalidDataException || e is UnauthorizedAccessException || e is ArgumentException || e is NotSupportedException)
        {StorageStatus="SAVE FAILED: "+e.Message;pending=null;Saving=false;Notify();}
    }
    // Called only after browser IndexedDB synchronization has completed.
    [UnityEngine.Scripting.Preserve]
    public void OnStorageSync(string result)
    {
        if(!Saving)return;
        if(result=="OK"){Profile=pending;Session.PendingRuns=0;StorageStatus="SAVED v2";SaveRevision++;}
        else StorageStatus="SYNC FAILED: "+result;
        pending=null;Saving=false;Notify();
    }
    void OnApplicationPause(bool paused){if(paused && Session.PendingRuns>0 && !Saving)Save();}
}
