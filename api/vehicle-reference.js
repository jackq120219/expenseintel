const REFERENCES={
  'porsche|911 carrera':{
    make:'Porsche',model:'911 Carrera',currency:'USD',
    startingMsrp:135500,
    startingMsrpSource:'Porsche USA',
    startingMsrpUrl:'https://www.porsche.com/usa/models/911/carrera-models/911-carrera/',
    startingMsrpObserved:'2026-09-08',
    configuredListings:[
      {price:156715,label:'2026 Porsche 911 Carrera · Porsche Greenwich',url:'https://finder.porsche.com/us/en-US/details/7087V4'},
      {price:169452.63,label:'2026 Porsche 911 Carrera · Porsche Lincolnwood',url:'https://finder.porsche.com/us/en-US/details/4GVZEE'},
      {price:179045,label:'2026 Porsche 911 Carrera · Paul Miller Porsche',url:'https://finder.porsche.com/us/en-US/details/porsche-911-carrera-new-9PDGLP'}
    ],
    note:'Starting MSRP excludes options, taxes, title, registration, delivery/processing, dealer charges and potential tariffs. Configured listings are official Porsche Finder asking/MSRP observations, not completed-sale prices.'
  }
};
module.exports=(req,res)=>{
  const make=String(req.query?.make||'').trim().toLowerCase();
  const model=String(req.query?.model||'').trim().toLowerCase().replace(/\s+/g,' ');
  const key=`${make}|${model}`;
  const ref=REFERENCES[key];
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  if(!ref)return res.status(404).json({ok:false,error:'No curated vehicle reference yet.'});
  const prices=ref.configuredListings.map(x=>x.price).sort((a,b)=>a-b);
  const median=prices[Math.floor(prices.length/2)];
  return res.status(200).json({ok:true,...ref,configuredRange:{min:prices[0],max:prices[prices.length-1],median,count:prices.length},integrity:{startingMsrpIsConfiguredPrice:false,listingPricesAreCompletedSales:false,exactDealerPriceRequired:true}});
};