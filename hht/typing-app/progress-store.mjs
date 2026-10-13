export const HANDLE_KEY = 'code-type-handle-v1';
export const isProgressKey = key => /^(code-type-quest-progress-v1|code-type-quest-best-[a-z0-9-]+|code-type-rsvp-(speed|calibration|completed)-v1|code-type-handle-v1)$/.test(key);
export function normalizeHandle(value) {
  const handle = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(handle)) throw new Error('ハンドルネームは英字3文字で入力してください。');
  return handle;
}

// One pending record per key survives navigation, failed writes and browser restarts.
export function createProgressStore(storage, status) {
  const memory = new Map();
  let persistent = Boolean(storage);
  const report = message => status(persistent ? message : '保存できません。このページ内でのみ進捗を保持します。再読み込みで失われます。');
  function getItem(key) {
    if (memory.has(key)) return memory.get(key);
    try { return storage?.getItem(key) ?? null; }
    catch { persistent = false; report(); return null; }
  }
  function writeItem(key, value) {
    memory.set(key, value);
    try { if (persistent) storage.setItem(key, value); }
    catch { persistent = false; report(); }
  }
  function removeItem(key) {
    memory.set(key, null);
    try { if (persistent) storage.removeItem(key); }
    catch { persistent = false; report(); }
  }
  const pendingKey = key => `course-pending:${key}`;
  let backend;
  let timer;
  let flushing = false;
  const keys = () => {
    let storedKeys = [];
    try { storedKeys = storage ? Object.keys(storage) : []; }
    catch { persistent = false; report(); }
    return [...new Set([...storedKeys, ...memory.keys()])].filter(isProgressKey);
  };
  const pending = () => keys().filter(key => getItem(pendingKey(key)) !== null);
  function setItem(key, value) {
    value = String(value);
    // Mark first: a crash between these operations must not lose the pending update.
    if (isProgressKey(key)) writeItem(pendingKey(key), value);
    writeItem(key, value);
    if (isProgressKey(key)) {
      report(backend ? '未同期の変更があります' : 'この端末に保存済み（クラウド未接続）');
      clearTimeout(timer);
      if (backend) timer = setTimeout(flush, 800);
    }
  }
  async function flush() {
    if (!backend || flushing) return;
    clearTimeout(timer);
    flushing = true;
    report('同期中…');
    try {
      for (const key of pending()) {
        const value = getItem(pendingKey(key));
        await backend.write(key, value);
        if (getItem(pendingKey(key)) === value) removeItem(pendingKey(key));
      }
      report(pending().length ? '未同期の変更があります' : 'クラウドに保存済み');
      if (pending().length) timer = setTimeout(flush, 800);
    } catch {
      report('端末に保存済み・同期失敗（再試行できます）');
    } finally { flushing = false; }
  }
  function connect(remote, adapter) {
    for (const [key, value] of Object.entries(remote)) {
      if (isProgressKey(key) && typeof value === 'string' && getItem(pendingKey(key)) === null) {
        writeItem(key, value);
      }
    }
    for (const key of keys()) {
      if (!(key in remote) && getItem(pendingKey(key)) === null) writeItem(pendingKey(key), getItem(key));
    }
    backend = adapter;
    return flush();
  }
  return { getItem, setItem, connect, flush, get persistent() { return persistent; } };
}
