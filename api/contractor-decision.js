'use strict';
const {readJson,sendJson,originFromReq,fetchJson,cleanText,finite}=require('../lib/http');
const {calculateContractorDecision,CONTRACTOR_MODEL_VERSION}=require('../lib/contractor-core');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return sendJson(res,405,{ok:false,error:'Method not allowed'});
  try{
    const body=await readJson(req),address=cleanText(body.address,220),sqft=Math.max(300,finite(body.sqft,25000));
    if(address.length<6)return sendJson(res,400,{ok:false,error:'A complete U.S. project address is required.'});
    const scope=['service','fitout','renovation','groundup','civil'].includes(body.scope)?body.scope:'renovation';
    const use=(scope==='service'||scope==='renovation')?'other':'industrial';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      const u=new URL('/api/case',originFromReq(req));u.searchParams.set('address',address);u.searchParams.set('use',use);u.searchParams.set('sqft',String(sqft));
      const caseData=await fetchJson(u,{signal:controller.signal});
      const decision=calculateContractorDecision(body,caseData.case);
      return sendJson(res,200,{ok:true,case:caseData.case,decision},{cache:'no-store'});
    }finally{clearTimeout(timer)}
  }catch(error){
    const status=error?.name==='AbortError'?504:(error?.status&&error.status<500?error.status:502);
    return sendJson(res,status,{ok:false,error:error?.name==='AbortError'?'Contractor case timed out. Try again.':error?.message||'Could not build the contractor cost case.',modelVersion:CONTRACTOR_MODEL_VERSION});
  }
};
