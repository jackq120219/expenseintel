(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const path=location.pathname;
  let workspaceSig='',workspaceRaf=0;

  function loadKinetic(){
    if(!document.querySelector('link[data-ei-kinetic-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/kinetic-system.css';l.dataset.eiKineticCss='';document.head.appendChild(l)}
    if(!document.querySelector('script[data-ei-kinetic-js]')){const s=document.createElement('script');s.src='/kinetic-system.js';s.defer=true;s.dataset.eiKineticJs='';document.head.appendChild(s)}
  }

  function normalizeProductNav(){
    const nav=$('.navlinks');if(!nav)return;
    const links=[['/check/','Check'],['/twin/','Twin'],['/watch/','Watch'],['/project/','Project'],['/data/','Evidence'],['/about/','About']];
    const active=href=>href==='/check/'?(path==='/'||path.startsWith('/check/')||path.startsWith('/fairprice/')||path.startsWith('/truecost/')||path.startsWith('/timing/')||path.startsWith('/shock/')):path.startsWith(href);
    nav.innerHTML=links.map(([href,label])=>`<a href="${href}"${active(href)?' class="active"':''}>${label}</a>`).join('');
    const right=$('.navright');if(right){
      const text=$('.textbtn',right),solid=$('.solidbtn',right);
      if(text){text.href=path.startsWith('/twin/')?'/check/':'/truecost/';text.textContent=path.startsWith('/twin/')?'Check':'TrueCost'}
      if(solid){solid.href=path==='/'||path.startsWith('/check/')?'#check-form':'/check/';solid.textContent=path==='/'||path.startsWith('/check/')?'Run a check':'New check'}
    }
  }

  function addTwinToFooter(){
    const cols=$$('.footer-col');if(!cols.length||$('footer a[href="/twin/"]'))return;
    const start=cols.find(c=>/start/i.test($('h4',c)?.textContent||''))||cols[0];
    const a=document.createElement('a');a.href='/twin/';a.textContent='Decision Twin';const watch=$('a[href="/watch/"]',start);watch?start.insertBefore(a,watch):start.appendChild(a);
  }

  function repairDecisionDock(){
    const d=$('.active-decision-dock');if(!d)return;
    const actions=$('.ead-actions',d);if(!actions)return;
    if(!$('a[href="/twin/"]',actions)){
      const twin=document.createElement('a');twin.href='/twin/';twin.textContent='Twin';const check=$('a[href="/check/"]',actions);check?.insertAdjacentElement('afterend',twin);
    }
    $$('a',actions).forEach(a=>{a.style.pointerEvents='auto';if(a.dataset.eiClickReady)return;a.dataset.eiClickReady='1';a.addEventListener('click',()=>a.setAttribute('aria-busy','true'),{once:true})});
  }

  function compactExplanations(){
    if(!(path==='/'||path.startsWith('/check/'))||$('.ei-product-map'))return;
    const how=$('.check-how'),deep=$('.check-deep');if(!how||!deep||how.parentNode!==deep.parentNode)return;
    const details=document.createElement('details');details.className='ei-product-map';
    const summary=document.createElement('summary');summary.innerHTML='<span>Product map</span><b>How the Passport works + specialist engines</b>';
    how.parentNode.insertBefore(details,how);details.append(summary,how,deep);
  }

  function actionBridge(root){
    if(!root||$('.ei-action-bridge',root))return;
    const command=$('.decision-command',root)||$('.check-output-top',root);if(!command)return;
    const el=document.createElement('section');el.className='ei-action-bridge';
    el.innerHTML='<div><span>After the call</span><strong>Simulate the commitment or turn evidence into leverage.</strong></div><nav><a href="/twin/">Open Decision Twin ↗</a><a href="#negotiation-intelligence" data-jump-neg>Negotiation ↓</a></nav>';
    command.insertAdjacentElement('afterend',el);
    $('[data-jump-neg]',el)?.addEventListener('click',e=>{const n=$('.ei-negotiation',root);if(n){e.preventDefault();n.id='negotiation-intelligence';n.scrollIntoView({behavior:'smooth',block:'start'})}});
  }

  function getWorkspaceTargets(root){
    const candidates=[
      ['Call',$('.decision-command',root)],
      ['Passport',$('.ei-live-passport',root)],
      ['Twin',$('.ei-decision-twin',root)],
      ['Negotiate',$('.ei-negotiation',root)],
      ['Metrics',$('.ei-metrics-lab',root)],
      ['Advanced',$('details.ei-decision-lab',root)]
    ];
    return candidates.filter(x=>x[1]);
  }

  function refreshWorkspace(){
    const out=$('[data-check-output]'),root=$('[data-check-output] .shell');if(!out||!root||out.hidden||!$('.decision-command',root))return;
    out.classList.add('ei-result-arrived');actionBridge(root);
    const targets=getWorkspaceTargets(root),sig=targets.map(([n,e])=>n+':'+e.className).join('|'),existingNav=$('.ei-workspace-nav',root);
    if(!targets.length||(sig===workspaceSig&&existingNav))return;workspaceSig=sig;
    let nav=existingNav;if(!nav){nav=document.createElement('div');nav.className='ei-workspace-nav';nav.innerHTML='<span>Decision path</span><div class="ei-workspace-track"></div><div class="ei-workspace-progress"><i></i></div>';root.insertBefore(nav,root.firstChild)}
    const track=$('.ei-workspace-track',nav);track.innerHTML='';
    targets.forEach(([name,el],i)=>{el.dataset.eiWorkspace=String(i);if(name==='Twin')el.id='decision-twin';if(name==='Negotiate')el.id='negotiation-intelligence';const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.ws=String(i);b.addEventListener('click',()=>el.scrollIntoView({behavior:'smooth',block:'start'}));track.appendChild(b)});
    const update=()=>{
      workspaceRaf=0;const navBottom=($('.site-nav')?.getBoundingClientRect().bottom||0)+($('.ei-workspace-nav',root)?.offsetHeight||0)+18;let active=0;
      targets.forEach(([,el],i)=>{if(el.getBoundingClientRect().top<=navBottom)active=i});
      $$('button',track).forEach((b,i)=>{b.classList.toggle('active',i===active);b.classList.toggle('done',i<active)});
      const progress=$('.ei-workspace-progress i',nav);if(progress)progress.style.transform=`scaleX(${targets.length<=1?1:active/(targets.length-1)})`;
      document.documentElement.style.setProperty('--ei-nav-bottom',`${Math.round($('.site-nav')?.getBoundingClientRect().bottom||68)}px`);
    };
    const onScroll=()=>{if(!workspaceRaf)workspaceRaf=requestAnimationFrame(update)};
    if(!nav.dataset.bound){nav.dataset.bound='1';addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll)}update();
  }

  function stableMajorPanels(){
    const panels=['.ei-live-passport','.ei-decision-twin','.ei-negotiation','.ei-metrics-lab','details.ei-decision-lab'];
    panels.flatMap(s=>$$(s)).forEach(el=>{if(el.dataset.eiStable==='1')return;el.dataset.eiStable='1';el.style.contain='layout paint'});
  }

  function watchDynamicResult(){
    const out=$('[data-check-output]');if(!out)return;let timer=0;const run=()=>{clearTimeout(timer);timer=setTimeout(()=>{refreshWorkspace();stableMajorPanels();repairDecisionDock()},80)};
    new MutationObserver(run).observe(out,{subtree:true,childList:true});run();
  }

  function init(){normalizeProductNav();loadKinetic();addTwinToFooter();compactExplanations();repairDecisionDock();watchDynamicResult();setTimeout(()=>{normalizeProductNav();repairDecisionDock();refreshWorkspace()},450)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
