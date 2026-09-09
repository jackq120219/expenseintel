(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  function badModelText(t){t=clean(t);return /Start with the price\. Twin fills in the rest\.|Here is the cost model before you touch a slider\.|Which exact car is it\?|USEFUL BASELINE\s*·\s*EDITABLE|APPLY REFINED BASELINE/i.test(t)}
  function removeBadModel(){
    const out=$('[data-check-output]');if(!out)return;
    const candidates=$$('section,article,div',out).filter(el=>badModelText(el.textContent));
    for(const el of candidates){
      const text=clean(el.textContent);
      if(!/Start with the price|cost model before you touch a slider|Which exact car is it|USEFUL BASELINE|APPLY REFINED BASELINE/i.test(text))continue;
      let node=el;
      while(node.parentElement&&node.parentElement!==out&&node.parentElement.textContent&&badModelText(node.parentElement.textContent)&&node.parentElement.getBoundingClientRect().height<900)node=node.parentElement;
      if(node.matches('.check-output-wrap,.shell'))continue;
      if(node.querySelector?.('.ei-v12-chart,.ei-metrics-lab'))continue;
      node.remove();
    }
  }
  function dedupe(){
    $$('input,[data-result-title],.check-output-top h2,.check-output-wrap strong,.check-output-wrap h3').forEach(el=>{
      const isInput='value'in el,s=isInput?el.value:el.textContent;
      const d=clean(s).replace(/\b911 Carrera\s+911 Carrera\b/ig,'911 Carrera').replace(/\bCarrera\s+Carrera\b/ig,'Carrera');
      if(d&&d!==s){if(isInput)el.value=d;else el.textContent=d}
    })
  }
  function friendlyButtons(){
    const map=new Map([['BUILD TRUECOST','See full cost'],['TEST TIMING','Buy now or wait?'],['SAVE / WATCH','Watch this decision'],['SAVE THIS CHECK','Save this check'],['APPLY REFINED BASELINE','Update this estimate']]);
    $$('button,a').forEach(el=>{const k=clean(el.textContent).toUpperCase();if(map.has(k))el.textContent=map.get(k)})
  }
  function rgb(s){const m=String(s||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?[+m[1],+m[2],+m[3]]:null}
  const lum=c=>c?(.2126*c[0]+.7152*c[1]+.0722*c[2]):0;
  function fixContrast(){
    const out=$('[data-check-output]');if(!out)return;
    $$('*',out).forEach(el=>{
      const cs=getComputedStyle(el),bg=rgb(cs.backgroundColor),fg=rgb(cs.color);
      if(bg&&lum(bg)>205&&fg&&lum(fg)>185){el.style.setProperty('color','#11130f','important');el.style.setProperty('text-shadow','none','important')}
      if(el.matches('input,textarea,select')&&bg&&lum(bg)>190)el.style.setProperty('color','#11130f','important');
    });
  }
  function restoreCharts(){
    const out=$('[data-check-output]');if(!out)return;
    $$('.ei-v12-chart,.ei-metrics-lab svg,.ei-cost-path svg',out).forEach(el=>{el.style.removeProperty('display');el.style.removeProperty('visibility');el.style.removeProperty('opacity')});
  }
  function run(){removeBadModel();dedupe();friendlyButtons();fixContrast();restoreCharts()}
  function boot(){run();const root=$('[data-check-output]')||document.body;let q=false;new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;run()})}).observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','style','class']})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();