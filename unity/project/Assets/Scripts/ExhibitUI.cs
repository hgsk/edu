using UnityEngine;
using UnityEngine.UIElements;

public class ExhibitUI : MonoBehaviour
{
    void OnEnable()
    {
        var root = GetComponent<UIDocument>().rootVisualElement;
        root.Q<Button>("start-button").clicked += () =>
            root.Q<Label>("status").text = "ようこそ！";
    }
}
