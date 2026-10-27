/* Fictional consumer models and a bounded M.LEAGUE scoring model. No network or RNG. */
(function(root){
  'use strict';
  const valid=(value,name,min=0)=>{if(!Number.isFinite(value)||value<min)throw new RangeError(`${name}の範囲外`);};
  const ceil100=value=>Math.ceil(value/100)*100;
  function roundFu(raw,{sevenPairs=false,pinfuTsumo=false}={}){
    valid(raw,'符',20);
    if(sevenPairs&&pinfuTsumo)throw new RangeError('七対子と平和ツモは同時指定できません');
    return sevenPairs?25:pinfuTsumo?20:Math.max(30,Math.ceil(raw/10)*10);
  }
  function mahjong({fu=30,han=3,dealer=false,tsumo=false,yakuman=false}={}){
    if(!yakuman){
      if(!Number.isInteger(fu)||!(fu===25||(fu>=20&&fu<=110&&fu%10===0)))throw new RangeError('確定符は20・25・30・40…110。35符などの合計は先に切り上げます');
      if(!Number.isInteger(han)||han<1||han>30)throw new RangeError('翻は1〜30（場ゾロを除く）');
      if(fu===20&&(!tsumo||han<2))throw new RangeError('20符は平和ツモの2翻以上');
      if(fu===25&&han<(tsumo?3:2))throw new RangeError('七対子25符はロン2翻以上・ツモ3翻以上');
      if(fu===110&&han===1)throw new RangeError('110符1翻は採用点数表の対象外');
    }
    const rawBase=yakuman?8000:fu*2**(han+2);
    let base=rawBase,tier='通常点';
    if(yakuman){base=8000;tier='単独役満';}
    else if(han>=11){base=6000;tier='三倍満';}
    else if(han>=8){base=4000;tier='倍満';}
    else if(han>=6){base=3000;tier='跳満';}
    else if(han>=5||rawBase>=2000||rawBase===1920){base=2000;tier=rawBase===1920?'切り上げ満貫':'満貫';}
    const payers=tsumo?(dealer?
      [{label:'子A',amount:ceil100(2*base)},{label:'子B',amount:ceil100(2*base)},{label:'子C',amount:ceil100(2*base)}]:
      [{label:'親',amount:ceil100(2*base)},{label:'子A',amount:ceil100(base)},{label:'子B',amount:ceil100(base)}]):
      [{label:'放銃者',amount:ceil100((dealer?6:4)*base)}];
    return {rawBase,base,tier,payers,total:payers.reduce((s,x)=>s+x.amount,0)};
  }
  function lottery(probability,trials){
    valid(probability,'確率');valid(trials,'回数');
    if(probability>1||!Number.isInteger(trials))throw new RangeError('確率は0〜1、回数は0以上の整数');
    const failure=trials===0?1:probability===1?0:Math.exp(trials*Math.log1p(-probability));
    const approximation=Math.exp(-trials*probability);
    const lower=probability===1?(trials===0?1:0):Math.exp(-trials*probability/(1-probability));
    return {failure,success:1-failure,approximation,lower,error:approximation-failure,expectedCount:trials*probability,expectedWait:probability===0?null:1/probability};
  }
  function returns(probability,reward,cost){
    lottery(probability,0);valid(reward,'払戻');valid(cost,'費用');
    const payout=probability*reward,ratio=cost===0?null:payout/cost;
    return {payout,net:payout-cost,ratio,deduction:ratio===null?null:1-ratio};
  }
  function damage(attack,armor,hits){
    [attack,armor,hits].forEach((v,i)=>valid(v,['攻撃','防御','回数'][i]));
    if(!Number.isInteger(hits))throw new RangeError('回数は整数');
    const perHit=Math.max(0,attack-armor);return {perHit,total:perHit*hits};
  }
  function recipe(originalPeople,targetPeople,grams){valid(originalPeople,'元の人数',1);valid(targetPeople,'人数');valid(grams,'質量');return {scale:targetPeople/originalPeople,grams:grams*targetPeople/originalPeople};}
  function shopping(price,grams,discountPercent){valid(price,'価格');valid(grams,'質量',1);valid(discountPercent,'割引');if(discountPercent>100)throw new RangeError('割引は100%まで');const paid=price*(1-discountPercent/100);return {paid,per100g:paid/grams*100};}
  function video(mbps,minutes){valid(mbps,'ビットレート');valid(minutes,'時間');const seconds=minutes*60,bits=mbps*1e6*seconds,bytes=bits/8;return {seconds,bits,bytes,MB:bytes/1e6,MiB:bytes/2**20};}
  function experiments(param){
    return {
      B01:[{id:'damage',label:'応用：攻撃・防御・連続ダメージ',controls:[param('攻撃力',0,100,5,40),param('防御力',0,100,5,15),param('攻撃回数',0,5,1,3)]}],
      B02:[{id:'recipe',label:'生活：料理の人数と材料',controls:[param('元の人数',1,8,1,2,'人'),param('作る人数',0,12,1,5,'人'),param('元の材料',0,800,50,300,'g')]},{id:'shopping',label:'生活：割引後の100g単価',controls:[param('表示価格',0,1200,50,300,'円'),param('内容量',100,1000,100,500,'g'),param('割引率',0,100,5,20,'%')]}],
      B12:[{id:'waiting',label:'応用：ドロップ・架空抽選とe',controls:[param('1回の成功確率',0,100,1,1,'%'),param('比較する回数',0,1000,1,100,'回')]},{id:'return',label:'消費者教育：払戻期待値と控除率',controls:[param('架空の成功確率',0,100,1,1,'%'),param('成功時の総払戻',0,2000,20,80,'点'),param('毎回の費用',0,20,1,1,'点')]}],
      B15:[{id:'mahjong',label:'応用：麻雀の符・翻と支払配分',controls:[param('確定した符（25以外は10刻み）',20,110,5,30,'符'),param('翻（場ゾロを除く）',1,13,1,3,'翻'),param('親（1=親、0=子）',0,1,1,0),param('ツモ（1=ツモ、0=ロン）',0,1,1,0)]},{id:'yakuman',label:'応用：単独役満の支払配分',controls:[param('親（1=親、0=子）',0,1,1,0),param('ツモ（1=ツモ、0=ロン）',0,1,1,1)]}],
      B17:[{id:'video',label:'生活：動画のビットレートと容量',controls:[param('映像と音声の合計',0,40,.5,8,'Mb/s'),param('動画の時間',0,60,1,10,'分')]}]
    };
  }
  function evaluate(id,a,b,p,mode,extra,fmt){
    const out={id,experiment:mode,p,type:'flow',series:[],vectors:[],bars:[],steps:[],formula:'',result:'',note:'',explanation:'',caption:''};
    const step=(label,value,detail='')=>({label,value,detail});
    if(id==='B01'&&mode==='damage'){
      const d=damage(a,b,extra[0]??3);Object.assign(out,d);
      out.steps=[step('1回の差',`${a} − ${b} = ${a-b}`),step('負のダメージを0へ',`${d.perHit}`,'max(0, 攻撃力−防御力)'),step('回数分の合計',`${d.total} HP`,`${d.perHit} × ${extra[0]??3}`)];
      out.formula=`D = max(0, ${a} − ${b}) × ${extra[0]??3}`;out.result=`合計 ${d.total} HP`;
      out.note='架空のゲームの規則。防御が攻撃を上回っても、攻撃による回復は起こさない。クリティカル等は含めない。';out.explanation='負数を0へ制限する位置を決めます。回数を掛ける前に1回の値を確かめ、0回・同値・防御超過も検算します。';
    }else if(id==='B02'&&mode==='recipe'){
      const d=recipe(a,b,extra[0]??300);Object.assign(out,d);
      out.steps=[step('人数の倍率',`${b} ÷ ${a} = ${fmt(d.scale)}`),step('材料を同じ倍率に',`${fmt(d.grams)} g`,`${extra[0]??300} g × ${fmt(d.scale)}`),step('前提を確認','材料の質量が人数に比例','加熱時間や鍋の直径まで同じ倍率にはしない')];
      out.result=`必要な材料 ${fmt(d.grams)} g`;out.formula=`${extra[0]??300} g × ${b}人 / ${a}人 = ${fmt(d.grams)} g`;out.note='材料の質量を比例で見積もるモデル。人数0なら材料0g。調味料や加熱は実際に調整する。';out.explanation='基準の人数と材料を対応させ、人数だけを変えます。長さ・面積・体積の拡大とは分けて考えます。';
    }else if(id==='B02'&&mode==='shopping'){
      const d=shopping(a,b,extra[0]??20);Object.assign(out,d);
      out.steps=[step('支払う割合',`${100-(extra[0]??20)}%`),step('割引後の価格',`${fmt(d.paid)} 円`),step('100g当たり',`${fmt(d.per100g)} 円/100g`,`${fmt(d.paid)} ÷ ${b} × 100`)];
      out.result=`100g当たり ${fmt(d.per100g)} 円`;out.formula=`${a} × (1 − ${(extra[0]??20)}/100) ÷ ${b} × 100`;out.note='表示価格は税込み、追加費用なしとする。ここでは途中の円未満を丸めず、実際の店の端数処理とは区別する。';out.explanation='割引率だけでは比べられません。支払額を同じ質量当たりに直し、20%引きが価格を0.8倍にすることも確かめます。';
    }else if(id==='B12'&&mode==='waiting'){
      const probability=a/100,n=Math.floor(b*p),d=lottery(probability,n);Object.assign(out,d);out.type='graph';out.n=n;
      const ns=Array.from({length:Math.min(b,200)+1},(_,i)=>Math.round(b*i/Math.max(1,Math.min(b,200))));
      out.series=[{label:'全て外れる確率（厳密）',points:ns.map(x=>[x,lottery(probability,x).failure]),color:0},{label:'exp(−np) 近似',points:ns.map(x=>[x,Math.exp(-x*probability)]),color:1},{label:'1/e（比較用）',points:[[0,1/Math.E],[b,1/Math.E]],color:2}];
      out.marker=[n,d.failure];out.axisLabels=['試行回数 n','全て外れる確率'];
      out.result=`${n}回で1回以上成功 ${fmt(d.success*100,4)}%`;
      out.formula=`(1−${probability})^${n} = ${fmt(d.failure,8)} ／ exp(−np) = ${fmt(d.approximation,8)}`;
      out.note=`外れ確率の近似誤差 ${fmt(d.error,8)}（確率差）。1/e≈0.36787944。成功回数の期待値 np=${fmt(d.expectedCount)}個。初成功までの平均（成功回を含む）は ${d.expectedWait===null?'有限でない':fmt(d.expectedWait)+'回'}。次の1回の成功確率は常に${a}%。`;
      out.explanation='独立・一定確率の架空抽選。ドロップ数np、1回以上の確率、平均待ち1/pは異なる量です。pが小さくnp≈1なら外れ確率は約1/e。近似はpが大きい場合やnp²が大きい場合に注意し、厳密値と比べます。実機の仕組みや攻略を表しません。';
    }else if(id==='B12'&&mode==='return'){
      const cost=extra[0]??1,d=returns(a/100,b,cost);Object.assign(out,d);
      out.steps=[step('1回の払戻期待値',`${fmt(d.payout)} 点`,`${a}/100 × ${b}`),step('1回の期待収支',`${fmt(d.net)} 点`,`${fmt(d.payout)} − ${cost}`),step('理論還元率 / 控除率',d.ratio===null?'費用0なので定義できない':`${fmt(d.ratio*100)}% / ${fmt(d.deduction*100)}%`,'還元率=払戻期待値÷費用、控除率=1−還元率')];
      out.result=`1回の期待収支 ${fmt(d.net)} 点`;out.formula=`E[収支] = ${a}/100 × ${b} − ${cost} = ${fmt(d.net)}`;
      out.note='現金や実機の設定を使わない架空の点数モデル。還元率が100%を超える設定なら、この定義の控除率は負になる。費用0では率を定義しない。';out.explanation='eは外れ続ける確率の近似に現れますが、払戻期待値は成功確率と払戻の積で決まります。過去の外れは次の成功確率を高めません。期待値は有限回の収支を保証せず、実際の遊技や攻略を勧める課題ではありません。';
    }else if(id==='B15'&&(mode==='mahjong'||mode==='yakuman')){
      const dealer=mode==='yakuman'?Boolean(a):Boolean(extra[0]),tsumo=mode==='yakuman'?Boolean(b):Boolean(extra[1]);
      out.note='Mリーグ方式、0本場・供託なし。翻は場ゾロを除く。符・役判定済みの手を入力し、全ての手牌の合法性は判定しない。';
      out.explanation='基本点を求め、上限を選び、各支払者の金額を100点単位で切り上げます。七対子は25符固定、平和ツモは20符。数え役満なし、11翻以上は三倍満。単独役満は別の図。複合役満・包・本場・供託は対象外です。';
      try{
        const d=mahjong({fu:a,han:b,dealer,tsumo,yakuman:mode==='yakuman'});Object.assign(out,d);
        out.steps=[step('1 基本点',`${d.rawBase} → ${d.base}`,d.tier),step(`2 ${dealer?'親':'子'}の${tsumo?'ツモ':'ロン'}`,d.payers.map(x=>`${x.label} ${x.amount}点`).join(' / '),'各支払者ごとに100点単位で切り上げ'),step('3 受取合計',`${d.total} 点`,'ロンとツモは切上げの回数が異なる')];
        out.result=`${d.tier}・受取 ${d.total} 点`;out.formula=mode==='yakuman'?'単独役満の基本点 B=8000':`B = ${a} × 2^(${b}+2) = ${d.rawBase} → 採用 ${d.base}`;
      }catch(error){out.inputError=error.message;out.steps=[step('入力の条件を確認',`${a}符 ${b}翻`),step('この組合せは計算しない',error.message),step('有効な例へ戻す','30符3翻などを選ぶ')];out.result='入力条件を確認してください';out.formula=error.message;}
    }else if(id==='B17'&&mode==='video'){
      const d=video(a,b);Object.assign(out,d);
      out.steps=[step('分を秒へ',`${b} × 60 = ${d.seconds} 秒`),step('bitからbyteへ',`${fmt(a)} Mb/s × ${d.seconds}秒 ÷ 8`,'小文字b=bit、大文字B=byte。1byte=8bit'),step('保存容量',`${fmt(d.MB)} MB / ${fmt(d.MiB)} MiB`,'1MB=10⁶byte、1MiB=2²⁰byte')];
      out.result=`約 ${fmt(d.MB)} MB`;out.formula=`${a} × 10⁶ bit/s × ${b} × 60 s ÷ 8 = ${fmt(d.bytes)} byte`;out.note='映像と音声を合わせた一定ビットレート。容器形式等の付加情報は省く。実動画は可変ビットレート等でずれるため概算として使う。';out.explanation='速さに時間を掛ける考え方をデータ量へ使います。bitとbyte、十進接頭辞と二進接頭辞を区別して桁を確かめます。';
    }else return null;
    out.caption=out.type==='flow'?'再生位置で計算の段階を強調します。表示する値は入力から求めた確定値です。':'nは整数です。曲線は計算した点を結んだ表示で、再生位置が比較する回数を表します。';
    return out;
  }
  const api={ceil100,roundFu,mahjong,lottery,returns,damage,recipe,shopping,video,experiments,evaluate};
  root.MathGameLife=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
