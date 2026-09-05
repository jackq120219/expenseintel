(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const compact=n=>Math.abs(Number(n)||0)>=1000000?'$'+((Number(n)||0)/1000000).toFixed(2)+'M':Math.abs(Number(n)||0)>=1000?'$'+((Number(n)||0)/1000).toFixed(1)+'k':money(n);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const val=id=>Number($(id)?.value)||0;
  const sumYears=(annual,growth,years=5)=>Array.from({length:years},(_,i)=>annual*Math.pow(1+growth,i)).reduce((a,b)=>a+b,0);
  const fmtRate=n=>Number.isFinite(n)?n.toFixed(2)+'¢':'—';
  const letters=['A','B','C','D'];

  async function getJSON(url){
    const r=await fetch(url,{headers:{Accept:'application/json'}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.error||'Data source unavailable.');
    return d;
  }

  async function enrich(location,use,sqft,kwhOverride,gasOverride,fixed){
    const state=location?.components?.state||'';
    const tract=location?.components?.tract||'';
    const [energy,risk]=await Promise.all([
      state?getJSON(`/api/energy?state=${encodeURIComponent(state)}&use=${encodeURIComponent(use)}`).catch(()=>null):null,
      tract?getJSON(`/api/risk?tract=${encodeURIComponent(tract)}`).catch(()=>null):null
    ]);
    const kwh=kwhOverride||((energy?.intensity?.kwhSqft||0)*sqft);
    const gasMcf=gasOverride||(((energy?.intensity?.gasCfSqft||0)*sqft)/1000);
    const elecRate=energy?.electricity?.centsKwh||0;
    const gasRate=energy?.gas?.dollarsMcf||0;
    const electricity=kwh*(elecRate/100);
    const gas=gasMcf*gasRate;
    const annual=electricity+gas+fixed;
    const yoy=Number.isFinite(energy?.electricity?.yoy)?energy.electricity.yoy:0;
    const growth=clamp(.03+Math.max(-.01,yoy)*.30,.02,.07);
    const five=sumYears(annual,growth,5);
    const evidence=clamp(30+(location?.verified?20:0)+(energy?.electricity?20:0)+(energy?.gas?15:0)+(risk?.available?15:0),30,100);
    return {location,energy,risk,kwh,gasMcf,elecRate,gasRate,electricity,gas,fixed,annual,growth,five,evidence};
  }

  function setError(msg=''){
    const el=$('[data-matrix-error]'); if(!el)return;
    el.textContent=msg; el.classList.toggle('show',!!msg);
  }

  function rankLabel(row,index){
    if(index===0)return 'Current leader';
    if(!row.kwh||!Number.isFinite(row.kwh))return 'No threshold';
    return 'Rate threshold';
  }

  function renderThresholds(rows){
    const zone=$('[data-mx-thresholds]'); zone.innerHTML='';
    const winner=rows[0];
    rows.slice(0,4).forEach((row,index)=>{
      const card=document.createElement('article'); card.className='threshold-card';
      const current=row.elecRate;
      let threshold=null,delta=null,body='';
      if(index===0){
        body='This location currently has the lowest five-year modeled burden under the shared operating profile.';
      }else if(row.kwh>0){
        threshold=((winner.annual-row.gas-row.fixed)/row.kwh)*100;
        delta=current-threshold;
        body=Number.isFinite(threshold)?`Its electricity price would need to fall to roughly ${threshold.toFixed(2)}¢/kWh, all else held constant, to match the current annual burden of the leader.`:'No clean electricity-only break-even can be calculated.';
      }
      card.innerHTML='<span></span><h3></h3><strong></strong><p></p>';
      card.querySelector('span').textContent=`Candidate ${letters[row.originalIndex]} · ${rankLabel(row,index)}`;
      card.querySelector('h3').textContent=row.location?.components?.city||row.location?.label||`Candidate ${letters[row.originalIndex]}`;
      card.querySelector('strong').textContent=index===0?'LEADER':Number.isFinite(threshold)?`${threshold.toFixed(2)}¢ / kWh to tie`:'No clean threshold';
      card.querySelector('p').textContent=body;
      zone.appendChild(card);
    });
  }

  function render(rows,use,sqft){
    const result=$('[data-matrix-result]'); result.classList.add('show'); $('[data-matrix-empty]')?.classList.add('hide');
    rows.sort((a,b)=>a.five-b.five);
    const winner=rows[0],last=rows[rows.length-1];
    $('[data-mx-winner]').textContent=winner.location?.components?.city||winner.location?.label||'Candidate';
    $('[data-mx-spread]').textContent=compact(last.five-winner.five);
    $('[data-mx-annual-spread]').textContent=compact(last.annual-winner.annual)+'/yr';
    $('[data-mx-profile]').textContent=`${use} · ${sqft.toLocaleString()} ft²`;
    const body=$('[data-mx-rows]'); body.innerHTML='';
    rows.forEach((row,index)=>{
      const el=document.createElement('div'); el.className='rank-row'+(index===0?' winner':'');
      const risk=row.risk?.available?(row.risk.composite?.rating||'Available'):'Unavailable';
      const state=row.location?.components?.state||'';
      const provider=row.energy?.electricity?'EIA':'Partial';
      el.innerHTML='<div class="rank-no"></div><div class="rank-address"><strong></strong><small></small></div><div class="rank-metric"></div><div class="rank-metric"></div><div class="rank-metric"></div><div></div><div class="rank-metric"></div>';
      el.children[0].textContent=index+1;
      el.children[1].querySelector('strong').textContent=row.location?.label||`Candidate ${letters[row.originalIndex]}`;
      el.children[1].querySelector('small').textContent=`${state} · evidence ${row.evidence}% · ${provider}`;
      el.children[2].innerHTML=`${compact(row.electricity)}<span class="rank-sub">${fmtRate(row.elecRate)} / kWh</span>`;
      el.children[3].innerHTML=`${compact(row.gas)}<span class="rank-sub">$${row.gasRate?row.gasRate.toFixed(2):'—'} / Mcf</span>`;
      el.children[4].innerHTML=`${compact(row.annual)}<span class="rank-sub">+${(row.growth*100).toFixed(1)}% modeled annual movement</span>`;
      el.children[5].innerHTML=`<span class="rank-badge">${risk}</span>`;
      el.children[6].innerHTML=`${compact(row.five)}<span class="rank-sub">5-year cumulative</span>`;
      body.appendChild(el);
    });
    const annualSpread=last.annual-winner.annual;
    $('[data-mx-explain]').textContent=`Under the same operating profile, the current annual modeled spread from lowest to highest is ${money(annualSpread)} and the five-year spread is ${money(last.five-winner.five)}. ExpenseIntel then calculates the electricity-price boundary that would be needed for each trailing candidate to catch the leader, holding other modeled variables constant.`;
    renderThresholds(rows);
    result.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function run(e){
    e.preventDefault(); setError('');
    const use=$('#mx-use').value,sqft=val('#mx-sqft'),kwh=val('#mx-kwh'),gas=val('#mx-gas'),fixed=val('#mx-fixed');
    if(!sqft||sqft<300){setError('Enter a valid floor area of at least 300 ft².');return}
    const inputs=[$('#mx-a'),$('#mx-b'),$('#mx-c'),$('#mx-d')];
    const active=inputs.filter((input,i)=>i<2||input.value.trim());
    if(!inputs[0].value.trim()||!inputs[1].value.trim()){setError('Location Matrix needs at least Candidate A and Candidate B.');return}
    const btn=$('.matrix-run');btn.disabled=true;
    try{
      const locations=[];
      for(const input of active){
        const loc=await EI.requireResolvedAddress(input);
        if(!loc)return;
        locations.push({loc,originalIndex:inputs.indexOf(input)});
      }
      const rows=await Promise.all(locations.map(async item=>({...(await enrich(item.loc,use,sqft,kwh,gas,fixed)),originalIndex:item.originalIndex})));
      if(rows.some(r=>!r.energy?.electricity))setError('One or more candidates have partial energy coverage. The ranking is still shown, but review evidence coverage before relying on the spread.');
      render(rows,use,sqft);
    }catch(err){setError(err.message||'Unable to build Location Matrix.');}
    finally{btn.disabled=false}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    $('[data-matrix-form]')?.addEventListener('submit',run);
  });
})();