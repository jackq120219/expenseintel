(()=>{
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)):'—';
  const money2=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)):'—';
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=s=>{if(s==null)return null;const m=String(s).trim().toLowerCase().match(/([0-9]+(?:\.[0-9]+)?)\s*([km])?/);if(!m)return null;let n=Number(m[1]);if(m[2]==='k')n*=1000;if(m[2]==='m')n*=1000000;return Number.isFinite(n)?n:null};
  let lastCheck=null,lastFingerprint='';

  function injectStyles(){
    if(document.querySelector('style[data-lease-intel-style]'))return;
    const s=document.createElement('style');s.dataset.leaseIntelStyle='';s.textContent=`
      .lease-intel-card{border-top:3px solid var(--acid,#9cff00)!important}
      .lease-intel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(20,25,18,.18)}
      .lease-intel-grid>div{padding:18px 20px;border-right:1px solid rgba(20,25,18,.14)}
      .lease-intel-grid>div:last-child{border-right:0}
      .lease-intel-grid span,.lease-intel-detail span{display:block;font:600 10px/1.2 var(--mono,monospace);letter-spacing:.09em;text-transform:uppercase;opacity:.65;margin-bottom:8px}
      .lease-intel-grid strong{display:block;font-size:22px;line-height:1.05}
      .lease-intel-grid small{display:block;margin-top:7px;line-height:1.35;opacity:.66}
      .lease-intel-detail{display:grid;grid-template-columns:1.1fr .9fr;border-top:1px solid rgba(20,25,18,.18)}
      .lease-intel-detail>div{padding:20px}
      .lease-intel-detail>div+div{border-left:1px solid rgba(20,25,18,.14)}
      .lease-intel-detail strong{display:block;font:700 17px/1.25 var(--sans,Arial,sans-serif);margin-bottom:8px}
      .lease-intel-detail p{margin:0;line-height:1.55;opacity:.76}
      .lease-intel-missing{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}
      .lease-intel-missing b{font:600 10px/1 var(--mono,monospace);letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(20,25,18,.25);padding:7px 8px;background:rgba(255,255,255,.25)}
      @media(max-width:800px){.lease-intel-grid{grid-template-columns:1fr 1fr}.lease-intel-grid>div:nth-child(2){border-right:0}.lease-intel-detail{grid-template-columns:1fr}.lease-intel-detail>div+div{border-left:0;border-top:1px solid rgba(20,25,18,.14)}}
    `;document.head.appendChild(s);
  }

  function sourceText(d){
    return [d?.input?.text,document.querySelector('#check-text')?.value,d?.page?.title,d?.page?.description].filter(Boolean).join(' ');
  }
  function take(rx,s,group=1){const m=s.match(rx);return m?num(m[group]):null}
  function parseLease(text){
    const s=String(text||'');
    if(!/\bleas(?:e|ed|ing)\b/i.test(s))return null;
    const monthly=take(/(?:monthly\s+(?:lease\s+)?payment|lease\s+payment|payment)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s)
      ??take(/\$\s*([\d,.]+\s*[kKmM]?)\s*(?:\/\s*(?:mo|month)|a\s+month|per\s+month|monthly)\b/i,s)
      ??take(/(?:lease|leasing)\s+(?:it\s+)?(?:for|at)\s*\$?\s*([\d,.]+\s*[kKmM]?)\s*(?:\/\s*(?:mo|month)|a\s+month|per\s+month|monthly)/i,s);
    const due=take(/\$?\s*([\d,.]+\s*[kKmM]?)\s*(?:due\s+at\s+signing|at\s+signing|drive[- ]?off|due\s+on\s+delivery)/i,s)
      ??take(/(?:due\s+at\s+signing|at\s+signing|drive[- ]?off)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const down=take(/(?:down\s+payment|cap(?:italized)?\s+cost\s+reduction|cash\s+down)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s)
      ??take(/\$?\s*([\d,.]+\s*[kKmM]?)\s+(?:down|down\s+payment)\b/i,s);
    let term=take(/\b(\d{2})\s*(?:month|mo)s?\b/i,s);
    if(!term){const years=take(/\b([2-6](?:\.\d+)?)\s*[- ]?year\s+lease\b/i,s);if(years)term=Math.round(years*12)}
    let miles=take(/\b([\d,.]+\s*[kKmM]?)\s*(?:miles|mi)\s*(?:\/|per\s+|a\s+)?(?:year|yr|annually|annual)\b/i,s);
    if(!miles)miles=take(/(?:annual\s+mileage|mileage\s+allowance|miles\s+per\s+year)\s*(?:is|of|=|:)?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const overage=take(/\$?\s*([\d.]+)\s*(?:\/|per\s+)?(?:excess\s+)?(?:mile|mi)\b/i,s)
      ??(()=>{const m=s.match(/(\d+(?:\.\d+)?)\s*cents?\s*(?:\/|per\s+)?(?:mile|mi)\b/i);return m?Number(m[1])/100:null})();
    const buyout=take(/(?:buyout|purchase\s+option|residual(?:\s+value)?)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const msrp=take(/(?:msrp|sticker(?:\s+price)?)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const capCost=take(/(?:adjusted\s+cap(?:italized)?\s+cost|cap(?:italized)?\s+cost)\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const acquisition=take(/(?:acquisition|bank)\s+fee\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    const disposition=take(/disposition\s+fee\s*(?:is|of|=|:)?\s*\$?\s*([\d,.]+\s*[kKmM]?)/i,s);
    return{monthly,due,down,term,miles,overage,buyout,msrp,capCost,acquisition,disposition};
  }

  function calculations(l,d){
    const upfront=l.due??l.down??0;
    let cashLow=null,cashHigh=null,effectiveLow=null,effectiveHigh=null,includedMiles=null,cashPerMile=null;
    if(l.monthly&&l.term){
      cashLow=upfront+l.monthly*Math.max(0,l.term-(l.due!=null?1:0));
      cashHigh=upfront+l.monthly*l.term;
      effectiveLow=cashLow/l.term;effectiveHigh=cashHigh/l.term;
      if(l.miles){includedMiles=l.miles*(l.term/12);cashPerMile=cashHigh/includedMiles}
    }
    const fuel=d?.vehicle?.fuel?.summary?.annualFuelCost;
    let withFuelLow=null,withFuelHigh=null;
    if(cashLow!=null&&fuel&&l.term){withFuelLow=cashLow+(Number(fuel.min)||0)*(l.term/12);withFuelHigh=cashHigh+(Number(fuel.max)||0)*(l.term/12)}
    return{upfront,cashLow,cashHigh,effectiveLow,effectiveHigh,includedMiles,cashPerMile,withFuelLow,withFuelHigh};
  }
  function range(a,b,formatter=money){if(a==null||b==null)return'—';if(Math.abs(a-b)<1)return formatter(a);return`${formatter(a)}–${formatter(b)}`}
  function missingFields(l){
    const m=[];
    if(!l.monthly)m.push('monthly payment');
    if(!l.term)m.push('lease term');
    if(l.due==null&&l.down==null)m.push('due at signing');
    if(!l.miles)m.push('mileage allowance');
    if(!l.buyout)m.push('residual / buyout');
    if(!l.overage)m.push('excess-mile fee');
    return m;
  }

  function enhance(d){
    if(!d||d.detectedCategory!=='vehicle')return;
    const text=sourceText(d),l=parseLease(text);if(!l)return;
    const out=document.querySelector('[data-check-output] .shell');if(!out||!out.querySelector('[data-result-title]'))return;
    const fp=JSON.stringify([text,l,d?.vehicle?.identity?.year,d?.vehicle?.identity?.make,d?.vehicle?.identity?.model]);
    if(fp===lastFingerprint&&out.querySelector('[data-lease-intel]'))return;lastFingerprint=fp;
    out.querySelector('[data-lease-intel]')?.remove();
    injectStyles();
    const c=calculations(l,d),missing=missingFields(l),id=d.vehicle?.identity||{};
    const complete=l.monthly&&l.term&&(l.due!=null||l.down!=null)&&l.miles;
    const partial=l.monthly||l.term||l.due!=null||l.down!=null||l.miles;
    const monthlyLabel=l.monthly?money(l.monthly):'Not provided';
    const effective=c.effectiveLow!=null?range(c.effectiveLow,c.effectiveHigh,money):'Need payment + term';
    const outlay=c.cashLow!=null?range(c.cashLow,c.cashHigh,money):'Need payment + term';
    const mileage=c.includedMiles!=null?`${Math.round(c.includedMiles).toLocaleString()} mi`:(l.miles?`${Math.round(l.miles).toLocaleString()} mi/yr`:'Not provided');
    const identity=[id.year,id.make,id.model,id.trim].filter(Boolean).join(' ')||'Vehicle lease';
    const headline=complete?'LEASE ECONOMICS BUILT':partial?'LEASE TERMS PARTIALLY BUILT':'LEASE DETECTED';
    const reason=complete
      ?`ExpenseIntel found enough lease terms to expose the cash commitment. ${outlay} is the scheduled lease cash range before fuel, insurance, maintenance, excess mileage, wear charges and any end-of-lease fees.`
      :`ExpenseIntel recognized this as a lease, not a purchase. It will keep the missing contract terms explicit and calculate the economics automatically as soon as they are included in the description.`;
    const call=document.querySelector('[data-decision-call]'),why=document.querySelector('[data-decision-reason]');if(call)call.textContent=headline;if(why)why.textContent=reason;
    const grid=document.querySelector('[data-decision-grid]');if(grid)grid.innerHTML=[['LEASE PMT',monthlyLabel],['EFFECTIVE / MO',effective],['TERM',l.term?`${l.term} mo`:'Missing'],['LEASE CASH',outlay]].map(([a,b])=>`<div><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
    const facts=document.querySelector('[data-result-facts]');if(facts&&!facts.querySelector('[data-lease-fact]'))facts.insertAdjacentHTML('afterbegin',`<div data-lease-fact><span>Commitment structure</span><strong>Lease</strong><small>${esc(identity)} · lease economics analyzed separately from purchase price</small></div>`);
    if(facts){for(const row of facts.children){const label=row.querySelector('span');if(label?.textContent.trim()==='Price captured'){label.textContent='Lease payment';const strong=row.querySelector('strong'),small=row.querySelector('small');if(strong)strong.textContent=l.monthly?`${money(l.monthly)}/mo`:'Not provided';if(small)small.textContent=l.monthly?'Parsed as a monthly lease payment, not the vehicle purchase price.':'No monthly payment was supplied.';break}}}
    const compSec=document.querySelector('[data-comps-section]');if(compSec)compSec.hidden=true;
    const sub=document.querySelector('[data-result-sub]');if(sub&&!/lease/i.test(sub.textContent))sub.textContent=`${sub.textContent} · lease`;
    const unknowns=document.querySelector('[data-result-unknowns]');if(unknowns){for(const x of missing.slice().reverse()){if(!unknowns.textContent.toLowerCase().includes(x))unknowns.insertAdjacentHTML('afterbegin',`<div class="check-unknown">Lease: ${esc(x)}</div>`)}}
    const next=document.querySelector('[data-result-next]');if(next){const nextTitle=missing.length?`Add ${missing.slice(0,2).join(' + ')}`:'Verify the lease worksheet against the contract';const nextCopy=missing.length?`Those terms unlock the effective monthly cost, total scheduled cash, allowed-mile economics and end-of-lease exposure. You can type them into the same sentence; ExpenseIntel will recalculate automatically.`:`Before signing, confirm taxes, acquisition fee, disposition fee, wear rules, excess-mile rate and whether the quoted due-at-signing amount already includes the first monthly payment.`;next.innerHTML=`<span>Highest-value next move</span><strong>${esc(nextTitle)}</strong><p>${esc(nextCopy)}</p>`}
    const sec=document.createElement('section');sec.className='check-card vehicle-detail lease-intel-card';sec.dataset.leaseIntel='';
    const fuelRange=c.withFuelLow!=null?range(c.withFuelLow,c.withFuelHigh,money):'Not yet modeled';
    const dueLabel=l.due!=null?money(l.due):l.down!=null?`${money(l.down)} down`:'Not provided';
    sec.innerHTML=`<div class="check-card-head"><span>Lease intelligence</span><b>CONTRACT MATH</b></div>
      <div class="lease-intel-grid">
        <div><span>Monthly payment</span><strong>${esc(monthlyLabel)}</strong><small>Quoted lease payment only; taxes may or may not be included.</small></div>
        <div><span>Due at signing</span><strong>${esc(dueLabel)}</strong><small>Cash paid up front can materially change the real monthly cost.</small></div>
        <div><span>Effective monthly</span><strong>${esc(effective)}</strong><small>Scheduled lease cash divided by term. Range handles ambiguity about whether first payment is inside drive-off.</small></div>
        <div><span>Scheduled lease cash</span><strong>${esc(outlay)}</strong><small>Before fuel, insurance, maintenance, wear, excess mileage and end fees.</small></div>
        <div><span>Allowed mileage</span><strong>${esc(mileage)}</strong><small>${l.miles?`${Math.round(l.miles).toLocaleString()} miles/year × ${l.term||'?'} months.`:'Add the annual allowance to price mileage risk.'}</small></div>
        <div><span>Lease cash / allowed mile</span><strong>${c.cashPerMile!=null?esc(money2(c.cashPerMile)):'—'}</strong><small>Lease cash only; useful for comparing structures with different mileage caps.</small></div>
        <div><span>Buyout / residual</span><strong>${l.buyout?esc(money(l.buyout)):'Not provided'}</strong><small>Critical if keeping the vehicle at lease end is a realistic option.</small></div>
        <div><span>Lease + EPA fuel</span><strong>${esc(fuelRange)}</strong><small>${c.withFuelLow!=null?'Adds connected EPA/DOE standard-use fuel cost for the lease term.':'Appears when both lease term and compatible EPA/DOE fuel data are available.'}</small></div>
      </div>
      <div class="lease-intel-detail"><div><span>What ExpenseIntel found</span><strong>${esc(identity)} · Lease</strong><p>${esc([l.term?`${l.term}-month term`:null,l.miles?`${Math.round(l.miles).toLocaleString()} mi/yr`:null,l.overage!=null?`${money2(l.overage)}/mi overage`:null,l.acquisition?`${money(l.acquisition)} acquisition fee`:null,l.disposition?`${money(l.disposition)} disposition fee`:null].filter(Boolean).join(' · ')||'The vehicle and lease structure were detected, but the contract economics are still sparse.')}</p></div><div><span>Still worth verifying</span><strong>${missing.length?`${missing.length} lease term${missing.length===1?'':'s'} missing`:'Core lease terms captured'}</strong><p>${missing.length?'ExpenseIntel will not invent contract terms. Add them and this card becomes a full lease cash-flow view.':'Taxes, fees, wear-and-tear language, disposition rules and whether the first payment is included in drive-off can still change the real cost.'}</p>${missing.length?`<div class="lease-intel-missing">${missing.map(x=>`<b>${esc(x)}</b>`).join('')}</div>`:''}</div></div>`;
    const vehicle=document.querySelector('[data-vehicle-section]');const comps=document.querySelector('[data-comps-section]');if(vehicle)vehicle.insertAdjacentElement('beforebegin',sec);else if(comps)comps.insertAdjacentElement('beforebegin',sec);else document.querySelector('.decision-meaning')?.insertAdjacentElement('afterend',sec);
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{
    const r=await nativeFetch(...args);
    try{
      const u=typeof args[0]==='string'?args[0]:args[0]?.url||'';
      if(/\/api\/check(?:\?|$)/.test(u)){
        r.clone().json().then(d=>{if(d?.ok){lastCheck=d;setTimeout(()=>enhance(d),0)}}).catch(()=>{});
      }
    }catch(_e){}
    return r;
  };
  const obs=new MutationObserver(()=>{if(lastCheck)setTimeout(()=>enhance(lastCheck),0)});
  document.addEventListener('DOMContentLoaded',()=>{injectStyles();const o=document.querySelector('[data-check-output]');if(o)obs.observe(o,{childList:true,subtree:true});});
})();