(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  const round=n=>Math.round(Number(n)||0);
  const pct=n=>`${round(n)}%`;
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0);
  const PROFILES={
    restaurant:{hours:5000,load:.45,kwh:43.8,water:88,sewer:88,gas:82,data:48},
    retail:{hours:4000,load:.38,kwh:13.2,water:32,sewer:32,gas:38,data:58},
    office:{hours:3000,load:.36,kwh:13.6,water:38,sewer:38,gas:35,data:82},
    warehouse:{hours:3500,load:.38,kwh:5.5,water:18,sewer:18,gas:44,data:42},
    industrial:{hours:5200,load:.55,kwh:18,water:66,sewer:61,gas:70,data:52},
    multifamily:{hours:8760,load:.45,kwh:8.5,water:76,sewer:76,gas:62,data:68},
    residential:{hours:8760,load:.32,kwh:7.2,water:58,sewer:58,gas:55,data:54},
    other:{hours:4000,load:.4,kwh:12.6,water:44,sewer:42,gas:46,data:50}
  };
  const INTERVENTIONS={
    electrical:{label:'Electrical service',short:'ELEC',lock:82,capital:68},
    plumbing:{label:'Process plumbing',short:'PLBG',lock:78,capital:64},
    structural:{label:'Structural work',short:'STRUCT',lock:96,capital:90},
    hvac:{label:'Specialized HVAC',short:'HVAC',lock:72,capital:72},
    fire:{label:'Fire / sprinkler',short:'FIRE',lock:86,capital:76},
    site:{label:'Site / paving / access',short:'SITE',lock:92,capital:84},
    equipment:{label:'Fixed equipment',short:'EQUIP',lock:69,capital:86},
    finishes:{label:'Partitions / finishes',short:'FIN',lock:36,capital:44}
  };
  const BOTTLE_LABELS={zoning:'Zoning / use',utilities:'Utilities',life:'Life safety',schedule:'Schedule / procurement',site:'Site / environment',health:'Health / occupancy'};
  function set(s,v){const el=$(s);if(el)el.textContent=v}
  function error(msg=''){const el=$('[data-project-error]');if(!el)return;el.textContent=msg;el.classList.toggle('show',!!msg)}
  async function getEnergy(state,use){if(!state)return null;try{const r=await fetch(`/api/energy?state=${encodeURIComponent(state)}&use=${encodeURIComponent(use)}`,{headers:{Accept:'application/json'}});const d=await r.json().catch(()=>null);return r.ok&&d?.ok?d:null}catch(_e){return null}}
  function getInputs(){
    const form=$('[data-project-form]');
    const interventionRoot=$('[data-interventions]');
    const interventions=new Set($$('input:checked',interventionRoot).map(x=>x.value));
    const triggers=new Set($$('.chip-grid input:checked',form).filter(x=>!x.closest('[data-interventions]')).map(x=>x.value));
    return{current:$('#pj-current').value,use:$('#pj-use').value,sqft:Number($('#pj-sqft').value),months:Number($('#pj-months').value),contingency:Number($('#pj-contingency').value),serviceAmps:Number($('#pj-electric').value)||0,triggers,interventions};
  }
  function electricDemand(profile,sqft,energy,use){
    const intensity=Number(energy?.intensity?.kwhSqft)||profile.kwh;
    const annualKwh=intensity*sqft;
    const peakKw=annualKwh/Math.max(1,profile.hours)/Math.max(.2,profile.load);
    const residential=use==='residential';
    const serviceKwPerAmp=residential?.24:(Math.sqrt(3)*.208*.9);
    return{intensity,annualKwh,peakKw,serviceKwPerAmp,mode:residential?'240V single-phase screening equivalent':'208V three-phase screening equivalent'};
  }
  function utilityPressure(input,profile,demand){
    const t=input.triggers;
    return{
      electric:clamp((demand.intensity/45)*72+(t.has('heavyPower')?24:0)+(t.has('utilityUpgrade')?12:0)),
      water:clamp(profile.water+(t.has('processWater')?24:0)+(t.has('food')?8:0)),
      sewer:clamp(profile.sewer+(t.has('processWater')?28:0)+(t.has('food')?8:0)),
      gas:clamp(profile.gas+(t.has('food')?16:0)+(t.has('heavyPower')?4:0)),
      data:clamp(profile.data+(t.has('specialEquipment')?8:0))
    };
  }
  function renderUtilities(input,energy){
    const profile=PROFILES[input.use]||PROFILES.other,demand=electricDemand(profile,input.sqft,energy,input.use),pressure=utilityPressure(input,profile,demand);
    const serviceKw=input.serviceAmps?input.serviceAmps*demand.serviceKwPerAmp:0;
    const headroom=input.serviceAmps?((serviceKw-demand.peakKw)/serviceKw)*100:null;
    const utilities=[
      {key:'electric',label:'Electric',pressure:pressure.electric,known:!!input.serviceAmps,note:input.serviceAmps?`${fmt(input.serviceAmps)}A user-supplied service`:'service rating not supplied'},
      {key:'water',label:'Water',pressure:pressure.water,known:false,note:'capacity not supplied'},
      {key:'sewer',label:'Sewer',pressure:pressure.sewer,known:false,note:'capacity not supplied'},
      {key:'gas',label:'Gas',pressure:pressure.gas,known:false,note:'capacity not supplied'},
      {key:'data',label:'Data',pressure:pressure.data,known:false,note:'service level not supplied'}
    ];
    const pos={electric:[22,30],water:[51,22],sewer:[74,47],gas:[38,66],data:[70,76]};
    const bubble=$('[data-utility-bubbles]');bubble.innerHTML='';
    utilities.forEach(u=>{const d=document.createElement('div'),size=74+u.pressure*.72,[x,y]=pos[u.key];d.className=`utility-bubble ${u.pressure>=72?'high':''} ${u.known?'':'unknown'}`;d.style.width=d.style.height=`${size}px`;d.style.left=`calc(${x}% - ${size/2}px)`;d.style.top=`calc(${y}% - ${size/2}px)`;d.innerHTML='<div><strong></strong><span></span><small></small></div>';d.querySelector('strong').textContent=u.label;d.querySelector('span').textContent=round(u.pressure);d.querySelector('small').textContent=u.known?'CAPACITY INPUT':'DEMAND PRESSURE';bubble.appendChild(d)});
    set('[data-electric-demand]',`${round(demand.peakKw)} kW`);set('[data-electric-method]',`${demand.intensity.toFixed(1)} kWh/ft² intensity · ${demand.mode}. Screening proxy only.`);
    if(headroom==null){set('[data-electric-headroom]','UNRESOLVED');set('[data-electric-note]','No service amperage supplied. ExpenseIntel will not invent available capacity.')}else{set('[data-electric-headroom]',`${headroom>=0?'+':''}${round(headroom)}%`);set('[data-electric-note]',headroom<0?'Modeled peak demand exceeds the user-supplied service equivalent. Confirm with the utility / engineer.':headroom<25?'Screening headroom is tight. Confirm diversity, voltage, power factor and utility capacity.':'User-supplied service rating is above the modeled peak-demand proxy; utility confirmation is still required.')} 
    const list=$('[data-utility-list]');list.innerHTML='';utilities.forEach(u=>{let state='UNVERIFIED';if(u.key==='electric'&&headroom!=null)state=headroom<0?'OVER PROXY':headroom<25?'TIGHT':'HEADROOM';const row=document.createElement('div');row.className='utility-line';row.innerHTML='<div><b></b><small></small></div><span></span>';row.querySelector('b').textContent=u.label;row.querySelector('small').textContent=u.note;row.querySelector('span').textContent=state;list.appendChild(row)});
    return{pressure,demand,headroom,unknown:utilities.filter(x=>!x.known).length};
  }
  function fragility(input,utility,model){
    const change=input.current!=='vacant'&&input.current!==input.use;
    const utilityUnknown=utility.unknown/5*100;
    const approval=clamp(input.triggers.size*13+(change?28:0)+(input.triggers.has('hazmat')?18:0));
    const schedule=input.months<=4?100:input.months<=7?82:input.months<=10?62:input.months<=15?38:20;
    const contingency=input.contingency<3?100:input.contingency<5?86:input.contingency<8?66:input.contingency<12?42:22;
    const selected=[...input.interventions].map(k=>INTERVENTIONS[k]).filter(Boolean),lock=selected.length?selected.reduce((s,x)=>s+x.lock,0)/selected.length:18;
    const operating=Number(model?.risk)||45;
    const score=clamp(utilityUnknown*.24+approval*.24+schedule*.18+contingency*.14+lock*.10+operating*.10);
    const factors=[['Utility uncertainty',utilityUnknown],['Approval dependency',approval],['Schedule pressure',schedule],['Contingency pressure',contingency],['Capital lock-in',lock],['Operating exposure',operating]];
    const label=score>=78?'High fragility':score>=58?'Material fragility':score>=38?'Moderate fragility':'Lower fragility';
    return{score,factors,label,change,lock};
  }
  function renderFragility(input,utility,model){const f=fragility(input,utility,model);set('[data-frag-score]',round(f.score));set('[data-frag-label]',f.label);$('[data-frag-ring]').style.background=`conic-gradient(var(--lime) 0deg ${f.score*3.6}deg,#e5e0d5 ${f.score*3.6}deg 360deg)`;set('[data-frag-copy]',f.score>=70?'The project currently depends on several unresolved gates. Reduce uncertainty before increasing irreversible spend.':f.score>=45?'The project is workable as a screen, but a few dependencies can still dominate the outcome.':'The current project fingerprint has fewer stacked dependencies, but unresolved facts still need confirmation.');const zone=$('[data-frag-bars]');zone.innerHTML='';f.factors.forEach(([name,value])=>{const row=document.createElement('div');row.className='factor-row';row.innerHTML='<span></span><div class="factor-track"><i></i></div><b></b>';row.querySelector('span').textContent=name;row.querySelector('i').style.width=`${clamp(value)}%`;row.querySelector('b').textContent=round(value);zone.appendChild(row)});return f}
  function bottlenecks(input,utility){
    const t=input.triggers,change=input.current!=='vacant'&&input.current!==input.use;
    const scores={
      zoning:clamp(22+(change?54:0)+(input.current==='vacant'?18:0)+(t.has('exterior')?10:0)+(t.has('hazmat')?12:0)),
      utilities:clamp(22+(utility.unknown/5)*34+(t.has('heavyPower')?34:0)+(t.has('processWater')?18:0)+(t.has('utilityUpgrade')?30:0)),
      life:clamp(18+(t.has('highOccupancy')?42:0)+(t.has('food')?24:0)+(t.has('specialEquipment')?12:0)+(change?8:0)),
      schedule:clamp(input.months<=5?92:input.months<=8?72:input.months<=12?52:30+(t.has('specialEquipment')?18:0)+(t.has('utilityUpgrade')?16:0)),
      site:clamp(16+(t.has('exterior')?54:0)+(t.has('hazmat')?48:0)+(t.has('processWater')?12:0)),
      health:clamp(12+(t.has('food')?64:0)+(t.has('highOccupancy')?34:0)+(change?10:0))
    };
    const order=['zoning','utilities','life','schedule','site','health'],angles=[-90,-30,30,90,150,210],points=order.map((k,i)=>{const r=140*(scores[k]/100),a=angles[i]*Math.PI/180;return`${(210+Math.cos(a)*r).toFixed(1)},${(178+Math.sin(a)*r).toFixed(1)}`});
    return{scores,order,points,ranked:Object.entries(scores).sort((a,b)=>b[1]-a[1])};
  }
  function renderBottlenecks(input,utility){const b=bottlenecks(input,utility);$('[data-radar-polygon]').setAttribute('points',b.points.join(' '));const [topKey,topScore]=b.ranked[0];set('[data-radar-top]',BOTTLE_LABELS[topKey]);set('[data-radar-copy]',`${BOTTLE_LABELS[topKey]} is the strongest screening bottleneck at ${round(topScore)}/100 based on the project conditions entered. This is a prioritization signal, not an approval-time forecast.`);const z=$('[data-radar-ranking]');z.innerHTML='';b.ranked.slice(0,4).forEach(([k,v],i)=>{const row=document.createElement('div');row.className='radar-rank';row.innerHTML='<i></i><span></span><b></b>';row.querySelector('i').textContent=String(i+1).padStart(2,'0');row.querySelector('span').textContent=BOTTLE_LABELS[k];row.querySelector('b').textContent=round(v);z.appendChild(row)});return b}
  function renderUndo(input){const values=[...input.interventions].map(k=>INTERVENTIONS[k]).filter(Boolean),zone=$('[data-undo-bubbles]');zone.innerHTML='';if(!values.length){const n=document.createElement('div');n.className='status-note';n.style.position='absolute';n.style.left='50%';n.style.top='50%';n.style.transform='translate(-50%,-50%)';n.textContent='Select planned interventions in the project brief to map reversibility.';zone.appendChild(n);set('[data-undo-top]','No interventions selected');set('[data-undo-count]','0');return{values,top:null,high:0}}
    values.forEach(v=>{const el=document.createElement('div'),size=30+v.capital*.28;el.className='undo-bubble';el.style.width=el.style.height=`${size}px`;el.style.left=`${8+v.lock*.84}%`;el.style.bottom=`${8+v.capital*.82}%`;el.title=`${v.label} · reversibility lock ${v.lock}/100 · capital intensity ${v.capital}/100`;el.textContent=v.short;zone.appendChild(el)});const top=[...values].sort((a,b)=>b.lock-a.lock)[0],high=values.filter(v=>v.lock>=75).length;set('[data-undo-top]',top.label);set('[data-undo-count]',String(high));set('[data-undo-note]',`${top.label} carries the highest normalized reversibility lock (${top.lock}/100) among selected interventions.`);return{values,top,high}}
  function failurePatterns(input,utility,frag,bot,undo){
    const t=input.triggers,change=input.current!=='vacant'&&input.current!==input.use,highLock=undo.top?.lock||0;
    const patterns=[
      {title:'Capacity discovered after design',score:clamp(18+(utility.unknown*9)+(t.has('heavyPower')?28:0)+(t.has('utilityUpgrade')?16:0)),copy:'Design advances before actual service capacity is confirmed, then utility reality forces redesign, equipment changes or schedule loss.',verify:'Get service data before design freeze.'},
      {title:'Change-of-use cascade',score:clamp(change?78+(t.has('food')?10:0)+(t.has('highOccupancy')?8:0):14),copy:'A use change triggers several linked reviews at once—zoning, life safety, occupancy, health or utility work—after the deal was priced as a simple fit-out.',verify:'Confirm the proposed use classification first.'},
      {title:'Approval on the critical path',score:clamp((input.months<10?36:15)+t.size*7+(change?18:0)+(t.has('hazmat')?18:0)),copy:'The project schedule has little slack while a discretionary, technical or third-party approval sits upstream of construction.',verify:'Separate gating approvals from parallel work.'},
      {title:'Trade-boundary scope gap',score:clamp(20+input.interventions.size*8+(t.has('utilityUpgrade')?15:0)+(input.interventions.has('electrical')&&input.interventions.has('site')?12:0)),copy:'Work falls between scopes—utility vs. electrical, civil vs. trenching, controls vs. mechanical—because each party assumes another party owns it.',verify:'Build a responsibility matrix across scopes.'},
      {title:'Irreversible spend before entitlement',score:clamp((highLock>=80?46:12)+(change?22:0)+(t.has('hazmat')||t.has('exterior')||t.has('food')?18:0)),copy:'Hard-to-reverse improvements begin before the project has cleared the uncertainty that can still change or kill the plan.',verify:'Gate high-lock spend behind verified approvals.'},
      {title:'Long-lead dependency trap',score:clamp((t.has('specialEquipment')?52:12)+(input.months<12?24:8)+(t.has('utilityUpgrade')?14:0)),copy:'A long-lead piece of equipment or utility upgrade becomes a single schedule dependency with little substitution or recovery time.',verify:'Confirm lead time and substitute path early.'},
      {title:'Contingency squeeze',score:clamp((input.contingency<5?72:input.contingency<8?54:input.contingency<12?30:14)+t.size*3),copy:'The project carries several unresolved conditions but too little contingency to absorb redesign, utility work, scope additions or review-driven changes.',verify:'Tie contingency to unresolved scope, not habit.'}
    ];
    return patterns.sort((a,b)=>b.score-a.score).slice(0,6);
  }
  function renderFailures(input,utility,frag,bot,undo){const patterns=failurePatterns(input,utility,frag,bot,undo),zone=$('[data-failure-grid]');zone.innerHTML='';patterns.forEach((p,i)=>{const el=document.createElement('article');el.className='failure-card';el.style.setProperty('--match',`${p.score}%`);const level=p.score>=75?'STRONG MATCH':p.score>=50?'MATERIAL MATCH':p.score>=30?'WATCH':'LOW MATCH';el.innerHTML='<span></span><h3></h3><p></p><footer><b></b><i style="font-style:normal"></i></footer>';el.querySelector('span').textContent=`Pattern ${String(i+1).padStart(2,'0')}`;el.querySelector('h3').textContent=p.title;el.querySelector('p').textContent=p.copy;el.querySelector('footer b').textContent=level;el.querySelector('footer i').textContent=`${round(p.score)}/100`;el.title=p.verify;zone.appendChild(el)});return patterns}
  function renderNext(input,utility,frag,bot,undo,patterns){
    const t=input.triggers,change=input.current!=='vacant'&&input.current!==input.use,items=[];
    if(change)items.push({title:'Confirm the proposed use classification at this parcel',copy:'Resolve whether the intended use is by-right, conditional, special, prohibited or subject to a change-of-use review before design assumptions harden.',owner:'ZONING / LAND USE'});
    if(!input.serviceAmps||t.has('heavyPower')||t.has('utilityUpgrade'))items.push({title:'Get actual electrical service and available-capacity information',copy:'Ask for existing service voltage/phase/amperage and whether the utility can support the proposed load. Do not substitute the modeled demand proxy for utility confirmation.',owner:'UTILITY + ELECTRICAL'});
    if(t.has('processWater'))items.push({title:'Confirm water, sewer and discharge constraints',copy:'Identify available service, connection size, discharge limits and any process-wastewater requirements before equipment and plumbing layouts are fixed.',owner:'UTILITY / PUBLIC WORKS'});
    if(t.has('food')||t.has('highOccupancy'))items.push({title:'Test the life-safety and occupancy path before layout freeze',copy:'Confirm occupancy classification, egress, suppression, ventilation and health-review triggers while the floor plan is still cheap to change.',owner:'FIRE / BUILDING / HEALTH'});
    if(t.has('hazmat'))items.push({title:'Resolve environmental and hazardous-use gates first',copy:'Verify storage, emissions, discharge and fire-code implications before committing to specialized equipment or site work.',owner:'ENVIRONMENT / FIRE'});
    if(undo.high>0)items.push({title:'Put a gate in front of high-lock capital',copy:`Do not release the hardest-to-reverse selected work—especially ${undo.top?.label||'high-lock improvements'}—until its upstream approvals and utility dependencies are cleared.`,owner:'OWNER / GC'});
    if(input.contingency<8)items.push({title:'Rebuild contingency around unresolved conditions',copy:`The entered ${input.contingency}% contingency is thin relative to the current project uncertainty. Size contingency to unresolved scope and dependencies rather than a default percentage.`,owner:'BUDGET / PRECON'});
    if(input.months<9)items.push({title:'Build a critical-path schedule around external dependencies',copy:'Separate work you control from reviews, utility actions and long-lead procurement that can dominate the schedule.',owner:'SCHEDULE'});
    if(items.length<5)items.push({title:'Create a one-page assumption register',copy:'List every condition the project currently assumes—capacity, use, access, approval, scope and schedule—and attach the document or person that can verify it.',owner:'PROJECT CONTROL'});
    if(items.length<5)items.push({title:'X-Ray the first real quote or lease cost schedule',copy:'Use the actual document to expose missing recurring obligations, scope gaps and escalation language before the project budget becomes the accepted truth.',owner:'EXPENSEINTEL X-RAY'});
    const zone=$('[data-next-list]');zone.innerHTML='';items.slice(0,5).forEach((x,i)=>{const el=document.createElement('article');el.className='next-item';el.innerHTML='<strong></strong><div><h3></h3><p></p></div><aside></aside>';el.querySelector('strong').textContent=String(i+1).padStart(2,'0');el.querySelector('h3').textContent=x.title;el.querySelector('p').textContent=x.copy;el.querySelector('aside').textContent=x.owner;zone.appendChild(el)})
  }
  function addProjectNav(){const nav=$('.navlinks');if(!nav)return;if(!nav.querySelector('a[href="/project/"]')){const a=document.createElement('a');a.href='/project/';a.textContent='Project Lab';a.classList.add('active');nav.insertBefore(a,nav.children[3]||null)}nav.querySelectorAll('a').forEach(a=>{if(a.getAttribute('href')!=='/project/')a.classList.remove('active')})}
  function prefill(){try{const s=JSON.parse(sessionStorage.getItem('ei_last')||'null');if(s){$('#pj-address').value=s.address||'';if(PROFILES[s.use])$('#pj-use').value=s.use;$('#pj-sqft').value=s.sqft||'12000'}}catch(_e){}}
  async function run(e){e.preventDefault();error('');const input=getInputs();if(!Number.isFinite(input.sqft)||input.sqft<300){error('Enter a project area of at least 300 ft².');return}if(!Number.isFinite(input.months)||input.months<1){error('Enter a valid project timeline.');return}const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;try{const loc=await EI.requireResolvedAddress($('#pj-address'));if(!loc)return;const energy=await getEnergy(loc.components?.state,input.use),model=EI.estimate(loc.label,input.use,input.sqft,loc,energy);const utility=renderUtilities(input,energy),frag=renderFragility(input,utility,model),bot=renderBottlenecks(input,utility),undo=renderUndo(input),patterns=renderFailures(input,utility,frag,bot,undo);renderNext(input,utility,frag,bot,undo,patterns);set('[data-r-project]',`${input.use.toUpperCase()} · ${fmt(input.sqft)} FT²`);set('[data-r-fragility]',`${round(frag.score)}/100`);set('[data-r-bottleneck]',BOTTLE_LABELS[bot.ranked[0][0]]);set('[data-r-utility]',`${utility.unknown}/5`);set('[data-r-lock]',undo.top?undo.top.label:'None selected');set('[data-single-point]',frag.change?'Change-of-use feasibility':input.triggers.has('heavyPower')&&!input.serviceAmps?'Electric capacity confirmation':input.triggers.has('hazmat')?'Environmental / hazardous-use gate':input.triggers.has('food')?'Health + life-safety path':input.triggers.has('utilityUpgrade')?'Utility upgrade schedule':input.months<8?'Schedule slack':'Evidence completeness');set('[data-single-copy]',frag.change?'The proposed use differs from the current use. Confirm the land-use and occupancy path before treating downstream design assumptions as stable.':input.triggers.has('heavyPower')&&!input.serviceAmps?'Heavy electrical demand is part of the plan, but no actual service rating was supplied. That makes capacity confirmation the clearest current single-point dependency.':'This is the highest-leverage unresolved dependency in the current project fingerprint; verify it before hard-to-reverse spend.');set('[data-ledger-address]',`${loc.label} · ${loc.provider||'verified address source'}`);set('[data-ledger-energy]',energy?.electricity?`${energy.electricity.source} · ${energy.electricity.period||'current returned period'}`:'No public energy price signal returned; demand screening used labeled benchmark intensity.');set('[data-ledger-user]',`${input.use} · ${fmt(input.sqft)} ft² · ${input.months} months · ${input.contingency}% contingency · ${input.triggers.size} triggers · ${input.interventions.size} interventions.`);try{sessionStorage.setItem('ei_last',JSON.stringify({address:loc.label,use:input.use,sqft:String(input.sqft),location:loc}))}catch(_e){}const out=$('[data-project-results]');out.classList.add('show');requestAnimationFrame(()=>out.scrollIntoView({behavior:'smooth',block:'start'}))}catch(ex){error(ex.message||'Unable to build the project screen.')}finally{btn.disabled=false}}
  document.addEventListener('DOMContentLoaded',()=>{addProjectNav();prefill();$('[data-project-form]')?.addEventListener('submit',run)});
})();