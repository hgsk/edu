/* Deterministic official-table fixtures and independent probability/unit checks. */
'use strict';
const assert=require('node:assert/strict');
const G=require('../game-life.js');
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const near=(a,b,tol=1e-12)=>{assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);checks++;};
const reject=fn=>{assert.throws(fn,RangeError);checks++;};
// M.LEAGUE official table, converted to han excluding the two ba-zoro han.
const tables=[
  [30,[1000,2000,3900,8000],[1500,2900,5800,12000]],
  [40,[1300,2600,5200,8000],[2000,3900,7700,12000]],
  [50,[1600,3200,6400,8000],[2400,4800,9600,12000]],
  [60,[2000,3900,8000,8000],[2900,5800,12000,12000]],
  [70,[2300,4500,8000,8000],[3400,6800,12000,12000]],
  [80,[2600,5200,8000,8000],[3900,7700,12000,12000]],
  [90,[2900,5800,8000,8000],[4400,8700,12000,12000]],
  [100,[3200,6400,8000,8000],[4800,9600,12000,12000]],
  [110,[null,7100,8000,8000],[null,10600,12000,12000]]
];
for(const[fu,child,parent]of tables)for(const[dealer,values]of [[false,child],[true,parent]])values.forEach((total,i)=>{
  if(total!==null)eq(G.mahjong({fu,han:i+1,dealer}).total,total);
});
for(const[fu,han,dealer,payments]of [
  [20,2,false,[700,400,400]],[20,2,true,[700,700,700]],
  [20,3,false,[1300,700,700]],[20,4,true,[2600,2600,2600]],
  [25,3,false,[1600,800,800]],[25,3,true,[1600,1600,1600]],
  [30,1,false,[500,300,300]],[30,1,true,[500,500,500]],
  [40,3,false,[2600,1300,1300]],[110,2,false,[3600,1800,1800]]
])eq(G.mahjong({fu,han,dealer,tsumo:true}).payers.map(x=>x.amount),payments);
eq(G.mahjong({fu:25,han:2}).total,1600);
eq(G.mahjong({fu:25,han:2,dealer:true}).total,2400);
for(const[han,child,parent]of [[5,8000,12000],[6,12000,18000],[7,12000,18000],[8,16000,24000],[10,16000,24000],[11,24000,36000],[13,24000,36000],[30,24000,36000]]){
  eq(G.mahjong({fu:30,han}).total,child);eq(G.mahjong({fu:30,han,dealer:true}).total,parent);
}
for(const dealer of [false,true])for(const tsumo of [false,true]){
  eq(G.mahjong({yakuman:true,dealer,tsumo}).total,dealer?48000:32000);
  for(const[fu]of tables)for(let han=2;han<=13;han++){
    const score=G.mahjong({fu,han,dealer,tsumo});
    eq(score.total,score.payers.reduce((s,x)=>s+x.amount,0));
    eq(score.payers.every(x=>Number.isInteger(x.amount)&&x.amount%100===0),true);
  }
}
eq(G.roundFu(34),40);eq(G.roundFu(30),30);eq(G.roundFu(22,{sevenPairs:true}),25);eq(G.roundFu(20,{pinfuTsumo:true}),20);
for(const args of [{fu:35,han:3},{fu:20,han:2},{fu:20,han:1,tsumo:true},{fu:25,han:1},{fu:25,han:2,tsumo:true},{fu:110,han:1},{fu:30,han:0},{fu:30,han:1.5}])reject(()=>G.mahjong(args));
reject(()=>G.roundFu(20,{sevenPairs:true,pinfuTsumo:true}));
for(const p of [0,1e-8,.0001,.01,.1,.5,.99,1])for(const n of [0,1,2,10,100,1000]){
  const d=G.lottery(p,n);
  near(d.failure,(1-p)**n,2e-13);near(d.success+d.failure,1);near(d.expectedCount,n*p);
  eq(d.lower<=d.failure+1e-14,true);eq(d.failure<=d.approximation+1e-14,true);eq(d.expectedWait,p===0?null:1/p);
  if(n>0)eq(d.failure<=G.lottery(p,n-1).failure+1e-14,true);
  if(p<1)eq(n*(-Math.log1p(-p)-p)<=n*p*p/(2*(1-p))+1e-13,true);
}
const d=G.lottery(.01,100);near(d.failure,.3660323412732292);near(d.expectedWait,100);near(d.approximation,1/Math.E);near(d.error,.0018470998982131);
near(G.lottery(.5,2).failure,.25);near(G.lottery(.5,2).error,1/Math.E-.25);
eq(G.lottery(0,100).expectedWait,null);eq(G.lottery(1,0).failure,1);eq(G.lottery(1,1).expectedWait,1);
for(const[p,n]of [[-1,1],[1.1,1],[NaN,1],[.1,-1],[.1,1.2]])reject(()=>G.lottery(p,n));
let previousError=1;
for(const p of [.1,.01,.001,.0001]){const error=Math.abs(G.lottery(p,Math.round(1/p)).failure-1/Math.E);eq(error<previousError,true);previousError=error;}
let r=G.returns(.01,80,1);near(r.payout,.8);near(r.net,-.2);near(r.ratio,.8);near(r.deduction,.2);near(r.net*100,-20);
r=G.returns(.01,160,1);near(r.net,.6);near(r.deduction,-.6);
eq(G.returns(.01,80,0),{payout:.8,net:.8,ratio:null,deduction:null});
eq(G.returns(0,80,1),{payout:0,net:-1,ratio:0,deduction:1});
eq(G.returns(1,80,1),{payout:80,net:79,ratio:80,deduction:-79});
reject(()=>G.returns(.01,-1,1));reject(()=>G.returns(.01,80,-1));
eq(G.damage(40,15,3),{perHit:25,total:75});eq(G.damage(20,40,3),{perHit:0,total:0});eq(G.damage(40,40,3).total,0);eq(G.damage(40,0,0).total,0);
reject(()=>G.damage(40,0,.5));reject(()=>G.damage(-1,0,1));
eq(G.recipe(2,5,300),{scale:2.5,grams:750});eq(G.recipe(2,0,300).grams,0);reject(()=>G.recipe(0,5,300));
eq(G.shopping(300,500,20),{paid:240,per100g:48});near(G.shopping(250,400,0).per100g,62.5);eq(G.shopping(300,500,100).paid,0);reject(()=>G.shopping(300,0,20));reject(()=>G.shopping(300,500,101));
const v=G.video(8,10);eq(v.bytes,600000000);eq(v.MB,600);near(v.MiB,572.20458984375);eq(G.video(8,20).MB,1200);eq(G.video(0,10).MB,0);eq(G.video(8,0).MB,0);reject(()=>G.video(-1,10));
console.log(`PASS: ${checks} game/life checks: official score fixtures, caps/exceptions/payments; independent draws/e/error bounds; return/net; damage/recipe/unit price/bitrate; invalid inputs`);
