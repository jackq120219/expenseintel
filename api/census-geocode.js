'use strict';
const clean=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,180);
const first=(geo,names)=>{for(const name of names){const a=geo?.[name];if(Array.isArray(a)&&a[0])return a[0]}return null};
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=604800, stale-while-revalidate=2592000');
  const address=clean(req.query?.address);
  if(address.length<8||!/^\d/.test(address))return res.status(400).json({ok:false,error:'Provide a street address beginning with a house number.'});
  const q=new URLSearchParams({address,benchmark:'Public_AR_Current',vintage:'Current_Current',format:'json'});
  const url=`https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${q}`;
  try{
    const upstream=await fetch(url,{headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 public-evidence'},signal:AbortSignal.timeout(6500)});
    if(!upstream.ok)throw new Error(`Census Geocoder ${upstream.status}`);
    const data=await upstream.json(),matches=data?.result?.addressMatches||[],m=matches[0];
    if(!m)return res.status(200).json({ok:true,matched:false,input:address,source:'U.S. Census Geocoder',retrievedAt:new Date().toISOString(),interpretation:'No Census address match was returned. This does not prove the address is invalid; confirm the exact postal/service address.'});
    const g=m.geographies||{},state=first(g,['States']),county=first(g,['Counties']),tract=first(g,['Census Tracts']),blockGroup=first(g,['Census Block Groups']);
    return res.status(200).json({ok:true,matched:true,input:address,matchedAddress:m.matchedAddress||null,coordinates:{longitude:Number(m.coordinates?.x),latitude:Number(m.coordinates?.y)},geography:{state:state?{name:state.NAME||null,fips:state.STATE||state.GEOID||null}:null,county:county?{name:county.NAME||null,fips:county.COUNTY||county.GEOID||null}:null,tract:tract?{name:tract.NAME||null,geoid:tract.GEOID||null}:null,blockGroup:blockGroup?{name:blockGroup.NAME||null,geoid:blockGroup.GEOID||null}:null},evidence:{class:'public',authority:'U.S. Census Bureau',dataset:'Census Geocoding Services',benchmark:'Public_AR_Current',vintage:'Current_Current',retrievedAt:new Date().toISOString()},source:'U.S. Census Geocoder',interpretation:'A Census match verifies a standardized geographic match for the submitted address. It does not establish ownership, market value, zoning, taxes, hazards or property condition.'});
  }catch(error){return res.status(200).json({ok:false,address,error:'Census address verification is temporarily unavailable.',detail:String(error?.message||error),source:'U.S. Census Geocoder',retrievedAt:new Date().toISOString()})}
};
