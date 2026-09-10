(()=>{
  if(!(location.pathname==='/'||location.pathname.startsWith('/check/')))return;
  if(window.__eiClassicDashboardRestore)return;window.__eiClassicDashboardRestore=true;

  /* Restore the established ExpenseIntel Check result: the decision dashboard,
     readable graph, top cost metrics and Optimize & Save. Block the later Passport /
     workspace overlays that displaced this working result, while keeping the newer
     evidence and API intelligence underneath. Header ownership is intentionally left
     to the static shared shell. */

  const markScript=(attr)=>{if(document.querySelector(`script[${attr}]`))return;const s=document.createElement('script');s.type='application/json';s.setAttribute(attr,'');document.head.appendChild(s)};
  const markLink=(attr)=>{if(document.querySelector(`link[${attr}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href='data:text/css,';l.setAttribute(attr,'');document.head.appendChild(l)};
  markScript('data-ei-clarity-js');markLink('data-ei-clarity-css');
  markScript('data-ei-passport-js');markLink('data-ei-passport-css');
  markScript('data-ei-lab-js');markLink('data-ei-lab-css');
  if(document.currentScript)document.currentScript.setAttribute('data-ei-twin-js','');

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
    '/check/intelligence-v17-loader.js',
    '/check/sprint-bundle-v18.js'
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

  function cleanupLaterOverlays(){
    $$('.ei-passport-overview,.ei-live-passport,.ei-workspace-nav,.ei-action-bridge,details.ei-decision-lab').forEach(x=>x.remove());
    unwrapProductMap();
  }

  async function start(){
    css.forEach(addCss);
    cleanupLaterOverlays();
    for(const src of js)await addScript(src);
    cleanupLaterOverlays();
    setTimeout(cleanupLaterOverlays,550);
    setTimeout(cleanupLaterOverlays,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,20),{once:true});
  else setTimeout(start,20);
})();
