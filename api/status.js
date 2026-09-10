'use strict';
const catalog=require('../data/source-catalog-v1.json');
const evidence=require('../data/decision-evidence-contract-v1.json');
module.exports=async function handler(_req,res){
  res.setHeader('Cache-Control','no-store');
  const reviewed=new Date(`${catalog.reviewed_at}T00:00:00Z`);
  const ageDays=Number.isNaN(reviewed.getTime())?null:Math.floor((Date.now()-reviewed.getTime())/86400000);
  return res.status(200).json({
    ok:true,
    product:'ExpenseIntel',
    contract:evidence.schema,
    contractVersion:evidence.version,
    sourceCatalog:{schema:catalog.schema,version:catalog.version,count:catalog.sources.length,reviewedAt:catalog.reviewed_at,ageDays},
    evidenceClasses:Object.keys(evidence.evidence_classes||{}),
    generatedAt:new Date().toISOString()
  });
};
