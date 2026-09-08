(()=>{
  const NS='http://www.w3.org/2000/svg';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const el=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n};
  function pointsFrom(path){const d=path?.getAttribute('d')||'',out=[];for(const m of d.matchAll(/[ML]\s*([\d.-]+)[, ]+([\d.-]+)/g))out.push([+m[1],+m[2]]);return out}
  function valueFrom(prefix,svg){const t=$$('text',svg).find(x=>new RegExp(`^${prefix}\\s*·`,'i').test((x.textContent||'').trim()));return t?((t.textContent||'').split('·')[1]||'').trim():'—'}
  function opportunityBand(svg,deal,best){if($('.ei-v13-opportunity-band',svg))return;const a=pointsFrom(deal),b=pointsFrom(best);if(a.length<2||a.length!==b.length)return;const d=`M${a.map(p=>p.join(',')).join(' L')} L${b.slice().reverse().map(p=>p.join(',')).join(' L')} Z`,band=el('path',{d,class:'ei-v13-opportunity-band'});deal.parentNode.insertBefore(band,deal)}
  function distribute(items,minY,maxY,gap){items.sort((a,b)=>a.end.y-b.end.y);items.forEach((x,i)=>{x.y=clamp(x.end.y,minY,maxY);if(i&&x.y<items[i-1].y+gap)x.y=items[i-1].y+gap});if(items.length&&items.at(-1).y>maxY){const shift=items.at(-1).y-maxY;items.forEach(x=>x.y-=shift)}for(let i=items.length-2;i>=0;i--)if(items[i].y>items[i+1].y-gap)items[i].y=items[i+1].y-gap;if(items.length&&items[0].y<minY){const shift=minY-items[0].y;items.forEach(x=>x.y+=shift)}return items}
  function addEndcap(svg,item,W){const x=W-84,w=78,h=30,y=item.y-h/2,g=el('g',{class:`ei-v13-endcap ${item.kind}`});const leader=el('path',{class:'ei-v13-leader',d:`M${item.end.x+5},${item.end.y} L${x-5},${item.end.y} L${x-5},${item.y} L${x},${item.y}`,stroke:item.color});const rect=el('rect',{x,y,width:w,height:h});const name=el('text',{x:x+7,y:y+11,class:'name'});name.textContent=item.name;const value=el('text',{x:x+7,y:y+23,class:'value'});value.textContent=item.value;const dot=el('circle',{cx:item.end.x,cy:item.end.y,r:4.8,fill:item.color,class:'ei-v13-endpoint'});g.append(leader,rect,name,value);svg.append(dot,g)}
  function polish(svg){if(!svg||svg.dataset.eiV13Polished==='1')return;const deal=$('path.deal',svg),market=$('path.market',svg),best=$('path.best',svg);if(!deal||!market||!best)return;svg.dataset.eiV13Polished='1';opportunityBand(svg,deal,best);
    const W=svg.viewBox?.baseVal?.width||760,H=svg.viewBox?.baseVal?.height||245;
    const original={current:valueFrom('THIS',svg),reference:valueFrom('REF',svg),improved:valueFrom('OPT',svg)};
    $$('text',svg).filter(x=>/^(THIS|REF|OPT)\s*·/i.test((x.textContent||'').trim())).forEach(x=>x.remove());
    $$('circle',svg).filter(x=>!x.classList.contains('ei-v13-endpoint')).forEach(x=>x.style.opacity='0');
    const defs=[['current','CURRENT PATH',deal,'#e8476f',original.current],['reference','BENCHMARK',market,'#667067',original.reference],['improved','IMPROVED PATH',best,'#689b35',original.improved]];
    const items=defs.map(([kind,name,path,color,value])=>{let end={x:0,y:0};try{const p=path.getPointAtLength(path.getTotalLength());end={x:p.x,y:p.y}}catch(_e){const pts=pointsFrom(path),p=pts.at(-1)||[0,0];end={x:p[0],y:p[1]}}return{kind,name,path,color,value,end}});
    distribute(items,28,H-42,36).forEach(x=>addEndcap(svg,x,W));
    const legend=svg.parentElement?.querySelector('.ei-v12-legend');if(legend){const spans=$$('span',legend);if(spans[0])spans[0].lastChild.textContent=' Current path';if(spans[1])spans[1].lastChild.textContent=' Benchmark path';if(spans[2])spans[2].lastChild.textContent=' Improved path'}
    const head=svg.closest('.ei-v12-chart-wrap')?.querySelector('.ei-v12-chart-head p');if(head)head.textContent='Current path versus a benchmark path and an improved scenario. Endpoint labels are separated automatically for readability.';
  }
  function scan(){$$('.ei-v12-chart').forEach(polish)}
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})}
  const out=document.querySelector('[data-check-output]')||document.body;new MutationObserver(schedule).observe(out,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
