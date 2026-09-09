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