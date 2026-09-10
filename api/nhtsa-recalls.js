'use strict';
const text=v=>String(v||'').trim();
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
  const make=text(req.query?.make),model=text(req.query?.model),modelYear=text(req.query?.modelYear).replace(/\D/g,'').slice(0,4);
  if(!make||!model||!/^(19|20)\d{2}$/.test(modelYear))return res.status(400).json({ok:false,error:'Provide make, model and a four-digit modelYear.'});
  const url=`https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(modelYear)}`;
  try{
    const upstream=await fetch(url,{headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 public-evidence'},signal:AbortSignal.timeout(6500)});
    if(!upstream.ok)throw new Error(`NHTSA recalls ${upstream.status}`);
    const data=await upstream.json();
    const raw=Array.isArray(data?.results)?data.results:Array.isArray(data?.Results)?data.Results:[];
    const dateValue=r=>{const d=Date.parse(r.ReportReceivedDate||r.reportReceivedDate||'');return Number.isFinite(d)?d:0};
    const recalls=raw.slice().sort((a,b)=>dateValue(b)-dateValue(a)).slice(0,12).map(r=>({campaignNumber:r.NHTSACampaignNumber||r.nhtsaCampaignNumber||null,manufacturer:r.Manufacturer||r.manufacturer||null,component:r.Component||r.component||null,summary:r.Summary||r.summary||null,consequence:r.Consequence||r.consequence||null,remedy:r.Remedy||r.remedy||null,reportReceivedDate:r.ReportReceivedDate||r.reportReceivedDate||null,parkIt:Boolean(r.parkIt),parkOutside:Boolean(r.parkOutSide),doNotDrive:Boolean(r.doNotDrive)}));
    return res.status(200).json({ok:true,vehicle:{make,model,modelYear},count:raw.length,recalls,safetyFlags:{doNotDrive:recalls.some(r=>r.doNotDrive),parkOutside:recalls.some(r=>r.parkOutside),parkIt:recalls.some(r=>r.parkIt)},evidence:{class:'public',authority:'National Highway Traffic Safety Administration',dataset:'Recalls by Model Year / Make / Model',retrievedAt:new Date().toISOString()},source:'NHTSA Recalls API',interpretation:'These are model-level safety recall campaigns. They do not establish whether a specific VIN is affected, repaired, or currently has an open recall. Confirm VIN-specific recall status with NHTSA or the manufacturer before purchase.'});
  }catch(error){return res.status(200).json({ok:false,error:'NHTSA recall context is temporarily unavailable.',detail:String(error?.message||error),source:'NHTSA Recalls API',retrievedAt:new Date().toISOString()})}
};
