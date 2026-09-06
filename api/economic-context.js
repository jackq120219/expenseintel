const {fetchBls,fetchTreasury,fetchFuelPrices}=require('../lib/public-intel');

function send(res,status,payload,cache=true){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',cache?'public, s-maxage=21600, stale-while-revalidate=86400':'no-store');res.end(JSON.stringify(payload))}

const GROUPS={
  vehicle:['new_vehicles','used_vehicles','gasoline','vehicle_repair','all_items'],
  home:['household','electricity','utility_gas','household_insurance','shelter','all_items'],
  property:['shelter','electricity','utility_gas','household_insurance','all_items'],
  equipment:['all_items','electricity'],
  'business-project':['all_items','electricity','utility_gas'],
  personal:['all_items','household'],
  other:['all_items']
};
module.exports=async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'Method not allowed'},false);
  const category=String(req.query?.category||'other').toLowerCase(),keys=GROUPS[category]||GROUPS.other;
  const [bls,treasury,fuel]=await Promise.all([fetchBls(keys),fetchTreasury(),category==='vehicle'?fetchFuelPrices():Promise.resolve(null)]);
  const ok=!!(bls.ok||treasury.ok||fuel?.ok);
  return send(res,ok?200:502,{ok,category,priceSignals:bls.signals||[],treasury:treasury.ok?treasury:null,fuelPrices:fuel?.ok?fuel:null,coverage:{bls:!!bls.ok,treasury:!!treasury.ok,fuelPrices:!!fuel?.ok},errors:[bls.error,treasury.error,fuel?.error].filter(Boolean),methodology:{warning:'These are observed public-market signals, not a forecast or a product-specific fair-value estimate. ExpenseIntel does not convert recent inflation into a future price prediction without an explicit scenario assumption.'}});
};