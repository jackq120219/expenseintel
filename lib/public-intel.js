const BLS_URL='https://api.bls.gov/publicAPI/v2/timeseries/data/';
const TREASURY_MONTH='https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value_month=';
const FUEL_BASE='https://www.fueleconomy.gov/ws/rest';
const NHTSA_BASE='https://vpic.nhtsa.dot.gov/api/vehicles';

const BLS_SERIES={
  all_items:{id:'CUUR0000SA0',label:'All consumer prices',unit:'CPI'},
  new_vehicles:{id:'CUUR0000SETA01',label:'New vehicles',unit:'CPI'},
  used_vehicles:{id:'CUUR0000SETA02',label:'Used cars & trucks',unit:'CPI'},
  gasoline:{id:'CUUR0000SETB01',label:'Gasoline',unit:'CPI'},
  vehicle_repair:{id:'CUUR0000SETD',label:'Motor vehicle maintenance & repair',unit:'CPI'},
  household:{id:'CUUR0000SAH3',label:'Household furnishings & operations',unit:'CPI'},
  electricity:{id:'CUUR0000SEHF01',label:'Electricity',unit:'CPI'},
  utility_gas:{id:'CUUR0000SEHF02',label:'Utility piped gas',unit:'CPI'},
  household_insurance:{id:'CUUR0000SEHD',label:'Tenants & household insurance',unit:'CPI'},
  shelter:{id:'CUUR0000SAH1',label:'Shelter',unit:'CPI'}
};
const BY_ID=Object.fromEntries(Object.entries(BLS_SERIES).map(([k,v])=>[v.id,{key:k,...v}]));

