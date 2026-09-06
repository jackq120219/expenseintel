(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
  const value=id=>Number($(`#${id}`)?.value)||0;
  const form=()=> $('[data-fairprice-form]');
  let allowNoBenchmark=false, lastPrompt='';

  function numberize(raw,suffix=''){
    let n=Number(String(raw||'').replace(/,/g,''));
    if(!Number.isFinite(n))return 0;
    if(/k/i.test(suffix))n*=1000;
    if(/m/i.test(suffix))n*=1000000;
    return n;
  }
  function currencyTokens(text){
    const out=[],seen=new Set(),rx=/\$\s*([\d,.]+(?:\.\d+)?)\s*([kKmM])?|([\d,.]+(?:\.\d+)?)\s*([kKmM])?\s*\$/g;
    let m;while((m=rx.exec(text))){const raw=m[1]||m[3],suf=m[2]||m[4]||'',n=numberize(raw,suf);if(!n)continue;const key=`${m.index}:${n}`;if(seen.has(key))continue;seen.add(key);out.push({value:n,index:m.index,end:rx.lastIndex,raw:m[0]})}
    return out;
  }
  function contextScore(text,t){
    const before=text.slice(Math.max(0,t.index-45),t.index).toLowerCase(),after=text.slice(t.end,Math.min(text.length,t.end+45)).toLowerCase(),ctx=`${before} ${after}`;
    let s=0;if(/quote|quoted|estimate|bid|proposal|total|price/.test(ctx))s+=4;if(/deposit|down payment|monthly|per month|sq\s*ft|square feet|sf\b/.test(ctx))s-=3;if(/benchmark|range|typical|market/.test(ctx))s-=2;if(/another|other|second|third|comparable/.test(ctx))s-=1;return s;
  }
  function parseRange(text){
    const rx=/(?:benchmark|typical|normal|market|fair|range|between)[^\d$]{0,30}\$?\s*([\d,.]+)\s*([kKmM])?\s*(?:-|–|—|to|and)\s*\$?\s*([\d,.]+)\s*([kKmM])?/i,m=text.match(rx);
    if(!m)return null;const a=numberize(m[1],m[2]),b=numberize(m[3],m[4]);return a&&b?{low:Math.min(a,b),high:Math.max(a,b),raw:m[0]}:null;
  }
  function parseScope(text){
    let m=text.match(/(?:scope(?:\s+completeness)?|complete(?:ness)?)[^\d]{0,14}(\d{1,3})\s*%/i)||text.match(/(\d{1,3})\s*%[^.]{0,12}(?:scope|complete)/i);
    if(!m)return null;const n=Math.max(1,Math.min(100,Number(m[1])));return Number.isFinite(n)?n:null;
  }
  function parsePrompt(text){
    text=String(text||'').trim();const tokens=currencyTokens(text),range=parseRange(text),scope=parseScope(text);let quote=0;
    if(tokens.length){const ranked=tokens.map((t,i)=>({...t,score:contextScore(text,t),i})).sort((a,b)=>b.score-a.score||a.i-b.i);quote=ranked[0].value}
    if(!quote){const m=text.match(/(?:quote|quoted|estimate|bid|proposal|total|price)\D{0,24}([\d,.]+)\s*([kKmM])?\b/i);if(m)quote=numberize(m[1],m[2])}
    const used=new Set();if(quote){const hit=tokens.find(t=>t.value===quote);if(hit)used.add(hit.index)}
    if(range){for(const t of tokens){if(t.value===range.low||t.value===range.high)used.add(t.index)}}
    const comps=tokens.filter(t=>!used.has(t.index)).map(t=>t.value).filter((n,i,a)=>n>0&&n!==quote&&a.indexOf(n)===i).slice(0,3);
    return {quote,range,scope,comps,tokens};
  }
  function setAuto(id,v,force=false){const el=$(`#${id}`);if(!el||v==null||v==='')return false;if(!force&&el.dataset.userEdited==='1')return false;el.value=String(v);el.dataset.autoFilled='1';return true}
  function markManual(){['fp-quote','fp-scope','fp-low','fp-high','fp-comp1','fp-comp2','fp-comp3'].forEach(id=>{$(`#${id}`)?.addEventListener('input',e=>{if(e.isTrusted){e.currentTarget.dataset.userEdited='1';delete e.currentTarget.dataset.autoFilled}updateUI()})})}
  function applyParsed(parsed,{forceQuote=false}={}){
    if(parsed.quote)setAuto('fp-quote',parsed.quote,forceQuote);
    if(parsed.range){setAuto('fp-low',parsed.range.low);setAuto('fp-high',parsed.range.high)}
    if(parsed.scope)setAuto('fp-scope',parsed.scope);
    parsed.comps.forEach((n,i)=>setAuto(`fp-comp${i+1}`,n));
  }
  function currentEvidence(){const low=value('fp-low'),high=value('fp-high'),comps=[value('fp-comp1'),value('fp-comp2'),value('fp-comp3')].filter(Boolean);return{quote:value('fp-quote'),low,high,comps,hasRange:low>0&&high>=low,hasBenchmark:(low>0&&high>=low)||comps.length>0,scope:value('fp-scope')||100}}
  function chip(label,val,kind='good'){return `<span class="fp-chip ${kind}">${label}<strong>${val}</strong></span>`}
  function renderUnderstood(parsed){const box=$('[data-fp-understood]');if(!box)return;const e=currentEvidence(),parts=[];if(e.quote)parts.push(chip('Quote',money(e.quote)));else parts.push(chip('Quote','Not found','missing'));if(e.hasRange)parts.push(chip('Fair range',`${money(e.low)}–${money(e.high)}`));if(e.comps.length)parts.push(chip('Comparables',`${e.comps.length} detected`));if(parsed.scope)parts.push(chip('Scope',`${parsed.scope}%`));else parts.push(chip('Scope','No adjustment','missing'));box.innerHTML=parts.join('')}
  function questionMarkup(kind){const e=currentEvidence();
    if(kind==='quote')return `<div class="fp-q-kicker">One thing missing</div><strong>What is the total quoted price?</strong><p>I understood the job, but I could not confidently find the dollar amount. Give me just the total and I will keep everything else.</p><div class="fp-q-entry"><input type="number" min="0" step="100" data-fp-q-price placeholder="15000"><button type="button" data-fp-use-price>Use price</button></div>`;
    if(kind==='benchmark')return `<div class="fp-q-kicker">One useful comparison</div><strong>Do you have another quote or a typical range?</strong><p>To call a price low, fair or high, ExpenseIntel needs at least one quote-specific price reference. You do not need to fill the whole form.</p><div class="fp-q-actions"><button type="button" class="primary" data-fp-q-mode="comp">I have another quote</button><button type="button" data-fp-q-mode="range">I know a range</button><button type="button" data-fp-no-benchmark>I don't have one</button></div><div data-fp-q-entry></div>`;
    if(kind==='none')return `<div class="fp-q-kicker">No benchmark available</div><strong>I can still show context, but I will not pretend the quote is fair.</strong><p>ExpenseIntel will keep the price position unresolved until you add a comparable quote or a real benchmark range.</p>`;
    return ''}
  function showQuestion(kind){const box=$('[data-fp-question]');if(!box)return;box.hidden=false;box.innerHTML=questionMarkup(kind);
    $('[data-fp-use-price]',box)?.addEventListener('click',()=>{const n=Number($('[data-fp-q-price]',box)?.value)||0;if(n){setAuto('fp-quote',n,true);updateUI();box.hidden=true}});
    $$('[data-fp-q-mode]',box).forEach(btn=>btn.addEventListener('click',()=>{const entry=$('[data-fp-q-entry]',box);if(btn.dataset.fpQMode==='comp')entry.innerHTML=`<div class="fp-q-entry"><input type="number" min="0" step="100" data-fp-q-comp placeholder="Another quote"><button type="button" data-fp-use-comp>Use quote</button></div>`;else entry.innerHTML=`<div class="fp-q-entry double"><input type="number" min="0" step="100" data-fp-q-low placeholder="Typical low"><input type="number" min="0" step="100" data-fp-q-high placeholder="Typical high"><button type="button" data-fp-use-range>Use range</button></div>`;
      $('[data-fp-use-comp]',entry)?.addEventListener('click',()=>{const n=Number($('[data-fp-q-comp]',entry)?.value)||0;if(n){const target=['fp-comp1','fp-comp2','fp-comp3'].find(id=>!value(id));if(target)setAuto(target,n,true);updateUI();box.hidden=true}});
      $('[data-fp-use-range]',entry)?.addEventListener('click',()=>{const a=Number($('[data-fp-q-low]',entry)?.value)||0,b=Number($('[data-fp-q-high]',entry)?.value)||0;if(a&&b){setAuto('fp-low',Math.min(a,b),true);setAuto('fp-high',Math.max(a,b),true);updateUI();box.hidden=true}})}));
    $('[data-fp-no-benchmark]',box)?.addEventListener('click',()=>{allowNoBenchmark=true;showQuestion('none');updateRunLabel();setTimeout(()=>form()?.requestSubmit(),120)})
  }
  function hideQuestion(){const box=$('[data-fp-question]');if(box){box.hidden=true;box.innerHTML=''}}
  function updateRunLabel(){const e=currentEvidence(),lab=$('[data-fp-run-label]'),btn=$('.fp-smart-form .si-run');if(!lab)return;if(!e.quote){lab.textContent='Continue — one detail needed';btn?.classList.add('is-question')}else if(!e.hasBenchmark&&!allowNoBenchmark){lab.textContent='Continue — one comparison needed';btn?.classList.add('is-question')}else if(!e.hasBenchmark&&allowNoBenchmark){lab.textContent='Show available context';btn?.classList.remove('is-question')}else{lab.textContent='Check Fair Price';btn?.classList.remove('is-question')}}
  function updateUI(){const prompt=$('#fp-label')?.value||'',parsed=parsePrompt(prompt);applyParsed(parsed);renderUnderstood(parsed);updateRunLabel();const e=currentEvidence();if(e.quote&&e.hasBenchmark)hideQuestion()}
  function initialHydrate(){const qs=new URLSearchParams(location.search),q=qs.get('q')||'',label=$('#fp-label');if(q&&label)label.value=q;const prompt=(q||label?.value||'').trim(),parsed=parsePrompt(prompt);if(prompt){applyParsed(parsed,{forceQuote:!!parsed.quote});lastPrompt=prompt}renderUnderstood(parsed);updateRunLabel()}
  function interceptSubmit(e){const prompt=$('#fp-label')?.value||'',parsed=parsePrompt(prompt);applyParsed(parsed,{forceQuote:false});renderUnderstood(parsed);const ev=currentEvidence();if(!ev.quote){e.preventDefault();e.stopImmediatePropagation();showQuestion('quote');updateRunLabel();return}if(!ev.hasBenchmark&&!allowNoBenchmark){e.preventDefault();e.stopImmediatePropagation();showQuestion('benchmark');updateRunLabel();return}hideQuestion()}
  function $$(s,r=document){return [...r.querySelectorAll(s)]}
  document.addEventListener('DOMContentLoaded',()=>{const f=form();if(!f)return;markManual();initialHydrate();$('#fp-label')?.addEventListener('input',()=>{const p=$('#fp-label').value;if(p!==lastPrompt){lastPrompt=p;allowNoBenchmark=false}updateUI()});f.addEventListener('submit',interceptSubmit,true);setTimeout(updateUI,120)});
})();