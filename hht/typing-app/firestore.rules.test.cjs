// npm install --no-save @firebase/rules-unit-testing firebase
// Run against a Firestore emulator with FIRESTORE_EMULATOR_HOST set.
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, serverTimestamp } = require('firebase/firestore');
const fs = require('node:fs');
(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-course-progress', firestore: {
    rules: fs.readFileSync(require('node:path').join(__dirname, 'firestore.rules'), 'utf8')
  } });
  try {
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    const guest = env.unauthenticatedContext().firestore();
    const path = 'courseUsers/alice/progress/code-type-handle-v1';
    const data = value => ({ value, updatedAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(alice, path), data('ABC')));
    await assertSucceeds(getDoc(doc(alice, path)));
    await assertFails(getDoc(doc(bob, path)));
    await assertFails(getDoc(doc(guest, path)));
    await assertFails(setDoc(doc(bob, path), data('XYZ')));
    await assertFails(setDoc(doc(guest, path), data('XYZ')));
    for (const value of ['abc', 'AB', 'ABCD', 'A1B']) await assertFails(setDoc(doc(alice, path), data(value)));
    await assertFails(setDoc(doc(alice, path), { ...data('ABC'), admin: true }));
    await assertFails(setDoc(doc(alice, 'courseUsers/alice/progress/secret'), data('ABC')));
    await assertFails(setDoc(doc(alice, path), { value: 'ABC', updatedAt: new Date(0) }));
    await assertSucceeds(setDoc(doc(alice, 'courseUsers/alice/progress/code-type-quest-progress-v1'), data('{"totalCorrect":1}')));
    console.log('PASS: owner read/write, other-user and guest isolation, handle/schema/key/timestamp validation');
  } finally { await env.cleanup(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
