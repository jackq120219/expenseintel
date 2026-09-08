(()=>{
  if(!(location.pathname==='/'||location.pathname.startsWith('/check/')))return;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ACTIVE='ei_active_decision', TWIN='ei_decision_twin_v2';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const numberFrom=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\$?\s*(-?\d+(?:\.\d+)?)/);return m?Number(m[1]):0};
  const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_e){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_e){return false}};
  const esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const round=(n,step=10)=>Math.round((Number(n)||0)/step)*step;

  function rowValue(root,rx){for(const row of $$('.decision-command-grid>div,.meaning-grid>div',root)){const lab=clean($('span',row)?.textContent||$('b',row)?.textContent);if(rx.test(lab))return clean($('strong',row)?.textContent||'')}return''}
  function context(root){
    const a=read(ACTIVE,{})||{};
    const title=clean(a.title||a.text||$('[data-result-title]',root)?.textContent||'Active decision');
    const base=Number(a.price)||numberFrom(rowValue(root,/^PRICE$|ASKING|QUOTE/i));
    const marketText=rowValue(root,/MARKET|COMPARABLE/i),market=/unverified|not verified/i.test(marketText)?0:numberFrom(marketText);
    const fuelText=rowValue(root,/FUEL\s*\/\s*YR|ANNUAL FUEL/i),fuel=numberFrom(fuelText);
    const unknowns=$$('.check-unknown',root).map(x=>clean(x.textContent)).filter(Boolean);
    const call=clean($('[data-decision-call]',root)?.textContent),reason=clean($('[data-decision-reason]',root)?.textContent);
    const score=clean($('[data-result-score]',root)?.textContent),status=clean($('[data-result-label]',root)?.textContent);
    const evidence=$$('[data-result-evidence] article',root).map(x=>clean(x.textContent)).filter(Boolean);
    const category=String(a.category||'personal').toLowerCase();
    const vehicle=a.vehicle||null;
    const location=clean(a.location||a.page?.location||'');
    return {a,title,base,market,marketText,fuel,fuelText,unknowns,call,reason,score,status,evidence,category,vehicle,location};
  }

  function scenarioTotal(base,delta,annual,growth,years,shock,recovery){
    let recurring=0;for(let i=0;i<years;i++)recurring+=annual*Math.pow(1+growth/100,i);
    const start=Math.max(0,base+delta),total=Math.max(0,start+recurring+shock-recovery);
    return {start,recurring,total,deltaTotal:total-base};
  }
  function tracePoints(v){
    const {base,delta,annual,growth,years,shock,recovery}=v;
    const vals=[Math.max(0,base+delta)];let running=vals[0];
    for(let i=0;i<years;i++){running+=annual*Math.pow(1+growth/100,i);vals.push(running)}
    running+=shock;vals.push(running);running=Math.max(0,running-recovery);vals.push(running);
    const max=Math.max(...vals,base,1);
    return vals.map((n,i)=>[5+(i/(vals.length-1||1))*90,92-(n/max)*78,n]);
  }

  function ensureStyles(){
    if($('#ei-twin-smart-style'))return;
    const style=document.createElement('style');style.id='ei-twin-smart-style';
    style.textContent=`
      .ei-twin-smart{margin:0 0 18px;border:1px solid rgba(185,255,63,.38);background:linear-gradient(135deg,rgba(185,255,63,.13),rgba(255,255,255,.025) 42%,rgba(255,255,255,.01));}
      .ei-twin-smart-head{display:flex;justify-content:space-between;gap:18px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.11)}
      .ei-twin-smart-head>div>span,.ei-twin-smart-kpis span,.ei-twin-smart-assumptions>span,.ei-twin-refine>span{display:block;font-size:9px;letter-spacing:.13em;text-transform:uppercase;opacity:.58}
      .ei-twin-smart-head h4{margin:5px 0 4px;font-size:21px;line-height:1.05;color:#f4f1e8}
      .ei-twin-smart-head p{margin:0;max-width:720px;font-size:11px;line-height:1.5;opacity:.64}
      .ei-twin-smart-badge{height:max-content;white-space:nowrap;border:1px solid rgba(185,255,63,.5);color:#b9ff3f;padding:6px 9px;font-size:9px;letter-spacing:.1em;text-transform:uppercase}
      .ei-twin-smart-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid rgba(255,255,255,.1)}
      .ei-twin-smart-kpis>div{padding:14px 16px;border-right:1px solid rgba(255,255,255,.09)}.ei-twin-smart-kpis>div:last-child{border-right:0}
      .ei-twin-smart-kpis strong{display:block;margin-top:5px;font-size:17px;color:#f4f1e8}.ei-twin-smart-kpis small{display:block;margin-top:4px;font-size:9px;line-height:1.35;opacity:.52}
      .ei-twin-smart-body{display:grid;grid-template-columns:1.1fr .9fr}
      .ei-twin-smart-assumptions{padding:17px 20px}.ei-twin-smart-lines{margin-top:10px}
      .ei-twin-smart-line{display:grid;grid-template-columns:1.2fr auto;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.075)}
      .ei-twin-smart-line strong{font-size:11px;color:#f4f1e8}.ei-twin-smart-line small{grid-column:1/-1;font-size:9px;opacity:.53;margin-top:-5px}
      .ei-twin-refine{padding:17px 20px;border-left:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.12)}
      .ei-twin-refine h5{margin:6px 0 5px;font-size:15px;color:#f4f1e8}.ei-twin-refine p{margin:0 0 12px;font-size:10px;line-height:1.45;opacity:.58}
      .ei-twin-refine-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ei-twin-refine-grid label{display:grid;gap:5px;font-size:8px;letter-spacing:.08em;text-transform:uppercase;opacity:.72}
      .ei-twin-refine-grid label.wide{grid-column:1/-1}.ei-twin-refine-grid input,.ei-twin-refine-grid select{width:100%;border:1px solid rgba(255,255,255,.2);background:#f5f2e9;color:#151a14;padding:9px 10px;font:inherit;font-size:10px;outline:none}
      .ei-twin-refine-actions{display:flex;gap:8px;align-items:center;margin-top:11px}.ei-twin-refine-actions button{border:1px solid rgba(185,255,63,.55);background:#b9ff3f;color:#11170f;padding:9px 11px;font:700 9px/1 inherit;letter-spacing:.07em;text-transform:uppercase;cursor:pointer}
      .ei-twin-refine-actions small{font-size:8px;line-height:1.35;opacity:.5}
      .ei-twin-auto-note{margin:10px 0 0;font-size:9px;line-height:1.45;color:#b9ff3f}
      .ei-twin-field[data-estimated="1"] label:after{content:" · PLANNING ESTIMATE";color:#9be12b;font-size:8px;letter-spacing:.08em}
      @media(max-width:920px){.ei-twin-smart-kpis{grid-template-columns:1fr 1fr}.ei-twin-smart-kpis>div{border-bottom:1px solid rgba(255,255,255,.09)}.ei-twin-smart-body{grid-template-columns:1fr}.ei-twin-refine{border-left:0;border-top:1px solid rgba(255,255,255,.1)}}
      @media(max-width:620px){.ei-twin-smart-head{display:block}.ei-twin-smart-badge{display:inline-block;margin-top:10px}.ei-twin-smart-kpis{grid-template-columns:1fr}.ei-twin-refine-grid{grid-template-columns:1fr}.ei-twin-refine-grid label.wide{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function baseVehicleDetail(ctx,saved){
    const id=ctx.vehicle?.identity||{};
    const fromVehicle=[id.year,id.make,id.model,id.trim].filter(Boolean).join(' ');
    const year=Number(id.year)||Number((ctx.title.match(/\b(19|20)\d{2}\b/)||[])[0])||saved?.year||'';
    return {model:saved?.model||fromVehicle||ctx.title||'',year,miles:saved?.miles||'',annualMiles:saved?.annualMiles||12000,location:saved?.location||ctx.location||''};
  }
  function detailDefaults(ctx,saved={}){
    if(ctx.category==='vehicle')return baseVehicleDetail(ctx,saved);
    if(ctx.category==='property')return {location:saved.location||ctx.location||ctx.title||'',propertyType:saved.propertyType||'home',hoa:saved.hoa||''};
    if(/home|business-project|equipment/.test(ctx.category))return {item:saved.item||ctx.title||'',location:saved.location||ctx.location||'',usage:saved.usage||''};
    return {item:saved.item||ctx.title||'',location:saved.location||ctx.location||'',lifespan:saved.lifespan||''};
  }

  function locationFactor(s=''){
    s=s.toLowerCase();
    if(/new york|nyc|san francisco|los angeles|boston|chicago|seattle|miami/.test(s))return 1.12;
    if(/texas|ohio|indiana|iowa|kansas|missouri/.test(s))return .94;
    return 1;
  }

  function vehicleBaseline(ctx,d,years){
    const base=ctx.base||0, text=clean(`${d.model||''} ${ctx.title||''}`).toLowerCase(), currentYear=new Date().getFullYear(), y=Number(d.year)||currentYear, age=clamp(currentYear-y,0,20);
    const annualMiles=clamp(Number(d.annualMiles)||12000,3000,40000), mileageFactor=annualMiles/12000;
    const luxury=/bmw|mercedes|audi|porsche|range rover|land rover|maserati|bentley|lexus|cadillac|lincoln/.test(text)?1.28:1;
    const truck=/f-?150|silverado|sierra|ram |tundra|tacoma|truck|suburban|tahoe|expedition/.test(text)?1.16:1;
    const efficient=/prius|corolla|civic|accord|camry|elantra|ioniq|hybrid/.test(text)?.84:1;
    const ev=/tesla|electric| ev\b|ioniq 5|ioniq 6|mach-e|model 3|model y|id\.4|leaf/.test(text);
    const durable=/toyota|lexus|honda|acura|subaru|mazda/.test(text);
    const loc=locationFactor(d.location||ctx.location);
    const connectedFuel=ctx.fuel>0?ctx.fuel:0;
    const energy=connectedFuel||round((ev?720:1650)*mileageFactor*truck*efficient,50);
    const insurance=round(Math.max(1200,base*.032)*luxury*loc*(age>8?.92:1),50);
    const service=round(Math.max(650,base*(ev?.009:.015))*luxury*(1+Math.min(age,10)*.025)*mileageFactor,50);
    const fees=round(420*loc,10);
    const annual=energy+insurance+service+fees;
    const shock=round(base*(age>6?.075:.05)*luxury,100);
    let retention=durable?.87:.84;if(luxury)retention=.80;if(ev)retention=.79;
    const recovery=round(Math.max(base*.18,base*Math.pow(retention,years)),100);
    const rangeLow=round(annual*.75,100),rangeHigh=round(annual*1.38,100);
    return {annual,growth:4,years,shock,recovery,rangeLow,rangeHigh,confidence:ctx.fuel?'Useful':'Planning',
      lines:[
        ['Energy / fuel',energy,ctx.fuel?'Connected EPA/DOE or Check context':'usage-based planning estimate'],
        ['Insurance reserve',insurance,'broad planning estimate; driver-specific quote can differ materially'],
        ['Service, tires & maintenance',service,'adjusted for age, class and annual miles'],
        ['Registration / recurring fees',fees,'general annual allowance']
      ],
      note:`${clean(d.model)||'Vehicle'} modeled at about ${annualMiles.toLocaleString()} miles/year${d.location?` in ${clean(d.location)}`:''}. Financing is not included unless you model it separately.`,
      driver:ctx.fuel?'Insurance, maintenance and depreciation are now the biggest unresolved layers.':'Exact model, mileage and location can move the running-cost range substantially.'
    };
  }

  function propertyBaseline(ctx,d,years){
    const base=ctx.base||0,loc=locationFactor(d.location||ctx.location),type=d.propertyType||'home';
    const tax=round(base*.011*loc,100),insurance=round(base*.0035*loc,100),maintenance=round(base*(type==='condo'?.0045:.008),100),hoa=round((Number(d.hoa)||0)*12,100);
    const annual=tax+insurance+maintenance+hoa,shock=round(base*(type==='condo'?.025:.035),500),recovery=round(base*Math.pow(1.025,years)*.94,1000);
    return {annual,growth:3,years,shock,recovery,rangeLow:round(annual*.72,100),rangeHigh:round(annual*1.45,100),confidence:'Planning',
      lines:[['Property tax reserve',tax,'broad rate assumption; replace with actual tax record'],['Insurance reserve',insurance,'planning estimate; quote varies by location and property'],['Maintenance / building reserve',maintenance,type==='condo'?'lower direct maintenance assumption for condo':'general ownership reserve'],['HOA',hoa,hoa?'user supplied':'not included until supplied']],
      note:`Ownership baseline for a ${type==='condo'?'condo':'property'}${d.location?` in ${clean(d.location)}`:''}. Mortgage principal and interest are not included because financing terms are decision-specific.`,
      driver:'Actual taxes, insurance, HOA and financing terms are the highest-value refinements.'
    };
  }

  function projectBaseline(ctx,d,years){
    const base=ctx.base||0,isEquip=/equipment|business-project/.test(ctx.category),annual=round(base*(isEquip?.08:.005),100),shock=round(base*(isEquip?.10:.15),100),recovery=isEquip?round(Math.max(base*.10,base*Math.pow(.80,years)),100):0;
    return {annual,growth:3,years,shock,recovery,rangeLow:round(annual*.5,100),rangeHigh:round(annual*1.6,100),confidence:'Planning',
      lines:isEquip?[['Service + operating reserve',annual,'8% of acquisition cost planning baseline'],['Install / downtime reserve',shock,'10% one-time planning reserve'],['Illustrative salvage / resale',recovery,`after ${years} years`]]
                   :[['Post-project upkeep',annual,'0.5% annual planning reserve'],['Change-order / scope reserve',shock,'15% of quoted amount'],['Automatic recovery',0,'not assumed; value-added is project-specific']],
      note:`${clean(d.item)||ctx.title||'Project'} is modeled as a first-pass cost envelope. Scope, location, schedule and exclusions can matter more than the headline quote.`,
      driver:isEquip?'Utilization, service contract, energy and downtime are the biggest refinements.':'Scope definition and exclusions are usually the biggest sources of surprise.'
    };
  }

  function generalBaseline(ctx,d,years){
    const base=ctx.base||0,annual=round(base*.02,100),shock=round(base*.10,100),recovery=round(base*.15,100);
    return {annual,growth:3,years,shock,recovery,rangeLow:0,rangeHigh:round(annual*3,100),confidence:'Broad',
      lines:[['Recurring-cost reserve',annual,'2% of entry amount per year'],['Contingency reserve',shock,'10% of entry amount'],['Illustrative recovery',recovery,'15% placeholder for recoverable value; set to zero if not applicable']],
      note:'A generic commitment baseline is intentionally broad. Tell Twin exactly what this is and it can narrow the model.',
      driver:'The exact item, expected life and recurring costs are the most valuable details.'
    };
  }

  function baselineFor(ctx,d,years=5){
    years=clamp(Number(years)||5,1,10);
    if(ctx.category==='vehicle')return vehicleBaseline(ctx,d,years);
    if(ctx.category==='property')return propertyBaseline(ctx,d,years);
    if(/home|business-project|equipment/.test(ctx.category))return projectBaseline(ctx,d,years);
    return generalBaseline(ctx,d,years);
  }

  function detailForm(ctx,d){
    if(ctx.category==='vehicle')return `
      <label class="wide">Exact year / make / model / trim<input data-smart="model" value="${esc(d.model||'')}" placeholder="e.g. 2023 BMW X5 xDrive40i"></label>
      <label>Model year<input data-smart="year" type="number" min="1990" max="${new Date().getFullYear()+1}" value="${esc(d.year||'')}" placeholder="2023"></label>
      <label>Annual miles<input data-smart="annualMiles" type="number" min="1000" step="1000" value="${esc(d.annualMiles||12000)}" placeholder="12000"></label>
      <label class="wide">Location<input data-smart="location" value="${esc(d.location||'')}" placeholder="Chicago, IL"></label>`;
    if(ctx.category==='property')return `
      <label class="wide">Address / city<input data-smart="location" value="${esc(d.location||'')}" placeholder="Chicago, IL or exact address"></label>
      <label>Property type<select data-smart="propertyType"><option value="home"${d.propertyType==='home'?' selected':''}>House / property</option><option value="condo"${d.propertyType==='condo'?' selected':''}>Condo</option></select></label>
      <label>HOA / month<input data-smart="hoa" type="number" min="0" step="25" value="${esc(d.hoa||'')}" placeholder="0 if none"></label>`;
    if(/home|business-project|equipment/.test(ctx.category))return `
      <label class="wide">Exact project / equipment<input data-smart="item" value="${esc(d.item||'')}" placeholder="e.g. 5-ton rooftop unit, kitchen remodel"></label>
      <label>Location<input data-smart="location" value="${esc(d.location||'')}" placeholder="Chicago, IL"></label>
      <label>Annual use / scope clue<input data-smart="usage" value="${esc(d.usage||'')}" placeholder="hours, sq ft, units, etc."></label>`;
    return `
      <label class="wide">What exactly is this?<input data-smart="item" value="${esc(d.item||'')}" placeholder="Exact product, service or commitment"></label>
      <label>Location<input data-smart="location" value="${esc(d.location||'')}" placeholder="Optional"></label>
      <label>Expected life<input data-smart="lifespan" value="${esc(d.lifespan||'')}" placeholder="e.g. 3 years"></label>`;
  }

  function categoryAsks(c){
    if(/vehicle/.test(c))return [
      ['Dealer fees','Ask for the full out-the-door price with every fee itemized before discussing a monthly payment.'],
      ['Financing terms','Negotiate APR, term and add-ons separately from vehicle price.'],
      ['Condition / recall completion','Use unresolved VIN, condition or recall status as a diligence condition—not as a made-up discount.']
    ];
    if(/property/.test(c))return [
      ['Credits / closing costs','If price leverage is weak, negotiate seller credits, repairs or closing-cost support where appropriate.'],
      ['Condition items','Convert inspection or system uncertainty into specific repair, credit or contingency requests.'],
      ['Timing / contingencies','Closing timing, financing, inspection and appraisal terms can have real value beyond headline price.']
    ];
    if(/home|project|equipment/.test(c))return [
      ['Scope certainty','Require inclusions, exclusions, allowances and change-order rules in writing before negotiating price.'],
      ['Schedule / warranty','Negotiate completion, commissioning, warranty and failure responsibility—not just a lower number.'],
      ['Payment structure','Tie deposits and progress payments to verifiable milestones where appropriate.']
    ];
    return [
      ['Total delivered price','Separate taxes, fees, subscriptions and required add-ons from the advertised amount.'],
      ['Terms / warranty','Negotiate cancellation, warranty, service and payment terms when direct price evidence is weak.'],
      ['Reversibility','Ask for the cleanest return, cancellation or exit path available before commitment.']
    ];
  }

  function decisionKey(ctx){return `${ctx.category}|${ctx.title}|${ctx.base}`.toLowerCase()}

  function smartPanel(ctx,b,d){
    const five=scenarioTotal(ctx.base,0,b.annual,b.growth,b.years,b.shock,b.recovery);
    return `<section class="ei-twin-smart" data-twin-smart-panel>
      <div class="ei-twin-smart-head"><div><span>Twin intelligence / automatic first pass</span><h4>Here is the cost model before you touch a slider.</h4><p>ExpenseIntel builds a planning baseline from the category, price and connected Check data. Tell it what the thing actually is and it tightens the assumptions.</p></div><div class="ei-twin-smart-badge">${esc(b.confidence)} baseline · editable</div></div>
      <div class="ei-twin-smart-kpis">
        <div><span>Annual carry</span><strong data-smart-annual>${money(b.annual)}</strong><small>${money(b.rangeLow)}–${money(b.rangeHigh)} planning range</small></div>
        <div><span>${b.years}-yr carry</span><strong data-smart-carry>${money(five.recurring)}</strong><small>with ${b.growth}% annual growth</small></div>
        <div><span>One-time reserve</span><strong data-smart-shock>${money(b.shock)}</strong><small>visible downside envelope</small></div>
        <div><span>Illustrative exit</span><strong data-smart-exit>${b.recovery?money(b.recovery):'$0'}</strong><small>not guaranteed</small></div>
        <div><span>Net commitment</span><strong data-smart-total>${money(five.total)}</strong><small>entry + carry + reserve − exit</small></div>
      </div>
      <div class="ei-twin-smart-body"><div class="ei-twin-smart-assumptions"><span>What Twin assumed</span><div class="ei-twin-smart-lines" data-smart-lines>${b.lines.map(x=>`<div class="ei-twin-smart-line"><strong>${esc(x[0])}</strong><b>${money(x[1])}</b><small>${esc(x[2])}</small></div>`).join('')}</div><p class="ei-twin-auto-note" data-smart-note>${esc(b.note)} ${esc(b.driver)}</p></div>
      <div class="ei-twin-refine"><span>Improve this in 15 seconds</span><h5>${ctx.category==='vehicle'?'Which exact car is it?':ctx.category==='property'?'Which exact property is it?':'Tell Twin what this actually is.'}</h5><p>These details are used to refine the planning baseline. They are not treated as verified quotes.</p><div class="ei-twin-refine-grid">${detailForm(ctx,d)}</div><div class="ei-twin-refine-actions"><button type="button" data-smart-apply>Apply refined baseline</button><small>Every estimate stays editable below.</small></div></div></div>
    </section>`;
  }

  function buildSuite(root){
    if($('.ei-twin-suite',root))return;
    const pass=$('.ei-live-passport',root);if(!pass)return;
    ensureStyles();
    const ctx=context(root),key=decisionKey(ctx),allSaved=read(TWIN,{})||{},saved=allSaved.decisionKey===key?allSaved:{},detail=detailDefaults(ctx,saved.detail||{}),years=Number(saved.years)||5,b=baselineFor(ctx,detail,years),suite=document.createElement('div');suite.className='ei-twin-suite';
    const initialAnnual=Number.isFinite(Number(saved.annual))&&saved.annual!==''?Number(saved.annual):b.annual;
    const initialGrowth=Number.isFinite(Number(saved.growth))&&saved.growth!==''?Number(saved.growth):b.growth;
    const initialShock=Number.isFinite(Number(saved.shock))&&saved.shock!==''?Number(saved.shock):b.shock;
    const initialRecovery=Number.isFinite(Number(saved.recovery))&&saved.recovery!==''?Number(saved.recovery):b.recovery;
    suite.innerHTML=`<section class="ei-decision-twin"><div class="ei-twin-head"><div><div class="ei-twin-kicker">Decision Twin / Live scenario</div><h3>Start with the price. Twin fills in the rest.</h3></div><p>Instead of waiting for you to know every cost, Twin builds a visible planning baseline, tells you what it assumed, and asks only for details that materially change the answer.</p></div>${smartPanel(ctx,b,detail)}<div class="ei-twin-grid"><div class="ei-twin-controls"><div class="ei-twin-base"><span>Known commitment amount</span><strong data-twin-base>${ctx.base?money(ctx.base):'Add a price to model'}</strong></div><div class="ei-twin-field"><label>Price change vs. current <output data-twin-delta-out>$0</output></label><input data-twin-delta type="range" min="${ctx.base?-Math.min(ctx.base*.25,50000):-10000}" max="${ctx.base?Math.min(ctx.base*.25,50000):10000}" step="100" value="${Number(saved.delta)||0}"></div><div class="ei-twin-field" data-estimated="${saved.annual==null?'1':'0'}"><label>Annual recurring burden</label><input data-twin-annual type="number" min="0" step="100" value="${round(initialAnnual,50)}" placeholder="Planning baseline"></div><div class="ei-twin-field" data-estimated="${saved.growth==null?'1':'0'}"><label>Annual cost growth <output data-twin-growth-out>${initialGrowth}%</output></label><input data-twin-growth type="range" min="0" max="12" step=".5" value="${initialGrowth}"></div><div class="ei-twin-field" data-estimated="${saved.years==null?'1':'0'}"><label>Model horizon <output data-twin-years-out>${years} years</output></label><input data-twin-years type="range" min="1" max="10" step="1" value="${years}"></div><div class="ei-twin-field" data-estimated="${saved.shock==null?'1':'0'}"><label>One-time downside / hidden-cost reserve</label><input data-twin-shock type="number" min="0" step="100" value="${round(initialShock,100)}" placeholder="Planning reserve"></div><div class="ei-twin-field" data-estimated="${saved.recovery==null?'1':'0'}"><label>Recovery / exit value</label><input data-twin-recovery type="number" min="0" step="100" value="${round(initialRecovery,100)}" placeholder="Illustrative recovery"></div>${ctx.fuel?`<div class="ei-twin-source"><span>Connected recurring signal</span><strong>${money(ctx.fuel)} / yr fuel context</strong><small>This figure came from the active Check and is already incorporated in the vehicle baseline where applicable.</small></div>`:''}</div><div class="ei-twin-stage"><div class="ei-twin-readouts"><div class="ei-twin-readout primary"><span>Scenario cash commitment</span><strong data-twin-total>—</strong></div><div class="ei-twin-readout"><span>Recurring burden in horizon</span><strong data-twin-recurring>—</strong></div><div class="ei-twin-readout"><span>Difference vs. entry price</span><strong data-twin-gap>—</strong></div></div><div class="ei-twin-chart"><div class="ei-twin-chart-label">Cumulative scenario / estimated + user-controlled</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Decision Twin cumulative scenario chart"><path class="grid" d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"/><path class="base" data-twin-base-line d="M0 50 H100"/><path class="trace" data-twin-trace d=""/><circle class="dot" data-twin-dot cx="95" cy="50" r="2.2"/></svg></div><div class="ei-twin-flow"><div><span>Entry</span><strong data-twin-entry>—</strong></div><div><span>Carry</span><strong data-twin-carry>—</strong></div><div><span>Reserve</span><strong data-twin-shock-out>$0</strong></div><div><span>Exit</span><strong data-twin-recovery-out>$0</strong></div></div><div class="ei-twin-actions"><small>Planning estimates are shown explicitly. Replace any one with a real quote, tax, premium, payment or resale figure as soon as you know it.</small><div><button type="button" data-twin-copy>Copy scenario</button><button type="button" data-twin-negotiate>Use price in negotiation</button></div></div></div></div></section><section class="ei-negotiation"><div class="ei-neg-head"><div><div class="ei-neg-kicker">Negotiation Intelligence / Action layer</div><h3>Turn evidence into leverage without bluffing.</h3></div><p>ExpenseIntel separates real leverage from things you still need to verify, then builds a concise negotiation brief around the outcome you actually want.</p></div><div class="ei-neg-body"><aside class="ei-neg-objective"><span>Objective</span><button type="button" class="active" data-neg-objective="price">Lower the price</button><button type="button" data-neg-objective="terms">Improve the terms</button><button type="button" data-neg-objective="risk">Reduce my risk</button><div class="ei-neg-target"><label>Target amount</label><input data-neg-target type="number" min="0" step="100" placeholder="Optional"><small>Set a target yourself or send the scenario price from Decision Twin.</small></div></aside><div class="ei-neg-main"><div class="ei-neg-position"><span>Negotiation position</span><strong data-neg-position>Building…</strong></div><div class="ei-neg-leverage" data-neg-leverage></div><div class="ei-neg-brief"><div class="ei-neg-brief-head"><span>Evidence-backed brief</span><button type="button" data-neg-copy>Copy brief</button></div><div class="ei-neg-script" data-neg-script></div></div><div class="ei-neg-caution" data-neg-caution></div></div></div></section>`;
    pass.insertAdjacentElement('afterend',suite);
    bindTwin(suite,ctx,key,detail);bindNegotiation(suite,ctx);
  }

  function bindTwin(suite,ctx,key,detail){
    const delta=$('[data-twin-delta]',suite),annual=$('[data-twin-annual]',suite),growth=$('[data-twin-growth]',suite),years=$('[data-twin-years]',suite),shock=$('[data-twin-shock]',suite),recovery=$('[data-twin-recovery]',suite);
    let currentDetail={...detail},applying=false;
    const markManual=e=>{if(applying)return;const f=e.currentTarget.closest('.ei-twin-field');if(f)f.dataset.estimated='0'};
    [annual,growth,years,shock,recovery].forEach(x=>x.addEventListener('input',markManual));

    function readDetail(){const d={...currentDetail};$$('[data-smart]',suite).forEach(el=>{d[el.dataset.smart]=el.type==='number'?(el.value?Number(el.value):''):el.value});return d}
    function baseline(){return baselineFor(ctx,readDetail(),Number(years.value)||5)}
    function renderSmart(b){
      const r=scenarioTotal(ctx.base||0,0,b.annual,b.growth,b.years,b.shock,b.recovery);
      const set=(s,v)=>{const e=$(s,suite);if(e)e.textContent=v};
      set('[data-smart-annual]',money(b.annual));set('[data-smart-carry]',money(r.recurring));set('[data-smart-shock]',money(b.shock));set('[data-smart-exit]',b.recovery?money(b.recovery):'$0');set('[data-smart-total]',money(r.total));
      const lines=$('[data-smart-lines]',suite);if(lines)lines.innerHTML=b.lines.map(x=>`<div class="ei-twin-smart-line"><strong>${esc(x[0])}</strong><b>${money(x[1])}</b><small>${esc(x[2])}</small></div>`).join('');
      set('[data-smart-note]',`${b.note} ${b.driver}`);
      const badge=$('.ei-twin-smart-badge',suite);if(badge)badge.textContent=`${b.confidence} baseline · editable`;
    }
    function applyBaseline(force=false){
      const b=baseline();applying=true;
      const pairs=[[annual,b.annual],[growth,b.growth],[shock,b.shock],[recovery,b.recovery]];
      pairs.forEach(([input,val])=>{const field=input.closest('.ei-twin-field');if(force||field?.dataset.estimated==='1'){input.value=String(round(val,input===growth?.5:input===annual?50:100));if(field)field.dataset.estimated='1'}});
      if(force||years.closest('.ei-twin-field')?.dataset.estimated==='1'){years.value=String(b.years);years.closest('.ei-twin-field').dataset.estimated='1'}
      applying=false;renderSmart(b);update();
    }
    $$('[data-smart]',suite).forEach(el=>el.addEventListener('input',()=>{currentDetail=readDetail();const b=baseline();renderSmart(b);const untouched=[annual,growth,shock,recovery,years].every(x=>x.closest('.ei-twin-field')?.dataset.estimated==='1');if(untouched)applyBaseline(false)}));
    $('[data-smart-apply]',suite)?.addEventListener('click',e=>{currentDetail=readDetail();applyBaseline(true);const old=e.currentTarget.textContent;e.currentTarget.textContent='Baseline applied ✓';setTimeout(()=>e.currentTarget.textContent=old,1300)});

    const update=()=>{
      const v={base:ctx.base||0,delta:Number(delta.value)||0,annual:Number(annual.value)||0,growth:Number(growth.value)||0,years:Number(years.value)||5,shock:Number(shock.value)||0,recovery:Number(recovery.value)||0};
      const r=scenarioTotal(v.base,v.delta,v.annual,v.growth,v.years,v.shock,v.recovery),pts=tracePoints(v),path=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '),last=pts[pts.length-1];
      $('[data-twin-delta-out]',suite).textContent=(v.delta>=0?'+':'')+money(v.delta).replace('$-','-$');$('[data-twin-growth-out]',suite).textContent=v.growth.toFixed(1).replace('.0','')+'%';$('[data-twin-years-out]',suite).textContent=v.years+' year'+(v.years===1?'':'s');$('[data-twin-total]',suite).textContent=ctx.base?money(r.total):'Add a price above';$('[data-twin-recurring]',suite).textContent=money(r.recurring);$('[data-twin-gap]',suite).textContent=ctx.base?`${r.deltaTotal>=0?'+':'−'}${money(Math.abs(r.deltaTotal))}`:'—';$('[data-twin-entry]',suite).textContent=money(r.start);$('[data-twin-carry]',suite).textContent=money(r.recurring);$('[data-twin-shock-out]',suite).textContent=money(v.shock);$('[data-twin-recovery-out]',suite).textContent=v.recovery?`−${money(v.recovery)}`:'$0';$('[data-twin-trace]',suite).setAttribute('d',path);$('[data-twin-dot]',suite).setAttribute('cx',last[0]);$('[data-twin-dot]',suite).setAttribute('cy',last[1]);const baseY=ctx.base?92-(ctx.base/Math.max(...pts.map(p=>p[2]),ctx.base,1))*78:92;$('[data-twin-base-line]',suite).setAttribute('d',`M0 ${baseY.toFixed(1)} H100`);
      currentDetail=readDetail();write(TWIN,{decisionKey:key,delta:v.delta,annual:v.annual,growth:v.growth,years:v.years,shock:v.shock,recovery:v.recovery,detail:currentDetail,updatedAt:new Date().toISOString()});document.dispatchEvent(new CustomEvent('ei:twin-change',{detail:{scenarioPrice:r.start,total:r.total,delta:v.delta}}));
    };
    [delta,annual,growth,years,shock,recovery].forEach(x=>x.addEventListener('input',()=>{update();if(x===years)renderSmart(baseline())}));
    $('[data-twin-copy]',suite).addEventListener('click',async e=>{update();const r=scenarioTotal(ctx.base||0,Number(delta.value)||0,Number(annual.value)||0,Number(growth.value)||0,Number(years.value)||5,Number(shock.value)||0,Number(recovery.value)||0),txt=`ExpenseIntel Decision Twin — ${ctx.title}\nEntry price: ${ctx.base?money(ctx.base):'not entered'}\nScenario entry: ${money(r.start)}\nRecurring burden: ${money(r.recurring)} over ${years.value} years\nOne-time reserve: ${money(Number(shock.value)||0)}\nRecovery / exit: ${money(Number(recovery.value)||0)}\nNet cash commitment: ${money(r.total)}\nBaseline assumptions are planning estimates until replaced with known figures.`;try{await navigator.clipboard.writeText(txt);const old=e.currentTarget.textContent;e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent=old,1400)}catch(_e){}});
    $('[data-twin-negotiate]',suite).addEventListener('click',()=>{const target=$('[data-neg-target]',suite),scenario=Math.max(0,(ctx.base||0)+(Number(delta.value)||0));if(scenario){target.value=String(Math.round(scenario));target.dispatchEvent(new Event('input',{bubbles:true}));$('.ei-negotiation',suite).scrollIntoView({behavior:'smooth',block:'center'})}});
    renderSmart(baseline());update();
  }

  function bindNegotiation(suite,ctx){
    const leverage=$('[data-neg-leverage]',suite),script=$('[data-neg-script]',suite),pos=$('[data-neg-position]',suite),target=$('[data-neg-target]',suite),caution=$('[data-neg-caution]',suite);let objective='price';
    const asks=categoryAsks(ctx.category);
    function evidenceCard(){
      if(ctx.market&&ctx.base){const diff=ctx.base-ctx.market;if(diff>0)return ['Connected market evidence',`${money(ctx.base)} vs ${money(ctx.market)} context`,`The known amount is ${money(diff)} above the connected market figure shown in this Check. Verify that the benchmark is truly comparable before using it as price leverage.`,'CONNECTED'];return ['Connected market evidence','Do not fake a high-price claim',`The known amount is not above the connected market figure shown in this Check. Price leverage may be weaker; focus on terms, scope, fees or risk instead.`,'CONNECTED']}
      return ['Market position unresolved','Price benchmark still open','ExpenseIntel does not currently have a trustworthy market benchmark for this exact decision. Use unresolved facts as conditions and questions, not invented leverage.','OPEN'];
    }
    function render(){
      const targetN=Number(target.value)||0,marketCard=evidenceCard(),unknown=ctx.unknowns[0]||'No decision-critical unknown is currently surfaced in the displayed Check.',ask=asks[objective==='price'?0:objective==='terms'?1:2]||asks[0];
      const cards=[marketCard,['Open diligence item',ctx.unknowns.length?`${ctx.unknowns.length} unresolved item${ctx.unknowns.length===1?'':'s'}`:'No major gap flagged',unknown,ctx.unknowns.length?'VERIFY':'CLEAR'],['Terms leverage',ask[0],ask[1],'ASK']];
      leverage.innerHTML=cards.map(c=>`<article class="ei-neg-card"><span>${esc(c[0])}<b>${esc(c[3])}</b></span><strong>${esc(c[1])}</strong><p>${esc(c[2])}</p></article>`).join('');
      const hasMarket=!!(ctx.market&&ctx.base),hasUnknown=ctx.unknowns.length>0;pos.textContent=hasMarket&&ctx.base>ctx.market?'Evidence-backed price case':hasUnknown?'Conditions-first negotiation':'Terms-first negotiation';
      const objectiveLine=objective==='price'?'I want to discuss the price before I commit.':objective==='terms'?'I want to improve the terms before I commit.':'I want to reduce the unresolved risk before I commit.';
      const marketLine=hasMarket&&ctx.base>ctx.market?`ExpenseIntel shows the current amount at ${money(ctx.base)} versus ${money(ctx.market)} in connected market context. I want to make sure we are comparing like-for-like, but that gap is part of my position.`:hasMarket?'The connected market context does not support me claiming the price is obviously high, so I am focusing on the total terms and unresolved items.':'I do not yet have a strong market benchmark for this exact decision, so I am not going to pretend I do.';
      const unknownLine=ctx.unknowns.length?`Before I commit, I need this resolved: ${ctx.unknowns.slice(0,2).join(' / ')}.`:'The current Check does not surface a major unresolved evidence item, so my focus is on the commercial terms.';
      const targetLine=targetN?`If we can get to ${money(targetN)}${objective==='price'?' on the amount':''}, with the unresolved items addressed, I am prepared to keep moving.`:'I have not set a target amount yet; I would rather negotiate from the actual economics than invent a number.';
      script.textContent=`${objectiveLine}\n\n${marketLine}\n\n${unknownLine}\n\nI also want to address ${ask[0].toLowerCase()}: ${ask[1]}\n\n${targetLine}`;
      caution.textContent=hasMarket?'Use the connected market figure only if the underlying items are genuinely comparable. ExpenseIntel is giving you leverage context, not permission to overstate the evidence.':'Without a strong price benchmark, the better leverage is usually specific fees, terms, scope, condition or risk.';
    }
    $$('[data-neg-objective]',suite).forEach(b=>b.addEventListener('click',()=>{objective=b.dataset.negObjective;$$('[data-neg-objective]',suite).forEach(x=>x.classList.toggle('active',x===b));render()}));target.addEventListener('input',render);document.addEventListener('ei:twin-change',e=>{suite.dataset.twinPrice=String(e.detail?.scenarioPrice||'')});$('[data-neg-copy]',suite).addEventListener('click',async e=>{try{await navigator.clipboard.writeText(script.textContent);const old=e.currentTarget.textContent;e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent=old,1400)}catch(_e){}});render();
  }

  function watch(){const out=$('[data-check-output]');if(!out)return;let t;const run=()=>{clearTimeout(t);t=setTimeout(()=>{const root=$('[data-check-output] .shell');if(root)buildSuite(root)},120)};new MutationObserver(run).observe(out,{subtree:true,childList:true});run()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();