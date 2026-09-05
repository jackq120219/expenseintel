(()=>{
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)):'—';
  const pct=n=>Number.isFinite(Number(n))?(Number(n)*100).toFixed(3)+'%':'—';
  const set=(sel,val)=>{const el=document.querySelector(sel);if(el)el.textContent=val};
  async function json(url){const r=await fetch(url,{headers:{Accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Risk data unavailable');return d}
  function savedLocation(address){try{const saved=JSON.parse(sessionStorage.getItem('ei_last')||'null');if(saved?.location?.verified&&saved.address===address)return saved.location}catch(_e){}return null}
  async function resolveSelected(form){const input=form.querySelector('[name="address"]');const address=input?.value.trim();if(!address)return null;let loc=savedLocation(address);if(loc)return loc;const aurl=new URL('/api/address',location.origin);aurl.searchParams.set('q',address);const ad=await json(aurl);const exact=(ad.suggestions||[]).find(x=>String(x.label||'').toLowerCase()===address.toLowerCase());return exact||(ad.suggestions?.length===1?ad.suggestions[0]:null)}
  async function run(form){
    const input=form.querySelector('[name="address"]');if(!input||!input.value.trim())return;
    set('[data-nri-status]','Resolving tract…');
    try{
      const match=await resolveSelected(form);const tract=match?.components?.tract;if(!tract){set('[data-nri-status]','No tract risk record');return}
      const rurl=new URL('/api/risk',location.origin);rurl.searchParams.set('tract',tract);const risk=await json(rurl);if(!risk.available){set('[data-nri-status]','NRI unavailable for tract');return}
      set('[data-nri-risk]',risk.composite?.rating||'—');set('[data-nri-score]',Number.isFinite(risk.composite?.score)?risk.composite.score.toFixed(1):'—');set('[data-nri-eal]',money(risk.expectedAnnualLoss?.building));set('[data-nri-lossrate]',pct(risk.expectedAnnualLoss?.buildingLossRate));
      const top=risk.topHazards?.[0];set('[data-nri-top]',top?`${top.name} · ${top.rating||'rated'}`:'—');set('[data-nri-version]',`${risk.version||'NRI'} · Census tract ${risk.tract}`);set('[data-nri-status]','FEMA National Risk Index');
      const note=document.querySelector('[data-nri-disclaimer]');if(note){note.textContent=risk.disclaimer||'';note.hidden=false}
    }catch(_e){set('[data-nri-status]','Risk feed temporarily unavailable')}
  }
  function waitAndRun(form){let tries=0;const tick=()=>{tries++;const full=document.querySelector('[data-full-result]');const saved=savedLocation(form.querySelector('[name="address"]')?.value.trim());if(full?.classList.contains('show')&&saved){run(form);return}if(tries<30)setTimeout(tick,150);else run(form)};setTimeout(tick,40)}
  function loadScript(src,key){if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(`data-${key}`,'');document.head.appendChild(s)}
  function init(){const form=document.querySelector('[data-screen-form]');if(!form)return;loadScript('/passport.js','ei-passport');loadScript('/shock.js','ei-shock');form.addEventListener('submit',()=>waitAndRun(form))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();