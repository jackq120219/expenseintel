'use strict';
(()=>{
 const form=document.querySelector('[data-check-form]'),out=document.querySelector('[data-check-output]');if(!form||!out)return;let pending=false,last='';form.addEventListener('submit',()=>{pending=true});out.setAttribute('tabindex','-1');
 function move(){if(!pending||out.hidden)return;const call=out.querySelector('[data-decision-call]')?.textContent?.trim();if(!call||call===last)return;last=call;pending=false;out.focus({preventScroll:true});out.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
 new MutationObserver(()=>setTimeout(move,20)).observe(out,{subtree:true,childList:true,characterData:true});
})();