'use strict';
const {validateCaseInput,estimateCase,MODEL_VERSION}=require('../lib/model-core');

module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({ok:false,error:'Method not allowed'}))}
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https',base=`${proto}://${host}`;
  const scripts=['/app.js','/find/find.js','/analyze/analyze.js','/simulate/simulate.js','/watch/watch.js','/matrix/matrix.js','/passport.js','/shock.js','/contractor/contractor.js','/home/home.js'];
  const pages=['/','/find/','/analyze/','/simulate/','/watch/','/screen/','/matrix/','/data/','/pricing/','/developers/','/contractor/','/home/'];
  const scriptChecks=[];for(const path of scripts){try{const r=await fetch(base+path);const source=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status}`);new Function(source);scriptChecks.push({path,ok:true,bytes:source.length})}catch(e){scriptChecks.push({path,ok:false,error:e.message})}}
  const pageChecks=[];for(const path of pages){try{const r=await fetch(base+path,{redirect:'manual'});pageChecks.push({path,ok:r.status>=200&&r.status<400,status:r.status})}catch(e){pageChecks.push({path,ok:false,error:e.message})}}
  const modelChecks=[];
  try{const valid=validateCaseInput({address:'32 Chestnut St, Westborough, MA 01581',use:'residential',sqft:2500});if(!valid.ok)throw new Error('valid input rejected');modelChecks.push({name:'input_validation_accepts_valid_case',ok:true})}catch(e){modelChecks.push({name:'input_validation_accepts_valid_case',ok:false,error:e.message})}
  try{const invalid=validateCaseInput({address:'x',use:'office',sqft:20});if(invalid.ok)throw new Error('invalid input accepted');modelChecks.push({name:'input_validation_rejects_invalid_case',ok:true})}catch(e){modelChecks.push({name:'input_validation_rejects_invalid_case',ok:false,error:e.message})}
  try{const model=estimateCase({address:'Test',use:'office',sqft:10000,location:{verified:true,label:'Test, IL',provider:'test',components:{state:'IL'}},energy:{electricity:{centsKwh:10,source:'test',grade:'A'},intensity:{kwhSqft:10,source:'test',grade:'A'}},risk:null});if(!(model.total>0&&model.range.low<model.range.high&&model.modelVersion===MODEL_VERSION))throw new Error('model invariants failed');modelChecks.push({name:'model_invariants',ok:true,version:MODEL_VERSION})}catch(e){modelChecks.push({name:'model_invariants',ok:false,error:e.message})}
  const ok=scriptChecks.every(x=>x.ok)&&pageChecks.every(x=>x.ok)&&modelChecks.every(x=>x.ok);res.statusCode=ok?200:500;res.end(JSON.stringify({ok,checkedAt:new Date().toISOString(),modelVersion:MODEL_VERSION,modelChecks,scripts:scriptChecks,pages:pageChecks}))
};