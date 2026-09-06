(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const KEY='ei_location_actuals_v1';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.round(Number(n)||0));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cats=['electric','gas','water','tax','insurance','other'];
  let latest=null;

  function actuals(r){try{const all=JSON.parse(localStorage.getItem(KEY)||'{}'),id=[r.address,r.use,r.sqft].map(x=>clean(x).toLowerCase()).join('|');return all[id]||{}}catch(_e){return{}}}
  function costs(r){const a=actuals(r),c={};cats.forEach(k=>c[k]=num(a[k])>0?num(a[k]):num(r.categories?.[k]));return c}
  function total(c){return cats.reduce((s,k)=>s+num(c[k]),0)}
  function affected(c,keys){return keys.reduce((s,k)=>s+num(c[k]),0)}
  function region(state){state=String(state||'').toUpperCase();if(['ME','NH','VT','MA','RI','CT','NY','NJ','PA'].includes(state))return'Northeast';if(['OH','IN','IL','MI','WI','IA','MN','MO','KS','NE','SD','ND'].includes(state))return'Midwest';if(['DE','MD','DC','VA','WV','NC','SC','GA','FL','KY','TN','MS','AL','OK','TX','AR','LA'].includes(state))return'South';return state?'West':'U.S.'}
  function pct(){const s=$('[data-save-slider]');return Math.max(.05,Math.min(.25,num(s?.value||10)/100))}

  function measures(use,state){
    const common=[
      {title:'HVAC schedule + control tune',keys:['electric','gas'],low:.02,high:.06,cost:[0,600],difficulty:'Low',life:'Start here',detail:'Correct schedules, setbacks and simultaneous heating/cooling before replacing equipment.'},
      {title:'Insurance like-for-like rebid',keys:['insurance'],low:.05,high:.12,cost:[0,100],difficulty:'Low',life:'No comfort impact',detail:'Quote the same limits, deductibles and replacement-cost basis so a lower premium is a real saving.'},
      {title:'Recurring-service rebid',keys:['other'],low:.05,high:.12,cost:[0,150],difficulty:'Low',life:'No comfort impact',detail:'Normalize frequency and scope, then rebid waste, landscaping, monitoring or other recurring service.'},
      {title:'Leak + fixture correction',keys:['water'],low:.04,high:.10,cost:[75,900],difficulty:'Low',life:'Low disruption',detail:'Fix continuous leaks and high-flow fixtures before touching service quality.'}
    ];
    const byUse={
      residential:[
        {title:'Smart thermostat / HVAC scheduling',keys:['electric','gas'],low:.02,high:.06,cost:[150,600],difficulty:'Low',life:'Comfort-preserving',detail:'Use occupancy schedules and normal temperature bands; do not rely on extreme setbacks.'},
        {title:'Air sealing + weatherstripping',keys:['electric','gas'],low:.03,high:.09,cost:[300,2500],difficulty:'Low–medium',life:'Comfort can improve',detail:`${region(state)==='Northeast'?'Cold-season infiltration makes this especially worth screening. ':''}Seal obvious leakage before sizing larger heating or cooling equipment.`},
        {title:'Hot-water controls + pipe insulation',keys:['gas','electric','water'],low:.02,high:.05,cost:[150,1200],difficulty:'Low',life:'Little daily impact',detail:'Target recirculation timing, accessible hot-water piping and waste without reducing usable hot-water service.'},
        {title:'LED + standby-load cleanup',keys:['electric'],low:.02,high:.05,cost:[100,1000],difficulty:'Low',life:'No meaningful hardship',detail:'Prioritize longest-running lamps and true standby loads rather than replacing everything at once.'},
        ...common.slice(1)
      ],
      multifamily:[
        {title:'Common-area HVAC controls',keys:['electric','gas'],low:.03,high:.08,cost:[1000,8000],difficulty:'Low–medium',life:'Resident comfort protected',detail:'Separate common-area schedules from tenant spaces and fix simultaneous heating/cooling first.'},
        {title:'Hot-water recirculation controls',keys:['gas','electric','water'],low:.03,high:.08,cost:[1000,5000],difficulty:'Medium',life:'Low resident impact',detail:'Control recirculation by demand/time while preserving delivery times and sanitation.'},
        {title:'Common-area lighting controls',keys:['electric'],low:.03,high:.08,cost:[750,6000],difficulty:'Low',life:'No unit impact',detail:'Occupancy and schedule controls target halls, garages and utility rooms.'},...common.slice(1)
      ],
      office:[
        {title:'HVAC/BAS schedule cleanup',keys:['electric','gas'],low:.04,high:.10,cost:[750,7500],difficulty:'Low–medium',life:'Occupied comfort protected',detail:'Cut after-hours conditioning and simultaneous heating/cooling before changing occupied setpoints.'},
        {title:'Lighting occupancy controls',keys:['electric'],low:.03,high:.08,cost:[500,6000],difficulty:'Low',life:'Low disruption',detail:'Target conference rooms, storage and after-hours lighting first.'},
        {title:'Plug-load timers + shutdown policy',keys:['electric'],low:.01,high:.04,cost:[100,1500],difficulty:'Low',life:'No work-hour impact',detail:'Remove overnight idle loads without interrupting business-critical equipment.'},...common.slice(1)
      ],
      retail:[
        {title:'Entrance air-loss correction',keys:['electric','gas'],low:.02,high:.06,cost:[500,5000],difficulty:'Low–medium',life:'Customer comfort protected',detail:'Door closers, sealing and controlled air curtains can reduce entrance losses without making the sales floor uncomfortable.'},
        {title:'Lighting + controls',keys:['electric'],low:.04,high:.10,cost:[1000,9000],difficulty:'Low–medium',life:'Customer-facing',detail:'Prioritize long-hour fixtures, stock rooms and schedule controls while maintaining merchandise lighting needs.'},...common
      ],
      restaurant:[
        {title:'Kitchen hood / make-up air controls',keys:['electric','gas'],low:.04,high:.12,cost:[3000,20000],difficulty:'Medium',life:'Protect ventilation',detail:'Match exhaust and make-up air to cooking load; do not compromise code-required ventilation.'},
        {title:'Refrigeration tune + controls',keys:['electric'],low:.04,high:.10,cost:[500,5000],difficulty:'Low–medium',life:'Food safety protected',detail:'Door seals, condenser cleaning, setpoints and anti-sweat controls come before equipment replacement.'},
        {title:'Hot-water + pre-rinse optimization',keys:['gas','electric','water'],low:.03,high:.08,cost:[250,2500],difficulty:'Low',life:'Sanitation protected',detail:'Use efficient spray valves, fix leaks and tune hot-water delivery without reducing sanitation.'},...common.slice(1)
      ],
      warehouse:[
        {title:'High-bay lighting + occupancy',keys:['electric'],low:.05,high:.14,cost:[2000,15000],difficulty:'Low–medium',life:'Operations preserved',detail:'Target empty aisles and long lighting hours before broad electrical upgrades.'},
        {title:'Dock seals + door timing',keys:['electric','gas'],low:.03,high:.09,cost:[1000,8000],difficulty:'Low–medium',life:'Low workflow impact',detail:'Reduce infiltration while preserving loading throughput and safety.'},...common
      ],
      industrial:[
        {title:'Compressed-air leak program',keys:['electric'],low:.05,high:.14,cost:[500,5000],difficulty:'Low–medium',life:'Production preserved',detail:'Survey leaks, correct inappropriate uses and lower pressure only where process requirements allow.'},
        {title:'Motor / VFD feasibility screen',keys:['electric'],low:.03,high:.10,cost:[1500,15000],difficulty:'Medium',life:'Engineering review',detail:'Target continuously throttled fans and pumps; verify duty cycle before purchasing drives.'},
        {title:'Process-heat recovery screen',keys:['gas','electric'],low:.03,high:.09,cost:[2500,20000],difficulty:'Medium',life:'Engineering review',detail:'Measure exhaust/process heat before assuming a recovery project is economical.'},...common.slice(1)
      ]
    };
    return (byUse[use]||common).slice(0,7)
  }

  function buildPlan(r){
    const c=costs(r),base=total(c),targetBase=num(c.electric)+num(c.gas)+num(c.water)+num(c.insurance)+num(c.other),goal=targetBase*pct(),list=measures(r.use,r.location?.components?.state||'').map(m=>({...m,affected:affected(c,m.keys)}));
    list.forEach(m=>{m.minSave=m.affected*m.low;m.maxSave=m.affected*m.high});
    list.sort((a,b)=>b.maxSave-a.maxSave);
    let left=goal;const picked=[];
    for(const m of list){if(left<=1)break;const alloc=Math.min(left,m.maxSave);if(alloc<25)continue;picked.push({...m,save:alloc});left-=alloc}
    const annual=goal-Math.max(0,left),implementationLow=picked.reduce((s,m)=>s+m.cost[0],0),implementationHigh=picked.reduce((s,m)=>s+m.cost[1],0),implementationMid=(implementationLow+implementationHigh)/2;
    const year1Gross=annual*.75,year1Expected=base-year1Gross+implementationMid,year2Expected=base-annual,cumulative2=year1Gross+annual-implementationMid;
    return{c,base,targetBase,goal,left:Math.max(0,left),annual,picked,implementationLow,implementationHigh,implementationMid,year1Gross,year1Expected,year2Expected,cumulative2}
  }

  function movePlaybook(){const savings=$('.ei-savings'),play=$('.ei-target-playbook',savings),actual=$('.ei-actuals',savings);if(play&&actual&&play.nextElementSibling!==actual)actual.insertAdjacentElement('beforebegin',play);play?.querySelector('.ei-90day')?.remove()}

  function render(r){
    const savings=$('.ei-savings');if(!savings)return;movePlaybook();let box=$('.ei-economics',savings);if(!box){box=document.createElement('section');box.className='ei-economics';const play=$('.ei-target-playbook',savings),actual=$('.ei-actuals',savings);(play||actual)?.insertAdjacentElement('beforebegin',box)}if(!box)return;
    const p=buildPlan(r),target=Math.round(pct()*100),state=r.location?.components?.state||'',city=r.location?.components?.city||'',loc=[city,state].filter(Boolean).join(', ')||clean(r.address),phase='ExpenseIntel assumes the measures phase in over roughly 90 days, so Year 1 captures 75% of the annualized run-rate. Year 2 uses the full annualized run-rate. Implementation cost uses the midpoint of the planning ranges below.';
    box.innerHTML=`
      <div class="ei-econ-head"><div><span>Target economics / ${esc(loc)}</span><h3>What the ${target}% target costs to pursue — and what it could be worth.</h3><p>These are transparent planning scenarios tied to this property’s current cost model. They are not contractor quotes or guaranteed savings. Replace modeled costs with real bills and real quotes as you get them.</p></div><aside><span>Annualized target reached</span><strong>${money(p.annual)}</strong><small>${p.left>1?`${money(p.left)} of the selected target still needs a deeper verified lever`:'fully allocated across the current low/moderate-disruption plan'}</small></aside></div>
      <div class="ei-econ-summary">
        <div><span>Current annual cost</span><strong>${money(p.base)}</strong><small>current model / supplied actuals</small></div>
        <div><span>Implementation planning cost</span><strong>${money(p.implementationLow)}–${money(p.implementationHigh)}</strong><small>one-time planning range · not a quote</small></div>
        <div class="accent"><span>Year 1 expected cost</span><strong>${money(p.year1Expected)}</strong><small>${money(p.year1Gross)} gross operating saving, then estimated implementation spend</small></div>
        <div class="accent"><span>Year 2 expected cost</span><strong>${money(p.year2Expected)}</strong><small>${money(p.annual)} annualized operating saving if the plan performs</small></div>
        <div><span>2-year net impact</span><strong class="${p.cumulative2>=0?'good':'warn'}">${p.cumulative2>=0?money(p.cumulative2)+' saved':money(Math.abs(p.cumulative2))+' net cost'}</strong><small>two years of modeled savings less midpoint implementation cost</small></div>
      </div>
      <div class="ei-econ-note">${esc(phase)}</div>
      <div class="ei-system-plan-head"><div><span>Specific systems / actions</span><h4>What ExpenseIntel would price first.</h4></div><p>${esc(region(state))} climate context + ${esc(r.use||'property')} use + the current cost stack determine the order. High-capital replacements stay out unless the lower-hardship steps cannot close the target.</p></div>
      <div class="ei-system-plan"></div>
      <section class="ei-90-visible"><div class="ei-90-head"><div><span>90-day low-hardship plan</span><h4>Reach for the savings without making daily life worse.</h4></div><b>${target}% target</b></div><div class="ei-90-visible-grid">
        <article><span>Days 1–7</span><strong>Get the baseline right.</strong><p>Enter 12 months of real electricity, gas and water spend if available, plus the real tax and insurance figures. Record current thermostat schedules, major equipment and recurring service contracts. Do not change anything yet.</p></article>
        <article><span>Days 8–30</span><strong>Do the no-regret work.</strong><p>${esc(p.picked.slice(0,2).map(x=>x.title).join(' + ')||'Schedules, leaks and contract rebids')} first. Keep normal comfort, ventilation, sanitation and safety levels. These should be the easiest dollars in the target.</p></article>
        <article><span>Days 31–60</span><strong>Measure, then correct.</strong><p>Compare usage—not just dollars—with the baseline where possible. Weather and tariff changes can move the bill even when consumption improves. Keep only changes that reduce normalized usage or verified recurring cost.</p></article>
        <article><span>Days 61–90</span><strong>Price the deeper system.</strong><p>${esc(p.picked.slice(2,4).map(x=>x.title).join(' + ')||'Only the remaining high-value system changes')} should be quoted now. Require installed price, included scope, expected annual savings and warranty before counting the project as part of the target.</p></article>
      </div></section>`;
    const grid=$('.ei-system-plan',box);p.picked.forEach((m,i)=>{const card=document.createElement('article');card.className='ei-system-plan-card';const mid=(m.cost[0]+m.cost[1])/2,pay= m.save>0?mid/m.save:0;card.innerHTML=`<div class="ei-system-rank">${String(i+1).padStart(2,'0')}</div><div><span>${esc(m.difficulty)} disruption · ${esc(m.life)}</span><h5>${esc(m.title)}</h5><p>${esc(m.detail)}</p><div class="ei-system-numbers"><div><span>Planning cost</span><strong>${money(m.cost[0])}–${money(m.cost[1])}</strong></div><div><span>Target contribution</span><strong>${money(m.save)}/yr</strong></div><div><span>Midpoint payback</span><strong>${pay>0?pay.toFixed(1)+' yr':'—'}</strong></div></div><small>Planning range only. Verify installed scope and actual bill impact before treating this as realized savings.</small></div>`;grid.appendChild(card)});
    if(p.left>1){const card=document.createElement('article');card.className='ei-system-plan-card gap';card.innerHTML=`<div class="ei-system-rank">!</div><div><span>Unallocated target</span><h5>${money(p.left)}/yr still needs a verified deeper lever.</h5><p>ExpenseIntel will not force the remaining target through harsher thermostat settings or service cuts. This is where a real provider/tariff quote, equipment proposal, envelope project or other structural change must be tested.</p></div>`;grid.appendChild(card)}
  }

  function bind(r){latest=r;const wait=()=>{const savings=$('.ei-savings'),slider=$('[data-save-slider]');if(!savings||!slider){setTimeout(wait,60);return}if(savings.dataset.eiEconomics==='1'){render(r);return}savings.dataset.eiEconomics='1';slider.addEventListener('input',()=>setTimeout(()=>render(r),0));$$('.ei-actuals-grid input',savings).forEach(i=>i.addEventListener('input',()=>setTimeout(()=>render(r),40)));$$('[data-save-tab]',savings).forEach(b=>b.addEventListener('click',()=>setTimeout(movePlaybook,0)));setTimeout(()=>render(r),20)};wait()}
  document.addEventListener('ei:screen-complete',e=>bind(e.detail));
})();