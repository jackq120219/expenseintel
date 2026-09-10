import fs from 'node:fs';
const routes=['/','/check/','/watch/','/project/','/xray/','/data/','/truecost/','/fairprice/','/timing/','/about/','/pricing/'];
let bad=0;
for(const route of routes){
  const path=route==='/'?'index.html':`${route.slice(1)}index.html`;
  if(!fs.existsSync(path)){console.error(`LINK: route ${route} has no ${path}`);bad++}
}
for(const page of ['index.html','check/index.html','watch/index.html','project/index.html','xray/index.html','data/index.html']){
  const h=fs.readFileSync(page,'utf8');
  for(const route of ['/check/','/watch/','/project/','/xray/','/data/'])if(!h.includes(`href="${route}"`)&&!h.includes(`href='${route}'`)){console.error(`LINK: ${page} missing primary nav ${route}`);bad++}
}
if(bad)process.exit(1);console.log(`LINK AUDIT OK: ${routes.length} canonical routes and primary nav coverage`);
