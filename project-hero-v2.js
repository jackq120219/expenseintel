(()=>{
  'use strict';
  if(!location.pathname.startsWith('/project/'))return;
  const board=document.querySelector('.hero-board');
  if(!board||board.dataset.eiHeroV2==='1')return;
  board.dataset.eiHeroV2='1';
  const systems=[
    {k:'UTIL',name:'Utility capacity',q:'Can the site support the demand?',next:'Confirm real service capacity before fixed design.'},
    {k:'FRAG',name:'Project fragility',q:'How many assumptions must hold?',next:'Reduce dependencies before schedule hardens.'},
    {k:'BOT',name:'Approval bottleneck',q:'Where can the project stall?',next:'Close the dominant approval gate first.'},
    {k:'EVID',name:'Evidence depth',q:'How much of the plan is actually proven?',next:'Replace modeled inputs with records as they arrive.'},
    {k:'UNDO',name:'Capital lock-in',q:'What becomes expensive to undo?',next:'Delay irreversible releases until the critical gates clear.'}
  ];
  const coords=[[310,76],[500,180],[440,356],[180,356],[120,180]];
  board.innerHTML=`
    <div class="pmap-head"><span>PROJECT SYSTEM MAP</span><b>PLACE + PLAN / LIVE SCREENING ORDER</b></div>
    <div class="pmap-stage">
      <svg viewBox="0 0 620 430" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs><filter id="softGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g class="pmap-grid"><path d="M60 86H560M60 150H560M60 214H560M60 278H560M60 342H560M120 52V378M215 52V378M310 52V378M405 52V378M500 52V378"/></g>
        <g class="pmap-links">${coords.map((p,i)=>`<line data-pmap-line="${i}" x1="310" y1="216" x2="${p[0]}" y2="${p[1]}"/>`).join('')}</g>
        <circle class="pmap-core-ring r1" cx="310" cy="216" r="69"/><circle class="pmap-core-ring r2" cx="310" cy="216" r="91"/>
        <circle class="pmap-packet" cx="310" cy="216" r="5"/>
      </svg>
      <button class="pmap-core" type="button"><span>PROJECT</span><small>PLACE + PLAN</small></button>
      ${systems.map((s,i)=>`<button type="button" class="pmap-node n${i}" data-pmap="${i}"><i>${String(i+1).padStart(2,'0')}</i><strong>${s.k}</strong><small>${s.name}</small></button>`).join('')}
    </div>
    <div class="pmap-readout"><div><span id="pmap-kicker">01 / ${systems[0].name.toUpperCase()}</span><strong id="pmap-question">${systems[0].q}</strong></div><div><span>VERIFY NEXT</span><b id="pmap-next">${systems[0].next}</b></div></div>
    <div class="pmap-sequence">${systems.map((s,i)=>`<button type="button" data-pmap="${i}"><i>${String(i+1).padStart(2,'0')}</i><span>${s.name}</span></button>`).join('')}</div>`;
  const nodes=[...board.querySelectorAll('[data-pmap]')],lines=[...board.querySelectorAll('[data-pmap-line]')],packet=board.querySelector('.pmap-packet');
  const kicker=board.querySelector('#pmap-kicker'),question=board.querySelector('#pmap-question'),next=board.querySelector('#pmap-next');
  let idx=0,timer=0,paused=false;
  function show(i,animate=true){
    idx=i;
    nodes.forEach(n=>n.classList.toggle('active',Number(n.dataset.pmap)===i));
    lines.forEach(l=>l.classList.toggle('active',Number(l.dataset.pmapLine)===i));
    kicker.textContent=`${String(i+1).padStart(2,'0')} / ${systems[i].name.toUpperCase()}`;
    question.textContent=systems[i].q;next.textContent=systems[i].next;
    if(packet){const [x,y]=coords[i];packet.setAttribute('cx',x);packet.setAttribute('cy',y);if(animate&&packet.animate)packet.animate([{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1.35)'},{opacity:.9,transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});}
  }
  nodes.forEach(n=>{const i=Number(n.dataset.pmap);n.addEventListener('pointerenter',()=>{paused=true;show(i)});n.addEventListener('focus',()=>{paused=true;show(i)});n.addEventListener('click',()=>show(i));n.addEventListener('pointerleave',()=>paused=false)});
  show(0,false);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>{if(!paused)show((idx+1)%systems.length)},2700);
  addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
