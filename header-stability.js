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

  /* Conversion experiment: show a truthful next step AFTER the free result renders. */
  const wireCheckOffer=()=>{
    if(!location.pathname.startsWith('/check/'))return;
    const root=document.querySelector('[data-check-output] .shell');
    if(!root)return;
    const reveal=()=>{
      if(!root.querySelector('[data-result-title]')||root.querySelector('[data-deep-check-offer]'))return;
      const aside=document.createElement('aside');aside.dataset.deepCheckOffer='1';
      aside.style.cssText='margin:24px 0 32px;padding:22px;border:1px solid #262e24;background:#f6f3e8;max-width:860px';
      const eyebrow=document.createElement('small');eyebrow.textContent='OPTIONAL NEXT STEP · SANDBOX';eyebrow.style.cssText='font-weight:750;letter-spacing:.08em';
      const title=document.createElement('h3');title.textContent='Need to compare two options, not just check one?';title.style.margin='12px 0';
      const copy=document.createElement('p');copy.textContent='Keep this free Check. The $19 Deep Check test adds side-by-side total costs, assumption stress cases, scope-gap questions and a private printable dossier. Figures come from you; no real payment is collected in sandbox.';copy.style.lineHeight='1.6';
      const button=document.createElement('a');button.href='/deep-check/?from=free-check';button.textContent='Preview Deep Check →';button.style.cssText='display:inline-block;padding:13px 18px;background:#202820;color:#fff;text-decoration:none;font-weight:700';
      aside.append(eyebrow,title,copy,button);root.appendChild(aside);
    };
    new MutationObserver(reveal).observe(root,{childList:true});
    reveal();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireCheckOffer,{once:true});
  else wireCheckOffer();

  /* Warm the five primary destinations once the current page is idle. */
  const warmPrimary=()=>primaryPaths.forEach(prefetch);
  if('requestIdleCallback' in window)requestIdleCallback(warmPrimary,{timeout:1200});
  else setTimeout(warmPrimary,450);
})();
