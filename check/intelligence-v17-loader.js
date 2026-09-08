(()=>{
  const files=['intelligence-core-v17.js','intake-intelligence-v17.js','decision-endpoint-v17.js','comparable-confidence-v17.js','optimizer-universal-v17.js','negotiation-mode-v17.js','decision-delta-v17.js','outcome-tracking-v17.js'];let i=0;
  function next(){if(i>=files.length)return;const s=document.createElement('script');s.src=`/check/${files[i++]}`;s.defer=true;s.onload=next;s.onerror=next;document.body.appendChild(s)}
  next();
})();