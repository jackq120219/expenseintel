const {gather}=require('../lib/check-intel');
function send(res,status,payload,cache=false){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',cache?'public, s-maxage=1800, stale-while-revalidate=7200':'no-store');res.end(JSON.stringify(payload))}
module.exports=async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Method not allowed'});
  let body=req.method==='GET'?(req.query||{}):req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(_e){body={}}}body=body||{};
  const text=String(body.text||'').slice(0,5000),url=String(body.url||'').slice(0,1600),category=String(body.category||'auto').slice(0,40),location=String(body.location||'').slice(0,180),price=body.price;
  if(!text.trim()&&!url.trim())return send(res,400,{ok:false,error:'Paste a link, quote/listing text, or describe what you are considering.'});
  try{const out=await gather({text,url,category,price,location});return send(res,200,out,req.method==='GET'&&!url)}catch(e){return send(res,502,{ok:false,error:String(e?.message||e||'ExpenseIntel Check could not complete.')})}
};