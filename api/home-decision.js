'use strict';
const {readJson,sendJson,originFromReq,fetchJson,cleanText,finite}=require('../lib/http');
const {calculateHomeDecision,HOME_MODEL_VERSION}=require('../lib/home-core');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return sendJson(res,405,{ok:false,error:'Method not allowed'});
  try{
    const body=await readJson(req),address=cleanText(body.address,220),sqft=Math.max(300,finite(body.sqft,2500));
    if(address.length<6)return sendJson(res,400,{ok:false,error:'A complete U.S. property address is required.'});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      const u=new URL('/api/case',originFromReq(req));u.searchParams.set('address',address);u.searchParams.set('use','residential');u.searchParams.set('sqft',String(sqft));
      const caseData=await fetchJson(u,{signal:controller.signal});
      const decision=calculateHomeDecision(body,caseData.case);
      return sendJson(res,200,{ok:true,case:caseData.case,decision},{cache:'no-store'});
    }finally{clearTimeout(timer)}
  }catch(error){
    const status=error?.name==='AbortError'?504:(error?.status&&error.status<500?error.status:502);
    return sendJson(res,status,{ok:false,error:error?.name==='AbortError'?'Home case timed out. Try again.':error?.message||'Could not build the home ownership case.',modelVersion:HOME_MODEL_VERSION});
  }
};
