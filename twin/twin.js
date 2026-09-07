(()=>{
  const ACTIVE='ei_active_decision',TWIN='ei_decision_twin_v1';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const read=(k,f={})=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_e){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_e){return false}};
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const active=read(ACTIVE,{}),saved=read(TWIN,{});
  let lastChanged='entry';

  function activeTitle(){return clean(active.title||active.text||[active?.vehicle?.identity?.year,active?.vehicle?.identity?.make,active?.vehicle?.identity?.model].filter(Boolean).join(' ')||'No active Check yet')}
  function values(){return{base:Number($('#tw-base')?.value)||0,delta:Number($('#tw-delta')?.value)||0,annual:Number($('#tw-annual')?.value)||0,growth:Number($('#tw-growth')?.value)||0,years:Number($('#tw-years')?.value)||5,shock:Number($('#tw-shock')?.value)||0,recovery:Number($('#tw-recovery')?.value)||0}}
  function model(v){
    const entry=Math.max(0,v.base+v.delta);let carry=0;const yearly=[];let running=entry;yearly.push({label:'Entry',value:running});
    for(let y=1;y<=v.years;y++){const cost=v.annual*Math.pow(1+v.growth/100,y-1);carry+=cost;running+=cost;yearly.push({label:`Yr ${y}`,value:running})}
    const beforeShock=running;running+=v.shock;yearly.push({label:'Shock',value:running});running=Math.max(0,running-v.recovery);yearly.push({label:'Exit',value:running});
    return{entry,carry,beforeShock,total:running,deltaTotal:running-v.base,points:yearly};
  }
  function chart(v,m){
    const svg=$('#tw-chart');if(!svg)return;const W=800,H=280,p={l:44,r:28,t:28,b:42},vals=m.points.map(x=>x.value),max=Math.max(...vals,v.base,1)*1.08,min=0,x=i=>p.l+(W-p.l-p.r)*(i/Math.max(1,m.points.length-1)),y=n=>H-p.b-(H-p.t-p.b)*((n-min)/(max-min||1));
    const pts=m.points.map((q,i)=>({x:x(i),y:y(q.value),...q})),line=pts.map((q,i)=>`${i?'L':'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' '),fill=`${line} L${pts[pts.length-1].x.toFixed(1)} ${(H-p.b).toFixed(1)} L${pts[0].x.toFixed(1)} ${(H-p.b).toFixed(1)} Z`,baseY=y(v.base);
    $('#tw-trace').setAttribute('d',line);$('#tw-fill').setAttribute('d',fill);$('#tw-base-line').setAttribute('d',`M${p.l} ${baseY.toFixed(1)} H${W-p.r}`);
    const dots=$('#tw-points');dots.innerHTML=pts.map((q,i)=>`<circle class="point${i===pts.length-1?' end':''}" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${i===pts.length-1?5:3.4}"><title>${q.label}: ${money(q.value)}</title></circle>`).join('');
    const labels=$('#tw-labels');labels.innerHTML=pts.map((q,i)=>i===0||i===pts.length-1||/^Yr [13579]$/.test(q.label)?`<text class="axis-label" x="${q.x.toFixed(1)}" y="${H-16}" text-anchor="middle">${q.label}</text>`:'').join('');
    const trace=$('#tw-trace');trace.classList.remove('replay');void trace.getBoundingClientRect();trace.classList.add('replay');const end=$('.point.end',dots);end?.classList.add('pulse');setTimeout(()=>end?.classList.remove('pulse'),380);
  }
  function impact(v,m){
    const gap=m.deltaTotal,share=m.total?m.carry/m.total:0,shockShare=m.total?v.shock/m.total:0;
    $('#tw-total').textContent=v.base?money(m.total):'Enter an amount';$('#tw-gap').textContent=v.base?`${gap>=0?'+':'−'}${money(Math.abs(gap))}`:'—';$('#tw-carry').textContent=money(m.carry);
    $('#tw-total-note').textContent=`${v.years} year${v.years===1?'':'s'} · user-controlled scenario`;$('#tw-gap-note').textContent=gap===0?'No difference from known amount yet.':gap>0?'Scenario increases cash commitment.':'Scenario lowers cash commitment.';$('#tw-carry-note').textContent=m.carry?`${Math.round(share*100)}% of modeled cash commitment is recurring carry.`:'No recurring burden entered.';
    const frag=v.base?Math.min(100,Math.round((Math.abs(v.delta)/Math.max(v.base,1))*120+(share*45)+(shockShare*90))):0;$('#tw-status').style.transform=`scaleX(${Math.max(.08,frag/100)})`;
    $('#tw-impact-a').textContent=m.carry?`${money(m.carry)} of carry`:'No recurring cost entered';$('#tw-impact-a-copy').textContent=m.carry?`Across ${v.years} years at ${v.growth.toFixed(1)}% annual growth, recurring cost becomes a visible part of the commitment rather than an afterthought.`:'Add an annual recurring burden only if you have a real number or a scenario you intentionally want to test.';
    $('#tw-impact-b').textContent=v.shock?`${money(v.shock)} downside stack`:'No downside stack';$('#tw-impact-b-copy').textContent=v.shock?`Your chosen one-time downside adds ${money(v.shock)} before any recovery or exit value is applied.`:'Use the downside field for a specific repair, overrun, fee or bad-year event—not a vague fear premium.';
    $$('[data-flow]').forEach(b=>b.classList.toggle('active',b.dataset.flow===lastChanged));
    const map={entry:[money(m.entry),'Price + your scenario adjustment'],carry:[money(m.carry),`${v.years} years of entered recurring burden`],shock:[money(v.shock),'One-time downside you chose'],exit:[v.recovery?`−${money(v.recovery)}`:'$0','Recovery / exit value you chose']};
    $$('[data-flow]').forEach(b=>{const [a,c]=map[b.dataset.flow];$('strong',b).textContent=a;$('small',b).textContent=c});
    ['#tw-total','#tw-gap','#tw-carry'].forEach(s=>{const e=$(s);e.classList.remove('change');void e.offsetWidth;e.classList.add('change')});
  }
  function update(changed='entry'){
    lastChanged=changed;const v=values(),m=model(v);$('#tw-delta-out').textContent=`${v.delta>=0?'+':'−'}${money(Math.abs(v.delta))}`;$('#tw-growth-out').textContent=`${v.growth.toFixed(1).replace('.0','')}%`;$('#tw-years-out').textContent=`${v.years} yr${v.years===1?'':'s'}`;chart(v,m);impact(v,m);write(TWIN,{delta:v.delta,annual:v.annual,growth:v.growth,years:v.years,shock:v.shock,recovery:v.recovery,updatedAt:new Date().toISOString()});
  }
  function bind(){
    const map=[['tw-base','entry'],['tw-delta','entry'],['tw-annual','carry'],['tw-growth','carry'],['tw-years','carry'],['tw-shock','shock'],['tw-recovery','exit']];map.forEach(([id,type])=>$('#'+id)?.addEventListener('input',()=>update(type)));
    $('#tw-reset')?.addEventListener('click',()=>{if(active.price)$('#tw-base').value=active.price;$('#tw-delta').value=0;$('#tw-annual').value='';$('#tw-growth').value=0;$('#tw-years').value=5;$('#tw-shock').value='';$('#tw-recovery').value='';update('entry')});
    $('#tw-copy')?.addEventListener('click',async e=>{const v=values(),m=model(v),text=`ExpenseIntel Decision Twin — ${activeTitle()}\nKnown amount: ${money(v.base)}\nScenario entry: ${money(m.entry)}\nRecurring burden: ${money(m.carry)} over ${v.years} years\nOne-time downside: ${money(v.shock)}\nRecovery / exit: ${money(v.recovery)}\nScenario cash commitment: ${money(m.total)}\nDifference vs known amount: ${m.deltaTotal>=0?'+':'-'}${money(Math.abs(m.deltaTotal))}\nScenario only — assumptions are user-controlled.`;try{await navigator.clipboard.writeText(text);const old=e.currentTarget.textContent;e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent=old,1400)}catch(_e){}});
    $$('[data-flow]').forEach(b=>b.addEventListener('click',()=>{lastChanged=b.dataset.flow;$$('[data-flow]').forEach(x=>x.classList.toggle('active',x===b));const target={entry:'#tw-delta',carry:'#tw-annual',shock:'#tw-shock',exit:'#tw-recovery'}[b.dataset.flow];$(target)?.focus()}));
  }
  function prefill(){
    $('#tw-title').value=activeTitle()==='No active Check yet'?'':activeTitle();$('#tw-base').value=Number(active.price)||Number(saved.base)||'';$('#tw-delta').value=Number(saved.delta)||0;$('#tw-annual').value=Number(saved.annual)||'';$('#tw-growth').value=Number(saved.growth)||0;$('#tw-years').value=Number(saved.years)||5;$('#tw-shock').value=Number(saved.shock)||'';$('#tw-recovery').value=Number(saved.recovery)||'';
    $('#tw-active-title').textContent=activeTitle();$('#tw-active-meta').textContent=[active.price?money(active.price):'',active.location||'',active.category?String(active.category).replace(/-/g,' '):''].filter(Boolean).join(' · ')||'Start with a known amount or run ExpenseIntel Check first.';
    $('#tw-link-check').textContent=active.price?'Open current decision in Check →':'Run a Check first →';
  }
  function init(){prefill();bind();update('entry')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
