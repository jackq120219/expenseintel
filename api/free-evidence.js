const {extractStructuredTerms}=require('../lib/free-evidence');
const {fetchHousePriceContext,fetchMortgageRates}=require('../lib/housing-intel');
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload))}
module.exports=async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Method not allowed'});
  let body=req.method==='GET'?(req.query||{}):req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(_e){body={}}}body=body||{};
  const text=String(body.text||'').slice(0,20000),location=String(body.location||'').slice(0,500),propertyLike=/\b(house|home|condo|townhome|property|real estate|apartment|mortgage|rent|buying a home)\b/i.test(text);
  try{
    const quote=extractStructuredTerms(text);let housing=null;
    if(propertyLike&&location.trim()){
      const [housePrice,mortgage]=await Promise.all([fetchHousePriceContext(location),fetchMortgageRates()]);
      housing={ok:!!(housePrice?.ok||mortgage?.ok),housePrice:housePrice?.ok?housePrice:null,mortgage:mortgage?.ok?mortgage:null,note:'FHFA house-price indexes and Freddie Mac mortgage averages are market context only; they are not a property appraisal, rent quote, or transaction comparable.'};
    }
    return send(res,200,{ok:true,quote,housing,policy:'No-cost evidence only. Explicit user terms are verified inputs; government and GSE context is never treated as a transaction-specific comparable.'});
  }catch(e){return send(res,500,{ok:false,error:String(e?.message||e)})}
};