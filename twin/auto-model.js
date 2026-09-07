(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const pct=(n,d=1)=>`${Number(n).toFixed(d).replace(/\.0$/,'')}%`;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const round=(n,step=10)=>Math.round((Number(n)||0)/step)*step;

  const PROFILES={
    property:{
      title:'Typical ownership cost stack',confidence:'Medium',defaultYears:5,growth:3,
      estimate:(base,years)=>{
        const tax=.011,insurance=.0035,maintenance=.009,upfront=.035,appreciation=.025,saleFriction=.06;
        const monthly=base*(tax+insurance+maintenance)/12;
        const shock=base*upfront;
        const recovery=base*Math.pow(1+appreciation,years)*(1-saleFriction);
        return{monthly,shock,recovery,
          lines:[
            ['Property tax reserve',base*tax,'per year',`${pct(tax*100)} of price baseline`],
            ['Insurance reserve',base*insurance,'per year',`${pct(insurance*100)} of price baseline`],
            ['Maintenance reserve',base*maintenance,'per year',`${pct(maintenance*100)} of price baseline`],
            ['Closing + early-cost reserve',shock,'one time',`${pct(upfront*100)} of price baseline`],
            ['Illustrative net exit value',recovery,`after ${years} yrs`,'2.5%/yr value growth, less 6% selling friction']
          ],
          range:{monthlyLow:base*.016/12,monthlyHigh:base*.038/12,shockLow:base*.02,shockHigh:base*.055}
        };
      },
      note:'A planning baseline, not a local tax or insurance quote. Property costs vary materially by location, building, financing and condition.'
    },
    vehicle:{
      title:'Typical vehicle ownership stack',confidence:'Medium',defaultYears:5,growth:4,
      estimate:(base,years)=>{
        const monthly=300+base*.003;
        const shock=base*.06;
        const recovery=Math.max(base*.25,base*Math.pow(.84,years));
        return{monthly,shock,recovery,
          lines:[
            ['Insurance, fuel, service + fees',monthly,'per month','baseline running-cost bundle'],
            ['Repair / deductible reserve',shock,'one time',`${pct(6)} of purchase price`],
            ['Illustrative resale value',recovery,`after ${years} yrs`,'16% annual value decline, 25% floor']
          ],
          range:{monthlyLow:monthly*.72,monthlyHigh:monthly*1.45,shockLow:base*.03,shockHigh:base*.10}
        };
      },
      note:'Fuel, insurance and depreciation depend heavily on model, mileage, age, driver and location. Twin uses a broad planning baseline until you replace it.'
    },
    renovation:{
      title:'Typical renovation cost stack',confidence:'Medium',defaultYears:3,growth:3,
      estimate:(base)=>{
        const monthly=base*.005/12,shock=base*.15,recovery=0;
        return{monthly,shock,recovery,
          lines:[
            ['Post-project upkeep reserve',base*.005,'per year','0.5% of project value'],
            ['Change-order / scope contingency',shock,'one time','15% planning contingency'],
            ['Automatic recovery value',0,'not assumed','value-added is too project-specific to infer safely']
          ],
          range:{monthlyLow:0,monthlyHigh:base*.012/12,shockLow:base*.08,shockHigh:base*.25}
        };
      },
      note:'For construction work, scope quality drives the result more than the headline quote. The contingency is deliberately visible instead of buried.'
    },
    contractor:{
      title:'Typical contractor quote stack',confidence:'Medium',defaultYears:1,growth:3,
      estimate:(base)=>{
        const monthly=0,shock=base*.10,recovery=0;
        return{monthly,shock,recovery,
          lines:[
            ['Recurring burden',0,'not assumed','cannot be inferred from a one-time quote'],
            ['Exclusion / change-order reserve',shock,'one time','10% planning contingency'],
            ['Recovery value',0,'not assumed','not normally recoverable as cash']
          ],
          range:{monthlyLow:0,monthlyHigh:0,shockLow:base*.05,shockHigh:base*.20}
        };
      },
      note:'A quote can look precise while exclusions are not. Twin automatically gives the unknown-scope risk its own line instead of pretending the quoted number is the whole commitment.'
    },
    equipment:{
      title:'Typical equipment ownership stack',confidence:'Medium',defaultYears:5,growth:3,
      estimate:(base,years)=>{
        const monthly=base*.08/12,shock=base*.10,recovery=Math.max(base*.10,base*Math.pow(.80,years));
        return{monthly,shock,recovery,
          lines:[
            ['Service + operating reserve',base*.08,'per year','8% of acquisition cost'],
            ['Failure / install reserve',shock,'one time','10% of acquisition cost'],
            ['Illustrative resale / salvage',recovery,`after ${years} yrs`,'20% annual decline, 10% floor']
          ],
          range:{monthlyLow:base*.04/12,monthlyHigh:base*.15/12,shockLow:base*.05,shockHigh:base*.20}
        };
      },
      note:'Actual equipment economics depend on utilization, service contracts, energy, labor and downtime. This is a first-pass ownership envelope.'
    },
    software:{
      title:'Typical software commitment stack',confidence:'Low',defaultYears:3,growth:5,
      estimate:(base)=>{
        const monthly=base*.03,shock=base*.15,recovery=0;
        return{monthly,shock,recovery,
          lines:[
            ['Recurring seats / usage',monthly,'per month','3% of entry amount baseline'],
            ['Migration / overage reserve',shock,'one time','15% of entry amount'],
            ['Recovery value',0,'not assumed','software spend is usually not recoverable']
          ],
          range:{monthlyLow:base*.01,monthlyHigh:base*.08,shockLow:base*.05,shockHigh:base*.30}
        };
      },
      note:'Software pricing structures vary too much for a tight estimate. Twin fills a deliberately broad baseline so the user sees the missing economics immediately.'
    },
    lease:{
      title:'Lease commitment stack',confidence:'Low',defaultYears:3,growth:3,
      estimate:(base)=>({
        monthly:0,shock:base*.20,recovery:base*.50,
        lines:[
          ['Recurring payment',0,'needs input','a deposit or upfront amount does not reliably reveal monthly rent'],
          ['Termination / damage reserve',base*.20,'one time','20% of upfront amount baseline'],
          ['Potential refundable value',base*.50,'at exit','50% of upfront amount baseline; edit if deposit terms are known']
        ],
        range:{monthlyLow:0,monthlyHigh:0,shockLow:base*.10,shockHigh:base*.50}
      }),
      note:'Twin will not invent a monthly lease payment from a deposit. It fills the pieces that can be modeled and explicitly flags the recurring payment as an unresolved variable.'
    },
    education:{
      title:'Typical education cost stack',confidence:'Low',defaultYears:4,growth:4,
      estimate:(base)=>{
        const annual=base*.35,monthly=annual/12,shock=base*.10,recovery=0;
        return{monthly,shock,recovery,
          lines:[
            ['Housing, fees, books + travel',annual,'per year','35% of tuition / program amount baseline'],
            ['Extra-term / relocation reserve',shock,'one time','10% of entry amount'],
            ['Recovery value',0,'not assumed','education spend is not treated as cash-recoverable']
          ],
          range:{monthlyLow:base*.20/12,monthlyHigh:base*.60/12,shockLow:base*.05,shockHigh:base*.20}
        };
      },
      note:'Living costs, aid and program structure vary widely. The point is to stop tuition from being mistaken for the full cost of attendance.'
    },
    travel:{
      title:'Typical trip / event cost stack',confidence:'Low',defaultYears:1,growth:3,
      estimate:(base)=>({
        monthly:0,shock:base*.15,recovery:base*.10,
        lines:[
          ['Ongoing spend',0,'not assumed','trip duration is needed before a monthly rate is meaningful'],
          ['Change / disruption reserve',base*.15,'one time','15% of booked cost'],
          ['Potential credits / refunds',base*.10,'at exit','10% baseline; replace with actual cancellation terms']
        ],
        range:{monthlyLow:0,monthlyHigh:0,shockLow:base*.08,shockHigh:base*.30}
      }),
      note:'Travel is timing-specific. Twin estimates disruption exposure but leaves daily spending unresolved until the user provides trip length or a known budget.'
    },
    other:{
      title:'General commitment stack',confidence:'Low',defaultYears:3,growth:3,
      estimate:(base)=>({
        monthly:base*.02/12,shock:base*.10,recovery:0,
        lines:[
          ['Recurring burden reserve',base*.02,'per year','2% of entry amount'],
          ['Contingency reserve',base*.10,'one time','10% of entry amount'],
          ['Recovery value',0,'not assumed','add only if it is genuinely recoverable']
        ],
        range:{monthlyLow:0,monthlyHigh:base*.06/12,shockLow:base*.05,shockHigh:base*.25}
      }),
      note:'A generic baseline is intentionally conservative. Choosing a specific decision type produces a more useful model.'
    }
  };

  const manual={recurring:false,growth:false,shock:false,recovery:false,years:false};
  let applying=false;

  function ensureStyles(){
    if($('#ei-auto-style')) return;
    const style=document.createElement('style');
    style.id='ei-auto-style';
    style.textContent=`
      .ei-auto-model{margin:18px 0 24px;border:1px solid rgba(26,32,28,.16);background:linear-gradient(135deg,rgba(184,255,63,.16),rgba(255,255,255,.78) 48%,rgba(255,255,255,.56));box-shadow:0 18px 50px rgba(24,30,26,.07);overflow:hidden}
      .ei-auto-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:20px 22px;border-bottom:1px solid rgba(26,32,28,.12)}
      .ei-auto-head span,.ei-auto-kpi span,.ei-auto-row span{display:block;font-size:11px;letter-spacing:.11em;text-transform:uppercase;opacity:.62}
      .ei-auto-head h3{margin:5px 0 6px;font-size:24px;line-height:1.02;letter-spacing:-.03em}.ei-auto-head p{margin:0;max-width:760px;font-size:13px;line-height:1.5;opacity:.72}
      .ei-auto-badge{white-space:nowrap;border:1px solid rgba(26,32,28,.18);padding:7px 10px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;background:#fff}.ei-auto-badge b{color:#397d00}
      .ei-auto-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid rgba(26,32,28,.12)}
      .ei-auto-kpi{padding:18px 20px;border-right:1px solid rgba(26,32,28,.11)}.ei-auto-kpi:last-child{border-right:0}.ei-auto-kpi strong{display:block;margin-top:6px;font-size:22px;letter-spacing:-.03em}.ei-auto-kpi small{display:block;margin-top:4px;font-size:11px;opacity:.58}
      .ei-auto-body{display:grid;grid-template-columns:1.35fr .65fr}.ei-auto-lines{padding:8px 20px}.ei-auto-row{display:grid;grid-template-columns:1.4fr .7fr .7fr;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(26,32,28,.09)}.ei-auto-row:last-child{border-bottom:0}.ei-auto-row b{font-size:14px}.ei-auto-row small{font-size:11px;opacity:.62;text-align:right}
      .ei-auto-side{padding:18px 20px;border-left:1px solid rgba(26,32,28,.12);background:rgba(255,255,255,.42)}.ei-auto-side strong{display:block;font-size:13px;margin-bottom:8px}.ei-auto-side p{font-size:12px;line-height:1.5;margin:0 0 14px;opacity:.7}.ei-auto-actions{display:flex;gap:8px;flex-wrap:wrap}.ei-auto-actions button{border:1px solid rgba(26,32,28,.2);background:#fff;padding:9px 11px;font:inherit;font-size:11px;cursor:pointer}.ei-auto-actions button.primary{background:#182018;color:#fff}.ei-auto-estimated{outline:2px solid rgba(142,211,34,.28);outline-offset:1px}
      @media(max-width:900px){.ei-auto-kpis{grid-template-columns:1fr 1fr}.ei-auto-kpi:nth-child(2){border-right:0}.ei-auto-kpi:nth-child(-n+2){border-bottom:1px solid rgba(26,32,28,.11)}.ei-auto-body{grid-template-columns:1fr}.ei-auto-side{border-left:0;border-top:1px solid rgba(26,32,28,.12)}}
      @media(max-width:620px){.ei-auto-head{display:block}.ei-auto-badge{display:inline-block;margin-top:12px}.ei-auto-kpis{grid-template-columns:1fr}.ei-auto-kpi{border-right:0;border-bottom:1px solid rgba(26,32,28,.11)!important}.ei-auto-row{grid-template-columns:1fr auto}.ei-auto-row small{grid-column:1/-1;text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function injectPanel(){
    if($('#tw-auto-model')) return;
    const toolbar=$('.twin-toolbar');
    if(!toolbar) return;
    const section=document.createElement('section');
    section.id='tw-auto-model';section.className='ei-auto-model';
    section.innerHTML=`
      <div class="ei-auto-head"><div><span>Auto model / baseline intelligence</span><h3 id="ei-auto-title">ExpenseIntel estimated cost stack</h3><p>Enter one known price. Twin fills the costs people usually forget, shows the assumptions, and keeps every estimate editable.</p></div><div class="ei-auto-badge"><b>AUTO-FILLED</b> · <span id="ei-auto-confidence">—</span> confidence</div></div>
      <div class="ei-auto-kpis">
        <div class="ei-auto-kpi"><span>Known price</span><strong id="ei-auto-base">—</strong><small>your anchor</small></div>
        <div class="ei-auto-kpi"><span>Estimated running cost</span><strong id="ei-auto-monthly">—</strong><small id="ei-auto-monthly-note">per month</small></div>
        <div class="ei-auto-kpi"><span>One-time extras / reserve</span><strong id="ei-auto-shock">—</strong><small>added automatically</small></div>
        <div class="ei-auto-kpi"><span>Planning range</span><strong id="ei-auto-range">—</strong><small>running cost range</small></div>
      </div>
      <div class="ei-auto-body"><div class="ei-auto-lines" id="ei-auto-lines"></div><aside class="ei-auto-side"><strong>What ExpenseIntel is doing</strong><p id="ei-auto-note">Enter a known amount to generate a planning baseline.</p><div class="ei-auto-actions"><button type="button" class="primary" id="ei-auto-reapply">Reapply estimates</button><button type="button" id="ei-auto-clear">Clear estimates</button></div></aside></div>`;
    toolbar.insertAdjacentElement('afterend',section);
  }

  function field(id){return $(id)}
  function markEstimated(el,on){if(!el)return;el.classList.toggle('ei-auto-estimated',!!on);if(on)el.dataset.eiEstimated='true';else delete el.dataset.eiEstimated}
  function setField(id,value,key,step=1){
    const el=field(id);if(!el||manual[key])return;
    applying=true;
    el.value=String(round(value,step));
    markEstimated(el,true);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    applying=false;
  }
  function currentType(){return field('#tw-type')?.value||'other'}
  function currentBase(){return Number(field('#tw-base')?.value)||0}
  function currentYears(){return Number(field('#tw-years')?.value)||PROFILES[currentType()]?.defaultYears||5}
  function currentGrowth(){return Number(field('#tw-growth')?.value)||0}

  function estimateTotal(base,monthly,shock,recovery,growth,years){
    let carry=0,annual=monthly*12;
    for(let y=0;y<years;y++)carry+=annual*Math.pow(1+growth/100,y);
    return Math.max(0,base+carry+shock-recovery);
  }

  function render(base,profile,e){
    const years=currentYears(),growth=currentGrowth();
    $('#ei-auto-title').textContent=profile.title;
    $('#ei-auto-confidence').textContent=profile.confidence;
    $('#ei-auto-base').textContent=base?money(base):'—';
    $('#ei-auto-monthly').textContent=base?money(e.monthly):'—';
    $('#ei-auto-shock').textContent=base?money(e.shock):'—';
    $('#ei-auto-range').textContent=base?`${money(e.range.monthlyLow)}–${money(e.range.monthlyHigh)}`:'—';
    $('#ei-auto-note').textContent=base?profile.note:'Enter a known amount to generate a planning baseline.';
    $('#ei-auto-lines').innerHTML=base?e.lines.map(([name,val,when,why])=>`<div class="ei-auto-row"><div><span>${name}</span><b>${why}</b></div><strong>${money(val)}</strong><small>${when}</small></div>`).join(''):`<div class="ei-auto-row"><div><span>Start here</span><b>Type one price above.</b></div><strong>→</strong><small>Twin will estimate the rest.</small></div>`;
    const total=base?estimateTotal(base,e.monthly,e.shock,e.recovery,growth,years):0;
    const totalEl=field('#tw-total-note');
    if(base&&totalEl) totalEl.textContent=`${years} year horizon · includes editable ExpenseIntel baseline estimates`;
    const summary=field('#tw-summary');
    if(base&&summary) summary.dataset.autoTotal=String(total);
  }

  function applyEstimates({force=false,typeChanged=false}={}){
    const type=currentType(),profile=PROFILES[type]||PROFILES.other,base=currentBase();
    if(force||typeChanged){Object.keys(manual).forEach(k=>manual[k]=false)}
    if(!base){render(0,profile,profile.estimate(0,profile.defaultYears));return}
    if((force||typeChanged)&&!manual.years)setField('#tw-years',profile.defaultYears,'years',1);
    const years=currentYears();
    const e=profile.estimate(base,years);
    setField('#tw-recurring',e.monthly,'recurring',10);
    const freq=field('#tw-frequency');if(freq&&!manual.recurring){applying=true;freq.value='monthly';freq.dispatchEvent(new Event('change',{bubbles:true}));applying=false;markEstimated(freq,true)}
    setField('#tw-growth',profile.growth,'growth',.5);
    setField('#tw-shock',e.shock,'shock',100);
    setField('#tw-recovery',e.recovery,'recovery',100);
    requestAnimationFrame(()=>render(base,profile,profile.estimate(base,currentYears())));
  }

  function bindManual(id,key){
    const el=field(id);if(!el)return;
    const fn=(ev)=>{if(applying||!ev.isTrusted)return;manual[key]=true;markEstimated(el,false);requestAnimationFrame(()=>{const p=PROFILES[currentType()]||PROFILES.other;render(currentBase(),p,p.estimate(currentBase(),currentYears()))})};
    el.addEventListener('input',fn);el.addEventListener('change',fn);
  }

  function init(){
    if(!field('#tw-type')||!field('#tw-base'))return;
    ensureStyles();injectPanel();
    const hero=$('.twin-hero p');if(hero)hero.textContent='Choose the commitment and enter the one number you know. Twin automatically builds a realistic planning baseline around it — running costs, one-time extras, growth, downside and recoverable value — then lets you change every assumption.';
    const rule=$('.twin-hero-note strong');if(rule)rule.textContent='Estimates are visible, editable and labeled.';
    const ruleSmall=$('.twin-hero-note small');if(ruleSmall)ruleSmall.textContent='Twin fills a planning baseline when it can. It never hides the formula, and it flags variables that cannot be responsibly inferred from the entry price alone.';
    const meta=field('#tw-active-meta');if(meta)meta.textContent='Enter a known amount and Twin will build the first-pass cost stack automatically.';
    bindManual('#tw-recurring','recurring');bindManual('#tw-growth','growth');bindManual('#tw-shock','shock');bindManual('#tw-recovery','recovery');bindManual('#tw-years','years');
    field('#tw-base').addEventListener('input',()=>applyEstimates());
    field('#tw-base').addEventListener('change',()=>applyEstimates());
    field('#tw-type').addEventListener('change',()=>applyEstimates({typeChanged:true}));
    field('#tw-years').addEventListener('input',()=>{if(!applying){const p=PROFILES[currentType()]||PROFILES.other,e=p.estimate(currentBase(),currentYears());if(!manual.recovery)setField('#tw-recovery',e.recovery,'recovery',100);render(currentBase(),p,e)}});
    $('#ei-auto-reapply')?.addEventListener('click',()=>applyEstimates({force:true}));
    $('#ei-auto-clear')?.addEventListener('click',()=>{
      applying=true;['#tw-recurring','#tw-shock','#tw-recovery'].forEach(id=>{const el=field(id);if(el){el.value='';markEstimated(el,false);el.dispatchEvent(new Event('input',{bubbles:true}))}});applying=false;
      manual.recurring=manual.shock=manual.recovery=true;
      const p=PROFILES[currentType()]||PROFILES.other;render(currentBase(),p,p.estimate(currentBase(),currentYears()));
    });
    setTimeout(()=>applyEstimates(),60);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
