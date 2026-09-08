(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ACTIVE='ei_active_decision';
  const BASE={payment:619,finance:770,term:36,miles:12000,due:0,leaseShare:24.1,period:'Q1 2026'};
  let lastData=null,queued=false;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)):'—';
  const readActive=()=>{try{return JSON.parse(localStorage.getItem(ACTIVE)||'null')}catch(_e){return null}};
  const sourceText=()=>{const a=readActive()||{};return [a.text,a.title,$('#check-text')?.value,lastData?.input?.text,lastData?.page?.title].filter(Boolean).join(' ')};
  const isLease=()=>/\bleas(?:e|ed|ing)\b/i.test(sourceText());
  const parseNum=s=>{const n=Number(String(s||'').replace(/[$,\s]/g,''));return Number.isFinite(n)?n:null};
  const take=(rx,text)=>{const m=String(text||'').match(rx);return m?parseNum(m[1]):null};
  function leaseTerms(){
    const t=sourceText();
    const payment=take(/\$\s*([\d,.]+)\s*(?:\/\s*(?:mo|month)|a\s+month|per\s+month|monthly)\b/i,t)??take(/(?:monthly\s+(?:lease\s+)?payment|lease\s+payment|payment)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+)/i,t);
    const term=take(/\b(\d{2})\s*(?:month|mo)s?\b/i,t);
    const due=take(/\$?\s*([\d,.]+)\s*(?:due\s+at\s+signing|at\s+signing|drive[- ]?off)/i,t)??take(/(?:due\s+at\s+signing|drive[- ]?off)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+)/i,t);
    const miles=take(/\b([\d,.]+)\s*(?:miles|mi)\s*(?:\/|per\s+|a\s+)?(?:year|yr|annually|annual)\b/i,t);
    return{payment:payment??BASE.payment,term:term??BASE.term,due:due??BASE.due,miles:miles??BASE.miles,userPayment:payment!=null,userTerm:term!=null,userDue:due!=null,userMiles:miles!=null};
  }
  function vehicleName(){const id=lastData?.vehicle?.identity||{},a=readActive()||{};return [id.year,id.make,id.model,id.trim].filter(Boolean).join(' ')||clean(a.title||a.text||'Vehicle lease')}
  function baseline(){
    const x=leaseTerms(),fuel=lastData?.vehicle?.fuel?.summary?.annualFuelCost?.median;
    const paymentCash=x.payment*x.term+x.due;
    const fuelCash=Number.isFinite(Number(fuel))?Number(fuel)*(x.term/12):0;
    return{...x,paymentCash,fuel,fuelCash,totalKnown:paymentCash+fuelCash};
  }
  function injectStyle(){if($('#ei-model-first-style'))return;const s=document.createElement('style');s.id='ei-model-first-style';s.textContent=`
    .ei-modeled-badge{display:inline-block;font:700 9px/1.1 var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;border:1px solid currentColor;padding:4px 6px;margin-left:7px;vertical-align:middle;opacity:.72}
    .ei-model-correct{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(20,25,18,.45);background:transparent;padding:8px 10px;font:700 10px/1 var(--mono,monospace);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
    .ei-model-editor{margin-top:12px;border-top:1px solid rgba(20,25,18,.18);padding-top:12px}
    .ei-model-editor[hidden]{display:none}.ei-model-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.ei-model-grid label{font:600 9px/1.2 var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase;opacity:.72}.ei-model-grid input{width:100%;box-sizing:border-box;margin-top:6px;padding:9px;border:1px solid rgba(20,25,18,.28);background:rgba(255,255,255,.35);font:600 13px/1.2 var(--sans,Arial,sans-serif)}.ei-model-editor p{font-size:11px;line-height:1.45;opacity:.68;margin:9px 0}.ei-model-editor button{border:0;background:#10150f;color:#fff;padding:9px 12px;font:700 10px/1 var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase;cursor:pointer}
    @media(max-width:850px){.ei-model-grid{grid-template-columns:1fr 1fr}.ei-model-grid label:first-child{grid-column:1/-1}}
  `;document.head.appendChild(s)}
  function modelStates(){
    const b=baseline(),name=vehicleName(),paymentTag=b.userPayment?'USER':'MODELED',termTag=b.userTerm?'USER':'MODELED',milesTag=b.userMiles?'USER':'MODELED',fuelLine=b.fuel?` + ${money(b.fuel)}/yr EPA/DOE fuel context`:'';
    const unresolved=(lastData?.check?.unknown||[]).length;
    return{
      price:{status:`${paymentTag} LEASE BASELINE`,value:`${money(b.payment)}/mo`,note:`${b.userPayment?'Your entered payment.':'U.S. average lease-payment anchor, '+BASE.period+'.'} ${termTag.toLowerCase()} ${b.term} mo · ${milesTag.toLowerCase()} ${b.miles.toLocaleString()} mi/yr.`},
      cost:{status:'MODELED TRUE COST',value:b.fuel?`${money(b.totalKnown)} / ${b.term} mo`:`${money(b.paymentCash)} payment-only`,note:`Lease payment model ${money(b.payment)}/mo × ${b.term} months + ${money(b.due)} modeled/entered drive-off${fuelLine}. Insurance, wear and end fees remain outside this baseline.`},
      exposure:{status:'MODELED ASSUMPTIONS',value:`${b.term} mo · ${b.miles.toLocaleString()} mi/yr`,note:`ExpenseIntel filled sparse inputs instead of leaving blanks: ${money(b.payment)}/mo payment, ${money(b.due)} extra cap reduction/drive-off baseline, ${b.term}-month term and ${b.miles.toLocaleString()} miles/year. ${unresolved} evidence gap${unresolved===1?'':'s'} still remain separate.`},
      timing:{status:'MODELED TIMING',value:'Neutral now-vs-later case',note:'Baseline assumes the same lease structure if you wait. Incentives, money factor, residual and inventory can change the result; use Timing to stress-test those changes rather than leaving this lens empty.'},
      change:{status:'MODELED LEVERS',value:'Payment · drive-off · term · mileage',note:'The first levers to test are monthly payment, cash due at signing, lease term, annual mileage, exact Porsche model/trim and dealer. These are modeled as changeable until the contract fixes them.'},
      alternatives:{status:'MODELED COMPARISON SET',value:'Same Porsche · lower trim · finance',note:'Default comparison set: the same Porsche lease at equivalent term/mileage, one lower-cost trim/model, and financing the vehicle. Replace these with real offers when available.'},
      exit:{status:'MODELED EXIT',value:`Return at month ${b.term}`,note:'Default exit scenario is normal lease return at the modeled/entered term. Buyout/residual, excess-mile rate, wear charges and disposition fee should replace this baseline when known.'},
      evidence:{status:'EVIDENCE + MODEL',value:`${lastData?.evidence?.sourceCount||0} source families + assumptions`,note:`Verified evidence stays separate from the modeled lease layer. Modeled values are deliberately labeled and can be corrected without rebuilding the decision from scratch.`},
      name
    };
  }
  function correctPanel(host){
    if(host.querySelector('.ei-model-editor'))return;
    const b=baseline(),wrap=document.createElement('div');wrap.className='ei-model-editor';wrap.hidden=true;wrap.innerHTML=`<div class="ei-model-grid"><label>Model / trim<input data-mf-model placeholder="e.g. Macan S"></label><label>Monthly payment<input data-mf-payment type="number" min="0" step="1" value="${b.payment}"></label><label>Term (months)<input data-mf-term type="number" min="1" step="1" value="${b.term}"></label><label>Due at signing<input data-mf-due type="number" min="0" step="1" value="${b.due}"></label><label>Miles / year<input data-mf-miles type="number" min="1000" step="500" value="${b.miles}"></label></div><p>These fields show the current modeled baseline. Change only what you actually know; unchanged modeled values stay assumptions.</p><button type="button" data-mf-apply>Apply my corrections</button>`;host.appendChild(wrap);
    wrap.querySelector('[data-mf-apply]').onclick=()=>{
      const parts=[],model=clean(wrap.querySelector('[data-mf-model]').value),p=parseNum(wrap.querySelector('[data-mf-payment]').value),term=parseNum(wrap.querySelector('[data-mf-term]').value),due=parseNum(wrap.querySelector('[data-mf-due]').value),miles=parseNum(wrap.querySelector('[data-mf-miles]').value);
      if(model)parts.push(`exact model/trim ${model}`);if(p!=null&&p!==BASE.payment)parts.push(`monthly lease payment $${p}`);if(term!=null&&term!==BASE.term)parts.push(`${term} month lease`);if(due!=null&&due!==BASE.due)parts.push(`$${due} due at signing`);if(miles!=null&&miles!==BASE.miles)parts.push(`${miles} miles per year`);
      if(!parts.length){wrap.hidden=true;return}
      const describe=$('[data-mode="describe"]');describe?.click();const text=$('#check-text'),form=$('[data-check-form]');if(!text||!form)return;const a=readActive()||{},base=clean(text.value||a.text||a.title||'');text.value=`${base}${base?'\n\n':''}Corrections to ExpenseIntel model — ${parts.join('; ')}.`;text.dataset.userEdited='1';form.requestSubmit?.();
    };
  }
  function enhancePassport(){
    if(!isLease())return;const pass=$('.ei-live-passport');if(!pass)return;injectStyle();const states=modelStates();
    const apply=key=>{const s=states[key];if(!s)return;const status=$('[data-live-status]',pass),value=$('[data-live-value]',pass),small=$('[data-live-small]',pass),foot=$('[data-live-foot]',pass),action=$('[data-live-action]',pass);if(status)status.textContent=s.status;if(value)value.textContent=s.value;if(small)small.textContent=s.note;if(foot)foot.innerHTML=`Modeled first <span class="ei-modeled-badge">Correctable</span>`;if(action){action.href='#';action.textContent='Correct modeled assumptions →';action.onclick=e=>{e.preventDefault();const editor=$('.ei-model-editor',pass);if(editor)editor.hidden=!editor.hidden}}};
    $$('[data-live-lens]',pass).forEach(btn=>{if(btn.dataset.mfBound==='1')return;btn.dataset.mfBound='1';btn.addEventListener('click',()=>setTimeout(()=>apply(btn.dataset.liveLens),0))});correctPanel($('.ei-live-passport-panel',pass)||pass);const active=$('[data-live-lens].active',pass)?.dataset.liveLens||'price';apply(active);
  }
  function enhanceSummary(){
    if(!isLease())return;const s=$('.ei-everyday-summary');if(!s)return;const b=baseline(),call=$('.ei-summary-head>div>strong',s),copy=$('.ei-summary-head>div>p',s),nums=$('.ei-key-numbers>div',s),next=$('.ei-next-step strong',s),nextp=$('.ei-next-step p',s);if(call&&!/LEASE MARKET BASELINE|LEASE ECONOMICS/i.test(call.textContent))call.textContent='LEASE MARKET BASELINE';if(copy)copy.textContent=`ExpenseIntel modeled the sparse lease first instead of stopping at missing data: ${money(b.payment)}/mo, ${b.term} months, ${b.miles.toLocaleString()} miles/year and ${money(b.due)} additional cap reduction/drive-off baseline. Correct any assumption you know.`;if(nums)nums.innerHTML=`<div><span>MODELED PAYMENT</span><strong>${money(b.payment)}/mo</strong></div><div><span>MODELED TERM</span><strong>${b.term} mo</strong></div><div><span>MODELED MILEAGE</span><strong>${b.miles.toLocaleString()}/yr</strong></div><div><span>PAYMENT CASH</span><strong>${money(b.paymentCash)}</strong></div>`;if(next)next.textContent='Review or correct the modeled assumptions';if(nextp)nextp.textContent='The page is useful immediately. Add the Porsche model, real payment, term, drive-off or mileage only when you know them; ExpenseIntel will replace the model with your facts.';
  }
  function run(){queued=false;enhanceSummary();enhancePassport()}
  function schedule(){if(queued)return;queued=true;setTimeout(run,60)}
  const nativeFetch=window.fetch.bind(window);window.fetch=async(...args)=>{const r=await nativeFetch(...args);try{const u=typeof args[0]==='string'?args[0]:args[0]?.url||'';if(/\/api\/check(?:\?|$)/.test(u))r.clone().json().then(d=>{if(d?.ok){lastData=d;schedule()}}).catch(()=>{})}catch(_e){}return r};
  function init(){injectStyle();const out=$('[data-check-output]');if(out)new MutationObserver(schedule).observe(out,{subtree:true,childList:true,characterData:true});schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();