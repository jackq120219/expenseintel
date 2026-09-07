(()=>{
  'use strict';
  const nav=document.querySelector('.navlinks');
  if(!nav)return;
  const path=location.pathname;
  const key=path.startsWith('/twin/')?'Twin':path.startsWith('/watch/')?'Watch':(path.startsWith('/project/')||path.startsWith('/find/')||path.startsWith('/analyze/')||path.startsWith('/screen/')||path.startsWith('/simulate/')||path.startsWith('/matrix/')||path.startsWith('/compare/')||path.startsWith('/tools/')||path.startsWith('/forecast/')||path.startsWith('/expense-map/'))?'Project':(path.startsWith('/data/')||path.startsWith('/developers/'))?'Evidence':(path.startsWith('/about/')||path.startsWith('/pricing/'))?'About':'Check';
  const items=[['/check/','Check'],['/twin/','Twin'],['/watch/','Watch'],['/project/','Project'],['/data/','Evidence'],['/about/','About']];
  const signature=items.map(x=>x[1]).join('|');
  const current=[...nav.querySelectorAll(':scope>a')].map(a=>a.textContent.trim()).join('|');
  if(current!==signature){
    nav.innerHTML='';
    for(const [href,label] of items){const a=document.createElement('a');a.href=href;a.textContent=label;nav.appendChild(a)}
  }
  const links=[...nav.querySelectorAll(':scope>a')];
  const setActive=label=>links.forEach(a=>{
    const active=a.textContent.trim()===label;
    a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  setActive(key);
  nav.dataset.eiStable='1';

  const right=document.querySelector('.navright');
  if(right){
    right.innerHTML='';
    const secondary=document.createElement('a');secondary.className='textbtn';secondary.href='/truecost/';secondary.textContent='TrueCost';
    const primary=document.createElement('a');primary.className='solidbtn';primary.href='/check/';primary.textContent='New check';
    right.append(secondary,primary);
  }

  /* Warm the six primary documents in idle time so cross-document navigation has less visible loading. */
  const prefetched=new Set();
  const prefetch=href=>{
    if(prefetched.has(href)||href===location.pathname)return;prefetched.add(href);
    const l=document.createElement('link');l.rel='prefetch';l.as='document';l.href=href;document.head.appendChild(l);
  };
  const warmAll=()=>items.forEach(([href])=>prefetch(href));
  if('requestIdleCallback'in window)requestIdleCallback(warmAll,{timeout:1800});else setTimeout(warmAll,700);

  links.forEach(a=>{
    const label=a.textContent.trim(),href=a.getAttribute('href')||'';
    a.addEventListener('pointerenter',()=>prefetch(href),{passive:true});
    a.addEventListener('focus',()=>prefetch(href));
    a.addEventListener('pointerdown',()=>setActive(label),{passive:true});
  });

  addEventListener('pageshow',()=>setActive(key),{passive:true});
})();
