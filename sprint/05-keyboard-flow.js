'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),form=q('[data-check-form]');if(!form)return;
 function hasInput(){return !!(q('#check-url')?.value.trim()||q('#check-text')?.value.trim())}
 document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&hasInput()){e.preventDefault();form.requestSubmit?.()}if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&document.activeElement===document.body){e.preventDefault();(q('#check-url')||q('#check-text'))?.focus()}});
 const hint=document.createElement('small');hint.className='ei-key-hint';hint.textContent='⌘/Ctrl + Enter to run · / to focus input';form.querySelector('.check-run')?.insertAdjacentElement('beforebegin',hint);
 const css=document.createElement('style');css.textContent='.ei-key-hint{display:block;margin:7px 0 5px;text-align:right;font:600 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;opacity:.48}@media(max-width:700px){.ei-key-hint{display:none}}';document.head.appendChild(css);
})();