(()=>{
  const E=window.EIV17;if(!E)return;
  function classify(r,s,shock){
    const stressed=s.current*(1+shock),ref=s.benchmark||s.current;
    if(!ref||!s.current)return{label:'INSUFFICIENT',note:'Need a usable current amount and reference.'};
    const gap=(stressed-ref)/ref;
    if(gap<=0.03)return{label:'HOLDS',note:'Still at or near the current reference under this price shock.'};
    if(gap<=0.12)return{label:'FRAGILE',note:'The decision becomes materially more expensive than the current reference.'};
    return{label:'BREAKS',note:'Price exposure moves well beyond the current reference; re-check before committing.'};
  }
  function render(r){
    const s=E.snapshot(r);if(!(s.current>0))return;
    let host=document.querySelector('[data-ei-v21-stress]');if(!host){host=document.createElement('section');host.dataset.eiV21Stress='1';host.className='ei-v21-stress';(document.querySelector('[data-ei-v20-explain]')||r).insertAdjacentElement('afterend',host)}
    const shocks=[0,.05,.10,.15].map(x=>({shock:x,...classify(r,s,x)}));
    const unknowns=E.unknowns(r).length,confidence=E.confidence(r);
    const robust=shocks.filter(x=>x.label==='HOLDS').length;
    const state=robust===4&&unknowns===0?'ROBUST':robust>=2?'CONDITIONAL':'FRAGILE';
    host.innerHTML=`<div class="ei-v21-head"><div><span>DECISION STRESS TEST</span><strong>${state}</strong></div><small>price-reference robustness · not a forecast</small></div><p>Tests whether the current decision remains near its best available reference if the commitment cost rises. This does not simulate every tax, financing, maintenance or project dependency.</p><div class="ei-v21-grid">${shocks.map(x=>`<article data-state="${x.label.toLowerCase()}"><span>${x.shock?`+${Math.round(x.shock*100)}% cost`:'BASE'}</span><b>${x.label}</b><small>${E.esc(x.note)}</small></article>`).join('')}</div><div class="ei-v21-foot"><span>${unknowns} unresolved input${unknowns===1?'':'s'}</span><span>${confidence==null?'Confidence unavailable':`Decision confidence ${confidence}/100`}</span><span>Verified comparables outrank this stress model</span></div>`;
  }
  E.register(render);
})();