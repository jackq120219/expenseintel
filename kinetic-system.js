(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let enhanceTimer=0;

  function navLocator(){
    const nav=$('.navlinks');if(!nav)return;
    nav.classList.add('ei-nav-kinetic');
    let loc=$('.ei-nav-locator',nav);if(!loc){loc=document.createElement('i');loc.className='ei-nav-locator';nav.appendChild(loc)}
    const links=()=>$$('a',nav).filter(a=>!a.classList.contains('ei-nav-locator'));
    const move=a=>{if(!a||innerWidth<760)return;const x=a.offsetLeft-5,w=a.offsetWidth+10;loc.style.width=`${w}px`;loc.style.transform=`translate3d(${x}px,-50%,0)`;nav.classList.add('ei-ready')};
    const home=()=>move(links().find(a=>a.classList.contains('active'))||links()[0]);
    links().forEach(a=>{
      if(a.dataset.eiNavBound==='1')return;a.dataset.eiNavBound='1';
      a.addEventListener('pointerenter',()=>move(a));a.addEventListener('focus',()=>move(a));
      a.addEventListener('click',e=>{
        if(reduced||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey||e.button>0)return;
        const href=a.getAttribute('href')||'';if(!href||href.startsWith('#')||href.startsWith('mailto:')||a.target==='_blank')return;
        let u;try{u=new URL(href,location.href)}catch(_e){return}if(u.origin!==location.origin)return;
        e.preventDefault();routeFlash();move(a);setTimeout(()=>{location.href=u.href},115);
      });
    });
    nav.onpointerleave=home;nav.addEventListener('focusout',e=>{if(!nav.contains(e.relatedTarget))home()});
    home();
    if(!nav.dataset.eiResizeBound){nav.dataset.eiResizeBound='1';addEventListener('resize',home,{passive:true})}
  }

  function routeFlash(){
    if(reduced)return;let f=$('.ei-route-flash');if(!f){f=document.createElement('i');f.className='ei-route-flash';document.body.appendChild(f)}
    const y=Math.round($('.site-nav')?.getBoundingClientRect().bottom||0);f.style.setProperty('--ei-route-y',`${y}px`);f.classList.remove('run');void f.offsetWidth;f.classList.add('run')
  }

  const scanSelectors=['.search-panel','.check-box','.decision-sheet','.check-card','.si-panel','.si-results','.module','.answer-card','.price-card','.ei-live-passport','.ei-decision-twin','.ei-negotiation','.ei-metrics-lab','.twin-workspace','.driver-card','.sensitivity-card','.target-card','.watch-card','.ei-history-card','.data-card','.si-discipline>div'];
  let scanObserver=null;
  function scanPanels(){
    if(reduced||!('IntersectionObserver'in window))return;
    if(!scanObserver)scanObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;if(el.dataset.eiScanned==='1'){scanObserver.unobserve(el);return}el.dataset.eiScanned='1';el.classList.add('ei-scan-live');setTimeout(()=>el.classList.remove('ei-scan-live'),900);scanObserver.unobserve(el)}),{threshold:.22,rootMargin:'0px 0px -8%'});
    [...new Set(scanSelectors.flatMap(s=>$$(s)))].forEach(el=>{if(el.dataset.eiScanBound==='1'||el.closest('[hidden]'))return;el.dataset.eiScanBound='1';el.classList.add('ei-kinetic-scan');if(!$(':scope > .ei-scan-line',el)){const line=document.createElement('i');line.className='ei-scan-line';el.appendChild(line)}scanObserver.observe(el)})
  }

  const gridSelectors=['.answer-grid','.check-engine-row','.si-discipline','.ei-recent-grid','.ei-history-list','.twin-analysis-grid','.twin-next-grid','.snapshot-grid','.meaning-grid'];
  function focusGrids(){
    gridSelectors.flatMap(s=>$$(s)).forEach(grid=>{
      if(grid.dataset.eiFocusBound==='1')return;grid.dataset.eiFocusBound='1';grid.classList.add('ei-focus-grid');
      [...grid.children].forEach(item=>{
        if(item.classList.contains('ei-scan-line'))return;item.classList.add('ei-focus-item');
        if(!$(':scope > .ei-focus-edge',item)){const edge=document.createElement('i');edge.className='ei-focus-edge';item.appendChild(edge)}
        const enter=()=>{grid.classList.add('ei-focus-active');item.classList.add('ei-focus-current')},leave=()=>{item.classList.remove('ei-focus-current');if(!grid.querySelector('.ei-focus-current'))grid.classList.remove('ei-focus-active')};
        item.addEventListener('pointerenter',enter);item.addEventListener('pointerleave',leave);item.addEventListener('focusin',enter);item.addEventListener('focusout',leave)
      })
    })
  }

  const actionSelectors=['a.solidbtn','.check-run','.si-run','.platform-run','.run','.check-actions a','.check-actions button','.si-actions a','.si-actions button','.twin-toolbar-actions button','.twin-steps button','.quick-row button','.stress-buttons button','.snapshot-actions button','.deck-footer button','.ei-action-bridge a','.ei-continue-actions button'];
  function actionSignals(){
    [...new Set(actionSelectors.flatMap(s=>$$(s)))].forEach(el=>{
      if(el.dataset.eiActionBound==='1')return;el.dataset.eiActionBound='1';el.classList.add('ei-action-signal');
      const p=document.createElement('i');p.className='ei-action-packet';el.appendChild(p);
      const fire=()=>{if(reduced)return;el.classList.remove('ei-action-fired');void el.offsetWidth;el.classList.add('ei-action-fired');setTimeout(()=>el.classList.remove('ei-action-fired'),520)};
      el.addEventListener('pointerdown',fire);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')fire()})
    })
  }

  const metricSelector='.twin-kpi strong,.twin-equation strong,.driver-row strong,.sensitivity-grid strong,.target-answer strong,.check-score strong,.check-facts strong,.check-evidence strong,.metric-row b,.big-num,.risk-score strong,[data-result-score],#tc-total,#sh-total,#fp-verdict,#tm-verdict,.ei-passport-lens strong,.ei-history-metrics strong,.decision-command-grid strong';
  const metricText=new WeakMap();
  function registerMetric(el){
    if(!el||!el.matches?.(metricSelector))return;const text=(el.textContent||'').trim();if(!text)return;const old=metricText.get(el);metricText.set(el,text);if(old==null||old===text||reduced)return;
    el.classList.add('ei-number-register');el.classList.remove('ei-number-fired');void el.offsetWidth;el.classList.add('ei-number-fired');
    el.animate([{opacity:.45,transform:'translateY(7px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:300,easing:'cubic-bezier(.2,.78,.2,1)'});setTimeout(()=>el.classList.remove('ei-number-fired'),430)
  }
  function metricRegistration(){
    $$(metricSelector).forEach(el=>{if(!metricText.has(el))metricText.set(el,(el.textContent||'').trim())});
    if(document.documentElement.dataset.eiMetricObserver==='1')return;document.documentElement.dataset.eiMetricObserver='1';
    new MutationObserver(ms=>{for(const m of ms){const node=m.target.nodeType===3?m.target.parentElement:m.target;const direct=node?.matches?.(metricSelector)?node:node?.closest?.(metricSelector);if(direct)registerMetric(direct);if(m.addedNodes)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.(metricSelector))registerMetric(n);$$(metricSelector,n).forEach(registerMetric)}}}).observe(document.body,{subtree:true,childList:true,characterData:true})
  }

  function enhance(){navLocator();scanPanels();focusGrids();actionSignals();metricRegistration()}
  function schedule(){clearTimeout(enhanceTimer);enhanceTimer=setTimeout(enhance,90)}
  function init(){enhance();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});document.addEventListener('ei:history-updated',schedule)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
