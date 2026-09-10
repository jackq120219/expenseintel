'use strict';
const catalog=require('../data/source-catalog-v1.json');
module.exports=async function handler(_req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ok:true,...catalog});
};
