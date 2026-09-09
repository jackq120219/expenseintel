(()=>{
  if(!(location.pathname==='/'||location.pathname.startsWith('/check/')))return;

  /* Compatibility loader: restore the established ExpenseIntel Check result that had
     the decision dashboard, readable chart, key total-cost metrics and Optimize & Save.
     Keep the newer evidence/API work underneath; remove only the later overlay UX that
     displaced the working dashboard. */

  const css=[
    '/check/decision-dashboard-v2.css',
    '/check/chart-polish-v4.css',
    '/check/metric-expansion-v5.css',
    '/check/data-pedigree-v6.css',
    '/check/optimize-plan-v7.css',
    '/check/lease-consistency-v8.css',
    '/check/opportunity-model-v10.css',
    '/vehicle-sanity-v11.css',
    '/check/free-evidence-v15.css',
    '/check/optimizer-v16.css',
    '/check/intelligence-v17.css'
  ];
  const js=[
    '/check/lease-intel.js',
    '/check/model-first.js',
    '/check/decision-dashboard-v3.js',
    '/check/chart-polish-v4.js',
    '/check/metric-expansion-v5.js',
    '/check/data-pedigree-v6.js',
    '/check/opportunity-model-v10.js',
    '/vehicle-sanity-v11.js',
    '/check/free-evidence-v15.js',
    '/check/optimizer-v16.js',
    '/check/intelligence-v17-loader.js'
  ];

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function addCss(href){
    if($(`link[href="${href}"]`))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset.eiClassic='1';document.head.appendChild(l);
  }
  function addScript(src){
    if($(`script[src="${src}"]`))return Promise.resolve();
    return new Promise(resolve=>{const s=document.createElement('script');s.src=src;s.defer=true;s.dataset.eiClassic='1';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
  }

  function unwrapProductMap(){
    const d=$('details.ei-product-map');if(!d)return;
    const parent=d.parentNode;if(!parent)return;
    [...d.children].filter(x=>x.tagName!=='SUMMARY').forEach(x=>parent.insertBefore(x,d));d.remove();
  }

  function restoreNav(){
    const nav=$('.navlinks');if(nav){
      const links=[['/check/','Check'],['/watch/','Watch'],['/project/','Project Intel'],['/xray/','X-Ray'],['/data/','Evidence'],['/about/','About']];
      nav.innerHTML=links.map(([href,label],i)=>`<a href="${href}"${i===0?' class="active"':''}>${label}</a>`).join('');
    }
    const right=$('.navright');if(right)right.innerHTML='<a class="textbtn" href="/truecost/">TrueCost</a><a class="solidbtn" href="#check-form">Run a check</a>';
  }

  function cleanupLaterOverlays(){
    $$('.ei-passport-overview,.ei-live-passport,.ei-workspace-nav,.ei-action-bridge,details.ei-decision-lab').forEach(x=>x.remove());
    unwrapProductMap();
  }

  async function start(){
    css.forEach(addCss);
    cleanupLaterOverlays();restoreNav();
    for(const src of js)await addScript(src);
    cleanupLaterOverlays();restoreNav();
    setTimeout(()=>{cleanupLaterOverlays();restoreNav()},550);
    setTimeout(()=>{cleanupLaterOverlays();restoreNav()},1200);

    const out=$('[data-check-output]');
    if(out){
      let queued=false;
      new MutationObserver(()=>{
        if(queued)return;queued=true;
        requestAnimationFrame(()=>{queued=false;cleanupLaterOverlays()});
      }).observe(out,{subtree:true,childList:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,40),{once:true});
  else setTimeout(start,40);
})();
