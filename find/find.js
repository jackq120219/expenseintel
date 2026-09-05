(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const compact=n=>Math.abs(Number(n)||0)>=1000000?'$'+((Number(n)||0)/1000000).toFixed(2)+'M':Math.abs(Number(n)||0)>=1000?'$'+((Number(n)||0)/1000).toFixed(1)+'k':money(n);
  let rows=[];
  function err(msg=''){const e=$('[data-find-error]');if(!e)return;e.textContent=msg;e.classList.toggle('show',!!msg)}
  function median(vals){const a=[...vals].sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  async function json(url){const r=await fetch(url,{headers:{Accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Market scan unavailable.');return d}
  function render(){
    const result=$('[data-find-result]');result.classList.add('show');
    const winner=rows[0],last=rows[rows.length-1],cap=Number($('#find-cap').value)||0;
    $('[data-find-winner]').textContent=winner?`${winner.city}, ${winner.state}`:'—';
    $('[data-find-spread]').textContent=winner&&last?compact(last.annual-winner.annual)+'/yr':'—';
    $('[data-find-under]').textContent=cap?`${rows.filter(r=>r.annual<=cap).length} / ${rows.length}`:'Set a ceiling';
    const zone=$('[data-find-rows]');zone.innerHTML='';
    rows.forEach((r,i)=>{
      const line=document.createElement('div');line.className='rank-line'+(i===0?' winner':'');
      line.innerHTML='<div class="no"></div><div><strong></strong><small></small></div><div><strong></strong><small>electricity price</small></div><div><strong></strong><small>EI energy index</small></div><div><strong></strong><small>modeled annual burden</small></div><div><strong></strong><small>price movement</small></div>';
      line.children[0].textContent=String(i+1);
      line.children[1].querySelector('strong').textContent=`${r.city}, ${r.state}`;
      line.children[1].querySelector('small').textContent=`${r.region} · representative market`;
      line.children[2].querySelector('strong').textContent=`${r.rate.toFixed(2)}¢/kWh`;
      line.children[3].querySelector('strong').textContent=Math.round(r.index);
      line.children[4].querySelector('strong').textContent=compact(r.annual);
      line.children[5].querySelector('strong').textContent=Number.isFinite(r.yoy)?`${r.yoy>=0?'+':''}${(r.yoy*100).toFixed(1)}%`:'—';
      zone.appendChild(line);
    });
    const sel=$('#arb-market');sel.innerHTML='';rows.forEach((r,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`${i+1}. ${r.city}, ${r.state}`;sel.appendChild(o)});updateArb();
    result.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function run(e){
    e.preventDefault();err('');
    const use=$('#find-use').value,sqft=Number($('#find-sqft').value),kwhInput=Number($('#find-kwh').value)||0,fixed=Number($('#find-fixed').value)||0;
    if(!Number.isFinite(sqft)||sqft<300){err('Enter a valid floor area of at least 300 ft².');return}
    const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;
    try{
      const d=await json('/api/market?use='+encodeURIComponent(use));
      const kwh=kwhInput||((d.intensity?.kwhSqft||0)*sqft);
      if(!kwh){throw new Error('Unable to determine electricity usage for this profile.')}
      const costs=d.markets.map(m=>({city:m.city,state:m.state,region:m.region,rate:m.electricity.centsKwh,yoy:m.electricity.yoy,electric:kwh*(m.electricity.centsKwh/100)}));
      const med=median(costs.map(x=>x.electric))||1;
      rows=costs.map(x=>({...x,index:(x.electric/med)*100,annual:x.electric+fixed,kwh})).sort((a,b)=>a.annual-b.annual);
      render();
    }catch(ex){err(ex.message||'Unable to scan markets.')}finally{btn.disabled=false}
  }
  function updateArb(){
    if(!rows.length)return;
    const row=rows[Number($('#arb-market').value)||0]||rows[0];
    const value=Number($('#arb-value').value)||0,years=Math.max(1,Number($('#arb-years').value)||5),oneoff=Number($('#arb-oneoff').value)||0;
    const annualized=value/years,netFive=value-oneoff,adjusted=row.annual*5-netFive;
    const leaderFive=rows[0].annual*5;
    $('[data-arb-annual]').textContent=money(annualized)+'/yr';
    $('[data-arb-five]').textContent=(netFive>=0?'+':'')+money(netFive);
    $('[data-arb-total]').textContent=money(adjusted);
    const diff=adjusted-leaderFive;
    $('[data-arb-rank]').textContent=row===rows[0]?'Already current leader':diff<=0?`Overtakes leader by ${money(Math.abs(diff))}`:`Still ${money(diff)} above leader`;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('[data-find-form]')?.addEventListener('submit',run);
    ['#arb-market','#arb-value','#arb-years','#arb-oneoff'].forEach(s=>$(s)?.addEventListener('input',updateArb));
  });
})();