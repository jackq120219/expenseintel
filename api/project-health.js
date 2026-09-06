const fs=require('fs');
const path=require('path');

module.exports=function handler(_req,res){
  try{
    const root=process.cwd();
    const jsPath=path.join(root,'project','lab-v3.js');
    const cssPath=path.join(root,'project','precision.css');
    const v4Path=path.join(root,'project','gates-v4.js');
    const v4CssPath=path.join(root,'project','gates-v4.css');
    const evidenceApiPath=path.join(root,'api','project-evidence.js');
    const failurePath=path.join(root,'data','failure-library.json');
    const code=fs.readFileSync(jsPath,'utf8');
    const v4=fs.readFileSync(v4Path,'utf8');
    const evidenceApi=fs.readFileSync(evidenceApiPath,'utf8');
    // Parse browser/server bundles without executing them.
    // eslint-disable-next-line no-new-func
    new Function(code);
    // eslint-disable-next-line no-new-func
    new Function(v4);
    // eslint-disable-next-line no-new-func
    new Function('require','module','exports',evidenceApi);
    const css=fs.readFileSync(cssPath,'utf8');
    const v4Css=fs.readFileSync(v4CssPath,'utf8');
    if(!css.includes('.precision-module')||!css.includes('@media(prefers-reduced-motion:reduce)'))throw new Error('Precision CSS integrity check failed');
    if(!v4Css.includes('.evidence-inbox')||!v4Css.includes('.gatekeeper-module')||!v4Css.includes('@media(prefers-reduced-motion:reduce)'))throw new Error('Gatekeeper CSS integrity check failed');
    if(!v4.includes('Contradiction Engine')||!v4.includes('Dependency Graph')||!v4.includes('Project Gatekeeper'))throw new Error('Project v4 feature integrity check failed');
    const failure=JSON.parse(fs.readFileSync(failurePath,'utf8'));
    if(!Array.isArray(failure.records)||failure.records.length<1)throw new Error('Failure Library is empty');
    const bad=failure.records.filter(r=>!r.id||!r.jurisdiction||!r.agency||!r.case||!r.status||!r.observed||!r.lesson||!/^https:\/\//.test(r.sourceUrl||''));
    if(bad.length)throw new Error(`Failure Library has ${bad.length} malformed record(s)`);
    return res.status(200).json({ok:true,projectLab:{scriptParsed:true,precisionCss:true,evidenceParser:true,gatekeeperV4:true,failureRecords:failure.records.length,failureLibraryVersion:failure.version||null}});
  }catch(error){
    return res.status(500).json({ok:false,error:error&&error.message?error.message:'Project Lab integrity check failed'});
  }
};
