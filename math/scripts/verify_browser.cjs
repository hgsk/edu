/* Real browser checks/captures. Set PLAYWRIGHT_MODULE to an installed module path if needed. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..');
const assets=path.join(root,'hht/assets/math');
fs.mkdirSync(assets,{recursive:true});
const report={status:'FAIL',errors:[],checks:[],screenshots:[],cleanup:{browser:'NOT RUN',server:'NOT RUN'}};
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const canonicalMath=()=>fs.readFileSync(path.join(root,'hht/docs/workbook/math.md'),'utf8').replaceAll('\r\n','\n').split('<a id="math-course"></a>')[1];
report.sourceSha256=Object.fromEntries(['math/index.html','math/style.css','math/reasoning.css','math/app.js','math/models.js','math/game-life.js','math/references/game-life.md','math/teaching.js','math/lessons.js','math/guide.html'].map(file=>[file,digest(fs.readFileSync(path.join(root,file)))]));
report.canonicalMathSha256=digest(canonicalMath());
report.workbookScope='Mathematics chapter only; unrelated HTML/CSS course edits are excluded.';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const target=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(fs.readFileSync(target));
  }catch{res.writeHead(404);res.end();}
});
let browserServer,browser,browserPid;
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
async function main(){
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const port=server.address().port;
    report.server={pid:process.pid,executable:process.execPath,startedAt:new Date().toISOString(),port};
    browserServer=await chromium.launchServer({headless:true});
    const proc=browserServer.process();browserPid=proc.pid;
    report.browser={pid:proc.pid,executable:proc.spawnfile,startedAt:new Date().toISOString()};
    browser=await chromium.connect(browserServer.wsEndpoint());
    const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
    page.on('pageerror',error=>report.errors.push(String(error)));
    page.on('console',msg=>{if(msg.type()==='error')report.errors.push(msg.text());});
    page.on('requestfailed',request=>report.errors.push(`requestfailed: ${request.url()}`));
    await page.goto(`http://127.0.0.1:${port}/math/index.html`,{waitUntil:'networkidle'});
    await page.locator('#result').filter({hasText:'2'}).waitFor();
    assert.equal(await page.locator('.lesson-link').count(),28);
    await page.locator('.calculation-policy>summary').click();assert.match(await page.locator('#calculation-policy-body').innerText(),/手で速く計算することを分けます/);await page.locator('.calculation-policy>summary').click();
    async function select(id){await page.evaluate(id=>{location.hash=id;},id);await page.waitForFunction(id=>document.querySelector('#unit-id').textContent===id,id);}
    async function progress(value){await page.locator('#progress').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);}
    async function parameter(index,value){await page.locator(`#parameter-${index}`).evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);}
    const ids=await page.evaluate(()=>MATH_LESSONS.map(l=>l.id));
    report.units=[];
    for(const id of ids){
      await select(id);
      assert.ok((await page.locator('#lesson-content').innerText()).includes('完成条件'));
      assert.ok(await page.locator('#glossary dt').count()>=2);
      assert.ok(await page.locator('#presets button').count()>=2);
      const modes=await page.locator('#experiment option').evaluateAll(options=>options.map(o=>o.value));
      const unit={id,scenes:[],presets:0,readingCheck:'NOT RUN',reasoningChecks:0,responsive:[]};
      await page.locator('.lab').screenshot({path:path.join(assets,`unit-${id}.png`)});
      for(const mode of modes){
        await page.locator('#experiment').selectOption(mode);
        await progress(100);const end=await page.locator('#scene').evaluate(c=>c.toDataURL());
        await progress(0);const start=await page.locator('#scene').evaluate(c=>c.toDataURL());
        await progress(50);const middle=await page.locator('#scene').evaluate(c=>c.toDataURL());
        assert.ok(new Set([start,middle,end]).size>1,`${id}/${mode}: animation must change the visual`);
        await progress(100);
        for(const input of await page.locator('#parameters input').all()){
          const snapshots=[];
          for(const extreme of ['min','defaultValue','max']){
            await input.evaluate((node,key)=>{node.value=node[key];node.dispatchEvent(new Event('input',{bubbles:true}));},extreme);
            const states=[];for(const percent of [0,50,100]){await progress(percent);states.push(await page.evaluate(()=>({result:document.querySelector('#result').textContent,formula:document.querySelector('#formula').textContent,note:document.querySelector('#model-note').textContent,canvas:document.querySelector('#scene').toDataURL()})));}
            snapshots.push(JSON.stringify(states));
          }
          assert.ok(new Set(snapshots).size>1,`${id}/${mode}: input has no observable effect`);
        }
        assert.ok(!/NaN|Infinity|undefined/.test(await page.locator('#result').innerText()),`${id}/${mode}`);
        unit.scenes.push(mode);
      }
      for(const preset of await page.locator('#presets button').all()){await preset.click();assert.ok(!/NaN|Infinity|undefined/.test(await page.locator('#result').innerText()));unit.presets++;}
      const answer=await page.evaluate(id=>MATH_LESSONS.find(l=>l.id===id).check.answer,id);
      await page.locator('#check-answer').fill(String(answer+7));await page.locator('#check-form button').click();assert.equal(await page.locator('#check-feedback').getAttribute('data-correct'),'false');
      await page.locator('#check-answer').fill(String(answer));await page.locator('#check-form button').click();assert.equal(await page.locator('#check-feedback').getAttribute('data-correct'),'true');unit.readingCheck='PASS';
      const reasoning=await page.evaluate(id=>MATH_LESSONS.find(l=>l.id===id).reasoning,id);
      assert.equal(await page.locator('#reasoning-section').isVisible(),reasoning.length>0);
      for(const[i,item]of reasoning.entries()){
        const form=page.locator(`form[data-reasoning="${i}"]`),textarea=form.locator('textarea'),feedback=form.locator('.reasoning-feedback'),wrong=['A','B','C'].find(letter=>letter!==item.correct);
        await form.locator(`input[value="${wrong}"]`).check();await textarea.fill('   ');await form.locator('button').click();assert.equal(await textarea.evaluate(node=>node.validity.customError),true);
        await textarea.fill('検証用の理由：条件と元の式への代入、単位と誤差を確認する。');await form.locator('button').click();assert.equal(await feedback.getAttribute('data-correct'),'false');
        await form.locator(`input[value="${item.correct}"]`).check();await form.locator('button').click();assert.equal(await feedback.getAttribute('data-correct'),'true');assert.match(await feedback.innerText(),/記述の理由は採点していません/);
        assert.ok(await page.locator('.reasoning-case').nth(i).locator('.reasoning-rubric li').count()>=3);
        unit.reasoningChecks++;
      }
      report.units.push(unit);
    }
    assert.equal(report.units.reduce((sum,unit)=>sum+unit.reasoningChecks,0),39);
    await select('B03');assert.match(await page.locator('form[data-reasoning="0"] textarea').inputValue(),/検証用の理由/);
    await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('edu-math-reason-'))localStorage.removeItem(key);});
    report.checks.push('39 reasoning exercises: whitespace rejected, wrong/correct choice feedback, explanation not auto-graded, rubric and local persistence');
    report.checks.push('28 lesson bodies/glossaries/presets/reading checks; every scene animated; every input changes observable content');
    const gallery=await browser.newPage({viewport:{width:1800,height:1600}});
    try{
      for(let start=0;start<ids.length;start+=4){
        const batch=ids.slice(start,start+4);
        await gallery.setContent(`<html lang="ja"><meta charset="utf-8"><title>実画面の品質確認</title><style>body{margin:20px;background:#edf1e7;font:18px Meiryo,sans-serif;color:#163c2e}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;padding:12px;border:1px solid #b6c8ac}h1{font-size:22px}figcaption{margin-bottom:10px;font-weight:bold}img{width:100%;height:auto;display:block}</style><h1>実画面の品質確認 ${start/4+1} / 7</h1><main>${batch.map(id=>`<figure><figcaption>${id} ${id[0]==='B'?'基礎':'応用'}</figcaption><img alt="${id}の実画面" src="http://127.0.0.1:${port}/hht/assets/math/unit-${id}.png"></figure>`).join('')}</main></html>`);
        for(const img of await gallery.locator('img').all())await img.evaluate(node=>node.decode());
        await gallery.screenshot({path:path.join(assets,`quality-gallery-${start/4+1}.png`),fullPage:true});
      }
    }finally{await gallery.close();}
    report.checks.push('28 real scene screenshots and 7 visual review sheets captured');
    async function presetNamed(id,name){await select(id);await page.getByRole('button',{name,exact:true}).click();}
    await presetNamed('B01','本文のHP例題：3回被弾');assert.equal(await page.locator('#result').innerText(),'HP 53');
    await presetNamed('B03','HP28から100まで');assert.match(await page.locator('#model-note').innerText(),/12 秒/);
    await presetNamed('B03','2本の式を同時に満たす');assert.equal(await page.locator('#result').innerText(),'x=4, y=3');
    await presetNamed('B03','二次方程式の解2と3');assert.match(await page.locator('#result').innerText(),/2, 3/);
    await presetNamed('B12','20%で100コイン');assert.equal(await page.locator('#result').innerText(),'期待値 20 コイン');
    await presetNamed('B12','赤を引いて戻さない');assert.match(await page.locator('#result').innerText(),/1\/2/);
    await presetNamed('B12','赤を引いて戻す');assert.match(await page.locator('#result').innerText(),/2\/3/);
    report.checks.push('canonical HP/equation/expectation/conditional-probability examples reproduced through visible controls');
    await select('B09');await parameter(0,0);await parameter(1,0);assert.match(await page.locator('#result').innerText(),/ゼロ/);
    await page.locator('#reset').click();await progress(100);
    await page.locator('#parameter-0').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#parameter-0').inputValue(),'-4.5');
    report.checks.push('zero vector boundary and native keyboard slider control');
    await page.locator('#search').fill('クォータニオン');assert.ok(await page.locator('.lesson-link').count()>0);
    await page.locator('#search').fill('no-such-topic-xyz');assert.equal(await page.locator('.lesson-link').count(),0);
    await page.locator('#search').fill('');
    await page.locator('#reset').click();await page.locator('#play').click();await page.waitForTimeout(300);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');
    await page.locator('#play').click();const paused=await page.locator('#progress').inputValue();await page.waitForTimeout(150);assert.equal(await page.locator('#progress').inputValue(),paused);
    await page.locator('#step').click();assert.notEqual(await page.locator('#progress').inputValue(),paused);
    report.checks.push('search, play, pause, and manual stepping');
    await page.locator('#memo').fill('検証用メモ：入力を変えて比較');await select('B08');await select('B09');assert.match(await page.locator('#memo').inputValue(),/検証用/);await page.locator('#memo').fill('');
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
    report.checks.push('per-unit local memo and reduced-motion initial pause');
    await page.emulateMedia({reducedMotion:'no-preference'});
    async function capture(name){
      await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(assets,name),fullPage:true});report.screenshots.push(name);
    }
    await select('B09');await progress(100);await page.evaluate(()=>scrollTo(0,0));await capture('overview-desktop.png');
    await select('B01');await progress(100);await page.evaluate(()=>scrollTo(0,0));await capture('middle-signed.png');
    await select('B03');await progress(66);await page.evaluate(()=>scrollTo(0,0));await capture('middle-equation.png');
    await select('B07');await progress(100);await page.evaluate(()=>scrollTo(0,0));await capture('middle-triangle.png');
    await select('B11');await progress(100);await page.evaluate(()=>scrollTo(0,0));await capture('middle-tree.png');
    await select('A02');await progress(100);await page.evaluate(()=>scrollTo(0,0));await capture('gimbal-lock.png');
    await parameter(0,45);assert.doesNotMatch(await page.locator('#result').innerText(),/差 0$/);
    await select('A04');await progress(50);await page.evaluate(()=>scrollTo(0,0));await capture('rotation-interpolation.png');
    await select('A06');await progress(100);await page.evaluate(()=>scrollTo(0,0));await capture('integration.png');
    await select('B03');
    await page.locator('.reasoning-case').first().screenshot({path:path.join(assets,'reasoning-start.png')});
    const reasoningForm=page.locator('form[data-reasoning="0"]');await reasoningForm.locator('input[value="C"]').check();await reasoningForm.locator('textarea').fill('xで割るにはx≠0が必要。元の式にはx=0も成り立つので別に確認する。x=0と1を代入すると両方とも一致する。');await reasoningForm.locator('button').click();await page.locator('.reasoning-case').first().locator('.reasoning-rubric summary').click();
    await page.locator('.reasoning-case').first().screenshot({path:path.join(assets,'reasoning-feedback.png')});
    await presetNamed('B18','u=0.02で誤差を調べる');assert.match(await page.locator('#result').innerText(),/許容内/);assert.match(await page.locator('#model-note').innerText(),/1\.00995049/);await page.locator('.lab').screenshot({path:path.join(assets,'approximation-error.png')});
    report.screenshots.push('reasoning-start.png','reasoning-feedback.png','approximation-error.png');
    const appliedExamples=[
      ['B01','攻撃40・防御15を3回','合計 75 HP','game-damage.png'],
      ['B02','2人分300gを5人分へ','必要な材料 750 g','life-recipe.png'],
      ['B02','500g300円の20%引き','100g当たり 48 円','life-shopping.png'],
      ['B12','1%で100回：1/eと比較','100回で1回以上成功 63.3968%','lottery-e.png'],
      ['B12','架空：還元80%・控除20%','1回の期待収支 -0.2 点','lottery-return.png'],
      ['B15','子40符3翻ロン','通常点・受取 5200 点','mahjong-score.png'],
      ['B17','8Mb/sを10分保存','約 600 MB','life-video.png']
    ];
    for(const[id,name,expected,file]of appliedExamples){await presetNamed(id,name);assert.equal(await page.locator('#result').innerText(),expected);await page.locator('.lab').screenshot({path:path.join(assets,file)});report.screenshots.push(file);}
    await presetNamed('B01','攻撃回数0の境界');assert.equal(await page.locator('#result').innerText(),'合計 0 HP');
    await presetNamed('B12','成功確率0%の境界');assert.match(await page.locator('#model-note').innerText(),/有限でない/);
    await presetNamed('B12','50%で2回：近似に注意');assert.match(await page.locator('#formula').innerText(),/0\.25/);assert.match(await page.locator('#model-note').innerText(),/0\.11787944/);
    await presetNamed('B12','費用0では率を定義しない');assert.match(await page.locator('#model-note').innerText(),/費用0では率を定義しない/);
    await presetNamed('B15','子30符4翻：切り上げ満貫');assert.equal(await page.locator('#result').innerText(),'切り上げ満貫・受取 8000 点');
    await presetNamed('B15','13翻でも三倍満');assert.equal(await page.locator('#result').innerText(),'三倍満・受取 24000 点');
    await presetNamed('B15','20符ロンは対象外');assert.equal(await page.locator('#result').innerText(),'入力条件を確認してください');
    await presetNamed('B15','子25符3翻ツモ');assert.equal(await page.locator('#result').innerText(),'通常点・受取 3200 点');
    report.checks.push('new game/life scenes: visible controls reproduce damage, recipe, unit price, draw/e, return, mahjong, bitrate; probability/cost/score boundaries');
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:1000});
      for(const id of ids){
        await select(id);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
        assert.equal(overflow,false,`${id}: horizontal overflow at ${width}px`);
        assert.equal(await page.locator('#play').isVisible(),true);report.units.find(u=>u.id===id).responsive.push(width);
      }
      if(width===390){
        for(const id of ids){await select(id);for(const mode of await page.locator('#experiment option').evaluateAll(options=>options.map(o=>o.value))){await page.locator('#experiment').selectOption(mode);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${id}/${mode}: mobile overflow`);}}
        await select('B09');await page.evaluate(()=>scrollTo(0,0));await capture('overview-mobile.png');
        await select('B01');await page.evaluate(()=>scrollTo(0,0));await capture('middle-mobile.png');
      }
    }
    report.checks.push('320/390/768/1440px responsive layout with no horizontal overflow');
    await page.goto(`http://127.0.0.1:${port}/math/guide.html`,{waitUntil:'networkidle'});
    for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(node=>node.decode());}
    const images=await page.locator('img').evaluateAll(images=>images.map(img=>({loaded:img.complete&&img.naturalWidth>0,alt:img.alt})));
    assert.equal(images.length,17);assert.ok(images.every(img=>img.loaded&&img.alt.length>10));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    report.checks.push('operation guide: 17 loaded real screenshots with alt text');
    // Real file protocol is also supported: no HTTP-only data fetches.
    await page.goto(pathToFileURL(path.join(root,'math/index.html')).href+'#A03');await page.waitForFunction(()=>document.querySelector('#unit-id').textContent==='A03');assert.match(await page.locator('#result').innerText(),/ez/);
    report.checks.push('offline file:// launch');
    await presetNamed('B12','1%で100回：1/eと比較');assert.match(await page.locator('#result').innerText(),/63\.3968/);
    await presetNamed('B15','子40符3翻ロン');assert.match(await page.locator('#result').innerText(),/5200/);report.checks.push('new game/life module also runs offline via file://');
    assert.equal(report.errors.length,0,report.errors.join('\n'));
    for(const [file,hash]of Object.entries(report.sourceSha256))assert.equal(digest(fs.readFileSync(path.join(root,file))),hash,`${file}: source changed during verification`);
    assert.equal(digest(canonicalMath()),report.canonicalMathSha256,'mathematics chapter changed during verification');
    assert.equal(await page.evaluate(()=>MATH_SOURCE_SHA256),report.canonicalMathSha256,'generated content does not match canonical mathematics chapter');
    report.checks.push('delivered source and canonical mathematics hashes unchanged throughout verification');
    report.status='PASS';
  }catch(error){report.failure=String(error.stack||error);process.exitCode=1;}
  finally{
    try{if(browser)await browser.close();if(browserServer)await browserServer.close();report.cleanup.browser=browserPid&&!alive(browserPid)?'PASS':'FAIL';if(report.cleanup.browser!=='PASS')process.exitCode=1;}
    catch(error){report.cleanup.browser='FAIL';report.cleanup.browserError=String(error);process.exitCode=1;}
    try{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));report.cleanup.server=server.listening?'FAIL':'PASS';}
    catch(error){report.cleanup.server='FAIL';report.cleanup.serverError=String(error);process.exitCode=1;}
    if(Object.values(report.cleanup).includes('FAIL'))report.status='FAIL';
    fs.writeFileSync(path.join(assets,'verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,unitCount:report.units?.length,sceneCount:report.units?.reduce((n,u)=>n+u.scenes.length,0),presetCount:report.units?.reduce((n,u)=>n+u.presets,0),reasoningCount:report.units?.reduce((n,u)=>n+u.reasoningChecks,0),checks:report.checks,errors:report.errors,failure:report.failure,cleanup:report.cleanup,browser:report.browser,server:report.server}));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
