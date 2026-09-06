(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  function err(msg=''){const e=$('[data-xray-error]');e.textContent=msg;e.classList.toggle('show',!!msg)}
  async function fetchJson(url,options={}){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Object.assign(new Error(d.error||'Request failed.'),{data:d,status:r.status});return d}
  function cell(text,cls=''){const td=document.createElement('td');td.textContent=text;td.className=cls;return td}
  function render(data,caseModel){
    $('[data-xr-result]').classList.add('show');
    const s=data.summary||{};
    $('[data-xr-recurring]').textContent=money(s.detectedRecurringAnnual||0);
    $('[data-xr-onetime]').textContent=money(s.detectedOneTime||0);
    $('[data-xr-modeled]').textContent=caseModel?.total?money(caseModel.total):'Not modeled';
    $('[data-xr-gap]').textContent=s.realityGap==null?'—':`${s.realityGap>=0?'+':''}${money(s.realityGap)}`;
    $('[data-xr-summary]').textContent=caseModel?.total
      ? `${s.detectedLineItems} priced lines were detected. The recurring total is ${s.realityGap==null?'not directly comparable':s.realityGap>=0?money(Math.abs(s.realityGap))+' above':money(Math.abs(s.realityGap))+' below'} the current ExpenseIntel annual model. Treat the difference as a diligence prompt, not proof of over- or under-pricing.`
      : `${s.detectedLineItems} priced lines were detected. Add a resolvable U.S. address to compare them with a location-cost model.`;

    const body=$('[data-xr-items]');body.innerHTML='';
    (data.items||[]).forEach(item=>{
      const tr=document.createElement('tr');
      tr.appendChild(cell(item.line));
      tr.appendChild(cell(item.categoryLabel));
      tr.appendChild(cell(item.cadence));
      tr.appendChild(cell(item.annualized?money(item.annualized):item.oneTime?money(item.oneTime)+' one-time':'—','num'));
      tr.appendChild(cell(item.modeledBaseline?money(item.modeledBaseline):'—','num'));
      const variance=item.variance==null?'—':`${item.variance>=0?'+':''}${Math.round(item.variance*100)}%`;
      tr.appendChild(cell(variance,'num'));
      body.appendChild(tr);
    });
    if(!body.children.length){const tr=document.createElement('tr');const td=cell('No clear priced line items were detected. Keep dollar signs, amounts and cadence text in the pasted material.');td.colSpan=6;tr.appendChild(td);body.appendChild(tr)}

    const missing=$('[data-xr-missing]');missing.innerHTML='';
    (data.missing||[]).forEach(m=>{const row=document.createElement('div');row.className='check-row';row.innerHTML='<span style="font:800 11px var(--mono)">?</span><label></label><span></span>';row.querySelector('label').textContent=m.label;row.lastElementChild.textContent=m.modeledBaseline?money(m.modeledBaseline):'verify';missing.appendChild(row)});
    if(!missing.children.length){const row=document.createElement('div');row.className='check-row';row.innerHTML='<span>✓</span><label>Core modeled layers appear in the pasted text</label><span>review scope</span>';missing.appendChild(row)}
    $('[data-xr-missing-count]').textContent=String(s.missingLayers||0);
    $('[data-xr-clause-count]').textContent=String(s.escalationClauses||0);
    $('[data-xr-flag-count]').textContent=String((data.flags||[]).length);

    const flags=$('[data-xr-flags]');flags.innerHTML='';
    (data.clauses||[]).forEach(c=>{const el=document.createElement('article');el.className='action-item';el.innerHTML='<div><h4>Escalation language detected</h4><p></p></div><strong></strong>';el.querySelector('p').textContent=c.line;el.querySelector('strong').textContent=`${c.percent}%`;flags.appendChild(el)});
    (data.flags||[]).forEach(f=>{const el=document.createElement('article');el.className='action-item';el.innerHTML='<div><h4></h4><p></p></div><strong></strong>';el.querySelector('h4').textContent=f.type==='high'?'Above-model line':'Below-model line';el.querySelector('p').textContent=f.message;el.querySelector('strong').textContent=f.category;flags.appendChild(el)});
    if(!flags.children.length){const el=document.createElement('article');el.className='action-item';el.innerHTML='<div><h4>No material comparison flags detected</h4><p>The parser did not find a large like-for-like variance or percentage escalation clause. That does not establish completeness; review missing layers and scope.</p></div><strong>REVIEW</strong>';flags.appendChild(el)}
    $('[data-xr-result]').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function run(e){
    e.preventDefault();err('');
    const address=$('#xr-address').value.trim(),use=$('#xr-use').value,sqft=Number($('#xr-sqft').value),text=$('#xr-text').value.trim();
    if(text.length<20){err('Paste at least a few lines from the bill, quote, lease schedule, budget, or listing.');return}
    if(!sqft||sqft<300){err('Enter a floor area of at least 300 ft².');return}
    const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;
    try{
      let caseModel=null;
      if(address.length>=6){
        try{const c=await fetchJson(`/api/case?address=${encodeURIComponent(address)}&use=${encodeURIComponent(use)}&sqft=${encodeURIComponent(sqft)}`);caseModel=c.case||null}
        catch(ex){if(ex.status===409)throw new Error('That address has multiple matches. Use a more complete street address, city, state and ZIP.');throw ex}
      }
      const d=await fetchJson('/api/audit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({text,case:caseModel})});
      render(d,caseModel);
    }catch(ex){err(ex.message||'X-Ray could not inspect this material.')}finally{btn.disabled=false}
  }
  document.addEventListener('DOMContentLoaded',()=>{$('[data-xray-form]')?.addEventListener('submit',run)});
})();