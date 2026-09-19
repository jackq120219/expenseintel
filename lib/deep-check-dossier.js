'use strict';
// Transparent, user-input-only calculations. No unverified market-price or savings claims.
const CATEGORIES=new Set(['home','vehicle','property','equipment','other']);
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
function amount(value,label,{positive=false}={}){
  if(value===''||value==null)throw new Error(`${label} is required.`);
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>100000000||(positive&&n===0))throw new Error(`${label} must be a valid ${positive?'positive':'nonnegative'} amount.`);
  return money(n);
}
function text(value,max){return String(value||'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max)}
function validate(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Enter a decision and two options.');
  const title=text(input.title,120);
  if(title.length<5)throw new Error('Give this decision a title of at least five characters.');
  const category=CATEGORIES.has(input.category)?input.category:'other';
  const years=Number(input.years);
  if(!Number.isInteger(years)||years<1||years>10)throw new Error('The comparison horizon must be 1–10 years.');
  if(!Array.isArray(input.options)||input.options.length!==2)throw new Error('Exactly two options are required.');
  const options=input.options.map((x,i)=>{
    if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('Both options must be supplied.');
    const name=text(x.name,80);
    if(name.length<2)throw new Error(`Name option ${i+1}.`);
    const price=amount(x.price,`${name} purchase price`,{positive:true});
    const upfront=amount(x.upfront??0,`${name} additional upfront costs`);
    const monthly=amount(x.monthly??0,`${name} monthly costs`);
    const annual=amount(x.annual??0,`${name} annual costs`);
    const resale=amount(x.resale??0,`${name} resale value`);
    return{name,price,upfront,monthly,annual,resale,scope:text(x.scope,1300),source:text(x.source,350)};
  });
  return{title,category,years,options};
}
function computeOption(o,years,{upfrontMultiplier=1,operatingMultiplier=1,resaleMultiplier=1}={}){
  const acquisition=money(o.price+o.upfront*upfrontMultiplier);
  const annualOperating=money((12*o.monthly+o.annual)*operatingMultiplier);
  const gross=money(acquisition+annualOperating*years);
  const recovery=money(o.resale*resaleMultiplier);
  return{acquisition,annualOperating,gross,assumedRecovery:recovery,netCost:money(gross-recovery)};
}
const CHECKLIST={
  home:['Request a line-item scope with quantities, materials and exclusions.','Confirm permits, change-order pricing, warranty and cleanup in writing.','Verify contractor credentials and obtain comparable written quotes.'],
  vehicle:['Confirm VIN, title, inspection and maintenance records.','Get written insurance, registration and repair estimates.','Check financing terms and verify expected resale independently.'],
  property:['Verify inspection findings, taxes, insurance, HOA fees and closing costs.','Confirm financing and local title/permit issues with qualified professionals.','Validate resale assumptions with actual comparable sales.'],
  equipment:['Check installation, training, downtime, consumables and maintenance.','Confirm service levels, spare-parts access and warranty exclusions.','Request resale evidence and a total delivered-and-installed quote.'],
  other:['Ask each seller for a written scope, inclusions and exclusions.','Verify financing, taxes, service and any recurring obligations.','Obtain independent evidence for both price and eventual resale assumptions.']
};
function makeDossier(input){
  const v=validate(input);
  const base=v.options.map(o=>computeOption(o,v.years));
  const cases=[
    {name:'Entered assumptions',description:'All costs and resale exactly as entered.',options:base},
    {name:'Cost pressure',description:'Additional upfront expenses +15%, ongoing costs +25%, and resale value −20%; illustrative, not a prediction.',options:v.options.map(o=>computeOption(o,v.years,{upfrontMultiplier:1.15,operatingMultiplier:1.25,resaleMultiplier:.8}))},
    {name:'Operating relief',description:'Ongoing costs −10%; all other values unchanged. Illustrative, not a prediction.',options:v.options.map(o=>computeOption(o,v.years,{operatingMultiplier:.9}))}
  ];
  const delta=money(base[0].netCost-base[1].netCost);
  const missing=[];
  v.options.forEach((o,i)=>{
    if(!o.source)missing.push(`${o.name}: no source or quote reference supplied.`);
    if(!o.scope)missing.push(`${o.name}: scope, warranty and exclusions not documented.`);
    if(!o.resale)missing.push(`${o.name}: no resale/recovery value entered; modeled as $0.`);
  });
  missing.push('Financing interest, taxes, inflation and opportunity costs are excluded unless included in your entered figures.');
  return{version:'EI-DEEP-CHECK-1',title:v.title,category:v.category,years:v.years,options:v.options,cases,delta,comparison:delta===0?'The entered net costs are equal.':`${v.options[delta<0?0:1].name} has a lower modeled net cost by $${Math.abs(delta).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} under the entered assumptions. This is a cost comparison, not a quality recommendation.`,missing,questions:CHECKLIST[v.category],methodology:'Net cost = purchase price + extra upfront costs + (monthly × 12 + annual costs) × years − entered resale value. Stress cases adjust only the stated assumptions; no independent quotes, market prices, insurance, taxes or warranties are verified.',generatedAt:new Date().toISOString()};
}
module.exports={validate,computeOption,makeDossier};
