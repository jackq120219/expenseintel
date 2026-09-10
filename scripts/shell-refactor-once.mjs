import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const canonicalShell = `<div class="topline"><div class="shell"><div>Pre-Commitment Decision Intelligence</div><div class="status"><span><i class="dot"></i><b>Connected evidence</b></span><span>Explicit unknowns</span><span>United States</span></div></div></div>\n<nav class="site-nav"><div class="shell navinner"><a class="brand" href="/"><span class="mark">EI</span>ExpenseIntel</a><div class="navlinks"><a href="/check/">Check</a><a href="/watch/">Watch</a><a href="/project/">Project Intel</a><a href="/xray/">X-Ray</a><a href="/data/">Evidence</a></div><div class="navright"><a class="solidbtn" href="/check/">New check</a></div><button class="menu-btn" data-menu aria-label="Open menu">≡</button></div></nav>`;
const shellPattern = /<div class="topline">[\s\S]*?<nav class="site-nav">[\s\S]*?<\/nav>/;
const cssTag = '<link rel="stylesheet" href="/header-stability.css">';
const jsTag = '<script src="/header-stability.js" defer></script>';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}

let htmlCount = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('class="site-nav"')) continue;
  if (!shellPattern.test(html)) throw new Error(`Could not locate full shell in ${path.relative(root, file)}`);
  html = html.replace(shellPattern, canonicalShell);
  html = html.replaceAll('href="/spend/"', 'href="/check/"');
  if (!html.includes('/header-stability.css')) {
    const styles = /<link[^>]+href="\/styles\.css"[^>]*>/;
    if (!styles.test(html)) throw new Error(`No /styles.css link in ${path.relative(root, file)}`);
    html = html.replace(styles, m => `${m}${cssTag}`);
  }
  if (!html.includes('/header-stability.js')) {
    if (html.includes('<script src="/app.js"')) html = html.replace('<script src="/app.js"', `${jsTag}<script src="/app.js"`);
    else html = html.replace('</body>', `${jsTag}</body>`);
  }
  if (!html.includes(canonicalShell)) throw new Error(`Canonical shell missing after rewrite in ${path.relative(root, file)}`);
  fs.writeFileSync(file, html);
  htmlCount++;
}
if (htmlCount < 20) throw new Error(`Expected to normalize at least 20 HTML pages, got ${htmlCount}`);

