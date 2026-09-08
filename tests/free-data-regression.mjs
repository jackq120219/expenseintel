import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {extractStructuredTerms,zipFrom}=require('../lib/free-evidence.js');
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m)};const eq=(a,b,m)=>{checks++;assert.equal(a,b,m)};

const lease=`2026 Porsche 911 GT3. MSRP $239,900. Selling price $247,500. Monthly payment $3,195. Lease term 36 months. Due at signing $8,500. Annual mileage 10,000. Residual 62%. Money factor 0.00290. Acquisition fee $1,095. Doc fee $399. Disposition fee $595.`;
const q=extractStructuredTerms(lease);
eq(q.kind,'lease','lease recognized');eq(q.fields.msrp,239900,'MSRP exact');eq(q.fields.sellingPrice,247500,'selling price exact');eq(q.fields.monthlyPayment,3195,'monthly payment exact');eq(q.fields.termMonths,36,'term exact');eq(q.fields.dueAtSigning,8500,'drive off exact');eq(q.fields.annualMileage,10000,'mileage exact');eq(q.fields.residualPct,62,'residual exact');eq(q.fields.moneyFactor,.0029,'money factor exact');eq(q.fields.acquisitionFee,1095,'acquisition fee exact');eq(q.fields.docFee,399,'doc fee exact');eq(q.fields.dispositionFee,595,'disposition fee exact');ok(q.leaseCompleteness.known>=6,'core lease sheet coverage');ok(q.items.every(x=>x.tier==='verified'),'parsed terms are explicit-user tier');

const project=extractStructuredTerms(`Roof proposal. Labor $8,400. Materials $11,200. Permit fee $450. Contingency 10%. Grand total $22,050. Deposit $4,000.`);
eq(project.kind,'project-quote','project quote recognized');eq(project.fields.labor,8400,'labor exact');eq(project.fields.materials,11200,'materials exact');eq(project.fields.permitFees,450,'permit exact');eq(project.fields.contingencyPct,10,'contingency exact');eq(project.fields.quoteTotal,22050,'quote total exact');eq(project.fields.deposit,4000,'deposit exact');

const sparse=extractStructuredTerms('I want to lease a 2026 Porsche 911 GT3 and I drive about 8 miles to work.');eq(sparse.fields.monthlyPayment,undefined,'unlabeled number not promoted to payment');eq(sparse.fields.msrp,undefined,'no invented MSRP');eq(sparse.fields.dueAtSigning,undefined,'no invented drive-off');
const noisy=extractStructuredTerms('The dealer has 36 cars and 911 is the model. I saw 2026 in the ad.');eq(noisy.count,0,'generic numbers are ignored');

eq(zipFrom('Chicago, IL 60611'),'60611','ZIP extracted');eq(zipFrom('no zip here'),'','no fake ZIP');

const root=path.resolve(new URL('..',import.meta.url).pathname);const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const vin=read('lib/vin-intel.js'),check=read('check/index.html'),client=read('check/free-evidence-v15.js'),api=read('api/free-evidence.js');
ok(/DecodeVinValuesExtended/.test(vin),'deep NHTSA VIN decode remains active');ok(/transmissionStyle/.test(vin)&&/electrificationLevel/.test(vin)&&/basePrice/.test(vin),'extended VIN attributes remain wired');ok(/free-evidence-v15\.js/.test(check),'free evidence UI loaded on Check');ok(/free-evidence-v15\.css/.test(check),'free evidence styles loaded on Check');ok(/api\/free-evidence/.test(client),'client uses free evidence endpoint');ok(/Census/.test(api)||/fetchCensusContext/.test(api),'free Census context endpoint remains wired');ok(/Entered \/ pasted/.test(client),'verified pasted terms remain visibly labeled');ok(/contextual only, never a property comp/i.test(client),'Census context cannot masquerade as property comp');
console.log(`ExpenseIntel free-data regression: ${checks} checks passed.`);