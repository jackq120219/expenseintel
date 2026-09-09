(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)):'—';
  const readActive=()=>{try{return JSON.parse(localStorage.getItem('ei_active_decision')||'{}')||{}}catch(_e){return{}}};
  function source(){const a=readActive();return clean([a.text,a.title,$('#check-text')?.value,$('[data-result-title]')?.textContent].filter(Boolean).join(' '));}
  function porsche911(){const t=source();return /\bPorsche\b/i.test(t)&&/\b911\b/i.test(t)&&/\bCarrera\b/i.test(t)}
  function deDupe(){
    $$('input,[data-result-title],.check-output-top h2,.ei-car-ask strong').forEach(el=>{
      const s=('value'in el?el.value:el.textContent)||'';
      const d=clean(s).replace(/\b911 Carrera\s+911 Carrera\b/ig,'911 Carrera').replace(/\bCarrera\s+Carrera\b/ig,'Carrera');
      if(d!==s){if('value'in el)el.value=d;else el.textContent=d}
    });
  }
  function hideBrokenModel(){const pass=$('.ei-live-passport');if(pass)pass.classList.add('ei-v23-secondary-model')}
  async function buildVehicleBrief(){
    if(!porsche911())return;
    const out=$('[data-check-output] .shell');if(!out||out.querySelector('[data-ei-v23-auto]'))return;
    const host=document.createElement('section');host.dataset.eiV23Auto='1';host.className='ei-v23-auto';
    host.innerHTML='<div class="ei-v23-loading">Finding current Porsche price context automatically…</div>';
    const anchor=$('.check-output-top',out);anchor?.insertAdjacentElement('afterend',host);
    try{
      const r=await fetch('/api/vehicle-reference?make=Porsche&model=911%20Carrera');
      const d=await r.json();if(!r.ok||!d.ok)throw new Error('reference unavailable');
      const a=readActive(),exact=Number(a.price)||Number($('#check-price')?.value)||0;
      host.innerHTML=`<div class="ei-v23-head"><div><span>AUTOMATIC VEHICLE BRIEF</span><h3>2026 Porsche 911 Carrera</h3><p>ExpenseIntel found useful Porsche pricing context without making you fill out a form first.</p></div><div class="ei-v23-status">${exact?'Exact price entered':'Exact dealer price still needed'}</div></div><div class="ei-v23-grid"><article><span>PORSCHE STARTING MSRP</span><strong>${money(d.startingMsrp)}</strong><small>Official Porsche starting MSRP context. Base vehicle only; options and fees can move the configured price substantially.</small></article><article><span>OBSERVED 2026 PORSCHE FINDER RANGE</span><strong>${money(d.configuredRange.min)}–${money(d.configuredRange.max)}</strong><small>${d.configuredRange.count} official Porsche Finder asking/MSRP observations. Median observed listing: ${money(d.configuredRange.median)}.</small></article><article><span>YOUR DEAL PRICE</span><strong>${exact?money(exact):'Not entered yet'}</strong><small>${exact?'This number can now be compared with the market context above.':'Paste the dealer\'s actual selling price and ExpenseIntel will rebuild the decision around your deal.'}</small></article></div><div class="ei-v23-action"><div><span>Make this deal-specific</span><p>Enter only the dealer price. ExpenseIntel already has the vehicle and market context.</p></div><form data-v23-price><label class="sr-only" for="ei-v23-price">Dealer price</label><input id="ei-v23-price" inputmode="decimal" placeholder="Dealer price, e.g. 169500" value="${exact||''}"><button type="submit">Use dealer price →</button></form></div><details class="ei-v23-sources"><summary>See the Porsche sources</summary><div>${d.configuredListings.map(x=>`<a href="${x.url}" target="_blank" rel="noopener">${x.label} · ${money(x.price)}</a>`).join('')}<a href="${d.startingMsrpUrl}" target="_blank" rel="noopener">Porsche USA starting MSRP source · ${money(d.startingMsrp)}</a><p>${d.note}</p></div></details>`;
      const form=$('[data-v23-price]',host);form?.addEventListener('submit',e=>{e.preventDefault();const n=Number(String($('#ei-v23-price',host)?.value||'').replace(/[$,\s]/g,''));if(!(n>0))return;const price=$('#check-price'),text=$('#check-text'),describe=$('[data-mode="describe"]');describe?.click();if(price){price.value=String(Math.round(n));price.dataset.userEdited='1'}if(text&&!/dealer price/i.test(text.value)){text.value=clean(`${text.value||source()} Dealer price $${Math.round(n).toLocaleString()}.`);text.dataset.userEdited='1'}$('[data-check-form]')?.requestSubmit?.()});
    }catch(_e){host.innerHTML='<div class="ei-v23-loading">Vehicle identified. Add the dealer price to make this check deal-specific.</div>'}
  }
  function simplifyExisting(){
    deDupe();hideBrokenModel();
    $$('button,a').forEach(el=>{const t=clean(el.textContent).toUpperCase();if(t==='APPLY REFINED BASELINE')el.textContent='Update this estimate';if(t==='BUILD TRUECOST')el.textContent='See full cost';if(t==='TEST TIMING')el.textContent='Buy now or wait?';if(t==='SAVE / WATCH')el.textContent='Watch this decision'});
  }
  function enhance(){simplifyExisting();buildVehicleBrief()}
  function boot(){enhance();const root=$('[data-check-output]')||document.body;let q=false;new MutationObserver(()=>{if(q)return;q=true;setTimeout(()=>{q=false;enhance()},30)}).observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();