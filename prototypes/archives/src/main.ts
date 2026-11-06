import './style.css';
import {json} from 'd3';
import {ArchiveField} from './field';
import {StoryCharts} from './charts';
import {ALEX,BANDS,Charts,Dictionary,Dimension,Filters,Profile,RecordRow,blankFilters,esc,experienceBand,filterRecords,loadRecords,matchesProfile,n,profileGroup,profileRules} from './data';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const on=(id:string,event:string,handler:EventListener)=>$(id).addEventListener(event,handler);
const value=(id:string)=>$(id) as HTMLInputElement|HTMLSelectElement;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
let dictionary:Dictionary,charts:StoryCharts,rows:RecordRow[]=[],visible:RecordRow[]=[],year=2025,dimension:Dimension|'all'='all';
let filters:Filters=blankFilters(),profile:Profile|null=null,relaxed=false,manual=false,autoPhase=-1,selected:string|null=null,page=0,loadToken=0,loading=false;
let requestedYear=2025;
let lastFocus:HTMLElement|null=null,formStep=0,editing=false,reviewProfile:Profile|null=null,filingYou=false;
const reducedMedia=matchMedia('(prefers-reduced-motion: reduce)');let reduced=reducedMedia.matches;
const field=new ArchiveField($<HTMLCanvasElement>('archive-canvas'),openDetail,pauseStory);
field.reduced=reduced;
const alex=$('alex-file'),you=$<HTMLButtonElement>('you-marker');
field.onMotion=updateMarkers;
function options(id:string,values:string[],blank:string){const select=$<HTMLSelectElement>(id),prior=select.value;select.innerHTML=`<option value="">${esc(blank)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(values.includes(prior))select.value=prior;}
function unique(key:'role'|'education'|'country'){return [...new Set(rows.map(r=>r[key]))].sort();}
function languages(){return [...new Set(rows.flatMap(r=>r.used))].sort();}
function fillControls(){
  options('filter-role',unique('role'),'All roles / statuses');options('filter-experience',BANDS,'All experience');options('filter-education',unique('education'),'All education');options('filter-country',unique('country'),'All countries');options('filter-technology',languages(),'All languages');
  for(const key of ['role','experience','education','country','technology','query'] as const)value(`filter-${key}`).value=filters[key];
  options('profile-role',unique('role'),'Choose your current role / status');options('profile-education',unique('education').filter(s=>s!=='Not reported'),'Skip education');options('profile-country',unique('country').filter(s=>s!=='Not reported'),'Skip country');options('profile-technology',languages(),'Skip language');
}
function pauseStory(){
  manual=true;$('archive-section').classList.add('manual');$('resume-story').hidden=false;$('field-hint').hidden=true;
  $('archive-step').textContent='Explore / Your perspective';$('archive-caption').textContent='Group changes position. Filters change scope. Zoom or focus a group, then open an individual file.';
}
function setDimension(next:Dimension|'all',animate=true){
  dimension=next;document.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===next)));
  refresh(animate);if(selected)renderDetail();
}
function refresh(animate=true){
  const start=performance.now();visible=filterRecords(rows,filters,profile,relaxed);page=Math.min(page,Math.max(0,Math.ceil(visible.length/30)-1));
  field.update(visible,dimension,year,profile,animate);
  const active=Object.entries(filters).filter(([,v])=>!!v);$('filter-count').textContent=active.length?`(${active.length})`:'';
  const scope=active.filter(([k])=>k!=='similar').map(([k,v])=>`${k}: ${v}`).join(' · ');
  $('scope-count').textContent=`${n(visible.length)} of ${n(rows.length)} survey respondents · ${year}${scope?' · '+scope:''}${filters.similar?' · matching your profile':''}`;
  $('experience-definition').textContent=year===2025?'Experience = professional work years (blank ≠ zero)':'Experience = years coding professionally';
  $('empty-state').hidden=visible.length>0||loading;$('archive-canvas').dataset.totalCount=String(rows.length);
  updateMatches();renderIndex();if(selected)renderDetail();updateMarkers();
  performance.measure('archive-filter-and-layout',{start,end:performance.now()});
}
async function switchYear(next:number){
  requestedYear=next;const token=++loadToken;loading=true;const changed=next!==year;
  $('field-error').hidden=true;$('scope-count').textContent=`Opening the complete ${next} sample…`;
  value('year').value=String(next);$('archive-canvas').setAttribute('aria-busy','true');
  try{
    const loaded=await loadRecords(next,dictionary);if(token!==loadToken)return;
    rows=loaded;year=next;loading=false;if(changed)closeDetail();fillControls();refresh(!changed);field.overview(false);
    $('archive-canvas').setAttribute('aria-busy','false');$('field-error').hidden=true;
    if(changed)$('keyboard-status').textContent=`Switched to ${year}: ${n(rows.length)} different survey respondents. IDs are year-specific.`;
    updateScroll();
  }catch(error){if(token!==loadToken)return;loading=false;$('field-error').hidden=false;$('scope-count').textContent=`Could not load ${next}. Previous sample remains ${year}.`;$('archive-canvas').setAttribute('aria-busy','false');value('year').value=String(year);console.error(error);}
}
function updateMatches(){
  $('match-panel').hidden=!profile;$('locate-you').hidden=!profile;$('create-profile').textContent=profile?'Edit your file':'Find your place';
  if(!profile){field.setHighlight(new Set());you.hidden=true;return;}
  const matches=rows.filter(r=>matchesProfile(r,profile!,relaxed));
  $('match-count').textContent=`${n(matches.length)} matching survey ${matches.length===1?'response':'responses'} · ${year}`;
  $('match-rules').textContent=`Exact conditions: ${profileRules(profile,year,relaxed)}.${matches.length?'':' No matches? Try role + experience only, or edit your profile.'}`;
  $('relax-match').textContent=relaxed?'Use all my conditions':'Use role + experience only';
  field.setHighlight(new Set(matches.map(r=>r.id)));you.hidden=false;
}
function renderIndex(){
  if($('record-index').hidden)return;
  const pages=Math.max(1,Math.ceil(visible.length/30));page=Math.min(page,pages-1);$('index-page').textContent=`Page ${page+1} of ${n(pages)} · ${n(visible.length)} records`;
  $<HTMLButtonElement>('index-prev').disabled=page===0;$<HTMLButtonElement>('index-next').disabled=page>=pages-1;
  $('index-table').innerHTML=`<table><caption class="sr-only">Anonymous survey response index. Every filtered record is available by page or ID search.</caption><thead><tr><th scope="col">Open file</th><th scope="col">Role / status</th><th scope="col">Experience</th><th scope="col">Education</th><th scope="col">Country</th></tr></thead><tbody>${visible.slice(page*30,page*30+30).map(r=>`<tr><td><button data-record="${r.id}">${r.id}</button></td><td>${esc(r.role)}</td><td>${esc(r.experience)}</td><td>${esc(r.education)}</td><td>${esc(r.country)}</td></tr>`).join('')}</tbody></table>${visible.length?'':'<p class="chart-empty">No records in this scope. Clear or relax the filters.</p>'}`;
  $('index-table').querySelectorAll<HTMLButtonElement>('[data-record]').forEach(b=>b.addEventListener('click',()=>{field.locate(b.dataset.record!);openDetail(b.dataset.record!);}));
}
function openDetail(id:string){
  pauseStory();if(!selected)lastFocus=document.activeElement as HTMLElement;selected=id;field.select(id==='ALEX'||id==='YOU'?null:id);renderDetail();$('record-detail').hidden=false;$('close-detail').focus({preventScroll:true});
}
function closeDetail(){if(!selected)return;selected=null;field.select(null);$('record-detail').hidden=true;if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});else $('archive-canvas').focus({preventScroll:true});}
function renderDetail(){
  if(!selected)return;
  const row=rows.find(r=>r.id===selected),p=selected==='ALEX'?ALEX:selected==='YOU'?profile:null;
  const group=p?dimension==='all'?'All respondents':profileGroup(p,dimension,year):row?dimension==='all'?'All respondents':row[dimension]:null;
  const inScope=p||visible.some(r=>r.id===selected);
  const line=(k:string,v:unknown)=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
  if(p){
    $('detail-content').innerHTML=`<p class="detail-id">${selected==='ALEX'?'EX–01 / Illustrative profile':'YOU / Local profile'}</p><h3 id="detail-title">${selected==='ALEX'?'Alex':'Your place'}</h3><p class="detail-rule">Current group: <strong>${esc(group)}</strong>. ${dimension==='experience'?`This ${year} view uses ${year===2025?'professional work':'professional coding'} years.`:'The group follows the selected dimension.'} This marker is excluded from all survey counts.</p><dl>${line('Current status',p.role)}${line('Work years',p.workYears)}${line('Coding years',p.codingYears)}${line('Education',p.education||null)}${line('Country',p.country||null)}${line('Uses language',p.technology||null)}${line('Aspiration',p.aspiration||null)}</dl><p class="small">${selected==='ALEX'?'Alex is a fictional CS student. Canada, zero experience and JavaScript are illustrative assumptions added for this prototype; they are not a survey record.':'Inputs live only in this tab. No account, upload or matching score. Reset or reload removes your file.'}</p><div class="button-row"><button id="detail-locate">Locate this marker</button>${selected==='YOU'?'<button id="detail-edit">Edit my profile</button>':''}</div>`;
    on('detail-locate','click',()=>field.locate(selected!));if(selected==='YOU')on('detail-edit','click',()=>openProfile());return;
  }
  if(!row)return;
  $('detail-content').innerHTML=`<p class="detail-id">Anonymous response / ${row.id}</p><h3 id="detail-title">${esc(row.role)}</h3><p class="detail-rule">${inScope?`Filed under <strong>${esc(group)}</strong> by ${dimension==='all'?'the full sample':dimension}.`:'This file is outside the current filters. Its identity is still selected.'} ${dimension==='experience'?`Based on ${year===2025?'WorkExp (professional work)':'YearsCodePro (professional coding)'}.`:dimension==='role'?'The survey asks for one primary role. No multi-role duplication.':''}</p><dl>${line('Survey year',row.year)}${line('Current group',group)}${line('Original role',row.roleRaw)}${line('Coding status',row.status)}${line('Coding years',year===2025?'Not collected in 2025':row.codingRaw)}${line('Work years',row.workRaw)}${line('Education',row.educationRaw)}${line('Country',row.country)}${line('Used languages',row.used.join(', ')||null)}${line('Desired languages',row.wanted.join(', ')||null)}${line('AI use',row.aiRaw)}${line('AI trust',row.trust)}${line('Annual pay (USD)',row.pay===null?null:`$${n(row.pay)}`)}</dl><p class="small">Not reported means a missing source answer. No name, school, employer or biography has been inferred. ${year===2025?'WorkExp blanks may include zero years, per the original questionnaire.':''}</p><div class="button-row"><button id="detail-locate">Locate this file</button><button id="detail-similar">Find similar files</button></div><p id="detail-similar-count" class="small"></p>`;
  on('detail-locate','click',()=>{if(!visible.includes(row)){filters=blankFilters();fillControls();refresh();}field.locate(row.id);});
  on('detail-similar','click',()=>{filters={...blankFilters(),role:row.role,experience:row.experience};fillControls();refresh();$('detail-similar-count').textContent=`${n(visible.length)} responses share ${row.role} + ${row.experience} experience. No other conditions used.`;field.focusGroup(group??row.role);});
}
function openProfile(){
  pauseStory();editing=!!profile;formStep=0;reviewProfile=null;const form=$<HTMLFormElement>('profile-form');form.reset();fillControls();
  if(profile){for(const key of ['role','workYears','codingYears','education','country','technology','aspiration'] as const)(form.elements.namedItem(key) as HTMLInputElement).value=profile[key]===null?'':String(profile[key]);}
  else value('profile-role').value='Student';
  $('profile-submit').textContent=editing?'Update my file':'Create my file';showFormStep();$<HTMLDialogElement>('profile-dialog').showModal();value('profile-role').focus();
}
function readProfile():Profile{
  const data=new FormData($<HTMLFormElement>('profile-form'));const y=(key:string)=>String(data.get(key)).trim()===''?null:Number(data.get(key));
  return {role:String(data.get('role')),workYears:y('workYears'),codingYears:y('codingYears'),education:String(data.get('education')),country:String(data.get('country')),technology:String(data.get('technology')),aspiration:String(data.get('aspiration')).trim(),ai:'Not reported'};
}
function showFormStep(){
  document.querySelectorAll<HTMLFieldSetElement>('[data-profile-step]').forEach(f=>f.hidden=Number(f.dataset.profileStep)!==formStep);
  $('profile-step').textContent=`Your profile / ${formStep+1} of 3`;$('profile-back').hidden=formStep===0;$('profile-next').hidden=formStep===2;$('profile-submit').hidden=formStep!==2;
  if(formStep===2){reviewProfile=readProfile();$('profile-summary').innerHTML=`<p><strong>YOU</strong> · ${esc(reviewProfile.role)}</p><p>${reviewProfile.workYears??'Not reported'} work years / ${reviewProfile.codingYears??'Not reported'} coding years</p><p>${esc(reviewProfile.education||'Education not reported')} / ${esc(reviewProfile.country||'Country not reported')}</p><p>${esc(reviewProfile.technology||'No language condition')}</p>${reviewProfile.aspiration?`<p>To explore: ${esc(reviewProfile.aspiration)} (aspiration)</p>`:''}`;}
}
function closeProfile(){ $<HTMLDialogElement>('profile-dialog').close();$('create-profile').focus({preventScroll:true});}
function submitProfile(e:Event){
  e.preventDefault();const form=$<HTMLFormElement>('profile-form');if(!form.reportValidity())return;const p=readProfile();if(p.workYears!==null&&p.codingYears!==null&&p.codingYears>p.workYears){formStep=0;showFormStep();const input=form.elements.namedItem('codingYears') as HTMLInputElement;input.setCustomValidity('Professional coding years cannot exceed total professional work years.');input.reportValidity();return;}
  const source=$('profile-summary').getBoundingClientRect();profile=p;relaxed=false;$<HTMLDialogElement>('profile-dialog').close();charts.setProfile(profile);refresh();field.locate('YOU');
  $('keyboard-status').textContent='Your local profile was created. Survey counts are unchanged.';
  // The reviewed file folds into the same compact marker, with an explicit local identity.
  requestAnimationFrame(()=>{const target=field.screenPosition('YOU');const shell=$('field-shell').getBoundingClientRect();if(!target||reduced)return;filingYou=true;const anim=you.animate([{transform:`translate(${source.left-shell.left}px,${source.top-shell.top}px) scale(5)`,opacity:.8},{transform:`translate(${target.x}px,${target.y}px) scale(1)`,opacity:1}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});anim.onfinish=()=>{filingYou=false;updateMarkers();};});
  $('locate-you').focus({preventScroll:true});
}
function updateMarkers(){
  const width=window.innerWidth,height=window.innerHeight,hero=$('intro'),heroSlot=$('intro-slot').getBoundingClientRect(),reflection=$('reflection').getBoundingClientRect(),summary=$('reflection-slot').getBoundingClientRect(),archive=$('archive-section').getBoundingClientRect(),shell=$('field-shell').getBoundingClientRect();
  const small={x:width<760?width*.52-36:width*.37,y:width<760?24:25,w:width<760?86:138,h:32};
  const start=hero.getBoundingClientRect().bottom-height*.78;const heroT=clamp(-start/(height*.5));
  let rect={x:heroSlot.left+(small.x-heroSlot.left)*heroT,y:heroSlot.top+(small.y-heroSlot.top)*heroT,w:heroSlot.width+(small.w-heroSlot.width)*heroT,h:heroSlot.height+(small.h-heroSlot.height)*heroT};
  let compact=heroT>.82,mini=false;
  if(reflection.top<height*.9){const t=clamp((height*.9-reflection.top)/(height*.6));rect={x:small.x+(summary.left-small.x)*t,y:small.y+(summary.top-small.y)*t,w:small.w+(summary.width-small.w)*t,h:small.h+(summary.height-small.h)*t};compact=t<.2;}
  const fold=manual&&archive.top<height*.72?1:clamp((height*.72-archive.top)/(height*.72-(width<760?74:90)));
  const point=field.screenPosition('ALEX');
  if(fold>0&&point){const tx=shell.left+point.x,ty=shell.top+point.y;const w=Math.max(18,Math.min(30,point.w)),h=Math.max(24,Math.min(40,point.h));rect={x:summary.left+(tx-summary.left)*fold,y:summary.top+(ty-summary.top)*fold,w:summary.width+(w-summary.width)*fold,h:summary.height+(h-summary.height)*fold};compact=fold>.72;mini=fold>.92;}
  const out=archive.bottom<95||(fold>=.999&&point&&(rect.x<shell.left-rect.w||rect.x>shell.right||rect.y<shell.top-rect.h||rect.y>shell.bottom));
  alex.style.visibility=out?'hidden':'visible';alex.style.width=`${rect.w}px`;alex.style.height=`${rect.h}px`;alex.style.transform=`translate(${rect.x}px,${rect.y}px)`;alex.classList.toggle('compact',compact);alex.classList.toggle('mini',mini);alex.style.zIndex=compact&&!mini?'45':'21';
  alex.dataset.mode=mini?'archive':compact?'anchor':'expanded';alex.setAttribute('tabindex',mini?'0':'-1');
  if(profile){const yp=field.screenPosition('YOU');if(yp&&!filingYou){you.style.transform=`translate(${yp.x}px,${yp.y}px)`;you.hidden=yp.x<-30||yp.x>field.width||yp.y<-36||yp.y>field.height||field.reveal===0;}}
}
let scheduled=false;
function updateScroll(){
  scheduled=false;const archive=$('archive-section').getBoundingClientRect(),height=innerHeight;
  const fold=clamp((height*.72-archive.top)/(height*.72-(innerWidth<760?74:90)));
  field.reveal=manual?1:clamp((fold-.4)/.6);
  if(!manual&&rows.length&&!loading){
    const progress=((innerWidth<760?74:90)-archive.top)/height;
    const phase=progress<.25?0:progress<.95?1:2;
    if(phase!==autoPhase){autoPhase=phase;setDimension(phase===0?'all':phase===1?'role':'experience');}
    $('archive-step').textContent=phase===0?'06 / One file among many':phase===1?'07 / Organise by role':'08 / A different perspective';
    $('archive-caption').textContent=phase===0?'The example stays in view as the full sample appears. Each rectangle is one anonymous response.':phase===1?'The same files now gather by primary role or current status. Group labels show the real count.':'The same IDs move again, now by experience. Use a control to take over, or keep exploring in the record index.';
    $('field-hint').hidden=progress>1.5;
  }
  field.render();updateMarkers();
}
function requestScroll(){if(!scheduled){scheduled=true;requestAnimationFrame(updateScroll);}}
window.addEventListener('scroll',requestScroll,{passive:true});window.addEventListener('resize',requestScroll);
function jumpExplore(){pauseStory();if(dimension==='all')setDimension('role');field.reveal=1;field.render();$('archive-section').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});}
document.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(b=>b.addEventListener('click',()=>{pauseStory();setDimension(b.dataset.group as Dimension);field.overview();}));
for(const key of ['role','experience','education','country','technology','query'] as const){on(`filter-${key}`,key==='query'?'input':'change',()=>{pauseStory();filters[key]=value(`filter-${key}`).value;page=0;refresh();field.overview();});}
on('focus-group','change',()=>{pauseStory();field.focusGroup(value('focus-group').value);});
on('year','change',()=>{pauseStory();filters=blankFilters();switchYear(Number(value('year').value));});
on('retry-records','click',()=>switchYear(requestedYear));
on('filters-toggle','click',()=>{pauseStory();const el=$('archive-filters');el.hidden=!el.hidden;$('filters-toggle').setAttribute('aria-expanded',String(!el.hidden));});
function clearFilters(){pauseStory();filters=blankFilters();page=0;fillControls();refresh();field.overview();}
on('clear-filters','click',clearFilters);on('empty-clear','click',clearFilters);
on('zoom-in','click',()=>{pauseStory();field.zoomBy(1.8);});on('zoom-out','click',()=>{pauseStory();field.zoomBy(1/1.8);});on('overview','click',()=>{pauseStory();field.overview();});
on('locate-alex','click',()=>{pauseStory();field.locate('ALEX');});on('locate-you','click',()=>{pauseStory();field.locate('YOU');});
on('toggle-index','click',()=>{pauseStory();$('record-index').hidden=!$('record-index').hidden;$('toggle-index').setAttribute('aria-expanded',String(!$('record-index').hidden));renderIndex();});
on('index-prev','click',()=>{page--;renderIndex();});on('index-next','click',()=>{page++;renderIndex();});
on('close-detail','click',closeDetail);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$<HTMLDialogElement>('profile-dialog').open)closeDetail();});
on('alex-file','click',()=>{if(alex.classList.contains('mini'))openDetail('ALEX');});on('alex-file','keydown',e=>{if((e as KeyboardEvent).key==='Enter')openDetail('ALEX');});on('you-marker','click',()=>openDetail('YOU'));
on('create-profile','click',openProfile);on('edit-profile','click',openProfile);on('profile-close','click',closeProfile);
on('profile-next','click',()=>{const form=$<HTMLFormElement>('profile-form');if(formStep===0&&!form.reportValidity())return;formStep=Math.min(2,formStep+1);showFormStep();($('profile-dialog').querySelector<HTMLElement>(`fieldset[data-profile-step="${formStep}"] input, fieldset[data-profile-step="${formStep}"] select`)??$('profile-submit')).focus();});
on('profile-back','click',()=>{formStep=Math.max(0,formStep-1);showFormStep();});on('profile-form','submit',submitProfile);
$('profile-form').querySelectorAll<HTMLInputElement>('input').forEach(i=>i.addEventListener('input',()=>i.setCustomValidity('')));
on('show-similar','click',()=>{filters={...blankFilters(),similar:true};fillControls();refresh();field.overview();});
on('relax-match','click',()=>{relaxed=!relaxed;refresh();});
on('reset-profile','click',()=>{profile=null;filters.similar=false;relaxed=false;you.hidden=true;charts.setProfile(null);if(selected==='YOU')closeDetail();refresh();$('create-profile').focus();});
on('resume-story','click',async()=>{manual=false;$('archive-section').classList.remove('manual');$('resume-story').hidden=true;filters=blankFilters();autoPhase=-1;if(year!==2025)await switchYear(2025);fillControls();updateScroll();field.overview();});
for(const id of ['nav-explore','skills-explore','return-explore'])on(id,'click',e=>{e.preventDefault();jumpExplore();});
function applyMotion(v:boolean){reduced=v;document.documentElement.classList.toggle('reduced-motion',v);$<HTMLInputElement>('reduce-motion').checked=v;field.setReduced(v);}
applyMotion(reduced);on('reduce-motion','change',()=>applyMotion($<HTMLInputElement>('reduce-motion').checked));reducedMedia.addEventListener('change',()=>applyMotion(reducedMedia.matches));
async function boot(){
  const start=performance.now();$('data-status').textContent='Opening the survey files…';
  try{
    const [data,dict]=await Promise.all([json<Charts>(`${import.meta.env.BASE_URL}data/charts.json`),json<Dictionary>(`${import.meta.env.BASE_URL}data/field-dictionary.json`)]);
    if(!data||!dict)throw Error('Required data is empty');dictionary=dict;
    charts=new StoryCharts(data,async(role,experience)=>{pauseStory();filters={...blankFilters(),role,experience};dimension='role';if(year!==2024)await switchYear(2024);else{fillControls();refresh();}jumpExplore();$('archive-filters').hidden=false;$('filters-toggle').setAttribute('aria-expanded','true');field.focusGroup(role);});
    await switchYear(2025);$('data-status').hidden=true;performance.measure('archive-initial-load',{start,end:performance.now()});document.body.dataset.ready='true';updateScroll();
  }catch(error){$('data-status').classList.add('error');$('data-status').innerHTML='<span>The survey files could not be opened. Start the local server and retry.</span><button id="reload-data">Retry</button>';on('reload-data','click',()=>location.reload());console.error(error);}
}
requestAnimationFrame(updateMarkers);boot();