function timeout(ms=7500){const c=new AbortController();const timer=setTimeout(()=>c.abort(),ms);return{signal:c.signal,done:()=>clearTimeout(timer)}}
function finite(v){const n=Number(String(v??'').replace(/[,%$]/g,''));return Number.isFinite(n)?n:null}
function periodIndex(d){const y=Number(d.year),m=Number(String(d.period||'').replace('M',''));return Number.isFinite(y)&&m>=1&&m<=12?y*12+m:null}
function monthName(period){const m=Number(String(period||'').replace('M',''));return m>=1&&m<=12?new Date(2000,m-1,1).toLocaleString('en-US',{month:'short'}):period}
function normalizeSeriesData(series){return (series?.data||[]).filter(x=>/^M\d\d$/.test(x.period||'')&&x.period!=='M13'&&finite(x.value)!=null).map(x=>({...x,value:finite(x.value),idx:periodIndex(x)})).sort((a,b)=>b.idx-a.idx)}
function stripHtml(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
function htmlCells(row,tag='td'){return(row.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`,'gi'))||[]).map(stripHtml)}

async function fetchBls(keys=Object.keys(BLS_SERIES)){
  const chosen=[...new Set(keys)].filter(k=>BLS_SERIES[k]).map(k=>BLS_SERIES[k]);
  if(!chosen.length)return{ok:false,signals:[],error:'No valid BLS series requested'};
  const now=new Date(),start=String(now.getUTCFullYear()-2),end=String(now.getUTCFullYear());
  const t=timeout();
  try{
    const r=await fetch(BLS_URL,{method:'POST',signal:t.signal,headers:{'Content-Type':'application/json','User-Agent':'ExpenseIntel/1.0 (+https://www.expenseintel.com)'},body:JSON.stringify({seriesid:chosen.map(x=>x.id),startyear:start,endyear:end})});
    if(!r.ok)throw new Error(`BLS ${r.status}`);const d=await r.json();if(d?.status!=='REQUEST_SUCCEEDED')throw new Error('BLS request failed');
    const signals=(d.Results?.series||[]).map(s=>{const meta=BY_ID[s.seriesID]||{key:s.seriesID,label:s.seriesID,unit:'Index'},rows=normalizeSeriesData(s),latest=rows[0];if(!latest)return null;const yoy=rows.find(x=>x.year===String(Number(latest.year)-1)&&x.period===latest.period),prior=rows[1],three=rows[3];const change=(base)=>base&&base.value?latest.value/base.value-1:null;return{key:meta.key,seriesId:s.seriesID,label:meta.label,value:latest.value,period:`${monthName(latest.period)} ${latest.year}`,mom:change(prior),threeMonth:change(three),yoy:change(yoy),source:'U.S. Bureau of Labor Statistics',sourceUrl:`https://data.bls.gov/timeseries/${s.seriesID}`,grade:'A',retrievedAt:new Date().toISOString()}}).filter(Boolean);
    return{ok:true,signals,source:'U.S. Bureau of Labor Statistics'};
  }catch(e){return{ok:false,signals:[],error:e?.name==='AbortError'?'BLS request timed out':String(e?.message||e)}}finally{t.done()}
}

function treasuryHeaderIndex(headers,name){const n=name.toLowerCase().replace(/\s+/g,' ');return headers.findIndex(h=>h.toLowerCase().replace(/\s+/g,' ')===n)}
async function treasuryMonth(ym){const t=timeout(5500);try{const r=await fetch(TREASURY_MONTH+ym,{signal:t.signal,headers:{'User-Agent':'Mozilla/5.0 ExpenseIntel/1.0'}});if(!r.ok)throw new Error(`Treasury ${r.status}`);const h=await r.text(),tables=h.match(/<table\b[\s\S]*?<\/table>/gi)||[];for(const table of tables){const headRow=(table.match(/<thead\b[\s\S]*?<\/thead>/i)||[''])[0],heads=htmlCells(headRow,'th');if(!heads.some(x=>/10\s*Yr/i.test(x))||!heads.some(x=>/^Date$/i.test(x)))continue;const rows=(table.match(/<tbody\b[\s\S]*?<\/tbody>/i)||[''])[0].match(/<tr\b[\s\S]*?<\/tr>/gi)||[];const parsed=rows.map(row=>htmlCells(row,'td')).filter(c=>c.length);const idx={date:treasuryHeaderIndex(heads,'Date'),oneMonth:treasuryHeaderIndex(heads,'1 Mo'),threeMonth:treasuryHeaderIndex(heads,'3 Mo'),sixMonth:treasuryHeaderIndex(heads,'6 Mo'),oneYear:treasuryHeaderIndex(heads,'1 Yr'),twoYear:treasuryHeaderIndex(heads,'2 Yr'),fiveYear:treasuryHeaderIndex(heads,'5 Yr'),tenYear:treasuryHeaderIndex(heads,'10 Yr'),thirtyYear:treasuryHeaderIndex(heads,'30 Yr')};const observations=parsed.map(c=>({date:idx.date>=0?c[idx.date]:null,oneMonth:idx.oneMonth>=0?finite(c[idx.oneMonth]):null,threeMonth:idx.threeMonth>=0?finite(c[idx.threeMonth]):null,sixMonth:idx.sixMonth>=0?finite(c[idx.sixMonth]):null,oneYear:idx.oneYear>=0?finite(c[idx.oneYear]):null,twoYear:idx.twoYear>=0?finite(c[idx.twoYear]):null,fiveYear:idx.fiveYear>=0?finite(c[idx.fiveYear]):null,tenYear:idx.tenYear>=0?finite(c[idx.tenYear]):null,thirtyYear:idx.thirtyYear>=0?finite(c[idx.thirtyYear]):null})).filter(x=>x.date&&/\d{1,2}\/\d{1,2}\/\d{4}/.test(x.date)).sort((a,b)=>new Date(b.date)-new Date(a.date));if(observations[0])return observations[0]}throw new Error('No Treasury observations')}finally{t.done()}}
async function fetchTreasury(){
  const now=new Date();
  for(let back=0;back<2;back++){
    const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-back,1)),ym=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    try{const latest=await treasuryMonth(ym);return{ok:true,...latest,source:'U.S. Department of the Treasury',sourceUrl:'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve',grade:'A',retrievedAt:new Date().toISOString()}}catch(_e){}
  }
  return{ok:false,error:'Treasury rate feed unavailable'};
}

