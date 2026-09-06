const fs=require('fs');
const path=require('path');

module.exports=function handler(_req,res){
  try{
    const root=process.cwd();
    const jsPath=path.join(root,'project','lab-v3.js');
    const cssPath=path.join(root,'project','precision.css');
    const failurePath=path.join(root,'data','failure-library.json');
    const code=fs.readFileSync(jsPath,'utf8');
    // Parse the browser bundle without executing it.
    // eslint-disable-next-line no-new-func
    new Function(code);
    const css=fs.readFileSync(cssPath,'utf8');
    if(!css.includes('.precision-module')||!css.includes('@media(prefers-reduced-motion:reduce)'))throw new Error('Precision CSS integrity check failed');
    const failure=JSON.parse(fs.readFileSync(failurePath,'utf8'));
    if(!Array.isArray(failure.records)||failure.records.length<1)throw new Error('Failure Library is empty');
    const bad=failure.records.filter(r=>!r.id||!r.jurisdiction||!r.agency||!r.case||!r.status||!r.observed||!r.lesson||!/^https:\/\//.test(r.sourceUrl||''));
    if(bad.length)throw new Error(`Failure Library has ${bad.length} malformed record(s)`);
    return res.status(200).json({ok:true,projectLab:{scriptParsed:true,precisionCss:true,failureRecords:failure.records.length,failureLibraryVersion:failure.version||null}});
  }catch(error){
    return res.status(500).json({ok:false,error:error&&error.message?error.message:'Project Lab integrity check failed'});
  }
};
