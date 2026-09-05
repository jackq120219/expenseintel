const EI = (() => {
  const TYPE_BASE = {
    restaurant: 28.6,
    retail: 16.4,
    office: 14.2,
    warehouse: 8.4,
    industrial: 11.8,
    multifamily: 10.6,
    residential: 7.8,
    other: 13.2
  };

  const MIX = {
    restaurant: [0.225,0.09,0.06,0.335,0.145,0.145],
    retail: [0.20,0.055,0.035,0.34,0.18,0.19],
    office: [0.19,0.04,0.035,0.35,0.20,0.185],
    warehouse: [0.15,0.07,0.025,0.38,0.19,0.185],
    industrial: [0.24,0.11,0.045,0.29,0.15,0.165],
    multifamily: [0.18,0.09,0.08,0.31,0.19,0.15],
    residential: [0.22,0.12,0.09,0.24,0.18,0.15],
    other: [0.20,0.07,0.045,0.32,0.18,0.185]
  };

  const USE_GROWTH = {
    restaurant: 0.006,
    retail: 0.002,
    office: 0.001,
    warehouse: 0,
    industrial: 0.005,
    multifamily: 0.002,
    residential: 0.002,
    other: 0.002
  };

  const USE_RISK = {
    restaurant: 8,
    retail: 4,
    office: 3,
    warehouse: 1,
    industrial: 7,
    multifamily: 3,
    residential: 2,
    other: 4
  };

  const REGIONS = {
    northeast: { states: ['ME','NH','VT','MA','RI','CT','NY','NJ','PA'], factor: 1.07, growth: 0.045, label: 'Northeast' },
    midwest: { states: ['OH','IN','IL','MI','WI','IA','MN','MO','KS','NE','SD','ND'], factor: 0.94, growth: 0.034, label: 'Midwest' },
    south: { states: ['DE','MD','DC','VA','WV','NC','SC','GA','FL','KY','TN','MS','AL','OK','TX','AR','LA'], factor: 0.96, growth: 0.038, label: 'South' },
    west: { states: ['MT','ID','WY','CO','NM','AZ','UT','NV','WA','OR','CA','AK','HI'], factor: 1.05, growth: 0.042, label: 'West' }
  };

  const resolvedByInput = new WeakMap();
  const searchState = new WeakMap();

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function money(n, compact=false){
    const value = Number.isFinite(Number(n)) ? Number(n) : 0;
    if(compact && Math.abs(value) >= 1000) return '$' + (value/1000).toFixed(1) + 'k';
    return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  }

  function approxMoney(n, compact=false){ return '~' + money(n, compact); }

  function regionFor(state){
    const code = String(state || '').toUpperCase();
    return Object.values(REGIONS).find(r => r.states.includes(code)) || {factor:1,growth:0.04,label:'U.S.'};
  }

  function estimate(address, use, sqft, location=null){
    use = TYPE_BASE[use] ? use : 'other';
    sqft = clamp(Number(sqft) || 5000, 300, 10000000);
    const cleanAddress = String(location?.label || address || '').trim();
    const region = regionFor(location?.components?.state);
    const total = Math.round(TYPE_BASE[use] * sqft * region.factor / 100) * 100;
    const mix = MIX[use];
    const categories = {
      electric: Math.round(total*mix[0]/100)*100,
      gas: Math.round(total*mix[1]/100)*100,
      water: Math.round(total*mix[2]/100)*100,
      tax: Math.round(total*mix[3]/100)*100,
      insurance: Math.round(total*mix[4]/100)*100,
      other: 0
    };
    categories.other = total - Object.values(categories).reduce((a,b)=>a+b,0);
    const growth = clamp(region.growth + USE_GROWTH[use], 0.02, 0.075);
    const risk = Math.round(clamp(47 + ((growth - 0.03) * 500) + USE_RISK[use], 35, 88));
    const uncertainty = location?.verified ? 0.13 : 0.20;
    return {
      address: cleanAddress || String(address || 'Unresolved location'),
      use,
      sqft,
      total,
      perSqft: total/sqft,
      next: Math.round(total*(1+growth)/100)*100,
      year3: Math.round(total*Math.pow(1+growth,3)/100)*100,
      rangeLow: Math.round(total*(1-uncertainty)/100)*100,
      rangeHigh: Math.round(total*(1+uncertainty)/100)*100,
      uncertainty,
      growth,
      risk,
      categories,
      location,
      region: region.label,
      sources: {
        address: location?.verified ? location.provider : 'Unverified',
        geography: location?.verified ? 'Resolved geography' : 'Unverified',
        building: 'User supplied',
        costs: 'Modeled assumptions'
      }
    };
  }

  function riskLabel(score){
    if(score >= 72) return 'Elevated';
    if(score >= 58) return 'Moderate';
    return 'Lower';
  }

  function safeSave(key, value){ try{ sessionStorage.setItem(key, value); }catch(_e){} }
  function safeRead(key){ try{ return sessionStorage.getItem(key); }catch(_e){ return null; } }

  function ensureTrustStyles(){
    if(document.querySelector('link[data-ei-trust]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet'; link.href='/trust.css'; link.dataset.eiTrust='';
    document.head.appendChild(link);
  }

  function toggleNav(){
    const nav = document.querySelector('.site-nav');
    if(nav) nav.classList.toggle('open');
  }

  function bindNav(){
    document.querySelectorAll('[data-menu]').forEach(btn => btn.addEventListener('click', toggleNav));
    document.querySelectorAll('.navlinks a').forEach(a => a.addEventListener('click',()=>{
      const nav=document.querySelector('.site-nav');
      if(nav) nav.classList.remove('open');
    }));
  }

  function bindScreenCTAs(){
    document.querySelectorAll('a.solidbtn, a.outlinebtn').forEach(link => {
      const text=(link.textContent || '').toLowerCase();
      const href = link.getAttribute('href') || '';
      if(text.includes('screen') && (href === '#analyze' || href === '/#analyze' || href === '#screen-form')){
        link.setAttribute('href','/screen/');
      }
    });
  }

  function resolverParts(input){
    let wrap=input.closest('.address-resolver');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='address-resolver';
      input.parentNode.insertBefore(wrap,input);
      wrap.appendChild(input);
    }
    let list=wrap.querySelector('.address-suggestions');
    if(!list){
      list=document.createElement('div');
      list.className='address-suggestions';
      list.setAttribute('role','listbox');
      wrap.appendChild(list);
    }
    let status=wrap.nextElementSibling;
    if(!status || !status.classList.contains('address-status')){
      status=document.createElement('div');
      status.className='address-status';
      status.textContent='Type a full U.S. street address, city, state or ZIP.';
      wrap.insertAdjacentElement('afterend',status);
    }
    return {wrap,list,status};
  }

  function setAddressStatus(input, message, kind=''){
    const {status}=resolverParts(input);
    status.className='address-status'+(kind?' '+kind:'');
    status.textContent=message;
  }

  function closeSuggestions(input){
    const {list}=resolverParts(input);
    list.classList.remove('show');
    input.setAttribute('aria-expanded','false');
  }

  function locationSummary(match){
    const c=match?.components || {};
    const locality=[c.city,c.state,c.zip].filter(Boolean).join(', ').replace(', '+c.zip,' '+c.zip);
    const parts=[locality,c.county].filter(Boolean);
    return parts.join(' · ');
  }

  async function fetchAddress(query, placeId, signal){
    const url=new URL('/api/address',location.origin);
    if(placeId) url.searchParams.set('placeId',placeId);
    else url.searchParams.set('q',query);
    const response=await fetch(url,{signal,headers:{'Accept':'application/json'}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.ok) throw new Error(data.error || 'Address verification failed.');
    return data;
  }

  async function resolveSuggestion(input, suggestion){
    let match=suggestion;
    if(suggestion.needsDetails && suggestion.placeId){
      setAddressStatus(input,'Resolving selected address…','searching');
      const data=await fetchAddress('',suggestion.placeId);
      match=data.suggestions?.[0];
      if(!match) throw new Error('Could not resolve that address.');
    }
    input.value=match.label;
    resolvedByInput.set(input,{...match,selectedValue:match.label});
    setAddressStatus(input,`Address resolved · ${locationSummary(match)} · ${match.provider}`,'verified');
    closeSuggestions(input);
    input.dispatchEvent(new CustomEvent('ei:address-resolved',{bubbles:true,detail:match}));
    return match;
  }

  function renderSuggestions(input, suggestions){
    const {list}=resolverParts(input);
    list.innerHTML='';
    if(!Array.isArray(suggestions) || !suggestions.length){
      closeSuggestions(input);
      return;
    }
    suggestions.slice(0,5).forEach((s,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='address-option';
      button.setAttribute('role','option');
      button.innerHTML=`<span class="pin">${index+1}</span><span><strong></strong><small></small></span>`;
      button.querySelector('strong').textContent=s.label;
      button.querySelector('small').textContent=s.needsDetails ? s.provider : [locationSummary(s),s.provider].filter(Boolean).join(' · ');
      button.addEventListener('mousedown',e=>e.preventDefault());
      button.addEventListener('click',async()=>{
        try{ await resolveSuggestion(input,s); }
        catch(error){ setAddressStatus(input,error.message,'error'); }
      });
      list.appendChild(button);
    });
    list.classList.add('show');
    input.setAttribute('aria-expanded','true');
  }

  function scheduleAddressSearch(input){
    const current=searchState.get(input) || {};
    if(current.timer) clearTimeout(current.timer);
    if(current.controller) current.controller.abort();
    const query=input.value.trim();
    if(query.length < 8){
      closeSuggestions(input);
      setAddressStatus(input,'Type a full U.S. street address, city, state or ZIP.');
      searchState.set(input,{});
      return;
    }
    const timer=setTimeout(async()=>{
      const controller=new AbortController();
      searchState.set(input,{controller});
      setAddressStatus(input,'Checking the address against authoritative location data…','searching');
      try{
        const data=await fetchAddress(query,'',controller.signal);
        if(input.value.trim()!==query) return;
        if(data.suggestions?.length){
          renderSuggestions(input,data.suggestions);
          setAddressStatus(input,'Choose the verified address below to lock the location.','searching');
        }else{
          closeSuggestions(input);
          setAddressStatus(input,data.message || 'No verified match yet. Add city, state, or ZIP.','error');
        }
      }catch(error){
        if(error.name!=='AbortError') setAddressStatus(input,error.message,'error');
      }
    },550);
    searchState.set(input,{timer});
  }

  function attachAddressResolver(input){
    if(!input || input.dataset.eiResolver==='1') return;
    input.dataset.eiResolver='1';
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-expanded','false');
    resolverParts(input);
    input.addEventListener('input',()=>{
      const selected=resolvedByInput.get(input);
      if(selected && input.value.trim()!==selected.selectedValue) resolvedByInput.delete(input);
      scheduleAddressSearch(input);
    });
    input.addEventListener('focus',()=>{
      const selected=resolvedByInput.get(input);
      if(selected && input.value.trim()===selected.selectedValue){
        setAddressStatus(input,`Address resolved · ${locationSummary(selected)} · ${selected.provider}`,'verified');
      }
    });
    input.addEventListener('blur',()=>setTimeout(()=>closeSuggestions(input),160));
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape') closeSuggestions(input);
    });
  }

  function bindAddressResolvers(){
    document.querySelectorAll('input[name="address"],input[name="addressA"],input[name="addressB"]').forEach(attachAddressResolver);
  }

  async function requireResolvedAddress(input){
    const query=input.value.trim();
    const selected=resolvedByInput.get(input);
    if(selected && selected.selectedValue===query) return selected;
    if(!query){
      setAddressStatus(input,'Enter a property address before screening.','error');
      input.focus();
      return null;
    }
    setAddressStatus(input,'Verifying address before calculating…','searching');
    try{
      const data=await fetchAddress(query,'');
      const suggestions=data.suggestions || [];
      if(suggestions.length===1){
        return await resolveSuggestion(input,suggestions[0]);
      }
      const exact=suggestions.find(s=>String(s.label).toLowerCase()===query.toLowerCase());
      if(exact) return await resolveSuggestion(input,exact);
      if(suggestions.length){
        renderSuggestions(input,suggestions);
        setAddressStatus(input,'Multiple matches found. Choose the correct verified address.','error');
      }else{
        setAddressStatus(input,'We could not verify this address. Add the city, state, or ZIP and try again.','error');
      }
      input.focus();
      return null;
    }catch(error){
      setAddressStatus(input,error.message || 'Address verification failed.','error');
      return null;
    }
  }

  function setScreenError(form,message=''){
    let error=form.querySelector('.screen-error');
    if(!error){
      error=document.createElement('div');
      error.className='screen-error';
      error.setAttribute('role','alert');
      form.appendChild(error);
    }
    error.textContent=message;
    error.classList.toggle('show',Boolean(message));
  }

  function fillFullResult(r){
    const full = document.querySelector('[data-full-result]');
    if(!full) return;
    const set=(sel,val)=>{const el=full.querySelector(sel);if(el)el.textContent=val};
    const c=r.location?.components || {};
    set('[data-full-address]',r.address);
    set('[data-full-locationmeta]',[locationSummary(r.location),r.location?.coordinates?.lat && r.location?.coordinates?.lon ? `${r.location.coordinates.lat.toFixed(5)}, ${r.location.coordinates.lon.toFixed(5)}` : ''].filter(Boolean).join(' · '));
    set('[data-full-total]',approxMoney(r.total));
    set('[data-full-range]',`${money(r.rangeLow)}–${money(r.rangeHigh)} modeled range (±${Math.round(r.uncertainty*100)}%)`);
    set('[data-full-psf]','~$'+r.perSqft.toFixed(2));
    set('[data-full-risk]',String(r.risk));
    set('[data-full-risk-label]',riskLabel(r.risk));
    set('[data-full-electric]',approxMoney(r.categories.electric,true));
    set('[data-full-gas]',approxMoney(r.categories.gas,true));
    set('[data-full-water]',approxMoney(r.categories.water,true));
    set('[data-full-tax]',approxMoney(r.categories.tax,true));
    set('[data-full-insurance]',approxMoney(r.categories.insurance,true));
    set('[data-full-other]',approxMoney(r.categories.other,true));
    set('[data-full-now]',approxMoney(r.total,true));
    set('[data-full-next]',approxMoney(r.next,true));
    set('[data-full-year3]',approxMoney(r.year3,true));
    set('[data-full-growth]',`The preliminary model applies a ${r.region} regional cost profile and ${r.use} operating-use assumptions, implying approximately ${(r.growth*100).toFixed(1)}% annual movement from ${money(r.total)} today to ${money(r.year3)} in year three.`);
    set('[data-trust-address]',r.location?.provider || 'Unverified');
    set('[data-trust-geo]',[c.county,c.state].filter(Boolean).join(' · ') || 'Resolved geography');
    set('[data-trust-building]',`${r.sqft.toLocaleString()} ft² · ${r.use}`);
    set('[data-trust-costs]','Modeled · live tariff layer pending');

    const verified=full.querySelector('[data-result-state]');
    if(verified) verified.textContent=r.location?.verified ? 'Address verified' : 'Unverified address';

    const pin=full.querySelector('[data-risk-pin]');
    if(pin) pin.style.marginLeft=clamp(r.risk,2,98)+'%';

    const compare=full.querySelector('[data-full-compare]');
    if(compare){
      const q=new URLSearchParams({address:r.address,use:r.use,sqft:String(r.sqft)});
      compare.href='/compare/?'+q.toString();
    }

    const empty=document.querySelector('[data-screen-empty]');
    if(empty) empty.classList.add('hide');
    full.classList.add('show');
    requestAnimationFrame(()=>full.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function fillQuickResult(root,r){
    const result=root.querySelector('[data-quick-result]');
    if(!result) return;
    result.classList.add('show');
    const set=(sel,val)=>{const el=result.querySelector(sel);if(el)el.textContent=val};
    set('[data-r-address]',r.address);
    set('[data-r-total]',approxMoney(r.total));
    set('[data-r-delta]',`12-mo model +${(r.growth*100).toFixed(1)}% · address verified`);
    set('[data-r-electric]',approxMoney(r.categories.electric,true));
    set('[data-r-gas]',approxMoney(r.categories.gas,true));
    set('[data-r-water]',approxMoney(r.categories.water,true));
    set('[data-r-other]',approxMoney(r.categories.tax+r.categories.insurance+r.categories.other,true));
    const detail=root.querySelector('[data-open-compare]');
    if(detail){
      const q=new URLSearchParams({address:r.address,use:r.use,sqft:String(r.sqft)});
      detail.href='/compare/?'+q.toString();
      detail.style.display='inline-flex';
      detail.textContent='Compare this verified location →';
    }
  }

  function bindScreen(){
    document.querySelectorAll('[data-screen-form]').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const addressInput=form.querySelector('[name="address"]');
        const useInput=form.querySelector('[name="use"]');
        const sqftInput=form.querySelector('[name="sqft"]');
        if(!addressInput || !useInput || !sqftInput) return;

        const sqft=Number(sqftInput.value);
        if(!Number.isFinite(sqft) || sqft < 300 || sqft > 10000000){
          setScreenError(form,'Square footage must be between 300 and 10,000,000 ft².');
          sqftInput.focus();
          return;
        }
        setScreenError(form,'');
        const button=form.querySelector('button[type="submit"]');
        if(button){ button.classList.add('loading-btn'); button.disabled=true; }
        try{
          const locationMatch=await requireResolvedAddress(addressInput);
          if(!locationMatch) return;
          const r=estimate(locationMatch.label,useInput.value,sqft,locationMatch);
          safeSave('ei_last',JSON.stringify({address:r.address,use:r.use,sqft:String(r.sqft),location:r.location}));
          fillQuickResult(form.closest('.search-panel') || document,r);
          fillFullResult(r);
        }finally{
          if(button){ button.classList.remove('loading-btn'); button.disabled=false; }
        }
      });
    });
  }

  function restoreResolved(input,locationData){
    if(!input || !locationData?.verified || !locationData.label) return;
    input.value=locationData.label;
    resolvedByInput.set(input,{...locationData,selectedValue:locationData.label});
    setAddressStatus(input,`Address resolved · ${locationSummary(locationData)} · ${locationData.provider}`,'verified');
  }

  function populateScreenFromQuery(){
    const form=document.querySelector('[data-screen-form]');
    if(!form) return;
    const q=new URLSearchParams(location.search);
    const raw=safeRead('ei_last');
    let saved=null;
    try{ saved=raw ? JSON.parse(raw) : null; }catch(_e){}
    const address=q.get('address') || '';
    const use=q.get('use') || '';
    const sqft=q.get('sqft') || '';
    const addressInput=form.querySelector('[name="address"]');
    if(address && addressInput) addressInput.value=address;
    if(use && TYPE_BASE[use] && form.querySelector('[name="use"]')) form.querySelector('[name="use"]').value=use;
    if(sqft && form.querySelector('[name="sqft"]')) form.querySelector('[name="sqft"]').value=sqft;
    if(location.pathname.startsWith('/screen/') && !address && saved){
      if(addressInput) addressInput.value=saved.address || '';
      if(TYPE_BASE[saved.use] && form.querySelector('[name="use"]')) form.querySelector('[name="use"]').value=saved.use;
      if(form.querySelector('[name="sqft"]')) form.querySelector('[name="sqft"]').value=saved.sqft || '7500';
      if(saved.location) restoreResolved(addressInput,saved.location);
    }
  }

  function populateFromQuery(){
    const formA=document.querySelector('[data-compare-a]');
    if(!formA) return;
    const q=new URLSearchParams(location.search);
    const raw=safeRead('ei_last');
    let saved=null;
    try{ saved=raw ? JSON.parse(raw) : null; }catch(_e){}
    const data={
      address:q.get('address') || saved?.address || '',
      use:q.get('use') || saved?.use || 'restaurant',
      sqft:q.get('sqft') || saved?.sqft || '7500'
    };
    const addressA=formA.querySelector('[name="addressA"]');
    addressA.value=data.address;
    formA.querySelector('[name="useA"]').value=TYPE_BASE[data.use] ? data.use : 'restaurant';
    formA.querySelector('[name="sqftA"]').value=data.sqft;
    if(saved?.location && saved.address===data.address) restoreResolved(addressA,saved.location);
  }

  function renderCompare(a,b){
    const out=document.querySelector('[data-compare-output]');
    if(!out) return;
    out.classList.add('show');
    const lower = a.total <= b.total ? 'A' : 'B';
    const diff = Math.abs(a.total-b.total);
    const set=(sel,val)=>{const el=out.querySelector(sel);if(el)el.textContent=val};
    set('[data-a-address]',a.address); set('[data-b-address]',b.address);
    set('[data-a-total]',approxMoney(a.total)); set('[data-b-total]',approxMoney(b.total));
    set('[data-a-psf]','~$'+a.perSqft.toFixed(2)); set('[data-b-psf]','~$'+b.perSqft.toFixed(2));
    set('[data-a-year3]',approxMoney(a.year3)); set('[data-b-year3]',approxMoney(b.year3));
    set('[data-a-risk]',a.risk+'/100'); set('[data-b-risk]',b.risk+'/100');
    set('[data-a-electric]',approxMoney(a.categories.electric,true)); set('[data-b-electric]',approxMoney(b.categories.electric,true));
    set('[data-a-tax]',approxMoney(a.categories.tax,true)); set('[data-b-tax]',approxMoney(b.categories.tax,true));
    set('[data-diff]',approxMoney(diff)+' / year');
    set('[data-winner]','Option '+lower+' has the lower preliminary modeled cost');
    out.querySelectorAll('[data-win]').forEach(el=>el.remove());
    const card=out.querySelector(lower==='A'?'[data-card-a]':'[data-card-b]');
    if(card){
      const win=document.createElement('div');
      win.className='winner'; win.dataset.win='';
      win.innerHTML='<span>Lower modeled cost</span><span>✓</span>';
      card.appendChild(win);
    }
    out.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function bindCompare(){
    const trigger=document.querySelector('[data-run-compare]');
    if(!trigger) return;
    trigger.addEventListener('click',async()=>{
      const fa=document.querySelector('[data-compare-a]');
      const fb=document.querySelector('[data-compare-b]');
      if(!fa || !fb) return;
      const aInput=fa.querySelector('[name="addressA"]');
      const bInput=fb.querySelector('[name="addressB"]');
      const aSq=Number(fa.querySelector('[name="sqftA"]').value);
      const bSq=Number(fb.querySelector('[name="sqftB"]').value);
      if(!Number.isFinite(aSq)||aSq<300){fa.querySelector('[name="sqftA"]').focus();return;}
      if(!Number.isFinite(bSq)||bSq<300){fb.querySelector('[name="sqftB"]').focus();return;}
      trigger.disabled=true; trigger.classList.add('loading-btn');
      try{
        const [locA,locB]=await Promise.all([requireResolvedAddress(aInput),requireResolvedAddress(bInput)]);
        if(!locA || !locB) return;
        const A=estimate(locA.label,fa.querySelector('[name="useA"]').value,aSq,locA);
        const B=estimate(locB.label,fb.querySelector('[name="useB"]').value,bSq,locB);
        renderCompare(A,B);
      }finally{
        trigger.disabled=false; trigger.classList.remove('loading-btn');
      }
    });
  }

  function year(){ document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear()); }

  function init(){
    ensureTrustStyles();
    bindNav();
    bindScreenCTAs();
    bindAddressResolvers();
    populateScreenFromQuery();
    bindScreen();
    populateFromQuery();
    bindCompare();
    year();
  }

  return {init,estimate,money,requireResolvedAddress};
})();

document.addEventListener('DOMContentLoaded',EI.init);
