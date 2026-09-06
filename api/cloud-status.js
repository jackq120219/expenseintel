'use strict';

const { sendJson } = require('../lib/http');

const PROJECT_URL='https://tzwjiokoxfsruvobkiok.supabase.co';

module.exports=function handler(req,res){
  if(req.method!=='GET')return sendJson(res,405,{ok:false,error:'Method not allowed'});
  return sendJson(res,200,{
    ok:true,
    configured:true,
    mode:'dedicated-cloud',
    projectRef:'tzwjiokoxfsruvobkiok',
    url:PROJECT_URL,
    auth:true,
    rls:true,
    collaboration:true,
    message:'Dedicated ExpenseIntel cloud project is active with authenticated Row Level Security.'
  },{cache:'no-store'});
};
