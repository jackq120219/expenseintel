'use strict';
/* Consolidated Sep 9 enhancements. Generated without changing module order. */

/* ---- 01-input-readiness.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s);const box=q('.check-box');if(!box||q('#eiInputReadiness'))return;
 const host=document.createElement('div');host.id='eiInputReadiness';host.className='ei-input-readiness';host.innerHTML='<div><span>INPUT READINESS</span><b data-ei-ready-label>Start with what you know</b></div><div class="ei-ready-track"><i data-ei-ready-fill></i></div><small data-ei-ready-note>ExpenseIntel can begin with a link or description; price, location and category improve the passport when known.</small>';
 q('.check-box-head',box)?.insertAdjacentElement('afterend',host);
 const css=document.createElement('style');css.textContent='.ei-input-readiness{padding:12px 16px;border-bottom:1px solid rgba(30,35,40,.12);background:rgba(255,255,255,.32)}.ei-input-readiness>div:first-child{display:flex;justify-content:space-between;gap:12px}.ei-input-readiness span,.ei-input-readiness b{font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.ei-input-readiness b{color:#835f2a}.ei-ready-track{height:5px;margin:8px 0;background:rgba(30,35,40,.12);overflow:hidden}.ei-ready-track i{display:block;height:100%;width:0;background:currentColor;transition:width .2s ease}.ei-input-readiness small{display:block;font-size:11px;line-height:1.4;opacity:.68}';document.head.appendChild(css);
 function update(){const url=q('#check-url')?.value.trim(),text=q('#check-text')?.value.trim(),price=Number(q('#check-price')?.value)||0,location=q('#check-location')?.value.trim(),cat=q('#check-category')?.value;let score=(url||text)?40:0;if(price)score+=25;if(location)score+=15;if(cat&&cat!=='auto')score+=20;const fill=q('[data-ei-ready-fill]',host),label=q('[data-ei-ready-label]',host),note=q('[data-ei-ready-note]',host);if(fill)fill.style.width=`${score}%`;if(label)label.textContent=score>=80?'High-detail input':score>=40?'Enough to start':'Start with what you know';if(note)note.textContent=score>=80?'Strong input coverage. Run the passport and let evidence quality determine what still needs verification.':score>=40?'Good enough to run. ExpenseIntel will keep missing fields explicit instead of forcing you to guess.':'Paste a link or describe the decision. Everything else can be added only if you know it.'}
 box.addEventListener('input',update);box.addEventListener('change',update);update();
})();
/* ---- 02-decision-draft.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),form=q('[data-check-form]');if(!form||q('#eiDraftState'))return;const KEY='ei_sep9_decision_draft';
 const ids=['check-url','check-text','check-category','check-price','check-location'];
 function snap(){const v={};ids.forEach(id=>{const el=q(`#${id}`);if(el)v[id]=el.value});v.savedAt=Date.now();return v}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(snap()))}catch(_e){}}
 function restore(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(!d||Date.now()-d.savedAt>1000*60*60*24*7)return false;let changed=false;ids.forEach(id=>{const el=q(`#${id}`);if(el&&!el.value&&d[id]){el.value=d[id];changed=true}});if(changed){form.dispatchEvent(new Event('input',{bubbles:true}));return true}}catch(_e){}return false}
 const state=document.createElement('div');state.id='eiDraftState';state.className='ei-draft-state';state.innerHTML='<span data-ei-draft-copy>Draft autosave on</span><button type="button" data-ei-clear-draft>Clear draft</button>';form.appendChild(state);
 const css=document.createElement('style');css.textContent='.ei-draft-state{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:9px;font-size:10px;opacity:.68}.ei-draft-state button{border:0;background:none;padding:2px 0;text-decoration:underline;cursor:pointer;font:inherit;color:inherit}';document.head.appendChild(css);
 let timer;form.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(save,250)});form.addEventListener('change',save);q('[data-ei-clear-draft]',state).addEventListener('click',()=>{try{localStorage.removeItem(KEY)}catch(_e){}ids.forEach(id=>{const el=q(`#${id}`);if(el&&id!=='check-category')el.value=''});const cat=q('#check-category');if(cat)cat.value='auto';form.dispatchEvent(new Event('input',{bubbles:true}));q('[data-ei-draft-copy]',state).textContent='Draft cleared'});
 if(restore())q('[data-ei-draft-copy]',state).textContent='Unfinished draft restored';
})();
/* ---- 03-category-guidance.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),form=q('[data-check-form]');if(!form||q('#eiCategoryGuide'))return;
 const guide=document.createElement('div');guide.id='eiCategoryGuide';guide.className='ei-category-guide';form.querySelector('.check-advanced')?.insertAdjacentElement('afterend',guide);
 const map={vehicle:['Exact trim or VIN','Mileage / condition','Financing or lease terms','Insurance quote'],property:['Exact address','Taxes + HOA','Comparable sales','Inspection / condition'],home:['Full scope','Permits / exclusions','Equipment model','Second comparable quote'],equipment:['Exact model / capacity','Freight + install','Warranty / service','Resale or replacement'], 'business-project':['Site / jurisdiction','Utilities + approvals','Irreversible spend','Schedule dependencies'],personal:['Exact item','Comparable price','Recurring cost','Return / resale path'],auto:['Price or quote','Location','Exact item / scope','Any constraint that could change the decision']};
 function render(){const cat=q('#check-category')?.value||'auto',items=map[cat]||map.auto;guide.innerHTML=`<span>HIGH-VALUE DETAILS FOR THIS DECISION</span><div>${items.map(x=>`<b>${x}</b>`).join('')}</div><small>You do not need every field. These are the facts most likely to change the answer if you already know them.</small>`}
 const css=document.createElement('style');css.textContent='.ei-category-guide{margin:10px 0 12px;padding:10px 12px;border:1px dashed rgba(30,35,40,.2);background:rgba(255,255,255,.22)}.ei-category-guide>span{font:700 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.ei-category-guide>div{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0}.ei-category-guide b{padding:5px 7px;border:1px solid rgba(30,35,40,.12);background:rgba(255,255,255,.5);font-size:10px;font-weight:650}.ei-category-guide small{display:block;font-size:10px;line-height:1.4;opacity:.65}';document.head.appendChild(css);
 q('#check-category')?.addEventListener('change',render);render();
})();
/* ---- 04-unknowns-preview.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),form=q('[data-check-form]');if(!form||q('#eiUnknownPreview'))return;
 const host=document.createElement('div');host.id='eiUnknownPreview';host.className='ei-unknown-preview';form.querySelector('.check-run')?.insertAdjacentElement('afterend',host);
 function list(){const cat=q('#check-category')?.value||'auto',price=Number(q('#check-price')?.value)||0,loc=q('#check-location')?.value.trim();const base=[];if(!price)base.push('Exact price / quote');if(!loc)base.push('Location-specific costs');if(cat==='vehicle'||cat==='auto')base.push('Insurance + depreciation');if(cat==='property')base.push('Taxes / HOA / comparable sales');if(cat==='home')base.push('Scope exclusions / permits');if(cat==='business-project')base.push('Approvals / utility bottlenecks');base.push('Exit or reversibility');return [...new Set(base)].slice(0,3)}
 function render(){const items=list();host.innerHTML=`<span>LIKELY OPEN QUESTIONS</span><div>${items.map(x=>`<i>${x}</i>`).join('')}</div><small>ExpenseIntel will try to resolve these from connected evidence first and leave the rest explicitly unknown.</small>`}
 const css=document.createElement('style');css.textContent='.ei-unknown-preview{margin:10px 0 0;padding:9px 10px;background:rgba(118,80,34,.06);border-left:2px solid rgba(118,80,34,.38)}.ei-unknown-preview>span{font:700 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.ei-unknown-preview>div{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.ei-unknown-preview i{font-style:normal;font-size:10px;padding:3px 6px;background:rgba(255,255,255,.52)}.ei-unknown-preview small{font-size:10px;line-height:1.4;opacity:.65}';document.head.appendChild(css);
 form.addEventListener('input',render);form.addEventListener('change',render);render();
})();
/* ---- 05-keyboard-flow.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),form=q('[data-check-form]');if(!form)return;
 function hasInput(){return !!(q('#check-url')?.value.trim()||q('#check-text')?.value.trim())}
 document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&hasInput()){e.preventDefault();form.requestSubmit?.()}if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&document.activeElement===document.body){e.preventDefault();(q('#check-url')||q('#check-text'))?.focus()}});
 const hint=document.createElement('small');hint.className='ei-key-hint';hint.textContent='⌘/Ctrl + Enter to run · / to focus input';form.querySelector('.check-run')?.insertAdjacentElement('beforebegin',hint);
 const css=document.createElement('style');css.textContent='.ei-key-hint{display:block;margin:7px 0 5px;text-align:right;font:600 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;opacity:.48}@media(max-width:700px){.ei-key-hint{display:none}}';document.head.appendChild(css);
})();
/* ---- 06-result-navigation.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),out=q('[data-check-output]'),form=q('[data-check-form]');if(!out||!form)return;
 function mount(){const shell=q('.shell',out);if(!shell||q('#eiResultNav',shell)||!q('.check-output-top',shell))return;const nav=document.createElement('div');nav.id='eiResultNav';nav.className='ei-result-nav';nav.innerHTML='<button type="button" data-ei-edit>← Edit inputs</button><button type="button" data-ei-rerun>Re-run current check</button><a href="#check-form">New decision</a>';q('.check-output-top',shell)?.insertAdjacentElement('beforebegin',nav);q('[data-ei-edit]',nav).onclick=()=>{q('#check-form')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>{(q('#check-url')?.offsetParent?q('#check-url'):q('#check-text'))?.focus()},350)};q('[data-ei-rerun]',nav).onclick=()=>form.requestSubmit?.()}
 const css=document.createElement('style');css.textContent='.ei-result-nav{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px;padding:8px 0;border-bottom:1px solid rgba(30,35,40,.12)}.ei-result-nav button,.ei-result-nav a{border:0;background:none;padding:5px 0;margin-right:10px;color:inherit;font:650 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;text-decoration:underline;cursor:pointer}';document.head.appendChild(css);new MutationObserver(mount).observe(out,{subtree:true,childList:true});mount();
})();
/* ---- 07-evidence-legend.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),out=q('[data-check-output]');if(!out)return;
 function mount(){const top=q('.check-output-top',out);if(!top||q('#eiEvidenceLegend',out))return;const el=document.createElement('div');el.id='eiEvidenceLegend';el.className='ei-evidence-legend';el.innerHTML='<span>EVIDENCE KEY</span><b><i></i>Connected</b><b><i></i>User fact</b><b><i></i>Modeled</b><b><i></i>Unknown</b><small>These states are kept separate so estimates cannot masquerade as verified facts.</small>';top.insertAdjacentElement('afterend',el)}
 const css=document.createElement('style');css.textContent='.ei-evidence-legend{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:8px 0 12px;font-size:9px}.ei-evidence-legend>span{font:800 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.ei-evidence-legend b{font-weight:650}.ei-evidence-legend i{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:currentColor;opacity:.75}.ei-evidence-legend b:nth-of-type(2) i{opacity:.5}.ei-evidence-legend b:nth-of-type(3) i{border-radius:0;opacity:.35}.ei-evidence-legend b:nth-of-type(4) i{background:transparent;border:1px solid currentColor}.ei-evidence-legend small{flex:1 1 280px;opacity:.58}';document.head.appendChild(css);new MutationObserver(mount).observe(out,{subtree:true,childList:true});mount();
})();
/* ---- 08-price-context.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),price=q('#check-price');if(!price||q('#eiPriceContext'))return;const wrap=price.closest('.field');if(!wrap)return;const el=document.createElement('small');el.id='eiPriceContext';el.className='ei-price-context';wrap.appendChild(el);const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
 function update(){const n=Number(price.value)||0;el.textContent=n?`${money(n)} captured as your stated price—not yet a fair-price benchmark.`:'When a price is known, ExpenseIntel treats it as your fact and benchmarks it separately.'}
 const css=document.createElement('style');css.textContent='.ei-price-context{display:block;margin-top:5px;font-size:9px;line-height:1.35;opacity:.58}';document.head.appendChild(css);price.addEventListener('input',update);update();
})();
/* ---- 09-comparison-memory.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),form=q('[data-check-form]');if(!form||q('#eiRecentDecisions'))return;const KEY='ei_sep9_recent_decisions',ids=['check-url','check-text','check-category','check-price','check-location'];
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_e){return[]}},write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_e){}};
 const host=document.createElement('div');host.id='eiRecentDecisions';host.className='ei-recent-decisions';const examples=q('.check-examples');examples?.insertAdjacentElement('afterend',host);
 function snap(){const x={};ids.forEach(id=>{const e=q(`#${id}`);x[id]=e?.value||''});x.label=(x['check-text']||x['check-url']||'Decision').replace(/^https?:\/\//,'').slice(0,54);x.savedAt=Date.now();return x}
 function render(){const rows=read().slice(0,3);host.innerHTML=rows.length?`<span>RECENT DECISIONS</span><div>${rows.map((x,i)=>`<button type="button" data-i="${i}">${x.label}</button>`).join('')}</div>`:'';host.querySelectorAll('button').forEach(b=>b.onclick=()=>{const x=rows[Number(b.dataset.i)];ids.forEach(id=>{const e=q(`#${id}`);if(e)e.value=x[id]||''});form.dispatchEvent(new Event('input',{bubbles:true}));q('#check-form')?.scrollIntoView({behavior:'smooth',block:'start'})})}
 form.addEventListener('submit',()=>{const x=snap();if(!x['check-url']&&!x['check-text'])return;const rows=read().filter(r=>r.label!==x.label);rows.unshift(x);write(rows.slice(0,5));setTimeout(render,0)});
 const css=document.createElement('style');css.textContent='.ei-recent-decisions{margin-top:9px}.ei-recent-decisions>span{font:700 8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;opacity:.55}.ei-recent-decisions>div{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.ei-recent-decisions button{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid rgba(30,35,40,.12);background:rgba(255,255,255,.42);padding:5px 7px;font-size:9px;cursor:pointer}';document.head.appendChild(css);render();
})();
/* ---- 10-mobile-commit-bar.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),form=q('[data-check-form]');if(!form||q('#eiMobileRun'))return;const bar=document.createElement('div');bar.id='eiMobileRun';bar.className='ei-mobile-run';bar.innerHTML='<button type="button">Build Decision Passport →</button>';document.body.appendChild(bar);q('button',bar).onclick=()=>{const has=!!(q('#check-url')?.value.trim()||q('#check-text')?.value.trim());if(has)form.requestSubmit?.();else{q('#check-form')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>q('#check-url')?.focus(),300)}};
 const css=document.createElement('style');css.textContent='.ei-mobile-run{display:none}@media(max-width:760px){body{padding-bottom:62px}.ei-mobile-run{display:block;position:fixed;left:0;right:0;bottom:0;z-index:1200;padding:8px max(12px,env(safe-area-inset-left));background:rgba(243,240,232,.96);backdrop-filter:blur(12px);border-top:1px solid rgba(30,35,40,.13)}.ei-mobile-run button{width:100%;min-height:44px;border:0;background:#1e2220;color:#fff;font-weight:750;letter-spacing:.02em;cursor:pointer}}';document.head.appendChild(css);
})();
/* ---- 11-accessibility-pass.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];if(q('#eiSkipLink'))return;
 const skip=document.createElement('a');skip.id='eiSkipLink';skip.className='ei-skip-link';skip.href='#check-form';skip.textContent='Skip to decision check';document.body.insertAdjacentElement('afterbegin',skip);
 const tabs=qa('[data-mode]');tabs.forEach((b,i)=>{b.setAttribute('role','tab');b.setAttribute('aria-selected',b.classList.contains('active')?'true':'false');if(!b.id)b.id=`ei-mode-${i}`;b.addEventListener('click',()=>tabs.forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false')))});q('.check-tabs')?.setAttribute('role','tablist');q('[data-check-output]')?.setAttribute('aria-live','polite');q('[data-check-output]')?.setAttribute('aria-busy','false');
 qa('a[target="_blank"]').forEach(a=>{a.rel='noopener noreferrer'});
 const css=document.createElement('style');css.textContent='.ei-skip-link{position:fixed;left:12px;top:-60px;z-index:5000;padding:9px 12px;background:#111;color:#fff}.ei-skip-link:focus{top:12px}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid currentColor;outline-offset:3px}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}';document.head.appendChild(css);
})();
/* ---- 12-performance-pass.js ---- */
'use strict';
(()=>{
 const css=document.createElement('style');css.id='eiPerformancePass';css.textContent='@supports(content-visibility:auto){.check-how,.check-deep,.si-section,footer{content-visibility:auto;contain-intrinsic-size:auto 700px}} img[loading="lazy"]{content-visibility:auto}';document.head.appendChild(css);
 document.querySelectorAll('img:not([loading])').forEach(img=>{if(!img.closest('.check-hero'))img.loading='lazy'});
})();
/* ---- 13-result-actions.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),out=q('[data-check-output]');if(!out)return;
 function text(){const call=q('[data-decision-call]',out)?.textContent?.trim(),reason=q('[data-decision-reason]',out)?.textContent?.trim(),next=q('[data-result-next]',out)?.innerText?.trim(),title=q('[data-result-title]',out)?.textContent?.trim();return [`ExpenseIntel — ${title||'Decision'}`,call&&`Call: ${call}`,reason,next&&`Next: ${next}`].filter(Boolean).join('\n\n')}
 async function copy(){const t=text();try{await navigator.clipboard.writeText(t)}catch(_e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}}
 function mount(){const shell=q('.shell',out),top=q('.check-output-top',shell);if(!top||q('#eiResultActions',shell))return;const bar=document.createElement('div');bar.id='eiResultActions';bar.className='ei-result-actions';bar.innerHTML='<button type="button" data-copy>Copy concise result</button><button type="button" data-print>Print / save PDF</button>';top.appendChild(bar);q('[data-copy]',bar).onclick=async()=>{await copy();q('[data-copy]',bar).textContent='Copied ✓';setTimeout(()=>q('[data-copy]',bar).textContent='Copy concise result',1800)};q('[data-print]',bar).onclick=()=>window.print()}
 const css=document.createElement('style');css.textContent='.ei-result-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.ei-result-actions button{border:1px solid rgba(30,35,40,.15);background:rgba(255,255,255,.48);padding:6px 8px;font:650 9px ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer}@media print{.site-nav,.topline,.ei-result-actions,.ei-result-nav,.ei-mobile-run{display:none!important}}';document.head.appendChild(css);new MutationObserver(mount).observe(out,{subtree:true,childList:true});mount();
})();
/* ---- 14-decision-timeline.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)],out=q('[data-check-output]');if(!out)return;
 function mount(){const shell=q('.shell',out),anchor=q('.ei-everyday-summary',shell)||q('.decision-command',shell);if(!anchor||q('#eiDecisionTimeline',shell))return;const unknown=qa('.check-unknown',shell).map(x=>x.textContent.trim()).filter(Boolean);const next=q('[data-result-next]',shell)?.innerText?.trim();const el=document.createElement('section');el.id='eiDecisionTimeline';el.className='ei-decision-timeline';el.innerHTML=`<div><span>NOW</span><b>Use the current call as a screening decision.</b><small>Keep connected evidence, your facts and modeled context separate.</small></div><i>→</i><div><span>BEFORE COMMIT</span><b>${unknown[0]||'Verify the highest-value missing fact.'}</b><small>${unknown.length>1?`${unknown.length} open items remain in this passport.`:'Resolve any item that could materially change the economics.'}</small></div><i>→</i><div><span>AFTER NEW EVIDENCE</span><b>${next||'Re-run the passport when a material fact changes.'}</b><small>The decision record should change when the evidence changes.</small></div>`;anchor.insertAdjacentElement('afterend',el)}
 const css=document.createElement('style');css.textContent='.ei-decision-timeline{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:10px;align-items:center;margin:14px 0;padding:12px;border:1px solid rgba(30,35,40,.12);background:rgba(255,255,255,.28)}.ei-decision-timeline>div{min-width:0}.ei-decision-timeline span{font:800 8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.09em;opacity:.62}.ei-decision-timeline b,.ei-decision-timeline small{display:block}.ei-decision-timeline b{margin:5px 0;font-size:11px}.ei-decision-timeline small{font-size:9px;line-height:1.4;opacity:.6}.ei-decision-timeline>i{font-style:normal;opacity:.35}@media(max-width:720px){.ei-decision-timeline{grid-template-columns:1fr}.ei-decision-timeline>i{display:none}}';document.head.appendChild(css);new MutationObserver(mount).observe(out,{subtree:true,childList:true});mount();
})();
/* ---- 15-trust-hardening.js ---- */
'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)],out=q('[data-check-output]');
 qa('a[href^="http"]').forEach(a=>{try{if(new URL(a.href,location.href).origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer'}}catch(_e){}});
 function mount(){if(!out)return;const shell=q('.shell',out),top=q('.check-output-top',shell);if(!top||q('#eiTrustRule',shell))return;const el=document.createElement('div');el.id='eiTrustRule';el.className='ei-trust-rule';el.innerHTML='<b>TRUST RULE</b><span>Observed and connected facts can support a decision. Modeled values are scenarios. Unknowns stay unknown until evidence resolves them.</span>';top.insertAdjacentElement('afterend',el);qa('[data-result-score],[data-result-label]',shell).forEach(x=>x.setAttribute('aria-live','polite'))}
 const css=document.createElement('style');css.textContent='.ei-trust-rule{display:flex;gap:9px;align-items:flex-start;margin:8px 0 4px;padding:8px 10px;border-left:3px solid currentColor;background:rgba(255,255,255,.34);font-size:9px;line-height:1.45}.ei-trust-rule b{flex:0 0 auto;font:800 8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.ei-trust-rule span{opacity:.68}';document.head.appendChild(css);if(out){new MutationObserver(mount).observe(out,{subtree:true,childList:true});mount()}
})();
/* ---- 16-url-normalizer.js ---- */
'use strict';
(()=>{
 const input=document.getElementById('check-url'),form=document.querySelector('[data-check-form]');if(!input||!form)return;
 function normalize(){let v=input.value.trim();if(!v)return;if(/^www\./i.test(v))v=`https://${v}`;else if(/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(v)&&!/^https?:\/\//i.test(v))v=`https://${v}`;if(v!==input.value){input.value=v;input.dispatchEvent(new Event('input',{bubbles:true}))}}
 input.addEventListener('blur',normalize);form.addEventListener('submit',normalize,{capture:true});
})();
/* ---- 17-result-focus.js ---- */
'use strict';
(()=>{
 const form=document.querySelector('[data-check-form]'),out=document.querySelector('[data-check-output]');if(!form||!out)return;let pending=false,last='';form.addEventListener('submit',()=>{pending=true});out.setAttribute('tabindex','-1');
 function move(){if(!pending||out.hidden)return;const call=out.querySelector('[data-decision-call]')?.textContent?.trim();if(!call||call===last)return;last=call;pending=false;out.focus({preventScroll:true});out.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
 new MutationObserver(()=>setTimeout(move,20)).observe(out,{subtree:true,childList:true,characterData:true});
})();
/* ---- 18-quote-readiness.js ---- */
'use strict';
(()=>{
 const text=document.getElementById('check-text'),form=document.querySelector('[data-check-form]');if(!text||!form||document.getElementById('eiQuoteReadiness'))return;const el=document.createElement('small');el.id='eiQuoteReadiness';el.className='ei-quote-readiness';text.insertAdjacentElement('afterend',el);
 function update(){const v=text.value.trim(),lines=v?v.split(/\n+/).filter(x=>x.trim()).length:0,money=(v.match(/\$\s?[\d,.]+/g)||[]).length,terms=(v.match(/\b(?:total|subtotal|labor|material|tax|fee|term|monthly|deposit|allowance|exclusion|warranty)\b/gi)||[]).length;if(!v){el.textContent='Paste the quote as-is; line items and dollar amounts help ExpenseIntel structure it.';return}el.textContent=`Quote structure: ${lines} line${lines===1?'':'s'} · ${money} dollar amount${money===1?'':'s'} · ${terms} cost/term signal${terms===1?'':'s'}. ${money?'Ready to analyze.':'Add the quoted amount if it is missing.'}`}
 const style=document.createElement('style');style.textContent='.ei-quote-readiness{display:block;margin-top:5px;font:600 9px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.58}';document.head.appendChild(style);text.addEventListener('input',update);update();
})();

(()=>{
 const price=document.getElementById('check-price');if(!price||document.getElementById('eiBudgetGuard'))return;const field=price.closest('.field');if(!field)return;const key='ei_commitment_budget';const wrap=document.createElement('div');wrap.id='eiBudgetGuard';wrap.className='ei-budget-guard';wrap.innerHTML='<label for="ei-budget-cap">YOUR MAX / TARGET <span>browser only</span></label><div><span>$</span><input id="ei-budget-cap" type="number" min="0" step="100" inputmode="decimal" placeholder="Optional"><b data-budget-delta>Set a ceiling to see the gap.</b></div>';field.appendChild(wrap);const cap=wrap.querySelector('input'),delta=wrap.querySelector('[data-budget-delta]'),fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.abs(n));try{cap.value=localStorage.getItem(key)||''}catch(_e){}
 function render(){const p=Number(price.value)||0,c=Number(cap.value)||0;if(!c){delta.textContent='Set a ceiling to see the gap.';delta.dataset.state='';return}try{localStorage.setItem(key,String(c))}catch(_e){}if(!p){delta.textContent=`Target saved at ${fmt(c)}. Add or detect a price to compare.`;delta.dataset.state='';return}const gap=c-p,pct=Math.abs(gap)/c*100;delta.textContent=gap>=0?`${fmt(gap)} below your ceiling · ${pct.toFixed(1)}% room`:`${fmt(gap)} above your ceiling · ${pct.toFixed(1)}% over`;delta.dataset.state=gap>=0?'under':'over'}
 price.addEventListener('input',render);cap.addEventListener('input',render);render();const style=document.createElement('style');style.textContent='.ei-budget-guard{margin-top:8px;padding-top:8px;border-top:1px solid rgba(20,20,20,.12)}.ei-budget-guard label{display:flex;justify-content:space-between;gap:8px;font:700 8px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.ei-budget-guard label span{font-weight:500;opacity:.45;letter-spacing:0}.ei-budget-guard>div{display:grid;grid-template-columns:auto 95px minmax(120px,1fr);gap:6px;align-items:center;margin-top:5px}.ei-budget-guard input{width:100%;min-height:31px;border:1px solid rgba(20,20,20,.18);background:rgba(255,255,255,.55);padding:5px 7px}.ei-budget-guard b{font-size:9px;line-height:1.35;font-weight:600;opacity:.65}.ei-budget-guard b[data-state="over"]{opacity:1}.ei-budget-guard b[data-state="under"]{opacity:.8}@media(max-width:600px){.ei-budget-guard>div{grid-template-columns:auto 100px 1fr}}';document.head.appendChild(style)
})();

(()=>{
 const output=document.querySelector('[data-check-output]');if(!output)return;let queued=false;
 const copy=async text=>{try{await navigator.clipboard.writeText(text);return true}catch(_e){try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch(_e2){return false}}};
 function mount(){queued=false;const shell=output.querySelector('.shell');if(!shell)return;const gaps=[...shell.querySelectorAll('.check-unknown')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);let button=shell.querySelector('#eiCopyGaps');if(!gaps.length){button?.remove();return}if(!button){button=document.createElement('button');button.id='eiCopyGaps';button.type='button';button.className='ei-copy-gaps';button.textContent='COPY UNRESOLVED CHECKLIST';const anchor=shell.querySelector('[data-result-actions],.check-actions,.check-source-note');if(anchor)anchor.insertAdjacentElement('beforebegin',button);else shell.appendChild(button);button.addEventListener('click',async()=>{const current=[...shell.querySelectorAll('.check-unknown')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);const title=shell.querySelector('[data-result-title]')?.textContent?.trim()||'ExpenseIntel decision';const ok=await copy(`${title}\nUnresolved checklist\n${current.map((x,i)=>`${i+1}. ${x}`).join('\n')}`);button.textContent=ok?'CHECKLIST COPIED ✓':'COPY FAILED — SELECT MANUALLY';setTimeout(()=>button.textContent='COPY UNRESOLVED CHECKLIST',1800)})}}
 const obs=new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(mount,60)});obs.observe(output,{subtree:true,childList:true});mount();const style=document.createElement('style');style.textContent='.ei-copy-gaps{margin:10px 0;padding:8px 11px;border:1px solid rgba(20,20,20,.22);background:transparent;font:800 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;cursor:pointer}.ei-copy-gaps:hover{background:rgba(20,20,20,.05)}';document.head.appendChild(style)
})();