(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let currentLabel='',labelTimer=null,stageTimer=null;
  function loadAsset(tag,attrs){if(document.querySelector(attrs.guard))return;const el=document.createElement(tag);if(tag==='script')el.async=false;Object.entries(attrs.props).forEach(([k,v])=>el[k]=v);if(attrs.data)Object.entries(attrs.data).forEach(([k,v])=>el.dataset[k]=v);document.head.appendChild(el)}
  function loadSystems(){
    loadAsset('script',{guard:'script[data-ei-header-js]',props:{src:'/header-stability.js'},data:{eiHeaderJs:'1'}});
    loadAsset('link',{guard:'link[data-ei-kinetic-css]',props:{rel:'stylesheet',href:'/kinetic-system.css'},data:{eiKineticCss:'1'}});
    loadAsset('script',{guard:'script[data-ei-kinetic-js]',props:{src:'/kinetic-system.js'},data:{eiKineticJs:'1'}});
    loadAsset('link',{guard:'link[data-ei-signature-css]',props:{rel:'stylesheet',href:'/signature-scenes.css'},data:{eiSignatureCss:'1'}});
    loadAsset('script',{guard:'script[data-ei-signature-js]',props:{src:'/signature-scenes.js'},data:{eiSignatureJs:'1'}});
    loadAsset('link',{guard:'link[data-ei-project-v2-css]',props:{rel:'stylesheet',href:'/project-hero-v2.css'},data:{eiProjectV2Css:'1'}});
    loadAsset('script',{guard:'script[data-ei-project-v2-js]',props:{src:'/project-hero-v2.js'},data:{eiProjectV2Js:'1'}});
    loadAsset('link',{guard:'link[data-ei-final-css]',props:{rel:'stylesheet',href:'/final-pass.css'},data:{eiFinalCss:'1'}});
    loadAsset('script',{guard:'script[data-ei-final-js]',props:{src:'/final-pass.js'},data:{eiFinalJs:'1'}});
    loadAsset('link',{guard:'link[data-ei-header-css]',props:{rel:'stylesheet',href:'/header-stability.css'},data:{eiHeaderCss:'1'}})
  }
  function scanStages(box){if(!box||$('.ei-check-stages',box))return;const stages=['Identify','Connect evidence','Stress-test','Assemble passport'],wrap=document.createElement('div');wrap.className='ei-check-stages';wrap.innerHTML=stages.map((s,i)=>`<div class="ei-check-stage${i===0?' active':''}"><i></i><b>${s}</b></div>`).join('');box.appendChild(wrap);let idx=0;clearInterval(stageTimer);stageTimer=setInterval(()=>{if(!document.body.contains(box)||!box.closest('.check-loading')){clearInterval(stageTimer);return}const nodes=$$('.ei-check-stage',wrap);nodes.forEach((n,i)=>{n.classList.toggle('done',i<idx);n.classList.toggle('active',i===idx)});idx=Math.min(nodes.length-1,idx+1)},620)}
  function installScanWatch(){const out=$('[data-check-output]');if(!out)return;const inspect=()=>{const loading=$('.check-loading',out);if(loading)scanStages(loading)};new MutationObserver(inspect).observe(out,{subtree:true,childList:true});inspect()}
  function installValueTraces(){const obs=new MutationObserver(ms=>{for(const m of ms){const el=m.target.nodeType===3?m.target.parentElement:m.target;if(!el?.matches?.('[data-live-value],[data-twin-total],[data-twin-gap],[data-neg-position],[data-result-score],#tc-total,#fp-verdict,#tm-verdict,#sh-total'))continue;el.classList.add('ei-signal-change');el.classList.remove('ei-signal-fired');requestAnimationFrame(()=>el.classList.add('ei-signal-fired'));setTimeout(()=>el.classList.remove('ei-signal-fired'),420)}});obs.observe(document.body,{subtree:true,childList:true,characterData:true})}
  function init(){loadSystems();installScanWatch();installValueTraces()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
