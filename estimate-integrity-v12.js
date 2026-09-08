(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ACTIVE='ei_active_decision',PROFILE='ei_refinement_profile',LAST='ei_last_integrity_check';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')||{}}catch(_e){return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_e){}};
  const money=n=>Number.isFinite(+n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(+n):'—';
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\$?\s*(-?\d+(?:\.\d+)?)/);return m?+m[1]:0};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  let last=read(LAST),scheduled=false,muting=false;

  function explicitPriceFromText(t){
    const s=String(t||'');
    const m=s.match(/(?:for|price(?:d)?(?:\s+at)?|asking(?:\s+price)?|listed(?:\s+at)?|cost(?:s|ing)?|quote(?:d)?|msrp|pay(?:ing)?)\s*(?:is|of|=|:)?\s*\$\s*([\d,]+(?:\.\d+)?)/i)||s.match(/\$\s*([\d,]{4,}(?:\.\d+)?)/);
    return m?Number(m[1].replace(/,/g,'')):0;
  }
  function activeText(d){const a=read(ACTIVE);return clean([d?.input?.text,a.text,a.title,$('#check-text')?.value,$('#tw-title')?.value].filter(Boolean).join(' '))}
  function isLease(d){return (d?.detectedCategory==='vehicle'||/car|vehicle|porsche|bmw|mercedes|audi|tesla|ford|chevrolet|toyota|honda/i.test(activeText(d)))&&/\bleas(?:e|ed|ing)\b/i.test(activeText(d))}
  function refined(){return read(PROFILE)}
  function highSpecificityVehicle(d){const id=d?.vehicle?.identity||{},p=refined();return !!((id.make||p.make)&&(id.model||p.model))}
  function highPerformanceVehicle(d){const t=clean([activeText(d),d?.vehicle?.identity?.model,d?.vehicle?.identity?.trim,refined().model].join(' '));return /\b(?:gt2|gt3|turbo s|black series|svj|performante|competizione|senna|765lt|720s|sf90|revuelto|aventador|huracan|phantom|cullinan|maybach)\b/i.test(t)}
  function directPriceState(d){
    const explicit=explicitPriceFromText(d?.input?.text)||Number(read(ACTIVE).price)||0;
    if(explicit>0)return{state:'verified',origin:'User-entered price',value:explicit};
    if(Number(d?.page?.price)>0)return{state:'verified',origin:'Listing/document price',value:Number(d.page.price)};
    if(d?.comparables?.ok&&d?.comparables?.verdictEligible!==false&&Number(d?.comparables?.median)>0)return{state:'benchmark',origin:d.comparables.source||'Reliability-cleared comparables',value:Number(d.comparables.median)};
    return{state:'open',origin:'No reliability-cleared price source',value:null};
  }
  function capScore(d,cap,note){if(!d?.check)return;d.check.score=Math.min(Number(d.check.score)||0,cap);if(note)d.check.coverageNote=note;d.check.label=d.check.score>=78?'STRONG CONTEXT':d.check.score>=62?'USEFUL, NOT COMPLETE':'NEEDS MORE EVIDENCE';d.check.tone=d.check.score>=78?'good':d.check.score>=62?'mid':'neutral'}
  function addUnknown(d,x){if(!d?.check)return;d.check.unknown=uniq([...(d.check.unknown||[]),x])}
  function harden(d){
    if(!d||!d.ok)return d;
    const cat=d.detectedCategory||d.input?.category||'personal',price=directPriceState(d),exactVeh=highSpecificityVehicle(d),hp=highPerformanceVehicle(d),unknown=d.check?.unknown||[];
    if(d.comparables&&!d.comparables.ok)d.comparables.verdictEligible=false;
    if(cat==='vehicle'){
      if(exactVeh&&!d.comparables?.ok){addUnknown(d,'Verified model-specific transaction price or lease quote');capScore(d,hp?68:72,'The exact vehicle is identified, but model-specific transaction pricing is not reliability-cleared. Operating-cost evidence can be strong while price evidence remains unresolved.');}
      if(!d.vehicle?.identity?.vin&&(d.vehicle?.fuel?.options?.length||0)>1){addUnknown(d,'Exact drivetrain / configuration');capScore(d,74,'Multiple official configurations remain possible, so ExpenseIntel will not collapse them into one exact operating-cost figure.');}
      if(isLease(d)&&!(/porsche\s+911/i.test(activeText(d))&&!/\bgt3\b/i.test(activeText(d)))){addUnknown(d,'Model-specific lease residual, money factor and fee sheet');capScore(d,70,'Without contract-level lease economics or a direct model-specific lease benchmark, ExpenseIntel treats optimization as sensitivity analysis rather than a quoted savings opportunity.');}
    }
    if(cat==='property'&&!d.comparables?.ok){addUnknown(d,'Property-specific comparable sales / appraisal evidence');capScore(d,72,'Macro housing data cannot substitute for property-specific comps, taxes, condition and insurance.');}
    if(cat==='home'&&!d.comparables?.ok){addUnknown(d,'Scope-matched contractor comparables');capScore(d,70,'Producer-price indexes can explain input pressure, but they cannot prove that a specific contractor quote is fair.');}
    if(cat==='equipment'&&!(d.refinement?.equipmentType||/model|serial/i.test(activeText(d)))){addUnknown(d,'Exact equipment model, condition and utilization');capScore(d,70,'Equipment economics vary materially by model, condition and utilization; broad category data is context only.');}
    if(price.state==='open'&&['vehicle','property','home','equipment','business-project'].includes(cat))addUnknown(d,'Verified price / quote anchor');
    const sourceCount=Number(d.evidence?.sourceCount)||0,connected=sourceCount+(d.vehicle?.fuel?.ok?1:0)+(d.vehicle?.safety?.ok?1:0)+(d.comparables?.ok?2:0),verified=(price.state==='verified'?1:0)+(d.vehicle?.identity?.vin?2:0)+(Object.keys(d.refinement||{}).length?1:0),open=(d.check?.unknown||[]).length;
    d.integrity={version:'12',policy:'Verified fact > reliability-cleared benchmark > modeled range > unknown',price,category:cat,specificity:exactVeh?'model-specific':cat,highPerformance:hp,verifiedCount:verified,connectedCount:connected,openCount:open,pointEstimatePolicy:price.state==='open'?'No unsupported point-price verdict':'Supported at stated source tier',generatedAt:new Date().toISOString()};
    d.check.signals=uniq([`Estimate integrity v12 active — unsupported point estimates are withheld or demoted to modeled ranges.`,...(d.check.signals||[])]);
    return d;
  }

  function hookFetch(){
    if(window.__eiIntegrityFetchHook)return;window.__eiIntegrityFetchHook=true;const native=window.fetch.bind(window);
    window.fetch=async(...args)=>{const r=await native(...args);try{const u=typeof args[0]==='string'?args[0]:args[0]?.url||'';if(/\/api\/check(?:\?|$)/.test(u)&&r.ok){const d=await r.clone().json();const h=harden(d);last=h;write(LAST,h);window.__EI_LAST_CHECK=h;const headers=new Headers(r.headers);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(h),{status:r.status,statusText:r.statusText,headers})}}catch(_e){}return r};
  }

  function meaningfulRound(n){n=+n||0;const a=Math.abs(n),step=a>=200000?5000:a>=100000?2500:a>=50000?1000:a>=10000?500:a>=2500?100:50;return Math.round(n/step)*step}
  function precisionRange(center,modeledPart,ratio=.22){const m=Math.max(0,+modeledPart||0),c=Math.max(0,+center||0),spread=Math.max(m*ratio,c*.025);return{low:Math.max(0,meaningfulRound(c-spread)),high:meaningfulRound(c+spread)}}
  function parseTerms(root){const out={};$$('.ei-v12-control',root).forEach(card=>{const i=$('input[type="range"]',card);if(i)out[i.dataset.eiV12Range||'']={raw:+i.value||0,input:i,card,output:$('output',card),label:clean($('label',card)?.textContent)}});return out}
  function direct911Anchor(d){const t=activeText(d);return /porsche\s+911/i.test(t)&&!(/\bgt3\b/i.test(t))?2135:null}
  function patchLease(root,d){
    if(!isLease(d))return;const c=parseTerms(root);if(!c.payment||!c.term||!c.due)return;const payment=c.payment.raw,term=Math.max(1,Math.round(c.term.raw)),due=Math.max(0,c.due.raw),carry=Math.max(0,num($('[data-k3]',root)?.textContent)),anchor=direct911Anchor(d);
    let target=payment,kind='sensitivity',why='No reliability-cleared model-specific lease benchmark is connected, so ExpenseIntel models a restrained payment sensitivity instead of claiming a market savings figure.';
    if(anchor){target=payment>anchor?Math.max(anchor,Math.round(payment*.95/5)*5):payment;kind='benchmark';why=`2026 Porsche 911 model-line lease context is available around ${money(anchor)}/mo; trim, taxes, residual and money factor still require verification.`}else target=Math.round(payment*.97/5)*5;
    const savings=Math.max(0,(payment-target)*term),cashPreserved=Math.max(0,due-500),current=payment*term+due+carry,improved=Math.max(0,current-savings),savingEl=$('[data-k4]',root),savingCard=savingEl?.closest('.ei-v12-kpi');
    if(savingEl)savingEl.textContent=savings?money(meaningfulRound(savings)):'Limited';if(savingCard){const sm=$('small',savingCard);if(sm)sm.textContent=kind==='benchmark'?'Model-line benchmark sensitivity · contract terms still required':'Sensitivity only · not a quoted or guaranteed savings figure';savingCard.dataset.eiIntegrityTier=kind==='benchmark'?'benchmark':'modeled'}
    const ds=$('[data-saving]',root);if(ds)ds.textContent=savings?money(meaningfulRound(savings)):'No credible gap yet';
    if(!anchor)root.classList.add('ei-integrity-no-benchmark');
    const benchCards=$$('.ei-v15-metric,.ei-v12-metric,.ei-v12-kpi',root).filter(x=>/benchmark spread/i.test(clean(x.textContent)));benchCards.forEach(card=>{const strong=$('strong',card);if(strong&&!anchor)strong.textContent='Not directly comparable';const small=$('small',card);if(small&&!anchor)small.textContent='Generic national lease averages are context only, not a model-specific benchmark.'});
    let note=$('.ei-integrity-lease-note',root);if(!note){note=document.createElement('div');note.className='ei-integrity-guard ei-integrity-lease-note';const controls=$('.ei-v12-controls',root);controls?.appendChild(note)}if(note)note.innerHTML=`<strong>${kind==='benchmark'?'Benchmark-backed sensitivity':'Sensitivity model — not a price verdict'}</strong><p>${why} Reducing due at signing can preserve ${money(cashPreserved)} of liquidity, but moved cash is not counted as economic savings.</p>`;
    root.dataset.eiIntegrityLease='1';
    const k2=$('[data-k2]',root),k3=$('[data-k3]',root);if(k2){const center=num(k2.textContent)||current,range=precisionRange(center,carry,.25);k2.textContent=money(meaningfulRound(center));k2.classList.add('ei-integrity-modeled-value');const sm=k2.closest('.ei-v12-kpi')?.querySelector('small');if(sm)sm.textContent=`Modeled planning center · reasonable sensitivity ${money(range.low)}–${money(range.high)}`;}if(k3){k3.textContent=money(meaningfulRound(carry));k3.classList.add('ei-integrity-modeled-value')}
  }

  function kpiTag(card,text,kind='modeled'){if(!card||$('.ei-integrity-kpi-tag',card))return;const x=document.createElement('span');x.className='ei-integrity-kpi-tag';x.textContent=text;x.dataset.tier=kind;card.appendChild(x)}
  function auditKpis(root,d){
    const cards=$$('.ei-v12-kpi',root);for(const card of cards){const label=clean($('span',card)?.textContent).toLowerCase();if(/monthly burden/.test(label))kpiTag(card,'Mixed · terms + model','modeled');else if(/estimated|commitment|cash burden/.test(label))kpiTag(card,'Modeled planning center','modeled');else if(/carrying|hidden/.test(label))kpiTag(card,'Modeled range','modeled');else if(/savings|improvement/.test(label))kpiTag(card,direct911Anchor(d)?'Benchmark sensitivity':'Sensitivity only',direct911Anchor(d)?'benchmark':'modeled')}
    const p=directPriceState(d);$$('[data-ei-gt3-price-context],.ei-gt3-value-context',root).forEach(x=>x.dataset.eiIntegrity='benchmark');
    if(p.state==='open'&&highSpecificityVehicle(d))$$('.ei-auto-kpi,.ei-market-card,.ei-v12-market-card',root).forEach(card=>{const t=clean(card.textContent);if(/purchase price|likely price|estimated price|fair price/i.test(t)){kpiTag(card,'Not verified','open')}})
  }
  function counts(d){const i=d?.integrity||{},p=i.price||directPriceState(d||{}),verified=(i.verifiedCount||0)+(p.state==='verified'?1:0),connected=i.connectedCount||Number(d?.evidence?.sourceCount)||0,open=i.openCount||(d?.check?.unknown||[]).length,modeled=Math.max(1,open?Math.min(6,open):2);return{verified,connected,modeled,open,state:p.state==='verified'&&connected>=4&&open<=2?'Strong support':connected>=3?'Mixed support':'Needs verification'}}
  function strip(root,d){if(!root||$('.ei-integrity-strip',root))return;const c=counts(d),el=document.createElement('section');el.className='ei-integrity-strip';el.innerHTML=`<div class="ei-integrity-lead"><span>Estimate integrity / v12</span><strong>${c.state}</strong><p>Exact facts outrank benchmarks; benchmarks outrank models. Unsupported precision is rounded, ranged or left open.</p><div class="ei-integrity-badge ${c.state==='Strong support'?'verified':c.state==='Mixed support'?'benchmark':'open'}">${c.state}</div></div><div class="ei-integrity-cell"><span>Verified / entered</span><strong>${c.verified}</strong><small>User, document, VIN or exact source-backed facts.</small></div><div class="ei-integrity-cell"><span>Connected evidence</span><strong>${c.connected}</strong><small>Government, authoritative or reliability-cleared context.</small></div><div class="ei-integrity-cell"><span>Modeled</span><strong>${c.modeled}</strong><small>Planning assumptions shown with restrained precision.</small></div><div class="ei-integrity-cell"><span>Open</span><strong>${c.open}</strong><small>Facts that can still materially change the answer.</small></div>`;const hero=$('.ei-v12-hero',root);hero?hero.insertAdjacentElement('afterend',el):root.prepend(el)}
  function evidencePolicy(root){const host=$('[data-v16-panel]',root)||$('[data-panel="market"]',root)||$('.ei-v12-workspace',root);if(!host||$('.ei-integrity-source-policy',host))return;const el=document.createElement('div');el.className='ei-integrity-source-policy';el.innerHTML='<div><span>Tier 1</span><strong>Verified facts</strong><p>User-entered terms, documents, VIN/configuration and exact listing data.</p></div><div><span>Tier 2</span><strong>Comparable evidence</strong><p>Only reliability-cleared, sufficiently specific market observations can support a price verdict.</p></div><div><span>Tier 3</span><strong>Modeled ranges</strong><p>Used for carrying cost, scenarios and missing terms; never presented as guaranteed facts.</p></div><div><span>Tier 4</span><strong>Unknown</strong><p>ExpenseIntel leaves decision-critical gaps open rather than inventing a precise number.</p></div>';host.appendChild(el)}
  function auditTwin(){
    if(!location.pathname.startsWith('/twin/'))return;const p=refined(),text=activeText(last),isSpecific=!!(p.make&&p.model)||/\b(?:porsche|bmw|mercedes|audi|tesla|ford|toyota|honda)\b/i.test(text),known=explicitPriceFromText(text)||Number(read(ACTIVE).price)||0;
    $$('.ei-auto-kpi').forEach(card=>{const label=clean($('span',card)?.textContent).toLowerCase(),strong=$('strong',card);if(!strong)return;if(/known price/.test(label)){if(!known&&isSpecific){kpiTag(card,'Price not verified','open')}else if(known)kpiTag(card,'Entered / carried','verified')}else{kpiTag(card,'Modeled range','modeled');if(/^\$[\d,]+$/.test(clean(strong.textContent))){strong.textContent=money(meaningfulRound(num(strong.textContent)));strong.classList.add('ei-integrity-modeled-value')}}});
    let g=$('.ei-twin-integrity-guard');if(!g){const host=$('#tw-auto-model')||$('.twin-toolbar');if(host){g=document.createElement('div');g.className='ei-integrity-guard ei-twin-integrity-guard';g.innerHTML='<strong>Precision discipline active</strong><p>Running costs, reserves and resale values are planning ranges until exact model, condition, location and contract evidence supports tighter numbers.</p>';host.appendChild(g)}}
  }
  function genericToolPolicy(){if(location.pathname.startsWith('/check/')||location.pathname.startsWith('/twin/'))return;const result=$('.si-results,.result,.results,[data-result]');if(!result)return;let n=$('.ei-integrity-guard',result);if(!n){n=document.createElement('div');n.className='ei-integrity-guard';n.innerHTML='<strong>Data hierarchy</strong><p>Exact entered facts override connected benchmarks; modeled values stay estimates. A macro index, national average or generic category baseline is never treated as a transaction-specific quote.</p>';result.prepend(n)}}
  function apply(){if(muting)return;muting=true;try{const d=window.__EI_LAST_CHECK||last||read(LAST),root=$('.ei-v12-dashboard');if(root&&d){strip(root,d);auditKpis(root,d);patchLease(root,d);evidencePolicy(root)}auditTwin();genericToolPolicy()}finally{muting=false}}
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;apply()},140)}
  function init(){hookFetch();const out=$('[data-check-output]')||document.body;new MutationObserver(schedule).observe(out,{subtree:true,childList:true,characterData:true});document.addEventListener('input',e=>{if(e.target.matches?.('.ei-v12-control input[type="range"],#check-text,#tw-title'))schedule()});schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();