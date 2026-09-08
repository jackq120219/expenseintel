(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ACTIVE='ei_active_decision';
  const BASE={payment:619,term:36,miles:12000,due:0,period:'Q1 2026'};
  let lastData=null,queued=false,lastScenarioSig='';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)):'—';
  const readActive=()=>{try{return JSON.parse(localStorage.getItem(ACTIVE)||'null')}catch(_e){return null}};
  const sourceText=()=>{const a=readActive()||{};return [a.text,a.title,$('#check-text')?.value,lastData?.input?.text,lastData?.page?.title].filter(Boolean).join(' ')};
  const isLease=()=>/\bleas(?:e|ed|ing)\b/i.test(sourceText());
  const parseNum=s=>{const n=Number(String(s||'').replace(/[$,\s]/g,''));return Number.isFinite(n)?n:null};
  const take=(rx,text)=>{const m=String(text||'').match(rx);return m?parseNum(m[1]):null};
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function leaseTerms(){
    const t=sourceText();
    const payment=take(/\$\s*([\d,.]+)\s*(?:\/\s*(?:mo|month)|a\s+month|per\s+month|monthly)\b/i,t)??take(/(?:monthly\s+(?:lease\s+)?payment|lease\s+payment|payment)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+)/i,t);
    const term=take(/\b(\d{2})\s*(?:month|mo)s?\b/i,t);
    const due=take(/\$?\s*([\d,.]+)\s*(?:due\s+at\s+signing|at\s+signing|drive[- ]?off)/i,t)??take(/(?:due\s+at\s+signing|drive[- ]?off)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+)/i,t);
    const miles=take(/\b([\d,.]+)\s*(?:miles|mi)\s*(?:\/|per\s+|a\s+)?(?:year|yr|annually|annual)\b/i,t);
    return{payment:payment??BASE.payment,term:term??BASE.term,due:due??BASE.due,miles:miles??BASE.miles,userPayment:payment!=null,userTerm:term!=null,userDue:due!=null,userMiles:miles!=null};
  }

  function identity(){
    const id=lastData?.vehicle?.identity||{},a=readActive()||{};
    return{year:id.year||'',make:id.make||'',model:id.model||'',trim:id.trim||'',label:[id.year,id.make,id.model,id.trim].filter(Boolean).join(' ')||clean(a.title||a.text||'Vehicle')};
  }

  function math(v){
    const payment=Math.max(0,Number(v.payment)||0),term=Math.max(1,Math.round(Number(v.term)||1)),due=Math.max(0,Number(v.due)||0),miles=Math.max(1000,Number(v.miles)||1000);
    const paymentCash=payment*term+due,standardCash=BASE.payment*term,effective=payment+due/term,totalMiles=miles*(term/12),costPerMile=paymentCash/Math.max(1,totalMiles),fuel=lastData?.vehicle?.fuel?.summary?.annualFuelCost?.median;
    const fuelAnnual=Number.isFinite(Number(fuel))?Number(fuel):null,fuelCash=fuelAnnual!=null?fuelAnnual*(term/12):0;
    return{...v,payment,term,due,miles,paymentCash,standardCash,effective,totalMiles,costPerMile,fuelAnnual,fuelCash,totalKnown:paymentCash+fuelCash,delta:paymentCash-standardCash};
  }

  function baseline(){return math(leaseTerms())}

  function modelCoverage(){
    if(!lastData?.detectedCategory)return 0;
    let score=60;
    const a=readActive()||{},id=identity(),t=isLease()?leaseTerms():null;
    if(Number(lastData.price)||Number(a.price))score+=6;
    if(clean(lastData?.input?.location||a.location))score+=4;
    if(Number(lastData?.evidence?.sourceCount)>=2)score+=4;
    if(lastData?.comparables?.ok)score+=6;
    if(lastData.detectedCategory==='vehicle'){
      if(id.make)score+=3;if(id.model)score+=7;if(id.trim)score+=3;
      if(lastData?.vehicle?.fuel?.summary?.annualFuelCost)score+=4;if(lastData?.vehicle?.safety?.ok)score+=3;
      if(t){if(t.userPayment)score+=4;if(t.userTerm)score+=2;if(t.userDue)score+=2;if(t.userMiles)score+=2;}
    }
    return Math.max(60,Math.min(100,Math.round(score)));
  }

  function injectStyle(){
    if($('#ei-model-first-style'))return;
    const s=document.createElement('style');s.id='ei-model-first-style';s.textContent=`
      .ei-modeled-badge{display:inline-block;font:700 9px/1.1 var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;border:1px solid currentColor;padding:4px 6px;margin-left:7px;vertical-align:middle;opacity:.72}
      .ei-model-coverage-note{font:600 9px/1.35 var(--mono,monospace);letter-spacing:.04em;text-transform:uppercase;opacity:.62;margin-top:6px}
      .ei-lease-scenario{border-top:3px solid var(--acid,#9cff00);background:rgba(243,240,232,.78)}
      .ei-scenario-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;padding:20px}.ei-scenario-head span,.ei-scenario-kpis span,.ei-slider-row label>span,.ei-chart-title span,.ei-car-ask span{display:block;font:700 9px/1.2 var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;opacity:.62}.ei-scenario-head strong{display:block;font:700 25px/1.05 var(--serif,Georgia,serif);margin-top:5px}.ei-scenario-head p{max-width:560px;margin:0;font-size:12px;line-height:1.5;opacity:.72}
      .ei-car-ask{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;padding:15px 20px;border-top:1px solid rgba(20,25,18,.16);background:rgba(156,255,0,.05)}.ei-car-ask strong{display:block;font-size:14px;margin:5px 0}.ei-car-ask small{display:block;opacity:.65;font-size:10px}.ei-car-ask input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(20,25,18,.32);background:rgba(255,255,255,.5);font:600 14px/1.2 var(--sans,Arial,sans-serif)}.ei-car-ask button{min-height:40px;padding:0 14px;border:0;background:#10150f;color:#fff;font:700 9px/1 var(--mono,monospace);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
      .ei-scenario-controls{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;border-top:1px solid rgba(20,25,18,.16);border-bottom:1px solid rgba(20,25,18,.16)}.ei-slider-row{padding:17px 18px;border-right:1px solid rgba(20,25,18,.14);min-width:0}.ei-slider-row:last-child{border-right:0}.ei-slider-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.ei-slider-top output{font:700 17px/1 var(--sans,Arial,sans-serif);white-space:nowrap}.ei-slider-row input[type=range]{width:100%;margin:14px 0 5px;accent-color:#10150f}.ei-slider-row small{display:block;font-size:10px;line-height:1.35;opacity:.62}
      .ei-scenario-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid rgba(20,25,18,.16)}.ei-scenario-kpis>div{padding:15px 18px;border-right:1px solid rgba(20,25,18,.14)}.ei-scenario-kpis>div:last-child{border-right:0}.ei-scenario-kpis strong{display:block;font-size:20px;line-height:1.05;margin-top:6px}.ei-scenario-kpis small{display:block;margin-top:6px;font-size:10px;line-height:1.35;opacity:.62}
      .ei-scenario-charts{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid rgba(20,25,18,.16)}.ei-scenario-chart{padding:17px 18px;min-width:0}.ei-scenario-chart+.ei-scenario-chart{border-left:1px solid rgba(20,25,18,.14)}.ei-chart-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}.ei-chart-title strong{font-size:14px}.ei-chart-title small{font-size:9px;opacity:.58;text-align:right}.ei-scenario-chart svg{display:block;width:100%;height:auto;overflow:visible}.ei-chart-grid{stroke:rgba(20,25,18,.10);stroke-width:1}.ei-chart-user{fill:none;stroke:#10150f;stroke-width:2.6}.ei-chart-standard{fill:none;stroke:rgba(20,25,18,.38);stroke-width:2;stroke-dasharray:5 5}.ei-chart-axis{font:9px var(--mono,monospace);fill:rgba(20,25,18,.58)}.ei-chart-dot{fill:#10150f}.ei-chart-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font:600 9px/1.2 var(--mono,monospace);letter-spacing:.04em;text-transform:uppercase;opacity:.68}.ei-chart-legend i{display:inline-block;width:18px;border-top:2px solid #10150f;margin-right:6px;vertical-align:middle}.ei-chart-legend .standard i{border-top-style:dashed;opacity:.45}
      .ei-scenario-actions{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 18px}.ei-scenario-actions p{margin:0;max-width:670px;font-size:10px;line-height:1.5;opacity:.63}.ei-scenario-buttons{display:flex;gap:8px;flex-wrap:wrap}.ei-scenario-buttons button{padding:10px 12px;border:1px solid rgba(20,25,18,.4);background:transparent;font:700 9px/1 var(--mono,monospace);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.ei-scenario-buttons button.primary{background:#10150f;color:#fff;border-color:#10150f}
      @media(max-width:900px){.ei-scenario-head{display:block}.ei-scenario-head p{margin-top:10px}.ei-car-ask{grid-template-columns:1fr}.ei-scenario-controls{grid-template-columns:1fr 1fr}.ei-slider-row:nth-child(2){border-right:0}.ei-slider-row:nth-child(-n+2){border-bottom:1px solid rgba(20,25,18,.14)}.ei-scenario-kpis{grid-template-columns:1fr 1fr}.ei-scenario-charts{grid-template-columns:1fr}.ei-scenario-chart+.ei-scenario-chart{border-left:0;border-top:1px solid rgba(20,25,18,.14)}}
      @media(max-width:560px){.ei-scenario-controls,.ei-scenario-kpis{grid-template-columns:1fr}.ei-slider-row,.ei-scenario-kpis>div{border-right:0;border-bottom:1px solid rgba(20,25,18,.14)}.ei-scenario-actions{display:block}.ei-scenario-buttons{margin-top:10px}}
    `;document.head.appendChild(s);
  }

  function sampledMonths(term){
    const step=term<=24?3:term<=42?6:12,arr=[0];for(let m=step;m<term;m+=step)arr.push(m);if(arr[arr.length-1]!==term)arr.push(term);return arr;
  }

  function lineChart(v,type){
    const W=560,H=205,p={l:54,r:14,t:16,b:32},months=sampledMonths(v.term),points=months.map(m=>{
      if(type==='monthly'){
        const user=m===0?v.payment+v.due/Math.max(1,v.term):v.payment+v.due/Math.max(1,m),standard=BASE.payment;return{m,user,standard};
      }
      return{m,user:v.due+v.payment*m,standard:BASE.payment*m};
    }),vals=points.flatMap(x=>[x.user,x.standard]),min=type==='monthly'?Math.max(0,Math.min(...vals)*.86):0,max=Math.max(1,...vals)*1.08,x=m=>p.l+(W-p.l-p.r)*(m/Math.max(1,v.term)),y=n=>H-p.b-(H-p.t-p.b)*((n-min)/(max-min||1)),path=k=>points.map((q,i)=>`${i?'L':'M'}${x(q.m).toFixed(1)},${y(q[k]).toFixed(1)}`).join(' '),ticks=[0,.25,.5,.75,1].map(z=>min+(max-min)*z),xTicks=[0,Math.round(v.term/3),Math.round(v.term*2/3),v.term];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${type==='monthly'?'Effective monthly lease burden over time':'Cumulative lease cost over time'}">${ticks.map(t=>`<line x1="${p.l}" y1="${y(t)}" x2="${W-p.r}" y2="${y(t)}" class="ei-chart-grid"/><text x="${p.l-7}" y="${y(t)+3}" text-anchor="end" class="ei-chart-axis">${money(t)}</text>`).join('')}${xTicks.map(m=>`<text x="${x(m)}" y="${H-9}" text-anchor="middle" class="ei-chart-axis">${m} mo</text>`).join('')}<path d="${path('standard')}" class="ei-chart-standard"/><path d="${path('user')}" class="ei-chart-user"/>${points.map(q=>`<circle cx="${x(q.m)}" cy="${y(q.user)}" r="3" class="ei-chart-dot"><title>Month ${q.m}: ${money(q.user)}</title></circle>`).join('')}</svg>`;
  }

  function scenarioHTML(b){
    const id=identity(),coverage=modelCoverage(),needsModel=lastData?.detectedCategory==='vehicle'&&!id.model,modelLabel=id.model?[id.model,id.trim].filter(Boolean).join(' '):'';
    return `<div class="ei-scenario-head"><div><span>Live lease model</span><strong>Alter the deal and watch the cost move.</strong><div class="ei-model-coverage-note">Model coverage ${coverage}/100 · evidence confidence remains separate</div></div><p>ExpenseIntel starts with a complete planning baseline, then lets you overwrite it. The charts compare your scenario with the ${money(BASE.payment)}/mo U.S. lease-payment baseline at the same term.</p></div>${needsModel?`<div class="ei-car-ask"><div><span>First refinement</span><strong>Which ${esc(id.make||'vehicle')} is it?</strong><small>The model/trim changes fuel, safety, MSRP and comparable-market matching. ExpenseIntel will keep the baseline running while you answer.</small><input data-s-model placeholder="e.g. Macan S, Cayenne, 911 Carrera"></div><button type="button" data-s-model-apply>Use this car →</button></div>`:''}<div class="ei-scenario-controls"><div class="ei-slider-row"><label><div class="ei-slider-top"><span>Monthly payment</span><output data-o-payment>${money(b.payment)}/mo</output></div><input data-s-payment type="range" min="200" max="5000" step="25" value="${b.payment}"><small>${b.userPayment?'Using your entered payment.':'Modeled from the national lease-payment baseline until corrected.'}</small></label></div><div class="ei-slider-row"><label><div class="ei-slider-top"><span>Cash due at signing</span><output data-o-due>${money(b.due)}</output></div><input data-s-due type="range" min="0" max="20000" step="250" value="${b.due}"><small>Move this to test drive-off / cap reduction without hiding it inside the monthly payment.</small></label></div><div class="ei-slider-row"><label><div class="ei-slider-top"><span>Lease term</span><output data-o-term>${b.term} mo</output></div><input data-s-term type="range" min="12" max="60" step="1" value="${b.term}"><small>Changing the term immediately rebuilds cumulative and effective monthly cost.</small></label></div><div class="ei-slider-row"><label><div class="ei-slider-top"><span>Miles per year</span><output data-o-miles>${b.miles.toLocaleString()}</output></div><input data-s-miles type="range" min="5000" max="25000" step="500" value="${b.miles}"><small>Used for allowed-mile economics; excess-mile charges stay separate until the contract supplies them.</small></label></div></div><div class="ei-scenario-kpis"><div><span>Total lease cash</span><strong data-k-total>${money(b.paymentCash)}</strong><small data-k-total-note>${b.term} months of payments + cash at signing</small></div><div><span>Effective monthly cost</span><strong data-k-effective>${money(b.effective)}/mo</strong><small>Monthly payment after spreading signing cash across the term</small></div><div><span>Cost / allowed mile</span><strong data-k-mile>$${b.costPerMile.toFixed(2)}</strong><small data-k-mile-note>${Math.round(b.totalMiles).toLocaleString()} total allowed miles</small></div><div><span>Vs standard baseline</span><strong data-k-delta>${b.delta>=0?'+':''}${money(b.delta)}</strong><small data-k-delta-note>${money(BASE.payment)}/mo × same term</small></div></div><div class="ei-scenario-charts"><div class="ei-scenario-chart"><div class="ei-chart-title"><div><span>Cost over time</span><strong>Cumulative lease cash</strong></div><small>Payment-only comparison</small></div><div data-chart-total>${lineChart(b,'total')}</div><div class="ei-chart-legend"><span><i></i>Your scenario</span><span class="standard"><i></i>Standard baseline</span></div></div><div class="ei-scenario-chart"><div class="ei-chart-title"><div><span>Monthly cost over time</span><strong>Effective monthly burden</strong></div><small>Signing cash amortized over elapsed months</small></div><div data-chart-monthly>${lineChart(b,'monthly')}</div><div class="ei-chart-legend"><span><i></i>Your scenario</span><span class="standard"><i></i>${money(BASE.payment)}/mo baseline</span></div></div></div><div class="ei-scenario-actions"><p data-s-note>${b.fuelAnnual!=null?`Exact-enough vehicle match also supplies about ${money(b.fuelAnnual)}/yr EPA/DOE fuel context. The headline lease chart remains payment-only so its national comparison is apples-to-apples.`:'Give ExpenseIntel the exact model/trim and it will attempt to add EPA/DOE fuel and NHTSA safety data automatically. Insurance, taxes, wear, residual/buyout and disposition fees remain explicit rather than silently guessed.'}</p><div class="ei-scenario-buttons"><button type="button" data-s-reset>Reset model</button><button type="button" class="primary" data-s-apply>Use these numbers in my check →</button></div></div>`;
  }

  function currentScenario(sec){return math({payment:parseNum($('[data-s-payment]',sec)?.value)??BASE.payment,due:parseNum($('[data-s-due]',sec)?.value)??0,term:parseNum($('[data-s-term]',sec)?.value)??BASE.term,miles:parseNum($('[data-s-miles]',sec)?.value)??BASE.miles,userPayment:true,userDue:true,userTerm:true,userMiles:true});}

  function redrawScenario(sec){
    const b=currentScenario(sec);setText('[data-o-payment]',`${money(b.payment)}/mo`);setText('[data-o-due]',money(b.due));setText('[data-o-term]',`${b.term} mo`);setText('[data-o-miles]',b.miles.toLocaleString());setText('[data-k-total]',money(b.paymentCash));setText('[data-k-total-note]',`${b.term} months of payments + cash at signing`);setText('[data-k-effective]',`${money(b.effective)}/mo`);setText('[data-k-mile]',`$${b.costPerMile.toFixed(2)}`);setText('[data-k-mile-note]',`${Math.round(b.totalMiles).toLocaleString()} total allowed miles`);setText('[data-k-delta]',`${b.delta>=0?'+':''}${money(b.delta)}`);setText('[data-k-delta-note]',`${money(BASE.payment)}/mo × same term`);const t=$('[data-chart-total]',sec),m=$('[data-chart-monthly]',sec);if(t)t.innerHTML=lineChart(b,'total');if(m)m.innerHTML=lineChart(b,'monthly');
    function setText(sel,v){const el=$(sel,sec);if(el)el.textContent=v}
  }

  function appendCorrections(parts){
    if(!parts.length)return;const describe=$('[data-mode="describe"]');describe?.click();const text=$('#check-text'),form=$('[data-check-form]');if(!text||!form)return;const a=readActive()||{},base=clean(text.value||a.text||a.title||'');text.value=`${base}${base?'\n\n':''}Corrections to ExpenseIntel model — ${parts.join('; ')}.`;text.dataset.userEdited='1';form.requestSubmit?.();
  }

  function bindScenario(sec){
    $$('input[type="range"]',sec).forEach(inp=>inp.addEventListener('input',()=>redrawScenario(sec)));
    $('[data-s-reset]',sec)?.addEventListener('click',()=>{const b=baseline();$('[data-s-payment]',sec).value=b.payment;$('[data-s-due]',sec).value=b.due;$('[data-s-term]',sec).value=b.term;$('[data-s-miles]',sec).value=b.miles;redrawScenario(sec)});
    $('[data-s-model-apply]',sec)?.addEventListener('click',()=>{const model=clean($('[data-s-model]',sec)?.value);if(model)appendCorrections([`exact vehicle model/trim ${model}`])});
    $('[data-s-apply]',sec)?.addEventListener('click',()=>{const b=currentScenario(sec),model=clean($('[data-s-model]',sec)?.value),parts=[];if(model)parts.push(`exact vehicle model/trim ${model}`);parts.push(`monthly lease payment $${Math.round(b.payment)}`,`$${Math.round(b.due)} due at signing`,`${b.term} month lease`,`${Math.round(b.miles)} miles per year`);appendCorrections(parts)});
  }

  function mountScenario(){
    if(!isLease()||lastData?.detectedCategory!=='vehicle')return;const root=$('[data-check-output] .shell');if(!root)return;const sig=[sourceText(),identity().model,identity().trim,lastData?.vehicle?.fuel?.summary?.annualFuelCost?.median].join('|');let sec=$('[data-model-first-scenario]',root);if(sec&&sig===lastScenarioSig)return;lastScenarioSig=sig;if(sec)sec.remove();sec=document.createElement('section');sec.className='check-card ei-lease-scenario';sec.dataset.modelFirstScenario='';const b=baseline();sec.innerHTML=scenarioHTML(b);const anchor=$('.ei-live-passport',root)||$('.ei-everyday-summary',root)||$('.decision-command',root);anchor?.insertAdjacentElement('afterend',sec);bindScenario(sec);
  }

  function modelStates(){
    const b=baseline(),id=identity(),coverage=modelCoverage(),paymentTag=b.userPayment?'USER':'MODELED',termTag=b.userTerm?'USER':'MODELED',milesTag=b.userMiles?'USER':'MODELED',fuelLine=b.fuelAnnual?` + ${money(b.fuelAnnual)}/yr EPA/DOE fuel context`:'';
    return{
      price:{status:`${paymentTag} LEASE BASELINE`,value:`${money(b.payment)}/mo`,note:`${b.userPayment?'Your entered payment.':'U.S. average lease-payment anchor, '+BASE.period+'.'} ${termTag.toLowerCase()} ${b.term} mo · ${milesTag.toLowerCase()} ${b.miles.toLocaleString()} mi/yr.`},
      cost:{status:'MODELED TRUE COST',value:`${money(b.paymentCash)} / ${b.term} mo`,note:`Lease payment model ${money(b.payment)}/mo × ${b.term} months + ${money(b.due)} at signing${fuelLine}. The interactive lease model below separates payment cash from fuel and unresolved contract fees.`},
      exposure:{status:'MODELED ASSUMPTIONS',value:`${coverage}/100 model coverage`,note:`ExpenseIntel fills sparse inputs first, then asks for the variables with the highest information value. Evidence confidence remains separate from this model-coverage score.`},
      timing:{status:'MODELED TIMING',value:'Neutral now-vs-later case',note:'Baseline assumes the same lease structure if you wait. Incentives, money factor, residual and inventory can change the result; use Timing to stress-test those changes.'},
      change:{status:'MODELED LEVERS',value:'Payment · signing cash · term · mileage',note:'These variables are live sliders below. Exact model/trim is asked automatically because it changes fuel, safety and comparable-market matching.'},
      alternatives:{status:'MODELED COMPARISON SET',value:'Your scenario vs U.S. lease baseline',note:`The cost curve automatically compares your modeled/entered deal with ${money(BASE.payment)}/mo over the same term. Real comparable offers can replace that baseline later.`},
      exit:{status:'MODELED EXIT',value:`Return at month ${b.term}`,note:'Default exit scenario is normal lease return at term. Residual/buyout, excess-mile rate, wear charges and disposition fee replace this baseline when known.'},
      evidence:{status:'EVIDENCE + MODEL',value:`${lastData?.evidence?.sourceCount||0} source families · ${coverage}/100 model`,note:'Verified evidence, user facts and modeled assumptions remain separate. The model can be useful at 60+ coverage without pretending the underlying evidence is 60% verified.'},
      name:id.label
    };
  }

  function enhancePassport(){
    if(!isLease())return;const pass=$('.ei-live-passport');if(!pass)return;const states=modelStates();const apply=key=>{const s=states[key];if(!s)return;const status=$('[data-live-status]',pass),value=$('[data-live-value]',pass),small=$('[data-live-small]',pass),foot=$('[data-live-foot]',pass),action=$('[data-live-action]',pass);if(status)status.textContent=s.status;if(value)value.textContent=s.value;if(small)small.textContent=s.note;if(foot)foot.innerHTML=`Modeled first <span class="ei-modeled-badge">${modelCoverage()}/100 model</span>`;if(action){action.href='#';action.textContent='Adjust live lease model ↓';action.onclick=e=>{e.preventDefault();$('[data-model-first-scenario]')?.scrollIntoView({behavior:'smooth',block:'start'})}}};$$('[data-live-lens]',pass).forEach(btn=>{if(btn.dataset.mfBound==='1')return;btn.dataset.mfBound='1';btn.addEventListener('click',()=>setTimeout(()=>apply(btn.dataset.liveLens),0))});apply($('[data-live-lens].active',pass)?.dataset.liveLens||'price');
  }

  function enhanceSummary(){
    const s=$('.ei-everyday-summary');if(!s||!lastData)return;const coverage=modelCoverage(),nums=$('.ei-key-numbers>div',s);if(nums&&!nums.querySelector('[data-model-coverage]'))nums.insertAdjacentHTML('beforeend',`<div data-model-coverage><span>MODEL COVERAGE</span><strong>${coverage}/100</strong><small>Planning-model coverage, not evidence confidence</small></div>`);
    if(!isLease())return;const b=baseline(),call=$('.ei-summary-head>div>strong',s),copy=$('.ei-summary-head>div>p',s),next=$('.ei-next-step strong',s),nextp=$('.ei-next-step p',s);if(call&&!/LEASE MARKET BASELINE|LEASE ECONOMICS/i.test(call.textContent))call.textContent='LEASE MARKET BASELINE';if(copy)copy.textContent=`ExpenseIntel modeled the sparse lease first: ${money(b.payment)}/mo, ${b.term} months, ${b.miles.toLocaleString()} miles/year and ${money(b.due)} at signing. Model coverage starts at ${coverage}/100 and rises as the exact car and real contract terms replace assumptions.`;if(next)next.textContent=identity().model?'Adjust the live lease model':'Tell ExpenseIntel which car, then adjust the deal';if(nextp)nextp.textContent=identity().model?'Use the sliders below to change signing cash, monthly payment, term and mileage. The cost curves update immediately.':'Enter the exact model/trim below. ExpenseIntel will automatically rerun vehicle matching and then use the sliders to model the lease economics.';
  }

  function run(){queued=false;injectStyle();enhanceSummary();enhancePassport();mountScenario()}
  function schedule(){if(queued)return;queued=true;setTimeout(run,70)}
  const nativeFetch=window.fetch.bind(window);window.fetch=async(...args)=>{const r=await nativeFetch(...args);try{const u=typeof args[0]==='string'?args[0]:args[0]?.url||'';if(/\/api\/check(?:\?|$)/.test(u))r.clone().json().then(d=>{if(d?.ok){lastData=d;lastScenarioSig='';schedule()}}).catch(()=>{})}catch(_e){}return r};
  function init(){injectStyle();const out=$('[data-check-output]');if(out)new MutationObserver(schedule).observe(out,{subtree:true,childList:true,characterData:true});schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();