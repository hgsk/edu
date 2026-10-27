// Real WebGL runtime gate. The HTTP server and browser belong to this run only.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const directory = path.resolve(process.env.UNITY_WEBGL_DIRECTORY || path.join(root, 'unity/webgl'));
const output = path.join(root, 'hht/assets/unity');
const report = { status: 'FAIL', scenes: [], interactions: [], errors: [], fontWarnings: [], cleanup: 'NOT RUN' };
let server, browser, processHandle, browserServer;
(async () => {
  try {
    const catalog = JSON.parse(await fs.readFile(path.join(directory, 'catalog.json'), 'utf8'));
    assert.equal(catalog.scenes.length, 72);
    server = http.createServer(async (req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.resolve(directory, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
        if (!file.startsWith(directory + path.sep)) { res.writeHead(403).end(); return; }
        const data = await fs.readFile(file);
        res.setHeader('Content-Type', { '.wasm': 'application/wasm', '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store'); res.end(data);
      } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    report.server = { port: server.address().port, host: '127.0.0.1' };
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    browserServer = await chromium.launchServer({ headless: true, args: ['--enable-webgl', '--enable-unsafe-swiftshader'] });
    processHandle = browserServer.process(); report.browserPid = processHandle.pid;
    browser = await chromium.connect(browserServer.wsEndpoint());
    const page = await browser.newPage({ viewport: { width: 1000, height: 820 } });
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', message => {
      if (/character.*(?:not found|missing)|missing.*glyph|glyph.*missing|Unicode value.*not found/i.test(message.text())) report.fontWarnings.push(message.text());
    });
    // Observe actual PCM at the browser's destination, without duplicating audible output.
    await page.addInitScript(() => {
      const original = AudioNode.prototype.connect;
      const tapped = new WeakMap(); window.__courseAudioMeters = [];
      AudioNode.prototype.connect = function(destination, ...args) {
        const result = original.call(this, destination, ...args);
        if (destination instanceof AudioDestinationNode) {
          let meter=tapped.get(this);
          if(!meter){meter=this.context.createAnalyser();meter.fftSize=2048;tapped.set(this,meter);window.__courseAudioMeters.push({context:this.context,meter});}
          // Unity disconnects/reconnects channel outputs when configuring playback.
          original.call(this,meter);
        }
        return result;
      };
      window.courseAudioRms = () => Math.max(0,...window.__courseAudioMeters.map(({meter})=>{
        const values=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(values);
        return Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length);
      }));
    });
    await page.goto(`http://127.0.0.1:${report.server.port}/?unit=28&variant=complete`);
    await page.waitForFunction(() => window.courseSnapshot?.key === '28-complete', null, { timeout: 120000 });
    async function load(key) {
      const [unit, variant] = key.split('-');
      await page.selectOption('#unit', unit); await page.selectOption('#variant', variant);
      await page.click('#load');
      await page.waitForFunction(k => window.courseSnapshot?.key === k && window.courseSnapshot.ready, key, { timeout: 15000 });
      const s = await page.evaluate(() => window.courseSnapshot);
      assert.equal(s.graphics, 'OpenGLES3', 'WebGL2 runtime expected');
      return s;
    }
    for (const entry of catalog.scenes) {
      const snapshot = await load(entry.key);
      assert.equal(snapshot.scene, path.basename(entry.path, '.unity'));
      assert.ok(snapshot.objects.some(object => object.id === 'F'), 'Floor identifier required');
      assert.equal(new Set(snapshot.objects.map(object => object.hex)).size, snapshot.objects.length, 'All visible roles need distinct colors');
      if (Number(entry.key.slice(0, 2)) >= 25 && Number(entry.key.slice(0, 2)) <= 27) {
        const complete = entry.key.endsWith('complete');
        const a = snapshot.objects.find(o => o.id === 'A');
        const d = snapshot.objects.find(o => o.id === 'D');
        assert.ok(a && a.hex === '#246C96');
        assert.ok(Math.abs(a.x - (complete ? -1.4 : 0)) < .01);
        if (complete || entry.key.startsWith('27-')) {
          assert.ok(d && d.hex === '#E6DBF5');
          assert.ok(Math.abs(d.x - (complete ? 1.4 : .35)) < .01);
        } else assert.equal(d, undefined);
      }
      if (entry.key.startsWith('28-')) {
        assert.equal(snapshot.safety.attached, true);
        assert.equal(snapshot.safety.valid, entry.key.endsWith('complete'));
        assert.equal(snapshot.safety.enabled, entry.key.endsWith('complete'));
        assert.equal(snapshot.objects.find(o => o.id === 'D').hex, '#E6DBF5');
      }
      report.scenes.push({ key: entry.key, scene: snapshot.scene, status: 'PASS' });
    }
    async function flowClick(action) {
      const state = await page.evaluate(() => window.courseSnapshot.loop);
      const button = state.buttons.find(button => button.action === action);
      assert.ok(button, 'Flow button exists: ' + action);
      const bounds = await page.locator('canvas').boundingBox();
      await page.mouse.click(bounds.x + bounds.width * button.x, bounds.y + bounds.height * button.y);
    }
    async function flowWait(predicate, arg) {
      await page.waitForFunction(predicate, arg, { timeout: 10000 });
      return await page.evaluate(() => window.courseSnapshot.loop);
    }
    await load('24-start');
    await flowWait(() => window.courseSnapshot.loop?.phase === 'Title');
    await flowClick('start'); await flowWait(() => window.courseSnapshot.loop?.phase === 'Playing');
    await flowClick('collect'); let before = await flowWait(() => window.courseSnapshot.loop?.score === 1);
    await flowClick('reload');
    let state = await flowWait(id => window.courseSnapshot.loop?.sceneInstance !== id && window.courseSnapshot.loop?.phase === 'Title', before.sceneInstance);
    assert.equal(state.score, 0, 'Start sample reproduces reset');
    await load('24-complete'); await flowClick('start');
    await flowWait(() => window.courseSnapshot.loop?.phase === 'Playing');
    for (let score = 1; score <= 2; score++) { await flowClick('collect'); await flowWait(n => window.courseSnapshot.loop?.score === n, score); }
    before = await page.evaluate(() => window.courseSnapshot.loop);
    await flowClick('reload');
    state = await flowWait(id => window.courseSnapshot.loop?.sceneInstance !== id && window.courseSnapshot.loop?.score === 2, before.sceneInstance);
    assert.equal(state.roots, 1); assert.equal(state.phase, 'Playing');
    await flowClick('collect'); await flowWait(() => window.courseSnapshot.loop?.score === 3);
    await flowClick('finish'); state = await flowWait(() => window.courseSnapshot.loop?.saveStatus === 'SAVED v2');
    assert.equal(state.best, 3); assert.equal(state.runs, 1); assert.equal(state.pending, 0);
    const revision = state.saveRevision;
    await flowClick('save'); state = await flowWait(n => window.courseSnapshot.loop?.saveRevision > n, revision);
    assert.equal(state.runs, 1, 'Repeated save must not duplicate completed runs');
    await page.screenshot({ path: path.join(output, '24-webgl-result.png') });
    await flowClick('retry'); state = await flowWait(() => window.courseSnapshot.loop?.phase === 'Playing' && window.courseSnapshot.loop?.score === 0);
    assert.equal(state.best, 3);
    await page.reload();
    await page.waitForFunction(() => window.courseSnapshot?.key === '24-complete' && window.courseSnapshot.loop?.phase === 'Title', null, { timeout: 120000 });
    state = await page.evaluate(() => window.courseSnapshot.loop);
    assert.equal(state.score, 0); assert.equal(state.best, 3); assert.equal(state.runs, 1); assert.equal(state.roots, 1);
    report.loop = { startReset: 'PASS', sceneReloadRetainsScore: 'PASS', singleOwner: 'PASS', retryReset: 'PASS', duplicateSave: 'PASS', indexedDBAfterGameRestart: 'PASS' };
    async function safetyClick(action) {
      const state = await page.evaluate(() => window.courseSnapshot.safety);
      const button = state.buttons.find(button => button.action === action);
      assert.ok(button); const bounds = await page.locator('canvas').boundingBox();
      await page.mouse.click(bounds.x + bounds.width * button.x, bounds.y + bounds.height * button.y);
    }
    await load('28-start');
    assert.equal(await page.evaluate(() => window.courseSnapshot.safety.valid), false);
    await safetyClick('restore');
    await page.waitForFunction(() => window.courseSnapshot.safety?.valid && window.courseSnapshot.safety.enabled);
    await page.waitForFunction(() => window.courseSnapshot.objects.find(o => o.id === 'A').x > -1.2);
    await safetyClick('clear');
    await page.waitForFunction(() => !window.courseSnapshot.safety?.valid && !window.courseSnapshot.safety?.enabled);
    const stopped = await page.evaluate(() => window.courseSnapshot.objects.find(o => o.id === 'A').x);
    await page.waitForTimeout(700);
    assert.ok(Math.abs(await page.evaluate(() => window.courseSnapshot.objects.find(o => o.id === 'A').x) - stopped) < .03);
    await safetyClick('restore');
    await page.waitForFunction(() => window.courseSnapshot.safety?.valid);
    await load('28-complete');
    assert.equal(await page.evaluate(() => window.courseSnapshot.safety.target), 'ExhibitRight');
    await page.screenshot({path:path.join(output,'28-webgl-ready.png')});
    report.dependencies = { missingReferenceBlocks:'PASS', explicitRestore:'PASS', clearStopsMovement:'PASS', completedWiring:'PASS' };
    async function sandboxClick(action) {
      const state=await page.evaluate(()=>window.courseSnapshot.sandbox);
      const b=state.buttons.find(b=>b.action===action), rect=await page.locator('canvas').boundingBox();
      assert.ok(b);await page.mouse.click(rect.x+rect.width*b.x,rect.y+rect.height*b.y);
    }
    await load('29-start');assert.equal(await page.evaluate(()=>window.courseSnapshot.sandbox.running),false);
    await load('29-complete');
    await sandboxClick('drop');await page.waitForFunction(()=>window.courseSnapshot.sandbox?.running && window.courseSnapshot.sandbox.moved>=1,null,{timeout:15000});
    const physicsResult=await page.evaluate(()=>window.courseSnapshot.sandbox);assert.ok(physicsResult.ballY<2.5);
    await page.screenshot({path:path.join(output,'29-webgl-result.png')});
    await sandboxClick('drop');assert.equal(await page.evaluate(()=>window.courseSnapshot.objects.filter(o=>o.id==='A').length),1);
    await sandboxClick('reset');await page.waitForFunction(()=>!window.courseSnapshot.sandbox.running && window.courseSnapshot.sandbox.moved===0 && window.courseSnapshot.sandbox.speed<.01 && Math.abs(window.courseSnapshot.sandbox.ballY-3)<.01);
    await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.courseSnapshot.sandbox.moved),0);
    await sandboxClick('tilt');await sandboxClick('bounce');
    await page.waitForFunction(()=>window.courseSnapshot.sandbox.steep && window.courseSnapshot.sandbox.highBounce && Math.abs(window.courseSnapshot.sandbox.angle-30)<.01 && Math.abs(window.courseSnapshot.sandbox.restitution-.8)<.01);
    await sandboxClick('drop');await page.waitForFunction(()=>window.courseSnapshot.sandbox.running && window.courseSnapshot.sandbox.ballY<2.5);
    await sandboxClick('tilt');assert.equal(await page.evaluate(()=>window.courseSnapshot.sandbox.steep),true);
    await sandboxClick('reset');await page.waitForFunction(()=>!window.courseSnapshot.sandbox.running && window.courseSnapshot.sandbox.moved===0);
    report.sandbox={gravityAndCollision:'PASS',blocksMoved:physicsResult.moved,resetPositionsAndMotion:'PASS',boundedRepeatedDrop:'PASS',tiltAndBounceControls:'PASS',editBlockedDuringSimulation:'PASS'};

    async function spatialClick(action){const state=await page.evaluate(()=>window.courseSnapshot.spatial);const b=state.buttons.find(b=>b.action===action),rect=await page.locator('canvas').boundingBox();assert.ok(b);await page.mouse.click(rect.x+rect.width*b.x,rect.y+rect.height*b.y);}
    async function advance(){for(let i=0;i<14;i++)await spatialClick('forward');}
    await load('30-start');await advance();await page.waitForFunction(()=>window.courseSnapshot.spatial.last==='BLOCKED');
    const narrow=await page.evaluate(()=>window.courseSnapshot.spatial);assert.equal(narrow.reached,false);assert.ok(narrow.z<-.8);
    await load('30-complete');await advance();await page.waitForFunction(()=>window.courseSnapshot.spatial.reached);await page.screenshot({path:path.join(output,'30-webgl-goal.png')});
    await spatialClick('reset');await page.waitForFunction(()=>Math.abs(window.courseSnapshot.spatial.z+3.4)<.01 && !window.courseSnapshot.spatial.reached);
    await load('31-start');assert.equal(await page.evaluate(()=>window.courseSnapshot.spatial.kitParts),0);await spatialClick('skin');await page.waitForFunction(()=>window.courseSnapshot.spatial.last==='NO KIT IN START');
    await load('31-complete');assert.equal(await page.evaluate(()=>window.courseSnapshot.spatial.kitParts),4);await advance();await page.waitForFunction(()=>window.courseSnapshot.spatial.reached);
    await spatialClick('reset');await spatialClick('skin');await page.waitForFunction(()=>!window.courseSnapshot.spatial.kitVisible && window.courseSnapshot.spatial.kitParts===0);await advance();await page.waitForFunction(()=>window.courseSnapshot.spatial.reached);
    await spatialClick('reset');await spatialClick('skin');await page.waitForFunction(()=>window.courseSnapshot.spatial.kitVisible && window.courseSnapshot.spatial.kitParts===4);await page.screenshot({path:path.join(output,'31-webgl-kit.png')});
    report.spatial={narrowOpeningBlocks:'PASS',wideOpeningPasses:'PASS',reset:'PASS',kitStartEmpty:'PASS',fourKitMeshes:'PASS',kitVisibleAndHiddenPassage:'PASS'};
    report.shaderGraph = [];
    for (const [variant, hex] of [['start', '#246C96'], ['complete', '#C67B00']]) {
      const snapshot = await load('23-' + variant);
      assert.equal(snapshot.objects.find(object => object.id === 'A').hex, hex);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(output, `23-webgl-${variant}.png`) });
      report.shaderGraph.push({ variant, hex, status: 'PASS (runtime data); render captured for visual review' });
    }
    const session = await page.context().newCDPSession(page);
    report.visionChecks = [];
    await load('09-complete');
    for (const type of ['none', 'achromatopsia', 'deuteranopia', 'protanopia']) {
      await session.send('Emulation.setEmulatedVisionDeficiency', { type });
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(output, `palette-${type}.png`) });
      report.visionChecks.push({ type, status: 'CAPTURED', scene: '09-complete' });
    }
    await load('29-complete');
    for(const type of ['achromatopsia','deuteranopia','protanopia']){await session.send('Emulation.setEmulatedVisionDeficiency',{type});await page.waitForTimeout(350);await page.screenshot({path:path.join(output,`29-palette-${type}.png`)});report.visionChecks.push({type,status:'CAPTURED',scene:'29-complete'});}
    await load('31-complete');
    for(const type of ['achromatopsia','deuteranopia','protanopia']){await session.send('Emulation.setEmulatedVisionDeficiency',{type});await page.waitForTimeout(350);await page.screenshot({path:path.join(output,`31-palette-${type}.png`)});report.visionChecks.push({type,status:'CAPTURED',scene:'31-complete'});}
    await load('07-complete');
    await session.send('Emulation.setEmulatedVisionDeficiency', { type: 'achromatopsia' });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(output, 'palette-prefab-achromatopsia.png') });
    await session.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' });
    const input = await load('06-complete');
    await page.locator('canvas').click({ position: { x: 800, y: 400 } });
    await page.keyboard.down('d'); await page.waitForTimeout(700); await page.keyboard.up('d');
    await page.waitForTimeout(350);
    const moved = await page.evaluate(() => window.courseSnapshot.x);
    assert.ok(moved > input.x + .2, 'D held must move Exhibit');
    await page.waitForTimeout(500);
    assert.ok(Math.abs(await page.evaluate(() => window.courseSnapshot.x) - moved) < .05, 'Release must stop movement');
    report.interactions.push({ name: 'D hold and release', status: 'PASS' });
    for (const key of ['16-complete', '18-complete']) {
      await load(key); await page.waitForTimeout(500);
      const s = await page.evaluate(() => window.courseSnapshot), bounds = await page.locator('canvas').boundingBox();
      await page.mouse.click(bounds.x + bounds.width * s.buttonX, bounds.y + bounds.height * s.buttonY);
      await page.waitForFunction(() => window.courseSnapshot.label === 'ようこそ！', null, { timeout: 5000 });
      report.interactions.push({ name: key + ' real Start click', status: 'PASS' });
    }
    console.log('PASS: all 72 scene variants loaded');
    await page.screenshot({ path: path.join(output, 'webgl-runtime.png') });
    async function vrmClick(action) {
      await page.waitForFunction(()=>window.courseSnapshot?.vrm?.buttons?.length===5);
      const state=await page.evaluate(()=>window.courseSnapshot.vrm);
      const button=state.buttons.find(b=>b.action===action);assert.ok(button);
      const bounds=await page.locator('canvas').boundingBox();
      await page.mouse.click(bounds.x+bounds.width*button.x,bounds.y+bounds.height*button.y);
      await page.waitForTimeout(350);
    }
    await load('32-start');await page.waitForFunction(()=>window.courseSnapshot?.vrm?.callbacks>3);
    let rig=await page.evaluate(()=>window.courseSnapshot.vrm);
    assert.equal(rig.humanoid,true);assert.equal(rig.weight,0);assert.equal(rig.skinnedMeshes,2);assert.ok(rig.boneCount>50);assert.ok(rig.footY>-.1 && rig.footY<.4);
    const fkDistance=rig.distance;assert.ok(fkDistance>.12);
    await vrmClick('ik');await page.waitForFunction(()=>window.courseSnapshot.vrm.weight===1 && window.courseSnapshot.vrm.distance<.06);
    const ikDistance=await page.evaluate(()=>window.courseSnapshot.vrm.distance);
    await vrmClick('target');await page.waitForFunction(()=>window.courseSnapshot.vrm.distance<.06);
    await vrmClick('bones');assert.equal(await page.evaluate(()=>window.courseSnapshot.vrm.bonesVisible),false);
    await vrmClick('pose');const poseA=await page.evaluate(()=>window.courseSnapshot.vrm);const phaseA=poseA.phase;
    await vrmClick('pose');const poseB=await page.evaluate(()=>window.courseSnapshot.vrm);const phaseB=poseB.phase;assert.ok(Math.abs(phaseA-phaseB)>.4);assert.ok(Math.hypot(poseA.leftHandY-poseB.leftHandY,poseA.leftHandZ-poseB.leftHandZ)>.03);
    await vrmClick('play');await page.waitForTimeout(500);assert.ok(Math.abs(await page.evaluate(()=>window.courseSnapshot.vrm.phase)-phaseB)>.1);
    await load('32-complete');await page.waitForFunction(()=>window.courseSnapshot?.vrm?.weight===1 && window.courseSnapshot.vrm.distance<.06);
    await page.screenshot({path:path.join(output,'32-webgl.png')});
    report.interactions.push({name:'VRoid Humanoid: FK/IK, moving target, bones and motion controls',status:'PASS',fkDistance,ikDistance});
    async function audioClick(field, action) {
      await page.waitForFunction(f=>window.courseSnapshot?.[f]?.buttons?.length>0,field);
      const b=await page.evaluate(([f,a])=>window.courseSnapshot[f].buttons.find(b=>b.action===a),[field,action]);
      assert.ok(b,action);const rect=await page.locator('canvas').boundingBox();
      await page.mouse.click(rect.x+rect.width*b.x,rect.y+rect.height*b.y);await page.waitForTimeout(180);
    }
    async function audioLevel(ms=450){
      return page.evaluate(async duration=>{const samples=[];const end=performance.now()+duration;
        while(performance.now()<end){samples.push(window.courseAudioRms());await new Promise(r=>setTimeout(r,25));}
        return {mean:samples.reduce((a,b)=>a+b,0)/samples.length,peak:Math.max(...samples)};
      },ms);
    }
    console.log('Checking real browser audio output');
    await load('33-start');await audioClick('sound','play');await audioClick('sound','solo');
    await page.waitForFunction(()=>window.courseSnapshot.sound.ambiencePlaying && window.courseAudioRms()>.0001);
    const flatNear=await audioLevel();await audioClick('sound','distance');const flatFar=await audioLevel();
    assert.ok(flatFar.mean/flatNear.mean>.8 && flatFar.mean/flatNear.mean<1.2);
    await audioClick('sound','play');assert.ok((await audioLevel()).peak<.00001);
    await load('33-complete');await audioClick('sound','play');await audioClick('sound','solo');
    assert.equal(await page.evaluate(()=>window.courseSnapshot.sound.blend),1);
    const spatialNear=await audioLevel();await audioClick('sound','distance');const spatialFar=await audioLevel();
    assert.ok(spatialNear.mean>.0001);assert.ok(spatialFar.mean/spatialNear.mean<.6);
    await audioClick('sound','music');await page.waitForFunction(()=>window.courseSnapshot.sound.musicDb===-12);
    await audioClick('sound','master');await page.waitForFunction(()=>window.courseSnapshot.sound.masterDb===-80);
    const muted=await audioLevel();assert.ok(muted.peak<.00001);
    await audioClick('sound','master');assert.ok((await audioLevel()).mean>.0001);
    await audioClick('sound','play');await audioClick('sound','cue');
    await page.waitForFunction(()=>window.courseSnapshot.sound.cues===1);const cueOutput=await audioLevel(250);assert.ok(cueOutput.peak>.0001);
    await page.waitForTimeout(1200);assert.ok((await audioLevel()).peak<.00001);
    report.sound={status:'PASS',measurement:'Web Audio destination PCM RMS',flatNear,flatFar,spatialNear,spatialFar,muted,cueOutput,musicGainDb:-12};
    await audioClick('sound','master'); // A different unit must not inherit an inaccessible mute.
    await load('34-start');await audioClick('foley','walk');await page.waitForFunction(()=>window.courseSnapshot.foley.steps>=2);
    const early=await page.evaluate(()=>window.courseSnapshot.foley);assert.ok(early.height>.12);
    await audioClick('foley','sync');await page.waitForFunction(()=>window.courseSnapshot.foley.synchronized && window.courseSnapshot.foley.height<.04);
    await load('34-complete');await audioClick('foley','walk');await page.waitForFunction(()=>window.courseSnapshot.foley.steps>=2);
    const contact=await page.evaluate(()=>window.courseSnapshot.foley);assert.ok(contact.height<.04);assert.match(contact.clip,/concrete/);
    const footOutput=await audioLevel(1200);assert.ok(footOutput.peak>.0001);
    await audioClick('foley','surface');await page.waitForFunction(()=>window.courseSnapshot.foley.wooden && /wood/.test(window.courseSnapshot.foley.clip));
    await audioClick('foley','pace');await page.waitForFunction(()=>Math.abs(window.courseSnapshot.foley.speed-1.6)<.001);
    await page.screenshot({path:path.join(output,'34-webgl.png')});
    await audioClick('foley','walk');await page.waitForFunction(()=>!window.courseSnapshot.foley.walking);const stopCount=await page.evaluate(()=>window.courseSnapshot.foley.steps);
    await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>window.courseSnapshot.foley.steps),stopCount);assert.ok((await audioLevel()).peak<.00001);
    report.foley={status:'PASS',earlyHeight:early.height,contactHeight:contact.height,footOutput,surfaceAndSpeed:'PASS',stop:'PASS',previousUnitMuteReset:'PASS'};
    report.interactions.push({name:'Sound: destination PCM, 2D/3D attenuation, mixer mute and UI cue',status:'PASS'},{name:'Foley: Animation Events, contact height, material, pace and stop',status:'PASS'});
    console.log('Checking 14 HUD/UI patterns');
    await load('18-start');await audioClick('gallery','gallery-open');await page.waitForFunction(()=>window.courseSnapshot.gallery.open);
    assert.equal(await page.evaluate(()=>window.courseSnapshot.gallery.count),14);
    await audioClick('gallery','gallery-close');await page.waitForFunction(()=>!window.courseSnapshot.gallery.open);
    assert.equal(await page.evaluate(()=>window.courseSnapshot.gallery.open),false);
    await load('18-complete');await audioClick('gallery','gallery-open');await page.waitForFunction(()=>window.courseSnapshot.gallery.open);
    const gallery=()=>page.evaluate(()=>window.courseSnapshot.gallery);
    const select=async n=>{for(let tries=0;tries<14 && (await gallery()).pattern!==n;tries++){await audioClick('gallery','gallery-next');await page.waitForTimeout(200);}assert.equal((await gallery()).pattern,n);};
    const action=async a=>{await audioClick('gallery',a);await page.waitForTimeout(200);};
    for(let n=0;n<14;n++){await select(n);assert.ok((await gallery()).previewText.length>0);await page.screenshot({path:path.join(output,`18-gallery-webgl-${String(n+1).padStart(2,'0')}.png`)});}
    await select(0);await action('damage');assert.equal((await gallery()).health,75);assert.equal((await gallery()).bars[0],75);await action('heal');assert.equal((await gallery()).health,100);
    await select(1);await action('fire');assert.equal((await gallery()).ammo,11);await action('reload');assert.equal((await gallery()).ammo,12);
    await select(2);await action('advance');assert.equal((await gallery()).objective,2);
    await select(3);await action('slot-2');assert.equal((await gallery()).slot,2);assert.ok(!(await gallery()).buttons.some(b=>b.action==='slot-3'||b.action==='slot-4'));
    await select(4);assert.ok(!(await gallery()).buttons.some(b=>b.action==='continue'));await action('new-game');assert.match((await gallery()).result,/開始を選択/);
    await select(5);await action('resume');assert.match((await gallery()).result,/再開を選択/);
    await select(6);await action('volume-up');assert.equal((await gallery()).volume,70);assert.equal((await gallery()).appliedVolume,60);await action('apply');assert.equal((await gallery()).appliedVolume,70);
    await select(7);await action('item-6');assert.ok(!(await gallery()).buttons.some(b=>b.action==='use-item'));await action('item-2');await action('use-item');assert.equal((await gallery()).items,2);
    await select(8);await action('choice-east');assert.match((await gallery()).result,/ミラ：/);
    await select(9);await action('completed-tab');assert.equal((await gallery()).completed,true);assert.match((await gallery()).previewText,/完了/);
    await select(10);const background=(await gallery()).buttons.find(b=>b.action==='background-action');await action('open-modal');assert.equal((await gallery()).focus,'modal-cancel');
    const rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+rect.width*.05,rect.y+rect.height*background.y);await page.waitForTimeout(350);assert.equal((await gallery()).backgroundClicks,0);assert.equal((await gallery()).pattern,10);assert.ok(!(await gallery()).buttons.some(b=>b.action==='background-action'));
    await page.keyboard.press('Escape');await page.waitForTimeout(350);assert.equal((await gallery()).modal,false);assert.equal((await gallery()).items,3);assert.equal((await gallery()).focus,'open-modal');
    await action('open-modal');await action('modal-confirm');assert.equal((await gallery()).items,2);assert.equal((await gallery()).modal,false);
    await select(11);await action('next-level');assert.match((await gallery()).result,/次のミッション/);
    await select(12);await action('load-step');assert.equal((await gallery()).bars[0],25);await action('load-error');assert.equal((await gallery()).error,true);assert.ok(!(await gallery()).buttons.some(b=>b.action==='load-step'));await action('load-retry');assert.equal((await gallery()).progress,0);assert.equal((await gallery()).error,false);
    await select(13);await action('show-toast');assert.equal((await gallery()).toast,true);await action('tooltip-help');assert.match((await gallery()).previewText,/鍵で目印/);await action('dismiss-toast');assert.equal((await gallery()).toast,false);assert.equal((await gallery()).focus,'show-toast');
    await select(0);
    for(const type of ['achromatopsia','deuteranopia','protanopia']){await session.send('Emulation.setEmulatedVisionDeficiency',{type});await page.screenshot({path:path.join(output,`18-gallery-vision-${type}.png`)});}
    await session.send('Emulation.setEmulatedVisionDeficiency',{type:'none'});
    await page.setViewportSize({width:390,height:820});await page.waitForTimeout(450);await action('gallery-next');assert.equal((await gallery()).pattern,1);await page.screenshot({path:path.join(output,'18-gallery-390.png')});
    await action('gallery-close');assert.equal((await gallery()).open,false);assert.equal((await gallery()).focus,'gallery-open');await page.setViewportSize({width:1000,height:820});
    report.gallery={status:'PASS',patterns:14,startAndComplete:true,modalBackgroundBlocked:true,cancelPreservesCount:true,focusRestored:true,narrowViewport:390};
    report.interactions.push({name:'14 HUD/UI patterns: states, modal, focus, retry and narrow view',status:'PASS'});
    await load('35-start');await page.waitForFunction(()=>window.courseSnapshot.procedural?.buildings===4);
    const flatMap=await page.evaluate(()=>window.courseSnapshot.procedural);assert.equal(flatMap.roads,2);assert.equal(flatMap.terrainHit,true);assert.equal(flatMap.seed,35);assert.ok(flatMap.maxHeight-flatMap.minHeight<.001);assert.match(flatMap.hash,/^[0-9A-F]{8}$/);
    await load('35-complete');await page.waitForFunction(()=>window.courseSnapshot.procedural?.buildings===9);
    const hills=await page.evaluate(()=>window.courseSnapshot.procedural);assert.equal(hills.roads,4);assert.ok(hills.worldLabels>=9);assert.equal(hills.terrainHit,true);assert.ok(hills.colliderHeight>=hills.minHeight && hills.colliderHeight<=hills.maxHeight+.01);assert.equal(hills.seed,73);assert.equal(hills.roadWidth,3);assert.ok(hills.maxHeight-hills.minHeight>1);assert.notEqual(hills.hash,flatMap.hash);
    await audioClick('procedural','view');await page.waitForFunction(()=>window.courseSnapshot.procedural.top);
    await page.screenshot({path:path.join(output,'35-top-webgl.png')});
    await audioClick('procedural','labels');await page.waitForFunction(()=>!window.courseSnapshot.procedural.labels && window.courseSnapshot.procedural.worldLabels===0);
    await audioClick('procedural','labels');await page.waitForFunction(()=>window.courseSnapshot.procedural.labels);
    await audioClick('procedural','view');await page.waitForFunction(()=>!window.courseSnapshot.procedural.top);
    await page.screenshot({path:path.join(output,'35-webgl.png')});
    for(const type of ['achromatopsia','deuteranopia','protanopia']){await session.send('Emulation.setEmulatedVisionDeficiency',{type});await page.screenshot({path:path.join(output,`35-vision-${type}.png`)});}
    await session.send('Emulation.setEmulatedVisionDeficiency',{type:'none'});
    report.procedural={status:'PASS',flatMap,hills,viewToggle:true,legendToggle:true,scope:'Saved Editor output; no browser generation'};
    report.interactions.push({name:'Procedural city and Terrain: saved geometry, density, relief, view and legend',status:'PASS'});
    console.log('Checking real Collision / Trigger / Layer / Raycast behavior');
    const collision=()=>page.evaluate(()=>window.courseSnapshot.collision);
    async function collisionClick(action){const state=await collision();const b=state.buttons.find(b=>b.action===action),r=await page.locator('canvas').boundingBox();assert.ok(b,action);await page.mouse.click(r.x+r.width*b.x,r.y+r.height*b.y);await page.waitForTimeout(300);}
    await load('36-start');assert.equal((await collision()).wallTrigger,true);
    await collisionClick('launch');await page.waitForFunction(()=>window.courseSnapshot.collision.x>3.2,null,{timeout:10000});
    let startCollision=await collision();assert.equal(startCollision.collisionEnters,0);assert.equal(startCollision.wallTriggerEnters,1);assert.equal(startCollision.sensorEnters,1);assert.equal(startCollision.sensorExits,1);
    await page.screenshot({path:path.join(output,'36-trigger-webgl.png')});
    await load('36-complete');assert.equal((await collision()).wallTrigger,false);
    await collisionClick('launch');await page.waitForFunction(()=>window.courseSnapshot.collision.collisionEnters===1&&window.courseSnapshot.collision.speed<.05,null,{timeout:10000});
    let stoppedCollision=await collision();assert.ok(stoppedCollision.x>1.2&&stoppedCollision.x<1.5);assert.equal(stoppedCollision.sensorEnters,1);assert.equal(stoppedCollision.sensorExits,1);assert.equal(stoppedCollision.wallTriggerEnters,0);
    await page.screenshot({path:path.join(output,'36-collision-webgl.png')});
    await collisionClick('layers');await collisionClick('launch');await page.waitForFunction(()=>window.courseSnapshot.collision.x>3.2,null,{timeout:10000});assert.equal((await collision()).collisionEnters,0);assert.equal((await collision()).sensorEnters,1);
    await collisionClick('ray');await page.waitForFunction(()=>window.courseSnapshot.collision.rayHit==='W 壁');
    await page.screenshot({path:path.join(output,'36-layers-webgl.png')});
    await collisionClick('mask');await collisionClick('ray');assert.equal((await collision()).rayHit,'W 壁');
    await collisionClick('triggers');await collisionClick('ray');await page.waitForFunction(()=>window.courseSnapshot.collision.rayHit==='G センサー');
    await page.screenshot({path:path.join(output,'36-raycast-webgl.png')});
    await collisionClick('wall');await collisionClick('mask');await collisionClick('triggers');await collisionClick('ray');assert.equal((await collision()).rayHit,'該当なし');
    await load('01-start');assert.equal(await page.evaluate(()=>window.courseSnapshot.collisionPairIgnored),false,'Layer collision pair restored when leaving lesson');
    await load('36-complete');assert.equal((await collision()).ignoreWall,false);assert.equal((await collision()).wallTrigger,false);
    report.collision={status:'PASS',startTrigger:startCollision,completedStop:stoppedCollision,layerPairBypass:true,queryIndependentOfPair:true,queryMaskAndTriggers:true,layerPairRestored:true};
    report.interactions.push({name:'Collision / Trigger callbacks, layer pair, ray mask, trigger query and scene cleanup',status:'PASS'});
    await load('19-complete'); assert.match(await page.locator('#note').textContent(), /非対応/);
    report.vfxGraph = 'EDITOR_ONLY (explicitly labelled; no substituted effect)';
    assert.deepEqual(report.errors, []); assert.deepEqual(report.fontWarnings, [], 'Japanese font glyph warnings'); report.status = 'PASS';
  } catch (error) { report.errors.push(error.stack || String(error)); process.exitCode = 1; }
  finally {
    await browser?.close().catch(e => report.errors.push(e.message));
    await browserServer?.close().catch(e => report.errors.push(e.message));
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    report.cleanup = (!processHandle || processHandle.exitCode !== null || processHandle.signalCode !== null) ? 'PASS' : 'FAIL';
    if (report.errors.length || report.cleanup !== 'PASS') { report.status = 'FAIL'; process.exitCode = 1; }
    await fs.writeFile(path.join(output, 'webgl-verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, scenes: report.scenes.length, interactions: report.interactions, errors: report.errors, cleanup: report.cleanup }));
  }
})();
