(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

  function commitmentScene(){
    if(!(location.pathname==='/'||location.pathname.startsWith('/check/'))||$('.ei-commitment-scene'))return;
    const hero=$('.check-hero');if(!hero)return;
    const scene=document.createElement('section');scene.className='ei-commitment-scene';scene.setAttribute('aria-label','How one decision moves through ExpenseIntel');
    const steps=[
      ['PRICE','What are you paying to get in?'],
      ['TRUE COST','What keeps costing money after the transaction?'],
      ['EXPOSURE','What can move against you or fail?'],
      ['TIMING','What changes if you act now instead of later?'],
      ['EXIT','How expensive is it to undo the commitment?'],
      ['EVIDENCE','Which parts are known, modeled, or still unresolved?']
    ];
    scene.innerHTML=`<div class="ei-commitment-inner"><div class="ei-scene-copy"><span>Commitment anatomy</span><h2>The sticker price is only the first signal.</h2><p>ExpenseIntel follows one decision outward. Touch a stage to see what the Passport is trying to expose before money becomes difficult to recover.</p><div class="ei-scene-readout"><b>PRICE</b><strong>What are you paying to get in?</strong></div></div><div class="ei-relay-stage"><i class="ei-relay-line"></i><div class="ei-relay-nodes">${steps.map((x,i)=>`<button type="button" class="ei-relay-node${i===0?' active':''}" data-relay="${i}"><i></i><span>${x[0]}</span></button>`).join('')}</div></div></div>`;
    hero.insertAdjacentElement('afterend',scene);
    const nodes=$$('.ei-relay-node',scene),readout=$('.ei-scene-readout',scene);let idx=0,timer=0,paused=false;
    const show=i=>{idx=i;nodes.forEach((n,j)=>n.classList.toggle('active',j===i));$('b',readout).textContent=steps[i][0];$('strong',readout).textContent=steps[i][1]};
    nodes.forEach((n,i)=>{n.addEventListener('pointerenter',()=>{paused=true;show(i)});n.addEventListener('focus',()=>{paused=true;show(i)});n.addEventListener('click',()=>show(i))});
    scene.addEventListener('pointerleave',()=>paused=false);
    if(!reduced)timer=setInterval(()=>{if(!paused)show((idx+1)%steps.length)},2600);
    addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }

  function twinContours(){
    if(!location.pathname.startsWith('/twin/')||$('.ei-twin-contours'))return;
    const stage=$('.twin-stage');if(!stage)return;
    const layer=document.createElement('div');layer.className='ei-twin-contours';layer.setAttribute('aria-hidden','true');layer.innerHTML='<svg viewBox="0 0 1000 760" preserveAspectRatio="none"><path class="c1"></path><path class="c2"></path><path class="c3"></path></svg>';stage.prepend(layer);
    const p1=$('.c1',layer),p2=$('.c2',layer),p3=$('.c3',layer),total=$('#tw-total'),gap=$('#tw-gap'),driver=$('#tw-driver');
    let last='';
    const num=t=>Number(String(t||'').replace(/[^0-9.-]/g,''))||0;
    const draw=()=>{
      const a=num(total?.textContent),g=Math.abs(num(gap?.textContent)),d=(driver?.textContent||'').toLowerCase();
      const seed=Math.min(1,a?g/Math.max(a,1):0),bias=d.includes('carry')?.75:d.includes('stress')?.58:d.includes('exit')?.38:.2;
      const y1=150+seed*95,y2=335-bias*75,y3=545-seed*110;
      p1.setAttribute('d',`M-70 ${y1} C160 ${y1-90}, 310 ${y1+110}, 520 ${y2} S820 ${y2-105}, 1080 ${y2+25}`);
      p2.setAttribute('d',`M-60 ${y2+80} C180 ${y2+10}, 360 ${y2+150}, 590 ${y3} S830 ${y3+90}, 1080 ${y3-10}`);
      p3.setAttribute('d',`M-80 ${y3+85} C170 ${y3-35}, 390 ${y3+55}, 610 ${y1+275} S850 ${y1+180}, 1080 ${y1+250}`);
      const sig=[a,g,d].join('|');if(sig!==last){last=sig;stage.classList.remove('ei-contour-live');void stage.offsetWidth;stage.classList.add('ei-contour-live');setTimeout(()=>stage.classList.remove('ei-contour-live'),620)}
    };
    draw();new MutationObserver(draw).observe(stage,{subtree:true,childList:true,characterData:true});
  }

  function projectFlow(){
    if(!location.pathname.startsWith('/project/'))return;
    const board=$('.hero-board');if(!board||$('.ei-project-vector',board))return;
    const layer=document.createElement('div');layer.className='ei-project-vector';layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<svg viewBox="0 0 620 470" preserveAspectRatio="none"><g><line x1="310" y1="205" x2="150" y2="96"/><line x1="310" y1="205" x2="470" y2="88"/><line x1="310" y1="205" x2="520" y2="245"/><line x1="310" y1="205" x2="385" y2="355"/><line x1="310" y1="205" x2="120" y2="310"/></g><circle class="ei-project-packet" cx="310" cy="205" r="5"/></svg>';
    board.prepend(layer);
    const orbs=$$('.board-orbit .orb',board),rows=$$('.board-list>div',board);let i=0,paused=false;
    const show=n=>{i=n;orbs.forEach((x,j)=>x.classList.toggle('ei-live',j===n));rows.forEach((x,j)=>x.classList.toggle('ei-live',j===n))};show(0);
    rows.forEach((r,n)=>{r.addEventListener('pointerenter',()=>{paused=true;show(n)});r.addEventListener('pointerleave',()=>paused=false)});
    if(!reduced)setInterval(()=>{if(!paused)show((i+1)%Math.min(orbs.length,rows.length))},2200);
  }

  function init(){commitmentScene();twinContours();projectFlow()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
