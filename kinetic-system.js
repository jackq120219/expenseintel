(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let enhanceTimer=0,navFrame=0;

  function navLocator(){
    const nav=$('.navlinks');if(!nav)return;nav.classList.add('ei-nav-kinetic');
    let loc=$('.ei-nav-locator',nav);if(!loc){loc=document.createElement('i');loc.className='ei-nav-locator';nav.appendChild(loc)}
    const links=()=>$$(':scope>a',nav);
    const move=a=>{if(!a||innerWidth<760)return;cancelAnimationFrame(navFrame);navFrame=requestAnimationFrame(()=>{const x=a.offsetLeft,w=a.offsetWidth;loc.style.width=`${w}px`;loc.style.transform=`translate3d(${x}px,0,0)`;nav.classList.add('ei-ready')})};
    const home=()=>move(links().find(a=>a.classList.contains('active')||a.getAttribute('aria-current')==='page')||links()[0]);
    links().forEach(a=>{if(a.dataset.eiNavBound==='1')return;a.dataset.eiNavBound='1';a.addEventListener('pointerenter',()=>move(a),{passive:true});a.addEventListener('focus',()=>move(a));a.addEventListener('pointerdown',()=>move(a),{passive:true})});
    nav.onpointerleave=home;nav.addEventListener('focusout',e=>{if(!nav.contains(e.relatedTarget))home()});requestAnimationFrame(home);
    if(!nav.dataset.eiResizeBound){nav.dataset.eiResizeBound='1';addEventListener('resize',home,{passive:true})}
  }

  const scanSelectors=['.check-box','.decision-command','.ei-live-passport','.ei-decision-twin','.ei-negotiation','.twin-workspace','.evidence-inbox','.dependency-stage','.data-spine','.decision-sheet'];
  let scanObserver=null;
  function scanPanels(){if(reduced||!('IntersectionObserver'in window))return;if(!scanObserver)scanObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;if(el.dataset.eiScanned==='1'){scanObserver.unobserve(el);return}el.dataset.eiScanned='1';el.classList.add('ei-scan-live');setTimeout(()=>el.classList.remove('ei-scan-live'),620);scanObserver.unobserve(el)}),{threshold:.3,rootMargin:'0px 0px -8%'});[...new Set(scanSelectors.flatMap(s=>$$(s)))].forEach(el=>{if(el.dataset.eiScanBound==='1'||el.closest('[hidden]'))return;el.dataset.eiScanBound='1';el.classList.add('ei-kinetic-scan');if(!$(':scope > .ei-scan-line',el)){const line=document.createElement('i');line.className='ei-scan-line';el.appendChild(line)}scanObserver.observe(el)})}

  const gridSelectors=['.answer-grid','.check-engine-row','.si-discipline','.ei-recent-grid','.ei-history-list','.twin-analysis-grid','.twin-next-grid','.snapshot-grid','.meaning-grid','.signal-list','.evidence-checks'];
  function focusGrids(){gridSelectors.flatMap(s=>$$(s)).forEach(grid=>{if(grid.dataset.eiFocusBound==='1')return;grid.dataset.eiFocusBound='1';grid.classList.add('ei-focus-grid');[...grid.children].forEach(item=>{if(item.classList.contains('ei-scan-line'))return;item.classList.add('ei-focus-item');if(!$(':scope > .ei-focus-edge',item)){const edge=document.createElement('i');edge.className='ei-focus-edge';item.appendChild(edge)}const enter=()=>{grid.classList.add('ei-focus-active');item.classList.add('ei-focus-current')},leave=()=>{item.classList.remove('ei-focus-current');if(!grid.querySelector('.ei-focus-current'))grid.classList.remove('ei-focus-active')};item.addEventListener('pointerenter',enter,{passive:true});item.addEventListener('pointerleave',leave,{passive:true});item.addEventListener('focusin',enter);item.addEventListener('focusout',leave)})})}

  const actionSelectors=['a.solidbtn','.check-run','.si-run','.platform-run','.run','.check-actions a','.check-actions button','.si-actions a','.si-actions button','.twin-toolbar-actions button','.twin-steps button','.quick-row button','.stress-buttons button','.snapshot-actions button','.deck-footer button','.ei-action-bridge a','.ei-continue-actions button','.brief-parse','.v5-primary'];
  function actionSignals(){[...new Set(actionSelectors.flatMap(s=>$$(s)))].forEach(el=>{if(el.dataset.eiActionBound==='1')return;el.dataset.eiActionBound='1';el.classList.add('ei-action-signal');const p=document.createElement('i');p.className='ei-action-packet';el.appendChild(p);const fire=()=>{if(reduced)return;el.classList.remove('ei-action-fired');void el.offsetWidth;el.classList.add('ei-action-fired');setTimeout(()=>el.classList.remove('ei-action-fired'),380)};el.addEventListener('pointerdown',fire,{passive:true});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')fire()})})}

  const metricSelector='.twin-kpi strong,.twin-equation strong,.driver-row strong,.sensitivity-grid strong,.target-answer strong,.check-score strong,.check-facts strong,.check-evidence strong,.metric-row b,.big-num,.risk-score strong,[data-result-score],#tc-total,#sh-total,#fp-verdict,#tm-verdict,.ei-passport-lens strong,.ei-history-metrics strong,.decision-command-grid strong,[data-r-fragility],[data-r-bottleneck]';
  const metricText=new WeakMap();
  function registerMetric(el){if(!el||!el.matches?.(metricSelector))return;const text=(el.textContent||'').trim();if(!text)return;const old=metricText.get(el);metricText.set(el,text);if(old==null||old===text||reduced)return;el.classList.add('ei-number-register');el.classList.remove('ei-number-fired');void el.offsetWidth;el.classList.add('ei-number-fired');el.animate([{opacity:.68,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:190,easing:'cubic-bezier(.2,.78,.2,1)'});setTimeout(()=>el.classList.remove('ei-number-fired'),300)}
  function metricRegistration(){$$(metricSelector).forEach(el=>{if(!metricText.has(el))metricText.set(el,(el.textContent||'').trim())});if(document.documentElement.dataset.eiMetricObserver==='1')return;document.documentElement.dataset.eiMetricObserver='1';new MutationObserver(ms=>{for(const m of ms){const node=m.target.nodeType===3?m.target.parentElement:m.target;const direct=node?.matches?.(metricSelector)?node:node?.closest?.(metricSelector);if(direct)registerMetric(direct);if(m.addedNodes)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.(metricSelector))registerMetric(n);$$(metricSelector,n).forEach(registerMetric)}}}).observe(document.body,{subtree:true,childList:true,characterData:true})}

  function enhance(){navLocator();scanPanels();focusGrids();actionSignals();metricRegistration()}
  function schedule(){clearTimeout(enhanceTimer);enhanceTimer=setTimeout(enhance,70)}
  function init(){enhance();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});document.addEventListener('ei:history-updated',schedule)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
