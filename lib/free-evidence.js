const CENSUS_DATASET='2024/acs/acs5';
const CENSUS_BASE=`https://api.census.gov/data/${CENSUS_DATASET}`;

function clean(v,max=5000){return String(v||'').replace(/\0/g,'').replace(/\s+/g,' ').trim().slice(0,max)}
function finite(v){const n=Number(String(v??'').replace(/[$,%\s,]/g,''));return Number.isFinite(n)?n:null}
function snippet(text,index,length){const s=clean(text,20000),a=Math.max(0,index-34),b=Math.min(s.length,index+length+54);return s.slice(a,b).trim()}
function firstMatch(text,patterns,parser){for(const pattern of patterns){const m=pattern.exec(text);if(m){const value=parser(m);if(value!=null)return{value,matchedText:snippet(text,m.index,m[0].length)}}}return null}
function moneyMatch(text,labels){const label=labels.join('|');return firstMatch(text,[new RegExp(`(?:${label})\\s*(?:is|of|=|:)?\\s*\\$\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{1,2})?|[0-9]{3,7}(?:\\.[0-9]{1,2})?)`,'i')],m=>{const n=finite(m[1]);return n!=null&&n>=0?n:null})}
function pctMatch(text,labels,max=100){const label=labels.join('|');return firstMatch(text,[new RegExp(`(?:${label})\\s*(?:is|of|=|:)?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%`,'i')],m=>{const n=finite(m[1]);return n!=null&&n>=0&&n<=max?n:null})}
function numberMatch(text,patterns,min,max){return firstMatch(text,patterns,m=>{const n=finite(m[1]);return n!=null&&n>=min&&n<=max?n:null})}
function push(items,key,label,hit,unit='USD'){if(!hit)return;items.push({key,label,value:hit.value,unit,source:'User-supplied quote / listing text',tier:'verified',matchedText:hit.matchedText})}

function extractStructuredTerms(raw){
  const text=clean(raw,20000),items=[];
  if(!text)return{ok:true,kind:'unknown',items,fields:{},count:0,source:'User-supplied quote / listing text'};
  const isLease=/\bleas(?:e|ed|ing)\b/i.test(text)||/money\s*factor|residual|due\s+at\s+signing|drive[- ]?off/i.test(text);
  const isVehicle=isLease||/\b(vin|msrp|vehicle|car|truck|suv|sedan|porsche|bmw|mercedes|audi|ford|toyota|honda|chevrolet|tesla)\b/i.test(text);

  push(items,'msrp','MSRP',moneyMatch(text,['msrp','manufacturer(?:’|\'|s)? suggested retail price','sticker price']));
  push(items,'sellingPrice','Selling price',moneyMatch(text,['selling price','sale price','negotiated price','agreed(?: upon)? value','vehicle price']));
  push(items,'adjustedCapCost','Adjusted cap cost',moneyMatch(text,['adjusted cap(?:italized)? cost','net cap(?:italized)? cost','capitalized cost']));
  push(items,'monthlyPayment','Monthly payment',moneyMatch(text,['monthly payment','lease payment','payment per month','monthly lease payment']));
  push(items,'dueAtSigning','Due at signing',moneyMatch(text,['due at signing','amount due at signing','cash due at signing','drive[- ]?off','drive off','total due at signing']));
  push(items,'downPayment','Down payment',moneyMatch(text,['down payment','cash down','cap cost reduction']));
  push(items,'securityDeposit','Security deposit',moneyMatch(text,['security deposit']));
  push(items,'acquisitionFee','Acquisition fee',moneyMatch(text,['acquisition fee','bank fee']));
  push(items,'dispositionFee','Disposition fee',moneyMatch(text,['disposition fee','lease disposition fee']));
  push(items,'docFee','Documentation fee',moneyMatch(text,['documentation fee','doc fee','dealer doc fee']));
  push(items,'registrationFee','Registration / title fee',moneyMatch(text,['registration fee','title fee','registration and title','title and registration']));
  push(items,'taxAmount','Tax amount',moneyMatch(text,['sales tax','tax amount','taxes']));
  push(items,'rebate','Rebate / incentive',moneyMatch(text,['rebate','incentive','lease cash','customer cash','bonus cash']));
  push(items,'tradeIn','Trade-in value',moneyMatch(text,['trade[- ]?in(?: allowance| value)?','trade value']));
  push(items,'totalPayments','Total of payments',moneyMatch(text,['total of payments','total lease payments','total payments']));
  push(items,'quoteTotal','Quote total',moneyMatch(text,['grand total','estimate total','proposal total','quote total','project total']));
  push(items,'labor','Labor',moneyMatch(text,['labor(?: total| cost)?']));
  push(items,'materials','Materials',moneyMatch(text,['materials?(?: total| cost)?']));
  push(items,'permitFees','Permit fees',moneyMatch(text,['permit fees?','permits?']));
  push(items,'deposit','Deposit',moneyMatch(text,['deposit']));

  const residualPct=pctMatch(text,['residual(?: value)?']);push(items,'residualPct','Residual',residualPct,'percent');
  const residualValue=moneyMatch(text,['residual(?: value)?']);if(!residualPct)push(items,'residualValue','Residual value',residualValue);
  push(items,'aprPct','APR',pctMatch(text,['apr','annual percentage rate','interest rate'],40),'percent');
  push(items,'taxRate','Tax rate',pctMatch(text,['sales tax rate','tax rate'],30),'percent');
  push(items,'contingencyPct','Contingency',pctMatch(text,['contingency'],100),'percent');

  const moneyFactor=numberMatch(text,[/(?:money\s*factor|\bmf\b)\s*(?:is|=|:)?\s*(0\.\d{3,6})/i],0,.02);push(items,'moneyFactor','Money factor',moneyFactor,'factor');
  const term=numberMatch(text,[/(?:lease\s+term|term(?: length)?|loan\s+term)\s*(?:is|=|:)?\s*(\d{1,3})\s*(?:months?|mos?\.?)/i,/\b(\d{2,3})[- ]month\b/i],1,180);push(items,'termMonths','Term',term,'months');
  const annualMileage=numberMatch(text,[/(?:annual mileage|mileage allowance|miles per year|miles\/year|mi\/yr)\s*(?:is|=|:)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{4,6})/i,/\b([0-9]{1,3}(?:,[0-9]{3})*)\s*(?:miles?|mi)\s*(?:per|\/)\s*year\b/i],1000,100000);push(items,'annualMileage','Annual mileage',annualMileage,'miles/year');
  const warranty=numberMatch(text,[/(?:warranty|coverage)\s*(?:is|=|:)?\s*(\d{1,2})\s*(?:years?|yrs?\.?)/i],1,20);push(items,'warrantyYears','Warranty',warranty,'years');

  const fields=Object.fromEntries(items.map(x=>[x.key,x.value]));
  const coreLease=['monthlyPayment','termMonths','dueAtSigning','annualMileage','residualPct','moneyFactor'];
  const leaseKnown=coreLease.filter(k=>fields[k]!=null).length;
  const kind=isLease?'lease':isVehicle?'vehicle':items.some(x=>['labor','materials','permitFees','quoteTotal'].includes(x.key))?'project-quote':'general';
  return{ok:true,kind,items,fields,count:items.length,leaseCompleteness:isLease?{known:leaseKnown,total:coreLease.length,pct:Math.round(leaseKnown/coreLease.length*100)}:null,source:'User-supplied quote / listing text',note:'Only explicitly labeled values are promoted to verified terms. Unlabeled numbers are ignored.'};
}

