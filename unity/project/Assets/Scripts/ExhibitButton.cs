using UnityEngine;
using TMPro;

public class ExhibitButton : MonoBehaviour
{
    [InspectorName("状態の文字")] public TMP_Text status;
    public void Begin() { status.text = "ようこそ！"; Debug.Log("Exhibit started"); }
}
