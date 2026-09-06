(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const SUPABASE_URL='https://tzwjiokoxfsruvobkiok.supabase.co';
  const SUPABASE_KEY='sb_publishable_Xjq5xQDpAskG5qgdPx7bRQ_eaWVo0xu';
  const EVIDENCE_KEY='ei_project_evidence_v4';
  const TIMELINE_KEY='ei_project_timeline_v5';
  const BINDING_KEY='ei_cloud_bindings_v6';
  const AUTO_KEY='ei_cloud_autosync_v6';
  let sb=null,user=null,projects=[],currentId=null,currentRole=null,autoTimer=null,authUnsub=null;

  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const safeJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(_e){return fallback}};
  const saveJSON=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));return true}catch(_e){return false}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=sel=>($(sel)?.textContent||'').trim();
  const value=sel=>$(sel)?.value??'';
  const num=sel=>{const n=Number(value(sel));return Number.isFinite(n)?n:null};
  const fmtDate=iso=>{try{return new Date(iso).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch(_e){return'—'}};
  function projectKey(){return `${norm(value('#pj-address'))||'draft'}|${value('#pj-use')||'other'}`}
  function setStatus(msg,kind=''){const el=$('[data-cloud-status]');if(!el)return;el.textContent=msg;el.dataset.kind=kind}
  function bindingStore(){return safeJSON(BINDING_KEY,{})}
  function getBinding(){return bindingStore()[projectKey()]||null}
  function setBinding(id){const all=bindingStore();all[projectKey()]=id;saveJSON(BINDING_KEY,all)}
  function clearBinding(){const all=bindingStore();delete all[projectKey()];saveJSON(BINDING_KEY,all);currentId=null}
  function autoEnabled(){return localStorage.getItem(AUTO_KEY)!=='0'}
  function setAuto(v){localStorage.setItem(AUTO_KEY,v?'1':'0');const b=$('[data-cloud-auto]');if(b)b.textContent=`Auto-sync ${v?'ON':'OFF'}`}

  function injectUI(){
    const host=$('.cloud-module');if(!host||host.dataset.cloudV6==='1')return;host.dataset.cloudV6='1';
    host.innerHTML=`<div class="cloud-console">
      <div class="cloud-console-head"><div><span>12 / Cloud Projects</span><h2>Persistent projects. Real accounts. Controlled collaboration.</h2></div><p>ExpenseIntel now has a dedicated Supabase backend. Project state, evidence records, timeline events and scored snapshots can persist across devices. Row Level Security keeps projects private to owners and invited collaborators.</p></div>
      <div class="cloud-auth">
        <section class="cloud-auth-card"><h3>ExpenseIntel account</h3><p>Create an account or sign in with email + password. If email confirmation is required, confirm the message from Supabase and then sign in here.</p><div class="cloud-auth-grid"><input data-cloud-email type="email" autocomplete="email" placeholder="you@example.com"><input data-cloud-password type="password" autocomplete="current-password" minlength="8" placeholder="Password · 8+ characters"></div><div class="cloud-auth-actions"><button class="cloud-btn primary" type="button" data-cloud-signin>Sign in</button><button class="cloud-btn" type="button" data-cloud-signup>Create account</button></div><div class="cloud-status-line" data-cloud-status>Connecting to the dedicated ExpenseIntel cloud…</div></section>
        <section class="cloud-session-card"><div class="cloud-session-top"><div><h3><i class="cloud-live-dot" data-cloud-live></i>Cloud session</h3><div class="cloud-user" data-cloud-user>Not signed in<small>Browser-local Project Lab still works without an account.</small></div></div><button class="cloud-btn" type="button" data-cloud-signout disabled>Sign out</button></div><p data-cloud-security>Publishable client key only · project access is enforced by database Row Level Security.</p><div class="cloud-auth-actions"><button class="cloud-btn primary" type="button" data-cloud-save disabled>Save + snapshot to cloud</button><button class="cloud-btn" type="button" data-cloud-new disabled>New cloud copy</button><button class="cloud-btn" type="button" data-cloud-auto disabled>Auto-sync ON</button></div></section>
      </div>
      <div class="cloud-project-shell">
        <aside class="cloud-project-list"><div class="cloud-list-head"><span>YOUR ACCESS</span><strong data-cloud-project-count>0 cloud projects</strong></div><div class="cloud-project-items" data-cloud-projects><div class="cloud-skeleton">Sign in to load cloud projects.</div></div></aside>
        <section class="cloud-project-main" data-cloud-main><div class="cloud-project-main-empty"><div><strong>No cloud project selected.</strong><p>Sign in, run the Project Lab, then choose Save + snapshot to create the persistent version of the current project.</p></div></div></section>
      </div>
    </div>`;
    const invite=new URL(location.href).searchParams.get('invite');if(invite)host.insertAdjacentHTML('afterbegin',`<div class="invite-banner" data-invite-banner><span>Team invite detected. Sign in with the invited email to accept access.</span><button type="button" data-accept-invite>Accept invite</button></div>`);
  }

  async function loadClient(){
    const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await sb.auth.getSession();user=session?.user||null;
    const {data}=sb.auth.onAuthStateChange((_event,session2)=>{user=session2?.user||null;renderSession();if(user){loadProjects().then(()=>maybeAcceptInvite())}else{projects=[];currentId=null;renderProjects();renderCloudMain()}});authUnsub=data?.subscription||null;
    renderSession();if(user)await loadProjects();
  }

  function renderSession(){
    const live=$('[data-cloud-live]'),u=$('[data-cloud-user]'),out=$('[data-cloud-signout]'),save=$('[data-cloud-save]'),nw=$('[data-cloud-new]'),auto=$('[data-cloud-auto]');
    if(user){live?.classList.add('ready');if(u)u.innerHTML=`${esc(user.email||'Signed-in user')}<small>User ${esc((user.id||'').slice(0,8))}… · authenticated cloud session</small>`;if(out)out.disabled=false;if(save)save.disabled=false;if(nw)nw.disabled=false;if(auto){auto.disabled=false;auto.textContent=`Auto-sync ${autoEnabled()?'ON':'OFF'}`};setStatus('Cloud account connected. Project data remains private under RLS.','ok')}
    else{live?.classList.remove('ready');if(u)u.innerHTML='Not signed in<small>Browser-local Project Lab still works without an account.</small>';if(out)out.disabled=true;if(save)save.disabled=true;if(nw)nw.disabled=true;if(auto)auto.disabled=true}
  }

  async function signIn(){
    const email=value('[data-cloud-email]').trim(),password=value('[data-cloud-password]');if(!email||!password)return setStatus('Enter email and password.','error');setStatus('Signing in…');
    const {error}=await sb.auth.signInWithPassword({email,password});if(error)return setStatus(error.message,'error');setStatus('Signed in. Loading cloud projects…','ok')
  }
  async function signUp(){
    const email=value('[data-cloud-email]').trim(),password=value('[data-cloud-password]');if(!email||password.length<8)return setStatus('Use a valid email and a password of at least 8 characters.','error');setStatus('Creating account…');
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/project/`}});if(error)return setStatus(error.message,'error');
    if(data.session)setStatus('Account created and signed in.','ok');else setStatus('Account created. Check your email to confirm it, then sign in here.','ok')
  }
  async function signOut(){await sb.auth.signOut();setStatus('Signed out. Browser-local work remains on this device.')}

  function captureInputs(){
    return{
      address:value('#pj-address'),current:value('#pj-current'),use:value('#pj-use'),sqft:num('#pj-sqft'),months:num('#pj-months'),contingency:num('#pj-contingency'),serviceAmps:num('#pj-electric'),brief:value('#pj-brief-text'),
      voltage:num('#pj-voltage'),phase:num('#pj-phase'),powerFactor:num('#pj-pf'),peakKw:num('#pj-known-peak-kw'),waterDemand:num('#pj-water-demand'),waterCapacity:num('#pj-water-cap'),sewerDemand:num('#pj-sewer-demand'),sewerCapacity:num('#pj-sewer-cap'),gasDemand:num('#pj-gas-demand'),gasCapacity:num('#pj-gas-cap'),occupants:num('#pj-occupants'),
      triggers:$$('.chip-grid input:checked').filter(x=>!x.closest('[data-interventions]')).map(x=>x.value),interventions:$$('[data-interventions] input:checked').map(x=>x.value)
    }
  }
  function captureOutput(){return{fragility:text('[data-r-fragility]')||text('[data-precision-frag]'),evidence:text('[data-evidence-score]'),evidenceGrade:text('[data-evidence-grade]'),bottleneck:text('[data-r-bottleneck]')||text('[data-precision-bottleneck]'),utilityUnknown:text('[data-r-utility]'),lockIn:text('[data-r-lock]'),gatePosture:text('[data-gate-posture]'),conflicts:text('[data-conflict-count]'),decision:text('[data-decision-posture]'),capturedAt:new Date().toISOString()}}
  function captureState(){return{version:'EI-CLOUD-2026.09.1',inputs:captureInputs(),output:captureOutput()}}
  function nameFor(state){const a=state.inputs.address||'Untitled property',u=state.inputs.use||'project';return `${a} · ${u}`.slice(0,180)}

  async function ensureCloudProject(forceNew=false){
    if(!user)throw new Error('Sign in first.');const state=captureState();let id=forceNew?null:(currentId||getBinding());
    if(id){const {data,error}=await sb.from('ei_projects').update({name:nameFor(state),address:state.inputs.address||null,proposed_use:state.inputs.use||null,project_state:state}).eq('id',id).select('id').single();if(!error&&data?.id){currentId=data.id;setBinding(data.id);return data.id}if(error?.code!=='PGRST116'&&error?.code!=='42501')throw error}
    const {data,error}=await sb.from('ei_projects').insert({owner_id:user.id,name:nameFor(state),address:state.inputs.address||null,proposed_use:state.inputs.use||null,project_state:state}).select('id').single();if(error)throw error;currentId=data.id;setBinding(data.id);return data.id
  }

  function localEvidenceRows(){const all=safeJSON(EVIDENCE_KEY,[]),key=projectKey();return Array.isArray(all)?all.filter(r=>r.projectKey===key):[]}
  function localTimelineRows(){const all=safeJSON(TIMELINE_KEY,{});return Array.isArray(all[projectKey()])?all[projectKey()]:[]}
  async function syncEvidence(id){const rows=localEvidenceRows();if(!rows.length)return 0;const payload=rows.map(r=>({project_id:id,owner_id:user.id,name:r.name||'Project evidence',source_type:r.type||null,source_strength:r.strength||null,source_date:r.sourceDate||null,categories:r.categories||[],claims:r.claims||[],excerpt:r.excerpt||null,content_hash:r.hash||r.id||null}));const {error}=await sb.from('ei_project_evidence').upsert(payload,{onConflict:'project_id,content_hash',ignoreDuplicates:true});if(error)throw error;return payload.length}
  async function syncTimeline(id){const rows=localTimelineRows();if(!rows.length)return 0;const payload=rows.map(r=>({project_id:id,owner_id:user.id,event_type:r.type||'project',title:r.title||'Project event',detail:r.detail||null,event_state:{major:!!r.major,local_at:r.at||null},event_hash:r.id||`${r.type}|${r.title}|${r.at}`}));const {error}=await sb.from('ei_project_events').upsert(payload,{onConflict:'project_id,event_hash',ignoreDuplicates:true});if(error)throw error;return payload.length}

  async function syncCurrent({snapshot=true,forceNew=false,quiet=false}={}){
    if(!user)return quiet?null:setStatus('Sign in to save this project to the cloud.','error');
    if(!quiet)setStatus('Syncing project, evidence and timeline…');
    try{const id=await ensureCloudProject(forceNew);const state=captureState();await Promise.all([syncEvidence(id),syncTimeline(id)]);if(snapshot){const {error}=await sb.from('ei_project_snapshots').insert({project_id:id,owner_id:user.id,snapshot:state});if(error)throw error}if(!quiet)setStatus(snapshot?'Cloud snapshot saved.':'Cloud project synchronized.','ok');await loadProjects();await selectProject(id,{loadIntoForm:false});return id}catch(e){if(!quiet)setStatus(e.message||'Cloud sync failed.','error');return null}
  }

  async function loadProjects(){
    if(!user)return;const {data,error}=await sb.from('ei_projects').select('id,owner_id,name,address,proposed_use,project_state,updated_at,created_at').order('updated_at',{ascending:false}).limit(50);if(error){setStatus(error.message,'error');return}projects=data||[];const bound=getBinding();currentId=projects.some(p=>p.id===bound)?bound:(currentId&&projects.some(p=>p.id===currentId)?currentId:null);renderProjects();if(currentId)await selectProject(currentId,{loadIntoForm:false});else renderCloudMain()
  }
  function renderProjects(){const z=$('[data-cloud-projects]');if(!z)return;z.innerHTML='';const count=$('[data-cloud-project-count]');if(count)count.textContent=`${projects.length} cloud project${projects.length===1?'':'s'}`;if(!user){z.innerHTML='<div class="cloud-skeleton">Sign in to load cloud projects.</div>';return}if(!projects.length){z.innerHTML='<div class="cloud-skeleton">No cloud projects yet. Save the current Project Lab to create one.</div>';return}projects.forEach(p=>{const b=document.createElement('button');b.type='button';b.className=`cloud-project-item ${p.id===currentId?'active':''}`;b.innerHTML=`<span>${esc(p.proposed_use||'PROJECT')} · ${p.owner_id===user.id?'OWNER':'SHARED'}</span><strong>${esc(p.address||p.name||'Untitled project')}</strong><small>Updated ${esc(fmtDate(p.updated_at))}</small>`;b.addEventListener('click',()=>selectProject(p.id,{loadIntoForm:false}));z.appendChild(b)})}

  async function selectProject(id,{loadIntoForm=false}={}){
    const p=projects.find(x=>x.id===id);if(!p)return;currentId=id;renderProjects();const {data:members}=await sb.from('ei_project_members').select('user_id,role,email,created_at').eq('project_id',id).order('created_at',{ascending:true});const me=(members||[]).find(m=>m.user_id===user.id);currentRole=me?.role||(p.owner_id===user.id?'owner':'viewer');const {data:snaps}=await sb.from('ei_project_snapshots').select('id,snapshot,created_at').eq('project_id',id).order('created_at',{ascending:false}).limit(8);const {data:invites}=currentRole==='owner'?await sb.from('ei_project_invites').select('id,email,role,expires_at,accepted_at,created_at').eq('project_id',id).order('created_at',{ascending:false}).limit(12):{data:[]};renderCloudMain(p,members||[],snaps||[],invites||[]);if(loadIntoForm)await loadProjectIntoLab(p,id)
  }

  function renderCloudMain(p=null,members=[],snaps=[],invites=[]){
    const z=$('[data-cloud-main]');if(!z)return;if(!user){z.innerHTML='<div class="cloud-project-main-empty"><div><strong>Sign in to activate cloud projects.</strong><p>Local Project Lab remains available without an account.</p></div></div>';return}if(!p){z.innerHTML='<div class="cloud-project-main-empty"><div><strong>No cloud project selected.</strong><p>Save the current Project Lab to create a persistent cloud record.</p></div></div>';return}
    const o=p.project_state?.output||{},role=currentRole||'viewer',canInvite=role==='owner';z.innerHTML=`
      <div class="cloud-toolbar"><button class="cloud-btn primary" type="button" data-cloud-sync-one>Sync + snapshot</button><button class="cloud-btn" type="button" data-cloud-load-one>Load into Project Lab</button><button class="cloud-btn" type="button" data-cloud-auto-inline>Auto-sync ${autoEnabled()?'ON':'OFF'}</button><span class="cloud-sync-state">${esc(role.toUpperCase())} · last updated ${esc(fmtDate(p.updated_at))}</span></div>
      <div class="cloud-kpis"><div><span>Fragility</span><b>${esc(o.fragility||'—')}</b></div><div><span>Evidence</span><b>${esc(o.evidenceGrade||o.evidence||'—')}</b></div><div><span>Bottleneck</span><b>${esc(o.bottleneck||'—')}</b></div><div><span>Decision</span><b>${esc(o.decision||o.gatePosture||'—')}</b></div></div>
      <div class="cloud-subgrid">
        <section class="cloud-pane"><div class="cloud-pane-head"><span>TEAM ACCESS</span><b>${members.length} member${members.length===1?'':'s'}</b></div><div class="cloud-pane-body"><div data-cloud-members></div>${canInvite?`<div class="cloud-invite-form"><input data-invite-email type="email" placeholder="teammate@example.com"><select data-invite-role><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button class="cloud-btn" type="button" data-create-invite>Create link</button></div><div class="cloud-invite-result" data-invite-result>Invite links expire after 14 days and only work for the invited email.</div>`:'<div class="cloud-note">Only the project owner can create collaboration invites.</div>'}</div></section>
        <section class="cloud-pane"><div class="cloud-pane-head"><span>CLOUD WATCH</span><b>${snaps.length} recent snapshots</b></div><div class="cloud-pane-body" data-cloud-history></div></section>
      </div><div class="cloud-note">Cloud sync stores structured project state, extracted evidence records and event history. Original uploaded PDF/image bytes are not uploaded by this beta; Document Intelligence sends extracted text into the Evidence Inbox.</div>`;
    const mz=$('[data-cloud-members]');members.forEach(m=>{const el=document.createElement('div');el.className='cloud-member';el.innerHTML=`<div><b>${esc(m.email||`${m.user_id.slice(0,8)}…`)}</b><small>Added ${esc(fmtDate(m.created_at))}</small></div><span>${esc(m.role)}</span>`;mz?.appendChild(el)});
    const hz=$('[data-cloud-history]');if(!snaps.length)hz.innerHTML='<div class="cloud-invite-result">No cloud snapshots yet.</div>';else snaps.forEach(s=>{const x=s.snapshot?.output||{},el=document.createElement('div');el.className='cloud-history-row';el.innerHTML=`<i></i><div><b>${esc(x.decision||x.gatePosture||'Project snapshot')}</b><small>Frag ${esc(x.fragility||'—')} · Evidence ${esc(x.evidenceGrade||x.evidence||'—')} · ${esc(x.bottleneck||'—')}</small></div><time>${esc(fmtDate(s.created_at))}</time>`;hz?.appendChild(el)});
    $('[data-cloud-sync-one]')?.addEventListener('click',()=>syncCurrent({snapshot:true}));$('[data-cloud-load-one]')?.addEventListener('click',()=>loadProjectIntoLab(p,p.id));$('[data-cloud-auto-inline]')?.addEventListener('click',()=>{setAuto(!autoEnabled());selectProject(p.id,{loadIntoForm:false})});$('[data-create-invite]')?.addEventListener('click',createInvite)
  }

  function applyInput(sel,v){const el=$(sel);if(!el||v==null)return;el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
  async function loadProjectIntoLab(p,id){
    const s=p.project_state?.inputs||{};applyInput('#pj-address',s.address||p.address||'');applyInput('#pj-current',s.current);applyInput('#pj-use',s.use||p.proposed_use);applyInput('#pj-sqft',s.sqft);applyInput('#pj-months',s.months);applyInput('#pj-contingency',s.contingency);applyInput('#pj-electric',s.serviceAmps);applyInput('#pj-brief-text',s.brief);applyInput('#pj-voltage',s.voltage);applyInput('#pj-phase',s.phase);applyInput('#pj-pf',s.powerFactor);applyInput('#pj-known-peak-kw',s.peakKw);applyInput('#pj-water-demand',s.waterDemand);applyInput('#pj-water-cap',s.waterCapacity);applyInput('#pj-sewer-demand',s.sewerDemand);applyInput('#pj-sewer-cap',s.sewerCapacity);applyInput('#pj-gas-demand',s.gasDemand);applyInput('#pj-gas-cap',s.gasCapacity);applyInput('#pj-occupants',s.occupants);
    const trig=new Set(s.triggers||[]),inter=new Set(s.interventions||[]);$$('.chip-grid input').forEach(x=>{const desired=x.closest('[data-interventions]')?inter.has(x.value):trig.has(x.value);if(x.checked!==desired){x.checked=desired;x.dispatchEvent(new Event('change',{bubbles:true}))}});currentId=id;setBinding(id);await hydrateCloudEvidence(id);await hydrateCloudTimeline(id);setStatus(`Loaded ${p.address||p.name} into Project Lab. Re-run the model to refresh live/public layers.`,'ok');window.scrollTo({top:document.querySelector('.project-input')?.offsetTop||0,behavior:'smooth'})
  }
  async function hydrateCloudEvidence(id){const {data}=await sb.from('ei_project_evidence').select('*').eq('project_id',id).order('created_at',{ascending:false}).limit(160);if(!data?.length)return;const all=safeJSON(EVIDENCE_KEY,[]),key=projectKey(),other=all.filter(r=>r.projectKey!==key),local=data.map(r=>({id:`cloud_${r.id}`,projectKey:key,addedAt:r.created_at,name:r.name,type:r.source_type||'other',strength:r.source_strength||'document',sourceDate:r.source_date,categories:r.categories||[],claims:r.claims||[],parserVersion:'EI-CLOUD',excerpt:r.excerpt||'',hash:r.content_hash||r.id}));saveJSON(EVIDENCE_KEY,[...local,...other]);window.dispatchEvent(new StorageEvent('storage',{key:EVIDENCE_KEY}))}
  async function hydrateCloudTimeline(id){const {data}=await sb.from('ei_project_events').select('*').eq('project_id',id).order('created_at',{ascending:false}).limit(80);if(!data?.length)return;const all=safeJSON(TIMELINE_KEY,{}),key=projectKey();all[key]=data.map(r=>({id:r.event_hash||`cloud_${r.id}`,at:r.event_state?.local_at||r.created_at,type:r.event_type,title:r.title,detail:r.detail||'',major:!!r.event_state?.major}));saveJSON(TIMELINE_KEY,all);window.dispatchEvent(new StorageEvent('storage',{key:TIMELINE_KEY}))}

  function token(){const a=new Uint8Array(24);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function createInvite(){if(currentRole!=='owner'||!currentId)return;const email=value('[data-invite-email]').trim().toLowerCase(),role=value('[data-invite-role]')||'viewer',out=$('[data-invite-result]');if(!email||!email.includes('@'))return out.textContent='Enter a valid email.';const t=token();const {error}=await sb.from('ei_project_invites').insert({project_id:currentId,invited_by:user.id,email,role,token:t});if(error)return out.textContent=error.message;const u=new URL(`${location.origin}/project/`);u.searchParams.set('invite',t);out.innerHTML=`Invite ready for <b>${esc(email)}</b>: <span>${esc(u.toString())}</span> <button class="cloud-btn" type="button" data-copy-invite>Copy link</button>`;out.querySelector('[data-copy-invite]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(u.toString());out.querySelector('[data-copy-invite]').textContent='Copied'}catch(_e){}});await selectProject(currentId,{loadIntoForm:false})}
  async function maybeAcceptInvite(){const t=new URL(location.href).searchParams.get('invite');if(!t||!user)return;const banner=$('[data-invite-banner] span');if(banner)banner.textContent='Checking this invite against your signed-in email…';const {data,error}=await sb.rpc('ei_accept_invite',{invite_token:t});if(error){if(banner)banner.textContent=`Invite not accepted: ${error.message}`;return}if(banner)banner.textContent='Invite accepted. This project is now in your cloud workspace.';const u=new URL(location.href);u.searchParams.delete('invite');history.replaceState({},'',u.pathname+u.search+u.hash);await loadProjects();if(data)await selectProject(data,{loadIntoForm:true})}

  function scheduleAuto(){if(!user||!autoEnabled()||!(currentId||getBinding()))return;clearTimeout(autoTimer);autoTimer=setTimeout(()=>syncCurrent({snapshot:false,quiet:true}),1800)}
  function bindAuto(){const root=$('[data-project-form]');root?.addEventListener('input',scheduleAuto);root?.addEventListener('change',scheduleAuto);const evidence=$('[data-evidence-vault]');if(evidence)new MutationObserver(scheduleAuto).observe(evidence,{childList:true,subtree:true});$('[data-save-project]')?.addEventListener('click',()=>setTimeout(()=>user&&syncCurrent({snapshot:true,quiet:true}),500))}

  function bindUI(){
    $('[data-cloud-signin]')?.addEventListener('click',signIn);$('[data-cloud-signup]')?.addEventListener('click',signUp);$('[data-cloud-signout]')?.addEventListener('click',signOut);$('[data-cloud-save]')?.addEventListener('click',()=>syncCurrent({snapshot:true}));$('[data-cloud-new]')?.addEventListener('click',async()=>{clearBinding();await syncCurrent({snapshot:true,forceNew:true})});$('[data-cloud-auto]')?.addEventListener('click',()=>setAuto(!autoEnabled()));$('[data-accept-invite]')?.addEventListener('click',maybeAcceptInvite);setAuto(autoEnabled());bindAuto()
  }

  async function init(){injectUI();bindUI();try{await loadClient();await maybeAcceptInvite()}catch(e){setStatus(`Cloud unavailable: ${e.message||e}`,'error')}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('beforeunload',()=>authUnsub?.unsubscribe?.());
})();
