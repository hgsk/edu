# 実務調査と参考資料

講座設計時の品質レビューに使用した一次情報です。Web標準やサービス仕様は更新されるため、講師は開講前にリンク先の最新版を確認してください。

## HTML・CSS・レスポンシブ

- [MDN: Document and website structure](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Structuring_documents) — 文書構造とセマンティック要素
- [MDN: Responsive web design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) — レスポンシブ設計の基礎

## アクセシビリティ

- [W3C WAI: Tips for Developing](https://www.w3.org/WAI/tips/developing/) — HTML、キーボード、代替テキスト等の開発要点
- [W3C WAI: Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/) — ラベル、グループ、説明、検証
- [W3C WAI: Template for Accessibility Evaluation Reports](https://www.w3.org/WAI/test-evaluate/report-template/) — 自動・手動を組み合わせた評価記録

## 画像

- [web.dev: Image performance](https://web.dev/learn/performance/image-performance) — 形式、圧縮、読み込みとパフォーマンス
- [web.dev: Responsive images](https://web.dev/articles/responsive-images) — `srcset`、`sizes`、`picture`

## 著作権・撮影

- [文化庁: 写真撮影契約の留意事項](https://pf.bunka.go.jp/chosaku/chosakuken/c-template/type06_precution.php) — 撮影者、利用条件、契約
- [文化庁: 写真等のWeb利用許諾例](https://www.bunka.go.jp/chosakuken/keiyaku_manual/2_4_2.html) — Web掲載の利用許諾
- [文化庁: ここが知りたい著作権](https://www.bunka.go.jp/seisaku/chosakuken/taisetsu/point/index.html) — ネット上の著作物利用の基本

AI生成物は、上記の一般原則に加え、授業で使用する生成サービスの最新利用規約、入力データの扱い、案件の契約条件を確認します。

## 公開・運用

- [IPA: 安全なウェブサイトの運用管理に向けた20ヶ条](https://www.ipa.go.jp/security/vuln/websecurity/sitecheck.html) — 不要ファイル、継続確認等の運用上の注意
- [Google Search Central: Influencing title links](https://developers.google.com/search/docs/appearance/title-link) — タイトル表示と情報の整合
- [XServer: SSH設定](https://www.xserver.ne.jp/manual/man_server_ssh.php) — 公開鍵認証、SSH有効化、接続情報と操作上の注意

## 発展講座

- [WordPress Theme Handbook](https://developer.wordpress.org/themes/) — ブロックテーマとクラシックテーマ、テーマ構造
- [WordPress Site Editor](https://wordpress.org/documentation/article/site-editor/) — テンプレート、パターン、スタイルの編集
- [Figma: Guide to prototyping](https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-prototyping-in-Figma) — フロー、共有、フィードバック、利用者テスト
- [Figma: Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode) — 実装引継ぎ、注釈、バージョン、ready for development
- [Google Search Central: SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) — 検索向けサイト構造とコンテンツの基本
- [Shopify: Products](https://help.shopify.com/en/manual/products) — 商品、バリエーション、在庫、コレクション、配送の関連
- [Shopify: Managing themes](https://help.shopify.com/en/manual/online-store/themes/managing-themes) — テーマの複製、公開、バックアップ
- [Webflow CMS](https://help.webflow.com/hc/en-us/articles/33961307099027-Intro-to-the-Webflow-CMS) — Collectionによる構造化コンテンツ
- [STUDIO: 公開サイト基盤](https://help.studio.design/ja/articles/15444819-studio%E3%81%AE%E5%85%AC%E9%96%8B%E3%82%B5%E3%82%A4%E3%83%88%E5%9F%BA%E7%9B%A4) — 公開基盤とCMS更新
- [平岩工業株式会社](https://hrw-kk.com/) — 求人Cの指定参考サイト。教材では情報構成と品質観点だけを分析

## 教材へ反映したレビュー事項

- 承認依頼の送信と承認済みを区別する
- 自動アクセシビリティ検査だけで合格にしない
- WebP・AVIFは候補として比較し、寸法、品質、互換性、フォールバックも見る
- 撮影はWeb掲載、期間、地域、改変、二次利用、クレジット、肖像・施設許可を確認する
- 本番を直接編集せず、バックアップ、ステージング、承認、限定公開、公開後確認、ロールバックを扱う
- 営業時間・価格の検索対象には構造化データ、画像内文字、PDF、外部導線も候補として含める
- 著作権年、記事年、事業年度、創業年を区別する
