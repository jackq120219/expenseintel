(()=>{
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)):'—';
  const money2=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)):'—';
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=s=>{if(s==null)return null;const m=String(s).trim().toLowerCase().replace(/,/g,'').match(/([0-9]+(?:\.[0-9]+)?)\s*([km])?/);if(!m)return null;let n=Number(m[1]);if(m[2]==='k')n*=1000;if(m[2]==='m')n*=1000000;return Number.isFinite(n)?n:null};
  const BENCH={avgLease:619,avgFinance:770,leaseShare:24.1,typicalTerm:'24–48 mo',typicalMiles:'10,000–15,000 mi/yr',period:'Q1 2026',source:'Experian',normSource:'CFPB'};
  let lastCheck=null,lastFingerprint='';

  function injectStyles(){
    if(document.querySelector('style[data-lease-intel-style]'))return;
    const s=document.createElement('style');s.dataset.leaseIntelStyle='';s.textContent=`
      .lease-intel-card{border-top:3px solid var(--acid,#9cff00)!important}
      .lease-intel-grid,.lease-market-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(20,25,18,.18)}
      .lease-intel-grid>div,.lease-market-grid>div{padding:18px 20px;border-right:1px solid rgba(20,25,18,.14)}
      .lease-intel-grid>div:last-child,.lease-market-grid>div:last-child{border-right:0}
      .lease-intel-grid span,.lease-market-grid span,.lease-intel-detail span{display:block;font:600 10px/1.2 var(--mono,monospace);letter-spacing:.09em;text-transform:uppercase;opacity:.65;margin-bottom:8px}
      .lease-intel-grid strong,.lease-market-grid strong{display:block;font-size:22px;line-height:1.05}
      .lease-intel-grid small,.lease-market-grid small{display:block;margin-top:7px;line-height:1.35;opacity:.66}
      .lease-market-note{padding:15px 20px;border-top:1px solid rgba(20,25,18,.18);font-size:12px;line-height:1.55;opacity:.72}
      .lease-intel-detail{display:grid;grid-template-columns:1.1fr .9fr;border-top:1px solid rgba(20,25,18,.18)}
      .lease-intel-detail>div{padding:20px}.lease-intel-detail>div+div{border-left:1px solid rgba(20,25,18,.14)}
      .lease-intel-detail strong{display:block;font:700 17px/1.25 var(--sans,Arial,sans-serif);margin-bottom:8px}.lease-intel-detail p{margin:0;line-height:1.55;opacity:.76}
      .lease-intel-missing{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}.lease-intel-missing b{font:600 10px/1 var(--mono,monospace);letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(20,25,18,.25);padding:7px 8px;background:rgba(255,255,255,.25)}
      @media(max-width:800px){.lease-intel-grid,.lease-market-grid{grid-template-columns:1fr 1fr}.lease-intel-grid>div:nth-child(2n),.lease-market-grid>div:nth-child(2n){border-right:0}.lease-intel-detail{grid-template-columns:1fr}.lease-intel-detail>div+div{border-left:0;border-top:1px solid rgba(20,25,18,.14)}}
    `;document.head.appendChild(s);
  }

  function sourceText(d){return [d?.input?.text,document.querySelector('#check-text')?.value,d?.page?.title,d?.page?.description].filter(Boolean).join(' ')}
  function take(rx,s,group=1){const m=s.match(rx);return m?num(m[group]):null}
  function parseLease(text){
    const s=String(text||'');if(!/\bleas(?:e|ed|ing)\b/i.test(s))return null;
    const monthly=take(/(?:monthly\s+(?:lease\s+)?payment|lease\s+payment|payment)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s)
      ??take(/\$\s*([\d,.]+\s*[kKmM]?)\s*(?:\/\s*(?:mo|month)|a\s+month|per\s+month|monthly)\b/i,s)
      ??take(/(?:lease|leasing)\s+(?:it\s+)?(?:for|at)\s*\$?\s*([\d,.]+\s*[kKmM]?)\s*(?:\/\s*(?:mo|month)|a\s+month|per\s+month|monthly)/i,s);
    const due=take(/\$?\s*([\d,.]+\s*[kKmM]?)\s*(?:due\s+at\s+signing|at\s+signing|drive[- ]?off|due\s+on\s+delivery)/i,s)
      ??take(/(?:due\s+at\s+signing|at\s+signing|drive[- ]?off)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const down=take(/(?:down\s+payment|cap(?:italized)?\s+cost\s+reduction|cash\s+down)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s)??take(/\$?\s*([\d,.]+\s*[kKmM]?)\s+(?:down|down\s+payment)\b/i,s);
    let term=take(/\b(\d{2})\s*(?:month|mo)s?\b/i,s);if(!term){const y=take(/\b([2-6](?:\.\d+)?)\s*[- ]?year\s+lease\b/i,s);if(y)term=Math.round(y*12)}
    let miles=take(/\b([\d,.]+\s*[kKmM]?)\s*(?:miles|mi)\s*(?:\/|per\s+|a\s+)?(?:year|yr|annually|annual)\b/i,s);if(!miles)miles=take(/(?:annual\s+mileage|mileage\s+allowance|miles\s+per\s+year)\s*(?:is|of|=|:)?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const overage=take(/\$?\s*([\d.]+)\s*(?:\/|per\s+)?(?:excess\s+)?(?:mile|mi)\b/i,s)??(()=>{const m=s.match(/(\d+(?:\.\d+)?)\s*cents?\s*(?:\/|per\s+)?(?:mile|mi)\b/i);return m?Number(m[1])/100:null})();
    const buyout=take(/(?:buyout|purchase\s+option|residual(?:\s+value)?)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const acquisition=take(/(?:acquisition|bank)\s+fee\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const disposition=take(/disposition\s+fee\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    return{monthly,due,down,term,miles,overage,buyout,acquisition,disposition};
  }

  function calculations(l,d){
    const upfront=l.due??l.down??0;let cashLow=null,cashHigh=null,effectiveLow=null,effectiveHigh=null,includedMiles=null,cashPerMile=null;
    if(l.monthly&&l.term){cashLow=upfront+l.monthly*Math.max(0,l.term-(l.due!=null?1:0));cashHigh=upfront+l.monthly*l.term;effectiveLow=cashLow/l.term;effectiveHigh=cashHigh/l.term;if(l.miles){includedMiles=l.miles*(l.term/12);cashPerMile=cashHigh/includedMiles}}
    const fuel=d?.vehicle?.fuel?.summary?.annualFuelCost;let withFuelLow=null,withFuelHigh=null;if(cashLow!=null&&fuel&&l.term){withFuelLow=cashLow+(Number(fuel.min)||0)*(l.term/12);withFuelHigh=cashHigh+(Number(fuel.max)||0)*(l.term/12)}
    return{cashLow,cashHigh,effectiveLow,effectiveHigh,includedMiles,cashPerMile,withFuelLow,withFuelHigh};
  }
  function range(a,b,formatter=money){if(a==null||b==null)return'—';if(Math.abs(a-b)<1)return formatter(a);return`${formatter(a)}–${formatter(b)}`}
  function missingFields(l){const m=[];if(!l.monthly)m.push('monthly payment');if(!l.term)m.push('lease term');if(l.due==null&&l.down==null)m.push('due at signing');if(!l.miles)m.push('mileage allowance');if(!l.buyout)m.push('residual / buyout');if(!l.overage)m.push('excess-mile fee');return m}
  function benchmarkGap(monthly){if(!monthly)return null;const pct=(monthly/BENCH.avgLease-1)*100;return{pct,dollars:monthly-BENCH.avgLease,label:`${pct>=0?'+':''}${pct.toFixed(0)}% vs U.S. avg`}}

  function enhance(d){
    if(!d||d.detectedCategory!=='vehicle')return;const text=sourceText(d),l=parseLease(text);if(!l)return;
    const out=document.querySelector('[data-check-output] .shell');if(!out||!out.querySelector('[data-result-title]'))return;
    const fp=JSON.stringify([text,l,d?.vehicle?.identity?.year,d?.vehicle?.identity?.make,d?.vehicle?.identity?.model]);if(fp===lastFingerprint&&out.querySelector('[data-lease-intel]'))return;lastFingerprint=fp;
    out.querySelector('[data-lease-intel]')?.remove();injectStyles();
    const c=calculations(l,d),missing=missingFields(l),id=d.vehicle?.identity||{},gap=benchmarkGap(l.monthly);
    const complete=l.monthly&&l.term&&(l.due!=null||l.down!=null)&&l.miles,partial=l.monthly||l.term||l.due!=null||l.down!=null||l.miles;
    const monthlyLabel=l.monthly?money(l.monthly):`${money(BENCH.avgLease)} U.S. avg`;
    const effective=c.effectiveLow!=null?range(c.effectiveLow,c.effectiveHigh,money):'Not calculable yet';
    const outlay=c.cashLow!=null?range(c.cashLow,c.cashHigh,money):`${money(BENCH.avgLease*36)} / 36-mo avg-payment baseline`;
    const mileage=c.includedMiles!=null?`${Math.round(c.includedMiles).toLocaleString()} mi`:(l.miles?`${Math.round(l.miles).toLocaleString()} mi/yr`:BENCH.typicalMiles);
    const identity=[id.year,id.make,id.model,id.trim].filter(Boolean).join(' ')||'Vehicle lease';
    const headline=complete?'LEASE ECONOMICS BUILT':partial?'LEASE TERMS + MARKET BASELINE':'LEASE MARKET BASELINE BUILT';
    const reason=complete?`ExpenseIntel found enough contract terms to expose the cash commitment. ${outlay} is scheduled lease cash before fuel, insurance, maintenance, excess mileage, wear and end fees.`:`ExpenseIntel recognized a lease and filled the page with current market context instead of stopping at missing fields. The U.S. average lease payment is ${money(BENCH.avgLease)}/mo (${BENCH.period}); typical leases run ${BENCH.typicalTerm} with ${BENCH.typicalMiles}. Contract-specific numbers are layered on top when supplied.`;
    const call=document.querySelector('[data-decision-call]'),why=document.querySelector('[data-decision-reason]');if(call)call.textContent=headline;if(why)why.textContent=reason;
    const grid=document.querySelector('[data-decision-grid]');if(grid)grid.innerHTML=[['LEASE PMT',l.monthly?`${money(l.monthly)}/mo`:money(BENCH.avgLease)+' avg'],['U.S. LEASE AVG',`${money(BENCH.avgLease)}/mo`],['TYPICAL TERM',l.term?`${l.term} mo`:BENCH.typicalTerm],['LEASE CASH',outlay]].map(([a,b])=>`<div><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
    const facts=document.querySelector('[data-result-facts]');if(facts&&!facts.querySelector('[data-lease-fact]'))facts.insertAdjacentHTML('afterbegin',`<div data-lease-fact><span>Commitment structure</span><strong>Lease</strong><small>${esc(identity)} · lease economics analyzed separately from purchase price</small></div>`);
    if(facts){for(const row of facts.children){const label=row.querySelector('span');if(label?.textContent.trim()==='Price captured'){label.textContent='Lease payment';const strong=row.querySelector('strong'),small=row.querySelector('small');if(strong)strong.textContent=l.monthly?`${money(l.monthly)}/mo`:`Not supplied · ${money(BENCH.avgLease)}/mo U.S. avg`;if(small)small.textContent=l.monthly?'Parsed as a monthly lease payment, not the vehicle purchase price.':'ExpenseIntel supplied a national benchmark rather than treating the field as blank.';break}}}
    const compSec=document.querySelector('[data-comps-section]');if(compSec)compSec.hidden=true;const sub=document.querySelector('[data-result-sub]');if(sub&&!/lease/i.test(sub.textContent))sub.textContent=`${sub.textContent} · lease`;
    const unknowns=document.querySelector('[data-result-unknowns]');if(unknowns){for(const x of missing.slice().reverse()){if(!unknowns.textContent.toLowerCase().includes(x))unknowns.insertAdjacentHTML('afterbegin',`<div class="check-unknown">Lease contract: ${esc(x)}</div>`)}}
    const next=document.querySelector('[data-result-next]');if(next){const nextTitle=missing.length?`Market context built — verify ${missing.slice(0,2).join(' + ')}`:'Verify the lease worksheet against the contract';const nextCopy=missing.length?`You already have a national lease baseline on this page. Adding the contract terms above converts the benchmark into exact effective monthly cost, total scheduled cash, mileage economics and end-of-lease exposure.`:`Confirm taxes, acquisition fee, disposition fee, wear rules, excess-mile rate and whether the quoted drive-off already includes the first monthly payment.`;next.innerHTML=`<span>Highest-value next move</span><strong>${esc(nextTitle)}</strong><p>${esc(nextCopy)}</p>`}

    const sec=document.createElement('section');sec.className='check-card vehicle-detail lease-intel-card';sec.dataset.leaseIntel='';
    const fuelRange=c.withFuelLow!=null?range(c.withFuelLow,c.withFuelHigh,money):'Appears with exact term + vehicle match';const dueLabel=l.due!=null?money(l.due):l.down!=null?`${money(l.down)} down`:'Contract-specific';
    const luxury=/Porsche|Mercedes|BMW|Audi|Lexus|Land Rover|Cadillac|Lincoln|Volvo|Lucid|Rivian/i.test(id.make||'');
    const comparison=gap?`${gap.label} (${gap.dollars>=0?'+':''}${money(gap.dollars)}/mo)`:'Enter the actual payment to compare it with the market';
    sec.innerHTML=`
      <div class="check-card-head"><span>Lease market baseline</span><b>${esc(BENCH.period)} · NATIONAL</b></div>
      <div class="lease-market-grid">
        <div><span>Average lease payment</span><strong>${money(BENCH.avgLease)}/mo</strong><small>${esc(BENCH.source)} ${esc(BENCH.period)} national new-vehicle lease average.</small></div>
        <div><span>Average new-car loan</span><strong>${money(BENCH.avgFinance)}/mo</strong><small>Same-period financing benchmark; lease average is ${money(BENCH.avgFinance-BENCH.avgLease)} lower.</small></div>
        <div><span>New vehicles leased</span><strong>${BENCH.leaseShare.toFixed(1)}%</strong><small>Share of new vehicles leased in ${esc(BENCH.period)}.</small></div>
        <div><span>Typical lease structure</span><strong>${esc(BENCH.typicalTerm)}</strong><small>${esc(BENCH.typicalMiles)} is the common mileage band cited by the ${esc(BENCH.normSource)}.</small></div>
      </div>
      <div class="lease-market-note"><strong>Your lease vs. baseline:</strong> ${esc(comparison)}${luxury?' This is a luxury-vehicle lease, so the national all-vehicle average is context—not a Porsche-specific fair-price verdict.':''}</div>
      <div class="check-card-head"><span>Your lease intelligence</span><b>CONTRACT MATH</b></div>
      <div class="lease-intel-grid">
        <div><span>Monthly payment</span><strong>${esc(monthlyLabel)}</strong><small>${l.monthly?'Quoted payment. Taxes may or may not be included.':'No payment supplied, so ExpenseIntel shows the national benchmark instead of a blank.'}</small></div>
        <div><span>Due at signing</span><strong>${esc(dueLabel)}</strong><small>Drive-off cash can materially raise the real monthly cost.</small></div>
        <div><span>Effective monthly</span><strong>${esc(effective)}</strong><small>Calculated when monthly payment, term and upfront cash are known.</small></div>
        <div><span>Scheduled lease cash</span><strong>${esc(outlay)}</strong><small>${c.cashLow!=null?'Before fuel, insurance, maintenance, wear, excess mileage and end fees.':'Benchmark shown uses 36 × the national average payment only; it excludes typical drive-off because no reliable national average was assumed.'}</small></div>
        <div><span>Allowed mileage</span><strong>${esc(mileage)}</strong><small>${l.miles?`${Math.round(l.miles).toLocaleString()} miles/year × ${l.term||'?'} months.`:'National consumer guidance commonly places leases in the 10k–15k miles/year range.'}</small></div>
        <div><span>Lease cash / allowed mile</span><strong>${c.cashPerMile!=null?esc(money2(c.cashPerMile)):'—'}</strong><small>Useful for comparing leases with different mileage caps.</small></div>
        <div><span>Buyout / residual</span><strong>${l.buyout?esc(money(l.buyout)):'Not supplied'}</strong><small>Important if keeping the vehicle at lease end is realistic.</small></div>
        <div><span>Lease + EPA fuel</span><strong>${esc(fuelRange)}</strong><small>${c.withFuelLow!=null?'Adds connected EPA/DOE standard-use fuel cost for the lease term.':'ExpenseIntel adds this automatically when term and compatible EPA/DOE data are available.'}</small></div>
      </div>
      <div class="lease-intel-detail"><div><span>What ExpenseIntel already knows</span><strong>${esc(identity)} · Lease</strong><p>${esc([l.term?`${l.term}-month term`:`typical ${BENCH.typicalTerm}`,l.miles?`${Math.round(l.miles).toLocaleString()} mi/yr`:BENCH.typicalMiles,l.overage!=null?`${money2(l.overage)}/mi overage`:null,l.acquisition?`${money(l.acquisition)} acquisition fee`:null,l.disposition?`${money(l.disposition)} disposition fee`:null].filter(Boolean).join(' · '))}</p></div><div><span>Contract details still worth verifying</span><strong>${missing.length?`${missing.length} item${missing.length===1?'':'s'} can sharpen the answer`:'Core lease terms captured'}</strong><p>${missing.length?'The missing terms no longer leave the page empty: ExpenseIntel supplies market baselines first, then replaces them with exact contract math as details arrive.':'Taxes, fees, wear language and end-of-lease rules can still change the real cost.'}</p>${missing.length?`<div class="lease-intel-missing">${missing.map(x=>`<b>${esc(x)}</b>`).join('')}</div>`:''}</div></div>`;
    const vehicle=document.querySelector('[data-vehicle-section]'),meaning=document.querySelector('.decision-meaning');if(vehicle)vehicle.insertAdjacentElement('beforebegin',sec);else if(meaning)meaning.insertAdjacentElement('afterend',sec);else out.appendChild(sec);
  }

  const nativeFetch=window.fetch.bind(window);window.fetch=async(...args)=>{const r=await nativeFetch(...args);try{const u=typeof args[0]==='string'?args[0]:args[0]?.url||'';if(/\/api\/check(?:\?|$)/.test(u)){r.clone().json().then(d=>{if(d?.ok){lastCheck=d;setTimeout(()=>enhance(d),0)}}).catch(()=>{})}}catch(_e){}return r};
  const obs=new MutationObserver(()=>{if(lastCheck)setTimeout(()=>enhance(lastCheck),0)});document.addEventListener('DOMContentLoaded',()=>{injectStyles();const o=document.querySelector('[data-check-output]');if(o)obs.observe(o,{childList:true,subtree:true})});
})();