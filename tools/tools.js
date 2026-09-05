(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const compact = n => Math.abs(Number(n)||0)>=1000000 ? '$'+((Number(n)||0)/1000000).toFixed(2)+'M' : Math.abs(Number(n)||0)>=1000 ? '$'+((Number(n)||0)/1000).toFixed(1)+'k' : money(n);
  const pct = n => ((Number(n)||0)*100).toFixed(1)+'%';
  const val = id => Number($(id)?.value)||0;
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const sumYears = (annual,growth,years=5)=>Array.from({length:years},(_,i)=>annual*Math.pow(1+growth,i)).reduce((a,b)=>a+b,0);
  const pmt = (principal,annualRate,years) => {
    if(principal<=0) return 0;
    const r=(annualRate/100)/12,n=years*12;
    if(!r) return principal/n;
    return principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  };

  const MODES = {
    industrial:{name:'Industrial Load Case',code:'EI / IND',use:'industrial',dek:'Model the location-driven burden of an operation: energy, demand, gas, water and other site costs.'},
    home:{name:'Home Carry',code:'EI / HOME',use:'residential',dek:'See the true monthly carrying cost of a home — financing, taxes, insurance, utilities, maintenance and risk context.'},
    commercial:{name:'Commercial Commitment',code:'EI / COM',use:'office',dek:'Translate a lease or acquisition into the real monthly and five-year economic commitment.'},
    development:{name:'Development Gate',code:'EI / DEV',use:'office',dek:'Stress-test land, hard cost, site utilities, financing carry and stabilized operating cost before development.'}
  };

  let mode='industrial';

  async function json(url){
    const r=await fetch(url,{headers:{Accept:'application/json'}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok) throw new Error(d.error||'Data source unavailable');
    return d;
  }
  async function context(location,use){
    const state=location?.components?.state||'';
    const tract=location?.components?.tract||'';
    const [energy,risk]=await Promise.all([
      state?json(`/api/energy?state=${encodeURIComponent(state)}&use=${encodeURIComponent(use)}`).catch(()=>null):null,
      tract?json(`/api/risk?tract=${encodeURIComponent(tract)}`).catch(()=>null):null
    ]);
    return {energy,risk};
  }
  function useForMode(){
    if(mode==='commercial') return $('#com-use')?.value||'office';
    if(mode==='development') return $('#dev-use')?.value||'office';
    return MODES[mode].use;
  }
  function utilityCosts(ctx,sqft,kwhOverride=0,gasOverride=0){
    const e=ctx.energy;
    const kwh=kwhOverride || ((e?.intensity?.kwhSqft||0)*sqft);
    const gasMcf=gasOverride || (((e?.intensity?.gasCfSqft||0)*sqft)/1000);
    const electricity=kwh*((e?.electricity?.centsKwh||0)/100);
    const gas=gasMcf*(e?.gas?.dollarsMcf||0);
    return {electricity,gas,kwh,gasMcf};
  }
  function growth(ctx,extra=.02){
    const yoy=Number.isFinite(ctx.energy?.electricity?.yoy)?ctx.energy.electricity.yoy:0;
    return clamp(.025+Math.max(-.01,yoy)*.25+extra,.02,.075);
  }
  function riskText(ctx){return ctx.risk?.available?ctx.risk.composite?.rating||'Available':'Not available';}
  function evidenceScore(ctx){return clamp(20+(ctx.energy?.electricity?20:0)+(ctx.energy?.gas?15:0)+(ctx.risk?.available?15:0)+30,30,100);}

  function action(title,impact,basis,type='SAVE'){return{title,impact,basis,type};}

  function industrial(ctx){
    const sqft=val('#ind-sqft'),u=utilityCosts(ctx,sqft,val('#ind-kwh'),val('#ind-gas'));
    const demand=val('#ind-peak')*val('#ind-demand')*12;
    const water=val('#ind-water'),other=val('#ind-other');
    const total=u.electricity+u.gas+demand+water+other;
    const g=growth(ctx,.012),five=sumYears(total,g),stress=total+u.electricity*.15+u.gas*.20+demand*.10+other*.10;
    const energyShare=total?((u.electricity+u.gas+demand)/total):0;
    const actions=[
      action('Peak-demand control', `${compact(demand*.05)}–${compact(demand*.12)} / yr`, 'Scenario: reduce modeled demand charges by 5–12% through scheduling, controls, storage or tariff review.'),
      action('Process + building efficiency', `${compact(u.electricity*.05)}–${compact(u.electricity*.10)} / yr`, 'Scenario: 5–10% lower commodity electricity use. Requires an actual load audit before investment.'),
      action('Location-rate arbitrage', compact((u.electricity+u.gas)*.10)+' / yr', 'Scenario value if an alternative utility territory or state produces a 10% lower combined energy price.', 'COMPARE')
    ];
    if(ctx.risk?.available && ['Relatively High','Very High'].includes(ctx.risk.composite?.rating)) actions.push(action('Resilience / insurance diligence','Unpriced','Higher tract hazard context should be priced before commitment; this is not an insurance quote.','VERIFY'));
    return {
      title:'Annual location burden',primary:money(total),secondaryLabel:'Energy + demand share',secondary:pct(energyShare),fiveLabel:'Five-year modeled burden',five:compact(five),stressLabel:'Cost shock case',stress:compact(stress),
      rows:[['Electric commodity',u.electricity],['Demand charges',demand],['Natural gas',u.gas],['Water / sewer',water],['Other location costs',other]],
      thresholds:[['Electricity +10%',u.electricity*.10],['Gas +20%',u.gas*.20],['Demand +10%',demand*.10]],actions,
      note:`Uses ${u.kwh.toLocaleString(undefined,{maximumFractionDigits:0})} kWh and ${u.gasMcf.toLocaleString(undefined,{maximumFractionDigits:0})} Mcf in the current case.`
    };
  }

  function home(ctx){
    const price=val('#home-price'),down=val('#home-down')/100,rate=val('#home-rate'),term=val('#home-term')||30,sqft=val('#home-sqft');
    const principal=price*(1-down),monthlyPI=pmt(principal,rate,term),u=utilityCosts(ctx,sqft,val('#home-kwh'),val('#home-gas'));
    const tax=val('#home-tax'),ins=val('#home-ins'),hoa=val('#home-hoa')*12,maint=price*(val('#home-maint')/100);
    const annualFixed=monthlyPI*12,touch=tax+ins+hoa+maint+u.electricity+u.gas,total=annualFixed+touch;
    const five=annualFixed*5+sumYears(touch,growth(ctx,.005),5),stress=total+tax*.10+ins*.20+(u.electricity+u.gas)*.15;
    const altPmt=pmt(principal,Math.max(0,rate-.5),term),rateSave=(monthlyPI-altPmt)*12;
    const actions=[
      action('Loan-price sensitivity', compact(rateSave)+' / yr', 'Scenario: a 0.50 percentage-point lower mortgage rate, holding principal and term constant.'),
      action('Energy-efficiency case', compact((u.electricity+u.gas)*.10)+' / yr', 'Scenario: 10% lower modeled household energy use; validate against building condition and actual bills.'),
      action('Insurance shopping / resilience','Quote-specific','Use the FEMA hazard context as a diligence prompt, then obtain property-specific carrier quotes.','VERIFY')
    ];
    return {
      title:'True monthly carry',primary:money(total/12),secondaryLabel:'Annual ownership carry',secondary:compact(total),fiveLabel:'Five-year cash burden',five:compact(five),stressLabel:'Tax / insurance / energy shock',stress:compact(stress/12)+' / mo',
      rows:[['Mortgage principal + interest',annualFixed],['Property tax',tax],['Insurance',ins],['HOA',hoa],['Maintenance reserve',maint],['Electricity',u.electricity],['Natural gas',u.gas]],
      thresholds:[['Mortgage rate -0.50%',-rateSave],['Insurance +20%',ins*.20],['Property tax +10%',tax*.10]],actions,
      note:'Home Carry is a decision model, not a loan estimate, tax bill, insurance quote or inspection.'
    };
  }

  function commercial(ctx){
    const sqft=val('#com-sqft'),deal=$('#com-deal')?.value||'lease',u=utilityCosts(ctx,sqft,val('#com-kwh'),val('#com-gas'));
    const other=val('#com-other'); let total,five,stress,rows,actions,secondary;
    if(deal==='lease'){
      const rent=val('#com-rent')*sqft,cam=val('#com-cam')*sqft,build=val('#com-buildout'),term=val('#com-term')||5,escal=val('#com-escal')/100;
      const recurring=rent+cam+u.electricity+u.gas+other,totalEconomic=recurring+build/term; total=totalEconomic;
      five=build+Array.from({length:term},(_,i)=>(rent+cam)*Math.pow(1+escal,i)+(u.electricity+u.gas+other)*Math.pow(1+growth(ctx,.005),i)).reduce((a,b)=>a+b,0);
      stress=total+rent*.05+cam*.10+(u.electricity+u.gas)*.15;
      rows=[['Base rent',rent],['NNN / CAM',cam],['Electricity',u.electricity],['Natural gas',u.gas],['Other occupancy costs',other],['Buildout amortized',build/term]];
      secondary=`${money((rent+cam)/12)} / mo rent + CAM`;
      actions=[
        action('CAM / NNN diligence',compact(cam*.05)+' / yr','Scenario: 5% reduction or avoided leakage in pass-through occupancy charges.'),
        action('Energy-efficiency case',compact((u.electricity+u.gas)*.10)+' / yr','Scenario: 10% lower modeled energy use after equipment/building review.'),
        action('Alternative-address screen',compact((u.electricity+u.gas+cam)*.10)+' / yr','Scenario value if another location carries 10% lower energy + occupancy pass-through burden.','COMPARE')
      ];
    }else{
      const price=val('#com-price'),down=val('#com-down')/100,rate=val('#com-rate'),term=val('#com-mort-term')||25,tax=val('#com-tax'),ins=val('#com-ins'),maint=val('#com-maint')*sqft;
      const debt=pmt(price*(1-down),rate,term)*12; total=debt+tax+ins+maint+u.electricity+u.gas+other;
      five=debt*5+sumYears(tax+ins+maint+u.electricity+u.gas+other,growth(ctx,.007),5);
      stress=total+tax*.10+ins*.20+(u.electricity+u.gas)*.15+maint*.10;
      rows=[['Debt service',debt],['Property tax',tax],['Insurance',ins],['Maintenance reserve',maint],['Electricity',u.electricity],['Natural gas',u.gas],['Other',other]];
      secondary=`${money(debt/12)} / mo debt service`;
      const lower=pmt(price*(1-down),Math.max(0,rate-.5),term)*12;
      actions=[
        action('Financing sensitivity',compact((debt-lower))+' / yr','Scenario: 0.50 percentage-point lower borrowing rate.'),
        action('Energy-efficiency case',compact((u.electricity+u.gas)*.10)+' / yr','Scenario: 10% lower modeled energy use.'),
        action('Tax + insurance verification','Quote-specific','Replace provisional carrying costs with parcel tax data and property-specific insurance quotes before close.','VERIFY')
      ];
    }
    return {title:'Monthly economic commitment',primary:money(total/12),secondaryLabel:deal==='lease'?'Occupancy core':'Financing core',secondary,fiveLabel:`${deal==='lease'?(val('#com-term')||5):5}-year modeled burden`,five:compact(five),stressLabel:'Commitment shock case',stress:compact(stress/12)+' / mo',rows,thresholds:[['Energy +15%',(u.electricity+u.gas)*.15],['Insurance / other +20%',other*.20],['Location costs +10%',total*.10]],actions,note:`Commercial Commitment is evaluating this as a ${deal.toUpperCase()} case.`};
  }

  function development(ctx){
    const sqft=val('#dev-sqft'),land=val('#dev-land'),hard=val('#dev-hard')*sqft,soft=hard*(val('#dev-soft')/100),cont=(hard+soft)*(val('#dev-cont')/100),site=val('#dev-site'),months=val('#dev-months')||18,rate=val('#dev-finance')/100;
    const preFinance=land+hard+soft+cont+site,finance=(preFinance*.5)*rate*(months/12),project=preFinance+finance;
    const use=$('#dev-use')?.value||'office';
    const base=EI.estimate($('#decision-address').value,use,sqft,null,ctx.energy); // operating mix only; address/location is separately verified in evidence
    const stabilized=base.total;
    const five=project+sumYears(stabilized,growth(ctx,.006),5);
    const hardShock=hard*.10,siteShock=site*.50,delay=(preFinance*.5)*rate*(6/12),stress=project+hardShock+siteShock+delay;
    const actions=[
      action('5% hard-cost value-engineering case',compact(hard*.05),'Scenario only: quantify the value of a 5% reduction in hard construction cost before design decisions are locked.'),
      action('Energy-design target',compact((base.categories.electric+base.categories.gas)*.15)+' / yr','Scenario: design for 15% lower modeled electricity + gas use at stabilization.'),
      action('Better-served site scenario',compact(site*.25),'Scenario value if an alternative site reduces utility/site-servicing cost by 25%.','COMPARE')
    ];
    return {title:'Development exposure',primary:compact(project),secondaryLabel:'Development cost / planned ft²',secondary:money(project/sqft),fiveLabel:'Project + 5Y operating burden',five:compact(five),stressLabel:'Downside development case',stress:compact(stress),rows:[['Land acquisition',land],['Hard cost',hard],['Soft cost',soft],['Contingency',cont],['Utility / site work',site],['Financing carry',finance],['Stabilized annual operating',stabilized]],thresholds:[['Hard cost +10%',hardShock],['Utility/site +50%',siteShock],['Schedule +6 months',delay]],actions,note:'Development Gate combines user-supplied project assumptions with location energy and hazard evidence; it is not a construction estimate.'};
  }

  function render(out,ctx,location){
    const result=$('[data-engine-result]'); result.classList.add('show'); $('[data-empty]').classList.add('hide');
    $('[data-result-code]').textContent=MODES[mode].code; $('[data-result-name]').textContent=MODES[mode].name; $('[data-result-address]').textContent=location.label;
    $('[data-primary-label]').textContent=out.title; $('[data-primary]').textContent=out.primary; $('[data-secondary-label]').textContent=out.secondaryLabel; $('[data-secondary]').textContent=out.secondary; $('[data-five-label]').textContent=out.fiveLabel; $('[data-five]').textContent=out.five; $('[data-stress-label]').textContent=out.stressLabel; $('[data-stress]').textContent=out.stress;
    const rows=$('[data-cost-rows]'); rows.innerHTML=''; const max=Math.max(...out.rows.map(r=>Math.abs(r[1])),1);
    out.rows.filter(r=>Math.abs(r[1])>0.01).forEach(([label,value])=>{const el=document.createElement('div');el.className='cost-line';el.innerHTML='<div><span></span><b></b></div><i></i>';el.querySelector('span').textContent=label;el.querySelector('b').textContent=compact(value);el.querySelector('i').style.width=Math.max(2,Math.abs(value)/max*100)+'%';rows.appendChild(el)});
    const thresh=$('[data-thresholds]');thresh.innerHTML='';out.thresholds.forEach(([label,value])=>{const d=document.createElement('div');d.innerHTML='<span></span><b></b>';d.querySelector('span').textContent=label;d.querySelector('b').textContent=(value<0?'-':' +')+compact(Math.abs(value));thresh.appendChild(d)});
    const acts=$('[data-actions]');acts.innerHTML='';out.actions.slice(0,4).forEach((a,i)=>{const el=document.createElement('article');el.className='action-card';el.innerHTML='<div class="action-top"><span></span><b></b></div><h3></h3><strong></strong><p></p>';el.querySelector('.action-top span').textContent=`0${i+1}`;el.querySelector('.action-top b').textContent=a.type;el.querySelector('h3').textContent=a.title;el.querySelector('strong').textContent=a.impact;el.querySelector('p').textContent=a.basis;acts.appendChild(el)});
    $('[data-note]').textContent=out.note;
    $('[data-evidence]').textContent=evidenceScore(ctx)+'%';
    $('[data-elec-rate]').textContent=ctx.energy?.electricity?`${ctx.energy.electricity.centsKwh.toFixed(2)}¢ / kWh`:'Unavailable';
    $('[data-gas-rate]').textContent=ctx.energy?.gas?`$${ctx.energy.gas.dollarsMcf.toFixed(2)} / Mcf`:'Unavailable';
    $('[data-hazard]').textContent=riskText(ctx);
    $('[data-top-hazard]').textContent=ctx.risk?.topHazards?.[0]?.name||'—';
    result.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function setMode(next){
    mode=next; $$('[data-mode-btn]').forEach(b=>b.classList.toggle('active',b.dataset.modeBtn===mode)); $$('[data-mode-fields]').forEach(s=>s.hidden=s.dataset.modeFields!==mode);
    $('[data-engine-title]').textContent=MODES[mode].name; $('[data-engine-dek]').textContent=MODES[mode].dek; $('[data-run-label]').textContent=`Run ${MODES[mode].name}`;
    $('[data-engine-result]').classList.remove('show'); $('[data-empty]').classList.remove('hide');
  }
  function toggleCommercial(){const buy=$('#com-deal')?.value==='buy';$$('[data-com-lease]').forEach(e=>e.hidden=buy);$$('[data-com-buy]').forEach(e=>e.hidden=!buy)}

  async function run(e){
    e.preventDefault(); const form=e.currentTarget,btn=$('button[type="submit"]',form),address=$('#decision-address');
    btn.disabled=true;btn.classList.add('loading-btn');
    try{
      const location=await EI.requireResolvedAddress(address); if(!location)return;
      const ctx=await context(location,useForMode());
      let out;if(mode==='industrial')out=industrial(ctx);else if(mode==='home')out=home(ctx);else if(mode==='commercial')out=commercial(ctx);else out=development(ctx);
      render(out,ctx,location);
    }catch(err){
      const box=$('[data-tool-error]');box.textContent=err.message||'Unable to build this decision case.';box.classList.add('show');
    }finally{btn.disabled=false;btn.classList.remove('loading-btn')}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    $$('[data-mode-btn]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.modeBtn)));
    $('#com-deal')?.addEventListener('change',toggleCommercial); toggleCommercial();
    $('[data-decision-form]')?.addEventListener('submit',run); setMode('industrial');
  });
})();