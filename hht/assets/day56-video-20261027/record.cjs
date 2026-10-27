// Real local browser editor and Playwright video capture. No source-course files are written.
const fs=require('node:fs'), path=require('node:path'), http=require('node:http');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const out=__dirname, hht=path.resolve(out,'../..'), repo=path.join(out,'learner-repo');
const site=path.join(repo,'hht/starter-site');
const resumeDay6=process.argv.includes('--resume-day6');
const report=resumeDay6?JSON.parse(fs.readFileSync(path.join(out,'verification.json'),'utf8')):{started:new Date().toISOString(),sources:{},chapters:[],checks:[],cleanup:'NOT RUN'};
if(resumeDay6){report.recoveredCaptureError=report.error;delete report.error;report.status='RUNNING';report.cleanup='NOT RUN';}
const hash=f=>require('node:crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const git=(...args)=>execFileSync('git',[...args],{cwd:repo,encoding:'utf8',windowsHide:true}).trim();
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let server,browser,launch,context,page,video,day,started;
const originals={};
for(const f of ['docs/workbook/day05.md','docs/workbook/day06.md','docs/course-design.md','docs/workbook/common.md']) report.sources[f]=hash(path.join(hht,f));
function contained(base,p){const f=path.resolve(base,p);if(!f.startsWith(base+path.sep))throw Error('Outside root');return f;}
function saveJson(){fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));}
function init(){
 if(resumeDay6){if(git('status','--porcelain')!==''||git('rev-parse','HEAD')!==git('rev-parse','day05-end'))throw Error('Unsafe DAY6 resume');return;}
 if(fs.existsSync(repo)){
  if(fs.existsSync(path.join(repo,'.git')) && git('tag','--list')==='day05-start' && git('status','--porcelain')===''){
   for(const f of ['index.html','menu.html','about.html'])originals[f]=fs.readFileSync(path.join(site,f),'utf8');
   return;
  }
  throw Error('Refusing to overwrite an existing learner repository');
 }
 fs.mkdirSync(site,{recursive:true}); fs.cpSync(path.join(hht,'starter-site'),site,{recursive:true});
 // The instructor's D4 structure is copied, without their D5 CSS improvements.
 fs.copyFileSync(path.join(hht,'instructor/day56-examples/day5/about.html'),path.join(site,'about.html'));
 for(const f of ['index.html','menu.html','about.html']){
  const p=path.join(site,f);let s=fs.readFileSync(p,'utf8').replaceAll('創業10年','地域と歩んで12年');fs.writeFileSync(p,s);
 }
 let css=fs.readFileSync(path.join(site,'css/style.css'),'utf8');
 css+='\n/* DAY 3: 共通ボタンを継続 */\n.menu-button { border: 2px solid #173b30; }\n';
 fs.writeFileSync(path.join(site,'css/style.css'),css);
 fs.mkdirSync(path.join(repo,'hht/docs/workbook'),{recursive:true});
 for(const f of ['day05.md','day06.md','common.md'])fs.copyFileSync(path.join(hht,'docs/workbook',f),path.join(repo,'hht/docs/workbook',f));
 fs.mkdirSync(path.join(repo,'hht/fixtures/photographer-delivery'),{recursive:true});
 fs.copyFileSync(path.join(hht,'fixtures/photographer-delivery/ASSET-MANIFEST.md'),path.join(repo,'hht/fixtures/photographer-delivery/ASSET-MANIFEST.md'));
 git('init','-b','student/demo');git('config','user.name','Course Demo');git('config','user.email','demo@example.invalid');
 git('add','.');git('commit','-m','DAY4までの練習開始状態');git('tag','day05-start');
 for(const f of ['index.html','menu.html','about.html']) originals[f]=fs.readFileSync(path.join(site,f),'utf8');
}
const app=`<!doctype html><html lang="ja"><meta charset="utf-8"><title>DAY 5・6 資料を読みながら実作業</title>
<style>*{box-sizing:border-box}body{margin:0;background:#101d29;color:#eaf1f5;font:20px 'Segoe UI',Meiryo,sans-serif}header{height:64px;display:flex;align-items:center;padding:0 24px;gap:20px;background:#142838;border-bottom:1px solid #44606f}header strong{font-size:25px}header span{margin-left:auto;font-size:17px;color:#b8d9ca}main{height:calc(100vh - 178px);display:grid;grid-template-columns:43% 57%;gap:2px}#docs{background:#fffdf8;color:#242b30;overflow:auto;padding:24px 34px;font-size:20px;line-height:1.8;scroll-behavior:smooth}#docs h1{font-size:29px;line-height:1.5}#docs h3{font-size:24px;border-left:6px solid #26735a;padding-left:15px}#docs img{max-width:100%}#docs pre{font-size:18px;line-height:1.6;padding:15px;background:#edf1ee;overflow:auto}#docs a{color:#17634d}#docs blockquote{border-left:5px solid #dfaa43;padding-left:20px;background:#fff6dc;margin:15px 0}#docs table{font-size:17px;border-collapse:collapse}#docs td,#docs th{border:1px solid #aaa;padding:6px}#right{display:flex;flex-direction:column;min-width:0;background:#edf2f3;color:#182b38}nav{height:56px;display:flex;align-items:center;gap:8px;padding:6px 12px;background:#dde8e6}button,select,input{font:18px Meiryo,sans-serif;padding:7px 12px;border:1px solid #77998f;border-radius:5px;background:#fff;color:#173e32;cursor:pointer}button.active{background:#21634c;color:white}#editor,#preview,#record{flex:1;min-height:0}#editor{display:flex;flex-direction:column}#filebar{padding:12px;display:flex;gap:12px;align-items:center;font-size:17px}textarea{width:100%;flex:1;resize:none;border:0;outline:0;padding:20px;background:#172533;color:#e9f6f0;font:21px/1.65 Consolas,'Yu Gothic',monospace;tab-size:2;white-space:pre;overflow:auto}#preview{overflow:auto;background:#becbc8}#previewbar{display:flex;gap:6px;align-items:center;padding:9px;background:#f7faf8;font-size:17px;flex-wrap:wrap}#framewrap{margin:0 auto;background:white;height:calc(100% - 55px)}iframe{width:100%;height:100%;border:0;background:white}#record{overflow:auto;padding:22px;background:#162633;color:#dcf5e3}#record pre{white-space:pre-wrap;font:20px/1.6 Consolas,'Yu Gothic',monospace}footer{height:114px;padding:14px 28px;background:#163e32;border-top:4px solid #edbd59}#step{font-size:19px;color:#f4ce78;margin-bottom:7px}#caption{font-size:25px;font-weight:600;line-height:1.5}#saved{color:#1a6548} .hide{display:none!important}</style>
<header><strong id="title">DAY 5 / 全ページの上と下をそろえる</strong><span>実際の資料・編集・保存・ブラウザ確認｜ローカル練習用コピー</span></header>
<main><article id="docs"></article><section id="right"><nav><button id="codeTab" onclick="tab('editor')">コードを編集</button><button id="previewTab" onclick="tab('preview')">ブラウザで確認</button><button id="recordTab" onclick="tab('record')">Git・作業記録</button></nav>
<section id="editor"><div id="filebar"><select id="files" onchange="loadFile()"><option>css/style.css</option><option>index.html</option><option>menu.html</option><option>about.html</option></select><button id="save" onclick="save()">保存 Ctrl+S</button><span id="saved">保存済み</span></div><textarea id="code" spellcheck="false" aria-label="制作ファイルのコード"></textarea></section>
<section id="preview" class="hide"><div id="previewbar"><select id="pages" onchange="preview()"><option>index.html</option><option>menu.html</option><option>about.html</option></select><button id="reload" onclick="preview()">更新</button><button id="wide" onclick="width(0)">通常幅</button><button id="mobile" onclick="width(390)">390px</button><span id="widthLabel"></span></div><div id="framewrap"><iframe id="frame" title="保存したサイトの実表示"></iframe></div></section>
<section id="record" class="hide"><button id="startGit" onclick="runGit('start')">開始状態を確認</button> <button id="finishGit" onclick="runGit('finish')">コミット・bundle作成・復元検証</button><pre id="terminal">ここには実際に実行したGitの出力を表示します。</pre></section></section></main>
<footer><div id="step">資料を読んでから制作へ</div><div id="caption">依頼の目的と、変える場所・残すものを確かめます。</div></footer>
<script>let currentDay=5;function tab(id){for(const x of ['editor','preview','record'])document.getElementById(x).classList.toggle('hide',x!==id);for(const x of ['code','preview','record'])document.getElementById(x+'Tab').classList.toggle('active',(x==='code'?'editor':x)===id)}async function loadFile(){code.value=await(await fetch('/file?name='+encodeURIComponent(files.value))).text();saved.textContent='保存済み'}async function save(){const r=await fetch('/save?name='+encodeURIComponent(files.value),{method:'POST',body:code.value});if(!r.ok)throw Error(await r.text());saved.textContent='保存済み ✓';}function preview(){frame.src='/site/'+pages.value+'?v='+Date.now();}function width(n){framewrap.style.width=n?n+'px':'100%';widthLabel.textContent=n?n+'px':'横幅 '+Math.round(framewrap.clientWidth)+'px'}async function runGit(mode){terminal.textContent='実行中…';terminal.textContent=await(await fetch('/git?mode='+mode+'&day='+currentDay,{method:'POST'})).text()}code.addEventListener('input',()=>saved.textContent='未保存');code.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='s'){e.preventDefault();save()}});loadFile();tab('editor');</script></html>`;
async function main(){
 init();const {marked}=require('marked');
 server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost');let body='';for await(const chunk of req)body+=chunk;
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(app)}
  if(u.pathname==='/docs'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(marked.parse(fs.readFileSync(path.join(hht,'docs/workbook/day0'+u.searchParams.get('day')+'.md'),'utf8')))}
  if(u.pathname==='/file'||u.pathname==='/save'){
   const name=u.searchParams.get('name');if(!['css/style.css','index.html','menu.html','about.html'].includes(name))throw Error('Invalid editor file');
   const f=contained(site,name);if(req.method==='POST'){fs.writeFileSync(f,body);return res.end('saved')}res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end(fs.readFileSync(f));
  }
  if(u.pathname==='/git'&&req.method==='POST'){
   const d=Number(u.searchParams.get('day'));if(![5,6].includes(d))throw Error('Invalid day');
   res.setHeader('Content-Type','text/plain; charset=utf-8');let log='';
   const run=(...a)=>{log+='$ git '+a.join(' ')+'\n'+git(...a)+'\n\n'};
   if(u.searchParams.get('mode')==='start'){run('status','--short');run('branch','--show-current');run('log','-1','--oneline');run('tag','--list');}
   else{
    const dd='day0'+d,bundle=path.join(out,'demo-'+dd+'.bundle'),restored=path.join(out,'restored-'+dd);
    if(fs.existsSync(bundle)||fs.existsSync(restored))throw Error('Refusing repeated finish');
    const sub=path.join(repo,'hht/submissions/day-0'+d);fs.mkdirSync(sub,{recursive:true});
    for(const f of fs.readdirSync(path.join(out,'evidence')))if(f.startsWith(dd))fs.copyFileSync(path.join(out,'evidence',f),path.join(sub,f));
    fs.writeFileSync(path.join(sub,'WORKLOG.md'),d===5?'# DAY 5 作業報告\n\n3ページのリンク名・順番・現在地は開始時点で一致していました。  \n共通CSSのgapとpadding、現在地の背景、フッター余白を調整しました。  \n本文と価格、DAY3のボタンとDAY4の店舗案内構造を保持しました。  \n3ページの移動、Tab・Shift+Tab・Enter、390px、ブラウザ200%を確認しました。\n':'# DAY 6 作業報告\n\n一覧にはGrid、カード内には縦方向のFlexboxを採用しました。  \nラテの1件だけに素材台帳の教材用生成画像を使い、実商品の写真とは区別しました。  \n1件・4件・7件、長い名前と説明、390pxを確認しました。  \n試験データを正式な4商品に戻し、一覧へのアンカーを確認しました。  \n実商品写真、人気商品の指定と順序は依頼者への確認待ちです。\n');
    run('diff','--stat');run('add','.');run('commit','-m','DAY'+d+'の制作と表示確認を記録');run('tag',dd+'-end');run('status','--short');run('bundle','create',bundle,'--all');run('bundle','verify',bundle);
    log+='$ git clone demo-'+dd+'.bundle restored-'+dd+'\n';execFileSync('git',['clone',bundle,restored],{encoding:'utf8',windowsHide:true});
    const restoredHead=execFileSync('git',['-C',restored,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
    if(restoredHead!==git('rev-parse','HEAD'))throw Error('Restored HEAD mismatch');
    for(const f of ['index.html','menu.html','about.html','css/style.css','images/hero-cafe.webp'])if(hash(path.join(site,f))!==hash(path.join(restored,'hht/starter-site',f)))throw Error('Restored file mismatch');
    log+='復元成功：HEAD一致、HTML 3ページ・CSS・画像のSHA-256一致\n';report.checks.push({day:d,bundle:path.basename(bundle),restoredHead,status:'PASS'});
   }return res.end(log.replaceAll(out,'<動画フォルダー>'));
  }
  let base=hht,rel=decodeURIComponent(u.pathname.slice(1));
  if(rel.startsWith('site/')){base=site;rel=rel.slice(5)}
  if(rel.startsWith('restored-day0')){const m=rel.match(/^(restored-day0[56])\/(.*)$/);base=path.join(out,m[1],'hht/starter-site');rel=m[2]}
  const f=contained(base,rel);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};res.setHeader('Content-Type',types[path.extname(f)]||'text/plain; charset=utf-8');res.end(fs.readFileSync(f));
 }catch(e){res.statusCode=500;res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));global.base='http://127.0.0.1:'+server.address().port;
 fs.mkdirSync(path.join(out,'evidence'),{recursive:true});
 if(!resumeDay6)await day5();await day6();
 for(const f of Object.keys(report.sources))if(hash(path.join(hht,f))!==report.sources[f])throw Error('Course changed during capture: '+f);
 report.status='PASS';
}
async function showApp(){await page.goto(base);await page.evaluate(async(d)=>{currentDay=d;docs.innerHTML=await(await fetch('/docs?day='+d)).text();for(const img of docs.querySelectorAll('img'))img.src=new URL(img.getAttribute('src'),location.origin+'/docs/workbook/').href;document.getElementById('title').textContent=d===5?'DAY 5 / 全ページの上と下をそろえる':'DAY 6 / 人気メニューを見つけやすくする';},day);}
async function begin(d){day=d;started=Date.now();context=await chromium.launchPersistentContext(path.join(out,'browser-profile-day'+d),{headless:false,viewport:{width:1920,height:1080},args:['--window-size=1920,1200','--window-position=0,0'],recordVideo:{dir:path.join(out,'raw'),size:{width:1920,height:1080}},locale:'ja-JP'});browser=context.browser();page=context.pages()[0];video=page.video();await showApp();await page.screenshot({path:path.join(out,'day0'+d+'-opening.png')});}
async function caption(step,text,ms=5000){report.chapters.push({day,seconds:Math.round((Date.now()-started)/1000),step,text});await page.evaluate(({step,text})=>{document.getElementById('step').textContent=step;document.getElementById('caption').textContent=text},{step,text});console.log('DAY'+day+' '+step);await page.waitForTimeout(ms);saveJson();}
async function doc(text){await page.locator('#docs').evaluate((el,text)=>{const target=[...el.querySelectorAll('h1,h2,h3,h4,strong,summary')].find(x=>x.textContent.includes(text));if(!target)throw Error('Missing documentation '+text);el.scrollTo({top:target.offsetTop-el.offsetTop-22,behavior:'smooth'});},text);await page.waitForTimeout(1200);}
async function file(name,find){await page.click('#codeTab');await page.selectOption('#files',name);await page.waitForTimeout(400);if(find)await page.locator('#code').evaluate((el,s)=>{let at=el.value.indexOf(s);if(at<0)throw Error('Not found '+s);el.focus();el.setSelectionRange(at,at+s.length);el.scrollTop=Math.max(0,el.value.slice(0,at).split('\n').length-4)*34.65;},find);}
async function replace(old,text){await page.locator('#code').evaluate((el,s)=>{const at=el.value.indexOf(s);if(at<0)throw Error('Missing edit '+s);el.focus();el.setSelectionRange(at,at+s.length);el.scrollTop=Math.max(0,el.value.slice(0,at).split('\n').length-4)*34.65;},old);await page.waitForTimeout(2000);await page.locator('#code').pressSequentially(text,{delay:22});await page.waitForTimeout(2000);await page.click('#save');await page.waitForFunction(()=>saved.textContent.includes('✓'));}
async function preview(name){await page.click('#previewTab');await page.selectOption('#pages',name);await page.click('#reload');await page.frameLocator('#frame').locator('main').waitFor();await page.waitForTimeout(1000);}
function frame(){return page.frames().find(f=>f.url().includes('/site/'));}
async function shot(name){const p=path.join(out,'evidence',name+'.png');await frame().page().locator('#frame').screenshot({path:p});}
async function end(){await page.screenshot({path:path.join(out,'day0'+day+'-closing.png')});const recordedPath=await video.path();await context.close();fs.copyFileSync(recordedPath,path.join(out,'day0'+day+'-raw.webm'));}
async function finishGit(){await page.click('#recordTab');await page.click('#finishGit');await page.waitForFunction(()=>terminal.textContent.includes('復元成功'));await page.locator('#record').evaluate(el=>el.scrollTop=el.scrollHeight);await caption('記録と提出','制作・証拠をコミット。bundleを検査し、別フォルダーに復元しました。',10000);for(const name of ['index.html','menu.html','about.html']){await page.evaluate(({url})=>{tab('preview');frame.src=url},{url:base+'/restored-day0'+day+'/'+name});await page.waitForTimeout(1000);const f=page.frames().find(f=>f.url().includes('restored-day'));if(!f)throw Error('No restored page');await f.locator('main').waitFor();const links=await f.locator('nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));if(links.join(',')!=='index.html,menu.html,about.html')throw Error('Restored links');report.checks.push({day,restoredPage:name,status:'PASS'});} }
async function day5(){
 await begin(5);await caption('依頼を読む','佐藤さんの依頼：どのページからも、同じ案内で移動できるようにする。',11000);
 await doc('変える場所');await caption('範囲を決める','対象は3ページの上下と共通CSS。本文・価格・前回のボタンは残します。',10000);
 await page.click('#recordTab');await page.click('#startGit');await page.waitForFunction(()=>terminal.textContent.includes('student/demo'));await caption('開始を記録','DAY4までの継続コピーを使い、day05-startから作業します。',8000);
 await doc('① まず3ページ');for(const n of ['index.html','menu.html','about.html']){await preview(n);await caption('① 3ページを比較',n+'：リンクの名前・順番・現在地を確認。すでに一致する部分は残します。',5500);await frame().locator('footer').scrollIntoViewIfNeeded();await page.waitForTimeout(2200);}
 await doc('② 「文字の内側');await file('css/style.css','.nav-list {');await caption('② 余白を調整','gapはリンク同士の間。paddingはリンクの内側の押せる範囲です。',8500);
 await replace('gap: 0.5rem 1.25rem;','gap: .5rem;');
 await replace('.nav-list [aria-current="page"] {','.nav-list a {\n  display: block;\n  padding: .5rem .75rem;\n  border-radius: .25rem;\n}\n\n.nav-list [aria-current="page"] {\n  background: #e2eee7;');
 await preview('menu.html');await caption('保存して確認','文字の周りにも押せる余白ができ、現在地のメニューに背景が付きました。',8500);
 await doc('③ 共通の案内');for(const n of ['index.html','menu.html','about.html']){await file(n,'aria-current="page"');await caption('③ 現在地を確認',n+'：aria-currentは、そのページのリンク1件だけに付けます。',5000);}
 await file('css/style.css','.site-footer {');await replace('  text-align: center;\n}','  text-align: center;\n}\n\n.site-footer p {\n  margin: 0;\n}');
 await doc('④ キーボード');await preview('index.html');await page.click('#wide');
 await frame().locator('body').click({position:{x:8,y:8}});await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await caption('④ TabとEnter','Tabでメニューへ。フォーカス枠と現在地の印は、別の役割です。',7000);await page.keyboard.press('Enter');await page.waitForTimeout(1500);if(!frame().url().includes('menu.html'))throw Error('Keyboard navigation failed');await page.keyboard.press('Shift+Tab');await caption('④ Shift+Tab','Enterでメニューへ移動できました。Shift+Tabで前のリンクへ戻ります。',5000);
 for(const n of ['index.html','menu.html','about.html']){await preview(n);await frame().locator('a[aria-current="page"]').focus();await shot('day05-'+n.split('.')[0]+'-desktop');await page.click('#mobile');await caption('④ 狭い画面',n+' / 390px。折り返しても、リンクの文字と枠が重ならないか確認。',5000);const f=frame();const overflow=await f.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Mobile overflow');await shot('day05-'+n.split('.')[0]+'-390');await page.click('#wide');}
 // Change the browser's real default zoom through its own settings, in this owned profile.
 await caption('④ ブラウザ200%','ブラウザの表示倍率を200%にして、3ページの案内を確認します。',3000);
 await page.goto('chrome://settings/appearance');await page.waitForTimeout(2000);await page.evaluate(()=>chrome.settingsPrivate.setDefaultZoom(2));const actualZoom=await page.evaluate(()=>chrome.settingsPrivate.getDefaultZoom());if(actualZoom!==2)throw Error('Browser zoom not 200%');await page.waitForTimeout(3500);
 for(const n of ['index.html','menu.html','about.html']){await page.goto(base+'/site/'+n);await page.waitForTimeout(5500);const metrics=await page.evaluate(()=>({dpr:devicePixelRatio,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth}));if(metrics.overflow||metrics.dpr<1.9)throw Error('Zoom check failed');await page.screenshot({path:path.join(out,'evidence','day05-'+n.split('.')[0]+'-200percent.png')});report.checks.push({day:5,page:n,browserZoom:actualZoom,zoom:metrics,status:'PASS'});}
 await page.goto('chrome://settings/appearance');await page.evaluate(()=>chrome.settingsPrivate.setDefaultZoom(1));await page.waitForTimeout(1500);await showApp();
 await doc('記録して');await caption('変更報告を書く','3ページの移動・Tab・390px・200%を確認。本文と商品情報は保持しました。',9000);
 await finishGit();await caption('DAY 5 完了','次はこの終了状態を引き継ぎ、商品カードの一覧を整えます。',7000);await end();
}
async function day6(){
 git('tag','day06-start');await begin(6);await caption('依頼を読む','佐藤さんの依頼：人気メニューを写真付きで見やすく。長い説明も読めるように。',11000);
 await doc('残すもの');await caption('変える場所と確認事項','DAY5の結果を継続。商品名・価格・案内は保持し、人気の順序と実写真は確認待ち。',10000);
 await page.click('#recordTab');await page.click('#startGit');await page.waitForFunction(()=>terminal.textContent.includes('day06-start'));await caption('開始を記録','day05-endと同じ制作ファイルへ、day06-startを付けました。',6500);
 await doc('① 商品と写真');await preview('menu.html');await caption('① 開始状態を見る','4商品の名前・説明・価格を確認。既存のカードとGridを生かします。',8000);
 await doc('写真がまだない');await caption('画像の扱いを確認','ラテアートの教材用生成画像で練習します。他3商品の写真を仮の別商品で埋めません。',11000);
 await doc('② 1商品へ画像');await file('menu.html','<h2>ホットカフェラテ</h2>');await replace('          <h2>ホットカフェラテ</h2>','          <img src="images/hero-cafe.webp" width="1774" height="887"\n               alt="ラテアートを作る手元（教材用の生成画像）">\n          <h2>ホットカフェラテ</h2>');
 await file('css/style.css','.menu-card h2');await replace('.menu-card h2 {','.menu-card img {\n  display: block;\n  width: 100%;\n  height: auto;\n}\n\n.menu-card h2 {');await preview('menu.html');await caption('② 保存して表示','画像・商品名・説明・価格を、同じarticleの中へ入れました。',7500);
 await doc('③ まず既存');await file('css/style.css','.menu-grid {');await caption('③ Gridを調整','一覧の親が列を決めます。狭い幅は1列、42rem以上は2列にします。',8500);
 await replace('.menu-grid {\n  display: grid;','.menu-grid {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);');
 await replace('grid-template-columns: repeat(2, 1fr);','grid-template-columns: repeat(2, minmax(0, 1fr));');
 await replace('.menu-card {\n  padding:','.menu-card {\n  min-width: 0;\n  overflow-wrap: anywhere;\n  display: flex;\n  flex-direction: column;\n  padding:');
 await doc('同じ行の価格');await page.locator('#docs summary').filter({hasText:'同じ行の価格'}).click();await caption('カード内はFlexbox','価格の上に余った空間を集めます。固定の高さで説明を切りません。',8000);
 await replace('.price {\n  font-weight: 800;\n}','.price {\n  font-weight: 800;\n}\n\n.menu-card .price {\n  margin-top: auto;\n  padding-top: 1rem;\n}');
 const formal=fs.readFileSync(path.join(site,'menu.html'),'utf8');const cards=[...formal.matchAll(/        <article class="menu-card">[\s\S]*?        <\/article>/g)].map(m=>m[0]);if(cards.length!==4)throw Error('Expected four cards');
 await doc('④ 長い文章');await file('menu.html','<h2>ラテ＆スコーンセット</h2>');await caption('④ 練習コピーで負荷試験','1商品を長い名前・説明へ変更。正式な内容は保存して、最後に戻します。',8500);
 await replace('ラテ＆スコーンセット','季節のフルーツを添えた、焼きたてスコーンのセット（試験用）');
 await replace('ホットまたはアイスのラテを選べます。','焼きたてのスコーンに、季節のフルーツを添えました。\n            ホットまたはアイスのラテを選べます。\n            フルーツは季節によって変わります。詳しくはスタッフへお尋ねください。');
 const stress=fs.readFileSync(path.join(site,'menu.html'),'utf8');const stressCards=[...stress.matchAll(/        <article class="menu-card">[\s\S]*?        <\/article>/g)].map(m=>m[0]);const block=stressCards.join('\n');
 await preview('menu.html');await caption('④ 4件で確認','4件：長い商品名・説明が、価格や隣のカードと重ならないか確認。',8500);await shot('day06-4items');
 for(const count of [1,7]){
  await file('menu.html');const now=await page.inputValue('#code');const old=[...now.matchAll(/        <article class="menu-card">[\s\S]*?        <\/article>/g)].map(m=>m[0]).join('\n');
  const chosen=count===1?[stressCards[3]]:[...stressCards,...stressCards.slice(0,3)];
  // Actual editor input, saving complete article groups; no parent id is duplicated.
  await page.locator('#code').evaluate((el,{old,repl})=>{const at=el.value.indexOf(old);if(at<0)throw Error('Card block');el.focus();el.setSelectionRange(at,at+old.length);el.setRangeText(repl,at,at+old.length,'select');el.dispatchEvent(new Event('input',{bubbles:true}));el.scrollTop=Math.max(0,el.value.slice(0,at).split('\n').length-3)*34.65;},{old,repl:chosen.join('\n')});
  await caption('④ '+count+'件に変更','articleの開始から終了までを1組として'+(count===1?'1件だけ残します。':'複製します。親のid="menu-list"は1個のままです。'),6500);await page.click('#save');await preview('menu.html');
  if(await frame().locator('.menu-card').count()!==count)throw Error('Card count');
  await caption('④ '+count+'件の表示',count+'件：カードの折り返しと、商品情報のまとまりを見ます。',8000);await shot('day06-'+count+'items');
 }
 await page.click('#mobile');await caption('④ 390pxの表示','7件・長い内容で確認。スマホ幅では1列になり、HTMLの順で読めます。',11000);
 const mobile=await frame().evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(document.querySelector('.menu-grid')).gridTemplateColumns}));if(mobile.overflow||mobile.columns.includes(' '))throw Error('Mobile layout');await shot('day06-7items-390');
 await frame().locator('.menu-card').nth(3).scrollIntoViewIfNeeded();await caption('④ 長いカードの末尾','説明を削らず、価格まで同じカードの中に収まっていることを確認。',7500);await shot('day06-long-card-390');
 await doc('⑤ 試験データ');await file('menu.html');await page.locator('#code').fill(formal);await caption('⑤ 正式な4商品へ戻す','試験用の追加商品と長い名前を戻します。画像とCSSの改善は残します。',7500);await page.click('#save');await preview('menu.html');await page.click('#wide');
 await frame().getByRole('link',{name:'メニューを見る',exact:true}).click();await page.waitForTimeout(1800);if(!frame().url().includes('#menu-list'))throw Error('Anchor navigation');await shot('day06-formal-4items');
 const finalInfo=await frame().locator('.menu-card').evaluateAll(a=>a.map(x=>({name:x.querySelector('h2').textContent,price:x.querySelector('.price').textContent})));report.checks.push({day:6,mobile,finalInfo,status:'PASS'});
 await caption('⑤ 結果と確認待ちを報告','Gridは列幅、Flexboxはカード内の縦配置。実写真・人気の指定は佐藤さんへ確認待ちです。',10000);
 await finishGit();await caption('DAY 6 完了','4商品へ復元済み。制作ファイル・画像・証拠・報告をbundleへ記録しました。',8500);await end();
}
main().catch(e=>{report.status='FAIL';report.error=e.stack;console.error(e);process.exitCode=1}).finally(async()=>{try{if(context)await context.close();if(browser)await browser.close();if(launch)await launch.close();report.cleanup='PASS';}catch(e){report.cleanup=String(e)}if(server)await new Promise(r=>server.close(r));for(const f of Object.keys(report.sources))report.sources[f]={before:report.sources[f],after:hash(path.join(hht,f))};saveJson();console.log('FINISHED '+report.status+' cleanup='+report.cleanup);});

