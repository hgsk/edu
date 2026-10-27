(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const models = globalThis.MathModels;
  const lessons = globalThis.MATH_LESSONS;
  const canvas = $('#scene'), ctx = canvas.getContext('2d');
  const colors = ['#08695f','#bb512c','#3c70b1','#becbbd','#ae3875'];
  let current, values=[], controls=[], mode='default', progress=1, running=false, lastTime=0, animation=0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function inline(text) {
    return escape(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>{
      // Workbook-relative links are resolved from its original location.
      const prefix = ['../../../math/', '../../math/'].find(value => url.startsWith(value));
      if (!prefix) return label;
      return `<a href="${url.slice(prefix.length)}">${label}</a>`;
    });
  }
  function markdown(text) {
    return text.split(/\n\s*\n/).map(block => {
      if (block.startsWith('```')) return `<pre><code>${escape(block.replace(/^```[^\n]*\n?|\n?```$/g,''))}</code></pre>`;
      if(block.split('\n').every(line=>line.startsWith('- ')))return `<ul>${block.split('\n').map(line=>`<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${inline(block).replaceAll('\n','<br>')}</p>`;
    }).join('');
  }
  function shortTitle(lesson) { return lesson.title.split('：')[0]; }
  function navigation() {
    const query=$('#search').value.trim().toLowerCase();
    const matches=lessons.filter(l=>(l.id+' '+l.title+' '+l.body).toLowerCase().includes(query));
    $('#lesson-nav').innerHTML=['B','A'].map(group=>{
      const list=matches.filter(l=>l.id[0]===group);
      return list.length?`<p class="nav-group">${group==='B'?'基礎 / FOUNDATION':'応用 / ENGINEERING'}</p>`+list.map(l=>`<a class="lesson-link" href="#${l.id}" ${current?.id===l.id?'aria-current="page"':''}><span>${l.id}</span><span>${escape(shortTitle(l))}</span></a>`).join(''):'';
    }).join('');
    $('#search-count').textContent=query?`${matches.length} / 28 単元`:'全28単元';
  }
  function stop() {
    running=false;cancelAnimationFrame(animation);$('#play').textContent='▶ 解説を再生';$('#play').setAttribute('aria-pressed','false');
  }
  function frame(now) {
    if(!running)return;
    if(lastTime)progress=Math.min(1,progress+(now-lastTime)/6000*Number($('#speed').value));
    lastTime=now;render();
    if(progress>=1)stop();else animation=requestAnimationFrame(frame);
  }
  function parameterControls() {
    $('#parameters').innerHTML=controls.map((c,i)=>`<div class="parameter"><label for="parameter-${i}">${escape(c.label)}<output id="value-${i}" for="parameter-${i}">${models.fmt(values[i])}${c.unit}</output></label><input id="parameter-${i}" data-index="${i}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${values[i]}"></div>`).join('');
  }
  function changeExperiment(nextMode,preset) {
    stop();mode=nextMode;controls=models.getControls(current.id,mode);
    const requested=preset?[preset.a,preset.b,...(preset.extra||[])]:[];
    values=controls.map((c,i)=>requested[i]??c.value);progress=preset?.p??1;
    $('#experiment').value=mode;parameterControls();render();
  }
  function loadLesson() {
    stop();
    const id=location.hash.slice(1).toUpperCase();
    current=lessons.find(l=>l.id===id)||lessons[0];
    if(id!==current.id)history.replaceState(null,'',`#${current.id}`);
    const teaching=globalThis.MATH_TEACHING[current.id],experiments=models.getExperiments(current.id);
    mode=experiments[0].id;controls=models.getControls(current.id,mode);values=controls.map(c=>c.value);progress=1;
    $('#unit-id').textContent=current.id;$('#category').textContent=current.id[0]==='B'?'基礎数学':'工学への応用';
    $('#lesson-title').textContent=current.title;document.title=`${current.id} ${shortTitle(current)}｜edu 数学`;
    const request=current.body.match(/\*\*依頼：\*\*([^\n]+)/);
    $('#request').innerHTML=request?`<p><strong>今日の依頼</strong>　${inline(request[1])}</p>`:'';
    $('#learning-level').textContent=teaching.level;
    $('#prerequisites').innerHTML=teaching.prerequisites.length?'先に確認：'+teaching.prerequisites.map(id=>`<a href="#${id}">${id} ${escape(shortTitle(lessons.find(l=>l.id===id)))}</a>`).join(' / '):'算数の足し算・引き算から始められます。';
    $('#glossary').innerHTML=teaching.words.map(([term,meaning])=>`<dt>${escape(term)}</dt><dd>${escape(meaning)}</dd>`).join('');
    $('#experiment').innerHTML=experiments.map(e=>`<option value="${e.id}">${escape(e.label)}</option>`).join('');
    $('#presets').innerHTML=teaching.presets.map((p,i)=>`<button type="button" data-preset="${i}">${escape(p.label)}</button>`).join('');
    $('#lesson-content').innerHTML=markdown(current.body.replace(/^\*\*(読み取り確認|確認値|確かめ方)：\*\* .+\n?/gm,''));
    $('#check-question').textContent=current.check.question;$('#check-answer').value='';$('#check-feedback').textContent='';delete $('#check-feedback').dataset.correct;
    $('#reasoning-section').hidden=!current.reasoning.length;
    $('#reasoning-cases').innerHTML=current.reasoning.map((item,i)=>`<article class="reasoning-case"><h3>${escape(item.title)}</h3><p>${inline(item.question)}</p><form data-reasoning="${i}"><fieldset><legend>適切な判断を一つ選んでください</legend>${['A','B','C'].map(letter=>`<label class="reasoning-option"><input type="radio" name="reasoning-${i}" value="${letter}" required><span><strong>${letter}</strong> ${inline(item[letter])}</span></label>`).join('')}</fieldset><label for="reason-${i}">条件・短い具体計算・検算など、判断の理由</label><textarea id="reason-${i}" rows="3" required placeholder="どの条件を使い、何を確かめたかを書きます。"></textarea><button type="submit">解説と照合する</button><p class="reasoning-save small" role="status">記述と選択はこのブラウザに保存します。提出用の解答メモにも残してください。</p><p class="reasoning-feedback" role="status"></p></form><details class="reasoning-rubric"><summary>評価の観点</summary><ul>${item.rubric.split('；').map(point=>`<li>${inline(point)}</li>`).join('')}</ul><p class="small">各観点を「説明できる／見直しが必要／未確認」で振り返り、提出用の解答メモへ残します。</p></details></article>`).join('');
    for(const form of document.querySelectorAll('form[data-reasoning]')){
      const item=current.reasoning[Number(form.dataset.reasoning)];
      try{const saved=JSON.parse(localStorage.getItem(`edu-math-reason-${current.id}-${item.title}`)||'null');if(saved&&typeof saved.reason==='string')form.querySelector('textarea').value=saved.reason;if(saved&&['A','B','C'].includes(saved.choice))form.querySelector(`input[value="${saved.choice}"]`).checked=true;}
      catch{form.querySelector('.reasoning-save').textContent='ブラウザ保存を利用できません。記述は別の場所へコピーしてください。';}
    }
    parameterControls();navigation();
    const index=lessons.indexOf(current);$('#previous').disabled=index===0;$('#next').disabled=index===lessons.length-1;$('#position').textContent=`${index+1} / ${lessons.length}`;
    try{$('#memo').value=localStorage.getItem(`edu-math-${current.id}`)||'';$('#memo-status').textContent='メモはこのブラウザに保存されます。提出・採点は行いません。';}
    catch{$('#memo').value='';$('#memo-status').textContent='ブラウザ保存を利用できません。メモは別の場所へコピーしてください。';}
    if(matchMedia('(max-width:700px)').matches)$('#navigation').open=false;
    render();
  }
  function text(str,x,y,color='#36534b',size=23,align='left') {
    if(canvas.getBoundingClientRect().width<500)size=Math.max(size,/^[\d.,−-]{8,}$/.test(str)?22:29);
    ctx.fillStyle=color;ctx.font=`${size}px "Yu Gothic UI",Meiryo,sans-serif`;ctx.textAlign=align;ctx.fillText(str,x,y);
  }
  function line(a,b,color,width=3,dash=[]) {
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.setLineDash([]);
  }
  function circle(x,y,r,color,fill=true,width=3) {
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=color;ctx.fill();}else{ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();}
  }
  function arrow(from,to,color,width=5) {
    line(from,to,color,width);const angle=Math.atan2(to[1]-from[1],to[0]-from[0]),head=15;
    if(Math.hypot(to[0]-from[0],to[1]-from[1])<2){circle(...to,5,color);return;}
    ctx.beginPath();ctx.fillStyle=color;ctx.moveTo(...to);ctx.lineTo(to[0]-head*Math.cos(angle-.4),to[1]-head*Math.sin(angle-.4));ctx.lineTo(to[0]-head*Math.cos(angle+.4),to[1]-head*Math.sin(angle+.4));ctx.closePath();ctx.fill();
  }
  function legend(items,y=36) {
    let x=38;for(const item of items){line([x,y-7],[x+24,y-7],colors[item.color||0],4);text(item.label,x+34,y,'#36534b',20);x+=ctx.measureText(item.label).width+65;}
  }
  function axisTicks(min,max,count=5){
    const raw=(max-min)/count,power=10**Math.floor(Math.log10(raw)),ratio=raw/power;
    const step=(ratio<=1?1:ratio<=2?2:ratio<=5?5:10)*power;
    const values=[];for(let i=Math.ceil(min/step-1e-9);i<=Math.floor(max/step+1e-9);i++)values.push(i*step);
    return {step,values};
  }
  const axisFormat=value=>value!==0&&Math.abs(value)<.001?value.toExponential(0):models.fmt(value,3);
  function plot(bounds, equal=false) {
    let [xmin,xmax,ymin,ymax]=bounds;
    if(xmin===xmax)xmax=xmin+1;if(ymin===ymax)ymax=ymin+1;
    const left=96,right=950,top=85,bottom=505;
    if(equal){const s=Math.min((right-left)/(xmax-xmin),(bottom-top)/(ymax-ymin)),cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;xmin=cx-(right-left)/s/2;xmax=cx+(right-left)/s/2;ymin=cy-(bottom-top)/s/2;ymax=cy+(bottom-top)/s/2;}
    const project=([x,y])=>[left+(x-xmin)/(xmax-xmin)*(right-left),bottom-(y-ymin)/(ymax-ymin)*(bottom-top)];
    const count=canvas.getBoundingClientRect().width<500?3:6,yTicks=axisTicks(ymin,ymax,count);
    const xTicks=equal?(()=>{const values=[];for(let i=Math.ceil(xmin/yTicks.step);i<=Math.floor(xmax/yTicks.step);i++)values.push(i*yTicks.step);return{values};})():axisTicks(xmin,xmax,count);
    for(const x of xTicks.values){const px=project([x,0])[0];line([px,top],[px,bottom],'#dce4d8',1);text(axisFormat(x),px,bottom+34,'#6a7c70',18,'center');}
    for(const y of yTicks.values){const py=project([0,y])[1];line([left,py],[right,py],'#dce4d8',1);text(axisFormat(y),left-15,py+6,'#6a7c70',18,'right');}
    if(ymin<=0&&ymax>=0)line(project([xmin,0]),project([xmax,0]),'#a6b6a7',2);
    if(xmin<=0&&xmax>=0)line(project([0,ymin]),project([0,ymax]),'#a6b6a7',2);
    return project;
  }
  function graph(m) {
    const points=m.series.flatMap(s=>s.points),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const smallErrors=m.id==='B18'&&m.experiment==='approximation';
    const ymax=Math.max(smallErrors?1e-12:1,...ys),ymin=Math.min(0,...ys),pad=(ymax-ymin)*.13;
    const project=plot([Math.min(0,...xs),Math.max(smallErrors?.02:1,...xs),ymin<0?ymin-pad:0,ymax+pad]);
    if(m.area){const pts=m.series[0].points.filter(v=>v[0]<=m.area);pts.push(m.marker);ctx.beginPath();ctx.moveTo(...project([0,0]));for(const point of pts)ctx.lineTo(...project(point));ctx.lineTo(...project([m.area,0]));ctx.closePath();ctx.fillStyle='#08695f22';ctx.fill();}
    for(const s of m.series){ctx.beginPath();ctx.strokeStyle=colors[s.color];ctx.lineWidth=4;for(let i=0;i<s.points.length;i++){const p=project(s.points[i]);if(i)ctx.lineTo(...p);else ctx.moveTo(...p);}ctx.stroke();if(s.points.length<25)for(const v of s.points)circle(...project(v),5,colors[s.color]);}
    if(m.marker){const pt=project(m.marker);circle(...pt,14,'#08695f22');circle(...pt,7,colors[0]);}
    if(m.intersections)for(const point of m.intersections){const pt=project(point);circle(...pt,11,colors[4]);text(`(${point.map(x=>models.fmt(x)).join(', ')})`,pt[0]+15,pt[1]-17,colors[4],22);}
    legend(m.series);
    const names={B02:['時間 (秒)','距離 (m)'],B03:['時間 (秒)','HP'],B06:['時間 (秒)','高さ (m)'],B15:['段階','値'],B16:['時間 (秒)','速度 (m/s)'],A06:['時間 (秒)','位置 (m)'],A07:['時間 (秒)','位置'],A08:['サンプル番号','入力・出力']};
    const labels=m.axisLabels||(m.id==='B18'&&m.experiment==='approximation'?['u（0以上）','絶対誤差']:(m.id==='B06'&&m.experiment!=='default'||m.id==='B03'&&m.experiment!=='default')?['x','y']:names[m.id]||['入力','出力']);text(labels[0],950,580,'#566e61',20,'right');text(labels[1],96,70,'#566e61',18);
  }
  function flow(m){
    const active=Math.min(m.steps.length-1,Math.floor(m.p*m.steps.length));
    function wrapped(value,x,y,maxWidth,size,color){
      ctx.font=`${size}px sans-serif`;let row='',lineY=y;
      for(const ch of String(value)){if(ctx.measureText(row+ch).width>maxWidth){text(row,x,lineY,color,size);row='';lineY+=size+7;}row+=ch;}
      if(row)text(row,x,lineY,color,size);
    }
    text(`計算の段階 ${active+1} / ${m.steps.length}`,65,48,colors[0],24);
    m.steps.forEach((step,i)=>{
      const y=78+i*165;ctx.fillStyle=i===active?'#d9ece2':'#f3f6ef';ctx.beginPath();ctx.roundRect(50,y,900,148,10);ctx.fill();
      text(step.label,75,y+32,i===active?colors[0]:'#52695b',24);
      wrapped(step.value,75,y+71,850,27,colors[0]);
      wrapped(step.detail,75,y+118,850,18,'#52695b');
    });
  }
  function vectors(m) {
    const pts=m.vectors.flatMap(v=>[v.from,v.to]);if(m.dots)pts.push(...m.dots.map(d=>d.point));
    const bound=Math.max(3,...pts.flat().map(Math.abs)) *1.3;
    const project=plot([-bound,bound,-bound,bound],true);
    if(m.type==='circle'){const center=project([0,0]),edge=project([m.radius,0]);circle(...center,Math.abs(edge[0]-center[0]),'#afc9b1',false,3);}
    for(const v of [...m.vectors].reverse()){arrow(project(v.from),project(v.to),colors[v.color]);const to=project(v.to);circle(...to,6,colors[v.color]);}
    if(m.dots)for(const d of m.dots){const pt=project(d.point);circle(...pt,7,colors[2]);text(d.label,pt[0]+12,pt[1]-12,colors[2],22);}
    legend(m.vectors);text('x',950,565,'#6a7c70',22,'right');text('y',100,70,'#6a7c70',22);
  }
  function bars(m) {
    const max=Math.max(1,...m.bars.map(b=>b.value),m.mean||0),min=Math.min(0,...m.bars.map(b=>b.value)),n=m.bars.length;
    const left=105,right=945,top=95,bottom=490,slot=(right-left)/n;
    const yFor=value=>bottom-(value-min)/(max-min)*(bottom-top)*.85;
    for(const value of axisTicks(min,max,4).values){const y=yFor(value);line([left,y],[right,y],'#dce4d8',1);text(models.fmt(value,3),left-15,y+6,'#6a7c70',20,'right');}
    line([left,yFor(0)],[right,yFor(0)],'#91a58f',2);
    for(let i=0;i<n;i++){
      const b=m.bars[i],barWidth=Math.min(140,slot*.6),x=left+i*slot+(slot-barWidth)/2,y=yFor(b.value),zero=yFor(0);
      ctx.fillStyle=colors[b.color];ctx.beginPath();ctx.roundRect(x,Math.min(y,zero),barWidth,Math.max(1,Math.abs(y-zero)),4);ctx.fill();text(models.fmt(b.value),x+barWidth/2,b.value<0?y+28:y-14,colors[b.color],24,'center');text(b.label,x+barWidth/2,bottom+38,'#466352',20,'center');
    }
    if(m.mean!==undefined){const y=yFor(m.mean);line([left,y],[right,y],colors[4],3,[10,8]);text(`平均 ${models.fmt(m.mean)}`,right,y-12,colors[4],22,'right');}
    text(m.id==='B12'?'率 (%)':m.id==='B13'?'時間 (分)':m.id==='B14'?'必要経験値':'HP',105,60,'#56705f',21);
  }
  function logic(m) {
    const op=m.operator||'AND',single=op==='NOT',opened=single?!m.logic[0]:op==='OR'?m.logic.some(Boolean):m.logic.every(Boolean);
    const locations=[[220,single?310:220],[220,400],[750,310]],labels=[`鍵：${values[0]?'あり':'なし'}`,`レベル ${values[1]} ≥ 5`,m.result],active=[...m.logic];active[2]=opened;
    for(let i=0;i<(single?1:2);i++)line([350,locations[i][1]],[620,310],m.logic[i]?colors[0]:'#bdcbbb',5);
    for(let i=0;i<3;i++){if(single&&i===1)continue;const [x,y]=locations[i];ctx.fillStyle=active[i]?'#daebdc':'#e6eae0';ctx.strokeStyle=active[i]?colors[0]:'#b6c4b2';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-140,y-55,280,110,14);ctx.fill();ctx.stroke();text(labels[i],x,y+8,active[i]?colors[0]:'#607561',26,'center');}
    text(op,490,300,colors[0],28,'center');text(single?'鍵の条件を反転する':op==='OR'?'どちらか一方の条件が真なら開く':'両方の条件が真のときだけ開く',500,540,'#5b715f',25,'center');
    circle(350+270*m.p,locations[0][1]+(310-locations[0][1])*m.p,8,m.logic[0]?colors[0]:'#bdcbbb');if(!single)circle(350+270*m.p,400-90*m.p,8,m.logic[1]?colors[0]:'#bdcbbb');
  }
  function circles(m) {
    const bound=Math.max(6,m.distance/2+Math.max(2,m.radius)+1);const project=plot([-bound,bound,-bound*.7,bound*.7],true),a=[-m.distance/2,0],b=[m.distance/2,0];
    const draw=(point,r,color)=>{const pt=project(point),edge=project([point[0]+r,0]);circle(...pt,Math.abs(edge[0]-pt[0]),color+'20');circle(...pt,Math.abs(edge[0]-pt[0]),color,false,4);circle(...pt,5,color);};
    draw(a,2,colors[0]);draw(b,m.radius,colors[1]);line(project(a),project(b),'#71877a',3,[7,7]);legend([{label:'円A：半径2',color:0},{label:`円B：半径${m.radius}`,color:1}]);text(`中心間距離 ${models.fmt(m.distance)} ／ 半径の和 ${models.fmt(2+m.radius)}`,500,575,'#466353',24,'center');
  }
  function combinations(m) {
    const cols=Math.min(15,Math.ceil(Math.sqrt(m.total*2))),rows=Math.ceil(m.total/cols),cell=Math.min(68,750/cols,350/rows),sx=(1000-cols*cell)/2,sy=130;
    for(let i=0;i<m.total;i++){ctx.fillStyle=i<m.revealed?colors[0]:'#dce6d8';ctx.beginPath();ctx.roundRect(sx+i%cols*cell+4,sy+Math.floor(i/cols)*cell+4,cell-8,cell-8,4);ctx.fill();if(cell>35)text(`${i+1}`,sx+i%cols*cell+cell/2,sy+Math.floor(i/cols)*cell+cell*.65,i<m.revealed?'#fff':'#566b59',20,'center');}
    text(`${m.revealed} / ${m.total} 組を数える`,500,550,colors[0],28,'center');text('各マスは順序を区別しない一つの組合せ',500,65,'#536d5c',23,'center');
    const selected=m.revealed?m.items[m.revealed-1]:null;text(selected?`現在の組：${selected.map(n=>`カード${n}`).join(' + ')}`:'まだ組を表示していません',500,100,colors[0],23,'center');
  }
  function bits(m) {
    const bits=m.bits.split('');for(let i=0;i<6;i++){const x=115+i*135,active=bits[i]==='1';ctx.fillStyle=active?'#d4e8d5':'#e7ebdf';ctx.beginPath();ctx.roundRect(x-30,190,110,130,12);ctx.fill();text(bits[i],x+25,275,active?colors[0]:'#8a9a84',48,'center');text(`${2**(5-i)}`,x+25,365,'#526c5b',25,'center');if(i<=Math.floor(m.p*5))line([x-5,390],[x+55,390],active?colors[0]:'#b9c7b0',5);}
    text('二進数：点灯している桁の重みを合計する',500,95,'#496853',27,'center');text(`重みの合計 = ${values[0]}   ／   ${values[1]}で割った余り = ${m.mod}`,500,485,colors[0],28,'center');
  }
  function lerp(m) {
    const left=140,right=870,y=290;line([left,y],[right,y],'#c1d1bb',9);circle(left,y,12,colors[1]);circle(right,y,12,colors[2]);const x=left+(right-left)*m.p;line([left,y],[x,y],colors[0],9);circle(x,y,20,colors[0]);text(`a = ${m.start}`,left,365,colors[1],28,'center');text(`b = ${m.end}`,right,365,colors[2],28,'center');text(models.fmt(m.current),x,225,colors[0],38,'center');text(`t = ${models.fmt(m.p)}`,500,480,'#57705e',28,'center');
  }
  const project3 = (v,cx,cy,scale=115)=>[cx+(v[0]-v[2])*.78*scale,cy+(-v[1]*.9+(v[0]+v[2])*.3)*scale];
  function rotation3d(m) {
    const axes=[[1,0,0],[0,1,0],[0,0,1]],axisColors=[colors[1],colors[0],colors[2]];
    m.frames.forEach((frame,index)=>{
      const cx=270+index*470,cy=300;
      const project=v=>project3(v,cx,cy,112);
      for(let i=-2;i<=2;i++){line(project([i,-1,-2]),project([i,-1,2]),'#d5dfcf',1);line(project([-2,-1,i]),project([2,-1,i]),'#d5dfcf',1);}
      const vertices=Array.from({length:8},(_,i)=>[i&1?.7:-.7,i&2?.7:-.7,i&4?.7:-.7]);
      vertices.forEach((v,i)=>{for(const bit of [1,2,4])if(!(i&bit))line(project(models.rotate(frame.q,v)),project(models.rotate(frame.q,vertices[i|bit])),colors[frame.color]+'99',3);});
      axes.forEach((v,i)=>{const tip=project(models.rotate(frame.q,v.map(x=>x*1.5)));arrow(project([0,0,0]),tip,axisColors[i],5);text(['x','y','z'][i],tip[0]+9,tip[1]-9,axisColors[i],24);});
      text(frame.label,cx,60,colors[frame.color],24,'center');
      if(m.id==='A02'){
        const phi= index?values[1]*m.p:0,theta=values[0],yaw=phi;
        const orientations=[models.axisAngle([0,0,1],yaw),models.multiply(models.axisAngle([0,0,1],yaw),models.axisAngle([0,1,0],theta)),frame.q];
        orientations.forEach((q,k)=>{
          ctx.beginPath();ctx.strokeStyle=axisColors[k]+'70';ctx.lineWidth=2;
          for(let j=0;j<=90;j++){const t=j/90*Math.PI*2,base=k===0?[Math.cos(t)*1.6,Math.sin(t)*1.6,0]:k===1?[Math.cos(t)*1.6,0,Math.sin(t)*1.6]:[0,Math.cos(t)*1.6,Math.sin(t)*1.6];const pt=project(models.rotate(q,base));if(j)ctx.lineTo(...pt);else ctx.moveTo(...pt);}ctx.stroke();
        });
      }
    });
    text('右手系・列ベクトル  ／  x：橙   y：緑   z：青',500,555,'#5d745f',22,'center');
    if(m.id==='A02')text(`軸の重なり |内積| = ${models.fmt(Math.abs(models.dot(m.axes[0],m.axes[1])),4)}`,500,505,colors[0],25,'center');
  }
  function reflection(m) {
    const bound=Math.max(5,Math.abs(m.v[0])+1,Math.abs(m.v[1])+1),project=plot([-bound,bound,-1,bound*2],true);
    line(project([-bound,0]),project([bound,0]),'#7c8d78',7);const start=m.v.map(x=>-x),impact=[0,0],end=m.reflected;arrow(project(start),project(impact),colors[1]);arrow(project(impact),project(end),colors[0]);arrow(project([0,0]),project([0,2]),colors[2],3);
    const point=m.p<.5?start.map(x=>x*(1-m.p*2)):end.map(x=>x*(m.p-.5)*2);circle(...project(point),12,colors[0]);legend([{label:'入射方向',color:1},{label:'反射方向',color:0},{label:'法線',color:2}]);
  }
  function precision(m) {
    const left=130,right=900,min=m.origin-2,max=m.origin+6,toX=x=>left+(x-min)/(max-min)*(right-left);
    line([left,300],[right,300],'#afc3ab',3);
    for(let i=min;i<=max;i++){const x=toX(i),representable=Math.fround(i)===i;line([x,representable?285:293],[x,representable?315:307],representable?colors[0]:'#c4d0be',3);text(`${i}`,x,350,'#58705c',17,'center');}
    circle(toX(m.exact),230,13,colors[1]);line([toX(m.exact),245],[toX(m.exact),300],colors[1],2,[6,5]);text('実数モデル',toX(m.exact),185,colors[1],24,'center');
    circle(toX(m.rounded),400,13,colors[0]);line([toX(m.rounded),315],[toX(m.rounded),385],colors[0],2,[6,5]);text('binary32',toX(m.rounded),460,colors[0],24,'center');text('濃い目盛り：binary32で厳密に表せる整数',500,80,'#526e5a',25,'center');
  }
  function numberline(m){
    const min=Math.min(-5,m.start,m.end)-2,max=Math.max(5,m.start,m.end)+2,toX=x=>110+(x-min)/(max-min)*790;
    line([95,310],[920,310],'#91a88f',3);
    const step=Math.max(1,Math.ceil((max-min)/12));
    for(let i=Math.ceil(min/step)*step;i<=max;i+=step){const x=toX(i);line([x,300],[x,320],'#7c9278',2);text(`${i}`,x,360,'#567051',25,'center');}
    const start=toX(m.start),now=toX(m.current);circle(start,310,9,colors[1]);arrow([start,245],[now,245],colors[0],7);circle(now,310,13,colors[0]);line([now,255],[now,295],colors[0],2,[5,5]);
    text(`出発 ${m.start}`,start,420,colors[1],27,'center');text(`現在 ${models.fmt(m.current)}`,now,185,colors[0],30,'center');text('左へ：負の方向　←　0を基準に　→　右へ：正の方向',500,80,'#4d674c',25,'center');
  }
  function fraction(m){
    const units=Math.max(1,Math.ceil(m.targetNumerator/m.denominator)),width=Math.min(680,790/units),left=(1000-width*units)/2;
    for(let u=0;u<units;u++){
      for(let d=0;d<m.denominator;d++){const x=left+u*width+d*width/m.denominator,w=width/m.denominator;ctx.fillStyle=u*m.denominator+d<m.numerator?'#278578':'#e6ecde';ctx.fillRect(x+1,230,w-2,120);ctx.strokeStyle='#718970';ctx.lineWidth=1;ctx.strokeRect(x,230,w,120);}
      line([left+u*width,370],[left+(u+1)*width,370],'#6a8364',2);text('1',left+(u+.5)*width,410,'#536c4c',26,'center');
    }
    text(`1を${m.denominator}等分 → 1区画は1/${m.denominator}`,500,100,'#536c4c',29,'center');text(`${m.numerator}個を集める：${m.numerator}/${m.denominator}`,500,500,colors[0],33,'center');
  }
  function squareRoot(m){
    const full=Math.sqrt(m.targetArea),s=330/full,side=m.side*s,x=500-side/2,y=300-side/2;
    ctx.fillStyle='#d9e9d3';ctx.fillRect(x,y,side,side);ctx.strokeStyle=colors[0];ctx.lineWidth=4;ctx.strokeRect(x,y,side,side);
    text(`面積 ${models.fmt(m.area)}`,500,310,colors[0],34,'center');text(`辺の長さ √${models.fmt(m.area)} ≈ ${models.fmt(m.side,4)}`,500,535,'#4e694c',29,'center');
  }
  function balance(m){
    line([500,340],[500,450],'#78936e',10);line([145,340],[855,340],colors[0],8);line([500,450],[430,490],'#78936e',9);line([500,450],[570,490],'#78936e',9);
    const term=(value,suffix='')=>models.fmt(value)+suffix;
    const left=m.stage===0?`${term(m.leftCoefficient,'x')} + (${models.fmt(m.leftConstant)})`:`${term(m.leftCoefficient,'x')}`;
    for(const [x,label,color]of[[285,left,colors[0]],[715,models.fmt(m.rightValue,4),colors[1]]]){
      ctx.fillStyle=color+'17';ctx.beginPath();ctx.roundRect(x-155,165,310,125,14);ctx.fill();text(label,x,240,color,37,'center');line([x,290],[x,340],color,3);
    }
    text('=',500,240,'#385936',40,'center');text(['元の式：左右は同じ量','両辺から同じ数を引く','両辺を同じ数で割る'][m.stage],500,80,'#536c4c',30,'center');text('同じ操作を両側へ行い、等しさを保つ',500,555,'#536c4c',26,'center');
  }
  function triangle(m){
    const a=m.sideA,b=m.sideB,s=Math.min(490/(a+2*b),365/(2*a+b)),cx=460,cy=330;
    const project=([x,y])=>[cx+(x-a/2)*s,cy-(y-b/2)*s];
    const polygons=[[[0,0],[a,0],[a,-a],[0,-a]],[[a,0],[a,b],[a+b,b],[a+b,0]],[[0,0],[a,b],[a-b,b+a],[-b,a]]];
    polygons.forEach((vertices,i)=>{
      const visible=m.p>=(i+1)/3-1e-8;ctx.beginPath();vertices.forEach((v,j)=>{const pt=project(v);if(j)ctx.lineTo(...pt);else ctx.moveTo(...pt);});ctx.closePath();ctx.fillStyle=visible?colors[i]+'40':'#e3e9dc';ctx.fill();ctx.strokeStyle=colors[i];ctx.lineWidth=2;ctx.stroke();
      const center=vertices.reduce((v,p)=>[v[0]+p[0]/4,v[1]+p[1]/4],[0,0]);text(`${['a²','b²','c²'][i]}=${models.fmt([a*a,b*b,a*a+b*b][i])}`,...project(center),colors[i],26,'center');
    });
    for(const [u,v]of[[[0,0],[a,0]],[[a,0],[a,b]],[[a,b],[0,0]]])line(project(u),project(v),'#264d2d',5);
    const corner=project([a,0]);line([corner[0]-15,corner[1]],[corner[0]-15,corner[1]-15],'#264d2d',2);line([corner[0]-15,corner[1]-15],[corner[0],corner[1]-15],'#264d2d',2);
    text('直角をはさむ辺 a・b ／ 向かいの辺 c',500,65,'#536c4c',25,'center');text(`${a*a} + ${b*b} = ${a*a+b*b}`,500,565,colors[0],32,'center');
  }
  function similar(m){
    const unit=270/Math.max(m.side,m.side*m.ratio),original=m.side*unit,enlarged=m.side*m.ratio*unit;
    for(const [cx,side,color,label]of[[270,original,colors[1],'元の正方形'],[730,enlarged,colors[0],'相似な正方形']]){const x=cx-side/2,y=315-side/2;ctx.fillStyle=color+'25';ctx.fillRect(x,y,side,side);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(x,y,side,side);text(label,cx,90,color,28,'center');}
    text(`長さ ${models.fmt(m.ratio)}倍 → 面積 ${models.fmt(m.ratio*m.ratio)}倍`,500,535,colors[0],31,'center');
  }
  function tree(m){
    const total=m.total,spacing=420/total;
    circle(100,300,13,colors[2]);text('選ぶ',100,75,'#536c4c',26,'center');text('武器',390,75,'#536c4c',26,'center');text('防具 → 1つの組',760,75,'#536c4c',26,'center');
    for(let i=0;i<m.firstChoices;i++){
      const y=100+(i*m.secondChoices+m.secondChoices/2)*spacing;
      line([100,300],[390,y],colors[2],2);circle(390,y,9,colors[2]);text(`${i+1}`,365,y-10,colors[2],22,'right');
      for(let j=0;j<m.secondChoices;j++){const index=i*m.secondChoices+j,leaf=100+(index+.5)*spacing,color=index<m.revealed?colors[0]:'#bccab5';line([390,y],[750,leaf],color,2);circle(750,leaf,6,color);text(`(${i+1}, ${j+1})`,770,leaf+7,color,22);}
    }
    text(`${m.revealed} / ${m.total} 通りをたどる`,500,575,colors[0],27,'center');
  }
  function dice(m){
    for(let i=1;i<=6;i++){
      const x=145+(i-1)%3*290,y=145+Math.floor((i-1)/3)*190,color=i<=m.favorable?colors[0]:'#9aab90';ctx.fillStyle=i<=m.favorable?'#dcecd6':'#edf0e7';ctx.beginPath();ctx.roundRect(x,y,160,125,12);ctx.fill();ctx.strokeStyle=i===m.face?colors[1]:color;ctx.lineWidth=i===m.face?7:2;ctx.stroke();text(`${i}`,x+80,y+80,color,45,'center');
    }
    circle(165+(m.scan-1)%3*290,165+Math.floor((m.scan-1)/3)*190,7,colors[2]);
    text('緑：当たり ／ 橙の枠：選んだ出目 ／ 青点：数える順',500,70,'#536c4c',23,'center');text(`${m.favorable}/6：一回の結果とは区別する`,500,565,colors[0],29,'center');
  }
  function expectation(m){
    const left=160,width=660,height=300*m.reward/500,top=435-height,weightedWidth=width*m.chance;
    ctx.fillStyle='#e3e9dd';ctx.fillRect(left,top,width,height);ctx.fillStyle='#94bfa7';ctx.fillRect(left,top,weightedWidth,height);ctx.fillStyle=colors[0];ctx.fillRect(left,top,weightedWidth*m.p,height);ctx.strokeStyle='#7d9477';ctx.lineWidth=2;ctx.strokeRect(left,top,width,height);
    text(`横幅：確率 ${models.fmt(m.chance)}`,500,95,'#536c4c',28,'center');text(`縦：報酬 ${m.reward} コイン`,500,485,'#536c4c',28,'center');text(`緑の全体面積：期待値 ${models.fmt(m.expected)}`,500,550,colors[0],30,'center');
    if(!m.reward)text('報酬0なので、期待値も0',500,300,colors[0],27,'center');
  }
  function balls(m){
    const row=(red,blue,y,label)=>{const n=red+blue,spacing=Math.min(74,720/Math.max(n,1)),start=500-(n-1)*spacing/2;text(label,500,y-65,'#536c4c',27,'center');for(let i=0;i<n;i++)circle(start+i*spacing,y,22,i<red?colors[1]:colors[2]);};
    row(m.initialRed,m.initialBlue,200,'最初の袋');row(m.red,m.blue,420,m.p<.5?'まだ引く前':m.returned?'赤を引いて戻した後':'赤を1個引いて戻さない');
    text(`次が赤：${m.red} / ${m.red+m.blue}`,500,555,colors[0],31,'center');
  }
  function draw(m) {
    ctx.clearRect(0,0,1000,600);ctx.fillStyle='#f5f8f1';ctx.fillRect(0,0,1000,600);
    const renderers={graph,flow,bars,vectors,circle:vectors,logic,circles,combinations,bits,lerp,rotation3d,reflection,precision,numberline,fraction,squareRoot,balance,triangle,similar,tree,dice,expectation,balls};
    renderers[m.type](m);
  }
  function render() {
    const m=models.evaluate(current.id,values[0],values[1],progress,mode,values.slice(2));
    draw(m);$('#result').textContent=m.result;$('#formula').textContent=m.formula;$('#explanation').textContent=m.explanation;$('#model-note').textContent=m.note;$('#visual-caption').textContent=m.caption;
    canvas.setAttribute('aria-label',`${current.id} ${shortTitle(current)}。${m.result}。${m.formula}。${m.explanation}`);
    $('#progress').value=String(Math.round(progress*100));$('#progress-value').textContent=`${Math.round(progress*100)}%`;
  }
  function $$(selector){return [...document.querySelectorAll(selector)];}
  $('#parameters').addEventListener('input',event=>{
    if(!event.target.matches('input'))return;const i=Number(event.target.dataset.index);values[i]=Number(event.target.value);const c=controls[i];$(`#value-${i}`).textContent=models.fmt(values[i])+c.unit;render();
  });
  $('#play').addEventListener('click',()=>{
    if(running){stop();return;}if(progress>=1)progress=0;running=true;lastTime=0;$('#play').textContent='Ⅱ 一時停止';$('#play').setAttribute('aria-pressed','true');animation=requestAnimationFrame(frame);
  });
  $('#step').addEventListener('click',()=>{stop();progress=progress>=1?0:Math.min(1,Math.round((progress+.1)*10)/10);render();});
  $('#progress').addEventListener('input',()=>{stop();progress=Number($('#progress').value)/100;render();});
  $('#reset').addEventListener('click',()=>{stop();values=controls.map(c=>c.value);progress=0;parameterControls();render();});
  $('#experiment').addEventListener('change',()=>changeExperiment($('#experiment').value));
  $('#presets').addEventListener('click',event=>{const button=event.target.closest('[data-preset]');if(!button)return;const preset=globalThis.MATH_TEACHING[current.id].presets[Number(button.dataset.preset)];changeExperiment(preset.mode,preset);});
  $('#check-form').addEventListener('submit',event=>{
    event.preventDefault();const answer=Number($('#check-answer').value),correct=Number.isFinite(answer)&&Math.abs(answer-current.check.answer)<=1e-6;
    $('#check-feedback').textContent=(correct?'一致しました。':'もう一度、条件と式を確認しましょう。')+current.check.explanation;
    $('#check-feedback').dataset.correct=String(correct);
  });
  $('#reasoning-cases').addEventListener('submit',event=>{
    const form=event.target.closest('form[data-reasoning]');if(!form)return;event.preventDefault();
    const item=current.reasoning[Number(form.dataset.reasoning)],reason=form.querySelector('textarea');
    if(!reason.value.trim()){reason.setCustomValidity('判断の理由を書いてください。');reason.reportValidity();return;}
    reason.setCustomValidity('');
    const chosen=new FormData(form).get(`reasoning-${form.dataset.reasoning}`),correct=chosen===item.correct,feedback=form.querySelector('.reasoning-feedback');
    feedback.dataset.correct=String(correct);feedback.textContent=(correct?'選択した判断は一致しています。':'判断を見直しましょう。')+` 解答は${item.correct}。${item.explanation} 記述の理由は採点していません。評価の観点と照らして見直してください。`;
  });
  $('#reasoning-cases').addEventListener('input',event=>{
    if(event.target.matches('textarea'))event.target.setCustomValidity('');
    const form=event.target.closest('form[data-reasoning]');if(!form)return;const item=current.reasoning[Number(form.dataset.reasoning)];
    const feedback=form.querySelector('.reasoning-feedback');feedback.textContent='';delete feedback.dataset.correct;
    try{localStorage.setItem(`edu-math-reason-${current.id}-${item.title}`,JSON.stringify({reason:form.querySelector('textarea').value,choice:form.querySelector('input:checked')?.value||''}));form.querySelector('.reasoning-save').textContent='このブラウザに保存しました。提出用の解答メモにも残してください。';}
    catch{form.querySelector('.reasoning-save').textContent='保存できません。記述を別の場所へコピーしてください。';}
  });
  $('#search').addEventListener('input',navigation);
  $('#previous').addEventListener('click',()=>{const i=lessons.indexOf(current);if(i>0)location.hash=lessons[i-1].id;});
  $('#next').addEventListener('click',()=>{const i=lessons.indexOf(current);if(i<lessons.length-1)location.hash=lessons[i+1].id;});
  $('#memo').addEventListener('input',()=>{try{localStorage.setItem(`edu-math-${current.id}`,$('#memo').value);$('#memo-status').textContent='このブラウザに保存しました。提出・採点は行いません。';}catch{$('#memo-status').textContent='保存できません。メモをコピーして別の場所へ保存してください。';}});
  addEventListener('hashchange',()=>{loadLesson();$('#lesson-title').scrollIntoView({block:'start'});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)stop();});
  addEventListener('pagehide',stop);
  new ResizeObserver(()=>{if(current)render();}).observe(canvas);
  $('#calculation-policy-body').innerHTML=markdown(globalThis.MATH_CALCULATION_POLICY);
  $('#middle-route').innerHTML=globalThis.MATH_MIDDLE_ROUTE.map(id=>`<a href="#${id}">${id}</a>`).join(' → ');
  loadLesson();
})();
