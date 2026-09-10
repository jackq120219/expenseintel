import fs from 'node:fs';
const pages=['index.html','check/index.html','truecost/index.html','fairprice/index.html','project/index.html','xray/index.html','data/index.html','about/index.html'];
let bad=0;
for(const p of pages){
  if(!fs.existsSync(p)){console.error(`SEO: missing ${p}`);bad++;continue}
  const h=fs.readFileSync(p,'utf8');
  const checks=[['title',/<title>[^<]{8,}<\/title>/i],['description',/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{40,}["']/i],['canonical',/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\//i]];
  for(const [name,rx] of checks)if(!rx.test(h)){console.error(`SEO: ${p} missing/weak ${name}`);bad++}
  if(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(h)){console.error(`SEO: ${p} is noindex`);bad++}
}
const robots=fs.readFileSync('robots.txt','utf8'), sitemap=fs.readFileSync('sitemap.xml','utf8');
if(!/Sitemap:\s*https:\/\/www\.expenseintel\.com\/sitemap\.xml/i.test(robots)){console.error('SEO: robots sitemap declaration missing');bad++}
if(sitemap.includes('/spend/')){console.error('SEO: redirect route /spend/ must not be in sitemap');bad++}
for(const route of ['/check/','/truecost/','/fairprice/','/project/','/xray/','/data/'])if(!sitemap.includes(route)){console.error(`SEO: sitemap missing ${route}`);bad++}
if(bad)process.exit(1);console.log(`SEO AUDIT OK: ${pages.length} key pages + sitemap/robots; missing robots meta correctly defaults to index/follow`);
