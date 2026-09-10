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

  /* Warm the five primary destinations once the current page is idle.
     This keeps clicks from waiting on the next HTML document over slower Wi-Fi. */
  const warmPrimary=()=>primaryPaths.forEach(prefetch);
  if('requestIdleCallback' in window)requestIdleCallback(warmPrimary,{timeout:1200});
  else setTimeout(warmPrimary,450);
})();
