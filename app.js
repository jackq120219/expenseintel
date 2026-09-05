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

  function hash(str=''){
    let h = 2166136261;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
    }
    return Math.abs(h >>> 0);
  }

  function money(n, compact=false){
    if(compact && n >= 1000) return '$' + (n/1000).toFixed(n >= 100000 ? 1 : 1) + 'k';
    return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  }

  function estimate(address, use, sqft){
    use = TYPE_BASE[use] ? use : 'other';
    sqft = Math.max(300, Number(sqft) || 5000);
    const h = hash((address || 'sample') + use);
    const locationFactor = 0.89 + (h % 2300)/10000;
    const total = Math.round(TYPE_BASE[use] * sqft * locationFactor / 100) * 100;
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
    const growth = 0.038 + ((h>>5)%32)/1000;
    const risk = 47 + ((h>>9)%31);
    return {
      address: address || 'Sample location', use, sqft, total,
      perSqft: total/sqft,
      next: Math.round(total*(1+growth)/100)*100,
      year3: Math.round(total*Math.pow(1+growth,3)/100)*100,
      growth, risk,
      categories
    };
  }

  function toggleNav(){
    const nav = document.querySelector('.site-nav');
    if(nav) nav.classList.toggle('open');
  }

  function bindNav(){
    document.querySelectorAll('[data-menu]').forEach(btn => btn.addEventListener('click', toggleNav));
    document.querySelectorAll('.navlinks a').forEach(a => a.addEventListener('click',()=>{
      const nav=document.querySelector('.site-nav'); if(nav) nav.classList.remove('open');
    }));
  }

  function bindScreen(){
    document.querySelectorAll('[data-screen-form]').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const address = form.querySelector('[name="address"]').value.trim();
        const use = form.querySelector('[name="use"]').value;
        const sqft = form.querySelector('[name="sqft"]').value;
        if(!address){ form.querySelector('[name="address"]').focus(); return; }
        const r = estimate(address,use,sqft);
        sessionStorage.setItem('ei_last',JSON.stringify({address,use,sqft}));
        const root = form.closest('.search-panel') || document;
        const result = root.querySelector('[data-quick-result]');
        if(result){
          result.classList.add('show');
          const set=(sel,val)=>{const el=result.querySelector(sel);if(el)el.textContent=val};
          set('[data-r-address]',r.address);
          set('[data-r-total]',money(r.total));
          set('[data-r-delta]','12-mo model +' + (r.growth*100).toFixed(1) + '%');
          set('[data-r-electric]',money(r.categories.electric,true));
          set('[data-r-gas]',money(r.categories.gas,true));
          set('[data-r-water]',money(r.categories.water,true));
          set('[data-r-other]',money(r.categories.tax+r.categories.insurance+r.categories.other,true));
        }
        const detail = root.querySelector('[data-open-compare]');
        if(detail){
          const q = new URLSearchParams({address,use,sqft:String(sqft||5000)});
          detail.href='/compare/?'+q.toString();
          detail.style.display='inline-flex';
        }
      });
    });
  }

  function populateFromQuery(){
    const formA=document.querySelector('[data-compare-a]');
    if(!formA) return;
    const q=new URLSearchParams(location.search);
    const saved=(()=>{try{return JSON.parse(sessionStorage.getItem('ei_last')||'null')}catch{return null}})();
    const data={
      address:q.get('address') || saved?.address || '',
      use:q.get('use') || saved?.use || 'restaurant',
      sqft:q.get('sqft') || saved?.sqft || '7500'
    };
    formA.querySelector('[name="addressA"]').value=data.address;
    formA.querySelector('[name="useA"]').value=data.use;
    formA.querySelector('[name="sqftA"]').value=data.sqft;
  }

  function renderCompare(a,b){
    const out=document.querySelector('[data-compare-output]');
    if(!out) return;
    out.classList.add('show');
    const lower = a.total <= b.total ? 'A' : 'B';
    const diff = Math.abs(a.total-b.total);
    const set=(sel,val)=>{const el=out.querySelector(sel);if(el)el.textContent=val};
    set('[data-a-address]',a.address); set('[data-b-address]',b.address);
    set('[data-a-total]',money(a.total)); set('[data-b-total]',money(b.total));
    set('[data-a-psf]','$'+a.perSqft.toFixed(2)); set('[data-b-psf]','$'+b.perSqft.toFixed(2));
    set('[data-a-year3]',money(a.year3)); set('[data-b-year3]',money(b.year3));
    set('[data-a-risk]',a.risk+'/100'); set('[data-b-risk]',b.risk+'/100');
    set('[data-a-electric]',money(a.categories.electric,true)); set('[data-b-electric]',money(b.categories.electric,true));
    set('[data-a-tax]',money(a.categories.tax,true)); set('[data-b-tax]',money(b.categories.tax,true));
    set('[data-diff]',money(diff)+' / year');
    set('[data-winner]','Option '+lower+' has the lower illustrative modeled cost');
    out.querySelectorAll('[data-win]').forEach(el=>el.remove());
    const card=out.querySelector(lower==='A'?'[data-card-a]':'[data-card-b]');
    if(card){const win=document.createElement('div');win.className='winner';win.dataset.win='';win.innerHTML='<span>Lower modeled cost</span><span>✓</span>';card.appendChild(win)}
    out.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function bindCompare(){
    const trigger=document.querySelector('[data-run-compare]');
    if(!trigger) return;
    trigger.addEventListener('click',()=>{
      const fa=document.querySelector('[data-compare-a]');
      const fb=document.querySelector('[data-compare-b]');
      const vals=(f,s)=>({address:f.querySelector(`[name="address${s}"]`).value.trim(),use:f.querySelector(`[name="use${s}"]`).value,sqft:f.querySelector(`[name="sqft${s}"]`).value});
      const A=vals(fa,'A'), B=vals(fb,'B');
      if(!A.address){fa.querySelector('[name="addressA"]').focus();return}
      if(!B.address){fb.querySelector('[name="addressB"]').focus();return}
      renderCompare(estimate(A.address,A.use,A.sqft),estimate(B.address,B.use,B.sqft));
    });
  }

  function year(){
    document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  }

  function init(){ bindNav(); bindScreen(); populateFromQuery(); bindCompare(); year(); }
  return {init,estimate,money};
})();
document.addEventListener('DOMContentLoaded',EI.init);
