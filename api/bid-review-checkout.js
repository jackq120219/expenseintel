'use strict';
const {randomUUID}=require('node:crypto');
const {normalize,checkout,store,send}=require('../lib/bid-review-payments');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{ok:false,error:'Use POST to start checkout.'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{ok:false,error:'JSON required.'});
 if(Number(req.headers['content-length']||0)>18000)return send(res,413,{ok:false,error:'Too much information.'});
 let body=req.body;
 try{if(typeof body==='string')body=JSON.parse(body);if(Buffer.byteLength(JSON.stringify(body||{}))>18000)return send(res,413,{ok:false,error:'Too much information.'});}catch(_e){return send(res,400,{ok:false,error:'Invalid JSON.'});}
 let details;
 try{details=normalize(body);}catch(e){return send(res,400,{ok:false,error:e.message});}
 try{
  const id=randomUUID();
  await store('ei_bid_review_orders','POST',[{id,customer_email:details.email,project_name:details.project,proposal_a:details.options[0],proposal_b:details.options[1],amount_cents:3900,currency:'usd',status:'awaiting_payment',terms_accepted_at:new Date().toISOString()}]);
  const session=await checkout(details,id);
  const saved=await store('ei_bid_review_orders?id=eq.'+encodeURIComponent(id)+'&status=eq.awaiting_payment','PATCH',{checkout_session_id:session.id,updated_at:new Date().toISOString()});
  if(saved.length!==1)throw Error('Could not save checkout reference');
  return send(res,200,{ok:true,checkout_url:session.url});
 }catch(error){console.error('Bid review sandbox checkout failed:',error.message);return send(res,503,{ok:false,error:'Test checkout is not configured yet. No payment was collected.'});}
};
