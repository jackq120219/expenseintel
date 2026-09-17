'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const {LINK_ID,validSession,verifySignature,notReversed}=require('../lib/deep-check-payments');
const paid=()=>({object:'checkout.session',livemode:false,payment_link:LINK_ID,mode:'payment',amount_total:1900,currency:'usd',payment_status:'paid',payment_intent:{latest_charge:{refunded:false,disputed:false,amount_refunded:0}}});
test('only the correct sandbox payment link and one-time $19 payment qualifies',()=>{
  assert.equal(validSession(paid()),true);
  for(const patch of [{livemode:true},{payment_link:'plink_other'},{amount_total:900},{currency:'eur'},{payment_status:'unpaid'},{mode:'subscription'}]){
    assert.equal(validSession({...paid(),...patch}),false);
  }
});
test('refunds and disputes revoke access',()=>{
  assert.equal(notReversed(paid()),true);
  assert.equal(notReversed({...paid(),payment_intent:{latest_charge:{amount_refunded:100}}}),false);
  assert.equal(notReversed({...paid(),payment_intent:{latest_charge:{disputed:true}}}),false);
});
test('webhook verifier rejects tampering and old events',()=>{
  const raw=Buffer.from('{"type":"checkout.session.completed"}');
  const secret='whsec_test';
  const timestamp=1789679000;
  const digest=createHmac('sha256',secret).update(`${timestamp}.`).update(raw).digest('hex');
  const header=`t=${timestamp},v1=${digest}`;
  assert.equal(verifySignature(raw,header,secret,timestamp*1000),true);
  assert.equal(verifySignature(Buffer.from('different'),header,secret,timestamp*1000),false);
  assert.equal(verifySignature(raw,header,secret,(timestamp+301)*1000),false);
  assert.equal(verifySignature(raw,'t=1789679000,v1=nothex',secret,timestamp*1000),false);
});
