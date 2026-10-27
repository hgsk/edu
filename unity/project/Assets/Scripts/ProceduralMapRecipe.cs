using System;
using System.Globalization;
using System.Linq;
using UnityEngine;

// Authoring inputs and saved outputs. Generation itself lives in Assets/Editor.
public sealed class ProceduralMapRecipe : MonoBehaviour
{
    [InspectorName("乱数シード")] public int seed=35;
    [InspectorName("一辺の区画数"),Range(2,3)] public int blocks=2;
    [InspectorName("道路幅"),Range(1.5f,4)] public float roadWidth=2;
    [InspectorName("建物の最高高さ"),Range(2,8)] public float buildingHeight=3;
    [InspectorName("地形の起伏"),Range(0,4)] public float relief;
    [InspectorName("専用の地形データ")] public TerrainData terrainData;
    [InspectorName("生成物の親")] public Transform generatedRoot;
    [InspectorName("構成の識別値")] public string layoutHash;
    public const float Spacing=8, Size=48, Height=8, Ground=.12f;

    public string ValidateInputs()
    {
        if(blocks<2||blocks>3)return "一辺の区画数は2または3にしてください。";
        if(!float.IsFinite(roadWidth)||roadWidth<1.5f||roadWidth>4)return "道幅は1.5〜4mにしてください。";
        if(!float.IsFinite(buildingHeight)||buildingHeight<2||buildingHeight>8)return "建物の高さは2〜8mにしてください。";
        if(!float.IsFinite(relief)||relief<0||relief>4)return "起伏は0〜4mにしてください。";
        return null;
    }
    public struct Building { public Vector3 position,scale; }
    public Building[] Plan()
    {
        if(ValidateInputs()!=null)throw new ArgumentException(ValidateInputs());
        var random=new System.Random(seed);var result=new Building[blocks*blocks];
        for(int z=0;z<blocks;z++)for(int x=0;x<blocks;x++){
            float h=1+(float)random.NextDouble()*(buildingHeight-1);
            float footprint=Spacing-roadWidth-1;
            result[z*blocks+x]=new Building{position=new Vector3((x-(blocks-1)*.5f)*Spacing,Ground+h*.5f,(z-(blocks-1)*.5f)*Spacing),scale=new Vector3(footprint,h,footprint)};
        }
        return result;
    }
    public float[,] Heights()
    {
        if(ValidateInputs()!=null)throw new ArgumentException(ValidateInputs());
        var heights=new float[65,65];float offset=(uint)seed%10000*.137f;
        for(int z=0;z<65;z++)for(int x=0;x<65;x++){
            float wx=x/64f*Size-Size*.5f,wz=z/64f*Size-Size*.5f;
            float edge=Mathf.Max(Mathf.Abs(wx),Mathf.Abs(wz));
            float fade=Mathf.SmoothStep(0,1,Mathf.InverseLerp(blocks*Spacing*.5f+1,Size*.5f,edge));
            heights[z,x]=(Ground+relief*Mathf.PerlinNoise(offset+wx*.085f,offset+wz*.085f)*fade)/Height;
        }
        return heights;
    }
    public string ActualHash()
    {
        uint hash=2166136261;
        void Add(float value){int quantized=Mathf.RoundToInt(value*10000);unchecked{hash=(hash^(uint)quantized)*16777619;}}
        if(generatedRoot)foreach(var t in generatedRoot.GetComponentsInChildren<Transform>().Where(t=>t!=generatedRoot).OrderBy(t=>t.name,StringComparer.Ordinal)){
            foreach(float f in new[]{t.localPosition.x,t.localPosition.y,t.localPosition.z,t.localScale.x,t.localScale.y,t.localScale.z})Add(f);
        }
        if(terrainData)foreach(float f in terrainData.GetHeights(0,0,65,65))Add(f);
        return hash.ToString("X8",CultureInfo.InvariantCulture);
    }
}
