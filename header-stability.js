(()=>{
  'use strict';
  if(window.__eiHeaderStability)return;
  window.__eiHeaderStability=1;

  const legacySelector='.ei-identity-rail,.ei-signal-rail,.ei-lens-card,.ei-case-dock,.ei-commitment-bridge,.ei-next-card,.ei-evidence-contract,.ei-project-jump';
  const removeLegacy=root=>{
    if(!root)return;
    if(root.nodeType===1&&root.matches?.(legacySelector))root.remove();
    root.querySelectorAll?.(legacySelector).forEach(el=>el.remove());
  };
  removeLegacy(document);
  addEventListener('pageshow',()=>removeLegacy(document));
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes)removeLegacy(node);
    }
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}),{once:true});

  const warmed=new Set();
  const primaryPaths=['/check/','/watch/','/project/','/xray/','/data/'];
  const sameOriginPath=href=>{
    try{
      const u=new URL(href,location.href);
      return u.origin===location.origin ? u.pathname+u.search : '';
    }catch(_e){return ''}
  };
  const prefetch=href=>{
    const path=sameOriginPath(href);
    if(!path||path===location.pathname+location.search||warmed.has(path))return;
    warmed.add(path);
    const link=document.createElement('link');
    link.rel='prefetch';
    link.as='document';
    link.href=path;
    link.fetchPriority='low';
    document.head.appendChild(link);
  };

  const wireNavLinks=()=>{
    const links=[...document.querySelectorAll('.site-nav a[href]')].filter(a=>sameOriginPath(a.href));
    links.forEach(a=>{
      if(a.dataset.eiWarm==='1')return;
      a.dataset.eiWarm='1';
      const warm=()=>prefetch(a.href);
      a.addEventListener('pointerenter',warm,{passive:true});
      a.addEventListener('focus',warm);
      a.addEventListener('pointerdown',warm,{passive:true});
    });
  };
  wireNavLinks();

  /* Preview mode: only advertise what the sandbox dossier actually does. */
  const wireSandboxCheckout=()=>{
    if(location.pathname!=='/pricing/'&&location.pathname!=='/pricing')return;
    const card=document.querySelector('.price-card.featured');
    const cta=card?.querySelector('a.solidbtn');
    if(!cta)return;
    cta.href='/deep-check/';
    cta.textContent='Try $19 test checkout';
    const description=card.querySelector('p');
    if(description)description.textContent='Compare two options using your own quoted costs, test adverse assumptions and create a private, printable decision dossier. No independently verified price is promised.';
    const features=card.querySelectorAll('.price-list li');
    ['Two-option total-cost comparison','Entered, cost-pressure and operating-relief scenarios','Category-specific due-diligence questions','Saved dossier · print or save as PDF'].forEach((copy,i)=>{if(features[i])features[i].textContent=copy;});
    const status=card.querySelector('.planned');
    if(status)status.textContent='Sandbox only · no real charges; report requires sandbox integration setup';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireSandboxCheckout,{once:true});
  else wireSandboxCheckout();

  /* Warm the five primary destinations once the current page is idle. */
  const warmPrimary=()=>primaryPaths.forEach(prefetch);
  if('requestIdleCallback' in window)requestIdleCallback(warmPrimary,{timeout:1200});
  else setTimeout(warmPrimary,450);
})();
