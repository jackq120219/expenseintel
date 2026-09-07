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
  [...nav.querySelectorAll(':scope>a')].forEach(a=>{
    const active=a.textContent.trim()===key;
    a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  nav.dataset.eiStable='1';
  const right=document.querySelector('.navright');
  if(right){
    right.innerHTML='';
    const secondary=document.createElement('a');secondary.className='textbtn';secondary.href='/truecost/';secondary.textContent='TrueCost';
    const primary=document.createElement('a');primary.className='solidbtn';primary.href='/check/';primary.textContent='New check';
    right.append(secondary,primary);
  }
  const sync=()=>{
    const active=[...nav.querySelectorAll(':scope>a')].find(a=>a.textContent.trim()===key);
    if(active)active.classList.add('active');
  };
  addEventListener('pageshow',sync,{passive:true});
})();
