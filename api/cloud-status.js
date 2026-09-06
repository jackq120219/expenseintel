'use strict';

const { sendJson } = require('../lib/http');

module.exports=function handler(req,res){
  if(req.method!=='GET')return sendJson(res,405,{ok:false,error:'Method not allowed'});
  const url=String(process.env.EXPENSEINTEL_SUPABASE_URL||'').trim();
  const key=String(process.env.EXPENSEINTEL_SUPABASE_PUBLISHABLE_KEY||'').trim();
  return sendJson(res,200,{
    ok:true,
    configured:Boolean(url&&key),
    mode:url&&key?'configured':'browser-local',
    message:url&&key?'ExpenseIntel cloud endpoint is configured.':'No dedicated ExpenseIntel cloud project is configured.'
  },{cache:'no-store'});
};
