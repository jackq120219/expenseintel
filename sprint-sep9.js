'use strict';
(()=>{
  const modules=[
    '01-input-readiness.js','02-decision-draft.js','03-category-guidance.js','04-unknowns-preview.js','05-keyboard-flow.js',
    '06-result-navigation.js','07-evidence-legend.js','08-price-context.js','09-comparison-memory.js','10-mobile-commit-bar.js',
    '11-accessibility-pass.js','12-performance-pass.js','13-result-actions.js','14-decision-timeline.js','15-trust-hardening.js',
    '16-url-normalizer.js','17-result-focus.js','18-quote-readiness.js'
  ];
  const load=(file)=>new Promise(resolve=>{
    if(document.querySelector(`script[data-ei-sprint="${file}"]`))return resolve();
    const s=document.createElement('script');s.src=`/sprint/${file}`;s.defer=true;s.dataset.eiSprint=file;s.onload=resolve;s.onerror=resolve;document.body.appendChild(s);
  });
  async function boot(){
    document.documentElement.dataset.eiSprint='sep9';
    for(const file of modules)await load(file);
    document.dispatchEvent(new CustomEvent('ei:sprint-ready',{detail:{modules:modules.length}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

(()=>{
 function init(){const text=document.getElementById('check-text'),price=document.getElementById('check-price');if(!text||!price||document.getElementById('eiDetectedAmount'))return;const host=document.createElement('div');host.id='eiDetectedAmount';host.className='ei-detected-amount';host.hidden=true;text.insertAdjacentElement('afterend',host);const parse=s=>Number(String(s).replace(/[$,\s]/g,''));function candidate(){const raw=text.value;if(!raw.trim()||Number(price.value)>0)return null;const lines=raw.split(/\n+/),totalLine=lines.findLast?.(l=>/\b(?:grand total|total|amount due|price)\b/i.test(l)&&/\$\s?[\d,.]+/.test(l));const source=totalLine||raw;const vals=[...source.matchAll(/\$\s?([\d,]+(?:\.\d{1,2})?)/g)].map(m=>parse(m[0])).filter(n=>Number.isFinite(n)&&n>0);if(!vals.length)return null;return totalLine?vals[vals.length-1]:Math.max(...vals)}function render(){const n=candidate();host.hidden=!n;if(!n){host.innerHTML='';return}host.innerHTML=`<span>Possible quoted total detected: <b>${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)}</b></span><button type="button">USE AS PRICE</button>`;host.querySelector('button').onclick=()=>{price.value=String(n);price.dataset.userEdited='1';price.dispatchEvent(new Event('input',{bubbles:true}));host.hidden=true}}
 text.addEventListener('input',render);price.addEventListener('input',render);render();const style=document.createElement('style');style.textContent='.ei-detected-amount{margin-top:6px;padding:7px 8px;border:1px dashed rgba(20,20,20,.22);display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:9px}.ei-detected-amount[hidden]{display:none}.ei-detected-amount button{border:0;background:#1c1c1a;color:#fff;padding:6px 8px;font:800 8px ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer}';document.head.appendChild(style)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();