(()=>{
  if(window.EIV17)return;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\$?\s*(-?\d+(?:\.\d+)?)/);return m?+m[1]:0};
  const money=n=>Number.isFinite(+n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(+n):'—';
  const pct=n=>`${n>=0?'+':''}${(+n).toFixed(1)}%`;
  const ACTIVE='ei_active_decision';
  const active=()=>{try{return JSON.parse(localStorage.getItem(ACTIVE)||'null')||{}}catch(_e){return{}}};
  const root=()=>$('.ei-v12-dashboard');
  const controls=r=>$$('.ei-v12-control',r).map(el=>({el,label:clean($('label',el)?.textContent).replace(/AUTO-FILLED/ig,''),output:clean($('output',el)?.textContent),hint:clean($('small',el)?.textContent),input:$('input[type="range"]',el)})).filter(x=>x.label&&x.input).map(x=>({...x,raw:+x.input.value||num(x.output)}));
  const row=(r,rx)=>controls(r).find(x=>rx.test(x.label));
  const endpoint=(r,kind)=>num($(`.ei-v13-endcap.${kind} .value`,r)?.textContent);
  const savings=r=>num($('.ei-v12-savings strong',r)?.textContent)||num($('[data-k4]',r)?.textContent)||Math.max(0,endpoint(r,'current')-endpoint(r,'improved'));
  const current=r=>endpoint(r,'current')||num($('.ei-v12-kpi strong',r)?.textContent);
  const improved=r=>endpoint(r,'improved')||Math.max(0,current(r)-savings(r));
  const benchmark=r=>{const h=r.closest('[data-check-output] .shell')||r.parentElement||r,t=clean($('[data-comps-section]',h)?.textContent);if(t&&!/not available|unavailable|no active|missing/i.test(t)){const m=t.match(/(?:comparable\s+median|median(?:\s+price)?)\D{0,18}\$?\s*([\d,.]+)/i);if(m){const n=+m[1].replace(/,/g,'');if(n>0)return n}}return endpoint(r,'reference')||num($('.ei-v13-endcap.market .value',r)?.textContent)};
  const confidence=r=>{const t=clean($('.ei-v12-analysis-meta',r)?.textContent),m=t.match(/(?:planning\s+confidence\s*)?(\d{1,3})\s*\/\s*100/i);if(m)return Math.max(0,Math.min(100,+m[1]));const c=clean($('[data-v16-chip]',r)?.textContent),n=+c.split('/')[0];return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null};
  const decisionText=r=>clean($('.ei-v12-call h2',r)?.textContent)||'Review before you commit.';
  const decisionCopy=r=>clean($('.ei-v12-call p',r)?.textContent);
  const decisionClass=r=>{const t=(decisionText(r)+' '+decisionCopy(r)).toLowerCase();if(/avoid|walk away|do not proceed|wait\b/.test(t))return'avoid';if(/negotiate/.test(t))return'negotiate';if(/investigate|resolve|verify|review/.test(t))return'investigate';if(/workable|proceed|looks good|strong/.test(t))return'proceed';return'investigate'};
  const unknowns=r=>{const out=[];$$('.ei-v12-missing-card',r).forEach(x=>{const t=clean(x.textContent);if(t&&!/no major|none/i.test(t))out.push(t)});$$('.ei-v16-row .open',r).forEach(x=>{const t=clean(x.closest('.ei-v16-row')?.querySelector('strong')?.textContent);if(t)out.push(t)});const rail=$$('[data-rail] .ei-v12-insight',r).find(x=>/unknown|missing/i.test(clean($('.tag',x)?.textContent)));if(rail)$$('li',rail).forEach(x=>{const t=clean(x.textContent);if(t)out.push(t)});return [...new Set(out)].slice(0,8)};
  const risks=r=>{const rail=$$('[data-rail] .ei-v12-insight',r).find(x=>/risk/i.test(clean($('.tag',x)?.textContent)));const xs=rail?$$('li',rail).map(x=>clean(x.textContent)).filter(Boolean):[];return xs.slice(0,5)};
  const levers=r=>{const rail=$$('[data-rail] .ei-v12-insight',r).find(x=>/lever/i.test(clean($('.tag',x)?.textContent)));const xs=rail?$$('li',rail).map(x=>clean(x.textContent)).filter(Boolean):[];return xs.slice(0,5)};
  const sourceText=r=>clean([active().title,active().text,active().url,$('#check-text')?.value,$('#check-url')?.value,$('.ei-v12-live',r)?.textContent].filter(Boolean).join(' '));
  const category=r=>{const labs=controls(r).map(x=>x.label.toLowerCase()).join('|');if(labs.includes('monthly payment'))return'lease';if(labs.includes('mortgage rate'))return'property';if(labs.includes('quoted project cost'))return'project';if(labs.includes('purchase price')&&labs.includes('financing apr'))return'vehicle';return'general'};
  const strongestLever=r=>{const t=clean([...$$('.ei-v12-kpi',r)].find(x=>/largest lever/i.test(clean(x.textContent)))?.querySelector('strong')?.textContent);if(t)return t;const s=clean($('.ei-v12-sens-card strong',r)?.textContent).split('·')[0];return s||levers(r)[0]||'largest modeled lever'};
  const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h)^s.charCodeAt(i);return (h>>>0).toString(36)};
  const key=r=>hash(clean([active().url,active().title,active().text,category(r)].filter(Boolean).join('|')).toLowerCase()||'expenseintel-decision');
  const setControl=(r,rx,value)=>{const x=row(r,rx);if(!x||!Number.isFinite(+value))return false;const i=x.input,v=+value,step=Math.max(+i.step||1,1);if(v>+i.max)i.max=Math.ceil(v*1.35/step)*step;if(v<+i.min)i.min=Math.max(0,Math.floor(v*.5/step)*step);i.value=Math.max(+i.min,Math.min(+i.max,v));i.dispatchEvent(new Event('input',{bubbles:true}));return true};
  const snapshot=r=>({key:key(r),at:Date.now(),title:clean(active().title||active().text||sourceText(r)).slice(0,120),source:sourceText(r).slice(0,500),url:clean(active().url||''),location:clean(active().location||''),category:category(r),decision:decisionClass(r),decisionText:decisionText(r),current:current(r),improved:improved(r),benchmark:benchmark(r),savings:savings(r),confidence:confidence(r),unknowns:unknowns(r).length,controls:Object.fromEntries(controls(r).map(x=>[x.label,x.raw]))});
  const events=new EventTarget(),mods=[];
  let queued=false;
  function run(){queued=false;const r=root();if(!r)return;mods.forEach(fn=>{try{fn(r)}catch(e){console.warn('[ExpenseIntel v17]',e)}});events.dispatchEvent(new CustomEvent('refresh',{detail:{root:r}}))}
  function schedule(){if(queued)return;queued=true;setTimeout(run,110)}
  function register(fn){mods.push(fn);schedule()}
  const host=document.querySelector('[data-check-output]')||document.body;
  new MutationObserver(schedule).observe(host,{subtree:true,childList:true,characterData:true});
  host.addEventListener('input',schedule,true);host.addEventListener('change',schedule,true);
  window.EIV17={$, $$, clean, esc, num, money, pct, active, root, controls,row,endpoint,savings,current,improved,benchmark,confidence,decisionText,decisionCopy,decisionClass,unknowns,risks,levers,sourceText,category,strongestLever,hash,key,setControl,snapshot,events,register,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();