using UnityEngine;

public class RangeGizmo : MonoBehaviour
{
    [Min(0)] public float radius = 2;
    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, radius);
    }
}
