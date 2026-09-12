(()=>{
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    if(document.getElementById('eiCommitmentLab')) return;
    const anchor=document.getElementById('eiWorkedPassport')||document.querySelector('.check-hero');
    if(!anchor) return;

    const section=document.createElement('section');
    section.id='eiCommitmentLab';
    section.className='ei-commitment-lab';
    section.innerHTML=`
      <div class="shell">
        <div class="eicl-head">
          <div>
            <span>COMMITMENT STRESS LAB / ASSUMPTION-DRIVEN</span>
            <h2>Find the number that can actually hurt you.</h2>
            <p>The headline price is only one layer. Stress the commitment with recurring burden, upfront extras, uncertainty reserve and exit recovery to see the capital that is really exposed.</p>
          </div>
          <div class="eicl-badge">LIVE ARITHMETIC<br><b>YOUR ASSUMPTIONS</b></div>
        </div>

        <div class="eicl-grid">
          <form class="eicl-form" id="eiclForm">
            <div class="eicl-fields">
              <label>PRICE / QUOTE<input id="eiclPrice" type="number" min="0" step="100" value="48400"></label>
              <label>UPFRONT EXTRAS<input id="eiclExtras" type="number" min="0" step="100" value="2400"></label>
              <label>MONTHLY BURDEN<input id="eiclMonthly" type="number" min="0" step="10" value="620"></label>
              <label>HOLDING PERIOD<input id="eiclMonths" type="number" min="1" max="360" step="1" value="36"><small>months</small></label>
              <label>UNCERTAINTY RESERVE<input id="eiclReserve" type="number" min="0" max="100" step="1" value="6"><small>% of headline price</small></label>
              <label>EXIT RECOVERY<input id="eiclRecovery" type="number" min="0" max="100" step="1" value="62"><small>% of headline price</small></label>
              <label class="wide">YOUR TOTAL COMMITMENT LIMIT<input id="eiclBudget" type="number" min="0" step="500" value="75000"></label>
            </div>
            <div class="eicl-actions"><button type="button" data-eicl-passport>SEND PRICE TO DECISION PASSPORT →</button><button type="button" class="ghost" data-eicl-copy>COPY STRESS SUMMARY</button></div>
            <p class="eicl-note">This module is transparent arithmetic using the assumptions above. It is not a market forecast, appraisal, financing quote or estimate of actual resale value.</p>
          </form>

          <aside class="eicl-output" aria-live="polite">
            <div class="eicl-status"><span>COMMITMENT PRESSURE</span><b id="eiclStatus">—</b></div>
            <div class="eicl-hero-number"><span>ALL-IN COMMITMENT</span><strong id="eiclAllIn">—</strong></div>
            <div class="eicl-metrics">
              <div><span>NET CAPITAL EXPOSURE</span><b id="eiclExposure">—</b></div>
              <div><span>MONTHLY EQUIVALENT</span><b id="eiclEquivalent">—</b></div>
              <div><span>EXIT RECOVERY ASSUMPTION</span><b id="eiclExit">—</b></div>
              <div><span>LIMIT HEADROOM</span><b id="eiclHeadroom">—</b></div>
            </div>
            <div class="eicl-breakdown" id="eiclBreakdown"></div>
          </aside>
        </div>
      </div>`;

    anchor.insertAdjacentElement('afterend',section);

    const style=document.createElement('style');
    style.id='ei-commitment-lab-style';
    style.textContent=`
      .ei-commitment-lab{border-top:1px solid #1c1b19;border-bottom:1px solid #1c1b19;background:#f4f0e7;padding:58px 0 64px;color:#1c1b19}.eicl-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:36px;align-items:end}.eicl-head>div>span,.eicl-status span,.eicl-hero-number span,.eicl-metrics span{font:800 9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;text-transform:uppercase;color:#8d2f22}.eicl-head h2{margin:9px 0 12px;max-width:900px;font-size:clamp(34px,5vw,68px);line-height:.94;letter-spacing:-.045em}.eicl-head p{max-width:780px;margin:0;color:#615b52;font-size:15px;line-height:1.65}.eicl-badge{min-width:170px;border-left:1px solid #bdb4a5;padding:12px 0 12px 18px;font:700 9px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:#7e7569}.eicl-badge b{color:#1c1b19}.eicl-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.78fr);gap:14px;margin-top:30px}.eicl-form,.eicl-output{border:1px solid #c8c0b3;background:#fbf8f1;padding:22px}.eicl-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.eicl-fields label{position:relative;display:grid;gap:7px;font:800 9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:#5f594f}.eicl-fields label.wide{grid-column:1/-1}.eicl-fields input{width:100%;border:1px solid #c8c0b3;background:#fffdf8;color:#161513;padding:13px 12px;font:700 18px/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}.eicl-fields input:focus{border-color:#8d2f22;box-shadow:0 0 0 2px rgba(141,47,34,.08)}.eicl-fields small{position:absolute;right:10px;bottom:13px;color:#8f877a;font:600 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none}.eicl-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.eicl-actions button{border:1px solid #1c1b19;background:#1c1b19;color:#fff;padding:12px 14px;font-weight:800;font-size:10px;letter-spacing:.03em;cursor:pointer}.eicl-actions button:hover{background:#8d2f22;border-color:#8d2f22}.eicl-actions .ghost{background:transparent;color:#1c1b19}.eicl-actions .ghost:hover{color:#fff}.eicl-note{margin:15px 0 0;color:#81786b;font-size:10px;line-height:1.5}.eicl-output{background:#1c1b19;color:#fff}.eicl-status{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:13px}.eicl-status span{color:#e5a59c}.eicl-status b{font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.eicl-status b[data-tone="good"]{color:#b9e5bc}.eicl-status b[data-tone="tight"]{color:#f2cc87}.eicl-status b[data-tone="over"]{color:#ff9f91}.eicl-hero-number{padding:24px 0 20px}.eicl-hero-number span{color:#a9a195}.eicl-hero-number strong{display:block;margin-top:8px;font:500 clamp(38px,5vw,66px)/.95 Georgia,serif;letter-spacing:-.045em}.eicl-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.12);border-left:1px solid rgba(255,255,255,.12)}.eicl-metrics div{min-height:92px;padding:13px;border-right:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12)}.eicl-metrics span{display:block;color:#9e968b}.eicl-metrics b{display:block;margin-top:10px;font:700 18px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.eicl-breakdown{margin-top:14px;color:#bbb3a7;font-size:10px;line-height:1.65}.eicl-breakdown b{color:#fff}@media(max-width:900px){.eicl-head,.eicl-grid{grid-template-columns:1fr}.eicl-badge{border-left:0;border-top:1px solid #c8c0b3;padding-left:0}.eicl-output{min-width:0}}@media(max-width:620px){.ei-commitment-lab{padding:42px 0}.eicl-fields{grid-template-columns:1fr}.eicl-fields label.wide{grid-column:auto}.eicl-metrics{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const $=id=>document.getElementById(id);
    const money=value=>Number(value||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
    const num=id=>Math.max(0,Number($(id)?.value)||0);

    const calculate=()=>{
      const price=num('eiclPrice');
      const extras=num('eiclExtras');
      const monthly=num('eiclMonthly');
      const months=Math.max(1,num('eiclMonths'));
      const reservePct=num('eiclReserve');
      const recoveryPct=Math.min(100,num('eiclRecovery'));
      const budget=num('eiclBudget');
      const recurring=monthly*months;
      const reserve=price*(reservePct/100);
      const allIn=price+extras+recurring+reserve;
      const exit=price*(recoveryPct/100);
      const exposure=Math.max(0,allIn-exit);
      const equivalent=allIn/months;
      const headroom=budget-allIn;
      const headroomPct=budget?headroom/budget:0;
      let status='WITHIN LIMIT',tone='good';
      if(budget&&headroom<0){status='OVER LIMIT';tone='over'}else if(budget&&headroomPct<.1){status='TIGHT';tone='tight'}
      $('eiclAllIn').textContent=money(allIn);
      $('eiclExposure').textContent=money(exposure);
      $('eiclEquivalent').textContent=`${money(equivalent)}/mo`;
      $('eiclExit').textContent=money(exit);
      $('eiclHeadroom').textContent=(headroom<0?'-':'')+money(Math.abs(headroom));
      const statusEl=$('eiclStatus');statusEl.textContent=status;statusEl.dataset.tone=tone;
      $('eiclBreakdown').innerHTML=`Headline ${money(price)} + upfront extras ${money(extras)} + recurring burden ${money(recurring)} + uncertainty reserve ${money(reserve)} = <b>${money(allIn)}</b>. At the assumed ${recoveryPct.toFixed(0)}% exit recovery, modeled capital exposure is <b>${money(exposure)}</b>.`;
      section.dataset.summary=`ExpenseIntel commitment stress: all-in ${money(allIn)}; modeled exposure ${money(exposure)}; limit headroom ${headroom<0?'-':''}${money(Math.abs(headroom))}; assumptions: ${months} months, ${reservePct}% uncertainty reserve, ${recoveryPct}% exit recovery.`;
    };

    section.querySelectorAll('input').forEach(input=>input.addEventListener('input',calculate));
    calculate();

    section.querySelector('[data-eicl-passport]')?.addEventListener('click',()=>{
      const priceField=document.getElementById('check-price');
      if(priceField){priceField.value=String(Math.round(num('eiclPrice')));priceField.dispatchEvent(new Event('input',{bubbles:true}));priceField.dispatchEvent(new Event('change',{bubbles:true}))}
      document.getElementById('check-form')?.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>priceField?.focus(),450);
    });

    section.querySelector('[data-eicl-copy]')?.addEventListener('click',async(event)=>{
      const button=event.currentTarget;
      try{await navigator.clipboard.writeText(section.dataset.summary||'');button.textContent='SUMMARY COPIED';setTimeout(()=>button.textContent='COPY STRESS SUMMARY',1300)}catch{button.textContent='COPY UNAVAILABLE'}
    });
  });
})();
