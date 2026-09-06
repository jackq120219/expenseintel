const {gather}=require('../lib/check-intel');
const {fetchPpi}=require('../lib/ppi-intel');
function send(res,status,payload,cache=false){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',cache?'public, s-maxage=1800, stale-while-revalidate=7200':'no-store');res.end(JSON.stringify(payload))}
function refreshLabel(check){if(!check)return;check.score=Math.min(92,Math.max(0,Number(check.score)||0));check.label=check.score>=78?'STRONG CONTEXT':check.score>=62?'USEFUL, NOT COMPLETE':'NEEDS MORE EVIDENCE';check.tone=check.score>=78?'good':check.score>=62?'mid':'neutral'}
function ppiRank(signal,query,category){const q=String(query||'').toLowerCase(),k=signal.key||'',label=String(signal.label||'').toLowerCase();let score=0;const hit=(rx,keys,points=100)=>{if(rx.test(q)&&keys.includes(k))score+=points};hit(/hvac|air condition|heat pump|ac unit|cooling/,['hvac','heating','wiring','electrical_machinery']);hit(/furnace|boiler|heating/,['heating','hvac','plumbing']);hit(/roof|shingle|siding/,['roofing','lumber','softwood_lumber']);hit(/plumb|pipe|fixture|water heater/,['plumbing','heating']);hit(/electric|panel|switchgear|wiring/,['wiring','electrical_machinery']);hit(/paint/,['paint']);hit(/concrete|foundation|slab/,['concrete','cement','sand_gravel']);hit(/lumber|wood|framing/,['lumber','softwood_lumber','plywood']);hit(/steel|structural|metal/,['steel','structural_metal']);hit(/warehouse/,['warehouse_building','construction','steel','concrete']);hit(/industrial|factory|manufactur/,['industrial_building','general_machinery','electrical_machinery','steel']);hit(/machine|cnc|forklift|equipment|generator|compressor/,['general_machinery','electrical_machinery','machinery_repair','equipment_rental']);hit(/insurance/,['property_insurance']);hit(/property management|hoa/,['residential_property_mgmt','nonres_property_mgmt']);if(category==='vehicle'&&k==='vehicle_repair_service')score+=80;if(category==='property'&&['property_insurance','residential_property_mgmt'].includes(k))score+=55;if(category==='home'&&k==='construction')score+=15;if(category==='business-project'&&k==='construction')score+=25;if(category==='equipment'&&['general_machinery','electrical_machinery'].includes(k))score+=30;if(q.includes(label))score+=120;return score}
module.exports=async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Method not allowed'});
  let body=req.method==='GET'?(req.query||{}):req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(_e){body={}}}body=body||{};
  const text=String(body.text||'').slice(0,5000),url=String(body.url||'').slice(0,1600),category=String(body.category||'auto').slice(0,40),location=String(body.location||'').slice(0,180),price=body.price;
  if(!text.trim()&&!url.trim())return send(res,400,{ok:false,error:'Paste a link, quote/listing text, or describe what you are considering.'});
  try{
    const out=await gather({text,url,category,price,location});
    if(['home','property','equipment','business-project','vehicle'].includes(out.detectedCategory)){
      const ppi=await fetchPpi(out.detectedCategory);
      if(ppi.ok&&ppi.signals?.length){
        const seen=new Set((out.evidence.signals||[]).map(x=>x.label));
        const query=[text,out.page?.title,out.page?.description].filter(Boolean).join(' ');
        const add=ppi.signals.filter(x=>!seen.has(x.label)).map((x,i)=>({x,i,score:ppiRank(x,query,out.detectedCategory)})).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,4).map(({x})=>({label:x.label,value:x.yoy,unit:'% YoY',period:x.period,source:x.source,grade:'A',latestMonth:x.latestMonth}));
        out.evidence.signals.push(...add);out.evidence.sourceCount=new Set(out.evidence.signals.map(x=>x.source).filter(Boolean)).size;out.evidence.producerPriceContext={period:ppi.period,note:ppi.note,signalCount:add.length};if(add.length){out.check.score+=4;out.check.signals.push('BLS producer-cost pressure connected.');refreshLabel(out.check)}
      }
    }
    return send(res,200,out,req.method==='GET'&&!url)
  }catch(e){return send(res,502,{ok:false,error:String(e?.message||e||'ExpenseIntel Check could not complete.')})}
};