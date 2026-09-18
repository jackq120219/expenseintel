'use strict';
const {testKey,paid,store,send,UUID}=require('../lib/bid-review-payments');
module.exports=async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{ok:false,error:'Method not allowed'});
 const id=typeof req.query?.session_id==='string'?req.query.session_id:'';
 if(!/^cs_test_[a-zA-Z0-9_]+$/.test(id)||id.length>200)return send(res,400,{ok:false,error:'Invalid test session'});
 try{
  const r=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+testKey()}});
  if(!r.ok)return send(res,404,{ok:false,error:'Session not found'});
  const session=await r.json();
  if(!UUID.test(session.client_reference_id||''))return send(res,404,{ok:false,error:'Order not found'});
  const orders=await store('ei_bid_review_orders?id=eq.'+encodeURIComponent(session.client_reference_id)+'&checkout_session_id=eq.'+encodeURIComponent(id)+'&select=id,status');
  const order=orders?.[0];if(!order)return send(res,404,{ok:false,error:'Order not found'});
  return send(res,200,{ok:true,paid:paid(session)&&['paid','fulfilled'].includes(order.status),status:order.status});
 }catch(error){console.error('Bid review order lookup:',error.message);return send(res,503,{ok:false,error:'Order lookup temporarily unavailable'});}
};
