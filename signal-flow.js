(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let stageTimer=null;

  function scanStages(box){
    if(!box||$('.ei-check-stages',box))return;
    const stages=['Identify','Connect evidence','Stress-test','Assemble passport'];
    const wrap=document.createElement('div');
    wrap.className='ei-check-stages';
    wrap.innerHTML=stages.map((s,i)=>`<div class="ei-check-stage${i===0?' active':''}"><i></i><b>${s}</b></div>`).join('');
    box.appendChild(wrap);
    let idx=0;
    clearInterval(stageTimer);
    stageTimer=setInterval(()=>{
      if(!document.body.contains(box)||!box.closest('.check-loading')){clearInterval(stageTimer);return}
      const nodes=$$('.ei-check-stage',wrap);
      nodes.forEach((n,i)=>{n.classList.toggle('done',i<idx);n.classList.toggle('active',i===idx)});
      idx=Math.min(nodes.length-1,idx+1);
    },620);
  }

  function installScanWatch(){
    const out=$('[data-check-output]');
    if(!out)return;
    const inspect=()=>{const loading=$('.check-loading',out);if(loading)scanStages(loading)};
    new MutationObserver(inspect).observe(out,{subtree:true,childList:true});
    inspect();
  }

  function installValueTraces(){
    const obs=new MutationObserver(ms=>{
      for(const m of ms){
        const el=m.target.nodeType===3?m.target.parentElement:m.target;
        if(!el?.matches?.('[data-live-value],[data-twin-total],[data-twin-gap],[data-neg-position],[data-result-score],#tc-total,#fp-verdict,#tm-verdict,#sh-total'))continue;
        el.classList.add('ei-signal-change');
        el.classList.remove('ei-signal-fired');
        requestAnimationFrame(()=>el.classList.add('ei-signal-fired'));
        setTimeout(()=>el.classList.remove('ei-signal-fired'),420);
      }
    });
    obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  function init(){installScanWatch();installValueTraces()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
