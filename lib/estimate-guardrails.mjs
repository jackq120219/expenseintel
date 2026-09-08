export const TIERS=Object.freeze({VERIFIED:4,BENCHMARK:3,MODELED:2,OPEN:1});

export function tierName(n){return n===4?'verified':n===3?'benchmark':n===2?'modeled':'open'}
export function clamp(n,a,b){return Math.max(a,Math.min(b,Number(n)||0))}
export function meaningfulStep(n){n=Math.abs(Number(n)||0);return n>=500000?10000:n>=200000?5000:n>=100000?2500:n>=50000?1000:n>=10000?500:n>=2500?100:50}
export function meaningfulRound(n){const step=meaningfulStep(n);return Math.round((Number(n)||0)/step)*step}
export function ageTier(ageDays,{benchmarkMax=180,contextMax=730}={}){if(ageDays==null||!Number.isFinite(Number(ageDays)))return'unknown';if(ageDays<=benchmarkMax)return'fresh';if(ageDays<=contextMax)return'context';return'stale'}
export function rankSource({verified=false,reliabilityCleared=false,specificity='generic',ageDays=null}={}){
  if(verified)return TIERS.VERIFIED;
  const age=ageTier(ageDays);
  if(reliabilityCleared&&['exact','model','trim','local','scope'].includes(specificity)&&age!=='stale')return TIERS.BENCHMARK;
  if(reliabilityCleared&&age!=='stale')return TIERS.MODELED;
  return TIERS.OPEN;
}
export function allowPointEstimate({tier=TIERS.OPEN,sampleSize=0,conflictPct=0,specificity='generic',exactInput=false}={}){
  if(exactInput||tier===TIERS.VERIFIED)return true;
  if(tier!==TIERS.BENCHMARK)return false;
  if(Number(sampleSize)>0&&Number(sampleSize)<5)return false;
  if(Number(conflictPct)>.18)return false;
  return ['exact','model','trim','local','scope'].includes(specificity);
}
export function relativeGap(a,b){a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b)||a===0||b===0)return null;return Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b))}
export function contradiction(a,b,{threshold=.22}={}){const gap=relativeGap(a,b);return gap!=null&&gap>threshold?{conflict:true,gap}: {conflict:false,gap}}
export function rangeAround(center,{modeledShare=.25,minPct=.025,maxPct=.35}={}){center=Math.max(0,Number(center)||0);const pct=clamp(Math.max(minPct,Number(modeledShare)||0),minPct,maxPct);return{low:meaningfulRound(center*(1-pct)),center:meaningfulRound(center),high:meaningfulRound(center*(1+pct)),pct}}
export function leaseOpportunity({payment,term,due=0,directBenchmark=null,benchmarkSpecificity='generic',benchmarkTier=TIERS.OPEN}={}){
  payment=Math.max(0,Number(payment)||0);term=Math.max(1,Math.round(Number(term)||1));due=Math.max(0,Number(due)||0);
  const benchmarkUsable=Number(directBenchmark)>0&&benchmarkTier>=TIERS.BENCHMARK&&['exact','model','trim','local'].includes(benchmarkSpecificity);
  const target=benchmarkUsable?Math.min(payment,Math.max(Number(directBenchmark),meaningfulRound(payment*.95))):meaningfulRound(payment*.97);
  const economicSavings=Math.max(0,(payment-target)*term);
  const cashPreserved=Math.max(0,due-500);
  return{mode:benchmarkUsable?'benchmark':'sensitivity',targetPayment:target,economicSavings,cashPreserved,benchmarkUsable};
}
export function sanityCheck({category='other',price=null,commitment=null,savings=null,recovery=null,annualInsurance=null,annualMaintenance=null,monthlyPayment=null,term=null,due=null}={}){
  const issues=[];const p=Number(price),c=Number(commitment),s=Number(savings),r=Number(recovery),ins=Number(annualInsurance),maint=Number(annualMaintenance),pay=Number(monthlyPayment),t=Number(term),d=Number(due);
  if(Number.isFinite(c)&&c<0)issues.push('negative commitment');
  if(Number.isFinite(s)&&s<0)issues.push('negative savings');
  if(Number.isFinite(c)&&Number.isFinite(s)&&c>0&&s>c*.75)issues.push('savings exceeds 75% of commitment');
  if(Number.isFinite(r)&&Number.isFinite(p)&&p>0&&r>p*1.5)issues.push('recovery exceeds 150% of price without an appreciation case');
  if(category==='vehicle'&&Number.isFinite(p)&&p>0){if(Number.isFinite(ins)&&ins>p*.20)issues.push('annual insurance exceeds 20% of vehicle price');if(Number.isFinite(maint)&&maint>p*.20)issues.push('annual maintenance exceeds 20% of vehicle price');if(Number.isFinite(d)&&d>p*.60)issues.push('upfront cash exceeds 60% of vehicle price');}
  if(Number.isFinite(pay)&&pay<0)issues.push('negative payment');
  if(Number.isFinite(t)&&(t<1||t>180))issues.push('term outside plausible analysis bounds');
  return issues;
}
export function planningConfidence({verified=0,connected=0,modeled=0,open=0,conflicts=0,stale=0}={}){
  let score=42+Number(verified)*11+Number(connected)*5-Number(modeled)*4-Number(open)*7-Number(conflicts)*14-Number(stale)*5;
  if(open>=4)score=Math.min(score,70);if(conflicts>0)score=Math.min(score,74);if(verified===0)score=Math.min(score,78);
  return Math.round(clamp(score,20,96));
}
