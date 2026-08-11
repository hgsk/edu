# VOICEVOX読み上げ音声について

タイピング問題の出題時に、VOICEVOX「あいえるたん」で生成済みの音声を読み上げます。
音声は`audio/`に小容量のOpus形式で同梱しています。授業中にVOICEVOXを起動したり、ネットワークへ接続したりする必要はありません。

## 音声を再生成する場合だけ

教材の問題文を変更して音声を作り直す場合は、VOICEVOX ENGINEを起動します。

```powershell
docker run --rm `
  -p 127.0.0.1:50021:50021 `
  voicevox/voicevox_engine:cpu-latest
```

追加のフレームワーク・デザイン用語80問の音声を再生成する場合は、ENGINEの起動後にリポジトリ直下で実行します。

```powershell
python hht/scripts/generate-extra-word-audio.py
```

## クレジット

生成音声を使う画面には、VOICEVOXの利用規約に従い、次のクレジットを表示しています。

`VOICEVOX:あいえるたん`
