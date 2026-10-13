#!/usr/bin/env node
// Local Git history + self-contained bundles. No server, npm package or credentials.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const fields = ['依頼', '質問', '変更した場所', '変更しなかった場所', '確認したこと', '未確認', 'バージョン', '確認URL'];
const roots = ['hht/starter-site', 'hht/portfolio', 'hht/practice-server/staging', 'hht/practice-server/production', 'hht/practice-server/backups'];
const secrets = [/-----BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY-----/, /\bghp_[A-Za-z0-9]{20,}\b/, /\bgithub_pat_[A-Za-z0-9_]{20,}\b/, /\bAKIA[0-9A-Z]{16}\b/, /(?:password|passwd|passphrase|パスワード)\s*[:：=]\s*[^\s<>{}\[\]]{4,}/i];
const sha = value => /^[0-9a-f]{40}$/.test(value);
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, value) => {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
};
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function ensure(condition, message) { if (!condition) throw new Error(message); }
function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', `core.hooksPath=${path.join(cwd, '.git', 'disabled-hooks')}`, '-c', 'commit.gpgSign=false', ...args], {
    cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' },
  });
  if (result.error || result.status !== 0) throw new Error(`Gitの処理に失敗: ${result.error?.message || result.stderr.trim()}`);
  return result.stdout.trim();
}
function within(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}
function validDestination(root, destination) {
  const resolved = fs.realpathSync(destination);
  ensure(fs.statSync(resolved).isDirectory(), '提出先は既存の共有フォルダーを指定してください。');
  ensure(!within(fs.realpathSync(root), resolved), '提出先は教材フォルダーの外にしてください。');
  return resolved;
}
function collect(root, relative, files = []) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) {
    // existsSync follows links; dangling links must not be silently ignored.
    try { fs.lstatSync(source); throw new Error(`リンクは禁止: ${relative}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return files;
  }
  const info = fs.lstatSync(source);
  ensure(!info.isSymbolicLink(), `リンクは禁止: ${relative}`);
  ensure(within(fs.realpathSync(root), fs.realpathSync(source)), `教材の外を指すパスは禁止: ${relative}`);
  ensure(!/^\.git$|^\.env(?:\.|$)|\.(?:pem|key|p12|pfx)$/i.test(path.basename(relative)), `秘密情報用ファイルは禁止: ${relative}`);
  if (info.isDirectory()) {
    for (const name of fs.readdirSync(source).sort()) collect(root, `${relative}/${name}`, files);
  } else {
    ensure(info.isFile(), `通常ファイル以外は禁止: ${relative}`);
    ensure(info.size <= 20 * 1024 * 1024, `20MBを超えるファイル: ${relative}`);
    if (/\.(?:md|html|css|txt|json|js|mjs|csv|ya?ml)$/i.test(relative)) {
      const text = fs.readFileSync(source, 'utf8');
      ensure(!secrets.some(pattern => pattern.test(text)), `秘密情報らしき内容を検出: ${relative}（内容は表示しません）`);
    }
    files.push(relative);
  }
  return files;
}
function selected(root, day) {
  return [...roots, `hht/submissions/day-${day}`].flatMap(relative => collect(root, relative));
}
function snapshot(root, repo, day, message, student) {
  const files = selected(root, day); // Validate everything before altering the private mirror.
  for (const entry of fs.readdirSync(repo)) if (entry !== '.git') fs.rmSync(path.join(repo, entry), { recursive: true, force: true });
  for (const relative of files) {
    const output = path.join(repo, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, relative), output);
  }
  git(repo, 'add', '--all');
  git(repo, '-c', `user.name=${student}`, '-c', `user.email=${student}@hht.invalid`, 'commit', '--allow-empty', '-m', message);
  return git(repo, 'rev-parse', 'HEAD');
}
function evidence(root, day) {
  const prefix = `hht/submissions/day-${day}`;
  const log = path.join(root, prefix, 'WORKLOG.md');
  ensure(fs.existsSync(log), `${prefix}/WORKLOG.mdを記入してください。`);
  const text = fs.readFileSync(log, 'utf8');
  for (const field of fields) {
    const value = text.match(new RegExp(`^\\s*-\\s*${field}\\s*[:：]\\s*(.*)$`, 'm'))?.[1]?.trim();
    ensure(value && !/TODO|TBD|ここに|未記入|<[^>]+>/i.test(value), `WORKLOGの「${field}」を記入してください。`);
  }
  ensure(collect(root, `${prefix}/screenshots`).some(file => /\.(png|jpe?g|webp)$/i.test(file) && fs.statSync(path.join(root, file)).size > 0), 'screenshotsに画像を保存してください。');
  ensure(collect(root, `${prefix}/evidence`).some(file => path.basename(file) !== '.gitkeep' && fs.statSync(path.join(root, file)).size > 0), 'evidenceに確認記録を保存してください。');
}
function transfer(root, config, manifestPath) {
  const destination = validDestination(root, config.destination);
  const manifest = readJSON(manifestPath);
  const bundle = path.join(path.dirname(manifestPath), manifest.bundle);
  ensure(digest(bundle) === manifest.sha256, '手元のbundleが破損しています。');
  const folder = path.join(destination, config.student);
  fs.mkdirSync(folder, { recursive: true });
  ensure(within(destination, fs.realpathSync(folder)), '提出先の学生フォルダーが共有先の外を指しています。');
  const bundleOut = path.join(folder, manifest.bundle);
  const manifestOut = path.join(folder, path.basename(manifestPath));
  if (fs.existsSync(bundleOut)) ensure(digest(bundleOut) === manifest.sha256, '同名の別bundleがあります。上書きしません。');
  else fs.copyFileSync(bundle, bundleOut, fs.constants.COPYFILE_EXCL);
  ensure(digest(bundleOut) === manifest.sha256, '転送後のチェックサムが一致しません。');
  // The manifest is the completion marker. Incomplete bundle copies are not submissions.
  if (fs.existsSync(manifestOut)) ensure(fs.readFileSync(manifestOut, 'utf8') === fs.readFileSync(manifestPath, 'utf8'), '同名の別提出記録があります。');
  else fs.copyFileSync(manifestPath, manifestOut, fs.constants.COPYFILE_EXCL);
  console.log(`転送完了: ${manifestOut}\n開始=${manifest.base}\n変更後=${manifest.head}\n講師の受領確認・レビューは別に必要です。`);
  return manifestOut;
}
function receive(manifestPath, output) {
  const manifest = readJSON(manifestPath);
  ensure(manifest.format === 1 && /^s[0-9]{3,8}$/.test(manifest.student) && /^(0[1-9]|1[0-5])$/.test(manifest.day), '提出記録の形式が不正です。');
  ensure(sha(manifest.base) && sha(manifest.head), 'コミットIDが不正です。');
  ensure(/^s[0-9]{3,8}-day-\d{2}-r\d+-[a-f0-9-]+\.bundle$/.test(manifest.bundle), 'bundle名が不正です。');
  const bundle = path.join(path.dirname(manifestPath), manifest.bundle);
  ensure(fs.statSync(bundle).size <= 512 * 1024 * 1024, 'bundleが512MBを超えています。');
  ensure(digest(bundle) === manifest.sha256, 'bundleのチェックサムが不一致です。受領しません。');
  ensure(!fs.existsSync(output), '受け取り先が既にあります。別の新しいフォルダーを指定してください。');
  fs.mkdirSync(output, { recursive: true });
  try {
    git(output, 'init', '--initial-branch=submission');
    git(output, 'bundle', 'verify', path.resolve(bundle));
    ensure(git(output, 'bundle', 'list-heads', path.resolve(bundle)) === `${manifest.head} refs/heads/submission`, 'bundleの提出ブランチが一致しません。');
    git(output, 'fetch', path.resolve(bundle), 'refs/heads/submission');
    git(output, 'merge-base', '--is-ancestor', manifest.base, manifest.head);
    for (const ref of [manifest.base, manifest.head]) {
      const entries = git(output, 'ls-tree', '-r', '-z', ref).split('\0').filter(Boolean);
      for (const entry of entries) {
        const [header, relative] = entry.split('\t');
        ensure(header.startsWith('100644 blob ') || header.startsWith('100755 blob '), '提出にリンクまたはsubmoduleが含まれています。');
        ensure(relative && !relative.includes('\\') && !relative.includes(':') && !relative.split('/').some(part => part === '..' || part === '.git') &&
          [...roots, `hht/submissions/day-${manifest.day}`].some(prefix => relative.startsWith(`${prefix}/`)), '提出対象外のファイルが含まれています。');
      }
    }
    git(output, 'reset', '--hard', manifest.head);
    fs.writeFileSync(path.join(output, 'REVIEW.diff'), git(output, 'diff', manifest.base, manifest.head, '--') + '\n');
    writeJSON(path.join(output, 'RECEIPT.json'), { ...manifest, receivedAt: new Date().toISOString() });
  } catch (error) {
    fs.rmSync(output, { recursive: true, force: true });
    throw error;
  }
  console.log(`受け取り検証完了: ${output}\nREVIEW.diffとWORKLOG・画面を確認してください。学生コードは実行していません。`);
}

export function run(argv, defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')) {
  const [command, ...raw] = argv;
  const options = {};
  for (let i = 0; i < raw.length; i += 2) {
    ensure(raw[i].startsWith('--') && raw[i + 1], '引数は --名前 値 の組で指定してください。');
    options[raw[i].slice(2)] = raw[i + 1];
  }
  const root = path.resolve(options.root || defaultRoot);
  if (command === 'receive') {
    ensure(options.manifest && options.output, 'receive --manifest 提出.json --output 新しい受取先');
    return receive(path.resolve(options.manifest), path.resolve(options.output));
  }
  const local = path.join(root, '.hht-submit');
  const configPath = path.join(local, 'config.json');
  if (command === 'setup') {
    ensure(/^s[0-9]{3,8}$/.test(options.student || ''), '提出番号はs001のようにs＋3〜8桁で指定してください。');
    ensure(options.destination, '既存の共有フォルダーのパスを指定してください。');
    const destination = validDestination(root, path.resolve(options.destination));
    git(root, '--version');
    fs.mkdirSync(local, { recursive: true });
    const old = fs.existsSync(configPath) ? readJSON(configPath) : {};
    ensure(!old.student || old.student === options.student, '履歴の取り違えを防ぐため提出番号は変更できません。');
    writeJSON(configPath, { ...old, student: options.student, destination, days: old.days || {} });
    console.log('設定完了。編集前に「HHT: 作業開始を記録」を実行してください。');
    return;
  }
  ensure(fs.existsSync(configPath), '先に「HHT: 提出先を設定」を実行してください。');
  const config = readJSON(configPath);
  if (command === 'send') {
    ensure(config.lastManifest, '再送できる提出物がありません。');
    return transfer(root, config, config.lastManifest);
  }
  const repo = path.join(local, 'repo');
  if (command === 'begin') {
    const day = (options.day || '').padStart(2, '0');
    ensure(/^(0[1-9]|1[0-5])$/.test(day), 'DAYは01〜15です。');
    if (!fs.existsSync(repo)) {
      fs.mkdirSync(repo);
      git(repo, 'init', '--initial-branch=submission');
    }
    if (!config.days[day]) config.days[day] = { base: snapshot(root, repo, day, `DAY ${day} start`, config.student), revision: 0 };
    config.activeDay = day;
    writeJSON(configPath, config);
    console.log(`DAY ${day} 開始=${config.days[day].base}\nこのIDをWORKLOGのバージョン欄に記録してください。再実行しても開始時点は上書きしません。`);
    return;
  }
  ensure(command === 'submit', 'コマンド: setup / begin / submit / send / receive');
  const day = config.activeDay;
  ensure(day && config.days[day], '編集前の開始記録がありません。「HHT: 作業開始を記録」が必要です。');
  evidence(root, day);
  const state = config.days[day];
  const head = snapshot(root, repo, day, `DAY ${day} submission r${state.revision + 1}`, config.student);
  const id = `${config.student}-day-${day}-r${state.revision + 1}-${crypto.randomUUID()}`;
  const outbox = path.join(local, 'outbox');
  fs.mkdirSync(outbox, { recursive: true });
  const bundle = path.join(outbox, `${id}.bundle`);
  git(repo, 'bundle', 'create', bundle, 'refs/heads/submission');
  const manifestPath = path.join(outbox, `${id}.json`);
  writeJSON(manifestPath, { format: 1, student: config.student, day, revision: state.revision + 1,
    base: state.base, head, bundle: path.basename(bundle), sha256: digest(bundle), createdAt: new Date().toISOString() });
  state.revision++;
  config.lastManifest = manifestPath;
  writeJSON(configPath, config);
  try { return transfer(root, config, manifestPath); }
  catch (error) { throw new Error(`${error.message}\n手元の提出物は保存済みです: ${manifestPath}\n接続を直して「HHT: 前回の提出を再送」を実行してください。`); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { run(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
