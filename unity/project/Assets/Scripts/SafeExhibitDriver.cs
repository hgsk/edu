using UnityEngine;

[RequireComponent(typeof(Rigidbody),typeof(BoxCollider))]
[DisallowMultipleComponent]
public sealed class SafeExhibitDriver : MonoBehaviour
{
    [InspectorName("移動先")] [SerializeField] CourseDestination destination;
    [InspectorName("移動速度")] [SerializeField,Min(.1f)] float speed=1;
    Rigidbody body;
    public CourseDestination Destination=>destination;
    public float Speed=>speed;
    void Reset(){TryGetComponent(out body);speed=1;}
    // OnValidate may run off the main thread: only validate this component's scalar data.
    void OnValidate(){if(float.IsNaN(speed)||float.IsInfinity(speed))speed=1;speed=Mathf.Max(.1f,speed);}
    public bool Check(out string reason)
    {
        if(!TryGetComponent<Rigidbody>(out var local)){reason="Rigidbody missing";return false;}
        if(!TryGetComponent<BoxCollider>(out var collider)){reason="BoxCollider missing";return false;}
        if(!collider.enabled){reason="BoxCollider disabled";return false;}
        if(!local.isKinematic || local.useGravity){reason="Use kinematic body / gravity OFF";return false;}
        if(!destination){reason="Destination missing: assign D";return false;}
        if(destination.gameObject==gameObject){reason="Destination must be a different object";return false;}
        if(destination.gameObject.scene!=gameObject.scene){reason="Destination belongs to another scene";return false;}
        if(!destination.enabled || !destination.gameObject.activeInHierarchy){reason="Destination disabled";return false;}
        if(float.IsNaN(speed)||float.IsInfinity(speed)||speed<.1f){reason="Speed invalid";return false;}
        reason="local components + typed destination";return true;
    }
    public bool Initialize()
    {
        TryGetComponent(out body);
        bool valid=Check(out var reason);enabled=valid;
        if(!valid && Application.isPlaying)Debug.LogWarning("[U28] BLOCKED: "+reason,this);
        return valid;
    }
    public void Configure(CourseDestination value){destination=value;if(Application.isPlaying)Initialize();}
    void Awake(){Initialize();}
    void OnEnable(){TryGetComponent(out body);}
    void FixedUpdate()
    {
        if(!Check(out var reason)){enabled=false;Debug.LogWarning("[U28] BLOCKED: "+reason,this);return;}
        // Stop before D rather than covering it, preserving both role labels.
        body.MovePosition(Vector3.MoveTowards(body.position,destination.transform.position-Vector3.right*1.4f,speed*Time.fixedDeltaTime));
    }
}
