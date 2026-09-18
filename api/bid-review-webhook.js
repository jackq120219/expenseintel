'use strict';
const {paid,UUID,signed,readRaw,store,send}=require('../lib/bid-review-payments');
async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{received:false});
 const secret=process.env.STRIPE_BID_REVIEW_WEBHOOK_SECRET;
 if(!secret||!process.env.SUPABASE_SERVICE_ROLE_KEY)return send(res,503,{received:false,error:'Webhook unavailable'});
 let raw;try{raw=await readRaw(req);}catch(_e){return send(res,413,{received:false,error:'Invalid payload'});}
 if(!signed(raw,req.headers['stripe-signature'],secret))return send(res,400,{received:false,error:'Invalid signature'});
 let event;try{event=JSON.parse(raw.toString('utf8'));}catch(_e){return send(res,400,{received:false,error:'Invalid event'});}
 if(event.livemode!==false)return send(res,400,{received:false,error:'Unexpected payment environment'});
 const obj=event.data?.object||{};
 try{
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   if(!paid(obj))return send(res,200,{received:true,detail:'Not an eligible bid review payment'});
   const id=obj.client_reference_id;
   const email=String(obj.customer_details?.email||obj.customer_email||'').trim().toLowerCase();
   if(!email||typeof obj.payment_intent!=='string')return send(res,422,{received:false,error:'Payment details incomplete'});
   const rows=await store('ei_bid_review_orders?id=eq.'+encodeURIComponent(id)+'&select=id,customer_email,checkout_session_id,status');
   const order=rows?.[0];
   if(!order||order.checkout_session_id!==obj.id||order.customer_email!==email)return send(res,503,{received:false,error:'Order not linked yet'});
   if(order.status==='awaiting_payment'){
    const updated=await store('ei_bid_review_orders?id=eq.'+encodeURIComponent(id)+'&checkout_session_id=eq.'+encodeURIComponent(obj.id)+'&status=eq.awaiting_payment','PATCH',{status:'paid',payment_intent_id:obj.payment_intent,updated_at:new Date().toISOString()});
    if(updated.length!==1)return send(res,503,{received:false,error:'Order update not confirmed'});
   }
  }else if(event.type==='charge.refunded'||event.type==='charge.dispute.created'){
   const intent=typeof obj.payment_intent==='string'?obj.payment_intent:'';
   if(intent){
    const status=event.type==='charge.refunded'?'refunded':'disputed';
    await store('ei_bid_review_orders?payment_intent_id=eq.'+encodeURIComponent(intent),'PATCH',{status,updated_at:new Date().toISOString()});
   }
  }
  return send(res,200,{received:true});
 }catch(error){console.error('Sandbox bid review webhook:',error.message);return send(res,503,{received:false,error:'Could not process event'});}
}
// Preserve raw request bytes. Vercel's Node API function must not JSON-parse the signed body first.
handler.config={api:{bodyParser:false}};
module.exports=handler;
