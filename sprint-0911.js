(() => {
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{document.documentElement.dataset.network=navigator.onLine?'online':'offline';const sync=()=>document.documentElement.dataset.network=navigator.onLine?'online':'offline';addEventListener('online',sync);addEventListener('offline',sync)});
})();
