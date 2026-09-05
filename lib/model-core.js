'use strict';

const MODEL_VERSION='EI-LCE-2026.09.2';
const TYPE_BASE={restaurant:28.6,retail:16.4,office:14.2,warehouse:8.4,industrial:11.8,multifamily:10.6,residential:7.8,other:13.2};
const MIX={
  restaurant:[.225,.09,.06,.335,.145,.145],retail:[.20,.055,.035,.34,.18,.19],office:[.19,.04,.035,.35,.20,.185],
  warehouse:[.15,.07,.025,.38,.19,.185],industrial:[.24,.11,.045,.29,.15,.165],multifamily:[.18,.09,.08,.31,.19,.15],
  residential:[.22,.12,.09,.24,.18,.15],other:[.20,.07,.045,.32,.18,.185]
};
const USE_GROWTH={restaurant:.006,retail:.002,office:.001,warehouse:0,industrial:.005,multifamily:.002,residential:.002,other:.002};
const USE_RISK={restaurant:8,retail:4,office:3,warehouse:1,industrial:7,multifamily:3,residential:2,other:4};
const REGIONS={
  northeast:{states:['ME','NH','VT','MA','RI','CT','NY','NJ','PA'],factor:1.07,growth:.045,label:'Northeast'},
  midwest:{states:['OH','IN','IL','MI','WI','IA','MN','MO','KS','NE','SD','ND'],factor:.94,growth:.034,label:'Midwest'},
  south:{states:['DE','MD','DC','VA','WV','NC','SC','GA','FL','KY','TN','MS','AL','OK','TX','AR','LA'],factor:.96,growth:.038,label:'South'},
  west:{states:['MT','ID','WY','CO','NM','AZ','UT','NV','WA','OR','CA','AK','HI'],factor:1.05,growth:.042,label:'West'}
};

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const finite=(v,fallback=null)=>Number.isFinite(Number(v))?Number(v):fallback;
const round100=n=>Math.round(n/100)*100;
const regionFor=state=>Object.values(REGIONS).find(r=>r.states.includes(String(state||'').toUpperCase()))||{factor:1,growth:.04,label:'U.S.'};
const normalizeUse=use=>TYPE_BASE[String(use||'').toLowerCase()]?String(use).toLowerCase():'other';

function validateCaseInput(input={}){
  const address=String(input.address||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,220);
  const use=normalizeUse(input.use);
  const sqft=clamp(finite(input.sqft,5000),300,10000000);
  const errors=[];
  if(address.length<6)errors.push('A complete U.S. property address is required.');
  if(!Number.isFinite(sqft)||sqft<300)errors.push('Square footage must be at least 300 ft².');
  return{ok:errors.length===0,errors,address,use,sqft};
}

function evidenceGrade({location,energy,risk}){
  const signals=[
    !!location?.verified,
    !!energy?.electricity,
    !!energy?.gas,
    !!energy?.intensity,
    !!risk?.available
  ];
  const backed=signals.filter(Boolean).length;
  const score=Math.round(backed/signals.length*100);
  const grade=score>=90?'A':score>=70?'B':score>=50?'C':'D';
  return{grade,score,backed,total:signals.length};
}

function hazardPressure(risk){
  const rating=String(risk?.composite?.rating||'').toLowerCase();
  if(rating.includes('very high'))return 10;
  if(rating.includes('relatively high')||rating==='high')return 7;
  if(rating.includes('moderate'))return 4;
  if(rating.includes('low'))return 1;
  return 0;
}

