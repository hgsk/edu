/* Pure numerical models. Coordinates: right-handed, column vectors, Hamilton wxyz. */
(function (root) {
  'use strict';
  const rad = d => d * Math.PI / 180;
  const fmt = (x, digits = 2) => { const rounded=Number(x.toFixed(digits)); return rounded===0?'0':rounded.toLocaleString('ja-JP',{maximumFractionDigits:digits}); };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const length = v => Math.hypot(...v);
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const scale = (v, s) => v.map(x => x * s);
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const normalize = v => length(v) > 1e-12 ? scale(v, 1 / length(v)) : v.map(() => 0);
  function multiply(a, b) {
    const [w,x,y,z] = a, [W,X,Y,Z] = b;
    return [w*W-x*X-y*Y-z*Z, w*X+x*W+y*Z-z*Y, w*Y-x*Z+y*W+z*X, w*Z+x*Y-y*X+z*W];
  }
  const axisAngle = (axis, degrees) => [Math.cos(rad(degrees)/2), ...scale(normalize(axis), Math.sin(rad(degrees)/2))];
  function rotate(q, v) { return multiply(multiply(q, [0,...v]), [q[0],-q[1],-q[2],-q[3]]).slice(1); }
  function euler(roll, pitch, yaw) {
    return multiply(multiply(axisAngle([0,0,1],yaw),axisAngle([0,1,0],pitch)),axisAngle([1,0,0],roll));
  }
  function slerp(q0, q1, t) {
    let d = dot(q0, q1);
    if (d < 0) { q1 = scale(q1, -1); d = -d; }
    d = clamp(d, -1, 1);
    if (d > .9995) return normalize(add(scale(q0,1-t),scale(q1,t)));
    const a = Math.acos(d);
    return add(scale(q0,Math.sin((1-t)*a)/Math.sin(a)),scale(q1,Math.sin(t*a)/Math.sin(a)));
  }
  const lin = (max, fn, count = 80) => Array.from({length:count+1}, (_,i) => [max*i/count,fn(max*i/count)]);
  const param = (label,min,max,step,value,unit='') => ({label,min,max,step,value,unit});
  const config = {
    B01:[param('1回のダメージ',0,30,1,15),param('回復量',0,30,1,10),param('開始HP',50,150,5,80),param('被弾回数',1,5,1,2)],
    B02:[param('速さ',1,12,.5,6,'m/s'),param('更新頻度',15,120,15,60,'回/秒')],
    B03:[param('毎秒の回復量',1,10,.5,4),param('開始HP',0,90,5,20),param('目標HP',20,100,5,100)],
    B04:[param('鍵を持っている',0,1,1,1),param('レベル',1,10,1,5)],
    B05:[param('点Bのx',-6,8,1,4),param('点Bのy',-5,6,1,-1)],
    B06:[param('最初の上昇速度',2,8,.5,4),param('二次項の係数',.5,2,.1,1)],
    B07:[param('到着時の中心間距離',0,10,.1,5),param('円Bの半径',1,4,.1,3)],
    B08:[param('半径',1,5,.5,2),param('回転する角度',0,720,15,360,'°')],
    B09:[param('入力x',-5,5,.5,1),param('入力y',-5,5,.5,1)],
    B10:[param('x方向の倍率',.5,3,.1,2),param('回転角',-180,180,15,90,'°')],
    B11:[param('異なるカードの枚数 n',3,10,1,5),param('選ぶ枚数 k',1,3,1,2)],
    B12:[param('当選率',0,100,5,20,'%'),param('抽選回数',20,1000,20,200)],
    B13:[param('1人目のプレイ時間',0,20,1,2,'分'),param('2人目のプレイ時間',0,20,1,2,'分'),param('3人目のプレイ時間',0,20,1,8,'分')],
    B14:[param('1段階ごとの増加量',0,150,10,50),param('項数',2,10,1,5)],
    B15:[param('成長の倍率',1.1,3,.1,2),param('段階数',2,8,1,4)],
    B16:[param('加速度 a',0,10,1,6,'m/s²'),param('初速度 v₀',0,5,.5,2,'m/s')],
    B17:[param('十進数',0,63,1,13),param('循環する要素数',2,12,1,8)],
    B18:[param('開始値 a',0,30,1,10),param('終了値 b',0,50,1,30)],
    A01:[param('回転角',-360,360,15,90,'°'),param('拡大率',.5,2,.1,1)],
    A02:[param('pitch θ',-90,90,1,90,'°'),param('roll・yawの同時変更',-90,90,1,30,'°')],
    A03:[param('x軸まわり',-180,180,15,90,'°'),param('y軸まわり',-180,180,15,90,'°')],
    A04:[param('開始角',0,360,10,350,'°'),param('終了角',0,360,10,10,'°')],
    A05:[param('親のx位置',0,12,1,10),param('親の回転角',-180,180,15,90,'°')],
    A06:[param('時間刻み dt',.05,1,.05,.5,'秒'),param('重力の大きさ',1,15,1,10,'m/s²'),param('許容絶対誤差',.1,3,.1,1,'m')],
    A07:[param('比例ゲイン Kp',0,2.5,.1,.5),param('時間刻み dt',.1,1,.1,1,'秒')],
    A08:[param('移動平均の幅',1,5,1,3),param('段差の高さ',1,12,1,9)],
    A09:[param('入射速度x',-5,5,.5,3),param('入射速度y',-5,-.5,.5,-4)],
    A10:[param('大きな座標',16777212,16777222,1,16777216,'m'),param('追加する距離',0,4,.25,1,'m'),param('許容絶対誤差',.05,2,.05,.1,'m')]
  };
  const experiments = {
    B01:[{id:'signed',label:'中学の入口：正負の数',controls:[param('出発する数',-10,10,1,-3),param('足す数',-10,10,1,5)]},{id:'fraction',label:'分数：1を等しく分ける',controls:[param('分子',0,8,1,3),param('分母',1,8,1,4)]},{id:'root',label:'平方根：面積から辺へ',controls:[param('正方形の面積',1,100,1,25)]},{id:'default',label:'ゲームへの接続：HPの計算'}],
    B02:[{id:'ratio',label:'割合：全体の何パーセントか',controls:[param('現在のHP',0,200,5,35),param('最大HP',20,200,10,140)]},{id:'default',label:'速さ・時間・距離'}],
    B03:[{id:'equation',label:'一次方程式：両辺に同じ操作',controls:[param('xに掛ける数 a',1,10,1,3),param('足している数 b',-10,10,1,2)]},{id:'simultaneous',label:'連立方程式：2本の直線の交点',controls:[param('x+yの値',2,12,1,7),param('x−yの値',-4,4,1,1)]},{id:'quadratic',label:'二次方程式：グラフとx軸の交点',controls:[param('1つ目の解',1,5,1,2),param('2つ目の解',1,5,1,3)]},{id:'default',label:'回復量と上限を式にする'}],
    B04:[{id:'default',label:'AND：両方の条件が必要'},{id:'or',label:'OR：どちらか一方でよい'},{id:'not',label:'NOT：鍵の条件を反転',controls:[param('鍵を持っている',0,1,1,1)]}],
    B06:[{id:'proportional',label:'比例：y = ax',controls:[param('比例定数 a',-3,3,.5,2)]},{id:'inverse',label:'反比例：y = a/x',controls:[param('反比例の定数 a',1,12,1,6)]},{id:'linear',label:'一次関数：y = ax + b',controls:[param('傾き a',-3,3,.5,2),param('切片 b',-5,5,1,1)]},{id:'default',label:'二次関数：ジャンプの軌道'}],
    B07:[{id:'triangle',label:'三平方の定理：3辺の長さ',controls:[param('横の辺 a',1,6,1,3),param('縦の辺 b',1,6,1,4)]},{id:'similar',label:'相似：長さと面積の比',controls:[param('拡大する倍率',.5,3,.5,2),param('元の正方形の辺',1,4,1,2)]},{id:'default',label:'ゲームへの接続：円の接触'}],
    B11:[{id:'tree',label:'中学の入口：樹形図と積の法則',controls:[param('武器の種類',2,4,1,3),param('防具の種類',2,4,1,4)]},{id:'default',label:'高校への接続：組合せ'}],
    B12:[{id:'dice',label:'中学の入口：同様に確からしい出目',controls:[param('当たりとする出目の上限',0,6,1,3),param('一回の出目を選ぶ',1,6,1,4)]},{id:'expectation',label:'高校への接続：期待値',controls:[param('当選率',0,100,5,20,'%'),param('当選時のコイン',0,500,20,100)]},{id:'conditional',label:'条件付き確率：戻す・戻さない',controls:[param('最初の赤玉の数',1,5,1,2),param('最初の青玉の数',1,5,1,1),param('引いた玉を戻す（1=戻す）',0,1,1,0)]},{id:'default',label:'反復試行：理論と観測の違い'}],
    B18:[{id:'default',label:'線形補間と近似の入口'},{id:'approximation',label:'近似の省略項・誤差と許容値',controls:[param('u（0以上）',0,1,.01,.02),param('許容誤差：10の何乗',-6,-2,1,-4)]}]
  };
  const getExperiments=id=>experiments[id]||[{id:'default',label:'基本の図を動かす'}];
  const gameLife=root.MathGameLife||(typeof require==='function'?require('./game-life.js'):null);
  for(const [id,added] of Object.entries(gameLife.experiments(param)))experiments[id]=[...getExperiments(id),...added];
  const getControls=(id,mode)=>getExperiments(id).find(e=>e.id===mode)?.controls||config[id];
  function evaluate(id, a, b, p, mode='default', extra=[]) {
    p = clamp(p,0,1);
    const applied=gameLife.evaluate(id,a,b,p,mode,extra,fmt);
    if(applied)return applied;
    const out = {id, experiment:mode, p, type:'graph', series:[], vectors:[], bars:[], formula:'', result:'', note:'', explanation:'', caption:''};
    const series = (label, points, color = 0) => ({label,points,color});
    const vec = (label, to, color = 0, from = [0,0]) => ({label,to,from,color});
    const bar = (label,value,color=0) => ({label,value,color});
    if(mode!=='default'){
      if(id==='B01'&&mode==='signed'){
        out.type='numberline';out.start=a;out.end=a+b;out.current=a+b*p;
        out.result=fmt(out.current);out.formula=`${a} + (${b}) × ${fmt(p)} = ${fmt(out.current)}`;out.note=`100%で ${a} + (${b}) = ${a+b}`;
        out.explanation=b>=0?'足す数が正なら数直線を右へ進みます。0をまたいでも、進む方向と距離で考えられます。':'負の数を足すと左へ進みます。「負だから右」のように符号だけで決めず、今回の計算を確かめます。';
      }else if(id==='B01'&&mode==='fraction'){
        const n=Math.floor(a*p);out.type='fraction';out.numerator=n;out.denominator=b;out.targetNumerator=a;out.result=`${n}/${b} = ${fmt(n/b,4)}`;out.formula=`1を${b}等分した大きさを ${n} 個集める`;
        out.explanation='分母は1を何等分するか、分子はその部分をいくつ集めるかです。1を超える分数も同じ仕組みです。';out.note='各枠が1。枠内の1区画の大きさは1/分母です。';
      }else if(id==='B01'&&mode==='root'){
        out.type='squareRoot';out.side=Math.sqrt(a*p);out.area=a*p;out.targetArea=a;out.result=`辺 ${fmt(out.side,4)}`;out.formula=`辺² = 面積 ${fmt(out.area)} → 辺 = √${fmt(out.area)}`;
        out.explanation='正方形の面積から、二乗してその面積になる非負の辺の長さを求めます。平方根の小数は近似値です。';
      }else if(id==='B02'&&mode==='ratio'){
        const current=a*p;out.type='bars';out.bars=[bar('現在のHP',current),bar('最大HP',b,2)];out.result=`${fmt(current/b*100)}%`;out.formula=`割合 = ${fmt(current)} ÷ ${b} ／ 百分率 = 割合 × 100`;
        out.explanation='何を全体の1とするかを先に決めます。最大HPを変えると、同じ現在HPでも割合が変わります。';out.note='現在HPが最大HPを超える入力も許可し、100%を超える割合をそのまま表示します。';
      }else if(id==='B03'&&mode==='equation'){
        const x=(20-b)/a,stage=Math.min(2,Math.floor(p*3)),subtract=stage>0?b:0,divisor=stage===2?a:1;
        out.type='balance';out.stage=stage;out.leftCoefficient=a/divisor;out.leftConstant=(b-subtract)/divisor;out.rightValue=(20-subtract)/divisor;out.result=`x = ${fmt(x,4)}`;
        out.formula=stage===0?`${a}x + (${b}) = 20`:stage===1?`${a}x = 20 − (${b}) = ${20-b}`:`x = (20 − (${b})) ÷ ${a} = ${fmt(x,4)}`;
        out.explanation=['まず「xに何をして20になったか」を読みます。左右の値は同じです。',`両辺から同じ数 ${b} を引きます。負の数を引く場合も、両辺へ同じ操作をします。`,`両辺を同じ数 ${a} で割ります。求めたxを最初の式へ代入して確かめます。`][stage];out.note=`検算：${a} × ${fmt(x,4)} + (${b}) = 20（表示値は丸めています）`;
      }else if(id==='B03'&&mode==='simultaneous'){
        const x=(a+b)/2,y=(a-b)/2,min=Math.min(0,x-1),max=Math.max(a,x+1),t=min+(max-min)*p,points=fn=>Array.from({length:81},(_,i)=>{const x=min+(max-min)*i/80;return[x,fn(x)];});out.series=[series(`x+y=${a}`,points(t=>a-t)),series(`x−y=${b}`,points(t=>t-b),1)];out.marker=[t,a-t];out.intersections=[[x,y]];out.result=`x=${fmt(x)}, y=${fmt(y)}`;out.formula=`交点：(${a}+${b})/2 = ${fmt(x)} ／ y=${a}−x`;
        out.explanation='同じxとyが両方の式を満たす場所が2直線の交点です。xを動かし、2本の直線の高さが一致する場所を確かめます。';out.note=`検算：${fmt(x)}+${fmt(y)}=${a}、${fmt(x)}−${fmt(y)}=${b}`;
      }else if(id==='B03'&&mode==='quadratic'){
        const t=6*p;out.series=[series('y=(x−a)(x−b)',lin(6,t=>(t-a)*(t-b)))];out.marker=[t,(t-a)*(t-b)];out.intersections=[[a,0],[b,0]];out.result=a===b?`解 x=${a}（重解）`:`解 x=${a}, ${b}`;out.formula=`x² − ${a+b}x + ${a*b} = (x−${a})(x−${b}) = 0`;
        out.explanation='積が0なら少なくとも一方が0です。式を因数分解すると、グラフとx軸の交点のx座標を求められます。';
      }else if(id==='B04'&&['or','not'].includes(mode)){
        out.type='logic';out.operator=mode==='or'?'OR':'NOT';out.logic=mode==='or'?[!!a,b>=5]:[!!a];const opened=mode==='or'?!!a||b>=5:!a;
        out.result=opened?'扉が開く':'扉は閉じたまま';out.formula=mode==='or'?`${a?'鍵あり':'鍵なし'} OR レベル ${b} ≥ 5`:`NOT (${a?'鍵あり':'鍵なし'})`;
        out.explanation=mode==='or'?'少なくとも一つの条件が真なら開きます。鍵なし・レベル5でANDと比較してください。':'鍵を持っている条件を反転します。この比較例では、鍵を持っていないときだけ開きます。';
        out.note=mode==='or'?'(鍵,レベル条件)=(0,0)→0、(0,1)→1、(1,0)→1、(1,1)→1':'鍵=0→1、鍵=1→0。1は真、0は偽。';
      }else if(id==='B06'&&['proportional','inverse','linear'].includes(mode)){
        const inverse=mode==='inverse',offset=mode==='linear'?b:0,min=inverse?.5:-5,max=5,x=min+(max-min)*p;
        const fn=t=>inverse?a/t:a*t+offset;
        out.series=[series(mode==='proportional'?'比例':inverse?'反比例':'一次関数',Array.from({length:81},(_,i)=>{const t=min+(max-min)*i/80;return[t,fn(t)];}))];out.marker=[x,fn(x)];out.result=`x=${fmt(x)} → y=${fmt(fn(x))}`;
        out.formula=inverse?`y = ${a}/x`:`y = ${a}x${offset<0?' − ': ' + '}${Math.abs(offset)}`;
        out.explanation=inverse?'xを2倍にするとyは半分になります。x=0では割れないため、この図では正の範囲だけを動かします。':mode==='proportional'?'xとyの比が一定の関係です。原点を通り、比例定数が負なら右へ進むほどyが下がります。':'傾きはxが1増えたときのyの増加量、切片はx=0でのyです。';out.note=inverse?'表示範囲は0.5 ≤ x ≤ 5。負の側の枝は今回の図の対象外です。':'表示範囲は−5 ≤ x ≤ 5。';
      }else if(id==='B07'&&mode==='triangle'){
        out.type='triangle';out.sideA=a;out.sideB=b;out.hypotenuse=Math.hypot(a,b);out.result=`斜辺 c = ${fmt(out.hypotenuse,4)}`;out.formula=`${a}² + ${b}² = ${a*a+b*b} = c²`;
        out.explanation='直角をはさむ2辺の上に作った正方形の面積の和が、斜辺の上の正方形の面積になります。直角三角形に限る関係です。';out.note='再生するとa²、b²、c²の面積を順に強調します。辺の長さと面積を区別してください。';
      }else if(id==='B07'&&mode==='similar'){
        const ratio=1+(a-1)*p;out.type='similar';out.side=b;out.ratio=ratio;out.result=`長さ ${fmt(ratio)}倍 ／ 面積 ${fmt(ratio*ratio)}倍`;out.formula=`面積比 = (${fmt(ratio)})² = ${fmt(ratio*ratio)}`;
        out.explanation='縦と横の両方を同じ倍率で変えるため、面積の倍率は長さの倍率の二乗になります。';out.note=`元の辺 ${b}、面積 ${b*b}。現在の辺 ${fmt(b*ratio)}、面積 ${fmt((b*ratio)**2)}`;
      }else if(id==='B11'&&mode==='tree'){
        out.type='tree';out.firstChoices=a;out.secondChoices=b;out.total=a*b;out.revealed=Math.floor(p*a*b);out.result=`${a*b} 通り`;out.formula=`武器 ${a} 種 × 防具 ${b} 種 = ${a*b} 通り`;
        out.explanation='武器を一つ選ぶたびに、防具の選択肢が同じ数だけあります。枝をたどると漏れや重複を確認できます。';out.note='武器・防具をそれぞれ必ず一つ選び、装備できない組はないと仮定します。';
      }else if(id==='B12'&&mode==='dice'){
        out.type='dice';out.favorable=a;out.face=b;out.scan=Math.min(6,Math.floor(p*6)+1);out.result=`確率 ${a}/6 = ${fmt(a/6,4)}`;out.formula=`当たり ${a} 通り ÷ 全ての出目 6 通り`;
        out.explanation='1〜6が同様に確からしいサイコロを仮定します。今回当たったかどうかと、当たる確率を区別します。';out.note=`現在の出目 ${out.face}：${out.face<=a?'当たり':'はずれ'}。出目を選ぶ操作は説明用で、抽選ではありません。`;
      }else if(id==='B12'&&mode==='expectation'){
        out.type='expectation';out.chance=a/100;out.reward=b;out.expected=a/100*b;out.result=`期待値 ${fmt(out.expected)} コイン`;out.formula=`${b} × ${a}/100 + 0 × (1−${a}/100) = ${fmt(out.expected)}`;
        out.explanation='値ごとに確率を掛けて足します。長方形の横幅を確率、縦を報酬とすると面積が期待値です。1回でこの報酬がもらえる保証ではありません。';
      }else if(id==='B12'&&mode==='conditional'){
        const returned=extra[0]===1,removed=p>=.5&&!returned;out.type='balls';out.initialRed=a;out.initialBlue=b;out.red=a-(removed?1:0);out.blue=b;out.returned=returned;out.result=`次が赤の確率 ${out.red}/${out.red+out.blue}`;out.formula=`${removed?'最初に赤を引き、戻さない':'赤を引く前、または戻した後'}：${out.red} ÷ ${out.red+out.blue} = ${fmt(out.red/(out.red+out.blue),4)}`;
        out.explanation='最初に赤を引いたと条件を固定します。戻さないと赤玉と全体が1個減り、次の確率が変わります。';out.note=returned?'引いた玉を戻すので、次の試行の赤玉の割合は変わりません。':'50%以降は、最初に赤玉を1個引いた後の袋を表示します。';
      }else if(id==='B18'&&mode==='approximation'){
        const u=a*p,exact=Math.sqrt(1+u),approx=1+u/2,error=Math.abs(approx-exact),bound=u*u/8,tolerance=10**b;
        const errorAt=x=>Math.abs(1+x/2-Math.sqrt(1+x));
        const extent=Math.max(.02,a);out.series=[series('実際の絶対誤差',lin(extent,errorAt)),series('誤差の上界 u²/8',lin(extent,x=>x*x/8),1),series('許容絶対誤差',[[0,tolerance],[extent,tolerance]],2)];out.marker=[u,error];
        out.absoluteError=error;out.errorBound=bound;out.errorLimit=tolerance;out.withinTolerance=error<=tolerance;
        out.result=`誤差 ${error.toExponential(3)} ／ ${out.withinTolerance?'許容内':'許容外'}`;
        out.formula=`u=${fmt(u,4)} ／ A=1+u/2 ／ 二乗後の残差 A²−(1+u)=u²/4`;
        out.explanation='厳密には√(1+u)=A−E(u)で、補正項−E(u)を省略した近似です。E(u)=u²/[4(A+√(1+u))]。uが0以上なら誤差はu²/8以下です。上界が許容値を超えても、実際の誤差が超えるとは限りません。';
        out.note=`厳密な式の数値 ${fmt(exact,8)} ／ 近似 ${fmt(approx,8)} ／ 上界 ${bound.toExponential(3)} ／ 許容 ${tolerance.toExponential(1)}。図の実際の誤差にも浮動小数点の丸めが含まれます。`;
      }else throw new Error(`Unknown experiment ${id}/${mode}`);
      out.caption=out.note||'値を変え、再生位置を動かして式と図を確認してください。';return out;
    }
    switch (id) {
      case 'B01': {
        const start=extra[0]??80,count=extra[1]??2,hits = Math.min(count,Math.floor(p*(count+1))), heal = p>=1?b:0;
        out.type='bars'; out.bars=[bar('開始HP',start,2),bar('被弾後',start-a*hits,0),bar('回復後',start-a*hits+heal,1)];
        out.result=`HP ${fmt(start-a*hits+heal)}`; out.formula=`${start} − ${a} × ${hits} + ${heal} = ${fmt(start-a*hits+heal)}`;
        out.note='この図は式の計算をそのまま表示し、HPの下限は設けません。負の値も表示します。';
        out.explanation='先に1回分のダメージと回数を掛け、HPから引きます。最後に回復量を加えます。'; break;
      }
      case 'B02': {
        const t=p*2; out.series=[series('移動距離',lin(2,t=>a*t))];out.marker=[t,a*t];
        out.result=`${fmt(a*t)} m`;out.formula=`距離 = ${a} m/s × ${fmt(t)} s`;
        out.note=`1回の更新：${fmt(a/b,4)} m（${b}回/秒）`;
        out.explanation='速さを一定にして時間を進めます。更新頻度を変えると1回の移動量は変わりますが、1秒間の距離は同じです。';break;
      }
      case 'B03': {
        const target=extra[0]??100,t=100*p;out.series=[series('上限あり',lin(100,t=>Math.min(100,b+a*t))),series('目標HP',[[0,target],[100,target]],2)];out.marker=[t,Math.min(100,b+a*t)];
        out.result=`HP ${fmt(Math.min(100,b+a*t))}`;out.formula=`HP = min(100, ${b} + ${a} × ${fmt(t)})`;
        out.note=`目標HP ${target}まで ${fmt(Math.max(0,(target-b)/a))} 秒。最大HPは100。`;out.explanation='目標と回復量から必要な時間を逆算します。開始時に目標へ達していれば必要時間は0秒です。';break;
      }
      case 'B04': {
        out.type='logic';out.operator='AND';out.logic=[!!a,b>=5];out.result=a&&b>=5?'扉が開く':'扉は閉じたまま';out.formula=`${a?'鍵あり':'鍵なし'} AND レベル ${b} ≥ 5`;
        out.note='(鍵,レベル条件)=(0,0)→0、(0,1)→0、(1,0)→0、(1,1)→1';
        out.explanation='ANDは両方が真のときだけ真です。鍵の有無とレベル4・5を切り替え、境界を確かめます。';break;
      }
      case 'B05': {
        out.type='vectors';const start=[-2,3],end=[a,b],mid=[(a-2)/2,(b+3)/2];out.vectors=[vec('A → B',add(start,scale(add(end,scale(start,-1)),p)),0,start)];out.dots=[{label:'A',point:start},{label:'B',point:end},{label:'中点',point:mid}];
        out.result=`中点 (${fmt(mid[0])}, ${fmt(mid[1])})`;out.formula=`M = ((−2 + ${a})/2, (3 + ${b})/2)`;out.explanation='原点と軸を固定し、2点の各成分を平均します。中点は線分を半分に分けます。';break;
      }
      case 'B06': {
        const max=a/b,t=max*p;out.series=[series('高さ',lin(max,t=>a*t-b*t*t))];out.marker=[t,a*t-b*t*t];out.result=`高さ ${fmt(out.marker[1])} m`;out.formula=`h(t) = ${a}t − ${b}t²  ／  t = ${fmt(t)}`;
        out.note=`最高点：${fmt(a/(2*b))}秒、${fmt(a*a/(4*b))}m`;out.explanation='時刻に対する高さを追います。二次項は時間とともに上昇を弱め、頂点の後は下降へ変えます。';break;
      }
      case 'B07': {
        const distance=a+6*(1-p);
        out.type='circles';out.distance=distance;out.radius=b;out.result=distance<=2+b?'接触または重なり':'離れている';out.formula=`${fmt(distance*distance)} ${distance<=2+b?'≤':'>'} (2 + ${b})² = ${fmt((2+b)**2)}`;
        out.note=`離れた位置から中心距離${a}へ接近。現在の距離 ${fmt(distance)}`;
        out.explanation='中心間の距離と半径の和を比較します。等しい場合も接触として扱います。円の大きさは実際の半径比で描いています。';break;
      }
      case 'B08': {
        out.type='circle';out.angle=b*p;out.radius=a;out.vectors=[vec('半径',[a*Math.cos(rad(b*p)),a*Math.sin(rad(b*p))])];out.result=`(${fmt(out.vectors[0].to[0])}, ${fmt(out.vectors[0].to[1])})`;out.formula=`(x,y) = ${a}(cos ${fmt(b*p)}°, sin ${fmt(b*p)}°)`;out.explanation='角度を進めると円周上を移動します。xとyは横方向・縦方向への成分です。';break;
      }
      case 'B09': {
        out.type='vectors';const v=[a,b],n=scale(normalize(v),5);out.vectors=[vec('入力',v,1),vec('速さ5に統一',scale(n,p),0)];out.result=length(v)?`(${fmt(n[0])}, ${fmt(n[1])})`:'ゼロ入力 → 停止';out.formula=length(v)?`v / |v| × 5  ／  |v| = ${fmt(length(v))}`:'|v| = 0 → 割り算を行わない';out.explanation='向きと大きさを分けます。長さで割って単位方向にし、目標の速さを掛けます。';break;
      }
      case 'B10': {
        out.type='vectors';const c=Math.cos(rad(b*p)),s=Math.sin(rad(b*p));out.vectors=[vec('拡大 → 回転',[a*c,a*s],0),vec('回転 → 拡大',[a*c,s],1)];out.result=`RS: (${fmt(a*c)}, ${fmt(a*s)})`;out.formula=`R(${fmt(b*p)}°) S と S R(${fmt(b*p)}°)`;out.explanation='x方向だけを拡大すると、回転との順序で結果が変わります。矢印の終点を比較してください。';break;
      }
      case 'B11': {
        let perm=1,fact=1;for(let k=0;k<b;k++){perm*=a-k;fact*=k+1;}out.type='combinations';out.total=perm/fact;out.revealed=Math.floor(out.total*p);out.result=`順序なし ${out.total} 通り`;out.formula=`順序あり ${perm} ÷ ${b}! = ${out.total}`;out.note=`n=${a}, k=${b}。重複なし。表示済み ${out.revealed} 組`;
        out.items=[];const choose=(start,items)=>{if(items.length===b){out.items.push(items);return;}for(let i=start;i<=a;i++)choose(i+1,[...items,i]);};choose(1,[]);
        out.explanation='各マスが一つの組合せです。並べ方の違いを同じ選択としてまとめるため、k!で割ります。';break;
      }
      case 'B12': {
        const n=Math.floor(p*b);let state=406,hits=0;for(let i=0;i<n;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;if(state/4294967296<a/100)hits++;}
        out.type='bars';out.bars=[bar('理論の当選率',a),bar('実験の当選率',n?100*hits/n:0,1)];out.result=n?`${hits} / ${n} 回当選`:'抽選前';out.formula=`理論 ${a}% ／ 観測 ${n?fmt(100*hits/n):'未計算'}%`;
        out.note='再現できる固定シードの疑似乱数。有限回の結果は理論値と一致するとは限りません。';out.explanation='再生すると抽選回数が増えます。当選率を変え、有限回のばらつきと理論値を比べます。';break;
      }
      case 'B13': {
        const values=[a,b??2,extra[0]??8],n=Math.floor(p*3),observed=values.slice(0,n),mean=n?observed.reduce((s,x)=>s+x,0)/n:0,variance=n?observed.reduce((s,x)=>s+(x-mean)**2,0)/n:0,sorted=[...observed].sort((x,y)=>x-y),median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
        out.type='bars';out.bars=values.map((v,i)=>bar(`${i+1}人目`,v,i<n?i:3));out.mean=n?mean:undefined;out.result=n?`平均 ${fmt(mean)} 分`:'データを観測する前';out.formula=n?`分散 = Σ(x − 平均)² / ${n} = ${fmt(variance)} 分²`:'再生すると1人ずつ観測に加わります';out.note=`観測 ${n}/3人。灰色は集計対象外。中央値 ${n?fmt(median)+'分':'未計算'} ／ 標準偏差 ${n?fmt(Math.sqrt(variance))+'分':'未計算'}`;out.explanation='3人それぞれの値を変えられます。外れた値で平均と中央値がどう変わるか、同じ値だけなら分散がどうなるかを比較します。';break;
      }
      case 'B14': {
        const n=Math.floor(p*(b-1))+1;out.type='bars';out.bars=Array.from({length:b},(_,i)=>bar(`${i+1}`,100+a*i,i<n?0:3));out.result=`${n}項の合計 ${fmt(n*(200+(n-1)*a)/2)}`;out.formula=`aₙ = 100 + (n−1) × ${a}`;out.explanation='再生で加える項を増やします。1段階に必要な量と、そこまでの合計を区別します。';break;
      }
      case 'B15': {
        const n=p*b;out.series=[series('指数的な成長',lin(b,n=>100*a**n)),series('一定量の増加',lin(b,n=>100+100*n),1)];out.marker=[n,100*a**n];out.result=fmt(out.marker[1]);out.formula=`100 × ${a}^${fmt(n)} = ${fmt(out.marker[1])}`;out.explanation='同じ量を加える成長と、同じ倍率を掛ける成長を比較します。段階数を求める逆の計算には対数を使います。';break;
      }
      case 'B16': {
        const t=2*p;out.series=[series('速度 v(t)',lin(2,t=>a*t+b))];out.marker=[t,a*t+b];out.area=t;out.result=`変位 ${fmt(a*t*t/2+b*t)} m`;out.formula=`∫₀ᵗ (${a}t + ${b}) dt = ${fmt(a*t*t/2+b*t)} m`;out.note=`時刻 ${fmt(t)}秒 ／ 速度 ${fmt(a*t+b)}m/s`;out.explanation='速度グラフの下の面積を積み上げると変位になります。この例では速度が非負なので移動距離とも一致します。';break;
      }
      case 'B17': {
        out.type='bits';out.bits=a.toString(2).padStart(6,'0');out.mod=a%b;out.result=`余り ${a%b} ／ 商 ${Math.floor(a/b)}`;out.formula=`${a} = ${b} × ${Math.floor(a/b)} + ${a%b}`;out.note=`二進数 ${out.bits} ／ 十六進数 ${a.toString(16).toUpperCase()}`;out.explanation='点灯した桁の重みを合計すると元の十進数に戻ります。剰余は循環する配列番号にも使えます。';break;
      }
      case 'B18': {
        out.type='lerp';out.start=a;out.end=b;out.current=(1-p)*a+p*b;out.result=fmt(out.current);out.formula=`(1 − ${fmt(p)}) × ${a} + ${fmt(p)} × ${b} = ${fmt(out.current)}`;out.explanation='2つの値を重み付きで混ぜます。再生位置を変え、t=0でa、t=1でbとなることを確かめます。';break;
      }
      case 'A01': {
        out.type='vectors';const z=[3,4],c=Math.cos(rad(a*p)),s=Math.sin(rad(a*p)),v=[b*(3*c-4*s),b*(3*s+4*c)];out.vectors=[vec('元の複素数 3+4i',z,1),vec('回転後',v,0)];out.result=`${fmt(v[0])} ${v[1]<0?'−':'+'} ${fmt(Math.abs(v[1]))}i`;out.formula=`(3+4i) × ${b}(cos ${fmt(a*p)}° + i sin ${fmt(a*p)}°)`;out.note=`絶対値 ${fmt(length(v))}`;out.explanation='複素数の積で偏角を加え、絶対値を掛けます。行列による2D回転と同じ座標になります。';break;
      }
      case 'A02': {
        out.type='rotation3d';const q=euler(b*p,a,b*p),baseline=euler(0,a,0);out.frames=[{q:baseline,label:'基準：roll=yaw=0°',color:1},{q,label:'roll・yawを同時変更',color:0}];
        out.axes=[rotate(axisAngle([0,1,0],a),[1,0,0]),[0,0,1]];const error=Math.max(...[0,1,2].flatMap(i=>{const v=[0,0,0];v[i]=1;return rotate(q,v).map((x,j)=>Math.abs(x-rotate(baseline,v)[j]));}));
        out.result=`基準との差 ${fmt(error,4)}`;out.formula=`Rz(${fmt(b*p)}°) Ry(${a}°) Rx(${fmt(b*p)}°)`;out.note='差は3本の基底ベクトルの成分差の最大値。pitch=±90°で軸が平行になります。';out.explanation=a===90?'pitch=90°ではrollとyawを同量変えても姿勢は変わりません。角度の組を一意に分けられなくなります。':'pitchを90°から離すと、rollとyawの同時変更が姿勢へ現れます。−90°では同量変更は打ち消し合いません。';break;
      }
      case 'A03': {
        out.type='rotation3d';const qx=axisAngle([1,0,0],a*p),qy=axisAngle([0,1,0],b*p),q=multiply(qy,qx);out.frames=[{q,label:'x → y の順',color:0},{q:multiply(qx,qy),label:'y → x の順',color:1}];const v=rotate(q,[0,0,1]);out.result=`ez → (${v.map(x=>fmt(x)).join(', ')})`;out.formula=`q = qy qx  ／  |q| = ${fmt(length(q),4)}`;out.note='左：xの後にy。右：yの後にx。各色の軸は同じ基底を表します。';out.explanation='同じ2つの回転でも、適用順序で最終姿勢が変わります。クォータニオンは回転の合成を表します。';break;
      }
      case 'A04': {
        const raw=a+(b-a)*p;const q=slerp(axisAngle([0,0,1],a),axisAngle([0,0,1],b),p);const v=rotate(q,[1,0,0]);out.type='vectors';out.vectors=[vec('角度を直接補間',[3*Math.cos(rad(raw)),3*Math.sin(rad(raw))],1),vec('SLERP',scale(v.slice(0,2),3),0)];out.result=`SLERP ${fmt((Math.atan2(v[1],v[0])*180/Math.PI+360)%360)}°`;out.formula=`直接補間 ${fmt(raw)}° ／ t = ${fmt(p)}`;out.note='同一z軸の2姿勢を比較。180°差では最短経路の選び方が必要です。';out.explanation='350°から10°の中点を比べてください。角度を直接混ぜる経路は180°を通り、SLERPは0°付近を通ります。';break;
      }
      case 'A05': {
        out.type='vectors';const c=Math.cos(rad(b*p)),s=Math.sin(rad(b*p));out.vectors=[vec('親の位置',[a,0],2),vec('TR：回転 → 平行移動',[a+2*c,2*s],0),vec('RT：平行移動 → 回転',[(a+2)*c,(a+2)*s],1)];out.result=`TR (${fmt(a+2*c)}, ${fmt(2*s)})`;out.formula='p_world = T R p_local  ／  p_local = (2,0)';out.explanation='列ベクトルには右側の変換から作用します。親の位置を先に足してから回すと、親の平行移動まで回転してしまいます。';break;
      }
      case 'A06': {
        const points=[[[0,0]],[[0,0]]];const end=p;let x1=0,x2=0,v=0,t=0;
        while(t<end-1e-10){const dt=Math.min(a,end-t);x1+=v*dt;v-=b*dt;x2+=v*dt;t+=dt;points[0].push([t,x1]);points[1].push([t,x2]);}
        out.absoluteError=Math.abs(x1+b*end*end/2);out.errorBound=b*a*end/2;out.errorLimit=extra[0]??1;out.withinTolerance=out.absoluteError<=out.errorLimit;
        out.series=[series('解析式',lin(1,t=>-b*t*t/2),2),series('陽的オイラー',points[0],1),series('半陰的オイラー',points[1],0)];out.result=`陽的 ${fmt(x1)} m ／ 半陰的 ${fmt(x2)} m`;out.formula=`厳密値 x(${fmt(p)}) = −${b} × ${fmt(p)}² / 2`;out.note=`最終区間のみ残り時間で更新。陽的の誤差 ${fmt(out.absoluteError,4)}m ／ 上界 ${fmt(out.errorBound,4)}m ／ 許容 ${out.errorLimit}m：${out.withinTolerance?'許容内':'許容外'}`;out.explanation='この一定加速度モデルでは、各区間の位置更新で加速度による−g dt²/2を省略します。誤差はg/2×Σdtᵢ²で、上界はg dt t/2です。小さな刻みでも一般の運動の安定性を保証するわけではありません。';break;
      }
      case 'A07': {
        const n=Math.floor(p*10);let x=0;const points=[[0,x]];for(let i=1;i<=n;i++){x+=a*(10-x)*b;points.push([i*b,x]);}out.series=[series('位置',points),series('目標',[[0,10],[10*b,10]],1)];out.result=`位置 ${fmt(x)}`;out.formula=`x_next = x + ${a} × (10 − x) × ${b}`;out.note=`Kp dt = ${fmt(a*b)} ／ ${a*b>0&&a*b<2?'このモデルは収束する':'収束条件の範囲外'}`;out.explanation='ゲインを変えると追従の速さ、行き過ぎ、発散が変わります。一次モデルの条件は0 < Kp dt < 2です。';break;
      }
      case 'A08': {
        const input=Array.from({length:14},(_,i)=>i<5?0:b),avg=[];for(let i=a-1;i<input.length;i++)avg.push([i,input.slice(i-a+1,i+1).reduce((s,x)=>s+x,0)/a]);const t=Math.floor(13*p);out.series=[series('入力',input.map((v,i)=>[i,v]),1),series('移動平均',avg,0)];if(t>=a-1)out.marker=[t,avg[t-a+1][1]];out.result=t>=a-1?`平均 ${fmt(out.marker[1])}`:'入力がそろうまで待つ';out.formula=`y[n] = 直近 ${a} 個の入力の合計 / ${a}`;out.note='幅が大きいほど急な変化への応答が遅れます。先頭の点がそろう前は平均を出しません。';out.explanation='段差を滑らかにする代わりに、入力の変化が出力へ届くまで遅れが生じます。';break;
      }
      case 'A09': {
        out.type='reflection';out.v=[a,b];out.reflected=[a,-b];out.result=`反射 (${fmt(a)}, ${fmt(-b)})`;out.formula=`v′ = v − 2(v・n)n  ／  n = (0,1)`;out.note=`速さ ${fmt(Math.hypot(a,b))} を保存。摩擦・損失は含めません。`;out.explanation='壁に垂直な成分の符号を反転します。壁に沿う成分はそのままです。';break;
      }
      case 'A10': {
        const delta=b*p,exact=a+delta,rounded=Math.fround(Math.fround(a)+Math.fround(delta));out.type='precision';out.exact=exact;out.rounded=rounded;out.origin=a;out.absoluteError=Math.abs(rounded-exact);out.errorLimit=extra[0]??.1;out.withinTolerance=out.absoluteError<=out.errorLimit;out.result=`誤差 ${fmt(rounded-exact,4)} m`;out.formula=`実数モデル ${fmt(exact,4)} m ／ binary32 ${fmt(rounded,4)} m`;out.note=`絶対誤差 ${fmt(out.absoluteError,4)}m ／ 許容 ${out.errorLimit}m：${out.withinTolerance?'許容内':'許容外'}。通常のJavaScriptはbinary64。Math.froundでbinary32への丸めを明示しています。`;out.explanation='大きな座標では表現できる数の間隔が広がります。相対誤差が小さくても、必要な絶対誤差を満たすとは限りません。';break;
      }
      default: throw new Error(`Unknown lesson ${id}`);
    }
    out.caption=out.note || '数値を変更し、再生位置を動かして図と式の関係を確認してください。';
    return out;
  }
  const api={config,experiments,getExperiments,getControls,evaluate,multiply,axisAngle,rotate,euler,slerp,normalize,length,dot,fmt};
  root.MathModels=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
