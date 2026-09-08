import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {TIERS,tierName,meaningfulRound,ageTier,rankSource,allowPointEstimate,contradiction,rangeAround,leaseOpportunity,sanityCheck,planningConfidence} from '../lib/estimate-guardrails.mjs';

let checks=0;const ok=(cond,msg)=>{checks++;assert.ok(cond,msg)};const eq=(a,b,msg)=>{checks++;assert.equal(a,b,msg)};

// Source hierarchy / freshness
for(const [cfg,expected] of [
  [{verified:true},TIERS.VERIFIED],
  [{reliabilityCleared:true,specificity:'model',ageDays:30},TIERS.BENCHMARK],
  [{reliabilityCleared:true,specificity:'generic',ageDays:30},TIERS.MODELED],
  [{reliabilityCleared:true,specificity:'model',ageDays:1000},TIERS.OPEN],
  [{reliabilityCleared:false,specificity:'model',ageDays:10},TIERS.OPEN]
]) eq(rankSource(cfg),expected,`source tier ${JSON.stringify(cfg)}`);
eq(tierName(TIERS.BENCHMARK),'benchmark');eq(ageTier(30),'fresh');eq(ageTier(365),'context');eq(ageTier(900),'stale');

// Point-estimate discipline
ok(allowPointEstimate({tier:TIERS.VERIFIED,exactInput:true}),'verified input can be exact');
ok(allowPointEstimate({tier:TIERS.BENCHMARK,sampleSize:20,conflictPct:.05,specificity:'model'}),'specific cleared benchmark can be exact');
ok(!allowPointEstimate({tier:TIERS.MODELED,specificity:'model'}),'modeled values must not masquerade as exact');
ok(!allowPointEstimate({tier:TIERS.BENCHMARK,sampleSize:3,conflictPct:.05,specificity:'model'}),'tiny samples cannot issue point verdicts');
ok(!allowPointEstimate({tier:TIERS.BENCHMARK,sampleSize:20,conflictPct:.35,specificity:'model'}),'material source conflicts block point verdict');
ok(!allowPointEstimate({tier:TIERS.BENCHMARK,sampleSize:20,conflictPct:.05,specificity:'generic'}),'generic benchmark cannot become item-specific point estimate');

// Contradiction behavior
ok(contradiction(100,104).conflict===false,'4% gap is not a contradiction');
ok(contradiction(100,140).conflict===true,'29%+ gap is a contradiction');
ok(contradiction(235800,300000,{threshold:.15}).conflict===true,'GT3 base vs materially higher same-metric claim should be surfaced if treated as same scope');

// Precision discipline
for(const [v,expected] of [[87465,87000],[392810,395000],[12345,12500],[2450,2450],[782345,780000]]) eq(meaningfulRound(v),expected,`meaningful round ${v}`);
const r=rangeAround(87465,{modeledShare:.20});ok(r.low<r.center&&r.high>r.center,'modeled planning center has a range');ok(r.center%500===0,'modeled planning center is rounded');

// Lease opportunity: generic averages must never create huge item-specific savings
let lease=leaseOpportunity({payment:2030,term:36,due:6000,directBenchmark:619,benchmarkSpecificity:'generic',benchmarkTier:TIERS.MODELED});
eq(lease.mode,'sensitivity','generic national lease average is context only');ok(lease.economicSavings<6000,'generic context cannot manufacture giant savings');eq(lease.cashPreserved,5500,'drive-off reduction is liquidity, not savings');
lease=leaseOpportunity({payment:2400,term:36,due:2500,directBenchmark:2135,benchmarkSpecificity:'model',benchmarkTier:TIERS.BENCHMARK});
eq(lease.mode,'benchmark','specific cleared benchmark may support sensitivity');ok(lease.targetPayment>=2135,'optimizer cannot undercut its model-specific benchmark without evidence');
lease=leaseOpportunity({payment:1900,term:36,due:0,directBenchmark:2135,benchmarkSpecificity:'model',benchmarkTier:TIERS.BENCHMARK});
eq(lease.economicSavings,0,'already-below benchmark offer does not invent savings');

