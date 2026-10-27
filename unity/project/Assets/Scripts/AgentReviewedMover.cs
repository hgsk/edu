using UnityEngine;

// U23 reviewed reference. Compare the agent's proposal against this behavior.
public class AgentReviewedMover : MonoBehaviour
{
    [InspectorName("移動速度")] [SerializeField, Range(0f, 5f)] float speed = 2f;
    void OnValidate() { speed = Mathf.Clamp(speed, 0f, 5f); }
    void Update()
    {
        transform.Rotate(Vector3.up, speed * 30f * Time.deltaTime);
    }
}
