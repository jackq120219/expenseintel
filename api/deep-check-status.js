'use strict';
const {validSession,fetchSession,notReversed,supabase}=require('../lib/deep-check-payments');
function send(res,code,payload){
  res.statusCode=code;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(payload));
}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'Method not allowed'});
  const id=typeof req.query?.session_id==='string'?req.query.session_id:'';
  if(!/^cs_test_[a-zA-Z0-9_]+$/.test(id))return send(res,400,{ok:false,error:'Invalid checkout reference'});
  try{
    // Never trust a success URL: check the session directly with Stripe using a server-only key.
    const session=await fetchSession(id);
    if(!validSession(session)||!notReversed(session))return send(res,200,{ok:true,paid:false,reportReady:false,state:'not_paid'});
    const rows=await supabase(`ei_deep_check_orders?session_id=eq.${encodeURIComponent(id)}&select=status&limit=1`);
    const paid=rows?.[0]?.status==='paid';
    // This endpoint deliberately returns NO customer data, entitlement token or report.
    return send(res,200,{ok:true,paid,reportReady:false,state:paid?'paid_awaiting_fulfillment':'processing'});
  }catch(error){
    console.error('Deep Check verification failed:',error.message);
    return send(res,503,{ok:false,error:'Payment status temporarily unavailable'});
  }
};
