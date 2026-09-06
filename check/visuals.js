(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)):'—';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  let lastData=null,renderQueued=false;

  function captureCheckFetch(){
    if(window.__eiVisualFetchWrapped)return;
    window.__eiVisualFetchWrapped=true;
    const original=window.fetch.bind(window);
    window.fetch=async(...args)=>{
      const response=await original(...args);
      try{
        const url=typeof args[0]==='string'?args[0]:args[0]?.url||'';
        if(/\/api\/check(?:\?|$)/.test(url)){
          const clone=response.clone();
          clone.json().then(d=>{if(d?.ok){lastData=d;scheduleRender()}}).catch(()=>{});
        }
      }catch(_e){}
      return response;
    };
  }

  function scheduleRender(){if(renderQueued)return;renderQueued=true;setTimeout(()=>{renderQueued=false;render()},20)}

  function layerState(d){
    const cat=d.detectedCategory,unknown=(d.check?.unknown||[]).join(' ').toLowerCase(),signals=d.evidence?.signals||[],v=d.vehicle||{},c=d.comparables;
    const has=(rx)=>signals.some(x=>rx.test(String(x.label||'')));
    if(cat==='vehicle')return[
      ['Identity',v.identity?.vin?1:(v.identity?.year&&v.identity?.make&&v.identity?.model?.5:0),'VIN / exact configuration'],
      ['Price',d.price?1:0,'Listing or quoted price'],
      ['Market',c?.ok?1:0,'Comparable market price'],
      ['Running cost',v.fuel?.summary?.annualFuelCost?1:(has(/gasoline|fuel|repair|maintenance/i)?.5:0),'Fuel / operating cost'],
      ['Safety',v.safety?.ok?1:0,'Recall / complaint / rating evidence'],
      ['Personal cost',/insurance|depreciation/.test(unknown)?0:(has(/insurance|depreciation/i)?.5:0),'Insurance / depreciation']
    ];
    if(cat==='property')return[
      ['Property',d.page?.ok||d.input?.location?0.5:0,'Exact property / location'],
      ['Price',d.price?1:0,'Asking or purchase price'],
      ['Market',!/appraisal|comps|comparable/.test(unknown)&&has(/house prices/i)?0.5:0,'Comparable value evidence'],
      ['Financing',has(/mortgage/i)?1:(has(/treasury/i)?.5:0),'Mortgage backdrop'],
      ['Operating',has(/electricity|natural gas/i)?1:0,'Utilities / carrying costs'],
      ['Property costs',has(/insurance/.test?.name||/insurance/i)?0.5:(/insurance|tax|hoa/.test(unknown)?0:0.5),'Tax / insurance / HOA']
    ];
    if(cat==='home')return[
      ['Scope',/scope|full quote/.test(unknown)?0.5:1,'What work is included'],
      ['Price',d.price?1:0,'Quoted price'],
      ['Benchmark',/contractor quotes|comparable/.test(unknown)?0:0.5,'Comparable quote evidence'],
      ['Inputs',signals.some(x=>x.unit==='% YoY')?1:0,'Material / equipment pressure'],
      ['Location',d.input?.location?0.5:0,'Local cost context'],
      ['Exclusions',/permit|electrical|disposal|excluded/.test(unknown)?0:0.5,'Potential missing scope']
    ];
    return[
      ['Item',d.input?.text||d.page?.title?1:0,'What is being bought'],['Price',d.price?1:0,'Price captured'],['Market',/benchmark|comparable/.test(unknown)?0:0.5,'Market benchmark'],['Ongoing cost',signals.length?0.5:0,'Operating burden'],['Risk',unknown.length?0.5:1,'Known constraints'],['Exit',0,'Resale / reversibility']
    ];
  }

  function visibilityMetric(d){const layers=layerState(d),score=Math.round(layers.reduce((s,x)=>s+x[1],0)/layers.length*100);return{score,layers}}

  function svgRing(score){
    const r=44,c=2*Math.PI*r,dash=c*clamp(score,0,100)/100;
    return `<svg class="ei-ring" viewBox="0 0 110 110" role="img" aria-label="Decision visibility ${score} percent"><circle cx="55" cy="55" r="44" class="ei-ring-bg"/><circle cx="55" cy="55" r="44" class="ei-ring-value" stroke-dasharray="${dash.toFixed(1)} ${(c-dash).toFixed(1)}"/><text x="55" y="51" text-anchor="middle" class="ei-ring-number">${score}</text><text x="55" y="68" text-anchor="middle" class="ei-ring-label">VISIBLE</text></svg>`
  }

  function visibilityPanel(d){const m=visibilityMetric(d);return `<div class="ei-viz-grid"><div class="ei-viz-ring-wrap">${svgRing(m.score)}<p><strong>Decision Visibility</strong> measures how much of the decision is actually evidenced right now. It is <b>not</b> a probability that the purchase is good.</p></div><div class="ei-layer-list">${m.layers.map(([name,state,note],i)=>`<button type="button" class="ei-layer ${state===1?'verified':state===.5?'partial':'missing'}" data-layer="${i}"><span>${name}</span><i><b style="width:${state*100}%"></b></i><em>${state===1?'Verified':state===.5?'Partial':'Missing'}</em><small>${note}</small></button>`).join('')}</div></div>`}

  function pressureSignals(d){return (d.evidence?.signals||[]).filter(s=>s.unit==='% YoY'&&Number.isFinite(Number(s.value))).slice(0,6)}
  function pressurePanel(d){const sig=pressureSignals(d);if(!sig.length)return `<div class="ei-viz-empty"><strong>No current cost-pressure series is connected for this decision.</strong><p>ExpenseIntel will not manufacture a chart from unrelated data.</p></div>`;const max=Math.max(5,...sig.map(s=>Math.abs(Number(s.value))));return `<div class="ei-pressure-chart"><div class="ei-pressure-zero"></div>${sig.map((s,i)=>{const v=Number(s.value),w=Math.min(48,Math.abs(v)/max*48),left=v>=0?50:50-w;return `<button type="button" class="ei-pressure-row" data-pressure="${i}"><span>${clean(s.label)}</span><div class="ei-pressure-track"><i style="left:${left}%;width:${w}%"></i><b style="left:50%"></b></div><strong>${v>=0?'+':''}${v.toFixed(1)}%</strong><small>${clean(s.period||'')} · ${clean(s.source||'')}</small></button>`}).join('')}<p class="ei-chart-note">Current year-over-year price pressure from connected sources. These are context signals—not a forecast and not a quote benchmark.</p></div>`}

  function costPathPanel(d){const fuel=d.vehicle?.fuel?.summary?.annualFuelCost,price=Number(d.price)||0;if(d.detectedCategory!=='vehicle'||!fuel||!price)return `<div class="ei-viz-empty"><strong>Known Cost Path is not available for this decision yet.</strong><p>This chart only appears when ExpenseIntel has both a verified price and a connected recurring-cost series. It does not fill gaps with generic assumptions.</p></div>`;const low=Number(fuel.min),mid=Number(fuel.median),high=Number(fuel.max),years=[0,1,2,3,4,5],vals=years.map(y=>({y,low:price+low*y,mid:price+mid*y,high:price+high*y}));const min=price,max=Math.max(...vals.map(x=>x.high)),W=620,H=230,pad={l:64,r:22,t:18,b:38},x=y=>pad.l+(W-pad.l-pad.r)*(y/5),yy=v=>H-pad.b-(H-pad.t-pad.b)*((v-min)/(max-min||1));const line=k=>vals.map((p,i)=>`${i?'L':'M'}${x(p.y).toFixed(1)},${yy(p[k]).toFixed(1)}`).join(' ');const area=`${vals.map((p,i)=>`${i?'L':'M'}${x(p.y).toFixed(1)},${yy(p.high).toFixed(1)}`).join(' ')} ${[...vals].reverse().map(p=>`L${x(p.y).toFixed(1)},${yy(p.low).toFixed(1)}`).join(' ')} Z`;return `<div class="ei-cost-path"><div class="ei-cost-kpis"><div><span>Purchase</span><strong>${money(price)}</strong></div><div><span>EPA/DOE fuel / yr</span><strong>${money(mid)}</strong></div><div><span>Known 5-year range</span><strong>${money(price+low*5)}–${money(price+high*5)}</strong></div></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Five year known vehicle cost path"><path d="${area}" class="ei-cost-area"/><path d="${line('mid')}" class="ei-cost-line"/>${years.map(y=>`<line x1="${x(y)}" y1="${pad.t}" x2="${x(y)}" y2="${H-pad.b}" class="ei-cost-grid"/><text x="${x(y)}" y="${H-13}" text-anchor="middle">${y===0?'Today':`Yr ${y}`}</text>`).join('')}${vals.map(p=>`<circle cx="${x(p.y)}" cy="${yy(p.mid)}" r="5" data-cost-year="${p.y}" tabindex="0"><title>Year ${p.y}: ${money(p.mid)}</title></circle>`).join('')}</svg><p class="ei-chart-note"><strong>Known Cost Path</strong> = purchase price + official EPA/DOE standard-use fuel estimate. Financing, insurance, maintenance, taxes and depreciation are deliberately excluded until ExpenseIntel has real inputs for them.</p></div>`}
  }

  function marketPanel(d){const c=d.comparables,p=Number(d.price)||0;if(!c?.ok||!p||!c.median)return `<div class="ei-viz-empty"><strong>Market Distance is waiting on real comparable-price data.</strong><p>ExpenseIntel will show this metric only when the comparable engine has actual matched listings. Macro inflation data does not count.</p></div>`;const lo=Number(c.p25||c.median*.9),hi=Number(c.p75||c.median*1.1),span=Math.max(1,hi-lo),min=lo-span*.6,max=hi+span*.6,pos=v=>clamp((v-min)/(max-min)*100,0,100),delta=(p-c.median)/c.median*100;return `<div class="ei-market-distance"><div class="ei-market-head"><div><span>Market Distance</span><strong>${delta>=0?'+':''}${delta.toFixed(1)}%</strong><small>vs active comparable median</small></div><div><span>Comparable median</span><strong>${money(c.median)}</strong><small>${c.numFound||0} active matches</small></div></div><div class="ei-market-rail"><i class="ei-market-band" style="left:${pos(lo)}%;width:${Math.max(2,pos(hi)-pos(lo))}%"></i><b class="ei-market-median" style="left:${pos(c.median)}%"><em>MEDIAN</em></b><b class="ei-market-you" style="left:${pos(p)}%"><em>YOU · ${money(p)}</em></b></div><div class="ei-market-labels"><span>${money(min)}</span><span>Middle market ${money(lo)}–${money(hi)}</span><span>${money(max)}</span></div><p class="ei-chart-note">Advertised comparable listings, not completed transactions. Exact trim, mileage, condition and fees can still change what a fair deal looks like.</p></div>`}
  }

  function mount(d){const shell=$('[data-check-output] .shell');if(!shell)return;let section=$('.ei-decision-lab',shell);if(!section){section=document.createElement('section');section.className='ei-decision-lab';const anchor=$('.ei-inline-question',shell)||$('.ei-everyday-summary',shell)||$('.check-output-top',shell);anchor?.insertAdjacentElement('afterend',section)}if(!section)return;section.innerHTML=`<div class="ei-lab-head"><div><span>ExpenseIntel Metrics</span><h3>See the decision, not just the numbers.</h3><p>Interactive measures built only from evidence already connected to this check.</p></div><div class="ei-lab-tabs" role="tablist"><button type="button" class="active" data-viz="visibility">Visibility</button><button type="button" data-viz="cost">Cost path</button><button type="button" data-viz="pressure">Pressure</button><button type="button" data-viz="market">Market</button></div></div><div class="ei-viz-stage" data-viz-stage></div>`;const stage=$('[data-viz-stage]',section),tabs=$$('[data-viz]',section);const draw=type=>{tabs.forEach(b=>b.classList.toggle('active',b.dataset.viz===type));stage.classList.remove('is-changing');void stage.offsetWidth;stage.classList.add('is-changing');stage.innerHTML=type==='cost'?costPathPanel(d):type==='pressure'?pressurePanel(d):type==='market'?marketPanel(d):visibilityPanel(d)};tabs.forEach(b=>b.addEventListener('click',()=>draw(b.dataset.viz)));draw(d.comparables?.ok?'market':'visibility')}

  function render(){if(!lastData)return;const summary=$('.ei-everyday-summary');if(!summary){setTimeout(scheduleRender,60);return}mount(lastData)}

  captureCheckFetch();
  const out=$('[data-check-output]');if(out){const obs=new MutationObserver(()=>{if(lastData)scheduleRender()});obs.observe(out,{subtree:true,childList:true})}
})();