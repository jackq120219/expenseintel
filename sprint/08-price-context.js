'use strict';
(()=>{
 const q=(s,r=document)=>r.querySelector(s),price=q('#check-price');if(!price||q('#eiPriceContext'))return;const wrap=price.closest('.field');if(!wrap)return;const el=document.createElement('small');el.id='eiPriceContext';el.className='ei-price-context';wrap.appendChild(el);const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
 function update(){const n=Number(price.value)||0;el.textContent=n?`${money(n)} captured as your stated price—not yet a fair-price benchmark.`:'When a price is known, ExpenseIntel treats it as your fact and benchmarks it separately.'}
 const css=document.createElement('style');css.textContent='.ei-price-context{display:block;margin-top:5px;font-size:9px;line-height:1.35;opacity:.58}';document.head.appendChild(css);price.addEventListener('input',update);update();
})();