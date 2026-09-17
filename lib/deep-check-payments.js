'use strict';
const {createHmac,timingSafeEqual}=require('node:crypto');

const LINK_ID='plink_1UGmP1Fq94edrQR4Z8rmJUmT';
const PRICE_CENTS=1900;
const CURRENCY='usd';

function validSession(session){
  return Boolean(session && session.object==='checkout.session' && session.livemode===false && session.payment_link===LINK_ID && session.mode==='payment' && session.amount_total===PRICE_CENTS && session.currency===CURRENCY && session.payment_status==='paid');
}

function verifySignature(raw,header,secret,now=Date.now()){
  if(!Buffer.isBuffer(raw)||!secret||!header)return false;
  const fields=String(header).split(',').map(v=>v.trim());
  const timestamp=fields.find(v=>v.startsWith('t='))?.slice(2);
  const signatures=fields.filter(v=>v.startsWith('v1=')).map(v=>v.slice(3));
  if(!timestamp||!/^\d{10}$/.test(timestamp)||!signatures.length)return false;
  if(Math.abs(now-Number(timestamp)*1000)>300000)return false;
  const digest=createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
  return signatures.some(sig=>{
    if(!/^[a-f0-9]{64}$/i.test(sig))return false;
    return timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(sig,'hex'));
  });
}

async function readRaw(req){
  const chunks=[];let total=0;
  for await(const chunk of req){total+=chunk.length;if(total>1048576)throw new Error('Payload too large');chunks.push(chunk)}
  return Buffer.concat(chunks);
}

function sandboxKey(){
  const key=process.env.STRIPE_SECRET_KEY||'';
  if(!key.startsWith('sk_test_') && !key.startsWith('rk_test_'))throw new Error('Sandbox Stripe key is not configured');
  return key;
}

async function fetchSession(sessionId){
  if(!/^cs_test_[a-zA-Z0-9_]+$/.test(sessionId||''))return null;
  const key=sandboxKey();
  const endpoint=`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand%5B%5D=payment_intent.latest_charge`;
  const result=await fetch(endpoint,{headers:{Authorization:`Bearer ${key}`}});
  if(result.status===404)return null;
  if(!result.ok)throw new Error(`Stripe session lookup failed: ${result.status}`);
  return result.json();
}

function notReversed(session){
  const intent=session?.payment_intent;
  const charge=intent && typeof intent==='object' ? intent.latest_charge : null;
  return !(charge && typeof charge==='object' && (charge.refunded || charge.disputed || Number(charge.amount_refunded)>0));
}

async function supabase(path,method='GET',body){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw new Error('Supabase server configuration missing');
  const response=await fetch(`${url.replace(/\/$/,'')}/rest/v1/${path}`,{
    method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:method==='POST'?'resolution=ignore-duplicates,return=minimal':'return=minimal'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  if(!response.ok)throw new Error(`Order store failed: ${response.status}`);
  return response.status===204?null:response.json().catch(()=>null);
}

module.exports={LINK_ID,validSession,verifySignature,readRaw,fetchSession,notReversed,supabase};
