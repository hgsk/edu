import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'extra-items.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'audio-catalog.js'), 'utf8'), context);
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
vm.runInContext(source.slice(0, source.indexOf('const COURSES')) + '\nthis.items = ITEMS;', context);
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'audio/catalog.json'), 'utf8'));
test('all 200 questions have matching, nonempty audio assets', () => {
  assert.equal(context.items.length, 200);
  assert.equal(Object.keys(catalog).length, 200);
  const paths = new Set();
  for (const item of context.items) {
    const key = `${item.course}:${item.target}`;
    assert.equal(item.audio, catalog[key].src, key);
    assert.ok(catalog[key].text.length > 0, key);
    const data = fs.readFileSync(path.resolve(root, item.audio));
    assert.ok(data.length > 100, key);
    assert.equal(data.subarray(0, 4).toString('hex'), '1a45dfa3', key);
    paths.add(item.audio);
    if (item.course === 'words') assert.equal(catalog[key].text, item.reading, key);
  }
  assert.equal(paths.size, 200);
});
test('code audio explicitly names punctuation and spaces', () => {
  const text = catalog['symbols:color: #17233b;'].text;
  for (const word of ['コロン', 'スペース', 'ハッシュ', 'セミコロン']) assert.ok(text.includes(word), word);
  const html = catalog['html:<h1>'].text;
  assert.ok(html.includes('小なり'));
  assert.ok(html.includes('大なり'));
});
test('reordering questions preserves audio identities', () => {
  for (const item of [...context.items].reverse()) {
    assert.equal(item.audio, context.window.COURSE_AUDIO[`${item.course}:${item.target}`].src);
  }
});
test('recall audio reads the question without giving away the answer', () => {
  for (const item of context.items.filter(item => item.course === 'recall')) {
    assert.equal(catalog[`${item.course}:${item.target}`].text, item.prompt);
  }
});
test('Japanese parts use Aier and English parts keep Zira', () => {
  for (const entry of Object.values(catalog)) {
    assert.ok(entry.parts.length > 0);
    for (const part of entry.parts) {
      if (part.file.startsWith('aier-')) {
        assert.equal(part.voice, 'VOICEVOX:あいえるたん');
        assert.equal(entry.japaneseStyleId, 68);
      } else {
        assert.ok(part.file.startsWith('zira-'));
        assert.equal(part.voice, 'Microsoft Zira Desktop');
      }
    }
  }
  assert.ok(catalog['words:browser'].parts.every(part => part.voice === 'VOICEVOX:あいえるたん'));
  const mixed = catalog['symbols:color: #17233b;'].parts;
  assert.ok(mixed.some(part => part.voice === 'VOICEVOX:あいえるたん'));
  assert.ok(mixed.some(part => part.voice === 'Microsoft Zira Desktop'));
});
