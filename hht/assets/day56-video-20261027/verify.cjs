// Verify the actual restored bundle output, with a separate owned browser.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{execFileSync}=require('node:child_process');
const out=__dirname,results={checks:[],cleanup:'NOT RUN'};
function check(name,value,detail){results.checks.push({name,status:value?'PASS':'FAIL',detail});if(!value)throw Error(name);}
(async()=>{
 let launch,browser;
 try{
  launch=await chromium.launchServer({headless:true});results.browser={pid:launch.process().pid,executable:launch.process().spawnfile};browser=await chromium.connect(launch.wsEndpoint());
  const page=await browser.newPage({viewport:{width:1100,height:900}});
  for(const d of [5,6]){
   const site=path.join(out,'restored-day0'+d,'hht/starter-site');
   for(const name of ['index.html','menu.html','about.html']){
    const url=pathToFileURL(path.join(site,name)).href;await page.goto(url);
    check('DAY'+d+' '+name+' main',await page.locator('main').count()===1);
    check('DAY'+d+' '+name+' current',await page.locator('nav [aria-current="page"]').getAttribute('href')===name);
    const expected=await page.locator('a[href]').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
    await page.locator('body').click({position:{x:1,y:1}});const order=[];
    for(let i=0;i<expected.length;i++){await page.keyboard.press('Tab');order.push(await page.evaluate(()=>document.activeElement?.getAttribute('href')));}
    check('DAY'+d+' '+name+' all Tab links',JSON.stringify(order)===JSON.stringify(expected),{expected,order});
    for(const target of ['index.html','menu.html','about.html']){await page.goto(url);await page.locator('nav a[href="'+target+'"]').click();check('DAY'+d+' '+name+' -> '+target,page.url().endsWith(target));}
    await page.goto(url);await page.setViewportSize({width:390,height:900});
    const size=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,boxes:[...document.querySelectorAll('nav a')].map(a=>{const r=a.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})}));
    const overlap=size.boxes.some((a,i)=>size.boxes.slice(i+1).some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y));
    check('DAY'+d+' '+name+' mobile links',!size.overflow&&!overlap,size);
    await page.setViewportSize({width:1100,height:900});
   }
   await page.goto(pathToFileURL(path.join(site,'menu.html')).href);
   check('DAY'+d+' menu anchor',await page.locator('#menu-list').count()===1);
   check('DAY'+d+' formal four products',await page.locator('.menu-card').count()===4);
   check('DAY'+d+' restored image',await page.evaluate(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)));
  }
  const repo=path.join(out,'learner-repo');const diff=execFileSync('git',['diff','day05-start','day05-end','--','hht/starter-site/*.html'],{cwd:repo,encoding:'utf8',windowsHide:true});
  check('DAY5 keeps all three HTML files',diff.trim()==='');
  const current=fs.readFileSync(path.join(repo,'hht/starter-site/menu.html'),'utf8');
  check('DAY6 restores formal names',!current.includes('試験用')&&current.includes('ラテ＆スコーンセット'));
  const record=JSON.parse(fs.readFileSync(path.join(out,'verification.json'),'utf8'));
  check('Recording finished',record.status==='PASS'&&record.cleanup==='PASS');
  check('Original course sources preserved',Object.values(record.sources).every(x=>x.before===x.after));
  check('Browser actual 200 percent x3',record.checks.filter(x=>x.browserZoom===2&&Math.abs(x.zoom.dpr-2)<0.001&&x.status==='PASS').length===3);
  results.status='PASS';
 }catch(e){results.status='FAIL';results.error=e.stack;process.exitCode=1;}
 finally{if(browser)await browser.close();if(launch)await launch.close();results.cleanup='PASS';fs.writeFileSync(path.join(out,'final-checks.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({status:results.status,checks:results.checks.length,cleanup:results.cleanup,error:results.error}));}
})();
