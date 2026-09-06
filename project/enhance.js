(()=>{
  const addCss=(href)=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)};
  const addScript=(src,onload)=>{const existing=document.querySelector(`script[src*="${src.split('?')[0]}"]`);if(existing){if(onload){if(existing.dataset.loaded==='1')onload();else existing.addEventListener('load',onload,{once:true})}return existing}const s=document.createElement('script');s.src=src;s.defer=true;s.async=false;if(onload)s.addEventListener('load',()=>{s.dataset.loaded='1';onload()},{once:true});else s.addEventListener('load',()=>{s.dataset.loaded='1'},{once:true});document.body.appendChild(s);return s};
  const boot=()=>{
    addCss('/project/precision.css?v=20260905c');
    addCss('/project/gates-v4.css?v=20260905a');
    addCss('/project/intel-v5.css?v=20260905a');
    addScript('/project/lab-v3.js?v=20260905c',()=>addScript('/project/gates-v4.js?v=20260905a',()=>addScript('/project/intel-v5.js?v=20260905a')));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
