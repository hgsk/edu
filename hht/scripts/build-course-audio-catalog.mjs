import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(root, 'typing-app');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(path.join(appRoot, 'extra-items.js'), 'utf8'), context);
const source = readFileSync(path.join(appRoot, 'app.js'), 'utf8');
vm.runInContext(source.slice(0, source.indexOf('ITEMS.forEach')) + '\nthis.items = ITEMS;', context);
const symbols = {
  ' ': 'スペース', '<': '小なり', '>': '大なり', '{': '開き波かっこ', '}': '閉じ波かっこ',
  '(': '開き丸かっこ', ')': '閉じ丸かっこ', '[': '開き角かっこ', ']': '閉じ角かっこ',
  ':': 'コロン', ';': 'セミコロン', '.': 'ドット', '#': 'ハッシュ',
  '"': 'ダブルクォーテーション', "'": 'シングルクォーテーション', '=': 'イコール',
  '-': 'ハイフン', '_': 'アンダースコア', '%': 'パーセント', '/': 'スラッシュ',
  '\\': 'バックスラッシュ', '@': 'アットマーク', '+': 'プラス', '!': '感嘆符',
  '?': '疑問符', '&': 'アンパサンド', '*': 'アスタリスク', '`': 'バッククォート',
  '~': 'チルダ', '|': 'パイプ', '$': 'ドル', '^': 'キャレット'
};
const catalog = {};
for (const item of context.items) {
  const key = `${item.course}:${item.target}`;
  if (catalog[key]) throw Error(`Duplicate audio key: ${key}`);
  const verbal = ['words', 'sentences', 'recall'].includes(item.course);
  const pronunciation = item.course === 'recall' ? item.prompt : item.reading;
  if (item.course === 'words' && !item.reading) throw Error(`Missing pronunciation: ${key}`);
  const tokens = verbal ? [pronunciation ?? item.target] : item.target.match(/[A-Za-z]+|[0-9]+|[^A-Za-z0-9]/gu);
  const text = tokens.map(token => symbols[token] ?? token).join('、');
  const parts = [];
  for (const token of tokens) {
    const japanese = verbal ? Boolean(pronunciation) : !/^[A-Za-z]+$/.test(token);
    const voice = japanese ? 'VOICEVOX:あいえるたん' : 'Microsoft Zira Desktop';
    const value = symbols[token] ?? token;
    if (parts.at(-1)?.voice === voice) parts.at(-1).text += (japanese ? '、' : ' ') + value;
    else parts.push({ voice, text: value });
  }
  const hasJapanese = parts.some(part => part.voice === 'VOICEVOX:あいえるたん');
  const hash = createHash('sha256').update(key + '\n' + text + (hasJapanese ? '\nvoicevox-aier-68-v1' : '')).digest('hex').slice(0, 16);
  for (const part of parts) {
    const prefix = part.voice === 'VOICEVOX:あいえるたん' ? 'aier' : 'zira';
    part.file = `${prefix}-${createHash('sha256').update(part.text).digest('hex').slice(0, 16)}.wav`;
  }
  catalog[key] = {
    src: `./audio/course-${hash}.webm`, text, parts,
    japaneseStyleId: hasJapanese ? 68 : null
  };
}
if (Object.keys(catalog).length !== 200) throw Error('Expected 200 audio entries');
writeFileSync(path.join(appRoot, 'audio', 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
const runtime = Object.fromEntries(Object.entries(catalog).map(([key, { src, text }]) => [key, { src, text }]));
if (process.argv.includes('--publish')) {
  for (const entry of Object.values(catalog)) {
    const data = readFileSync(path.resolve(appRoot, entry.src));
    if (data.length < 100 || data.subarray(0, 4).toString('hex') !== '1a45dfa3') throw Error(`Missing or invalid audio: ${entry.src}`);
  }
  writeFileSync(path.join(appRoot, 'audio-catalog.js'), 'window.COURSE_AUDIO = ' + JSON.stringify(runtime, null, 2) + ';\n');
}
console.log(`AUDIO CATALOG: ${Object.keys(catalog).length} entries`);