function normalizeMenu(d){let v=d?.menuItem??d?.menuItems?.menuItem??[];if(!Array.isArray(v))v=v?[v]:[];return v.map(x=>({text:String(x.text??x.Text??''),value:String(x.value??x.Value??'')})).filter(x=>x.value)}
async function fuelGet(path){const t=timeout();try{const r=await fetch(FUEL_BASE+path,{signal:t.signal,headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 (+https://www.expenseintel.com)'}});if(!r.ok)throw new Error(`FuelEconomy ${r.status}`);return await r.json()}finally{t.done()}}
async function fetchFuelPrices(){try{const d=await fuelGet('/fuelprices'),p=d?.fuelPrices||d;return{ok:true,regular:finite(p.regular),midgrade:finite(p.midgrade),premium:finite(p.premium),diesel:finite(p.diesel),e85:finite(p.e85),electric:finite(p.electric),cng:finite(p.cng),lpg:finite(p.lpg),source:'FuelEconomy.gov / U.S. Department of Energy',sourceUrl:'https://www.fueleconomy.gov/feg/ws/',grade:'A',retrievedAt:new Date().toISOString()}}catch(e){return{ok:false,error:String(e?.message||e)}}}

async function decodeVin(vin,modelYear){if(!vin)return null;const t=timeout();try{const u=`${NHTSA_BASE}/DecodeVinValues/${encodeURIComponent(vin)}?format=json${modelYear?`&modelyear=${encodeURIComponent(modelYear)}`:''}`,r=await fetch(u,{signal:t.signal,headers:{'User-Agent':'ExpenseIntel/1.0 (+https://www.expenseintel.com)'}});if(!r.ok)throw new Error(`NHTSA ${r.status}`);const d=await r.json(),v=d?.Results?.[0];if(!v)return null;return{vin:v.VIN||vin,year:v.ModelYear||modelYear||'',make:v.Make||'',model:v.Model||'',trim:v.Trim||'',bodyClass:v.BodyClass||'',driveType:v.DriveType||'',engineCylinders:v.EngineCylinders||'',displacementL:v.DisplacementL||'',fuelType:v.FuelTypePrimary||'',plantCountry:v.PlantCountry||'',errorCode:v.ErrorCode||'',errorText:v.ErrorText||'',source:'NHTSA vPIC',sourceUrl:'https://vpic.nhtsa.dot.gov/api/',grade:'A'}}catch(e){return{error:String(e?.message||e),source:'NHTSA vPIC'}}finally{t.done()}}

async function fetchVehicleFuel({year,make,model,optionId,limit=12}={}){
  try{
    if(optionId){const d=await fuelGet(`/vehicle/${encodeURIComponent(optionId)}`);return{ok:true,options:[vehicleRecord(d)],summary:summarizeVehicles([vehicleRecord(d)]),source:'FuelEconomy.gov / EPA & DOE',sourceUrl:'https://www.fueleconomy.gov/feg/ws/',grade:'A'}}
    if(!year||!make||!model)return{ok:false,options:[],error:'Year, make and model are required'};
    const opts=normalizeMenu(await fuelGet(`/vehicle/menu/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`)).slice(0,Math.max(1,Math.min(20,limit)));
    if(!opts.length)return{ok:false,options:[],error:'No FuelEconomy.gov options found for that vehicle'};
    const rows=(await Promise.all(opts.map(async o=>{try{return vehicleRecord(await fuelGet(`/vehicle/${encodeURIComponent(o.value)}`),o)}catch(_e){return null}}))).filter(Boolean);
    return{ok:true,options:rows,summary:summarizeVehicles(rows),source:'FuelEconomy.gov / EPA & DOE',sourceUrl:'https://www.fueleconomy.gov/feg/ws/',grade:'A'};
  }catch(e){return{ok:false,options:[],error:String(e?.message||e)}}
}
function vehicleRecord(d,o={}){const v=d?.vehicle||d;return{id:String(v.id||o.value||''),label:o.text||`${v.year||''} ${v.make||''} ${v.model||''}`.trim(),year:finite(v.year),make:v.make||'',model:v.model||'',trim:v.trany||'',drive:v.drive||'',fuelType:v.fuelType1||v.fuelType||'',combinedMpg:finite(v.comb08),cityMpg:finite(v.city08),highwayMpg:finite(v.highway08),annualFuelCost:finite(v.fuelCost08),electricKwh100mi:finite(v.combE),fiveYearSavingsVsAverage:finite(v.youSaveSpend),ghgScore:finite(v.ghgScore),fuelEconomyScore:finite(v.feScore)}}
function summarizeVehicles(rows){const nums=(key)=>rows.map(x=>finite(x[key])).filter(x=>x!=null).sort((a,b)=>a-b),range=(a)=>a.length?{min:a[0],max:a[a.length-1],median:a[Math.floor(a.length/2)]}:null;return{optionCount:rows.length,combinedMpg:range(nums('combinedMpg')),annualFuelCost:range(nums('annualFuelCost')),electricKwh100mi:range(nums('electricKwh100mi'))}}

module.exports={BLS_SERIES,fetchBls,fetchTreasury,fetchFuelPrices,decodeVin,fetchVehicleFuel};