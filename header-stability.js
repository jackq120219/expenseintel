(()=>{
  'use strict';
  const nav=document.querySelector('.navlinks');
  const right=document.querySelector('.navright');
  if(nav)nav.dataset.eiStable='1';
  if(right)right.dataset.eiStable='1';
  document.documentElement.dataset.eiHeaderStable='1';

  /* This layer intentionally does not rewrite header labels. The base app is the
     single source of truth for nav content; this file only improves continuity. */
  const prefetched=new Set();
  const sameOriginPath=href=>{
    try{
      const u=new URL(href,location.href);
      return u.origin===location.origin ? (u.pathname+u.search+u.hash) : '';
    }catch(_e){return ''}
  };
  const prefetch=href=>{
    const path=sameOriginPath(href);
    if(!path||prefetched.has(path)||path===location.pathname)return;
    prefetched.add(path);
    const l=document.createElement('link');
    l.rel='prefetch';
    l.as='document';
    l.href=path;
    document.head.appendChild(l);
  };
  const links=[...document.querySelectorAll('.site-nav a[href],.ei-identity-rail a[href]')];
  const warm=()=>links.forEach(a=>prefetch(a.getAttribute('href')||''));
  if('requestIdleCallback'in window)requestIdleCallback(warm,{timeout:1400});else setTimeout(warm,500);
  links.forEach(a=>{
    const href=a.getAttribute('href')||'';
    a.addEventListener('pointerenter',()=>prefetch(href),{passive:true});
    a.addEventListener('focus',()=>prefetch(href));
  });
})();