function estimateCase({address,use,sqft,location=null,energy=null,risk=null}){
  use=normalizeUse(use);sqft=clamp(finite(sqft,5000),300,10000000);
  const region=regionFor(location?.components?.state);
  const baseline=round100(TYPE_BASE[use]*sqft*region.factor);
  const mix=MIX[use];
  const categories={
    electric:round100(baseline*mix[0]),gas:round100(baseline*mix[1]),water:round100(baseline*mix[2]),
    tax:round100(baseline*mix[3]),insurance:round100(baseline*mix[4]),other:0
  };
  categories.other=baseline-Object.values(categories).reduce((a,b)=>a+b,0);

  let electricUsage=null,gasUsage=null;
  if(finite(energy?.electricity?.centsKwh)>0&&finite(energy?.intensity?.kwhSqft)>0){
    electricUsage=energy.intensity.kwhSqft*sqft;
    categories.electric=round100(electricUsage*(energy.electricity.centsKwh/100));
  }
  if(finite(energy?.gas?.dollarsMcf)>0&&finite(energy?.intensity?.gasCfSqft)>0){
    gasUsage=(energy.intensity.gasCfSqft*sqft)/1000;
    categories.gas=round100(gasUsage*energy.gas.dollarsMcf);
  }

  const total=Object.values(categories).reduce((a,b)=>a+b,0);
  const observedYoY=Number.isFinite(energy?.electricity?.yoy)?clamp(Number(energy.electricity.yoy),-.08,.18):null;
  const growth=clamp((region.growth+USE_GROWTH[use])*.72+(observedYoY==null?.04:Math.max(.01,observedYoY))*.28,.018,.085);
  const liveCount=(energy?.electricity?1:0)+(energy?.gas?1:0);
  const evidence=evidenceGrade({location,energy,risk});
  const uncertainty=location?.verified?(liveCount===2?.10:liveCount===1?.115:.13):.20;
  const hazardAdj=hazardPressure(risk);
  const riskScore=Math.round(clamp(43+((growth-.025)*430)+USE_RISK[use]+(uncertainty-.08)*80+hazardAdj,30,94));
  const cleanAddress=String(location?.label||address||'').trim();

  const evidenceLedger=[
    {layer:'Address',status:location?.verified?'verified':'unverified',source:location?.provider||'None',grade:location?.verified?'A':'D'},
    {layer:'Electricity price',status:energy?.electricity?'observed':'modeled',source:energy?.electricity?.source||'ExpenseIntel fallback',grade:energy?.electricity?.grade||'C'},
    {layer:'Natural gas price',status:energy?.gas?'observed':'modeled',source:energy?.gas?.source||'ExpenseIntel fallback',grade:energy?.gas?.grade||'C'},
    {layer:'Usage intensity',status:energy?.intensity?'benchmark':'modeled',source:energy?.intensity?.source||'ExpenseIntel fallback',grade:energy?.intensity?.grade||'C'},
    {layer:'Hazard context',status:risk?.available?'observed':'unavailable',source:risk?.source||'FEMA NRI',grade:risk?.available?'A':'D'},
    {layer:'Tax / insurance / water / other',status:'modeled',source:'ExpenseIntel location-cost assumptions',grade:'C'}
  ];

  return{
    modelVersion:MODEL_VERSION,
    generatedAt:new Date().toISOString(),
    address:cleanAddress||String(address||'Unresolved location'),use,sqft,location,energy,risk,
    total,perSqft:total/sqft,categories,electricUsage,gasUsage,
    forecast:{growth,next12:round100(total*(1+growth)),month36:round100(total*Math.pow(1+growth,3))},
    range:{low:round100(total*(1-uncertainty)),high:round100(total*(1+uncertainty)),uncertainty},
    riskScore,riskLabel:riskScore>=72?'Elevated':riskScore>=58?'Moderate':'Lower',region:region.label,
    evidence,evidenceLedger,
    methodology:{
      classification:'Mixed-source decision model',
      authoritative:['Verified address','EIA price signals where returned','FEMA NRI where returned'],
      modeled:['Usage benchmarks','Property tax','Insurance','Water/sewer','Waste/other unless user supplied'],
      warning:'This is a decision-support estimate, not a utility quote, appraisal, insurance quote, tax bill, contractor bid, or lending decision.'
    }
  };
}

module.exports={MODEL_VERSION,TYPE_BASE,MIX,validateCaseInput,estimateCase,evidenceGrade,normalizeUse,clamp};
