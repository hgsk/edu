"""Prepare isolated Unity import projects and a local UPM tarball; no uploads."""
import hashlib
import io
import json
from pathlib import Path
import tarfile
import uuid

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / 'unity/project'


def prepare():
    lab = ROOT / 'test-results' / ('unity-sharing-' + uuid.uuid4().hex[:10])
    lab.mkdir(parents=True)
    shared = PROJECT / 'Assets/LessonSamples/TeamSharing'
    files = {f'Runtime/{p.name}': p for p in shared.iterdir() if p.is_file()}
    for suffix in ['', '.meta']:
        files['Runtime/CourseObjectIdentity.cs' + suffix] = PROJECT / ('Assets/Scripts/CourseObjectIdentity.cs' + suffix)
    package = lab / 'edu-team-sharing-1.0.0.tgz'
    manifest = {'name': 'jp.edu.team-sharing', 'version': '1.0.0',
                'displayName': 'Edu Team Sharing', 'unity': '6000.3', 'hideInEditor': False,
                'description': 'Local shared prefab exercise. Choose either UPM or unitypackage.',
                'dependencies': {'com.unity.render-pipelines.universal': '17.3.0'}}
    with tarfile.open(package, 'w:gz') as archive:
        data = json.dumps(manifest, indent=2).encode(); entry = tarfile.TarInfo('package/package.json'); entry.size = len(data)
        archive.addfile(entry, io.BytesIO(data))
        for relative, source in sorted(files.items()): archive.add(source, arcname='package/' + relative)
        data = json.dumps({'name': 'Edu.TeamSharing'}).encode(); entry = tarfile.TarInfo('package/Runtime/Edu.TeamSharing.asmdef'); entry.size = len(data)
        archive.addfile(entry, io.BytesIO(data))
        data = b'fileFormatVersion: 2\nguid: a81eaf005da24a30bfb92d309110bd26\nAssemblyDefinitionImporter:\n  externalObjects: {}\n'; entry = tarfile.TarInfo('package/Runtime/Edu.TeamSharing.asmdef.meta'); entry.size = len(data)
        archive.addfile(entry, io.BytesIO(data))
        data = b'fileFormatVersion: 2\nguid: b81eaf005da24a30bfb92d309110bd26\nfolderAsset: yes\nDefaultImporter:\n  externalObjects: {}\n'; entry = tarfile.TarInfo('package/Runtime.meta'); entry.size = len(data)
        archive.addfile(entry, io.BytesIO(data))
    # Confirm an actual Editor export contains the original asset bytes and meta GUIDs.
    with tarfile.open(ROOT / 'test-results/TeamSharing.unitypackage', 'r:gz') as archive:
        paths = {archive.extractfile(m).read().decode().strip(): m.name.rsplit('/', 1)[0]
                 for m in archive.getmembers() if m.name.endswith('/pathname')}
        for source in shared.iterdir():
            if source.suffix == '.meta': continue
            relative = source.relative_to(PROJECT).as_posix(); prefix = paths[relative]
            assert archive.extractfile(prefix + '/asset').read() == source.read_bytes()
            assert archive.extractfile(prefix + '/asset.meta').read() == Path(str(source) + '.meta').read_bytes()
    verify = '''using System;using System.IO;using UnityEditor;using UnityEngine;
public static class SharingImportVerify {
 public static void Import(){AssetDatabase.ImportPackage(Path.GetFullPath(Path.Combine(Application.dataPath,"../../../TeamSharing.unitypackage")),false);AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);Debug.Log("SHARING PACKAGE IMPORTED");}
 [MenuItem("Course/Inspect shared prefabs")]
 public static void Inspect(){Run();Selection.activeObject=AssetDatabase.LoadAssetAtPath<GameObject>(AssetDatabase.GUIDToAssetPath("GUID_A"));EditorGUIUtility.PingObject(Selection.activeObject);
 foreach(string name in new[]{"Exhibit","ExhibitRight"})if(!GameObject.Find(name)){var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(AssetDatabase.GUIDToAssetPath(name=="Exhibit"?"GUID_A":"GUID_D"));var go=(GameObject)PrefabUtility.InstantiatePrefab(prefab);go.name=name;go.transform.position=new Vector3(name=="Exhibit"?-1.4f:1.4f,.5f,0);}
 if(SceneView.lastActiveSceneView)SceneView.lastActiveSceneView.LookAt(new Vector3(0,.5f,0),Quaternion.Euler(22,-25,0),4);
 UnityEditor.SceneManagement.EditorSceneManager.SaveScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene(),"Assets/SharedImportPreview.unity");
 foreach(var c in ((GameObject)Selection.activeObject).GetComponents<Component>())UnityEditorInternal.InternalEditorUtility.SetIsInspectorExpanded(c,c is MonoBehaviour);
 }
 public static void ConfigureRendering(){
  var pipeline=AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset>("Assets/ImportPipeline.asset");
  if(!pipeline){var data=ScriptableObject.CreateInstance<UnityEngine.Rendering.Universal.UniversalRendererData>();AssetDatabase.CreateAsset(data,"Assets/ImportRenderer.asset");pipeline=UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset.Create(data);AssetDatabase.CreateAsset(pipeline,"Assets/ImportPipeline.asset");}
  UnityEngine.Rendering.GraphicsSettings.defaultRenderPipeline=pipeline;QualitySettings.renderPipeline=pipeline;AssetDatabase.SaveAssets();
 }
 public static void Run(){ConfigureRendering();
  int count=0; foreach(string name in new[]{"Exhibit","ExhibitRight"}) {
   string path=AssetDatabase.GUIDToAssetPath(name=="Exhibit"?"GUID_A":"GUID_D");
   var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(path);
   if(!prefab || !prefab.GetComponent<Renderer>().sharedMaterial || !prefab.GetComponent("CourseObjectIdentity"))throw new Exception("Shared prefab references missing: "+path);
   Color expected=name=="Exhibit"?new Color32(36,108,150,255):new Color32(230,219,245,255);
   if(Vector4.Distance(prefab.GetComponent<Renderer>().sharedMaterial.color,expected)>.01f)throw new Exception("Wrong shared material");count++;
  }
  File.WriteAllText("sharing-import-report.json","{\\"status\\":\\"PASS\\",\\"prefabs\\":"+count+",\\"guidAndMaterialReferences\\":\\"PASS\\"}");
  Debug.Log("SHARING IMPORT: PASS (2 prefabs, GUIDs, materials, identity scripts)");
 }
}'''
    for token, name in [('GUID_A', 'Exhibit'), ('GUID_D', 'ExhibitRight')]:
        guid = next(line.split(': ', 1)[1] for line in (shared / (name + '.prefab.meta')).read_text().splitlines() if line.startswith('guid:'))
        verify = verify.replace(token, guid)
    for kind in ['unitypackage', 'upm']:
        destination = lab / kind
        for folder in ['Assets/Editor', 'Packages', 'ProjectSettings']: (destination / folder).mkdir(parents=True)
        (destination / 'Assets/Editor/SharingImportVerify.cs').write_text(verify, encoding='utf-8')
        (destination / 'ProjectSettings/ProjectVersion.txt').write_bytes((PROJECT / 'ProjectSettings/ProjectVersion.txt').read_bytes())
        dependencies = {'com.unity.render-pipelines.universal': '17.3.0'}
        if kind == 'upm': dependencies['jp.edu.team-sharing'] = 'file:' + package.as_posix()
        (destination / 'Packages/manifest.json').write_text(json.dumps({'dependencies': dependencies}, indent=2))
    result = {'root': str(lab), 'package': str(package), 'archiveBytes': 'PASS',
              'sha256': hashlib.sha256(package.read_bytes()).hexdigest()}
    (lab / 'report.json').write_text(json.dumps(result, indent=2)); print(json.dumps(result))


if __name__ == '__main__': prepare()
