export const HANDLE_KEY = 'code-type-handle-v1';
export const isProgressKey = key => /^(code-type-quest-progress-v1|code-type-quest-best-[a-z0-9-]+|code-type-rsvp-(speed|calibration|completed)-v1|code-type-handle-v1)$/.test(key);
export function normalizeHandle(value) {
  const handle = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(handle)) throw new Error('ハンドルネームは英字3文字で入力してください。');
  return handle;
}

// One pending record per key survives navigation, failed writes and browser restarts.
export function createProgressStore(storage, status) {
  const pendingKey = key => `course-pending:${key}`;
  let backend;
  let timer;
  let flushing = false;
  const keys = () => Object.keys(storage).filter(isProgressKey);
  const pending = () => keys().filter(key => storage.getItem(pendingKey(key)) !== null);
  function setItem(key, value) {
    value = String(value);
    // Mark first: a crash between these operations must not lose the pending update.
    if (isProgressKey(key)) storage.setItem(pendingKey(key), value);
    storage.setItem(key, value);
    if (isProgressKey(key)) {
      status(backend ? '未同期の変更があります' : 'この端末に保存済み（クラウド未接続）');
      clearTimeout(timer);
      if (backend) timer = setTimeout(flush, 800);
    }
  }
  async function flush() {
    if (!backend || flushing) return;
    clearTimeout(timer);
    flushing = true;
    status('同期中…');
    try {
      for (const key of pending()) {
        const value = storage.getItem(pendingKey(key));
        await backend.write(key, value);
        if (storage.getItem(pendingKey(key)) === value) storage.removeItem(pendingKey(key));
      }
      status(pending().length ? '未同期の変更があります' : 'クラウドに保存済み');
      if (pending().length) timer = setTimeout(flush, 800);
    } catch {
      status('端末に保存済み・同期失敗（再試行できます）');
    } finally { flushing = false; }
  }
  function connect(remote, adapter) {
    for (const [key, value] of Object.entries(remote)) {
      if (isProgressKey(key) && typeof value === 'string' && storage.getItem(pendingKey(key)) === null) {
        storage.setItem(key, value);
      }
    }
    for (const key of keys()) {
      if (!(key in remote) && storage.getItem(pendingKey(key)) === null) storage.setItem(pendingKey(key), storage.getItem(key));
    }
    backend = adapter;
    return flush();
  }
  return { setItem, connect, flush };
}
