(()=>{
  const boot=()=>{
    if(!document.querySelector('link[href*="/project/precision.css"]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='/project/precision.css?v=20260905c';document.head.appendChild(l);
    }
    if(!document.querySelector('script[src*="/project/lab-v3.js"]')){
      const s=document.createElement('script');s.src='/project/lab-v3.js?v=20260905c';s.defer=true;document.body.appendChild(s);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
