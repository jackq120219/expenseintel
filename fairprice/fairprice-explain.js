(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const num=id=>{const n=Number($(`#${id}`)?.value);return Number.isFinite(n)?n:0};
  const txt=id=>String($(`#${id}`)?.value||'').trim();
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const median=a=>{const x=[...a].sort((a,b)=>a-b),m=Math.floor(x.length/2);return x.length?(x.length%2?x[m]:(x[m-1]+x[m])/2):0};
  function restoreNav(){const nav=$('.navlinks');if(nav){nav.innerHTML='<a href="/check/">Check</a><a href="/watch/">Watch</a><a href="/project/">Project Intel</a><a href="/xray/">X-Ray</a><a href="/data/">Evidence</a>'}const right=$('.navright');if(right)right.innerHTML='<a class="textbtn" href="/truecost/">TrueCost</a><a class="solidbtn" href="/check/">New check</a>'}
  function ensurePanels(){const results=$('.si-results');if(!results)return null;let pos=$('[data-fp-position-panel]');if(!pos){pos=document.createElement('section');pos.className='fp-position-panel';pos.dataset.fpPositionPanel='';const metrics=$('.si-metrics',results);metrics?.insertAdjacentElement('afterend',pos)}let factors=$('[data-fp-factor-panel]');if(!factors){factors=document.createElement('section');factors.className='fp-factor-panel';factors.dataset.fpFactorPanel='';pos?.insertAdjacentElement('afterend',factors)}return{pos,factors}}
  function factorsFor(q){q=q.toLowerCase();if(/paint|painting|exterior|interior/.test(q))return[
    ['SURFACE CONDITION','Prep and repairs','Peeling paint, rot, cracks, scraping, caulking and priming can move labor dramatically before the first finish coat goes on.'],
    ['ACCESS','Height and complexity','Multiple stories, steep grades, difficult ladder/scaffold access and detailed trim raise labor time and equipment cost.'],
    ['MATERIAL','Paint system','Brand, primer, number of coats, sheen and specialty coatings can materially change both material and labor cost.'],
    ['MEASURE','Paintable area','House square footage is not the same as paintable exterior area. Windows, doors, siding geometry and trim density matter.'],
    ['LABOR','Crew and local rates','Crew size, wage market, insurance and contractor overhead can create large differences between otherwise similar bids.'],
    ['SCOPE','What is included','Power washing, repairs, trim, doors, shutters, cleanup, disposal, color changes and warranty terms can make two quotes look comparable when they are not.']
  ];
  if(/hvac|heat pump|furnace|air condition|ac\b/.test(q))return[
    ['EQUIPMENT','Capacity and efficiency','Tonnage, SEER2/HSPF2, furnace efficiency, heat-pump type and equipment tier can change the quote by thousands.'],
    ['SYSTEM','Ductwork and controls','Duct repairs, zoning, thermostats, line sets and condensate work can materially change installed cost.'],
    ['ELECTRICAL','Power upgrades','Panels, breakers, disconnects and service upgrades are often excluded from headline HVAC prices.'],
    ['PERMITS','Code requirements','Permits, inspections and local code work can add both direct cost and schedule risk.'],
    ['ACCESS','Install difficulty','Attics, crawlspaces, rooftops and tight mechanical rooms increase labor.'],
    ['INCENTIVES','Rebates and credits','Utility rebates, manufacturer incentives and tax credits can change net cost even when gross quotes are similar.']
  ];
  if(/roof|shingle/.test(q))return[
    ['GEOMETRY','Pitch and complexity','Steep pitch, valleys, dormers and multiple roof planes increase labor and fall-protection needs.'],
    ['DECKING','Hidden repair','Rotten sheathing or structural repair may not be visible until tear-off and can create major change orders.'],
    ['MATERIAL','Roofing system','Asphalt grade, metal, membrane, underlayment, flashing and ventilation choices move material cost substantially.'],
    ['LAYERS','Tear-off scope','Multiple existing layers, disposal volume and haul-off costs can materially affect the quote.'],
    ['DETAIL','Flashing and penetrations','Chimneys, skylights, vents, gutters and edge details often separate a complete quote from a cheap-looking one.'],
    ['WARRANTY','Coverage quality','Manufacturer system warranties and workmanship coverage can justify a higher quote if the scope is genuinely stronger.']
  ];
  return[
    ['SCOPE','Exactly what is included','A low price can become expensive if labor, materials, removal, cleanup, permits or related work are excluded.'],
    ['QUALITY','Material / equipment grade','Brand, specification, durability and warranty can make two superficially similar quotes economically different.'],
    ['COMPLEXITY','Difficulty of the work','Access, site conditions, customization, existing damage and sequencing all affect labor.'],
    ['LOCATION','Local market conditions','Labor rates, travel, permits, taxes and local competition can shift prices by geography.'],
    ['TIMING','Schedule pressure','Rush work, seasonal demand and constrained availability can raise the price.'],
    ['RISK','Who absorbs surprises','Stronger warranties, fixed-price terms and clearer responsibility for change orders can justify paying more upfront.']
  ]}
  function classify(adjusted,low,high){const width=Math.max(high-low,Math.max(1,(low+high)/2*.08));if(adjusted<low-width*.65)return['VERY LOW','Well below your benchmark'];if(adjusted<low)return['LOW','Below your benchmark'];if(adjusted<=high)return['FAIR','Inside your benchmark'];if(adjusted<=high+width*.65)return['HIGH','Above your benchmark'];return['VERY HIGH','Well above your benchmark']}
  function render(){const p=ensurePanels();if(!p)return;const quote=num('fp-quote'),scope=clamp(num('fp-scope')||100,1,100),lowIn=num('fp-low'),highIn=num('fp-high'),comps=[num('fp-comp1'),num('fp-comp2'),num('fp-comp3')].filter(x=>x>0),adjusted=quote/(scope/100),hasRange=lowIn>0&&highIn>=lowIn,hasEvidence=hasRange||comps.length>0;
    if(!hasEvidence){p.pos.innerHTML='<div class="fp-no-benchmark"><strong>No fair-price position yet.</strong><p>ExpenseIntel has the quote, but it does not have price evidence tied closely enough to this job to place you on the spectrum. Add a benchmark range or comparable quotes. The connected BLS/Treasury data can explain the backdrop, but it cannot prove this specific quote is cheap or expensive.</p></div>';p.factors.innerHTML='';return}
    const compLow=comps.length?Math.min(...comps):0,compHigh=comps.length?Math.max(...comps):0;
    const low=hasRange?lowIn:compLow,high=hasRange?highIn:compHigh,mid=hasRange?(low+high)/2:median(comps),width=Math.max(high-low,mid*.08),axisLow=Math.max(0,low-width),axisHigh=high+width,position=clamp((adjusted-axisLow)/(axisHigh-axisLow)*100,0,100),[call,sub]=classify(adjusted,low,high),delta=mid?adjusted-mid:0,deltaPct=mid?delta/mid*100:0;
    let summary='';
    if(call==='FAIR')summary=`Your scope-adjusted quote is ${money(adjusted)}, which sits inside the ${money(low)}–${money(high)} fair range supported by the evidence you entered. It is ${money(Math.abs(delta))} (${Math.abs(deltaPct).toFixed(1)}%) ${delta>=0?'above':'below'} the evidence midpoint. That makes this look broadly fair—not automatically the cheapest option, but not materially overpriced on the current evidence.`;
    else if(call==='LOW'||call==='VERY LOW')summary=`Your scope-adjusted quote is ${money(adjusted)}, below the ${money(low)} lower edge of your benchmark. That can be a good deal, but a low quote is only attractive if the scope, materials, warranty and exclusions really match the comparables. The farther below the benchmark it sits, the more important it is to check what may be missing.`;
    else summary=`Your scope-adjusted quote is ${money(adjusted)}, above the ${money(high)} upper edge of your benchmark. That does not automatically mean the quote is bad, but the contractor should be able to explain the premium through stronger scope, materials, access difficulty, warranty, schedule or another concrete difference.`;
    p.pos.innerHTML=`<div class="fp-position-head"><span>Where your price sits</span><b>${sub}</b></div><div class="fp-position-body"><div class="fp-position-call"><div><span class="fp-call-label">ExpenseIntel position</span><strong>${call}</strong></div><p>${summary}</p></div><div class="fp-spectrum"><div class="fp-spectrum-track"><div class="fp-zone vlow"></div><div class="fp-zone low"></div><div class="fp-zone fair"></div><div class="fp-zone high"></div><div class="fp-zone vhigh"></div></div><div class="fp-marker" style="left:${position}%"><div class="fp-marker-label">YOU · ${money(adjusted)}</div></div><div class="fp-spectrum-labels"><span>Very low</span><span>Low</span><span>Fair</span><span>High</span><span>Very high</span></div><div class="fp-axis"><span>${money(axisLow)}</span><span>${money(axisHigh)}</span></div></div><div class="fp-thresholds"><div><span>Below this looks low</span><strong>&lt; ${money(low)}</strong></div><div><span>Evidence-backed fair zone</span><strong>${money(low)}–${money(high)}</strong></div><div><span>Above this looks elevated</span><strong>&gt; ${money(high)}</strong></div></div></div>`;
    const q=txt('fp-label'),fac=factorsFor(q);p.factors.innerHTML=`<div class="fp-factor-head"><span>What can legitimately move the price?</span><b>${scope}% scope completeness entered</b></div><div class="fp-factor-copy">A fair-price result is strongest when the quotes truly describe the same job. These are the factors most likely to explain why one quote can reasonably sit above or below another. Use them as a checklist before negotiating.</div><div class="fp-factors">${fac.map(([tag,title,copy])=>`<article class="fp-factor"><span>${tag}</span><strong>${title}</strong><p>${copy}</p></article>`).join('')}</div>`;
  }
  document.addEventListener('DOMContentLoaded',()=>{restoreNav();const form=$('[data-fairprice-form]');if(!form)return;form.addEventListener('submit',()=>setTimeout(render,0));['fp-label','fp-quote','fp-scope','fp-low','fp-high','fp-comp1','fp-comp2','fp-comp3'].forEach(id=>$(`#${id}`)?.addEventListener('input',()=>{clearTimeout(window.__fpExplainTimer);window.__fpExplainTimer=setTimeout(render,180)}));setTimeout(render,50)});
})();