function zipFrom(text){return String(text||'').match(/\b(\d{5})(?:-\d{4})?\b/)?.[1]||''}
async function fetchCensusContext(location='',text=''){
  const zip=zipFrom(`${location} ${text}`);if(!zip)return{ok:false,available:false,note:'Add a 5-digit ZIP code for free Census locality context.'};
  const vars=['NAME','B19013_001E','B25077_001E','B25064_001E','B25001_001E','B25002_003E'];
  const url=`${CENSUS_BASE}?get=${vars.join(',')}&for=zip%20code%20tabulation%20area:${encodeURIComponent(zip)}`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 (+https://www.expenseintel.com)'}});if(!r.ok)throw new Error(`Census ${r.status}`);const d=await r.json();if(!Array.isArray(d)||d.length<2)return{ok:false,available:false,note:'Census did not return locality data for that ZIP.'};
    const keys=d[0],row=d[1],obj=Object.fromEntries(keys.map((k,i)=>[k,row[i]])),safe=v=>{const n=finite(v);return n!=null&&n>=0?n:null},units=safe(obj.B25001_001E),vacant=safe(obj.B25002_003E);
    return{ok:true,available:true,zip,name:obj.NAME||`ZIP ${zip}`,medianHouseholdIncome:safe(obj.B19013_001E),medianHomeValue:safe(obj.B25077_001E),medianGrossRent:safe(obj.B25064_001E),housingUnits:units,vacantUnits:vacant,vacancyRate:units&&vacant!=null?vacant/units:null,source:'U.S. Census Bureau American Community Survey 5-year estimates',sourceUrl:'https://api.census.gov/data/2024/acs/acs5.html',period:'2024 ACS 5-year',grade:'A',retrievedAt:new Date().toISOString(),note:'ZIP-level socioeconomic and housing context only. It is not a property appraisal, rent quote, or transaction comparable.'};
  }catch(e){return{ok:false,available:false,error:String(e?.message||e),note:'Free Census locality context was temporarily unavailable.'}}finally{clearTimeout(timer)}
}

module.exports={extractStructuredTerms,fetchCensusContext,zipFrom};