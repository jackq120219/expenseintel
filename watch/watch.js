(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const STORAGE='ei_saved_locations';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch(_e){return[]}};
  const write=v=>{try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch(_e){}};
  const rate=v=>Number.isFinite(Number(v))?Number(v):null;
  async function json(url){const r=await fetch(url,{headers:{Accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Signal unavailable');return d}
  function signalClass(delta){if(delta>0.001)return'signal-up';if(delta<-0.001)return'signal-down';return'signal-flat'}
  function signed(delta,suffix=''){if(!Number.isFinite(delta))return'—';return `${delta>0?'+':''}${delta.toFixed(2)}${suffix}`}
  async function refresh(item){
    const state=item.location?.components?.state||'';const tract=item.location?.components?.tract||'';
    const [energy,risk]=await Promise.all([
      state?json(`/api/energy?state=${encodeURIComponent(state)}&use=${encodeURIComponent(item.use||'other')}`).catch(()=>null):null,
      tract?json(`/api/risk?tract=${encodeURIComponent(tract)}`).catch(()=>null):null
    ]);
    const oldE=rate(item.electricRate),newE=rate(energy?.electricity?.centsKwh),oldG=rate(item.gasRate),newG=rate(energy?.gas?.dollarsMcf);
    return {...item,current:{energy,risk,electricDelta:oldE!=null&&newE!=null?newE-oldE:null,gasDelta:oldG!=null&&newG!=null?newG-oldG:null}};
  }
  function riskRank(v){const t=String(v||'').toLowerCase();if(t.includes('very high'))return5;if(t.includes('relatively high')||t==='high')return4;if(t.includes('moderate'))return3;if(t.includes('low'))return2;if(t.includes('very low'))return1;return0}
  function card(item,index){
    const c=item.current||{},en=c.energy,rk=c.risk;
    const newE=rate(en?.electricity?.centsKwh),newG=rate(en?.gas?.dollarsMcf);
    const eDelta=c.electricDelta,gDelta=c.gasDelta;
    const changed=(Number.isFinite(eDelta)&&Math.abs(eDelta)>=.01)||(Number.isFinite(gDelta)&&Math.abs(gDelta)>=.01)||(rk?.available&&rk.composite?.rating&&rk.composite.rating!==item.hazardRisk);
    const el=document.createElement('article');el.className='watch-card';
    el.innerHTML=`<div class="watch-head"><div><span>Cost Passport · ${item.id||'Saved location'}</span><strong></strong></div><div><span>Saved</span><b></b></div></div><div class="watch-grid"><div class="watch-cell"><span>Saved cost range</span><strong></strong></div><div class="watch-cell"><span>Electricity now</span><strong class="${signalClass(eDelta)}"></strong></div><div class="watch-cell"><span>Natural gas now</span><strong class="${signalClass(gDelta)}"></strong></div><div class="watch-cell"><span>FEMA risk now</span><strong></strong></div><div class="watch-cell"><span>Top hazard</span><strong></strong></div></div><div class="watch-change"><span>${changed?'Signal movement detected':'No material public-signal change'}</span><p></p></div><div class="watch-actions"><small></small><div class="watch-buttons"><a>Rescreen →</a><a href="/matrix/">Open Matrix</a><button type="button">Remove</button></div></div>`;
    el.querySelector('.watch-head strong').textContent=item.address||'Saved location';
    el.querySelector('.watch-head b').textContent=item.savedAt?new Date(item.savedAt).toLocaleDateString():'—';
    const cells=el.querySelectorAll('.watch-cell strong');
    cells[0].textContent=item.range||item.total||'—';
    cells[1].textContent=newE!=null?`${newE.toFixed(2)}¢/kWh ${Number.isFinite(eDelta)?`(${signed(eDelta,'¢')})`:''}`:'Unavailable';
    cells[2].textContent=newG!=null?`$${newG.toFixed(2)}/Mcf ${Number.isFinite(gDelta)?`(${signed(gDelta)})`:''}`:'Unavailable';
    cells[3].textContent=rk?.available?(rk.composite?.rating||'Available'):(item.hazardRisk||'Unavailable');
    cells[4].textContent=rk?.topHazards?.[0]?.name||item.hazard||'—';
    const bits=[];
    if(Number.isFinite(eDelta)&&Math.abs(eDelta)>=.01)bits.push(`electricity ${eDelta>0?'rose':'fell'} ${Math.abs(eDelta).toFixed(2)}¢/kWh`);
    if(Number.isFinite(gDelta)&&Math.abs(gDelta)>=.01)bits.push(`gas ${gDelta>0?'rose':'fell'} $${Math.abs(gDelta).toFixed(2)}/Mcf`);
    if(rk?.available&&rk.composite?.rating&&rk.composite.rating!==item.hazardRisk)bits.push(`FEMA composite risk is now ${rk.composite.rating}`);
    el.querySelector('.watch-change p').textContent=bits.length?`Since this passport was saved, ${bits.join('; ')}. Rescreen the property before making a material decision.`:'The connected public energy and hazard signals do not show a material change from this saved snapshot. Other modeled layers may still have changed.';
    el.querySelector('.watch-actions small').textContent=`${item.use||'property'} · ${Number(item.sqft||0).toLocaleString()} ft² · browser-local snapshot`;
    const rescreen=el.querySelector('.watch-buttons a');rescreen.href='/screen/?'+new URLSearchParams({address:item.address||'',use:item.use||'other',sqft:String(item.sqft||'')});
    el.querySelector('button').addEventListener('click',()=>{const arr=read().filter((_,i)=>i!==index);write(arr);init()});
    el.dataset.changed=changed?'1':'0';el.dataset.risk=rk?.available?(rk.composite?.rating||''):item.hazardRisk||'';
    return el;
  }
  async function init(){
    const list=$('[data-watch-list]');if(!list)return;const items=read();list.innerHTML='';$('[data-watch-count]').textContent=String(items.length);$('[data-watch-empty]').style.display=items.length?'none':'grid';
    if(!items.length){$('[data-watch-changed]').textContent='0';$('[data-watch-risk]').textContent='—';return}
    const refreshed=await Promise.all(items.map(x=>refresh(x).catch(()=>({...x,current:null}))));
    refreshed.forEach((item,i)=>list.appendChild(card(item,i)));
    const cards=[...list.children];$('[data-watch-changed]').textContent=String(cards.filter(c=>c.dataset.changed==='1').length);
    const risks=cards.map(c=>c.dataset.risk).filter(Boolean).sort((a,b)=>riskRank(b)-riskRank(a));$('[data-watch-risk]').textContent=risks[0]||'—';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('[data-watch-clear]')?.addEventListener('click',()=>{if(confirm('Clear every saved ExpenseIntel Cost Passport from this browser?')){write([]);init()}});
    init();
  });
})();