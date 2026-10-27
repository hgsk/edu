using UnityEngine;
using UnityEngine.InputSystem;

public class ExhibitMover : MonoBehaviour
{
    [InspectorName("移動速度")] [SerializeField] float speed = 2f;
    public bool useKeyboard;
    Vector3 origin;
    void Start() { origin = transform.position; }
    void Update()
    {
        if (useKeyboard)
        {
            if (Keyboard.current == null) return;
            float x = (Keyboard.current.dKey.isPressed ? 1f : 0f)
                    - (Keyboard.current.aKey.isPressed ? 1f : 0f);
            transform.position += Vector3.right * (x * speed * Time.deltaTime);
        }
        else transform.position = origin + Vector3.up * Mathf.Sin(Time.time * speed) * .4f;
    }
}
