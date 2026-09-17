'use strict';
const {validSession,verifySignature,readRaw,supabase}=require('../lib/deep-check-payments');

// Vercel must leave the request body untouched for Stripe signature verification.
module.exports.config={api:{bodyParser:false}};

function respond(res,status,message){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify({received:status===200,message}));
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return respond(res,405,'Method not allowed');
  if(!process.env.STRIPE_WEBHOOK_SECRET||!process.env.SUPABASE_SERVICE_ROLE_KEY)return respond(res,503,'Webhook not configured');
  let raw;
  try{raw=await readRaw(req)}catch(_e){return respond(res,413,'Invalid request size')}
  if(!verifySignature(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET))return respond(res,400,'Invalid signature');
  let event;
  try{event=JSON.parse(raw.toString('utf8'))}catch(_e){return respond(res,400,'Invalid JSON')}
  if(event.livemode!==false)return respond(res,400,'Unexpected payment environment');
  const object=event?.data?.object||{};
  try{
    if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
      if(!validSession(object))return respond(res,200,'Not an eligible paid Deep Check');
      const email=String(object.customer_details?.email||object.customer_email||'').trim().toLowerCase();
      if(!email||!object.payment_intent||typeof object.payment_intent!=='string')return respond(res,422,'Customer details missing');
      // A second delivery of the same event does not create a second order.
      // Ignore duplicates rather than resetting a refunded/disputed order to paid.
      await supabase('ei_deep_check_orders?on_conflict=session_id','POST',[{
        session_id:object.id,payment_intent_id:object.payment_intent,
        customer_email:email,amount_total:object.amount_total,currency:object.currency,
        status:'paid'
      }]);
    }else if(['charge.refunded','charge.dispute.created'].includes(event.type)){
      const intent=typeof object.payment_intent==='string'?object.payment_intent:null;
      if(intent){
        const status=event.type==='charge.refunded'?'refunded':'disputed';
        await supabase(`ei_deep_check_orders?payment_intent_id=eq.${encodeURIComponent(intent)}`,'PATCH',{status});
      }
    }
    return respond(res,200,'Accepted');
  }catch(error){
    console.error('Deep Check webhook processing failed:',error.message);
    // Non-2xx causes Stripe to retry; no payment is treated as fulfilled on failure.
    return respond(res,503,'Could not persist order');
  }
};
