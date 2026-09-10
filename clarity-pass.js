(()=>{
  'use strict';
  if(window.__eiClarityBodyOnly)return;
  window.__eiClarityBodyOnly=1;

  function loadAsset(type,guard,src){
    if(document.querySelector(`[${guard}]`))return;
    const el=document.createElement(type);
    if(type==='link'){
      el.rel='stylesheet';
      el.href=src;
    }else{
      el.src=src;
      el.defer=true;
    }
    el.setAttribute(guard,'1');
    document.head.appendChild(el);
  }

  function loadEstimateIntegrity(){
    loadAsset('link','data-ei-estimate-integrity-css','/estimate-integrity-v12.css');
    loadAsset('script','data-ei-estimate-integrity-js','/estimate-integrity-v12.js');
  }

  function loadBodyReliability(){
    loadAsset('link','data-ei-refine-css','/refinement-v9.css');
    loadAsset('script','data-ei-refine-js','/refinement-v9.js');
    loadAsset('link','data-ei-vehicle-sanity-css','/vehicle-sanity-v11.css');
    loadAsset('script','data-ei-vehicle-sanity-js','/vehicle-sanity-v11.js');
    loadEstimateIntegrity();
    loadAsset('link','data-ei-provenance-css','/data-provenance-v13.css');
    loadAsset('script','data-ei-provenance-js','/data-provenance-v13.js');
    loadAsset('link','data-ei-sanity-gate-css','/sanity-gate-v14.css');
    loadAsset('script','data-ei-sanity-gate-js','/sanity-gate-v14.js');
  }

  loadBodyReliability();
})();
