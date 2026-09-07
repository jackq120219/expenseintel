(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const path=location.pathname;

  function currentNav(){
    const nav=$('.navlinks');if(!nav)return;
    const items=[['/check/','Check'],['/twin/','Twin'],['/watch/','Watch'],['/project/','Project'],['/data/','Evidence'],['/about/','About']];
    const active=href=>href==='/check/'?(path==='/'||path.startsWith('/check/')||path.startsWith('/fairprice/')||path.startsWith('/truecost/')||path.startsWith('/timing/')||path.startsWith('/shock/')):path.startsWith(href);
    const sig=items.map(([h,l])=>`${h}:${l}:${active(h)}`).join('|');if(nav.dataset.eiFinalSig===sig)return;nav.dataset.eiFinalSig=sig;
    nav.innerHTML=items.map(([h,l])=>`<a href="${h}"${active(h)?' class="active"':''}>${l}</a>`).join('');
  }

  function projectJumps(){
    if(!path.startsWith('/project/')||$('.ei-project-jumps'))return;
    const hero=$('.project-hero'),input=$('.project-input'),results=$('.project-results'),evidence=$('.evidence-inbox'),cloud=$('.cloud-module');if(!hero||!input)return;
    const row=document.createElement('nav');row.className='ei-project-jumps';row.setAttribute('aria-label','Project Intelligence sections');
    const targets=[['Project setup',input],['Results',results],['Evidence',evidence],['Cloud',cloud]].filter(x=>x[1]);
    targets.forEach(([label,target])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>target.scrollIntoView({behavior:'smooth',block:'start'});row.appendChild(b)});
    input.insertAdjacentElement('afterbegin',row);
  }

  function dataCoherence(){
    if(!path.startsWith('/data/'))return;
    const top=$('.topline .shell>div:first-child');if(top)top.textContent='ExpenseIntel / Evidence Architecture';
    const title=$('.page-hero h1');if(title)title.innerHTML='Less noise. More <em>decision evidence.</em>';
    const copy=$('.page-hero .page-copy');if(copy)copy.textContent='ExpenseIntel does not collect data for its own sake. A source earns its place only when it changes the price, true cost, exposure, timing, exit, or confidence of a real commitment.';
    const footer=$('.footer-brand p');if(footer)footer.textContent='Pre-commitment decision intelligence for understanding what you are really committing to before you spend.';
    const cta=$('.cta-grid h2');if(cta)cta.textContent='Put the evidence behind a real decision.';
  }

  function projectCoherence(){
    if(!path.startsWith('/project/'))return;
    const top=$('.topline .shell>div:first-child');if(top)top.textContent='ExpenseIntel / Project Intelligence';
    const fb=$('.footer-brand p');if(fb)fb.textContent='Project intelligence for physical commitments before capital gets trapped.';
  }

  function smoothForms(){
    $$('form').forEach(form=>{if(form.dataset.eiFinalBound)return;form.dataset.eiFinalBound='1';form.addEventListener('submit',()=>form.classList.add('ei-working'),{capture:true});});
    $$('input,textarea,select').forEach(el=>{if(el.dataset.eiFinalFocus)return;el.dataset.eiFinalFocus='1';el.addEventListener('invalid',()=>setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),0))});
  }

  function repairButtons(){
    $$('a[href="#"],button').forEach(el=>{if(el.tagName==='A'&&el.getAttribute('href')==='#'&&!el.dataset.allowHash){el.addEventListener('click',e=>e.preventDefault())}});
    const dock=$('.active-decision-dock');if(dock){const actions=$('.ead-actions',dock);if(actions&&!$('a[href="/twin/"]',actions)){const a=document.createElement('a');a.href='/twin/';a.textContent='Twin';const check=$('a[href="/check/"]',actions);check?.insertAdjacentElement('afterend',a)}}
  }

  function twinQuality(){
    if(!path.startsWith('/twin/'))return;
    const type=$('#tw-type'),tip=$('#tw-context-tip'),baseHint=$('#tw-base-hint'),recurringHint=$('#tw-recurring-hint'),shockHint=$('#tw-shock-hint'),exitHint=$('#tw-exit-hint');if(!type)return;
    const hints={
      property:['purchase price','HOA, tax, insurance, upkeep','repair, assessment, vacancy','resale or recoverable equity'],
      vehicle:['purchase price','fuel, insurance, maintenance','repair, accident deductible, major service','resale or trade-in value'],
      renovation:['contract / project amount','maintenance or financing you explicitly know','overrun, rework, temporary housing','salvage or recoverable value'],
      contractor:['quoted amount','ongoing service or financing','change order, delay, uncovered scope','recoverable deposit or asset value'],
      equipment:['purchase + install','service, energy, consumables','downtime, repair, replacement event','resale / salvage value'],
      software:['contract value','subscription, seats, usage, support','overage, migration, termination cost','credits / avoided future spend'],
      lease:['deposit + upfront fees','rent, CAM, utilities, recurring fees','move, penalty, repair obligation','deposit or sublease recovery'],
      education:['tuition + upfront fees','housing, travel, recurring program cost','delay, lost term, extra semester','grants, employer support, recoverable value'],
      travel:['booking cost','recurring / daily trip spend','change, cancellation, disruption','refund or credit'],
      other:['entry amount','recurring burden you actually know','one-time downside you want to stress','recoverable value at exit']
    };
    const sync=()=>{const h=hints[type.value]||hints.other;if(baseHint)baseHint.textContent=h[0];if(recurringHint)recurringHint.textContent=h[1];if(shockHint)shockHint.textContent=h[2];if(exitHint)exitHint.textContent=h[3];if(tip)tip.textContent=`For ${type.options[type.selectedIndex]?.textContent||'this decision'}, model only costs you can name. Twin will show the effect without inventing the rest.`};
    type.addEventListener('change',sync);sync();
  }

  function dynamicWatch(){let t=0;const run=()=>{clearTimeout(t);t=setTimeout(()=>{currentNav();repairButtons();smoothForms()},70)};new MutationObserver(run).observe(document.body,{subtree:true,childList:true});}

  function init(){currentNav();projectJumps();dataCoherence();projectCoherence();smoothForms();repairButtons();twinQuality();dynamicWatch()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
