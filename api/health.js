module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({ok:false,error:'Method not allowed'}))}
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https',base=`${proto}://${host}`;
  const scripts=['/app.js','/find/find.js','/analyze/analyze.js','/simulate/simulate.js','/watch/watch.js','/matrix/matrix.js','/passport.js','/shock.js'];
  const pages=['/','/find/','/analyze/','/simulate/','/watch/','/screen/','/matrix/','/data/','/pricing/','/developers/'];
  const scriptChecks=[];for(const path of scripts){try{const r=await fetch(base+path);const source=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status}`);new Function(source);scriptChecks.push({path,ok:true,bytes:source.length})}catch(e){scriptChecks.push({path,ok:false,error:e.message})}}
  const pageChecks=[];for(const path of pages){try{const r=await fetch(base+path,{redirect:'manual'});pageChecks.push({path,ok:r.status>=200&&r.status<400,status:r.status})}catch(e){pageChecks.push({path,ok:false,error:e.message})}}
  const ok=scriptChecks.every(x=>x.ok)&&pageChecks.every(x=>x.ok);res.statusCode=ok?200:500;res.end(JSON.stringify({ok,checkedAt:new Date().toISOString(),scripts:scriptChecks,pages:pageChecks}))
};