using UnityEngine;

[RequireComponent(typeof(Rigidbody),typeof(SphereCollider))]
public class CollisionPracticeProbe : MonoBehaviour
{
    [InspectorName("通知先")] public CollisionPracticeLesson lesson;
    void OnCollisionEnter(Collision hit)=>lesson?.Contact(hit.collider,false,true);
    void OnCollisionExit(Collision hit)=>lesson?.Contact(hit.collider,false,false);
    void OnTriggerEnter(Collider other)=>lesson?.Contact(other,true,true);
    void OnTriggerExit(Collider other)=>lesson?.Contact(other,true,false);
}
