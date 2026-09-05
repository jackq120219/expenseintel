'use strict';

function sendJson(res,status,payload,{cache='no-store'}={}){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',cache);
  res.end(JSON.stringify(payload));
}
function originFromReq(req){
  const host=req.headers['x-forwarded-host']||req.headers.host;
  const proto=req.headers['x-forwarded-proto']||'https';
  return `${proto}://${host}`;
}
async function readJson(req,maxBytes=65536){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  let body='';
  for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>maxBytes)throw Object.assign(new Error('Request body too large'),{status:413})}
  if(!body)return{};
  try{return JSON.parse(body)}catch(_e){throw Object.assign(new Error('Invalid JSON body'),{status:400})}
}
async function fetchJson(url,{signal,method='GET',body}={}){
  const options={method,signal,headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 (https://expenseintel.com)'}};
  if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
  const r=await fetch(url,options);const d=await r.json().catch(()=>({}));
  if(!r.ok||d.ok===false)throw Object.assign(new Error(d.error||`Upstream ${r.status}`),{status:r.status,data:d});
  return d;
}
function cleanText(value,max=220){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}

module.exports={sendJson,originFromReq,readJson,fetchJson,cleanText,finite,clamp};
