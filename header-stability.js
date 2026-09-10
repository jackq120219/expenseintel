(()=>{
  'use strict';
  const nav=document.querySelector('.navlinks');
  const right=document.querySelector('.navright');
  if(nav)nav.dataset.eiStable='1';
  if(right)right.dataset.eiStable='1';
  document.documentElement.dataset.eiHeaderStable='1';

  const warmed=new Set();
  const prerendered=new Set();
  const sameOriginPath=href=>{
    try{
      const u=new URL(href,location.href);
      return u.origin===location.origin ? (u.pathname+u.search) : '';
    }catch(_e){return ''}
  };
  const prefetch=href=>{
    const path=sameOriginPath(href);
    if(!path||warmed.has(path)||path===location.pathname)return;
    warmed.add(path);
    const l=document.createElement('link');
    l.rel='prefetch';
    l.as='document';
    l.href=path;
    document.head.appendChild(l);
  };
  const prerender=href=>{
    const path=sameOriginPath(href);
    if(!path||prerendered.has(path)||path===location.pathname||!HTMLScriptElement.supports?.('speculationrules'))return;
    prerendered.add(path);
    const s=document.createElement('script');
    s.type='speculationrules';
    s.textContent=JSON.stringify({prerender:[{source:'list',urls:[path]}]});
    document.head.appendChild(s);
  };

  const links=[...document.querySelectorAll('.site-nav a[href]')].filter(a=>sameOriginPath(a.href));
  const warm=()=>links.forEach(a=>prefetch(a.href));
  if('requestIdleCallback'in window)requestIdleCallback(warm,{timeout:900});else setTimeout(warm,250);

  links.forEach(a=>{
    const href=a.href;
    const prepare=()=>{prefetch(href);prerender(href)};
    a.addEventListener('pointerenter',prepare,{passive:true});
    a.addEventListener('focus',prepare);
    a.addEventListener('pointerdown',prepare,{passive:true});
  });
})();
