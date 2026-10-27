/* Verify mathematical invariants, singularities, boundaries, and all model inputs. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../models.js');
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
const vector=(a,b)=>a.forEach((x,i)=>near(x,b[i]));
const evaluate=(id,a,b,p=1,mode='default',extra=[])=>M.evaluate(id,a,b,p,mode,extra);
assert.equal(M.fmt(-.00001,2),'0');
assert.equal(M.fmt(Math.sqrt(1.02),8),'1.00995049');
assert.equal(M.fmt(1.01,8),'1.01');
assert.equal(M.fmt(.000001,8),'0.000001');
let samples=0;
function finite(value){
  if(typeof value==='number')assert.ok(Number.isFinite(value));
  else if(Array.isArray(value))value.forEach(finite);
  else if(value&&typeof value==='object')Object.values(value).forEach(finite);
}
for(const id of Object.keys(M.config))for(const experiment of M.getExperiments(id)){
  const controls=M.getControls(id,experiment.id);
  const combinations=controls.reduce((rows,c)=>rows.flatMap(row=>[...new Set([c.min,c.value,c.max])].map(value=>[...row,value])),[[]]);
  for(const values of combinations)for(const p of [0,.25,.5,.75,1]){
    const model=evaluate(id,values[0],values[1],p,experiment.id,values.slice(2));finite(model);assert.ok(model.formula&&model.result&&model.explanation);samples++;
  }
}
vector(M.rotate(M.axisAngle([0,0,1],90),[1,0,0]),[0,1,0]);
const qx=M.axisAngle([1,0,0],90),qy=M.axisAngle([0,1,0],90);
vector(M.rotate(M.multiply(qy,qx),[0,0,1]),[0,-1,0]);
vector(M.rotate(M.multiply(qx,qy),[0,0,1]),[1,0,0]);
for(const basis of [[1,0,0],[0,1,0],[0,0,1]]){
  vector(M.rotate(M.euler(30,90,30),basis),M.rotate(M.euler(0,90,0),basis));
}
assert.notDeepEqual(M.rotate(M.euler(30,0,30),[1,0,0]),M.rotate(M.euler(0,0,0),[1,0,0]));
const q=M.axisAngle([0,0,1],350),other=M.axisAngle([0,0,1],10);
vector(M.rotate(M.slerp(q,other,.5),[1,0,0]),[1,0,0]);
near(M.length(M.slerp(q,q.map(x=>-x),.5)),1);
vector(M.normalize([0,0]),[0,0]);assert.match(evaluate('B09',0,0).result,/ゼロ/);
assert.match(evaluate('B07',5,3).result,/接触/);assert.match(evaluate('B07',5.1,3).result,/離れ/);
assert.match(evaluate('B04',1,5).result,/開く/);assert.match(evaluate('B04',1,4).result,/閉じ/);
assert.equal(evaluate('B11',5,2).total,10);
assert.match(evaluate('B12',0,200).result,/0 \/ 200/);assert.match(evaluate('B12',100,200).result,/200 \/ 200/);
assert.equal(evaluate('B12',20,200).result,evaluate('B12',20,200).result);
assert.match(evaluate('B12',20,200,0).result,/抽選前/);
near(evaluate('B13',2,2,1,'default',[8]).mean,4);
assert.match(evaluate('B14',50,5).result,/1,000/);
const explicit=evaluate('A06',.5,10).series[1].points.at(-1)[1];
const semi=evaluate('A06',.5,10).series[2].points.at(-1)[1];near(explicit,-2.5);near(semi,-7.5);
assert.ok(Math.abs(evaluate('A06',.1,10).series[1].points.at(-1)[1]+5)<Math.abs(explicit+5));
near(evaluate('A07',.5,1,.3).series[0].points.at(-1)[1],8.75);
assert.match(evaluate('A07',2,1).note,/範囲外/);
assert.equal(evaluate('A08',3,9,0).marker,undefined);
near(M.length(evaluate('A09',3,-4).v),M.length(evaluate('A09',3,-4).reflected));
near(evaluate('A10',16777216,1).rounded,16777216);near(evaluate('A10',16777216,1).exact,16777217);
near(evaluate('B18',.02,-4,1,'approximation').errorBound,.00005);
assert.ok(evaluate('B18',.02,-4,1,'approximation').withinTolerance);
assert.ok(!evaluate('B18',1,-4,1,'approximation').withinTolerance);
for(const u of [0,.01,.02,.1,.5,1]){
  const m=evaluate('B18',u,-4,1,'approximation');
  near(m.absoluteError,(u*u)/(4*(1+u/2+Math.sqrt(1+u))));
  assert.ok(m.absoluteError<=m.errorBound+1e-14);
}
// An upper bound exceeding the limit is inconclusive: the actual error may still pass.
assert.ok(evaluate('B18',.3,-2,1,'approximation').errorBound>.01);
assert.ok(evaluate('B18',.3,-2,1,'approximation').withinTolerance);
const coarse=evaluate('A06',.5,10,1,'default',[1]),fine=evaluate('A06',.1,10,1,'default',[1]);
near(coarse.absoluteError,2.5);near(fine.absoluteError,.5);
assert.ok(!coarse.withinTolerance&&fine.withinTolerance);
for(const dt of [.05,.1,.3,.5,1]){
  const m=evaluate('A06',dt,10,1,'default',[1]);
  assert.ok(m.absoluteError<=m.errorBound+1e-12);
}
assert.ok(!evaluate('A10',16777216,1,1,'default',[.1]).withinTolerance);
assert.ok(evaluate('A10',16777216,1,1,'default',[1]).withinTolerance);
assert.throws(()=>evaluate('UNKNOWN',0,0),/Unknown lesson/);
near(evaluate('B01',-3,5,1,'signed').current,2);
assert.equal(evaluate('B01',3,4,1,'fraction').numerator,3);
near(evaluate('B01',25,undefined,1,'root').side,5);
assert.match(evaluate('B01',18,7,1,'default',[100,3]).result,/53/);
assert.match(evaluate('B02',35,140,1,'ratio').result,/25%/);
assert.match(evaluate('B03',3,2,1,'equation').result,/x = 6/);
vector(evaluate('B03',7,1,1,'simultaneous').intersections[0],[4,3]);
const negativeSolution=evaluate('B03',2,-4,1,'simultaneous');
vector(negativeSolution.intersections[0],[-1,3]);
assert.ok(negativeSolution.series.every(s=>s.points[0][0]<-1&&s.points.at(-1)[0]>-1));
assert.deepEqual(evaluate('B03',2,3,1,'quadratic').intersections,[[2,0],[3,0]]);
assert.match(evaluate('B03',6,28,1,'default',[100]).note,/12 秒/);
assert.match(evaluate('B04',0,5,1,'or').result,/開く/);
assert.match(evaluate('B04',0,undefined,1,'not').result,/開く/);
vector(evaluate('B06',2,undefined,.8,'proportional').marker,[3,6]);
vector(evaluate('B06',6,undefined,5/9,'inverse').marker,[3,2]);
near(evaluate('B07',3,4,1,'triangle').hypotenuse,5);
near(evaluate('B07',2,2,1,'similar').ratio**2,4);
assert.equal(evaluate('B11',3,4,1,'tree').total,12);
const choices=evaluate('B11',5,2).items;assert.equal(choices.length,10);assert.equal(new Set(choices.map(x=>x.join(','))).size,10);assert.deepEqual(choices[0],[1,2]);
near(evaluate('B12',3,4,1,'dice').favorable/6,.5);
assert.equal(evaluate('B12',3,5,.25,'dice').face,5);
near(evaluate('B12',20,100,1,'expectation').expected,20);
assert.equal(evaluate('B12',2,1,1,'conditional',[0]).red,1);
assert.equal(evaluate('B12',2,1,1,'conditional',[1]).red,2);
assert.match(evaluate('B13',2,2,1,'default',[8]).note,/中央値 2分/);
const teaching=require('../teaching.js');
assert.equal(Object.keys(teaching).length,28);
for(const[id,entry]of Object.entries(teaching)){
  assert.ok(entry.level&&entry.words.length>=2&&entry.presets.length>=2,id);
  for(const prereq of entry.prerequisites)assert.ok(teaching[prereq],`${id}: unknown prerequisite ${prereq}`);
  for(const preset of entry.presets){
    const controls=M.getControls(id,preset.mode),requested=[preset.a,preset.b,...(preset.extra||[])],v=controls.map((c,i)=>requested[i]??c.value);
    assert.ok(M.getExperiments(id).some(x=>x.id===preset.mode),`${id}: invalid preset mode`);
    v.forEach((value,i)=>assert.ok(value>=controls[i].min&&value<=controls[i].max,`${id}: preset out of range`));
    finite(evaluate(id,v[0],v[1],preset.p,preset.mode,v.slice(2)));
  }
}
console.log(`PASS: ${samples} boundary/progress cases across every scene; canonical examples; middle-school entry points; 28 teaching manifests and presets; quaternion/gimbal lock/SLERP/numerical invariants`);
