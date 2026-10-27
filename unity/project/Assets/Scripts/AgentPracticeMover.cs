using UnityEngine;

// U23 start data: ask Copilot Agent to constrain speed to 0..5.
public class AgentPracticeMover : MonoBehaviour
{
    [InspectorName("移動速度")] [SerializeField] float speed = 2f;
    void Update()
    {
        transform.Rotate(Vector3.up, speed * 30f * Time.deltaTime);
    }
}
