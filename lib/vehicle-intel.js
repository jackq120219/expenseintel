const FUEL_BASE='https://www.fueleconomy.gov/ws/rest';
const NHTSA_API='https://api.nhtsa.gov';

function timeout(ms=7000){const c=new AbortController();const timer=setTimeout(()=>c.abort(),ms);return{signal:c.signal,done:()=>clearTimeout(timer)}}
function finite(v){const n=Number(String(v??'').replace(/[,$%]/g,''));return Number.isFinite(n)?n:null}
function norm(v){return String(v||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'')}
function words(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean)}
function similarity(a,b){const na=norm(a),nb=norm(b);if(!na||!nb)return 0;if(na===nb)return 100;if(nb.startsWith(na)||na.startsWith(nb))return 92;if(nb.includes(na)||na.includes(nb))return 86;const A=new Set(words(a)),B=new Set(words(b));const overlap=[...A].filter(x=>B.has(x)).length;return overlap?55+35*overlap/Math.max(A.size,B.size):0}
function pickMatches(items,input,limit=8){return items.map(x=>({...x,_score:similarity(input,x.text||x.value||x.model||x.make)})).filter(x=>x._score>=55).sort((a,b)=>b._score-a._score||String(a.text||'').length-String(b.text||'').length).slice(0,limit)}
function normalizeMenu(d){let v=d?.menuItem??d?.menuItems?.menuItem??d?.MenuItem??[];if(!Array.isArray(v))v=v?[v]:[];return v.map(x=>({text:String(x.text??x.Text??x.value??x.Value??''),value:String(x.value??x.Value??x.text??x.Text??'')})).filter(x=>x.value)}
async function getJson(url,ms=7000){const t=timeout(ms);try{const r=await fetch(url,{signal:t.signal,headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 (+https://www.expenseintel.com)'}});if(!r.ok)throw new Error(`${new URL(url).hostname} ${r.status}`);return await r.json()}finally{t.done()}}
async function fuelGet(path){return getJson(FUEL_BASE+path)}

async function resolveFuelVehicle({year,make,model,limit=16}={}){
  if(!year||!make||!model)return{ok:false,error:'Year, make and model are required',options:[]};
  try{
    const makes=normalizeMenu(await fuelGet(`/vehicle/menu/make?year=${encodeURIComponent(year)}`));
    const makeMatches=pickMatches(makes,make,3);if(!makeMatches.length)return{ok:false,error:`FuelEconomy.gov has no matching make for ${year} ${make}`,options:[],availableMakes:makes.slice(0,20).map(x=>x.text)};
    const resolvedMake=makeMatches[0].value||makeMatches[0].text;
    const models=normalizeMenu(await fuelGet(`/vehicle/menu/model?year=${encodeURIComponent(year)}&make=${encodeURIComponent(resolvedMake)}`));
    let modelMatches=pickMatches(models,model,8);
    if(!modelMatches.length){const n=norm(model);modelMatches=models.filter(x=>norm(x.text).includes(n.slice(0,Math.max(3,n.length-1)))).slice(0,8)}
    if(!modelMatches.length)return{ok:false,error:`FuelEconomy.gov has no matching model for ${year} ${resolvedMake} ${model}`,options:[],resolvedMake,availableModels:models.slice(0,30).map(x=>x.text)};
    const optionGroups=await Promise.all(modelMatches.map(async m=>{try{return{model:m.text,items:normalizeMenu(await fuelGet(`/vehicle/menu/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(resolvedMake)}&model=${encodeURIComponent(m.value||m.text)}`))}}catch(_e){return{model:m.text,items:[]}}}));
    const optionMap=new Map();for(const g of optionGroups)for(const o of g.items)if(!optionMap.has(o.value))optionMap.set(o.value,{...o,resolvedModel:g.model});
    const opts=[...optionMap.values()].slice(0,Math.max(1,Math.min(24,limit)));
    if(!opts.length)return{ok:false,error:'No FuelEconomy.gov configurations are available for the matched model yet',options:[],resolvedMake,resolvedModels:modelMatches.map(x=>x.text)};
    const rows=(await Promise.all(opts.map(async o=>{try{return vehicleRecord(await fuelGet(`/vehicle/${encodeURIComponent(o.value)}`),o)}catch(_e){return null}}))).filter(Boolean);
    if(!rows.length)return{ok:false,error:'FuelEconomy.gov configurations were found but vehicle records could not be loaded',options:[],resolvedMake,resolvedModels:modelMatches.map(x=>x.text)};
    return{ok:true,resolvedMake,resolvedModels:[...new Set(rows.map(x=>x.model).filter(Boolean))],options:rows,summary:summarizeVehicles(rows),source:'FuelEconomy.gov / EPA & U.S. Department of Energy',sourceUrl:'https://www.fueleconomy.gov/feg/ws/',grade:'A'};
  }catch(e){return{ok:false,error:String(e?.message||e),options:[]}}
}
function vehicleRecord(d,o={}){const v=d?.vehicle||d;return{id:String(v.id||o.value||''),label:o.text||`${v.year||''} ${v.make||''} ${v.model||''}`.trim(),year:finite(v.year),make:v.make||'',model:v.model||o.resolvedModel||'',transmission:v.trany||'',drive:v.drive||'',vehicleClass:v.VClass||'',fuelType:v.fuelType1||v.fuelType||'',fuelType2:v.fuelType2||'',combinedMpg:finite(v.comb08),cityMpg:finite(v.city08),highwayMpg:finite(v.highway08),annualFuelCost:finite(v.fuelCost08),electricKwh100mi:finite(v.combE),fiveYearSavingsVsAverage:finite(v.youSaveSpend),ghgScore:finite(v.ghgScore),fuelEconomyScore:finite(v.feScore),startStop:v.startStop||'',turbo:v.tCharger||'',supercharger:v.sCharger||''}}
function summarizeVehicles(rows){const nums=k=>rows.map(x=>finite(x[k])).filter(x=>x!=null).sort((a,b)=>a-b),range=a=>a.length?{min:a[0],max:a[a.length-1],median:a[Math.floor(a.length/2)]}:null;return{optionCount:rows.length,combinedMpg:range(nums('combinedMpg')),cityMpg:range(nums('cityMpg')),highwayMpg:range(nums('highwayMpg')),annualFuelCost:range(nums('annualFuelCost')),electricKwh100mi:range(nums('electricKwh100mi')),fiveYearSavingsVsAverage:range(nums('fiveYearSavingsVsAverage'))}}

async function nhtsaModels(year,make,issueType='r'){
  try{const d=await getJson(`${NHTSA_API}/products/vehicle/models?modelYear=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}&issueType=${encodeURIComponent(issueType)}`),rows=d?.results||d?.Results||[];return rows.map(x=>({text:String(x.model||x.Model||x.modelName||x.ModelName||''),value:String(x.model||x.Model||x.modelName||x.ModelName||'')})).filter(x=>x.value)}catch(_e){return[]}}
async function resolveNhtsaModel(year,make,model,issueType='r'){const list=await nhtsaModels(year,make,issueType),matches=pickMatches(list,model,5);return{resolved:matches[0]?.value||model,candidates:matches.map(x=>x.value),available:list.length}}
async function fetchRecalls({year,make,model}={}){
  if(!year||!make||!model)return{ok:false,error:'Year, make and model are required',recalls:[]};
  try{const resolution=await resolveNhtsaModel(year,make,model,'r'),models=[resolution.resolved,...resolution.candidates,model].filter((v,i,a)=>v&&a.indexOf(v)===i);let rows=[];let used=model;for(const m of models.slice(0,3)){const d=await getJson(`${NHTSA_API}/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(m)}&modelYear=${encodeURIComponent(year)}`);const r=d?.results||d?.Results||[];if(r.length){rows=r;used=m;break}}
    const recalls=rows.map(x=>({campaignNumber:x.NHTSACampaignNumber||x.nhtsaCampaignNumber||'',manufacturer:x.Manufacturer||x.manufacturer||'',component:x.Component||x.component||'',summary:x.Summary||x.summary||'',consequence:x.Consequence||x.consequence||'',remedy:x.Remedy||x.remedy||'',reportReceivedDate:x.ReportReceivedDate||x.reportReceivedDate||'',parkIt:!!(x.parkIt||x.ParkIt),parkOutside:!!(x.parkOutSide||x.ParkOutSide)}));
    return{ok:true,resolvedModel:used,count:recalls.length,recalls,source:'NHTSA Safety Recalls',sourceUrl:'https://www.nhtsa.gov/recalls',grade:'A',note:'Model-level recalls do not indicate whether a specific VIN still needs repair.'};
  }catch(e){return{ok:false,error:String(e?.message||e),recalls:[]}}
}
async function fetchComplaints({year,make,model,limit=40}={}){
  if(!year||!make||!model)return{ok:false,error:'Year, make and model are required',complaints:[]};
  try{const resolution=await resolveNhtsaModel(year,make,model,'c'),m=resolution.resolved||model,d=await getJson(`${NHTSA_API}/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(m)}&modelYear=${encodeURIComponent(year)}`),rows=d?.results||d?.Results||[];const complaints=rows.slice(0,Math.max(1,Math.min(100,limit))).map(x=>({odiNumber:x.odiNumber||x.ODINumber||'',dateComplaintFiled:x.dateComplaintFiled||x.DateComplaintFiled||'',crash:!!(x.crash||x.Crash),fire:!!(x.fire||x.Fire),injuries:finite(x.numberOfInjuries||x.NumberOfInjuries)||0,deaths:finite(x.numberOfDeaths||x.NumberOfDeaths)||0,components:x.components||x.Components||'',summary:x.summary||x.Summary||''}));return{ok:true,resolvedModel:m,count:rows.length,complaints,source:'NHTSA Consumer Complaints',sourceUrl:'https://www.nhtsa.gov/report-a-safety-problem',grade:'A',note:'Complaint counts are unnormalized reports, not a defect probability or reliability score.'}}catch(e){return{ok:false,error:String(e?.message||e),complaints:[]}}
}
async function fetchSafetyRatings({year,make,model}={}){
  if(!year||!make||!model)return{ok:false,error:'Year, make and model are required',variants:[]};
  try{const d=await getJson(`${NHTSA_API}/SafetyRatings/modelyear/${encodeURIComponent(year)}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}?format=json`),variants=d?.Results||d?.results||[];if(!variants.length)return{ok:true,count:0,variants:[],source:'NHTSA 5-Star Safety Ratings',sourceUrl:'https://www.nhtsa.gov/ratings',grade:'A',note:'No NHTSA NCAP variant rating was returned for this model/year.'};const details=(await Promise.all(variants.slice(0,8).map(async v=>{const id=v.VehicleId||v.vehicleId;if(!id)return null;try{const z=await getJson(`${NHTSA_API}/SafetyRatings/VehicleId/${encodeURIComponent(id)}?format=json`),r=(z?.Results||z?.results||[])[0];if(!r)return null;return{vehicleId:id,description:v.VehicleDescription||v.vehicleDescription||'',overall:r.OverallRating||'',frontCrash:r.OverallFrontCrashRating||'',sideCrash:r.OverallSideCrashRating||'',rollover:r.RolloverRating||'',rolloverPossibility:finite(r.RolloverPossibility),sidePole:r.SidePoleCrashRating||'',complaints:finite(r.ComplaintsCount),recalls:finite(r.RecallsCount),investigations:finite(r.InvestigationCount)}}catch(_e){return null}}))).filter(Boolean);return{ok:true,count:details.length,variants:details,source:'NHTSA 5-Star Safety Ratings',sourceUrl:'https://www.nhtsa.gov/ratings',grade:'A'}}catch(e){return{ok:false,error:String(e?.message||e),variants:[]}}
}

module.exports={resolveFuelVehicle,fetchRecalls,fetchComplaints,fetchSafetyRatings};