// app.js must never rebuild header DOM after first paint.
const appPath = path.join(root, 'app.js');
let app = fs.readFileSync(appPath, 'utf8');
const appBefore = app;
app = app.replace(/  function navKey\([\s\S]*?\n  function bindNav\(\)/, '  function normalizeNav(){}\n  function bindNav()');
if (app === appBefore || !app.includes('function normalizeNav(){}')) throw new Error('Failed to remove app.js header rebuild');
fs.writeFileSync(appPath, app);

// polish.js may animate the shell, but it may not add/change nav items or CTAs.
const polishPath = path.join(root, 'polish.js');
let polish = fs.readFileSync(polishPath, 'utf8');
const polishBefore = polish;
polish = polish.replace(/\n  function navTouch\([\s\S]*?\n  function metricMotion\(\)/, '\n  function metricMotion()');
polish = polish.replace('loadClarity();loadIdentity();navTouch();aboutNav();const a=read();', 'loadClarity();loadIdentity();const a=read();');
if (polish === polishBefore || /function navTouch\(|function aboutNav\(/.test(polish)) throw new Error('Failed to remove polish.js header mutators');
fs.writeFileSync(polishPath, polish);

// The old signal rail sat directly below the header and visually competed with navigation.
const flowPath = path.join(root, 'signal-flow.js');
let flow = fs.readFileSync(flowPath, 'utf8');
const flowBefore = flow;
flow = flow.replace(/\n  function makeRail\([\s\S]*?\n  function scanStages\(box\)/, '\n  function scanStages(box)');
flow = flow.replace('function init(){loadSystems();installRail();installScanWatch();installValueTraces()}', 'function init(){loadSystems();installScanWatch();installValueTraces()}');
if (flow === flowBefore || /function makeRail\(|function installRail\(/.test(flow)) throw new Error('Failed to remove signal rail code');
fs.writeFileSync(flowPath, flow);

// Identity remains useful for case continuity, but it no longer owns any header assets or header modules.
const identityPath = path.join(root, 'identity-sprint.js');
fs.writeFileSync(identityPath, `(()=>{if(window.__eiIdentitySprint)return;window.__eiIdentitySprint=1;if(location.pathname==='/spend/'||location.pathname==='/spend'){location.replace('/check/');return}const addCss=(href,key)=>{if(document.querySelector(\`link[data-\${key}]\`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='1';document.head.appendChild(l)};addCss('/identity-sprint/00-identity.css','eiIdentityCss');const files=['01-case-context.js','03-lens-context.js','04-case-dock.js','05-link-continuity.js','06-next-action.js','07-evidence-contract.js','08-return-path.js','09-commitment-bridge.js','10-watch-continuity.js','11-page-language.js','12-mobile-discipline.js','14-project-jump.js','15-meta-consistency.js'];let i=0;const load=()=>{if(i>=files.length)return;const s=document.createElement('script');s.src='/identity-sprint/'+files[i++];s.defer=true;s.dataset.eiIdentity='1';s.onload=load;s.onerror=load;document.head.appendChild(s)};load()})();\n`);

// Keep only the transition/prefetch layer; all visual content now comes from source HTML.
const stabilityCss = `/* ExpenseIntel shared shell: identical markup on every route; only page content transitions. */\n@view-transition{navigation:auto}\n.site-nav{view-transition-name:ei-site-nav}\n.topline{view-transition-name:ei-topline}\nmain{view-transition-name:ei-page-content}\n.ei-identity-rail,.ei-signal-rail{display:none!important}\n.site-nav,.topline,.navinner,.navlinks,.navright{animation:none!important}\n::view-transition-group(ei-site-nav),::view-transition-group(ei-topline){animation-duration:.001s;z-index:9999}\n::view-transition-old(ei-site-nav),::view-transition-new(ei-site-nav),::view-transition-old(ei-topline),::view-transition-new(ei-topline){animation:none!important;mix-blend-mode:normal}\n::view-transition-old(root),::view-transition-new(root){animation:none!important}\n::view-transition-old(ei-page-content){animation:eiPageOut 90ms ease both}\n::view-transition-new(ei-page-content){animation:eiPageIn 180ms cubic-bezier(.2,.72,.2,1) both}\n@keyframes eiPageOut{to{opacity:.82;transform:translateY(-2px)}}\n@keyframes eiPageIn{from{opacity:.55;transform:translateY(5px)}to{opacity:1;transform:none}}\n@media(prefers-reduced-motion:reduce){@view-transition{navigation:none}::view-transition-old(ei-page-content),::view-transition-new(ei-page-content){animation:none!important}}\n`;
fs.writeFileSync(path.join(root, 'header-stability.css'), stabilityCss);

// Retire dead header modules and keep health checks aligned with what production actually loads.
for (const dead of ['identity-sprint/02-passport-rail.js', 'identity-sprint/13-contextual-nav.js']) {
  const p = path.join(root, dead);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
const healthPath = path.join(root, 'api/health.js');
let health = fs.readFileSync(healthPath, 'utf8');
health = health.replace(/\s*['"]\/identity-sprint\/02-passport-rail\.js['"],?/g, '');
health = health.replace(/\s*['"]\/identity-sprint\/13-contextual-nav\.js['"],?/g, '');
fs.writeFileSync(healthPath, health);

console.log(`Normalized ${htmlCount} ExpenseIntel HTML documents.`);
console.log('Removed app/polish header rewrites, signal rail, and dead identity header modules.');
