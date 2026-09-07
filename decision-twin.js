(()=>{
  if(!(location.pathname==='/'||location.pathname.startsWith('/check/')))return;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ACTIVE='ei_active_decision', TWIN='ei_decision_twin_v1';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const numberFrom=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\$?\s*(-?\d+(?:\.\d+)?)/);return m?Number(m[1]):0};
  const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_e){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_e){return false}};
  const esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function rowValue(root,rx){for(const row of $$('.decision-command-grid>div,.meaning-grid>div',root)){const lab=clean($('span',row)?.textContent||$('b',row)?.textContent);if(rx.test(lab))return clean($('strong',row)?.textContent||'')}return''}
  function context(root){
    const a=read(ACTIVE,{})||{};
    const title=clean(a.title||a.text||$('[data-result-title]',root)?.textContent||'Active decision');
    const base=Number(a.price)||numberFrom(rowValue(root,/^PRICE$|ASKING|QUOTE/i));
    const marketText=rowValue(root,/MARKET|COMPARABLE/i),market=/unverified|not verified/i.test(marketText)?0:numberFrom(marketText);
    const fuelText=rowValue(root,/FUEL\s*\/\s*YR|ANNUAL FUEL/i),fuel=numberFrom(fuelText);
    const unknowns=$$('.check-unknown',root).map(x=>clean(x.textContent)).filter(Boolean);
    const call=clean($('[data-decision-call]',root)?.textContent),reason=clean($('[data-decision-reason]',root)?.textContent);
    const score=clean($('[data-result-score]',root)?.textContent),status=clean($('[data-result-label]',root)?.textContent);
    const evidence=$$('[data-result-evidence] article',root).map(x=>clean(x.textContent)).filter(Boolean);
    const category=String(a.category||'personal').toLowerCase();
    return {a,title,base,market,marketText,fuel,fuelText,unknowns,call,reason,score,status,evidence,category};
  }

  function scenarioTotal(base,delta,annual,growth,years,shock,recovery){
    let recurring=0;for(let i=0;i<years;i++)recurring+=annual*Math.pow(1+growth/100,i);
    const start=Math.max(0,base+delta),total=Math.max(0,start+recurring+shock-recovery);
    return {start,recurring,total,deltaTotal:total-base};
  }
  function tracePoints(v){
    const {base,delta,annual,growth,years,shock,recovery}=v;
    const vals=[Math.max(0,base+delta)];let running=vals[0];
    for(let i=0;i<years;i++){running+=annual*Math.pow(1+growth/100,i);vals.push(running)}
    running+=shock;vals.push(running);running=Math.max(0,running-recovery);vals.push(running);
    const max=Math.max(...vals,base,1),min=0,w=100,h=100;
    return vals.map((n,i)=>[5+(i/(vals.length-1||1))*90,92-(n/max)*78,n]);
  }
  function categoryAsks(c){
    if(/vehicle/.test(c))return [
      ['Dealer fees','Ask for the full out-the-door price with every fee itemized before discussing a monthly payment.'],
      ['Financing terms','Negotiate APR, term and add-ons separately from vehicle price.'],
      ['Condition / recall completion','Use unresolved VIN, condition or recall status as a diligence condition—not as a made-up discount.']
    ];
    if(/property/.test(c))return [
      ['Credits / closing costs','If price leverage is weak, negotiate seller credits, repairs or closing-cost support where appropriate.'],
      ['Condition items','Convert inspection or system uncertainty into specific repair, credit or contingency requests.'],
      ['Timing / contingencies','Closing timing, financing, inspection and appraisal terms can have real value beyond headline price.']
    ];
    if(/home|project|equipment/.test(c))return [
      ['Scope certainty','Require inclusions, exclusions, allowances and change-order rules in writing before negotiating price.'],
      ['Schedule / warranty','Negotiate completion, commissioning, warranty and failure responsibility—not just a lower number.'],
      ['Payment structure','Tie deposits and progress payments to verifiable milestones where appropriate.']
    ];
    return [
      ['Total delivered price','Separate taxes, fees, subscriptions and required add-ons from the advertised amount.'],
      ['Terms / warranty','Negotiate cancellation, warranty, service and payment terms when direct price evidence is weak.'],
      ['Reversibility','Ask for the cleanest return, cancellation or exit path available before commitment.']
    ];
  }

  function buildSuite(root){
    if($('.ei-twin-suite',root))return;
    const pass=$('.ei-live-passport',root);if(!pass)return;
    const ctx=context(root),saved=read(TWIN,{})||{},suite=document.createElement('div');suite.className='ei-twin-suite';
    suite.innerHTML=`<section class="ei-decision-twin"><div class="ei-twin-head"><div><div class="ei-twin-kicker">Decision Twin / Live scenario</div><h3>Change one assumption. Watch the commitment move.</h3></div><p>The Twin only models inputs you choose or evidence ExpenseIntel has already connected. Blank inputs stay zero; there are no hidden financing, resale or maintenance assumptions.</p></div><div class="ei-twin-grid"><div class="ei-twin-controls"><div class="ei-twin-base"><span>Known commitment amount</span><strong data-twin-base>${ctx.base?money(ctx.base):'Not verified'}</strong></div><div class="ei-twin-field"><label>Price change vs. current <output data-twin-delta-out>$0</output></label><input data-twin-delta type="range" min="${ctx.base?-Math.min(ctx.base*.25,50000):-10000}" max="${ctx.base?Math.min(ctx.base*.25,50000):10000}" step="100" value="${Number(saved.delta)||0}"></div><div class="ei-twin-field"><label>Annual recurring burden</label><input data-twin-annual type="number" min="0" step="100" value="${Number(saved.annual)||''}" placeholder="Only if you know it"></div><div class="ei-twin-field"><label>Annual cost growth <output data-twin-growth-out>${Number(saved.growth)||0}%</output></label><input data-twin-growth type="range" min="0" max="12" step=".5" value="${Number(saved.growth)||0}"></div><div class="ei-twin-field"><label>Model horizon <output data-twin-years-out>${Number(saved.years)||5} years</output></label><input data-twin-years type="range" min="1" max="10" step="1" value="${Number(saved.years)||5}"></div><div class="ei-twin-field"><label>One-time downside cost</label><input data-twin-shock type="number" min="0" step="100" value="${Number(saved.shock)||''}" placeholder="Optional stress cost"></div><div class="ei-twin-field"><label>Recovery / exit value</label><input data-twin-recovery type="number" min="0" step="100" value="${Number(saved.recovery)||''}" placeholder="Only if you want to model it"></div>${ctx.fuel?`<div class="ei-twin-source"><span>Connected recurring signal</span><strong>${money(ctx.fuel)} / yr fuel context</strong><small>This is the annual fuel figure already connected in this Check, not a full ownership-cost estimate.</small><button type="button" data-use-connected>Use as recurring input</button></div>`:''}</div><div class="ei-twin-stage"><div class="ei-twin-readouts"><div class="ei-twin-readout primary"><span>Scenario cash commitment</span><strong data-twin-total>—</strong></div><div class="ei-twin-readout"><span>Recurring burden in horizon</span><strong data-twin-recurring>—</strong></div><div class="ei-twin-readout"><span>Difference vs. known amount</span><strong data-twin-gap>—</strong></div></div><div class="ei-twin-chart"><div class="ei-twin-chart-label">Cumulative scenario / user-controlled</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Decision Twin cumulative scenario chart"><path class="grid" d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"/><path class="base" data-twin-base-line d="M0 50 H100"/><path class="trace" data-twin-trace d=""/><circle class="dot" data-twin-dot cx="95" cy="50" r="2.2"/></svg></div><div class="ei-twin-flow"><div><span>Entry</span><strong data-twin-entry>—</strong></div><div><span>Carry</span><strong data-twin-carry>—</strong></div><div><span>Shock</span><strong data-twin-shock-out>$0</strong></div><div><span>Recovery</span><strong data-twin-recovery-out>$0</strong></div></div><div class="ei-twin-actions"><small>Decision Twin is scenario math, not a forecast. It becomes more useful as the Passport gets better evidence.</small><div><button type="button" data-twin-copy>Copy scenario</button><button type="button" data-twin-negotiate>Use price in negotiation</button></div></div></div></div></section><section class="ei-negotiation"><div class="ei-neg-head"><div><div class="ei-neg-kicker">Negotiation Intelligence / Action layer</div><h3>Turn evidence into leverage without bluffing.</h3></div><p>ExpenseIntel separates real leverage from things you still need to verify, then builds a concise negotiation brief around the outcome you actually want.</p></div><div class="ei-neg-body"><aside class="ei-neg-objective"><span>Objective</span><button type="button" class="active" data-neg-objective="price">Lower the price</button><button type="button" data-neg-objective="terms">Improve the terms</button><button type="button" data-neg-objective="risk">Reduce my risk</button><div class="ei-neg-target"><label>Target amount</label><input data-neg-target type="number" min="0" step="100" placeholder="Optional"><small>ExpenseIntel does not invent a target. Set one yourself or send the scenario price from Decision Twin.</small></div></aside><div class="ei-neg-main"><div class="ei-neg-position"><span>Negotiation position</span><strong data-neg-position>Building…</strong></div><div class="ei-neg-leverage" data-neg-leverage></div><div class="ei-neg-brief"><div class="ei-neg-brief-head"><span>Evidence-backed brief</span><button type="button" data-neg-copy>Copy brief</button></div><div class="ei-neg-script" data-neg-script></div></div><div class="ei-neg-caution" data-neg-caution></div></div></div></section>`;
    pass.insertAdjacentElement('afterend',suite);
    bindTwin(suite,ctx);bindNegotiation(suite,ctx);
  }

  function bindTwin(suite,ctx){
    const delta=$('[data-twin-delta]',suite),annual=$('[data-twin-annual]',suite),growth=$('[data-twin-growth]',suite),years=$('[data-twin-years]',suite),shock=$('[data-twin-shock]',suite),recovery=$('[data-twin-recovery]',suite);
    const update=()=>{
      const v={base:ctx.base||0,delta:Number(delta.value)||0,annual:Number(annual.value)||0,growth:Number(growth.value)||0,years:Number(years.value)||5,shock:Number(shock.value)||0,recovery:Number(recovery.value)||0};
      const r=scenarioTotal(v.base,v.delta,v.annual,v.growth,v.years,v.shock,v.recovery),pts=tracePoints(v),path=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '),last=pts[pts.length-1];
      $('[data-twin-delta-out]',suite).textContent=(v.delta>=0?'+':'')+money(v.delta).replace('$-','-$');$('[data-twin-growth-out]',suite).textContent=v.growth.toFixed(1).replace('.0','')+'%';$('[data-twin-years-out]',suite).textContent=v.years+' year'+(v.years===1?'':'s');$('[data-twin-total]',suite).textContent=ctx.base?money(r.total):'Enter a known amount';$('[data-twin-recurring]',suite).textContent=money(r.recurring);$('[data-twin-gap]',suite).textContent=ctx.base?`${r.deltaTotal>=0?'+':'−'}${money(Math.abs(r.deltaTotal))}`:'—';$('[data-twin-entry]',suite).textContent=money(r.start);$('[data-twin-carry]',suite).textContent=money(r.recurring);$('[data-twin-shock-out]',suite).textContent=money(v.shock);$('[data-twin-recovery-out]',suite).textContent=v.recovery?`−${money(v.recovery)}`:'$0';$('[data-twin-trace]',suite).setAttribute('d',path);$('[data-twin-dot]',suite).setAttribute('cx',last[0]);$('[data-twin-dot]',suite).setAttribute('cy',last[1]);const baseY=ctx.base?92-(ctx.base/Math.max(...pts.map(p=>p[2]),ctx.base,1))*78:92;$('[data-twin-base-line]',suite).setAttribute('d',`M0 ${baseY.toFixed(1)} H100`);write(TWIN,{delta:v.delta,annual:v.annual,growth:v.growth,years:v.years,shock:v.shock,recovery:v.recovery,updatedAt:new Date().toISOString()});document.dispatchEvent(new CustomEvent('ei:twin-change',{detail:{scenarioPrice:r.start,total:r.total,delta:v.delta}}));
    };
    [delta,annual,growth,years,shock,recovery].forEach(x=>x.addEventListener('input',update));
    $('[data-use-connected]',suite)?.addEventListener('click',()=>{annual.value=String(ctx.fuel);update()});
    $('[data-twin-copy]',suite).addEventListener('click',async e=>{update();const r=scenarioTotal(ctx.base||0,Number(delta.value)||0,Number(annual.value)||0,Number(growth.value)||0,Number(years.value)||5,Number(shock.value)||0,Number(recovery.value)||0),txt=`ExpenseIntel Decision Twin — ${ctx.title}\nKnown amount: ${ctx.base?money(ctx.base):'not verified'}\nScenario entry: ${money(r.start)}\nRecurring burden: ${money(r.recurring)} over ${years.value} years\nOne-time downside: ${money(Number(shock.value)||0)}\nRecovery / exit: ${money(Number(recovery.value)||0)}\nScenario cash commitment: ${money(r.total)}\nScenario only — user-controlled assumptions.`;try{await navigator.clipboard.writeText(txt);const old=e.currentTarget.textContent;e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent=old,1400)}catch(_e){}});
    $('[data-twin-negotiate]',suite).addEventListener('click',()=>{const target=$('[data-neg-target]',suite),scenario=Math.max(0,(ctx.base||0)+(Number(delta.value)||0));if(scenario){target.value=String(Math.round(scenario));target.dispatchEvent(new Event('input',{bubbles:true}));$('.ei-negotiation',suite).scrollIntoView({behavior:'smooth',block:'center'})}});
    update();
  }

  function bindNegotiation(suite,ctx){
    const leverage=$('[data-neg-leverage]',suite),script=$('[data-neg-script]',suite),pos=$('[data-neg-position]',suite),target=$('[data-neg-target]',suite),caution=$('[data-neg-caution]',suite);let objective='price';
    const asks=categoryAsks(ctx.category);
    function evidenceCard(){
      if(ctx.market&&ctx.base){const diff=ctx.base-ctx.market;if(diff>0)return ['Connected market evidence',`${money(ctx.base)} vs ${money(ctx.market)} context`,`The known amount is ${money(diff)} above the connected market figure shown in this Check. Verify that the benchmark is truly comparable before using it as price leverage.`,'CONNECTED'];return ['Connected market evidence','Do not fake a high-price claim',`The known amount is not above the connected market figure shown in this Check. Price leverage may be weaker; focus on terms, scope, fees or risk instead.`,'CONNECTED']}
      return ['Market position unresolved','Do not claim the price is high','ExpenseIntel does not currently have a trustworthy market benchmark for this exact decision. Use unresolved facts as conditions and questions, not invented leverage.','UNKNOWN'];
    }
    function render(){
      const targetN=Number(target.value)||0,marketCard=evidenceCard(),unknown=ctx.unknowns[0]||'No decision-critical unknown is currently surfaced in the displayed Check.',ask=asks[objective==='price'?0:objective==='terms'?1:2]||asks[0];
      const cards=[marketCard,['Open diligence item',ctx.unknowns.length?`${ctx.unknowns.length} unresolved item${ctx.unknowns.length===1?'':'s'}`:'No major gap flagged',unknown,ctx.unknowns.length?'VERIFY':'CLEAR'],['Terms leverage',ask[0],ask[1],'ASK']];
      leverage.innerHTML=cards.map(c=>`<article class="ei-neg-card"><span>${esc(c[0])}<b>${esc(c[3])}</b></span><strong>${esc(c[1])}</strong><p>${esc(c[2])}</p></article>`).join('');
      const hasMarket=!!(ctx.market&&ctx.base),hasUnknown=ctx.unknowns.length>0;pos.textContent=hasMarket&&ctx.base>ctx.market?'Evidence-backed price case':hasUnknown?'Conditions-first negotiation':'Terms-first negotiation';
      const objectiveLine=objective==='price'?'I want to discuss the price before I commit.':objective==='terms'?'I want to improve the terms before I commit.':'I want to reduce the unresolved risk before I commit.';
      const marketLine=hasMarket&&ctx.base>ctx.market?`ExpenseIntel shows the current amount at ${money(ctx.base)} versus ${money(ctx.market)} in connected market context. I want to make sure we are comparing like-for-like, but that gap is part of my position.`:hasMarket?'The connected market context does not support me claiming the price is obviously high, so I am focusing on the total terms and unresolved items.':'I do not yet have a verified market benchmark for this exact decision, so I am not going to pretend I do.';
      const unknownLine=ctx.unknowns.length?`Before I commit, I need this resolved: ${ctx.unknowns.slice(0,2).join(' / ')}.`:'The current Check does not surface a major unresolved evidence item, so my focus is on the commercial terms.';
      const targetLine=targetN?`If we can get to ${money(targetN)}${objective==='price'?' on the amount':''}, with the unresolved items addressed, I am prepared to keep moving.`:'I have not set a target amount yet; I would rather negotiate from verified facts than invent a number.';
      script.textContent=`${objectiveLine}\n\n${marketLine}\n\n${unknownLine}\n\nI also want to address ${ask[0].toLowerCase()}: ${ask[1]}\n\n${targetLine}`;
      caution.textContent=hasMarket?'Use the connected market figure only if the underlying items are genuinely comparable. ExpenseIntel is giving you leverage context, not permission to overstate the evidence.':'No verified price benchmark is connected yet. The strongest position is to negotiate specific terms, conditions, scope or risk—not to manufacture a “fair price” claim.';
    }
    $$('[data-neg-objective]',suite).forEach(b=>b.addEventListener('click',()=>{objective=b.dataset.negObjective;$$('[data-neg-objective]',suite).forEach(x=>x.classList.toggle('active',x===b));render()}));target.addEventListener('input',render);document.addEventListener('ei:twin-change',e=>{suite.dataset.twinPrice=String(e.detail?.scenarioPrice||'')});$('[data-neg-copy]',suite).addEventListener('click',async e=>{try{await navigator.clipboard.writeText(script.textContent);const old=e.currentTarget.textContent;e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent=old,1400)}catch(_e){}});render();
  }

  function watch(){const out=$('[data-check-output]');if(!out)return;let t;const run=()=>{clearTimeout(t);t=setTimeout(()=>{const root=$('[data-check-output] .shell');if(root)buildSuite(root)},120)};new MutationObserver(run).observe(out,{subtree:true,childList:true});run()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();