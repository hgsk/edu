# 個人進捗のFirebase設定

Firebase Authenticationの匿名認証を使い、認証情報を同じブラウザに保持する。ハンドルネームは英字3文字（大文字に正規化）。同名を許可し、アクセス権はハンドル名でなくUIDで分離する。通知用のFCMトークンは認証に使用しない。

## 接続

1. 対象プロジェクトにWebアプリを登録し、公開クライアント設定を `firebase-config.js` の `window.COURSE_FIREBASE_CONFIG` に設定する。
2. Authenticationで匿名ログインを有効化し、必要な配信ドメインを承認済みドメインに登録する。匿名ユーザーの自動削除は有効化しない。
3. Firestoreデータベースを作成する。
4. このディレクトリで `firebase deploy --only firestore:rules --project <project-id>` を実行する。既存プロジェクトの場合は既存ルールを確認し、他アプリのルールを消さずにこのmatch節を統合する。
5. 既存のWeb配信先からHTTPSで開く。Firebase Hostingへの移行は不要。

SDKは公式CDNの12.19.0を使用する。サービスアカウントの秘密鍵はWebアプリに置かない。

## 保存対象と動作

`courseUsers/{uid}/progress/{key}` に習得単語・実績・正解数・最大コンボ・完全クリア数・コース別自己ベスト・読書速度・キャリブレーション・教材別読了日時・ハンドル名を保存する。貼り付けた文章と音声設定は送信しない。

初回接続時に既存の端末データを移行する。サーバーの保存値をアプリ起動前に復元し、未同期の端末変更があるキーは端末を優先する。通信失敗時も端末に保存し、再接続・再試行・次回起動で送信する。同じキーの並行編集は最後の書込みを採用するため、同時に複数タブで学習しない。

別端末・別ブラウザは別ユーザー。保存データ削除後の復旧・端末間の引継ぎ・講師向け集計は対象外。認証UIDだけが変化した場合は自動移行を止める。Firebase未設定でも端末保存で利用でき、画面に未接続を表示する。

## 検証

`node --test progress-store.test.mjs` で名前検証・移行・復元・通信失敗後の再送・送信中の編集を検証する。
`npm install --no-save @firebase/rules-unit-testing firebase` の後、Java 21以降とFirebase CLIで `firebase emulators:exec --only firestore --project demo-course-progress "node firestore.rules.test.cjs"` を実行すると、本人の読書き、他人・未認証からの拒否、不正な名前・フィールド・保存キー・時刻の拒否を検証できる。
本番接続後には、匿名UIDの再訪時維持、進捗の読戻し、独立ブラウザから他UIDへのアクセス拒否、オンライン復帰を確認する。

公式資料: [匿名認証](https://firebase.google.com/docs/auth/web/anonymous-auth)、[認証の永続化](https://firebase.google.com/docs/auth/web/auth-state-persistence)、[Firestoreルール](https://firebase.google.com/docs/firestore/security/rules-conditions)。
