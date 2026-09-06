const PPI_URL='https://www.bls.gov/news.release/ppi.htm';
const ITEMS={
  construction:{label:'Final demand construction'},
  warehouse_building:{label:'New warehouse building construction'},
  office_building:{label:'New office building construction'},
  industrial_building:{label:'New industrial building construction'},
  nonres_repair:{label:'Maintenance and repair of non-residential buildings'},
  lumber:{label:'Lumber'},
  softwood_lumber:{label:'Softwood lumber'},
  plywood:{label:'Plywood'},
  steel:{label:'Steel mill products'},
  structural_metal:{label:'Fabricated structural metal products'},
  plumbing:{label:'Plumbing fixtures and brass fittings'},
  heating:{label:'Heating equipment'},
  hvac:{label:'Air conditioning and refrigeration equipment'},
  wiring:{label:'Wiring devices'},
  electrical_machinery:{label:'Electrical machinery and equipment'},
  general_machinery:{label:'General purpose machinery and equipment'},
  machinery_repair:{label:'Commercial and industrial machinery and equipment repair and maintenance'},
  equipment_rental:{label:'Construction, mining, and forestry machinery and equipment rental and leasing'},
  sand_gravel:{label:'Construction sand, gravel, and crushed stone'},
  cement:{label:'Cement'},
  concrete:{label:'Concrete products'},
  roofing:{label:'Prepared asphalt, tar roofing and siding products'},
  plastic_construction:{label:'Plastic construction products'},
  paint:{label:'Prepared paint'},
  architecture:{label:'Architectural and engineering services'},
  property_insurance:{label:'Property and casualty insurance'},
  nonres_rent:{label:'Nonresidential real estate rents'},
  nonres_property_mgmt:{label:'Nonresidential property management fees'},
  residential_property_mgmt:{label:'Residential property management fees'},
  vehicle_repair_service:{label:'Motor vehicle repair and maintenance'}
};
const CATEGORY_KEYS={
  home:['construction','lumber','softwood_lumber','roofing','hvac','plumbing','heating','wiring','paint','concrete'],
  property:['property_insurance','residential_property_mgmt','construction','hvac','lumber'],
  equipment:['general_machinery','electrical_machinery','machinery_repair','equipment_rental'],
  'business-project':['construction','industrial_building','warehouse_building','steel','structural_metal','concrete','electrical_machinery','architecture','nonres_rent','nonres_property_mgmt'],
  vehicle:['vehicle_repair_service'],
  personal:[],other:[]
};
function timeout(ms=7000){const c=new AbortController();const timer=setTimeout(()=>c.abort(),ms);return{signal:c.signal,done:()=>clearTimeout(timer)}}
function strip(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim()}
function cells(row){return(row?.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)||[]).map(strip).filter(Boolean)}
function num(v){const n=Number(String(v||'').replace(/[,%]/g,''));return Number.isFinite(n)?n:null}
function normalizeLabel(s){return strip(s).replace(/\(\s*\d+\s*\)/g,'').replace(/\(partial\)/gi,'').replace(/\s+/g,' ').trim().toLowerCase()}
function parseRow(row){
  const c=cells(row);if(c.length<8)return null;
  const label=c[0],groupCode=c[1]||'',itemCode=c[2]||'';
  // BLS table 1 includes relative importance before the 12-month change (10 cells total).
  // Detailed commodity/service tables omit that weight (9 cells total). Keep those layouts separate
  // so a weight such as 2.634 is never mislabeled as a 2.634% annual price change.
  const weighted=c.length>=10;
  const yoy=num(c[weighted?4:3]),latestMonth=num(c[c.length-1]);
  if(yoy==null||latestMonth==null)return null;
  return{label:strip(label),groupCode,itemCode,yoy,latestMonth};
}
async function fetchPpi(category='other'){
 const keys=CATEGORY_KEYS[category]||CATEGORY_KEYS.other;if(!keys.length)return{ok:true,period:'',signals:[],source:'U.S. Bureau of Labor Statistics Producer Price Index'};
 const t=timeout();
 try{const r=await fetch(PPI_URL,{signal:t.signal,headers:{'User-Agent':'Mozilla/5.0 ExpenseIntel/1.0 (+https://www.expenseintel.com)'}});if(!r.ok)throw new Error(`BLS PPI ${r.status}`);const html=await r.text(),period=(strip(html).match(/PRODUCER PRICE INDEXES\s*-\s*([A-Z]+\s+\d{4})/i)||[])[1]||'latest release',rows=html.match(/<tr\b[\s\S]*?<\/tr>/gi)||[],parsed=rows.map(parseRow).filter(Boolean),signals=[];
   for(const key of keys){const target=normalizeLabel(ITEMS[key].label);let row=parsed.find(x=>normalizeLabel(x.label)===target);if(!row)row=parsed.find(x=>normalizeLabel(x.label).startsWith(target));if(!row)continue;signals.push({key,label:ITEMS[key].label,groupCode:row.groupCode,itemCode:row.itemCode,yoy:row.yoy,latestMonth:row.latestMonth,period,source:'U.S. Bureau of Labor Statistics Producer Price Index',sourceUrl:PPI_URL,grade:'A'})}
   return{ok:true,category,period,signals,source:'U.S. Bureau of Labor Statistics Producer Price Index',sourceUrl:PPI_URL,note:'PPI measures prices received by domestic producers. It is useful as input-cost and market-pressure context, not as a local retail price or contractor quote.'};
 }catch(e){return{ok:false,signals:[],error:e?.name==='AbortError'?'BLS PPI request timed out':String(e?.message||e)}}finally{t.done()}
}
module.exports={fetchPpi,CATEGORY_KEYS,ITEMS};