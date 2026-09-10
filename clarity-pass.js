(()=>{
  'use strict';
  if(window.__eiClarityBodyOnly)return;
  window.__eiClarityBodyOnly=1;

  const assets=[
    ['link','data-ei-refine-css','/refinement-v9.css'],
    ['script','data-ei-refine-js','/refinement-v9.js'],
    ['link','data-ei-vehicle-sanity-css','/vehicle-sanity-v11.css'],
    ['script','data-ei-vehicle-sanity-js','/vehicle-sanity-v11.js'],
    ['link','data-ei-estimate-integrity-css','/estimate-integrity-v12.css'],
    ['script','data-ei-estimate-integrity-js','/estimate-integrity-v12.js'],
    ['link','data-ei-provenance-css','/data-provenance-v13.css'],
    ['script','data-ei-provenance-js','/data-provenance-v13.js'],
    ['link','data-ei-sanity-gate-css','/sanity-gate-v14.css'],
    ['script','data-ei-sanity-gate-js','/sanity-gate-v14.js']
  ];

  for(const [type,guard,src] of assets){
    if(document.querySelector(`[${guard}]`))continue;
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
})();
