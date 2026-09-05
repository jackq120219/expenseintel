const NRI_QUERY='https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Census_Tracts/FeatureServer/0/query';
const HAZARDS=[
  ['IFLD','Inland flooding'],['HAIL','Hail'],['HRCN','Hurricane'],['SWND','Strong wind'],['TRND','Tornado'],['WNTW','Winter weather'],['ERQK','Earthquake']
];
function send(res,status,payload,cache=true){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',cache?'public, s-maxage=86400, stale-while-revalidate=604800':'no-store');res.end(JSON.stringify(payload))}
function tract(v){const s=String(v||'').replace(/\D/g,'');return s.length===11?s:''}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'Method not allowed'},false);
  const tractFips=tract(req.query?.tract);if(!tractFips)return send(res,400,{ok:false,error:'Valid 11-digit Census tract FIPS required.'},false);
  const fields=['TRACTFIPS','STATE','COUNTY','RISK_SCORE','RISK_RATNG','RISK_SPCTL','EAL_SCORE','EAL_RATNG','EAL_VALT','EAL_VALB','BUILDVALUE','NRI_VER'];
  for(const [p] of HAZARDS)fields.push(`${p}_RISKS`,`${p}_RISKR`,`${p}_EALB`);
  const url=new URL(NRI_QUERY);url.searchParams.set('where',`TRACTFIPS='${tractFips}'`);url.searchParams.set('outFields',fields.join(','));url.searchParams.set('returnGeometry','false');url.searchParams.set('f','json');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
    const r=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'ExpenseIntel/1.0 (+https://expenseintel.com)'}});if(!r.ok)throw new Error(`upstream ${r.status}`);const d=await r.json();if(d.error)throw new Error(d.error.message||'NRI query failed');const a=d.features?.[0]?.attributes;if(!a)return send(res,200,{ok:true,tract:tractFips,available:false});
    const hazards=HAZARDS.map(([prefix,name])=>({name,score:num(a[`${prefix}_RISKS`]),rating:a[`${prefix}_RISKR`]||null,buildingEal:num(a[`${prefix}_EALB`])})).filter(h=>h.score!=null||h.buildingEal!=null).sort((x,y)=>(y.score||0)-(x.score||0));
    const buildingValue=num(a.BUILDVALUE),buildingEal=num(a.EAL_VALB);
    return send(res,200,{ok:true,available:true,tract:tractFips,version:a.NRI_VER||'v1.20',state:a.STATE||'',county:a.COUNTY||'',composite:{score:num(a.RISK_SCORE),rating:a.RISK_RATNG||null,statePercentile:num(a.RISK_SPCTL)},expectedAnnualLoss:{total:num(a.EAL_VALT),building:num(a.EAL_VALB),rating:a.EAL_RATNG||null,score:num(a.EAL_SCORE),buildingExposure:buildingValue,buildingLossRate:buildingValue&&buildingEal!=null?buildingEal/buildingValue:null},topHazards:hazards.slice(0,4),source:'FEMA National Risk Index Census Tracts',disclaimer:'This product uses the Federal Emergency Management Agency’s National Risk Index dataset API or downloadable datasets but is not endorsed by FEMA. The Federal Government or FEMA cannot vouch for the data or analyses derived from these data after the data have been retrieved from the Agency’s website(s).'});
  }catch(error){return send(res,error?.name==='AbortError'?504:502,{ok:false,error:'Hazard risk data is temporarily unavailable.'},false)}finally{clearTimeout(timer)}
};