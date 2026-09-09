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