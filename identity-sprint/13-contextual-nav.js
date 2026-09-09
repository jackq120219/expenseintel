(()=>{
  const nav=document.querySelector('.navright');
  if(nav)nav.dataset.eiContextReady='base-owned';
  /* Header actions are deliberately not rewritten here. Contextual next steps now
     live in the Decision Passport and page-level guidance, preventing late nav swaps. */
})();
