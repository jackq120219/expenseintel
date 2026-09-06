(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const compact=n=>Math.abs(Number(n)||0)>=1000000?'$'+((Number(n)||0)/1000000).toFixed(2)+'M':Math.abs(Number(n)||0)>=1000?'$'+((Number(n)||0)/1000).toFixed(1)+'k':money(n);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  let current=null,caseKey='',blind=[];

  const BASE_BLIND=[
    ['electric','Electricity / tariff / demand charges','electric'],
    ['gas','Natural gas / fuel service','gas'],
    ['water','Water / sewer / stormwater','water'],
    ['tax','Property tax / assessment','tax'],
    ['insurance','Insurance / hazard requirements','insurance'],
    ['waste','Waste / recurring services','other'],
    ['cam','CAM / HOA / occupancy pass-throughs',null],
    ['maintenance','Maintenance obligations',null],
    ['infra','Infrastructure / service upgrades',null],
    ['oneoff','One-time connection / move-in costs',null]
  ];
  const USE_BLIND={
    restaurant:[
      ['restaurant-grease','Grease trap / interceptor ownership and pumping',null],
      ['restaurant-hood','Hood, suppression and fire inspection obligations',null],
      ['restaurant-health','Health permit / food-service licensing fees',null],
      ['restaurant-wasteoil','Used-oil, pest and specialty waste service',null],
      ['restaurant-hvac','Make-up air / after-hours HVAC load',null]
    ],
    retail:[
      ['retail-cam','Common-area reconciliation / admin fee mechanics',null],
      ['retail-hours','After-hours HVAC / lighting requirements',null],
      ['retail-security','Security, alarm and loss-prevention services',null],
      ['retail-signage','Signage permit / façade obligations',null]
    ],
    office:[
      ['office-hvac','After-hours HVAC and supplemental cooling',null],
      ['office-janitorial','Janitorial / porter service responsibility',null],
      ['office-parking','Parking allocation and recurring access charges',null],
      ['office-fiber','Fiber, telecom and riser access charges',null]
    ],
    warehouse:[
      ['warehouse-dock','Dock / door / leveler maintenance',null],
      ['warehouse-fire','Fire suppression, sprinkler inspection and testing',null],
      ['warehouse-yard','Yard, snow, pavement and exterior maintenance',null],
      ['warehouse-demand','Charging / refrigeration / peak demand exposure',null]
    ],
    industrial:[
      ['industrial-demand','Electric demand / power-factor / peak-load charges',null],
      ['industrial-process','Process water / compressed air / specialty utility load',null],
      ['industrial-env','Environmental, stormwater or discharge permits',null],
      ['industrial-disposal','Hazardous / process waste handling',null],
      ['industrial-fire','Fire suppression / testing / high-hazard requirements',null]
    ],
    multifamily:[
      ['multi-hoa','HOA / association / special-assessment exposure',null],
      ['multi-turn','Turnover, common-area and recurring service burden',null],
      ['multi-parking','Parking / garage operations',null],
      ['multi-reserve','Capital reserve / major-system replacement exposure',null]
    ],
    residential:[
      ['res-hoa','HOA / condo fees and special assessments',null],
      ['res-flood','Flood / wind / supplemental insurance requirement',null],
      ['res-maint','Maintenance reserve and major-system replacement',null],
      ['res-parking','Parking / snow / exterior service obligations',null]
    ],
    other:[
      ['other-license','Use-specific permits, licenses and inspections',null],
      ['other-service','Specialty recurring service contracts',null],
      ['other-access','Parking, access or common-area charges',null]
    ]
  };
  function blindForUse(use){return [...BASE_BLIND,...(USE_BLIND[use]||USE_BLIND.other)]}
  function hash(input){let h=2166136261;for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).toUpperCase().padStart(8,'0').slice(0,8)}
  function readCase(){if(!caseKey)return{files:[],obligations:[],checks:{}};try{return JSON.parse(localStorage.getItem(caseKey)||'null')||{files:[],obligations:[],checks:{}}}catch(_e){return{files:[],obligations:[],checks:{}}}}
  function writeCase(v){if(!caseKey)return;try{localStorage.setItem(caseKey,JSON.stringify(v))}catch(_e){}}
  function error(msg=''){const e=$('[data-az-error]');e.textContent=msg;e.classList.toggle('show',!!msg)}
  async function json(url){const r=await fetch(url,{headers:{Accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Data unavailable.');return d}
  function evidenceDepth(r){let v=20;if(r.location?.verified)v+=25;if(r.energy?.electricity)v+=20;if(r.energy?.gas)v+=15;if(r.energy?.intensity)v+=10;if(r.location?.components?.tract)v+=10;return Math.min(100,v)}
  function grade(r){const ev=evidenceDepth(r);const score=Math.max(0,Math.min(100,100-r.risk*.55-r.uncertainty*100*.9+ev*.25));let g='F';if(score>=88)g='A';else if(score>=81)g='A−';else if(score>=74)g='B+';else if(score>=67)g='B';else if(score>=60)g='B−';else if(score>=53)g='C+';else if(score>=46)g='C';else if(score>=39)g='C−';else if(score>=30)g='D';return{score,g,ev}}
  function renderGrade(){const g=grade(current);$('[data-grade]').textContent=g.g;$('[data-az-total]').textContent=compact(current.total);$('[data-az-risk]').textContent=current.risk+'/100';$('[data-az-uncertainty]').textContent='±'+Math.round(current.uncertainty*100)+'%';$('[data-az-evidence]').textContent=g.ev+'%';$('[data-grade-title]').textContent=g.g.startsWith('A')?'Strongly evidenced case':g.g.startsWith('B')?'Usable with targeted diligence':g.g.startsWith('C')?'Material uncertainty remains':'High diligence burden';$('[data-grade-copy]').textContent=`The grade combines expense risk (${current.risk}/100), modeled uncertainty (±${Math.round(current.uncertainty*100)}%) and evidence depth (${g.ev}%). It is a decision-resilience indicator, not an appraisal or investment recommendation.`}

  function buildBlind(){
    blind=blindForUse(current?.use||'other');
    const zone=$('[data-blind-list]');zone.innerHTML='';const saved=readCase();
    blind.forEach(([key,label,map])=>{const row=document.createElement('div');row.className='check-row';const amount=map&&current?.categories?.[map]?current.categories[map]:null;row.innerHTML='<input type="checkbox"><label></label><span></span>';const input=row.querySelector('input');input.checked=!!saved.checks?.[key];input.dataset.blind=key;input.addEventListener('change',()=>{const c=readCase();c.checks=c.checks||{};c.checks[key]=input.checked;writeCase(c);renderBlind();renderActions()});row.querySelector('label').textContent=label;row.querySelector('span').textContent=amount?compact(amount):'verify';zone.appendChild(row)});
    renderBlind();
  }
  function renderBlind(){if(!current)return;const checks=readCase().checks||{};const checked=blind.filter(([k])=>checks[k]).length;const open=blind.length-checked;let unresolved=0,largest={name:'—',value:0};blind.forEach(([k,label,map])=>{if(!checks[k]&&map){const v=current.categories?.[map]||0;unresolved+=v;if(v>largest.value)largest={name:label,value:v}}});const pct=Math.round((checked/blind.length)*100);$('[data-blind-coverage]').textContent=pct+'%';$('[data-blind-unresolved]').textContent=compact(unresolved);$('[data-blind-open]').textContent=String(open);$('[data-blind-largest]').textContent=largest.value?largest.name:'Use-specific unquantified layers';$('[data-blind-state]').textContent=pct>=80?'TIGHT':pct>=50?'PARTIAL':'OPEN';$('[data-blind-copy]').textContent=pct>=80?'Most diligence categories are marked documented. Reconcile the remaining open items before commitment.':`${open} diligence categories remain open for this ${current.use} case. ${blind.length-BASE_BLIND.length} are use-specific checks that a generic cost calculator would usually miss.`}

  function shockPercent(key){
    if(key==='electric'){
      const yoy=Number(current?.energy?.electricity?.yoy);
      if(Number.isFinite(yoy))return clamp(Math.max(.12,Math.abs(yoy)*1.75),.12,.30);
      return .18;
    }
    if(key==='gas')return .22;
    if(key==='water')return .15;
    if(key==='tax')return .12;
    if(key==='insurance')return current?.risk>=72?.30:current?.risk>=58?.24:.18;
    return .15;
  }
  function shockLabel(key){return({electric:'Electricity',gas:'Natural gas',water:'Water / sewer',tax:'Property tax',insurance:'Insurance',other:'Waste / other'})[key]||key}
  function renderShock(){
    if(!current)return;
    const rows=Object.entries(current.categories||{}).map(([key,base])=>{const pct=shockPercent(key),impact=Math.round((Number(base)||0)*pct/100)*100;return{key,label:shockLabel(key),base:Number(base)||0,pct,impact}}).sort((a,b)=>b.impact-a.impact);
    const totalImpact=rows.reduce((s,r)=>s+r.impact,0),stress=current.total+totalImpact,top=rows[0];
    $('[data-shock-base]').textContent=money(current.total);
    $('[data-shock-total]').textContent=money(stress);
    $('[data-shock-delta]').textContent='+'+money(totalImpact);
    $('[data-shock-top]').textContent=top?`${top.label} +${Math.round(top.pct*100)}%`:'—';
    const zone=$('[data-shock-list]');zone.innerHTML='';
    rows.slice(0,6).forEach((r,i)=>{const el=document.createElement('article');el.className='action-item';el.innerHTML='<div><h4></h4><p></p></div><strong></strong>';el.querySelector('h4').textContent=`${i+1}. ${r.label} shock`;el.querySelector('p').textContent=`Modeled ${Math.round(r.pct*100)}% sensitivity on a ${money(r.base)} annual base layer. This adds ${money(r.impact)} if that shock occurs while other assumptions are held constant.`;el.querySelector('strong').textContent='+'+money(r.impact);zone.appendChild(el)});
    const concentration=top&&current.total?Math.round((top.base/current.total)*100):0;
    $('[data-shock-copy]').textContent=`The stacked stress case adds ${money(totalImpact)} (${Math.round(totalImpact/current.total*100)}%) to the current annual model. The largest modeled category represents about ${concentration}% of the cost stack. These are sensitivity tests, not probability-weighted forecasts or quotes.`;
  }

  function renderDeal(){const c=readCase(),files=$('[data-deal-files]'),obs=$('[data-obligations]');files.innerHTML='';(c.files||[]).forEach((f,i)=>{const row=document.createElement('div');row.className='file-row';row.innerHTML='<span></span><button type="button" style="border:0;background:none;font:800 8px var(--mono);cursor:pointer">REMOVE</button>';row.querySelector('span').textContent=`${f.name} · ${(f.size/1024).toFixed(1)} KB`;row.querySelector('button').addEventListener('click',()=>{const x=readCase();x.files.splice(i,1);writeCase(x);renderDeal()});files.appendChild(row)});obs.innerHTML='';(c.obligations||[]).forEach((o,i)=>{const row=document.createElement('div');row.className='file-row';row.innerHTML='<span></span><button type="button" style="border:0;background:none;font:800 8px var(--mono);cursor:pointer">REMOVE</button>';row.querySelector('span').textContent=`${o.category} · ${money(o.amount)}/yr`;row.querySelector('button').addEventListener('click',()=>{const x=readCase();x.obligations.splice(i,1);writeCase(x);renderDeal()});obs.appendChild(row)});$('[data-file-count]').textContent=String((c.files||[]).length);$('[data-obligation-total]').textContent=money((c.obligations||[]).reduce((s,o)=>s+(Number(o.amount)||0),0))}
  function renderNegotiator(){if(!current)return;const target=Number($('#neg-target').value)||0,alt=Number($('#neg-other').value)||0,benchmark=alt||target,years=Math.max(1,Number($('#neg-years').value)||5),cap=Math.max(.01,(Number($('#neg-cap').value)||7)/100);if(!benchmark){$('[data-neg-copy]').textContent='Enter a target annual cost or an alternative location cost to translate the difference into deal terms.';return}const gap=Math.max(0,current.total-benchmark),rent=current.sqft?gap/current.sqft:0,concession=gap*years,price=gap/cap;$('[data-neg-gap]').textContent=money(gap)+'/yr';$('[data-neg-rent]').textContent='$'+rent.toFixed(2);$('[data-neg-concession]').textContent=money(concession);$('[data-neg-price]').textContent=money(price);$('[data-neg-copy]').textContent=gap?`To economically offset the ${money(gap)} annual cost disadvantage, the deal would need roughly ${money(gap)} per year of recurring relief, ${money(concession)} across ${years} years, or about ${money(price)} of purchase-price equivalent at a ${(cap*100).toFixed(1)}% cap rate. These are equivalence calculations, not negotiating advice.`:`The current modeled annual cost is already at or below the entered benchmark.`}
  function renderActions(){if(!current)return;const zone=$('[data-action-stack]');zone.innerHTML='';const checks=readCase().checks||{};const cats=Object.entries(current.categories).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);const items=[];const e=current.categories.electric||0,g=current.categories.gas||0;if(e)items.push({title:'Test electricity reduction before negotiating blind',copy:'Efficiency, controls, scheduling, demand management or tariff diligence can matter more than a generic operating-cost cut.',value:`Scenario ${money(e*.08)}–${money(e*.15)}/yr`});if(g)items.push({title:'Validate fuel-use assumptions',copy:'Confirm heating/process fuel, operating hours and actual equipment load before relying on benchmark gas intensity.',value:`Scenario ${money(g*.08)}–${money(g*.15)}/yr`});const firstOpen=blind.find(([k])=>!checks[k]);if(firstOpen)items.push({title:`Close the ${firstOpen[1].toLowerCase()} blindspot`,copy:'The highest-value diligence step is often replacing a modeled or unknown obligation with a real document, quote, assessment or permit record.',value:'EVIDENCE'});const biggest=cats[0];if(biggest)items.push({title:`Pressure-test ${biggest.k==='tax'?'property tax':shockLabel(biggest.k).toLowerCase()}`,copy:'The largest modeled category deserves the first sensitivity check because small percentage changes can create the largest dollar movement.',value:`Base ${money(biggest.v)}`});items.slice(0,4).forEach(x=>{const el=document.createElement('article');el.className='action-item';el.innerHTML='<div><h4></h4><p></p></div><strong></strong>';el.querySelector('h4').textContent=x.title;el.querySelector('p').textContent=x.copy;el.querySelector('strong').textContent=x.value;zone.appendChild(el)})}
  async function run(e){e.preventDefault();error('');const ai=$('#az-address'),use=$('#az-use').value,sqft=Number($('#az-sqft').value);if(!sqft||sqft<300){error('Enter a valid floor area.');return}const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;try{const loc=await EI.requireResolvedAddress(ai);if(!loc)return;let energy=null;try{energy=await json(`/api/energy?state=${encodeURIComponent(loc.components?.state||'')}&use=${encodeURIComponent(use)}`)}catch(_e){}current=EI.estimate(loc.label,use,sqft,loc,energy);caseKey='ei_case_'+hash(`${current.address}|${current.use}|${current.sqft}`);try{sessionStorage.setItem('ei_last',JSON.stringify({address:current.address,use:current.use,sqft:String(current.sqft),location:current.location}))}catch(_e){}$('#neg-target').value=Math.round(current.total*.9/1000)*1000;$('[data-az-result]').classList.add('show');renderGrade();buildBlind();renderShock();renderDeal();renderNegotiator();renderActions();$('[data-az-result]').scrollIntoView({behavior:'smooth',block:'start'})}catch(ex){error(ex.message||'Unable to build case.')}finally{btn.disabled=false}}
  function prefill(){try{const s=JSON.parse(sessionStorage.getItem('ei_last')||'null');if(s){$('#az-address').value=s.address||'';$('#az-use').value=s.use||'industrial';$('#az-sqft').value=s.sqft||'7500'}}catch(_e){}}
  document.addEventListener('DOMContentLoaded',()=>{
    prefill();$('[data-analyze-form]')?.addEventListener('submit',run);
    $('#deal-files')?.addEventListener('change',e=>{if(!caseKey)return;const c=readCase();c.files=c.files||[];[...e.target.files].forEach(f=>c.files.push({name:f.name,size:f.size,type:f.type,lastModified:f.lastModified}));c.files=c.files.slice(-30);writeCase(c);e.target.value='';renderDeal()});
    $('[data-add-obligation]')?.addEventListener('click',()=>{if(!caseKey)return;const amount=Number($('#obl-amount').value)||0;if(amount<=0)return;const c=readCase();c.obligations=c.obligations||[];c.obligations.push({category:$('#obl-cat').value,amount});writeCase(c);$('#obl-amount').value='';renderDeal()});
    ['#neg-target','#neg-other','#neg-years','#neg-cap'].forEach(s=>$(s)?.addEventListener('input',renderNegotiator));
  });
})();