(()=>{
  const E=window.EIV17;if(!E)return;
  const STORE='ei_calibration_memory_v20';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch(_e){return[]}};
  const write=x=>{try{localStorage.setItem(STORE,JSON.stringify(x.slice(-120)))}catch(_e){}};
  const pct=(n,d)=>d>0?Math.round((n/d)*100):0;
  function factorRows(r,s){
    const rows=[];
    if(s.current>0&&s.benchmark>0){const gap=((s.current-s.benchmark)/s.benchmark)*100;rows.push({k:'Price vs reference',v:`${gap>=0?'+':''}${gap.toFixed(1)}%`,note:gap>0?'Current commitment is above the best available reference.':'Current commitment is at or below the best available reference.',state:'modeled'});}
    if(s.savings>0)rows.push({k:'Recoverable exposure',v:E.money(s.savings),note:`Largest modeled improvement path is ${E.strongestLever(r)}.`,state:'modeled'});
    const u=E.unknowns(r);rows.push({k:'Unresolved inputs',v:String(u.length),note:u.length?u.slice(0,2).join(' · '):'No major unresolved inputs detected in the current passport.',state:u.length?'unknown':'user'});
    const c=E.confidence(r);if(c!=null)rows.push({k:'Decision confidence',v:`${c}/100`,note:'Confidence reflects evidence coverage and model completeness, not certainty of outcome.',state:'modeled'});
    const userControls=E.controls(r).filter(x=>x.raw>0).length;rows.push({k:'Decision inputs',v:String(userControls),note:'Active user/model controls currently shaping this decision.',state:'user'});
    return rows.slice(0,5);
  }
  function saveCalibration(s){
    if(!s?.key)return;
    const xs=read(),i=xs.findIndex(x=>x.key===s.key),row={key:s.key,category:s.category,at:Date.now(),current:s.current,benchmark:s.benchmark,improved:s.improved,savings:s.savings,confidence:s.confidence,decision:s.decision};
    if(i>=0)xs[i]=row;else xs.push(row);write(xs);
  }
  function historySummary(s){
    const xs=read().filter(x=>x.category===s.category&&x.key!==s.key&&x.current>0);
    if(!xs.length)return 'Calibration memory starts with this decision. Future checks in this category can be compared against prior modeled gaps and outcomes.';
    const avgGap=xs.filter(x=>x.benchmark>0).map(x=>(x.current-x.benchmark)/x.benchmark).filter(Number.isFinite);
    const avgSave=xs.map(x=>x.current>0?x.savings/x.current:0).filter(Number.isFinite);
    const parts=[`${xs.length} prior ${s.category} decision${xs.length===1?'':'s'} stored locally`];
    if(avgGap.length)parts.push(`avg reference gap ${((avgGap.reduce((a,b)=>a+b,0)/avgGap.length)*100).toFixed(1)}%`);
    if(avgSave.length)parts.push(`avg modeled recoverable exposure ${pct(avgSave.reduce((a,b)=>a+b,0)/avgSave.length,1)}%`);
    return parts.join(' · ')+'. Local calibration memory never turns modeled values into verified outcomes.';
  }
  function render(r){
    const s=E.snapshot(r);saveCalibration(s);
    let host=document.querySelector('[data-ei-v20-explain]');
    if(!host){host=document.createElement('section');host.dataset.eiV20Explain='1';host.className='ei-v20-explain';const anchor=document.querySelector('[data-ei-evidence-pack],.ei-v19-evidence,.ei-v17-endpoint')||r;anchor.insertAdjacentElement('afterend',host);}
    const rows=factorRows(r,s);
    host.innerHTML=`<div class="ei-v20-head"><div><span>WHY THIS ANSWER</span><strong>${E.esc(E.decisionText(r))}</strong></div><small>${E.esc(s.category)} · ${E.esc(s.decision)}</small></div><p class="ei-v20-copy">ExpenseIntel separates the numbers that move the recommendation from the evidence that merely adds context.</p><div class="ei-v20-grid">${rows.map(x=>`<article data-state="${x.state}"><span>${E.esc(x.k)}</span><b>${E.esc(x.v)}</b><small>${E.esc(x.note)}</small></article>`).join('')}</div><div class="ei-v20-cal"><span>CALIBRATION MEMORY</span><p>${E.esc(historySummary(s))}</p></div><div class="ei-v20-rule"><b>RELEASE RULE</b><span>A modeled reference can influence the recommendation, but only a verified comparable, written quote, public record, or user-confirmed outcome can upgrade that fact to evidence.</span></div>`;
  }
  E.register(render);
})();