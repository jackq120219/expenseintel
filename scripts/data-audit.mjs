import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const contract=read('data/decision-evidence-contract-v1.json');
const catalog=read('data/source-catalog-v1.json');
const fail=m=>{console.error(`DATA AUDIT: ${m}`);process.exitCode=1};
if(contract.schema!=='expenseintel.decision-evidence.v1')fail('unexpected evidence contract schema');
for(const k of ['user','public','verified','modeled','unknown'])if(!contract.evidence_classes?.[k])fail(`missing evidence class ${k}`);
if(!Array.isArray(contract.rules)||contract.rules.length<6)fail('evidence rules are too thin');
if(catalog.schema!=='expenseintel.source-catalog.v1')fail('unexpected source catalog schema');
if(!/^\d{4}-\d{2}-\d{2}$/.test(catalog.reviewed_at))fail('reviewed_at must be ISO date');
const ids=new Set();let integrated=0;
for(const s of catalog.sources||[]){
  if(ids.has(s.id))fail(`duplicate source id ${s.id}`); ids.add(s.id);
  if(!/^https:\/\//.test(s.url||''))fail(`non-https source ${s.id}`);
  if(!Array.isArray(s.domains)||!s.domains.length)fail(`missing domains ${s.id}`);
  if(!['reference','integrated','candidate'].includes(s.role))fail(`invalid role ${s.id}`);
  if(s.role==='integrated'){
    integrated++;
    if(!/^check:/.test(s.integration||''))fail(`integrated source ${s.id} missing product integration path`);
    if(!/^\/api\//.test(s.endpoint||''))fail(`integrated source ${s.id} missing API endpoint`);
  }
}
if((catalog.sources||[]).length<8)fail('source catalog unexpectedly small');
if(integrated<2)fail('expected at least two live integrated sources');
if(!process.exitCode)console.log(`DATA AUDIT OK: ${catalog.sources.length} sources, ${integrated} integrated, ${Object.keys(contract.evidence_classes).length} evidence classes`);
