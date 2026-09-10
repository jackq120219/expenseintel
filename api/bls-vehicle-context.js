'use strict';
const SERIES={newVehicles:'CUUR0000SETA01',usedVehicles:'CUUR0000SETA02',gasoline:'CUUR0000SETB01'};
const pct=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0?Number((((a-b)/b)*100).toFixed(1)):null;
function normalizeSeries(series){
  const rows=(series?.data||[]).filter(r=>/^M(0[1-9]|1[0-2])$/.test(r.period||'')).map(r=>({year:Number(r.year),period:r.period,month:Number(r.period.slice(1)),value:Number(r.value),periodName:r.periodName||null,footnotes:(r.footnotes||[]).map(x=>x?.text).filter(Boolean)})).filter(r=>Number.isFinite(r.year)&&Number.isFinite(r.value)).sort((a,b)=>(b.year-a.year)||(b.month-a.month));
  const latest=rows[0]||null;
  const yearAgo=latest?rows.find(r=>r.year===latest.year-1&&r.month===latest.month)||null:null;
  return latest?{seriesID:series.seriesID,latest,yearAgo,change12mPct:yearAgo?pct(latest.value,yearAgo.value):null}:null;
}
module.exports=async function handler(_req,res){
  res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
  const year=new Date().getUTCFullYear();
  try{
    const upstream=await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json','User-Agent':'ExpenseIntel/1.0 public-evidence'},body:JSON.stringify({seriesid:Object.values(SERIES),startyear:String(year-2),endyear:String(year)}),signal:AbortSignal.timeout(6500)});
    if(!upstream.ok)throw new Error(`BLS ${upstream.status}`);
    const data=await upstream.json();
    if(data?.status!=='REQUEST_SUCCEEDED')throw new Error((data?.message||[]).join('; ')||'BLS request failed');
    const byId=new Map((data?.Results?.series||[]).map(s=>[s.seriesID,normalizeSeries(s)]));
    const context={};for(const [key,id] of Object.entries(SERIES))context[key]=byId.get(id)||null;
    return res.status(200).json({ok:true,scope:'vehicle',context,interpretation:'BLS CPI indexes show broad U.S. price movement, not the fair value of a specific vehicle or quote.',evidence:{class:'public',authority:'U.S. Bureau of Labor Statistics',dataset:'Consumer Price Index, U.S. city average',series:SERIES,retrievedAt:new Date().toISOString()},source:'BLS Public Data API'});
  }catch(error){return res.status(200).json({ok:false,error:'BLS vehicle market context is temporarily unavailable.',detail:String(error?.message||error),source:'BLS Public Data API',retrievedAt:new Date().toISOString()})}
};
