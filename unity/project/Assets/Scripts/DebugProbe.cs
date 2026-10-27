using UnityEngine;

public class DebugProbe : MonoBehaviour
{
    public bool showWarning;
    void Start()
    {
        Debug.Log("Exhibit ready", this);
        if (showWarning) Debug.LogWarning("Check the exhibit label", this);
    }
}
