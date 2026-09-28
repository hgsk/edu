import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore, normalizeHandle, HANDLE_KEY } from './progress-store.mjs';
function storage() {
  const data = {};
  Object.defineProperties(data, {
    getItem: { value: key => data[key] ?? null },
    setItem: { value: (key, value) => { data[key] = String(value); } },
    removeItem: { value: key => { delete data[key]; } }
  });
  return data;
}
test('handles normalize ASCII letters only', () => {
  assert.equal(normalizeHandle(' abc '), 'ABC');
  for (const value of ['AB', 'ABCD', 'A1B', 'ＡＢＣ', '<a>']) assert.throws(() => normalizeHandle(value));
});
test('existing local progress migrates, cloud restores, unrelated keys stay private', async () => {
  const local = storage();
  local.setItem('code-type-quest-best-mix', '100');
  local.setItem('secret', 'never upload');
  const writes = [];
  const store = createProgressStore(local, () => {});
  await store.connect({ [HANDLE_KEY]: 'ABC' }, { write: async (...args) => writes.push(args) });
  assert.equal(local.getItem(HANDLE_KEY), 'ABC');
  assert.deepEqual(writes, [['code-type-quest-best-mix', '100']]);
});
test('offline changes survive restart and win over stale cloud values', async () => {
  const local = storage();
  createProgressStore(local, () => {}).setItem(HANDLE_KEY, 'NEW');
  const statuses = [];
  const store = createProgressStore(local, value => statuses.push(value));
  let fail = true;
  const writes = [];
  await store.connect({ [HANDLE_KEY]: 'OLD' }, { write: async (...args) => {
    if (fail) throw Error('offline');
    writes.push(args);
  } });
  assert.match(statuses.at(-1), /同期失敗/);
  assert.equal(local.getItem(HANDLE_KEY), 'NEW');
  fail = false;
  await store.flush();
  assert.deepEqual(writes, [[HANDLE_KEY, 'NEW']]);
  assert.equal(local.getItem(`course-pending:${HANDLE_KEY}`), null);
});
test('an edit during an in-flight write remains queued', async () => {
  const local = storage();
  const store = createProgressStore(local, () => {});
  store.setItem(HANDLE_KEY, 'AAA');
  let release;
  const first = store.connect({}, { write: () => new Promise(resolve => { release = resolve; }) });
  store.setItem(HANDLE_KEY, 'BBB');
  release();
  await first;
  assert.equal(local.getItem(`course-pending:${HANDLE_KEY}`), 'BBB');
  await store.connect({}, { write: async () => {} });
});
