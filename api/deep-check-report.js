'use strict';
const {validSession,fetchSession,notReversed,supabase}=require('../lib/deep-check-payments');
const {makeDossier}=require('../lib/deep-check-dossier');

function send(res,code,data){
  res.statusCode=code;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(data));
}
async function authenticate(req){
  const token=String(req.headers.authorization||'').match(/^Bearer ([A-Za-z0-9._-]{30,6000})$/)?.[1];
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!token||!url||!key)return null;
  const r=await fetch(`${url.replace(/\/$/,'')}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
  if(!r.ok)return null;
  const user=await r.json();
  if(!user?.id||!user?.email||!user.email_confirmed_at)return null;
  return{id:user.id,email:user.email.trim().toLowerCase()};
}
module.exports=async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Method not allowed'});
  if(!process.env.STRIPE_SECRET_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.SUPABASE_URL)return send(res,503,{ok:false,error:'Sandbox report service is not configured yet.'});
  if(req.method==='POST'&&Number(req.headers['content-length']||0)>16384)return send(res,413,{ok:false,error:'Submitted information is too large.'});
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body)}catch(_e){return send(res,400,{ok:false,error:'Invalid JSON.'})}}
  const id=req.method==='GET'?req.query?.session_id:body.session_id;
  if(typeof id!=='string'||!/^cs_test_[a-zA-Z0-9_]+$/.test(id))return send(res,400,{ok:false,error:'Invalid sandbox checkout reference.'});
  try{
    const user=await authenticate(req);
    if(!user)return send(res,401,{ok:false,error:'Sign in to a confirmed ExpenseIntel account using the email from checkout.'});
    const session=await fetchSession(id);
    if(!validSession(session)||!notReversed(session))return send(res,403,{ok:false,error:'No eligible paid test purchase was found.'});
    const email=String(session.customer_details?.email||session.customer_email||'').trim().toLowerCase();
    const rows=await supabase(`ei_deep_check_orders?session_id=eq.${encodeURIComponent(id)}&select=session_id,status,customer_email,owner_id,decision_title,dossier&limit=1`);
    const order=rows?.[0];
    if(!order||order.status!=='paid')return send(res,409,{ok:false,error:'Payment record is pending or no longer eligible. Try again shortly.'});
    if(!email||order.customer_email!==email||user.email!==email||order.owner_id&&order.owner_id!==user.id)return send(res,403,{ok:false,error:'Use the verified account matching your checkout email.'});
    if(req.method==='GET')return send(res,200,{ok:true,paid:true,reportReady:!!order.dossier,report:order.dossier||null});
    let dossier;
    try{dossier=makeDossier(body.input)}catch(e){return send(res,400,{ok:false,error:e.message})}
    if(order.decision_title&&order.decision_title.toLowerCase()!==dossier.title.toLowerCase())return send(res,409,{ok:false,error:'Each payment covers one decision. Keep the original decision title when revising this report.'});
    // Bind the first verified buyer account and prevent another owner overwriting the dossier.
    const filter=`ei_deep_check_orders?session_id=eq.${encodeURIComponent(id)}&status=eq.paid&${order.owner_id?'owner_id=eq.'+encodeURIComponent(user.id):'owner_id=is.null'}`;
    await supabase(filter,'PATCH',{owner_id:user.id,decision_title:order.decision_title||dossier.title,dossier,dossier_updated_at:new Date().toISOString()});
    const updated=await supabase(`ei_deep_check_orders?session_id=eq.${encodeURIComponent(id)}&select=owner_id,dossier&limit=1`);
    if(updated?.[0]?.owner_id!==user.id||updated?.[0]?.dossier?.title!==dossier.title)return send(res,409,{ok:false,error:'The report could not be saved. Retry safely.'});
    return send(res,200,{ok:true,paid:true,reportReady:true,report:updated[0].dossier});
  }catch(error){
    console.error('Deep Check dossier failed:',error.message);
    return send(res,503,{ok:false,error:'The report service is temporarily unavailable.'});
  }
};
