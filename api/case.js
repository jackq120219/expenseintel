'use strict';
const {validateCaseInput,estimateCase,MODEL_VERSION}=require('../lib/model-core');
const {originFromReq}=require('../lib/http');

function send(res,status,payload,cache=false){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',cache?'public, s-maxage=1800, stale-while-revalidate=7200':'no-store');
  res.end(JSON.stringify(payload));
}
async function json(url,signal){
  const r=await fetch(url,{signal,headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 (https://expenseintel.com)'}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw Object.assign(new Error(d.error||`Upstream ${r.status}`),{status:r.status,data:d});
  return d;
}
function chooseAddress(address,data){
  const list=data?.suggestions||[];
  if(!list.length)return{match:null,suggestions:[]};
  const q=String(address||'').toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
  const exact=list.find(x=>String(x.label||'').toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim()===q);
  if(exact)return{match:exact,suggestions:list};
  if(list.length===1)return{match:list[0],suggestions:list};
  return{match:null,suggestions:list};
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'Method not allowed'});
  const input=validateCaseInput({address:req.query?.address,use:req.query?.use,sqft:req.query?.sqft});
  if(!input.ok)return send(res,400,{ok:false,error:input.errors[0],errors:input.errors,modelVersion:MODEL_VERSION});

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const base=originFromReq(req);
    const addressData=await json(`${base}/api/address?q=${encodeURIComponent(input.address)}`,controller.signal);
    let {match,suggestions}=chooseAddress(input.address,addressData);
    if(!match){
      return send(res,409,{ok:false,error:'Multiple verified addresses match. Choose a specific address first.',suggestions:suggestions.slice(0,5),modelVersion:MODEL_VERSION});
    }
    if(match.needsDetails&&match.placeId){
      const details=await json(`${base}/api/address?placeId=${encodeURIComponent(match.placeId)}`,controller.signal);
      match=details.suggestions?.[0]||null;
      if(!match)throw new Error('The selected address could not be resolved.');
    }

    const state=match.components?.state||'';
    const tract=match.components?.tract||'';
    const [energy,risk]=await Promise.all([
      state?json(`${base}/api/energy?state=${encodeURIComponent(state)}&use=${encodeURIComponent(input.use)}`,controller.signal).catch(()=>null):null,
      tract?json(`${base}/api/risk?tract=${encodeURIComponent(tract)}`,controller.signal).catch(()=>null):null
    ]);
    const model=estimateCase({address:input.address,use:input.use,sqft:input.sqft,location:match,energy,risk});
    return send(res,200,{ok:true,case:model},true);
  }catch(error){
    const timeout=error?.name==='AbortError';
    console.error('Case build failed',error?.message||error);
    return send(res,timeout?504:502,{ok:false,error:timeout?'Case build timed out. Try again.':'Could not build the location case right now.',modelVersion:MODEL_VERSION});
  }finally{clearTimeout(timer)}
};
