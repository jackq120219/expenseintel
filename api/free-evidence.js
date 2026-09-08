const {extractStructuredTerms,fetchCensusContext}=require('../lib/free-evidence');
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload))}
module.exports=async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Method not allowed'});
  let body=req.method==='GET'?(req.query||{}):req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(_e){body={}}}body=body||{};
  const text=String(body.text||'').slice(0,20000),location=String(body.location||'').slice(0,500);
  try{const quote=extractStructuredTerms(text),local=await fetchCensusContext(location,text);return send(res,200,{ok:true,quote,local,policy:'No-cost evidence only. Explicit user terms are verified inputs; Census values are contextual and never treated as transaction comparables.'})}catch(e){return send(res,500,{ok:false,error:String(e?.message||e)})}
};