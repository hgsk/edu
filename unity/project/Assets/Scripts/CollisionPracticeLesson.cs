using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public class CollisionPracticeLesson : MonoBehaviour
{
    [InspectorName("移動する球")] public Rigidbody ball;
    [InspectorName("壁の判定")] public BoxCollider wall;
    [InspectorName("通過センサー")] public BoxCollider sensor;
    readonly Dictionary<string,Button> buttons=new Dictionary<string,Button>();
    readonly Queue<string> events=new Queue<string>();
    Label status,history;
    VisualElement root;
    bool active,previousIgnore,ownsLayerPair,running,ignoreWall,wallOnly=true,includeTriggers;
    int ballLayer,wallLayer;
    int collisionEnters,collisionExits,sensorEnters,sensorExits,wallTriggerEnters;
    string rayHit="未検査";
    readonly Vector3 origin=new Vector3(-4,.6f,0);
    [Serializable] public class Control {public string action;public float x,y;}
    [Serializable] public class State
    {
        public bool running,wallTrigger,ignoreWall,wallOnly,includeTriggers;
        public int collisionEnters,collisionExits,sensorEnters,sensorExits,wallTriggerEnters;
        public float x,speed;public string rayHit;public Control[] buttons;
    }
    void OnEnable()
    {
        if(!Application.isPlaying)return;
        if(!ball||!wall||!sensor||ball.gameObject.layer<8||wall.gameObject.layer<8||ball.gameObject.layer==wall.gameObject.layer){Debug.LogError("当たり判定の参照・専用レイヤーを確認してください。",this);enabled=false;return;}
        // Colliders can be destroyed before this component during scene unload.
        // Keep the layer numbers so cleanup never depends on those Unity references.
        ballLayer=ball.gameObject.layer;wallLayer=wall.gameObject.layer;
        previousIgnore=Physics.GetIgnoreLayerCollision(ballLayer,wallLayer);ownsLayerPair=true;
        Physics.IgnoreLayerCollision(ballLayer,wallLayer,false);active=true;ignoreWall=false;
        root=GetComponent<UIDocument>().rootVisualElement;root.Clear();buttons.Clear();
        var panel=new VisualElement();panel.style.width=Length.Percent(94);panel.style.maxWidth=720;panel.style.marginLeft=Length.Percent(3);panel.style.marginTop=12;panel.style.paddingLeft=12;panel.style.paddingRight=12;panel.style.paddingTop=10;panel.style.paddingBottom=10;panel.style.backgroundColor=new Color(.03f,.045f,.065f,.98f);root.Add(panel);
        var title=new Label("当たり判定：衝突・通過・照会 / U36");title.style.fontSize=21;title.style.color=Color.white;title.style.whiteSpace=WhiteSpace.Normal;panel.Add(title);
        status=new Label{name="status"};status.style.color=Color.white;status.style.fontSize=16;status.style.whiteSpace=WhiteSpace.Normal;panel.Add(status);
        var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;row.style.flexWrap=Wrap.Wrap;panel.Add(row);
        Add(row,"launch","球を進める",()=>{ResetBall();StartCoroutine(Launch());});
        Add(row,"reset","球を初期位置へ",ResetBall);
        Add(row,"wall","壁：衝突 / 通過",()=>{ResetBall();wall.isTrigger=!wall.isTrigger;rayHit="未検査";});
        Add(row,"layers","球と壁の衝突を切替",()=>{ResetBall();ignoreWall=!ignoreWall;Physics.IgnoreLayerCollision(ball.gameObject.layer,wall.gameObject.layer,ignoreWall);});
        Add(row,"mask","照会：壁 / 壁とセンサー",()=>{wallOnly=!wallOnly;rayHit="未検査";});
        Add(row,"triggers","照会にTriggerを含める",()=>{includeTriggers=!includeTriggers;rayHit="未検査";});
        Add(row,"ray","Raycastで照会",Scan);
        history=new Label();history.style.color=Color.white;history.style.fontSize=15;history.style.whiteSpace=WhiteSpace.Normal;panel.Add(history);ResetBall();
    }
    void Add(VisualElement parent,string key,string text,Action action){var b=new Button(action){text=text,name="collision-"+key};b.style.minWidth=158;b.style.height=34;b.style.marginRight=5;b.style.marginBottom=4;b.style.color=Color.black;b.style.backgroundColor=new Color(.96f,.91f,.63f);parent.Add(b);buttons.Add(key,b);}
    void ResetBall(){StopAllCoroutines();running=false;if(!ball.isKinematic){ball.linearVelocity=Vector3.zero;ball.angularVelocity=Vector3.zero;}ball.isKinematic=true;ball.position=origin;ball.rotation=Quaternion.identity;Physics.SyncTransforms();collisionEnters=collisionExits=sensorEnters=sensorExits=wallTriggerEnters=0;events.Clear();}
    IEnumerator Launch(){yield return new WaitForFixedUpdate();yield return new WaitForFixedUpdate();running=true;ball.isKinematic=false;ball.linearVelocity=Vector3.right*3;ball.WakeUp();}
    public void Contact(Collider other,bool trigger,bool enter)
    {
        if(!active||!running)return;
        if(other==sensor&&trigger){if(enter)sensorEnters++;else sensorExits++;Record("G センサー："+(enter?"入りました":"出ました"));}
        else if(other==wall){if(trigger){if(enter)wallTriggerEnters++;Record("W 壁のTrigger："+(enter?"入りました":"出ました"));}else{if(enter)collisionEnters++;else collisionExits++;Record("W 壁との衝突："+(enter?"接触しました":"離れました"));}}
    }
    void Record(string value){events.Enqueue(value);while(events.Count>5)events.Dequeue();}
    public void Scan(){Physics.SyncTransforms();int mask=1<<wall.gameObject.layer;if(!wallOnly)mask|=1<<sensor.gameObject.layer;bool hit=Physics.Raycast(new Vector3(-4.8f,.6f,0),Vector3.right,out var info,10,mask,includeTriggers?QueryTriggerInteraction.Collide:QueryTriggerInteraction.Ignore);rayHit=hit?(info.collider==wall?"W 壁":info.collider==sensor?"G センサー":"別の物体"):"該当なし";}
    void Update()
    {
        if(!active)return;if(running&&ball.position.x>4.2f){ball.linearVelocity=Vector3.zero;running=false;}
        status.text=$"壁：{(wall.isTrigger?"通過するTrigger":"衝突して止まるCollider")} ／ 球と壁の衝突：{(ignoreWall?"無効":"有効")}\n衝突開始 {collisionEnters}回 ／ センサー 入場 {sensorEnters}回・退場 {sensorExits}回 ／ 壁Trigger入場 {wallTriggerEnters}回\n球の位置X {ball.position.x:0.00} m ／ 速さ {ball.linearVelocity.magnitude:0.00} m/s\nRaycast：{(wallOnly?"壁のみ":"壁とセンサー")} ／ Trigger {(includeTriggers?"含む":"除外")} → {rayHit}";
        history.text="実際の通知："+(events.Count==0?"まだありません":string.Join(" → ",events));
    }
    void OnDisable(){active=false;running=false;StopAllCoroutines();if(ownsLayerPair)Physics.IgnoreLayerCollision(ballLayer,wallLayer,previousIgnore);ownsLayerPair=false;}
    public State Capture()
    {
        if(!active||root?.panel==null)return null;var bounds=root.panel.visualTree.worldBound;var controls=new List<Control>();
        foreach(var pair in buttons){var rect=pair.Value.worldBound;if(!(rect.width>0&&rect.height>0&&bounds.width>0&&bounds.height>0))return null;controls.Add(new Control{action=pair.Key,x=rect.center.x/bounds.width,y=rect.center.y/bounds.height});}
        return new State{running=running,wallTrigger=wall.isTrigger,ignoreWall=ignoreWall,wallOnly=wallOnly,includeTriggers=includeTriggers,collisionEnters=collisionEnters,collisionExits=collisionExits,sensorEnters=sensorEnters,sensorExits=sensorExits,wallTriggerEnters=wallTriggerEnters,x=ball.position.x,speed=ball.linearVelocity.magnitude,rayHit=rayHit,buttons=controls.ToArray()};
    }
}
