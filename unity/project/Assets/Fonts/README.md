# 日本語フォント

- 元フォント：Noto Sans JP Regular（Noto CJKの日本語サブセット、OpenType）。
- 配布元：https://github.com/notofonts/noto-cjk/tree/main/Sans/SubsetOTF/JP
- 取得日：2026-10-18。
- SHA-256：`dff723ba59d57d136764a04b9b2d03205544f7cd785a711442d6d2d085ac5073`。
- 利用条件：同梱の `OFL.txt`（SIL Open Font License 1.1）。元フォントは改変していません。
- `NotoSansJP-TMP.asset`：TextMeshPro用。TMP Settingsの既定フォントとuGUIの文字へ設定。
- `NotoSansJP-UIToolkit.asset`：UI Toolkit用のTextCoreフォント。`JapanesePanelTextSettings.asset`を経由してPanelSettingsへ設定。
- どちらもDynamic SDF・元フォント同梱。教材の文字とかな等を事前収録し、追加の文字は実行時に補います。フォントにない文字は追加できません。
- `JapaneseCourseFonts.Install` は専用教材プロジェクトの全シーンへフォントを設定します。旧uGUI Textがある場合だけTMPへ変換し、表示文字・サイズ・色・配置とボタンクリックの参照を保持します。再実行時は既存のフォントアセットを更新します。
- Unity標準の部品名・API・アセット名・操作検査のIDは正式名を維持し、教材が表示する見出し・説明・ボタン・状態・凡例を日本語化しています。
