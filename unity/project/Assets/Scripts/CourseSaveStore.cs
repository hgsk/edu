using System;
using System.IO;
using System.Text;
using UnityEngine;

[Serializable]
public class CourseSaveData
{
    public int version=-1, bestScore=-1, completedRuns=-1;
    public static CourseSaveData New() => new CourseSaveData {version=2,bestScore=0,completedRuns=0};
}

// Plain C# persistence, independent of any scene, UI or GameObject.
public sealed class CourseSaveStore
{
    [Serializable] class Header {public int version=-1;}
    [Serializable] class Legacy {public int highScore=-1;}
    public string FilePath {get;}
    public bool WriteBlocked {get;private set;}
    public CourseSaveStore(string directory) {FilePath=Path.Combine(directory,"save.json");}
    static void Validate(CourseSaveData data)
    {
        if(data==null || data.version!=2 || data.bestScore<0 || data.bestScore>1000000 || data.completedRuns<0 || data.completedRuns>1000000)
            throw new InvalidDataException("Invalid save fields");
    }
    static CourseSaveData Read(string path,out bool migrated)
    {
        migrated=false;
        if(new FileInfo(path).Length>1024*1024)throw new InvalidDataException("Save too large");
        string json=File.ReadAllText(path);var header=new Header();JsonUtility.FromJsonOverwrite(json,header);
        if(header.version>2)throw new NotSupportedException("Future save version; original preserved");
        if(header.version==1)
        {
            var old=new Legacy();JsonUtility.FromJsonOverwrite(json,old);
            var converted=new CourseSaveData {version=2,bestScore=old.highScore,completedRuns=0};Validate(converted);migrated=true;return converted;
        }
        var data=new CourseSaveData();JsonUtility.FromJsonOverwrite(json,data);Validate(data);return data;
    }
    static bool TryRead(string path,out CourseSaveData data,out bool migrated,out bool future)
    {
        data=null;migrated=false;future=false;if(!File.Exists(path))return false;
        try {data=Read(path,out migrated);return true;}
        catch(NotSupportedException){future=true;return false;}
        catch(Exception e) when(e is IOException || e is InvalidDataException || e is UnauthorizedAccessException || e is ArgumentException){return false;}
    }
    public CourseSaveData Load(out string message)
    {
        WriteBlocked=false;
        if(TryRead(FilePath,out var data,out bool migrated,out bool future))
        {message=migrated?"MIGRATED v1 -> v2 (file unchanged)":"LOADED v2";return data;}
        if(future){WriteBlocked=true;message="FUTURE VERSION: saving blocked";return CourseSaveData.New();}
        if(TryRead(FilePath+".bak",out data,out migrated,out future))
        {message="RECOVERED BACKUP"+(migrated?" (migrated v1)":"");return data;}
        WriteBlocked=File.Exists(FilePath) || File.Exists(FilePath+".bak");
        message=WriteBlocked?"INVALID SAVE: preserved; saving blocked":"NEW: no save yet";return CourseSaveData.New();
    }
    public void Write(CourseSaveData data)
    {
        Validate(data);Load(out _);
        if(WriteBlocked)throw new InvalidDataException("Unsupported or damaged save; restore it before writing");
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath));
        string temp=FilePath+".tmp";
        File.WriteAllText(temp,JsonUtility.ToJson(data,true),new UTF8Encoding(false));Read(temp,out _);
        bool exists=File.Exists(FilePath);
        // Never replace a healthy backup with a corrupt primary.
        if(exists && TryRead(FilePath,out _,out _,out _))File.Copy(FilePath,FilePath+".bak",true);
#if UNITY_WEBGL && !UNITY_EDITOR
        // IDBFS is memory-backed; durable completion is reported by FS.syncfs later.
        File.Copy(temp,FilePath,true);File.Delete(temp);
#else
        if(exists)File.Replace(temp,FilePath,null);else File.Move(temp,FilePath);
#endif
    }
}
