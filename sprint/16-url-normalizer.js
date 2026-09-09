'use strict';
(()=>{
 const input=document.getElementById('check-url'),form=document.querySelector('[data-check-form]');if(!input||!form)return;
 function normalize(){let v=input.value.trim();if(!v)return;if(/^www\./i.test(v))v=`https://${v}`;else if(/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(v)&&!/^https?:\/\//i.test(v))v=`https://${v}`;if(v!==input.value){input.value=v;input.dispatchEvent(new Event('input',{bubbles:true}))}}
 input.addEventListener('blur',normalize);form.addEventListener('submit',normalize,{capture:true});
})();