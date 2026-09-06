'use strict';

const { sendJson, cleanText } = require('../lib/http');

const DATASET='https://data.cityofchicago.org/resource/ydr8-5enu.json';

function parseStreet(raw){
  const s=cleanText(raw,180).toUpperCase().replace(/\./g,'');
  const m=s.match(/^\s*(\d+[A-Z-]*)\s+(?:(N|S|E|W)\s+)?(.+)$/);
  if(!m)return null;
  return{number:m[1],direction:m[2]||'',name:m[3].replace(/'/g,"''").trim()};
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return sendJson(res,405,{ok:false,error:'Method not allowed'});
  const city=cleanText(req.query?.city,80).toLowerCase();
  const state=cleanText(req.query?.state,2).toUpperCase();
  const street=parseStreet(req.query?.street);
  if(city!=='chicago'||state!=='IL')return sendJson(res,200,{ok:true,available:false,coverage:'Chicago, IL only',records:[]},{cache:'public, s-maxage=86400'});
  if(!street)return sendJson(res,400,{ok:false,error:'A street number and street name are required.'});

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const url=new URL(DATASET);
    url.searchParams.set('$limit','24');
    url.searchParams.set('$select','permit_,permit_status,permit_milestone,permit_type,review_type,application_start_date,issue_date,processing_time,street_number,street_direction,street_name,work_type,work_description,reported_cost,pin_list,permit_condition');
    let where=`street_number=${Number.parseInt(street.number,10)} AND upper(street_name) like '%${street.name}%'`;
    if(street.direction)where+=` AND upper(street_direction)='${street.direction}'`;
    url.searchParams.set('$where',where);
    url.searchParams.set('$order','issue_date DESC');
    const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 (https://expenseintel.com)'}});
    if(!r.ok)throw new Error(`Chicago permits ${r.status}`);
    const rows=await r.json();
    const records=(Array.isArray(rows)?rows:[]).map(x=>({
      permit:String(x.permit_||''),
      status:cleanText(x.permit_status,80)||null,
      milestone:cleanText(x.permit_milestone,100)||null,
      type:cleanText(x.permit_type,120)||null,
      reviewType:cleanText(x.review_type,100)||null,
      applicationStart:x.application_start_date||null,
      issueDate:x.issue_date||null,
      processingDays:Number.isFinite(Number(x.processing_time))?Number(x.processing_time):null,
      workType:cleanText(x.work_type,120)||null,
      description:cleanText(x.work_description,460)||null,
      reportedCost:Number.isFinite(Number(x.reported_cost))?Number(x.reported_cost):null,
      pinList:cleanText(x.pin_list,160)||null,
      condition:cleanText(x.permit_condition,360)||null
    }));
    return sendJson(res,200,{
      ok:true,available:true,coverage:'Chicago Department of Buildings permits, 2006-present',
      source:'City of Chicago Data Portal · Building Permits · ydr8-5enu',
      sourceUrl:'https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu',
      records,
      summary:{count:records.length,latestIssueDate:records.find(x=>x.issueDate)?.issueDate||null,withConditions:records.filter(x=>x.condition).length}
    },{cache:'public, s-maxage=21600, stale-while-revalidate=86400'});
  }catch(error){
    return sendJson(res,error?.name==='AbortError'?504:502,{ok:false,error:'Chicago permit data is temporarily unavailable.',records:[]});
  }finally{clearTimeout(timer)}
};
