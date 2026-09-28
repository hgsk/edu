(async () => {
  const panel = document.createElement('section');
  panel.className = 'account-panel';
  panel.setAttribute('aria-label', '個人進捗');
  panel.innerHTML = `<form id="handleForm"><label for="handleName">ハンドルネーム（英字3文字）</label>
    <input id="handleName" name="handle" minlength="3" maxlength="3" pattern="[A-Za-z]{3}" required autocomplete="nickname" placeholder="ABC" aria-describedby="accountHelp">
    <button type="submit">名前を保存</button></form>
    <p id="accountStatus" role="status">端末の進捗を準備中…</p><button id="accountRetry" type="button">同期を再試行</button>
    <p id="accountHelp">このブラウザを自動認証します。別の端末・ブラウザでは別ユーザーです。ブラウザの保存データを削除すると元の進捗に戻れません。</p>`;
  document.querySelector('header').after(panel);
  const status = text => { document.getElementById('accountStatus').textContent = text; };
  const input = document.getElementById('handleName');
  let connected = false;
  let active = true;
  let store;
  try {
    const { createProgressStore, HANDLE_KEY, normalizeHandle } = await import('./progress-store.mjs');
    store = createProgressStore(localStorage, status);
    window.CourseStorage = store;
    document.getElementById('handleForm').addEventListener('submit', event => {
      event.preventDefault();
      try {
        input.value = normalizeHandle(input.value);
        store.setItem(HANDLE_KEY, input.value);
      } catch (error) { status(error.message); }
    });
    document.getElementById('accountRetry').addEventListener('click', () => connected ? store.flush() : location.reload());
    async function connect() {
      const config = window.COURSE_FIREBASE_CONFIG;
      if (!config?.apiKey || !config?.projectId || !config?.appId) {
        status('この端末に保存中（Firebase接続設定待ち）');
        return;
      }
      status('デバイスを認証中…');
      const [appSDK, authSDK, dbSDK] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-lite.js')
      ]);
      if (!active) return;
      const app = appSDK.initializeApp(config);
      const auth = authSDK.getAuth(app);
      await authSDK.setPersistence(auth, authSDK.browserLocalPersistence);
      await auth.authStateReady();
      if (!active) return;
      const user = auth.currentUser || (await authSDK.signInAnonymously(auth)).user;
      if (!active) return;
      const ownerKey = `course-owner:${config.projectId}`;
      const oldOwner = localStorage.getItem(ownerKey);
      if (oldOwner && oldOwner !== user.uid) throw new Error('認証情報が変わりました。進捗の自動移行を停止しました。');
      localStorage.setItem(ownerKey, user.uid);
      const db = dbSDK.getFirestore(app);
      const collection = dbSDK.collection(db, 'courseUsers', user.uid, 'progress');
      const snapshot = await dbSDK.getDocs(collection);
      if (!active) return;
      const remote = Object.fromEntries(snapshot.docs.map(doc => [doc.id, doc.data().value]));
      connected = true;
      // Restore before loading either learning app so UI and in-memory state agree.
      void store.connect(remote, { write: (key, value) => dbSDK.setDoc(dbSDK.doc(collection, key), {
        value, updatedAt: dbSDK.serverTimestamp()
      }) });
    }
    let timeout;
    try {
      await Promise.race([connect(), new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('接続できません。端末に保存し、同期は再試行できます。')), 10000);
      })]);
    } catch (error) {
      status(error.message.startsWith('認証情報') ? error.message : '接続できません。端末に保存し、同期は再試行できます。');
    } finally { clearTimeout(timeout); active = false; }
    input.value = localStorage.getItem(HANDLE_KEY) || '';
    window.addEventListener('online', () => { if (connected) void store.flush(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) void store.flush(); });
  } catch {
    status('端末の保存領域を利用できません。ブラウザの設定を確認してください。');
    window.CourseStorage = { setItem() { status('保存できません。ブラウザの設定を確認してください。'); } };
  } finally {
    const script = document.createElement('script');
    script.src = document.body.classList.contains('reader-page') ? './reader.js' : './app.js';
    script.onerror = () => status('アプリを読み込めません。ページを再読み込みしてください。');
    document.body.append(script);
  }
})();
