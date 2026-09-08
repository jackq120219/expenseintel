const SERIES={
  property:[
    {id:'MORTGAGE30US',label:'30-year fixed mortgage rate',unit:'%',source:'Freddie Mac via FRED',url:'https://fred.stlouisfed.org/series/MORTGAGE30US',kind:'financing'},
    {id:'CPIAUCSL',label:'Consumer price index',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/CPIAUCSL',kind:'inflation'}
  ],
  vehicle:[
    {id:'CUUR0000SETA02',label:'Used cars & trucks CPI',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/CUUR0000SETA02',kind:'market'},
    {id:'CUUR0000SETA01',label:'New vehicles CPI',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/CUUR0000SETA01',kind:'market'}
  ],
  home:[
    {id:'PPIACO',label:'Producer price index — all commodities',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/PPIACO',kind:'input-cost'},
    {id:'CPIAUCSL',label:'Consumer price index',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/CPIAUCSL',kind:'inflation'}
  ],
  equipment:[
    {id:'PPIACO',label:'Producer price index — all commodities',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/PPIACO',kind:'input-cost'}
  ],
  'business-project':[
    {id:'PPIACO',label:'Producer price index — all commodities',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/PPIACO',kind:'input-cost'},
    {id:'CPIAUCSL',label:'Consumer price index',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/CPIAUCSL',kind:'inflation'}
  ],
  general:[
    {id:'CPIAUCSL',label:'Consumer price index',unit:'index',source:'U.S. Bureau of Labor Statistics via FRED',url:'https://fred.stlouisfed.org/series/CPIAUCSL',kind:'inflation'}
  ]
};
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',status===200?'public, s-maxage=1800, stale-while-revalidate=21600':'no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(payload))}
function cleanCategory(v){v=String(v||'').toLowerCase();if(v.includes('property'))return'property';if(v==='home'||v.includes('repair')||v.includes('renov'))return'home';if(v.includes('vehicle')||v.includes('car')||v.includes('truck'))return'vehicle';if(v.includes('equipment'))return'equipment';if(v.includes('business')||v.includes('project'))return'business-project';return'general'}
function parseCsv(text){const lines=String(text||'').trim().split(/\r?\n/);if(lines.length<2)return null;const points=[];for(let i=1;i<lines.length;i++){const row=lines[i].split(',');const value=Number(row[row.length-1]);const date=row[0];if(Number.isFinite(value)&&date&&row[row.length-1]!=='.')points.push({date,value,time:new Date(date).getTime()})}if(!points.length)return null;const current=points[points.length-1];const target=current.time-(365.25*24*60*60*1000);let prior=points[0];for(const point of points){if(Math.abs(point.time-target)<Math.abs(prior.time-target))prior=point}const change=prior&&prior.value!==0?((current.value-prior.value)/Math.abs(prior.value))*100:null;return{current,prior,change}}
async function fred(series){const c=new AbortController(),timer=setTimeout(()=>c.abort(),5000);try{const r=await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series.id)}`,{signal:c.signal,headers:{'User-Agent':'ExpenseIntel/1.0 (+https://www.expenseintel.com)'}});if(!r.ok)throw new Error(`FRED ${r.status}`);const parsed=parseCsv(await r.text());if(!parsed)throw new Error('No current observation');const ageDays=Math.max(0,Math.round((Date.now()-parsed.current.time)/86400000));return{...series,date:parsed.current.date,value:parsed.current.value,status:'connected',observedAt:parsed.current.date,fetchedAt:new Date().toISOString(),priorObservedAt:parsed.prior?.date||null,priorValue:parsed.prior?.value??null,changePct:Number.isFinite(parsed.change)?Math.round(parsed.change*10)/10:null,ageDays,freshness:ageDays<=45?'current':ageDays<=120?'aging':'stale'}}finally{clearTimeout(timer)}}
module.exports=async function handler(req,res){if(req.method!=='GET')return send(res,405,{ok:false,error:'Method not allowed'});const category=cleanCategory(req.query?.category);const wanted=SERIES[category]||SERIES.general;const settled=await Promise.allSettled(wanted.map(fred));const evidence=settled.filter(x=>x.status==='fulfilled').map(x=>x.value);const failures=settled.filter(x=>x.status==='rejected').length;const currentCount=evidence.filter(x=>x.freshness==='current').length;const quality=evidence.length===0?'unavailable':failures?'partial':currentCount===evidence.length?'strong':'mixed';return send(res,200,{ok:true,category,evidence,degraded:failures>0,failures,quality,connected:evidence.length,requested:wanted.length,note:evidence.length?'Connected public context can strengthen financing, market and inflation assumptions, but it is supporting evidence—not a transaction-level comparable or executable quote.':'Public evidence temporarily unavailable; do not promote modeled values to verified evidence.'})};