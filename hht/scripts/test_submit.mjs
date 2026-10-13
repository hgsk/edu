import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { removeTree } from './submit.mjs';

const script = fileURLToPath(new URL('./submit.mjs', import.meta.url));
const fields = ['依頼', '質問', '変更した場所', '変更しなかった場所', '確認したこと', '未確認', 'バージョン', '確認URL'];
const trace = value => { if (process.env.HHT_SUBMIT_TRACE) fs.writeSync(1, `TRACE ${value}\n`); };
function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hht-submit-'));
  t.after(() => { trace('cleanup start'); removeTree(temp); trace('cleanup done'); });
  const root = path.join(temp, '教材 with spaces');
  const share = path.join(temp, 'LAN share');
  fs.mkdirSync(root); fs.mkdirSync(share);
  const write = (relative, text) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text);
  };
  const call = (...args) => {
    trace(`CLI ${args[0]} start`);
    const result = spawnSync(process.execPath, [script, ...args, '--root', root], { encoding: 'utf8' });
    trace(`CLI ${args[0]} done status=${result.status}`);
    return result;
  };
  const ok = (...args) => {
    const result = call(...args);
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  const failed = (...args) => {
    const result = call(...args);
    assert.notEqual(result.status, 0, result.stdout); return result.stderr;
  };
  write('hht/starter-site/index.html', '<h1>before</h1>');
  write('hht/starter-site/css/style.css', 'body { color: black; }');
  write('hht/instructor/answer.md', 'INSTRUCTOR_PRIVATE_DO_NOT_SHIP');
  const prepare = (day = '01') => {
    write(`hht/submissions/day-${day}/WORKLOG.md`, fields.map(field => `- ${field}: 実施記録（なしの項目も明記）`).join('\n'));
    write(`hht/submissions/day-${day}/screenshots/check.png`, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    write(`hht/submissions/day-${day}/evidence/report.md`, '確認した内容');
    write('hht/starter-site/index.html', '<h1>after</h1>');
  };
  const config = () => JSON.parse(fs.readFileSync(path.join(root, '.hht-submit/config.json')));
  const manifest = () => config().lastManifest;
  const receipt = () => path.join(share, 's001', path.basename(manifest()));
  const init = () => { ok('setup', '--student', 's001', '--destination', share); ok('begin', '--day', '01'); };
  return { temp, root, share, write, call, ok, failed, prepare, config, manifest, receipt, init };
}

test('complete submission transfers real Git history, CSS and evidence; instructor data excluded', t => {
  const f = fixture(t); f.init(); f.prepare(); f.ok('submit');
  const output = path.join(f.temp, 'review');
  f.ok('receive', '--manifest', f.receipt(), '--output', output);
  assert.equal(fs.readFileSync(path.join(output, 'hht/starter-site/index.html'), 'utf8'), '<h1>after</h1>');
  assert.ok(fs.existsSync(path.join(output, 'hht/starter-site/css/style.css')));
  assert.ok(fs.existsSync(path.join(output, 'hht/submissions/day-01/WORKLOG.md')));
  assert.ok(!fs.existsSync(path.join(output, 'hht/instructor')));
  const diff = fs.readFileSync(path.join(output, 'REVIEW.diff'), 'utf8');
  assert.match(diff, /-<h1>before<\/h1>/); assert.match(diff, /\+<h1>after<\/h1>/);
  const history = spawnSync('git', ['-C', output, 'log', '--all', '--format=%s'], { encoding: 'utf8' });
  assert.equal(history.status, 0); assert.match(history.stdout, /DAY 01 start/);
  assert.match(history.stdout, /submission r1/);
});

test('missing start or evidence fails without manufacturing observations', t => {
  const f = fixture(t);
  f.ok('setup', '--student', 's001', '--destination', f.share);
  assert.match(f.failed('submit'), /開始記録/);
  f.ok('begin', '--day', '01'); assert.match(f.failed('submit'), /WORKLOG/);
  f.prepare(); f.write('hht/submissions/day-01/WORKLOG.md', '- 依頼: TODO');
  assert.match(f.failed('submit'), /依頼/);
});

test('begin is immutable, resubmission gets a new revision, earlier submission preserved', t => {
  const f = fixture(t); f.init();
  const base = f.config().days['01'].base;
  f.prepare(); f.ok('begin', '--day', '01'); assert.equal(f.config().days['01'].base, base);
  f.ok('submit'); const first = f.receipt(); const before = fs.readFileSync(first);
  f.write('hht/starter-site/index.html', '<h1>revised</h1>'); f.ok('submit');
  assert.equal(f.config().days['01'].revision, 2);
  assert.deepEqual(fs.readFileSync(first), before);
  assert.equal(JSON.parse(fs.readFileSync(f.receipt())).base, base);
});

test('network failure retains outbox; retry sends identical revision idempotently', t => {
  const f = fixture(t); f.init(); f.prepare(); removeTree(f.share);
  assert.match(f.failed('submit'), /手元の提出物は保存済み/);
  const original = f.manifest(); assert.ok(fs.existsSync(original));
  fs.mkdirSync(f.share); f.ok('send'); f.ok('send');
  assert.equal(f.manifest(), original); assert.equal(f.config().days['01'].revision, 1);
});

test('secrets and links fail before creating submission commits', t => {
  const f = fixture(t); f.init(); f.prepare();
  f.write('hht/submissions/day-01/evidence/secret.md', 'password: hunter2');
  const error = f.failed('submit'); assert.match(error, /秘密情報/); assert.doesNotMatch(error, /hunter2/);
  assert.equal(f.config().days['01'].revision, 0);
  removeTree(path.join(f.root, 'hht/submissions/day-01/evidence/secret.md'));
  fs.symlinkSync(path.join(f.root, 'hht/instructor/answer.md'), path.join(f.root, 'hht/starter-site/leak.md'));
  assert.match(f.failed('submit'), /リンクは禁止/);
});

test('corrupt bundles, path traversal and existing review destinations are rejected', t => {
  const f = fixture(t); f.init(); f.prepare(); f.ok('submit');
  const manifest = JSON.parse(fs.readFileSync(f.receipt()));
  const bundle = path.join(path.dirname(f.receipt()), manifest.bundle);
  const occupied = path.join(f.temp, 'occupied'); fs.mkdirSync(occupied);
  fs.writeFileSync(path.join(occupied, 'keep.txt'), 'keep');
  assert.match(f.failed('receive', '--manifest', f.receipt(), '--output', occupied), /既にあります/);
  assert.equal(fs.readFileSync(path.join(occupied, 'keep.txt'), 'utf8'), 'keep');
  fs.appendFileSync(bundle, 'CORRUPT');
  const output = path.join(f.temp, 'review');
  assert.match(f.failed('receive', '--manifest', f.receipt(), '--output', output), /チェックサム/);
  assert.ok(!fs.existsSync(output));
  manifest.bundle = '../outside.bundle'; fs.writeFileSync(f.receipt(), JSON.stringify(manifest));
  assert.match(f.failed('receive', '--manifest', f.receipt(), '--output', output), /bundle名/);
});

test('root Git staging and hooks are untouched; student hooks are never executed', t => {
  const f = fixture(t);
  assert.equal(spawnSync('git', ['init', f.root]).status, 0);
  f.write('teacher-change.md', 'keep staged');
  assert.equal(spawnSync('git', ['-C', f.root, 'add', 'teacher-change.md']).status, 0);
  f.init(); f.prepare();
  const hook = path.join(f.root, '.hht-submit/repo/.git/hooks/pre-commit');
  fs.writeFileSync(hook, '#!/bin/sh\nexit 77\n', { mode: 0o755 });
  f.ok('submit');
  const staged = spawnSync('git', ['-C', f.root, 'diff', '--cached', '--name-only'], { encoding: 'utf8' });
  assert.equal(staged.stdout.trim(), 'teacher-change.md');
});

test('receiver rejects a forged Git bundle with files outside the submission scope', t => {
  const f = fixture(t); f.init(); f.prepare(); f.ok('submit');
  const repo = path.join(f.root, '.hht-submit/repo');
  const unexpected = path.join(repo, 'hht/scripts/evil.mjs');
  fs.mkdirSync(path.dirname(unexpected), { recursive: true });
  fs.writeFileSync(unexpected, 'throw new Error("MUST_NOT_EXECUTE");');
  const cmd = (...args) => {
    const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  cmd('add', '--all'); cmd('-c', 'user.name=student', '-c', 'user.email=s001@hht.invalid', 'commit', '-m', 'forge');
  const manifest = JSON.parse(fs.readFileSync(f.receipt()));
  const bundle = path.join(path.dirname(f.receipt()), manifest.bundle);
  removeTree(bundle); cmd('bundle', 'create', bundle, 'refs/heads/submission');
  manifest.head = cmd('rev-parse', 'HEAD');
  manifest.sha256 = crypto.createHash('sha256').update(fs.readFileSync(bundle)).digest('hex');
  fs.writeFileSync(f.receipt(), JSON.stringify(manifest));
  const output = path.join(f.temp, 'forged-review');
  assert.match(f.failed('receive', '--manifest', f.receipt(), '--output', output), /対象外/);
  assert.ok(!fs.existsSync(output));
});

test('two students sharing a destination do not overwrite each other', t => {
  const f = fixture(t); f.init(); f.prepare(); f.ok('submit');
  const other = path.join(f.temp, 'other'); fs.mkdirSync(other);
  fs.cpSync(path.join(f.root, 'hht'), path.join(other, 'hht'), { recursive: true });
  for (const args of [['setup', '--student', 's002', '--destination', f.share], ['begin', '--day', '15']]) {
    const result = spawnSync(process.execPath, [script, ...args, '--root', other], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  for (const [name, data] of [
    ['WORKLOG.md', fields.map(field => `- ${field}: 確認記録`).join('\n')],
    ['screenshots/check.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    ['evidence/report.md', '確認記録'],
  ]) {
    const file = path.join(other, 'hht/submissions/day-15', name);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data);
  }
  const submitted = spawnSync(process.execPath, [script, 'submit', '--root', other], { encoding: 'utf8' });
  assert.equal(submitted.status, 0, submitted.stderr);
  assert.ok(fs.readdirSync(path.join(f.share, 's002')).some(name => name.endsWith('.json')));
  assert.ok(fs.existsSync(f.receipt()));
  assert.ok(!fs.existsSync(path.join(other, '.hht-submit/repo/hht/instructor')));
});

test('all 15 days retain separate start commits and revision counters', t => {
  const f = fixture(t); f.ok('setup', '--student', 's001', '--destination', f.share);
  for (let n = 1; n <= 15; n++) {
    const day = String(n).padStart(2, '0');
    f.ok('begin', '--day', day); f.prepare(day); f.ok('submit');
    f.ok('receive', '--manifest', f.receipt(), '--output', path.join(f.temp, `review-${day}`));
    assert.equal(f.config().days[day].revision, 1);
  }
});
