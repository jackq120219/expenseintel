const ELECTRIC_URL = 'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=table_5_06_b';
const GAS_URLS = {
  residential: 'https://www.eia.gov/dnav/ng/NG_PRI_SUM_A_EPG0_PRS_DMCF_M.htm',
  commercial: 'https://www.eia.gov/dnav/ng/NG_PRI_SUM_A_EPG0_PCS_DMCF_M.htm',
  industrial: 'https://www.eia.gov/dnav/ng/NG_PRI_SUM_A_EPG0_PIN_DMCF_M.htm'
};

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
};

// EIA CBECS 2018-based commercial building benchmarks. These are usage benchmarks,
// not property-specific meter reads. Residential/multifamily and industrial are
// intentionally marked as modeled bridges until RECS/MECS layers are added.
const INTENSITY = {
  restaurant: { kwhSqft: 43.8, gasCfSqft: 147.6, source:'EIA CBECS 2018 · food service', grade:'B' },
  retail: { kwhSqft: 13.2, gasCfSqft: 24.0, source:'EIA CBECS 2018 · retail benchmark', grade:'B' },
  office: { kwhSqft: 13.6, gasCfSqft: 14.5, source:'EIA CBECS 2018 · office', grade:'B' },
  warehouse: { kwhSqft: 5.5, gasCfSqft: 11.0, source:'EIA CBECS 2018 · warehouse/storage', grade:'B' },
  industrial: { kwhSqft: 18.0, gasCfSqft: 55.0, source:'ExpenseIntel industrial bridge · MECS layer pending', grade:'C' },
  multifamily: { kwhSqft: 8.5, gasCfSqft: 32.0, source:'ExpenseIntel residential bridge · RECS layer pending', grade:'C' },
  residential: { kwhSqft: 7.2, gasCfSqft: 38.0, source:'ExpenseIntel residential bridge · RECS layer pending', grade:'C' },
  other: { kwhSqft: 12.6, gasCfSqft: 32.7, source:'EIA CBECS 2018 · all commercial buildings', grade:'B' }
};

function send(res,status,payload,cache=true){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',cache?'public, s-maxage=21600, stale-while-revalidate=86400':'no-store');
  res.end(JSON.stringify(payload));
}
function clean(v,max=80){return String(v||'').replace(/[^a-z0-9 .,'&()-]/gi,' ').replace(/\s+/g,' ').trim().slice(0,max)}
function sectorFor(use){
  if(use==='residential'||use==='multifamily') return 'residential';
  if(use==='industrial') return 'industrial';
  return 'commercial';
}
function strip(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
function escapeRx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function findRow(html,stateName){
  const rows=html.match(/<tr\b[\s\S]*?<\/tr>/gi)||[];
  const exact=new RegExp(`(^|\\s)${escapeRx(stateName)}(\\s|$)`,'i');
  return rows.find(row=>exact.test(strip(row)))||null;
}
function cells(row){
  return (row?.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)||[]).map(strip).filter(Boolean);
}
function numeric(v){
  const n=Number(String(v||'').replace(/[$,%]/g,''));
  return Number.isFinite(n)?n:null;
}
function parseElectric(row,sector){
  const vals=cells(row);
  const numbers=vals.slice(1).map(numeric);
  const index=sector==='residential'?0:sector==='commercial'?2:4;
  const current=numbers[index];
  const prior=numbers[index+1];
  if(current==null) return null;
  return { centsKwh:current, priorCentsKwh:prior, yoy:prior?current/prior-1:null };
}
function parseGas(row){
  const vals=cells(row).slice(1);
  const monthly=vals.slice(0,8).map(numeric);
  let latest=null, latestIndex=-1;
  for(let i=monthly.length-1;i>=0;i--){if(monthly[i]!=null){latest=monthly[i];latestIndex=i;break}}
  if(latest==null) return null;
  const labels=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
  return { dollarsMcf:latest, period:`${labels[latestIndex]||'Latest'} 2026` };
}
async function fetchText(url,signal){
  const r=await fetch(url,{signal,headers:{'User-Agent':'ExpenseIntel/1.0 (+https://expenseintel.com)'}});
  if(!r.ok) throw new Error(`upstream ${r.status}`);
  return r.text();
}

module.exports=async function handler(req,res){
  if(req.method!=='GET') return send(res,405,{ok:false,error:'Method not allowed'},false);
  const state=clean(req.query?.state,2).toUpperCase();
  const use=clean(req.query?.use,30).toLowerCase();
  const stateName=STATE_NAMES[state];
  if(!stateName) return send(res,400,{ok:false,error:'Valid U.S. state required.'},false);
  const sector=sectorFor(use);
  const intensity=INTENSITY[use]||INTENSITY.other;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const [electricHtml,gasHtml]=await Promise.all([
      fetchText(ELECTRIC_URL,controller.signal),
      fetchText(GAS_URLS[sector],controller.signal).catch(()=>null)
    ]);
    const eRow=findRow(electricHtml,stateName);
    const electricity=parseElectric(eRow,sector);
    const gas=gasHtml?parseGas(findRow(gasHtml,stateName)):null;
    return send(res,200,{
      ok:true,state,stateName,sector,
      electricity:electricity?{
        ...electricity,
        source:'U.S. EIA · Electric Power Monthly Table 5.6.B',
        period:'2026 YTD through June',
        grade:'A'
      }:null,
      gas:gas?{
        ...gas,
        source:'U.S. EIA · Natural Gas Monthly',
        grade:'A'
      }:null,
      intensity:{...intensity},
      methodology:{
        electricity:'State retail price × benchmark kWh/ft² × floor area',
        gas:'State end-use price × benchmark cubic feet/ft² × floor area',
        warning:'State averages and national building benchmarks are not property-specific tariffs or meter usage.'
      }
    });
  }catch(error){
    return send(res,error?.name==='AbortError'?504:502,{ok:false,error:'Energy data is temporarily unavailable.'},false);
  }finally{clearTimeout(timer)}
};