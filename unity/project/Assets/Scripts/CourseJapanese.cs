using System.Collections.Generic;
using System.Text.RegularExpressions;

// Technical identifiers remain stable; their presentation is translated here.
public static class CourseJapanese
{
    static readonly Dictionary<string,string> Terms=new Dictionary<string,string> {
        {"Title","タイトル"},{"Playing","プレイ中"},{"Result","結果"},{"CollisionWall","衝突する壁"},{"TriggerSensor","通過センサー"},
        {"READY","準備完了"},{"MOVED","移動しました"},{"BLOCKED","移動できません"},{"RESET","初期状態"},{"GOAL","目標に到着"},{"NO KIT IN START","開始シーンには外観部品がありません"},
        {"ON","有効"},{"OFF","無効"},{"NONE","なし"},{"LEFT","左足"},{"RIGHT","右足"},
        {"Exhibit reference missing","展示物の参照がありません"},{"Exhibit inactive","展示物が非アクティブです"},{"SafeExhibitDriver not attached","SafeExhibitDriverが未アタッチです"},{"Duplicate SafeExhibitDriver","SafeExhibitDriverが重複しています"},{"Destination differs from scene contract D","移動先が指定のDと異なります"},{"SafeExhibitDriver disabled","SafeExhibitDriverが無効です"},
        {"Rigidbody missing","Rigidbodyがありません"},{"BoxCollider missing","BoxColliderがありません"},{"BoxCollider disabled","BoxColliderが無効です"},{"Use kinematic body / gravity OFF","キネマティックを有効、重力を無効にしてください"},{"Destination missing: assign D","移動先が未設定です。Dを指定してください"},{"Destination must be a different object","移動先には別のオブジェクトを指定してください"},{"Destination belongs to another scene","移動先が別のシーンにあります"},{"Destination disabled","移動先が無効です"},{"Speed invalid","速度が不正です"},{"local components + typed destination","同一物体の依存部品と移動先を確認済み"},
        {"SYNCING...","同期中…"},{"SAVED v2","保存済み（形式2）"},{"NEW","新規データ"},
        {"DisplayFloor","展示用の床"},{"WelcomeExhibit","展示物"},{"Sphere","球"},{"Capsule","カプセル"},{"Marker","目印"},{"WelcomeParticles","歓迎エフェクト"},
        {"Body","キャラクター本体"},{"Shoulder","肩"},{"Elbow","肘"},{"Hand","手"},{"LeftFoot","左足"},{"RightFoot","右足"},{"Listener","音を聞く位置"},{"WallLeft","左の壁"},{"WallRight","右の壁"},{"Entrance","入口"},{"Exit","出口"},{"Target","目標"},
        {"Floor","床"},{"Exhibit","展示物"},{"ExhibitRight","右の展示物"},{"Main Camera","メインカメラ"},{"Directional Light","平行光源"},
        {"Ball","球"},{"Ramp","斜面"},{"Goal","目標"},{"Player","プレイヤー"},{"Actor","操作キャラクター"},{"Ground","地面"},{"Terrain","地形"},{"IKTarget","IK目標"},{"Concrete","コンクリート"},{"Wood","木の床"}
    };
    public static string Text(string value)
    {
        if(string.IsNullOrEmpty(value))return "";
        if(Terms.TryGetValue(value,out var translated))return translated;
        if(value=="NEW: no save yet")return "新規：保存データはまだありません";
        if(value=="LOADED v2")return "形式2を読込済み";
        if(value=="MIGRATED v1 -> v2 (file unchanged)")return "形式1から2へ移行済み（ファイル未変更）";
        if(value=="FUTURE VERSION: saving blocked")return "新しい形式のため上書きを停止中";
        if(value=="INVALID SAVE: preserved; saving blocked")return "不正なデータを保持し、上書きを停止中";
        if(value.StartsWith("RECOVERED BACKUP"))return "バックアップから復旧済み"+(value.Contains("migrated")?"（形式1から移行）":"");
        foreach(var pair in new[]{new[]{"LOADED","読込済み"},new[]{"DEFAULT","初期データ"},new[]{"RECOVERED","バックアップから復旧"},new[]{"MIGRATED","旧形式から移行"},new[]{"SAVE FAILED","保存失敗"},new[]{"SYNC FAILED","同期失敗"}})
            if(value.StartsWith(pair[0]))return pair[1]+value.Substring(pair[0].Length);
        return value;
    }
    public static string ObjectName(string name,string id)
    {
        if(Terms.TryGetValue(name,out var value))return value;
        if(name.StartsWith("Block"))return "箱 "+id.Substring(1);
        if(id.StartsWith("B"))return "建物 "+id.Substring(1);
        if(id.StartsWith("R"))return "道路 "+id.Substring(1);
        return "物体 "+id;
    }
}
