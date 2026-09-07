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
  const center=[310,215];
  const coords=[[310,68],[500,158],[442,348],[178,348],[120,158]];
  board.innerHTML=`
    <div class="pmap-head"><span>PROJECT SYSTEM MAP</span><b>PLACE + PLAN / LIVE SCREENING ORDER</b></div>
    <div class="pmap-stage">
      <svg viewBox="0 0 620 430" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <filter id="softGlow"><feGaussianBlur stdDeviation="3.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <radialGradient id="coreHalo"><stop offset="0" stop-color="#b8ff3f" stop-opacity=".12"/><stop offset="1" stop-color="#b8ff3f" stop-opacity="0"/></radialGradient>
        </defs>
        <circle class="pmap-halo" cx="310" cy="215" r="132" fill="url(#coreHalo)"/>
        <g class="pmap-grid"><path d="M60 55H560M60 135H560M60 215H560M60 295H560M60 375H560M110 38V392M210 38V392M310 38V392M410 38V392M510 38V392"/></g>
        <g class="pmap-links">${coords.map((p,i)=>`<line data-pmap-line="${i}" x1="${center[0]}" y1="${center[1]}" x2="${p[0]}" y2="${p[1]}"/>`).join('')}</g>
        <circle class="pmap-core-ring r1" cx="310" cy="215" r="66"/><circle class="pmap-core-ring r2" cx="310" cy="215" r="88"/><circle class="pmap-core-ring r3" cx="310" cy="215" r="112"/>
        <circle class="pmap-packet" cx="310" cy="215" r="4.5"/>
      </svg>
      <button class="pmap-core" type="button"><span>PROJECT</span><small>PLACE + PLAN</small></button>
      ${systems.map((s,i)=>`<button type="button" class="pmap-node n${i}" data-pmap="${i}"><i>${String(i+1).padStart(2,'0')}</i><strong>${s.k}</strong><small>${s.name}</small><em>LIVE</em></button>`).join('')}
    </div>
    <div class="pmap-readout"><div><span id="pmap-kicker">01 / ${systems[0].name.toUpperCase()}</span><strong id="pmap-question">${systems[0].q}</strong></div><div><span>VERIFY NEXT</span><b id="pmap-next">${systems[0].next}</b></div></div>
    <div class="pmap-sequence">${systems.map((s,i)=>`<button type="button" data-pmap="${i}"><i>${String(i+1).padStart(2,'0')}</i><span>${s.name}</span></button>`).join('')}</div>`;
  const nodes=[...board.querySelectorAll('[data-pmap]')],lines=[...board.querySelectorAll('[data-pmap-line]')],packet=board.querySelector('.pmap-packet');
  const kicker=board.querySelector('#pmap-kicker'),question=board.querySelector('#pmap-question'),next=board.querySelector('#pmap-next');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx=0,timer=0,paused=false,packetAnimation=null;

  function movePacket(i,animate=true){
    if(!packet)return;
    if(packetAnimation)packetAnimation.cancel();
    packet.setAttribute('cx',center[0]);packet.setAttribute('cy',center[1]);
    if(!animate||reduced)return;
    const [x,y]=coords[i],dx=x-center[0],dy=y-center[1];
    packetAnimation=packet.animate([
      {transform:'translate(0px,0px)',opacity:0},
      {transform:'translate(0px,0px)',opacity:.95,offset:.12},
      {transform:`translate(${dx*.72}px,${dy*.72}px)`,opacity:1,offset:.72},
      {transform:`translate(${dx}px,${dy}px)`,opacity:1,offset:.88},
      {transform:`translate(${dx}px,${dy}px)`,opacity:0,offset:1}
    ],{duration:1900,easing:'cubic-bezier(.18,.72,.16,1)',fill:'none'});
  }

  function show(i,animate=true){
    idx=i;
    nodes.forEach(n=>n.classList.toggle('active',Number(n.dataset.pmap)===i));
    lines.forEach(l=>l.classList.toggle('active',Number(l.dataset.pmapLine)===i));
    kicker.textContent=`${String(i+1).padStart(2,'0')} / ${systems[i].name.toUpperCase()}`;
    question.textContent=systems[i].q;next.textContent=systems[i].next;
    movePacket(i,animate);
  }

  nodes.forEach(n=>{
    const i=Number(n.dataset.pmap);
    n.addEventListener('pointerenter',()=>{paused=true;show(i)});
    n.addEventListener('focus',()=>{paused=true;show(i)});
    n.addEventListener('click',()=>{paused=true;show(i)});
    n.addEventListener('pointerleave',()=>{paused=false});
    n.addEventListener('blur',()=>{paused=false});
  });
  board.querySelector('.pmap-core')?.addEventListener('click',()=>{paused=false;show(0)});
  show(0,false);
  if(!reduced)timer=setInterval(()=>{if(!paused)show((idx+1)%systems.length)},5200);
  addEventListener('pagehide',()=>{clearInterval(timer);packetAnimation?.cancel()},{once:true});
})();
