using UnityEngine;

[CreateAssetMenu(menuName="教材/ゲームルール")]
public class CourseGameRules : ScriptableObject
{
    [Range(1,1000)] public int targetScore=3;
}
