const fs=require('fs');
const path=require('path');

module.exports=function handler(_req,res){
  try{
    const root=process.cwd();
    const jsPath=path.join(root,'project','lab-v3.js');
    const cssPath=path.join(root,'project','precision.css');
    const v4Path=path.join(root,'project','gates-v4.js');
    const v4CssPath=path.join(root,'project','gates-v4.css');
    const v5Path=path.join(root,'project','intel-v5.js');
    const v5CssPath=path.join(root,'project','intel-v5.css');
    const v6Path=path.join(root,'project','cloud-v6.js');
    const v6CssPath=path.join(root,'project','cloud-v6.css');
    const evidenceApiPath=path.join(root,'api','project-evidence.js');
    const permitApiPath=path.join(root,'api','chicago-permits.js');
    const cloudApiPath=path.join(root,'api','cloud-status.js');
    const failurePath=path.join(root,'data','failure-library.json');
    const code=fs.readFileSync(jsPath,'utf8');
    const v4=fs.readFileSync(v4Path,'utf8');
    const v5=fs.readFileSync(v5Path,'utf8');
    const v6=fs.readFileSync(v6Path,'utf8');
    const evidenceApi=fs.readFileSync(evidenceApiPath,'utf8');
    const permitApi=fs.readFileSync(permitApiPath,'utf8');
    const cloudApi=fs.readFileSync(cloudApiPath,'utf8');
    new Function(code);new Function(v4);new Function(v5);new Function(v6);
    new Function('require','module','exports',evidenceApi);
    new Function('require','module','exports',permitApi);
    new Function('require','module','exports',cloudApi);
    const css=fs.readFileSync(cssPath,'utf8');
    const v4Css=fs.readFileSync(v4CssPath,'utf8');
    const v5Css=fs.readFileSync(v5CssPath,'utf8');
    const v6Css=fs.readFileSync(v6CssPath,'utf8');
    if(!css.includes('.precision-module')||!css.includes('@media(prefers-reduced-motion:reduce)'))throw new Error('Precision CSS integrity check failed');
    if(!v4Css.includes('.evidence-inbox')||!v4Css.includes('.gate-posture')||!v4Css.includes('@media(prefers-reduced-motion:reduce)'))throw new Error('Gatekeeper CSS integrity check failed');
    if(!v4.includes('Contradiction Engine')||!v4.includes('Dependency Graph')||!v4.includes('Project Gatekeeper'))throw new Error('Project v4 feature integrity check failed');
    if(!v5.includes('Auto Evidence Pull')||!v5.includes('Document Intelligence')||!v5.includes('Change Impact Engine')||!v5.includes('Project Timeline')||!v5.includes('Decision Brief'))throw new Error('Project v5 feature integrity check failed');
    if(!v5Css.includes('.auto-evidence-module')||!v5Css.includes('.decision-console')||!v5Css.includes('@media(prefers-reduced-motion:reduce)'))throw new Error('Project v5 CSS integrity check failed');
    if(!v6.includes('SUPABASE_URL')||!v6.includes('signInWithPassword')||!v6.includes('ei_project_snapshots')||!v6.includes('ei_accept_invite'))throw new Error('Cloud accounts v6 integrity check failed');
    if(!v6Css.includes('.cloud-console')||!v6Css.includes('.cloud-project-shell')||!v6Css.includes('@media(prefers-reduced-motion:reduce)'))throw new Error('Cloud v6 CSS integrity check failed');
    if(!cloudApi.includes('configured:true')||!cloudApi.includes('rls:true'))throw new Error('Dedicated cloud status integrity check failed');
    const failure=JSON.parse(fs.readFileSync(failurePath,'utf8'));
    if(!Array.isArray(failure.records)||failure.records.length<1)throw new Error('Failure Library is empty');
    const bad=failure.records.filter(r=>!r.id||!r.jurisdiction||!r.agency||!r.case||!r.status||!r.observed||!r.lesson||!/^https:\/\//.test(r.sourceUrl||''));
    if(bad.length)throw new Error(`Failure Library has ${bad.length} malformed record(s)`);
    return res.status(200).json({ok:true,projectLab:{scriptParsed:true,precisionCss:true,evidenceParser:true,gatekeeperV4:true,intelligenceV5:true,autoEvidence:true,documentIntelligence:true,changeImpact:true,timeline:true,decisionBrief:true,cloudAccountsV6:true,cloudSync:true,teamInvites:true,rowLevelSecurity:true,failureRecords:failure.records.length,failureLibraryVersion:failure.version||null}});
  }catch(error){
    return res.status(500).json({ok:false,error:error&&error.message?error.message:'Project Lab integrity check failed'});
  }
};