// Sanity invariants
ok(sanityCheck({category:'vehicle',price:235800,commitment:100000,savings:90000}).includes('savings exceeds 75% of commitment'),'extreme savings flagged');
ok(sanityCheck({category:'vehicle',price:235800,recovery:400000}).length>0,'implausible recovery flagged');
ok(sanityCheck({category:'vehicle',price:235800,annualInsurance:60000}).length>0,'implausible insurance flagged');
ok(sanityCheck({category:'vehicle',price:235800,annualMaintenance:60000}).length>0,'implausible maintenance flagged');
ok(sanityCheck({category:'vehicle',price:235800,due:160000}).length>0,'implausible upfront amount flagged');
eq(sanityCheck({category:'vehicle',price:235800,recovery:150000,annualInsurance:9000,annualMaintenance:5000,commitment:300000,savings:12000}).length,0,'plausible vehicle economics pass');

// Golden decision classes: every sparse decision must keep critical unknowns open.
const golden=[
  ['2026 Porsche 911 GT3 purchase',0,5,4,4,1],
  ['2026 BMW X5 lease',0,5,4,4,0],
  ['Chicago condo no address',0,4,5,4,0],
  ['HVAC quote with no scope comps',1,3,4,3,0],
  ['CNC machine no model',0,3,5,4,0],
  ['Software migration no contract',1,2,4,4,0],
  ['College program no aid package',1,3,4,4,0],
  ['Trip with no dates',1,2,4,4,0],
  ['Warehouse project no utility confirmation',1,4,5,5,0],
  ['Used car VIN supplied',3,5,2,2,0],
  ['Property with appraisal and comps',3,5,2,1,0],
  ['Contractor quote with 20 scope-matched comps',2,5,2,1,0]
];
for(const [name,verified,connected,modeled,open,conflicts] of golden){const c=planningConfidence({verified,connected,modeled,open,conflicts});ok(c>=20&&c<=96,`${name}: confidence bounded`);if(open>=4)ok(c<=70,`${name}: many unknowns cap confidence`);if(verified===0)ok(c<=78,`${name}: no verified input caps confidence`)}

// Broad stress matrix
for(let verified=0;verified<=4;verified++)for(let connected=0;connected<=7;connected++)for(let open=0;open<=6;open++){
  const c=planningConfidence({verified,connected,modeled:Math.max(0,5-verified),open,conflicts:open>5?1:0});ok(c>=20&&c<=96,'confidence never escapes bounds');if(open>=4)ok(c<=70,'open-data cap always holds');
}

// Static regression checks against known historical failure modes.
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shock=read('shock/index.html'),fair=read('fairprice/fairprice-guard.js'),trueCost=read('truecost/index.html'),clarity=read('clarity-pass.js'),integrity=read('estimate-integrity-v12.js'),vehicle=read('vehicle-sanity-v11.js');
ok(!/id="sh-price"[^>]+value="30000"/.test(shock),'Cost Shock may not ship a fake sticker price');
ok(!/id="sh-monthly"[^>]+value="300"/.test(shock),'Cost Shock may not ship fake monthly burden');
ok(/ADD A BENCHMARK/.test(fair),'Fair Price must refuse verdict without benchmark');
ok(/Enter the actual price/.test(trueCost),'TrueCost must require actual price');
ok(/loadEstimateIntegrity/.test(clarity),'global estimate-integrity layer must remain loaded');
ok(/national lease averages are context only|Generic national lease averages are context only/i.test(integrity),'generic lease average must remain context-only');
ok(/235800/.test(vehicle)&&/GT3/.test(vehicle),'GT3 sanity correction must remain present until replaced by live authoritative valuation');

console.log(`ExpenseIntel integrity regression: ${checks} checks passed.`);
