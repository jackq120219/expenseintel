(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const clearReceipt=()=>{const r=$('[data-receipt]');if(r)r.innerHTML=''};
  const validPrice=id=>{const n=Number($(id)?.value);return Number.isFinite(n)&&n>0};
  function resetTrueCost(){if(!$('#tc-total')||validPrice('#tc-price'))return;$('#tc-total').textContent='—';$('#tc-burden').textContent='—';$('#tc-yearly').textContent='—';$('#tc-interest').textContent='—';$('#tc-verdict').textContent='Enter the actual purchase or commitment price to build the future receipt.';clearReceipt();const b=$('[data-save-watch]');if(b){b.disabled=true;b.title='Calculate a real TrueCost before saving'}}
  function resetTiming(){if(!$('#tm-verdict')||validPrice('#tm-price'))return;$('#tm-verdict').textContent='—';$('#tm-now').textContent='—';$('#tm-later').textContent='—';$('#tm-diff').textContent='—';$('#tm-copy').textContent='Enter today’s actual price, then change only the assumptions you want to test.';clearReceipt();const b=$('[data-save-watch]');if(b){b.disabled=true;b.title='Run a timing comparison before saving'}}
  function bind(form,priceId){if(!form)return;const save=$('[data-save-watch]');const sync=()=>{const ok=validPrice(priceId);if(save){save.disabled=!ok;save.title=ok?'':'Enter a real price first'}};form.addEventListener('submit',()=>setTimeout(sync,0));$(priceId)?.addEventListener('input',sync);sync()}
  function init(){resetTrueCost();resetTiming();bind($('[data-truecost-form]'),'#tc-price');bind($('[data-timing-form]'),'#tm-price')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,60),{once:true});else setTimeout(init,60);
})();