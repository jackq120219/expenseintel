(()=>{
  const $=s=>document.querySelector(s);
  const txt=s=>($(s)?.textContent||'').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function hash(input){let h=2166136261;for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).toUpperCase().padStart(8,'0').slice(0,8)}
  function parseMoney(s){const t=String(s||'').replace(/[$,~\s]/g,'');const m=t.match(/-?[\d.]+/);if(!m)return 0;let n=Number(m[0]);if(/[kK]/.test(t))n*=1000;if(/[mM]/.test(t))n*=1000000;return Number.isFinite(n)?n:0}
  function sourceState(sel){const v=txt(sel).toLowerCase();return v&&v!=='—'&&!v.includes('unavailable')&&!v.includes('loading')&&!v.includes('temporarily')}
  function strongestDriver(){
    const items=[['Electricity','[data-full-electric]'],['Natural gas','[data-full-gas]'],['Water + sewer','[data-full-water]'],['Property tax','[data-full-tax]'],['Insurance','[data-full-insurance]'],['Waste + other','[data-full-other]']];
    return items.map(([name,sel])=>({name,value:parseMoney(txt(sel))})).sort((a,b)=>b.value-a.value)[0]||{name:'—',value:0};
  }
  function evidence(){
    let backed=0;
    if(txt('[data-full-address]'))backed++;
    if(txt('[data-full-locationmeta]'))backed++;
    if(sourceState('[data-eia-electric-rate]'))backed++;
    if(sourceState('[data-eia-gas-rate]'))backed++;
    if(sourceState('[data-cbecs-intensity]'))backed++;
    if(sourceState('[data-nri-risk]'))backed++;
    return {backed,modeled:4,total:10};
  }
  function injectStyles(){
    if($('#ei-passport-style'))return;
    const style=document.createElement('style');style.id='ei-passport-style';style.textContent=`
      .ei-passport{border-bottom:1px solid var(--ink);background:#f4ffb5}.ei-passport-top{display:grid;grid-template-columns:1fr auto;align-items:stretch}.ei-passport-title{padding:17px 20px;border-right:1px solid var(--ink)}.ei-passport-title span{display:block;font:800 9px var(--mono);text-transform:uppercase;letter-spacing:.09em;color:var(--muted)}.ei-passport-title strong{display:block;font:400 26px/1 var(--serif);margin-top:6px}.ei-passport-id{padding:17px 20px;display:flex;flex-direction:column;justify-content:center;min-width:170px}.ei-passport-id span{font:800 8px var(--mono);text-transform:uppercase;color:var(--muted)}.ei-passport-id b{font:800 14px var(--mono);margin-top:6px}.ei-passport-grid{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--ink)}.ei-passport-cell{padding:14px 15px;border-right:1px solid var(--ink);min-height:92px}.ei-passport-cell:last-child{border-right:0}.ei-passport-cell span{display:block;font:800 8px var(--mono);text-transform:uppercase;color:var(--muted)}.ei-passport-cell strong{display:block;font:800 13px/1.25 var(--mono);margin-top:15px}.ei-passport-actions{display:flex;gap:8px;flex-wrap:wrap;padding:12px 14px;border-top:1px solid var(--ink);background:#ece8dc}.ei-passport-actions button,.ei-passport-actions a{appearance:none;border:1px solid var(--ink);background:var(--white);color:var(--ink);padding:9px 11px;font:800 8px var(--mono);text-transform:uppercase;text-decoration:none;cursor:pointer}.ei-passport-actions button:hover,.ei-passport-actions a:hover{background:var(--lime)}
      @media(max-width:900px){.ei-passport-grid{grid-template-columns:1fr 1fr}.ei-passport-cell{border-bottom:1px solid var(--ink)}.ei-passport-cell:nth-child(2n){border-right:0}.ei-passport-cell:last-child{grid-column:1/-1}.ei-passport-top{grid-template-columns:1fr}.ei-passport-title{border-right:0;border-bottom:1px solid var(--ink)}}
      @media print{body{background:#fff!important}.topline,.site-nav,.screen-head,.screen-panel,.empty-state,footer,.ei-passport-actions{display:none!important}.screen-workspace{padding:0!important}.shell{max-width:none!important;width:100%!important;padding:0!important}.workspace-grid{display:block!important}.full-result{display:block!important;border:1px solid #111!important}.full-result *{-webkit-print-color-adjust:exact;print-color-adjust:exact}.ei-passport{page-break-inside:avoid}.result-actions{display:none!important}}
    `;document.head.appendChild(style);
  }
  function shell(){
    const full=$('[data-full-result]');if(!full)return null;
    let p=full.querySelector('.ei-passport');
    if(p)return p;
    p=document.createElement('section');p.className='ei-passport';p.innerHTML=`<div class="ei-passport-top"><div class="ei-passport-title"><span>ExpenseIntel / Cost Passport</span><strong data-passport-address>Location cost identity</strong></div><div class="ei-passport-id"><span>Decision ID</span><b data-passport-id>EI-LOC-00000000</b></div></div><div class="ei-passport-grid"><div class="ei-passport-cell"><span>Annual range</span><strong data-passport-range>—</strong></div><div class="ei-passport-cell"><span>Expense risk</span><strong data-passport-risk>—</strong></div><div class="ei-passport-cell"><span>Evidence mix</span><strong data-passport-evidence>—</strong></div><div class="ei-passport-cell"><span>Largest cost driver</span><strong data-passport-driver>—</strong></div><div class="ei-passport-cell"><span>Top hazard signal</span><strong data-passport-hazard>—</strong></div></div><div class="ei-passport-actions"><button type="button" data-passport-copy>Copy decision summary</button><button type="button" data-passport-print>Print / Save PDF</button><a href="/matrix/">Open Location Matrix →</a><a href="/tools/">Decision Engines →</a></div>`;
    full.querySelector('.result-banner')?.insertAdjacentElement('afterend',p);
    p.querySelector('[data-passport-print]')?.addEventListener('click',()=>window.print());
    p.querySelector('[data-passport-copy]')?.addEventListener('click',copySummary);
    return p;
  }
  function snapshot(){
    const address=txt('[data-full-address]');
    if(!address)return null;
    const use=$('[name="use"]')?.value||'property';
    const sqft=$('[name="sqft"]')?.value||'';
    const range=txt('[data-full-range]')||txt('[data-full-total]');
    const risk=[txt('[data-full-risk]'),txt('[data-full-risk-label]')].filter(Boolean).join('/100 · ').replace('/100 · /100','/100');
    const ev=evidence();
    const driver=strongestDriver();
    const hazard=txt('[data-nri-top]')||'No FEMA signal loaded';
    const id='EI-LOC-'+hash(`${address}|${use}|${sqft}`);
    return {address,use,sqft,range,risk,ev,driver,hazard,id};
  }
  function update(){
    const full=$('[data-full-result]');if(!full?.classList.contains('show'))return;
    const data=snapshot();if(!data)return;
    const p=shell();if(!p)return;
    p.querySelector('[data-passport-address]').textContent=data.address;
    p.querySelector('[data-passport-id]').textContent=data.id;
    p.querySelector('[data-passport-range]').textContent=data.range;
    p.querySelector('[data-passport-risk]').textContent=data.risk||'—';
    p.querySelector('[data-passport-evidence]').textContent=`${data.ev.backed} evidence-backed · ${data.ev.modeled} modeled`;
    p.querySelector('[data-passport-driver]').textContent=data.driver.value?`${data.driver.name} · ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(data.driver.value)}`:data.driver.name;
    p.querySelector('[data-passport-hazard]').textContent=data.hazard;
  }
  async function copySummary(){
    const d=snapshot();if(!d)return;
    const summary=`ExpenseIntel Cost Passport\n${d.id}\n${d.address}\n${d.use}${d.sqft?` · ${Number(d.sqft).toLocaleString()} ft²`:''}\nAnnual range: ${d.range}\nExpense risk: ${d.risk}\nEvidence: ${d.ev.backed} evidence-backed / ${d.ev.modeled} modeled layers\nLargest cost driver: ${d.driver.name}\nTop hazard signal: ${d.hazard}\nGenerated at expenseintel.com`;
    try{await navigator.clipboard.writeText(summary);const b=$('[data-passport-copy]');if(b){const old=b.textContent;b.textContent='Copied ✓';setTimeout(()=>b.textContent=old,1400)}}catch(_e){}
  }
  function patchNav(){
    const nav=$('.navlinks');if(!nav)return;
    if(!nav.querySelector('a[href="/tools/"]')){const a=document.createElement('a');a.href='/tools/';a.textContent='Tools';nav.insertBefore(a,nav.children[1]||null)}
    if(!nav.querySelector('a[href="/matrix/"]')){const a=document.createElement('a');a.href='/matrix/';a.textContent='Matrix';nav.insertBefore(a,nav.querySelector('a[href="/compare/"]')||null)}
  }
  function init(){injectStyles();patchNav();const full=$('[data-full-result]');if(!full)return;const obs=new MutationObserver(()=>{update();setTimeout(update,400)});obs.observe(full,{subtree:true,childList:true,attributes:true,characterData:true});update();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();