(()=>{
  const E=window.EIV17;if(!E)return;
  const {$,esc,money,clean}=E;
  const jump=(r,selector)=>{const el=$(selector,r)||$(selector);if(!el)return false;if(el.tagName==='BUTTON')el.click();else el.scrollIntoView({behavior:'smooth',block:'center'});return true};
  function stepsFor(r){
    const snap=E.snapshot(r),unknowns=E.unknowns(r),lever=clean(E.strongestLever(r)),topUnknown=unknowns[0]||'the highest-impact modeled input',save=Math.max(0,snap.savings||0),decision=snap.decision;
    if(decision==='avoid')return[
      ['Pause the commitment','Do not add irreversible spend until the stop condition is resolved.','pause'],
      ['Resolve the blocking fact',`Replace ${topUnknown} with a written quote, source, inspection or comparable.`, 'proof'],
      ['Re-run the same Check','Only reconsider the decision after the blocking input changes.','rerun']
    ];
    if(decision==='negotiate')return[
      ['Open Optimize & Save',save>0?`ExpenseIntel currently identifies about ${money(save)} of modeled improvement.`:'Translate the largest sensitivity into a concrete target.','optimize'],
      ['Negotiate the biggest lever',`Lead with ${lever}; do not let a lower payment hide a worse price, term or upfront cash requirement.`,'negotiate'],
      ['Record the result','Save the final price or terms so Decision Delta can measure what actually changed.','outcome']
    ];
    if(decision==='proceed')return[
      ['Confirm final terms','Make sure the signed price, rate, recurring burden and timing still match the analyzed scenario.','proof'],
      ['Protect the remaining unknown',`Verify ${topUnknown} before the commitment becomes difficult to reverse.`,'proof'],
      ['Record the outcome','Capture the actual amount and status so the decision history becomes useful evidence.','outcome']
    ];
    return[
      ['Resolve the largest unknown',`Replace ${topUnknown} before trusting the current recommendation as settled.`,'proof'],
      ['Run Optimize & Save',save>0?`Test the ${money(save)} modeled improvement path against terms you can actually obtain.`:'Use the sensitivity view to identify a defensible improvement target.','optimize'],
      ['Re-run after proof','The next Check should differ because evidence changed—not because the model was merely refreshed.','rerun']
    ];
  }
  function actionButton(r,kind){
    if(kind==='optimize')return jump(r,'[data-v16-open],.ei-v16-opt-card button,.ei-v12-optimize button,#eiV16Optimizer');
    if(kind==='negotiate')return jump(r,'.ei-v17-neg-btn,[data-v17-neg-open],.ei-v17-negotiation');
    if(kind==='outcome')return jump(r,'.ei-v17-outcome-mini,[data-v17-outcome-open],.ei-v17-outcome');
    if(kind==='proof')return jump(r,'.ei-v17-proofbar,.ei-v16-proof,.ei-v12-missing');
    if(kind==='rerun'){window.scrollTo({top:0,behavior:'smooth'});return true}
    return false;
  }
  function render(r){
    const anchor=$('.ei-v17-endpoint',r)||$('.ei-v12-hero',r);if(!anchor)return;
    let host=$('.ei-v19-action-loop',r);if(!host){host=document.createElement('section');host.className='ei-v19-action-loop';anchor.insertAdjacentElement('afterend',host)}
    const snap=E.snapshot(r),steps=stepsFor(r),unknownCount=E.unknowns(r).length;
    host.innerHTML=`<div class="ei-v19-head"><div><span>DECISION → ACTION</span><strong>Do the next three things, in order.</strong></div><small>${unknownCount?`${unknownCount} material unknown${unknownCount===1?'':'s'} remain`:'No major unknowns surfaced'}</small></div><div class="ei-v19-steps">${steps.map((s,i)=>`<article><i>0${i+1}</i><div><b>${esc(s[0])}</b><p>${esc(s[1])}</p></div><button type="button" data-ei19-action="${esc(s[2])}">OPEN →</button></article>`).join('')}</div><div class="ei-v19-foot"><span>Current call: <b>${esc(snap.decisionText)}</b></span><span>Action order updates when the underlying decision changes.</span></div>`;
    host.querySelectorAll('[data-ei19-action]').forEach(btn=>btn.addEventListener('click',()=>actionButton(r,btn.dataset.ei19Action)));
  }
  E.register(render);
})();