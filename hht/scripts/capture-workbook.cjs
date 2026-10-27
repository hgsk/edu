/* Capture real local pages with numbered teaching overlays; never alter source files. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function option(name, fallback) {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  if (!args[at + 1] || args[at + 1].startsWith('--')) throw Error(`Missing value for ${name}`);
  return args[at + 1];
}
function local(relative) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw Error(`Outside course root: ${relative}`);
  return target;
}
const hash = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function main() {
  const configPath = option('--config', path.join(__dirname, 'workbook-targets.json'));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const only = option('--only', null);
  const figures = config.figures.filter(f => !only || f.id === only);
  if (!figures.length) throw Error(`Unknown figure: ${only}`);
  for (const f of figures) {
    if (!f.points.length || f.points.length > 3) throw Error(`${f.id}: use 1-3 targets`);
    if (!fs.existsSync(local(f.source))) throw Error(`${f.id}: missing source`);
    local(f.output);
  }
  const {chromium} = require('playwright');
  const reportPath = option('--report', local('assets/workbook/targets/captures.json'));
  const report = {method: 'Real page capture with DOM number overlays; source-reference diagrams labelled separately', config_sha256:hash(configPath), figures: [], sources: {}, cleanup: 'NOT RUN', status: 'FAIL'};
  report.sources['scripts/capture-workbook.cjs'] = hash(__filename);
  let server, browser;
  try {
    server = await chromium.launchServer({headless: true});
    const proc = server.process();
    report.process = {pid: proc.pid, executable: proc.spawnfile, startedAt: new Date().toISOString()};
    browser = await chromium.connect(server.wsEndpoint());
    const page = await browser.newPage();
    for (const figure of figures) {
      await page.setViewportSize({width: figure.width || 1100, height: figure.height || 850});
      const dependencies = [figure.source];
      if (figure.mode === 'source') {
        const lines = fs.readFileSync(local(figure.source), 'utf8').split(/\r?\n/);
        await page.setContent(`<html lang="ja"><meta charset="utf-8"><style>body{margin:0;padding:24px 50px;background:#f5f7fa;color:#192b36;font:18px/1.65 Consolas,Meiryo,monospace}h1{font:700 23px/1.5 Meiryo,sans-serif}p{font:16px Meiryo,sans-serif}.line{white-space:pre-wrap;overflow-wrap:anywhere}.num{display:inline-block;width:42px;color:#697984}pre{background:white;padding:24px;border:1px solid #b7c6cc;border-radius:8px}</style><h1>${escape(figure.source)}</h1><p>原本のコードから作った参照図です。エディターの操作画面ではありません。</p><pre>${lines.map((s, i) => `<div class="line" data-line="${i+1}"><span class="num">${i+1}</span>${escape(s) || ' '}</div>`).join('')}</pre></html>`);
      } else {
        await page.goto(pathToFileURL(local(figure.source)).href, {waitUntil: 'load', timeout: 15000});
        for (const ref of await page.locator('link[rel="stylesheet"], img[src]').evaluateAll(nodes => nodes.map(n => n.href || n.src))) {
          if (ref.startsWith('file:')) dependencies.push(decodeURIComponent(new URL(ref).pathname).replace(/^\/(\w:)/, '$1'));
        }
      }
      await page.evaluate(() => document.fonts.ready);
      const targets = [];
      for (let i=0; i<figure.points.length; i++) {
        const point = figure.points[i];
        const loc = page.locator(point.selector);
        if (await loc.count() !== 1) throw Error(`${figure.id}: target must match once: ${point.selector}`);
        const box = await loc.boundingBox();
        if (!box || box.width < 1 || box.height < 1) throw Error(`${figure.id}: invisible target ${point.selector}`);
        targets.push({...point, number: i+1, box});
      }
      const beforeText = await page.locator('body').innerText();
      await page.evaluate(points => {
        for (const p of points) {
          const width = document.documentElement.clientWidth;
          const left = Math.max(3, p.box.x + scrollX - 4);
          const top = Math.max(3, p.box.y + scrollY - 4);
          const right = Math.min(width - 3, p.box.x + p.box.width + 4);
          const pinX = p.box.width < 300 && p.box.x >= 50 ? p.box.x - 46 :
            p.box.width < 200 && p.box.x + p.box.width + 46 < width ? p.box.x + p.box.width + 8 :
            Math.max(3, Math.min(width - 46, p.box.x + p.box.width - 48));
          const rightOfNarrowTarget = p.box.width < 200 && p.box.x < 50 && p.box.x + p.box.width + 46 < width;
          const pinY = rightOfNarrowTarget ? p.box.y + Math.max(0, (p.box.height - 44) / 2) :
            p.box.height > 200 ? p.box.y + 12 : p.box.y >= 44 ? p.box.y - 42 : Math.max(4, p.box.y);
          const frame = document.createElement('div');
          frame.dataset.teachingOverlay = 'true';
          Object.assign(frame.style, {position:'absolute',left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${p.box.height + 8}px`,outline:'3px solid #b91f3c',borderRadius:'4px',boxSizing:'border-box',pointerEvents:'none',zIndex:2147483600});
          const number = document.createElement('span'); number.textContent = p.number;
          Object.assign(number.style, {position:'absolute',left:`${pinX-left}px`,top:`${pinY+scrollY-top}px`,width:'38px',height:'38px',border:'3px solid white',borderRadius:'50%',background:'#b91f3c',color:'white',font:'bold 25px/38px Arial',textAlign:'center',boxShadow:'0 1px 4px #666'});
          frame.append(number);document.body.append(frame);
        }
      }, targets);
      const output = local(figure.output);fs.mkdirSync(path.dirname(output), {recursive:true});
      let expectedCropHeight = null;
      if (figure.cropTargets) {
        const bounds = targets.map(p => p.box);
        for (const selector of figure.cropSelectors || []) {
          const loc = page.locator(selector);
          if (await loc.count() !== 1) throw Error(`${figure.id}: invalid crop context ${selector}`);
          const box = await loc.boundingBox();
          if (!box) throw Error(`${figure.id}: invisible crop context ${selector}`);
          bounds.push(box);
        }
        const pageHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, document.body.getBoundingClientRect().bottom + scrollY));
        const y = Math.max(0, Math.floor(Math.min(...bounds.map(p => p.y)) - 48));
        const bottom = Math.min(Math.max(pageHeight, ...bounds.map(p => p.y + p.height)), Math.ceil(Math.max(...bounds.map(p => p.y + p.height)) + 48));
        if (targets.some(p => p.box.y < y || p.box.y + p.box.height > bottom)) throw Error(`${figure.id}: crop hides a target`);
        expectedCropHeight = bottom-y;
        await page.screenshot({path:output, fullPage:true, clip:{x:0, y, width:figure.width || 1100, height:bottom-y}});
      }
      else if (figure.viewportOnly) await page.screenshot({path:output, fullPage:false});
      else await page.screenshot({path:output, fullPage:true});
      const png = fs.readFileSync(output);
      const size = [png.readUInt32BE(16), png.readUInt32BE(20)];
      if (expectedCropHeight !== null && size[1] !== expectedCropHeight) throw Error(`${figure.id}: screenshot clipped below requested crop`);
      await page.locator('[data-teaching-overlay]').evaluateAll(nodes => nodes.forEach(n => n.remove()));
      if (await page.locator('body').innerText() !== beforeText) throw Error(`${figure.id}: source text changed`);
      for (const dep of dependencies) {
        const filename = path.isAbsolute(dep) ? dep : local(dep);
        report.sources[path.relative(root, filename).split(path.sep).join('/')] = hash(filename);
      }
      report.figures.push({id:figure.id, source:figure.source, mode:figure.mode || 'page', output:figure.output, sha256:hash(output), size, targets});
      console.log(`CAPTURE PASS: ${figure.id} (${targets.length} targets)`);
    }
    report.status = 'PASS';
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
    if (report.process) {
      try {process.kill(report.process.pid, 0); report.cleanup = 'FAIL';}
      catch (e) {if (e.code === 'ESRCH') report.cleanup = 'PASS'; else throw e;}
    }
    fs.mkdirSync(path.dirname(reportPath), {recursive:true});
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2)+'\n');
    console.log(`CLEANUP ${report.cleanup}: pid=${report.process?.pid || 'none'}`);
  }
  if (report.cleanup !== 'PASS') throw Error('Capture browser still running');
}
main().catch(e => {console.error(e.message);process.exitCode=1;});
