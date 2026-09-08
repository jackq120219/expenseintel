(()=>{
  const files=[
    'cleanup-v18-01-hierarchy.css','cleanup-v18-02-actions.css','cleanup-v18-03-tabs.css','cleanup-v18-04-controls.css',
    'cleanup-v18-05-proof.css','cleanup-v18-06-mobile.css','cleanup-v18-07-accessibility.css','cleanup-v18-08-density.css'
  ];
  files.forEach(file=>{
    if(document.querySelector(`link[data-ei-v18-cleanup="${file}"]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=`/check/${file}`;link.dataset.eiV18Cleanup=file;
    document.head.appendChild(link);
  });
})();
