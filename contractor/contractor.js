(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const num=sel=>Math.max(0,Number($(sel)?.value)||0);
  const riskRate={service:.02,fitout:.03,renovation:.035,groundup:.05,civil:.06};
  const unknownRate={low:.01,medium:.03,high:.06};
  const hazardRate=rating=>{const s=String(rating||'').toLowerCase();if(s.includes('very high'))return .03;if(s.includes('relatively high')||s==='high')return .02;if(s.includes('moderate'))return .01;return 0};
  let current=null;

  async function buildCase(address,sqft,scope){
    const use=(scope==='civil'||scope==='groundup')?'industrial':scope==='service'?'commercial':'industrial';
    const mapped=use==='commercial'?'other':use;
    const u=new URL('/api/case',location.origin);u.searchParams.set('address',address);u.searchParams.set('use',mapped);u.searchParams.set('sqft',sqft);
    const r=await fetch(u,{headers:{Accept:'application/json'}}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.error||'Could not build site case.');return d.case;
  }
  function inputs(){
    const scope=$('[data-scope]').value,sqft=num('[data-sqft]'),premium=num('[data-labor-premium]')/100;
    const labor=num('[data-labor-hours]')*num('[data-labor-rate]')*(1+premium);
    const equipment=num('[data-equip-days]')*num('[data-equip-rate]');
    const materials=num('[data-materials]');
    const mobilization=num('[data-miles]')*num('[data-trips]')*num('[data-mile-rate]');
    const disposal=num('[data-tons]')*num('[data-ton-rate]');
    const permits=num('[data-permits]'),service=num('[data-service]');
    const schedule=num('[data-months]')*num('[data-overhead]');
    const direct=labor+equipment+materials+mobilization+disposal+permits+service+schedule;
    const contingencyPct=Math.min(.4,num('[data-contingency]')/100),margin=Math.min(.6,num('[data-margin]')/100);
    return{scope,sqft,labor,equipment,materials,mobilization,disposal,permits,service,schedule,direct,contingencyPct,margin,unknowns:$('[data-unknowns]').value};
  }
  function readiness(c){
    const verified=$$('[data-verify]:checked').length;
    const publicEvidence=Number(c?.evidence?.score)||0;
    const score=Math.round(Math.min(100,35+verified*7.5+publicEvidence*.2));
    return{score,label:score>=85?'Bid-review ready':score>=70?'Developing':score>=55?'Open diligence':'Early case'};
  }
  function calculate(c){
    const i=inputs(),hr=hazardRate(c?.risk?.composite?.rating),locationPct=Math.min(.15,(riskRate[i.scope]||.03)+(unknownRate[i.unknowns]||.03)+hr);
    const contingency=i.direct*i.contingencyPct,reserve=i.direct*locationPct,floor=i.direct+contingency+reserve;
    const target=i.margin<.95?floor/(1-i.margin):floor;
    const marginDollars=target-floor,ready=readiness(c);
    return{i,hr,locationPct,contingency,reserve,floor,target,marginDollars,ready};
  }
  function flags(c,x){
    const out=[];const add=(text,detail,warn=true)=>out.push({text,detail,warn});
    const hazard=c?.risk?.composite?.rating||'Unavailable';
    add(`FEMA hazard context · ${hazard}`,c?.risk?.topHazards?.[0]?.name?`Top tract-level signal: ${c.risk.topHazards[0].name}. Use this as diligence context, not a site engineering conclusion.`:'No tract-level hazard signal returned.',x.hr>0);
    if(!$('[data-verify="wage"]').checked)add('Labor basis not independently confirmed','Confirm wage assumptions, prevailing-wage applicability, overtime and burden before locking price.');else add('Labor basis marked confirmed','User marked wage / labor basis as checked.',false);
    if(!$('[data-verify="utility"]').checked)add('Utility / service scope still open',`Current allowance is ${money(x.i.service)}. Verify capacity, service upgrade, trenching, connection and restoration scope.`);else add('Utility / service scope marked checked','Keep provider quote and scope basis with the bid file.',false);
    if(!$('[data-verify="permit"]').checked)add('Permit / fee allowance still open',`Current allowance is ${money(x.i.permits)}. Verify jurisdiction fees and inspection requirements.`);else add('Permit basis marked checked','User marked permit fees as checked.',false);
    if(x.i.unknowns==='high')add('High site-unknown setting','The case is carrying an elevated location reserve. Geotech, access, restoration and concealed conditions deserve explicit scope language.');
    if(!$('[data-verify="schedule"]').checked)add('Schedule exposure not confirmed',`${money(x.i.schedule)} of project overhead is tied to the entered schedule. A delay directly raises cost basis.`);else add('Schedule constraints marked checked','User marked schedule constraints as reviewed.',false);
    return out;
  }
  function sensitivity(x){
    const rows=[
      ['Labor +10%',x.i.labor*.10],['Materials +10%',x.i.materials*.10],['One extra month',num('[data-overhead]')],['Mobilization +50%',x.i.mobilization*.50],['Utility/service allowance +25%',x.i.service*.25],['Disposal +25%',x.i.disposal*.25]
    ].sort((a,b)=>b[1]-a[1]);return rows;
  }
  function render(c){
    current={case:c,calc:calculate(c)};const x=current.calc;
    $('[data-target-bid]').textContent=money(x.target);
    $('[data-bid-copy]').textContent=`Target price preserves a ${(x.i.margin*100).toFixed(1)}% gross margin after the entered contingency and a ${(x.locationPct*100).toFixed(1)}% location / unknown reserve.`;
    $('[data-base-cost]').textContent=money(x.i.direct);$('[data-contingency-out]').textContent=money(x.contingency);$('[data-reserve]').textContent=money(x.reserve);$('[data-floor]').textContent=money(x.floor);$('[data-margin-dollars]').textContent=money(x.marginDollars);$('[data-bid-psf]').textContent=x.i.sqft?money(x.target/x.i.sqft):'—';$('[data-readiness]').textContent=`${x.ready.score}/100 · ${x.ready.label}`;$('[data-operating]').textContent=`~${money(c.total)}/yr`;
    const flagZone=$('[data-risk-flags]');flagZone.innerHTML='';flags(c,x).forEach(f=>{const d=document.createElement('div');d.className='risk-flag '+(f.warn?'warn':'good');d.innerHTML='<div><strong></strong><div></div></div><b></b>';d.querySelector('strong').textContent=f.text;d.querySelector('div div').textContent=f.detail;d.querySelector('b').textContent=f.warn?'VERIFY':'CHECKED';flagZone.appendChild(d)});
    const sens=$('[data-sensitivity]');sens.innerHTML='';sensitivity(x).forEach(([label,delta],idx)=>{const d=document.createElement('div');d.className='sense-row';d.innerHTML='<span></span><b></b>';d.querySelector('span').textContent=`${idx+1}. ${label}`;d.querySelector('b').textContent=`+${money(delta)}`;sens.appendChild(d)});
    $('[data-model-note]').textContent=`Location case ${c.modelVersion} · ${c.address} · ${c.evidence.grade} evidence grade (${c.evidence.score}/100). Contractor labor, materials, equipment, schedule, permits and utility allowances are user-supplied. ExpenseIntel does not represent this output as a contractor estimate, proposal or quote.`;
    $('[data-contractor-result]').classList.add('show');
  }
  function refresh(){if(current)render(current.case)}
  async function submit(e){e.preventDefault();const err=$('[data-contractor-error]');err.classList.remove('show');err.textContent='';const address=$('[name="address"]').value.trim(),sqft=num('[data-sqft]'),scope=$('[data-scope]').value;if(!address){err.textContent='Enter and verify a project address.';err.classList.add('show');return}const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;try{const c=await buildCase(address,sqft,scope);render(c);$('[data-contractor-result]').scrollIntoView({behavior:'smooth',block:'start'})}catch(ex){err.textContent=ex.message;err.classList.add('show')}finally{btn.disabled=false}}
  async function copy(){if(!current)return;const x=current.calc,c=current.case;const text=`ExpenseIntel Contractor Site Cost Case\n${c.address}\nModel: ${c.modelVersion}\n\nDirect + project cost: ${money(x.i.direct)}\nBid contingency: ${money(x.contingency)}\nLocation / unknown reserve: ${money(x.reserve)}\nMinimum cost basis: ${money(x.floor)}\nTarget gross margin: ${(x.i.margin*100).toFixed(1)}%\nTarget bid: ${money(x.target)}\nTarget bid / ft²: ${x.i.sqft?money(x.target/x.i.sqft):'—'}\nBid readiness: ${x.ready.score}/100 · ${x.ready.label}\n\nPublic evidence: ${c.evidence.grade} (${c.evidence.score}/100)\nPost-turnover modeled location cost: ~${money(c.total)}/yr\n\nPre-bid decision support only — not a contractor estimate or quote.`;try{await navigator.clipboard.writeText(text);const b=$('[data-copy-contractor]'),old=b.textContent;b.textContent='Copied ✓';setTimeout(()=>b.textContent=old,1400)}catch(_e){}}
  document.addEventListener('DOMContentLoaded',()=>{$('[data-contractor-form]')?.addEventListener('submit',submit);$$('[data-verify], [data-contingency], [data-margin], [data-unknowns]').forEach(x=>x.addEventListener('change',refresh));$('[data-copy-contractor]')?.addEventListener('click',copy);$('[data-print-contractor]')?.addEventListener('click',()=>window.print())});
})();