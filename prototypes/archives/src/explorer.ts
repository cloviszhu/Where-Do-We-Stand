import { ALEX, esc, n, type Profile, type RecordRow } from './data';
import { partition, dimensions, label, type Dimension, type Cohort, type SurveyRecord } from './site-packets';
import { PacketField, type Position } from './site-field';
import {individualQueue,identityCallouts} from './people-layout';
import type {Packet} from './site-packets';
import { PacketInspector } from './site-inspector';
import {motion, updateIndicators} from './site-motion';
import { applyFilters, emptyFilter, normalize, profileCategory, profileInScope, matchingRules, EXPERIENCE, type ExploreFilter } from './model';

const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const options=(values:string[],any:string)=>`<option value="">${any}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
export class Explorer {
  dimension:Dimension='role';
  filter=emptyFilter();
  profile:Profile|null=null;
  groups:Cohort[]=[];
  field:PacketField;
  inspector=new PacketInspector('endfield');
  private records:SurveyRecord[];
  private byId:Map<string,SurveyRecord>;
  private visible:SurveyRecord[]=[];
  private active=false;
  private focused:Packet|null=null;
  constructor(private source:RecordRow[]) {
    this.records=normalize(source);this.byId=new Map(this.records.map(r=>[r.id,r]));
    const unique=(key:keyof RecordRow)=>[...new Set(source.map(r=>String(r[key])))].sort((a,b)=>a.localeCompare(b));
    $('#filter-role').innerHTML=options(unique('role'),'All roles');
    $('#filter-experience').innerHTML=options(EXPERIENCE,'All experience');
    $('#filter-education').innerHTML=options(unique('education'),'All education');
    $('#filter-country').innerHTML=options(unique('country'),'All countries');
    $('#filter-technology').innerHTML=options([...new Set(source.flatMap(r=>r.used))].sort(),'All languages');
    this.field=new PacketField($<HTMLCanvasElement>('#archive-field'),'endfield',packet=>{
      if(packet.id.startsWith('reference:')){this.locate(packet.id.endsWith('alex')?'alex':'you');return;}
      if(this.focused){this.inspector.open(this.focused);this.inspector.detail(packet.members[0]);this.inspector.returnFocus=$('#browse-records');}else this.openQueue(packet);
    });
    this.field.onResize=()=>this.layout(0);
    this.field.onSettled=()=>{$('#identity-pins').classList.add('settled');};
    const toolbar=document.createElement('div');toolbar.id='queue-toolbar';toolbar.className='queue-toolbar';toolbar.hidden=true;
    toolbar.innerHTML='<button id="queue-back" class="text-link">← All groups</button><label>People in this group <select id="queue-select" aria-label="People in this group"></select></label><button id="queue-prev" class="text-link">← Previous people</button><button id="queue-next" class="text-link">Next people →</button>';
    $('.field-window').before(toolbar);
    $('#queue-back').onclick=()=>{this.focused=null;this.layout();$('#browse-records').focus();};
    const move=(direction:number)=>{const group=this.groups.find(g=>g.name===this.focused?.category);if(!group||!this.focused)return;this.openQueue(group.packets[group.packets.indexOf(this.focused)+direction]);};
    $('#queue-prev').onclick=()=>move(-1);$('#queue-next').onclick=()=>move(1);
    $('#queue-select').onchange=()=>{const group=this.groups.find(g=>g.name===this.focused?.category);if(group)this.openQueue(group.packets[+$<HTMLSelectElement>('#queue-select').value]);};
    this.field.onHover=(packet,x,y)=>{const tip=$('#field-tooltip');tip.hidden=!packet;if(packet){tip.textContent=packet.id.startsWith('reference:')?`${packet.id.endsWith('alex')?'Alex':'YOU'} · reference, excluded from counts`:this.focused?`${packet.members[0].id} · ${packet.members[0].role}`:`${label(packet.category,this.dimension)} / open ${packet.members.length} people`;tip.style.left=`${Math.max(0,Math.min(this.field.width-220,x+12))}px`;tip.style.top=`${Math.max(0,y-45)}px`;}};
    $('#dimension-buttons').innerHTML=dimensions.map(d=>`<button data-dimension="${d.key}" aria-pressed="${d.key===this.dimension}">${d.name}</button>`).join('');
    $('#dimension-buttons').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>{this.dimension=b.dataset.dimension as Dimension;this.update();});
    for(const key of ['role','experience','education','country','technology','query'] as const){
      $<HTMLInputElement>(`#filter-${key}`).addEventListener(key==='query'?'input':'change',e=>{this.filter[key]=(e.target as HTMLInputElement).value;if(key==='experience')this.filter.chartBand='';this.update();});
    }
    $('#clear-filters').onclick=()=>this.reset();$('#empty-clear').onclick=()=>this.reset();
    $('#browse-records').onclick=()=>this.inspector.open(this.focused??undefined);
    $('#locate-alex').onclick=()=>this.locate('alex');
    $('#locate-you').onclick=()=>this.locate('you');
    $('#match-you').onclick=()=>{this.filter=emptyFilter();this.filter.similar=true;this.syncControls();this.update();};
    $('#relax-match').onclick=()=>{this.filter=emptyFilter();this.filter.similar=true;this.filter.relaxed=true;this.syncControls();this.update();};
    this.update(0);
  }
  setActive(active:boolean){this.active=active;if(active){this.field.resume();requestAnimationFrame(()=>this.layout(0));}else{this.field.suspend();}}
  setProfile(p:Profile|null){this.profile=p;if(!p){this.filter.similar=false;this.filter.relaxed=false;}this.update();}
  reset(){this.filter=emptyFilter();this.syncControls();this.update();}
  syncControls(){for(const key of ['role','experience','education','country','technology','query'] as const)$<HTMLInputElement>(`#filter-${key}`).value=this.filter[key];}
  cohort(role:string,chartBand:string){this.filter={...emptyFilter(),role,chartBand};this.dimension='experience';this.syncControls();this.update();}
  update(duration=480){
    this.focused=null;
    $("#locate-message").textContent=this.profile?"Alex and YOU are reference markers, excluded from all survey counts.":"Alex is a fictional guide. Reference markers are excluded from all counts.";
    const rows=applyFilters(this.source,this.filter,this.profile);this.visible=rows.map(r=>this.byId.get(r.id)!);
    this.groups=partition(this.visible,this.dimension);this.inspector.setGroups(this.groups);
    $('#dimension-buttons').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dimension===this.dimension)));
    $('#field-total').textContent=`${n(rows.length)} of ${n(this.records.length)} responses / 2024`;
    $('#field-heading').textContent=`${dimensions.find(d=>d.key===this.dimension)!.name} / ${rows.length===this.records.length?'all respondents':'filtered respondents'}`;
    $('#unit-count').textContent=`${n(this.groups.reduce((v,g)=>v+g.packets.length,0))} units`;
    $('#empty-field').hidden=rows.length>0;$<HTMLButtonElement>('#browse-records').disabled=!rows.length;
    $('#locate-you').hidden=!this.profile;$('#match-you').hidden=!this.profile;
    $('#relax-match').hidden=!(this.filter.similar&&!this.filter.relaxed&&this.profile);
    const active=Object.values(this.filter).some(Boolean);$('#clear-filters').hidden=!active;
    const details=[this.filter.role,this.filter.chartBand?`${this.filter.chartBand} professional coding years (chart group)`:this.filter.experience,this.filter.education,this.filter.country,this.filter.technology,this.filter.query].filter(Boolean);
    $('#filter-summary').textContent=this.filter.similar&&this.profile?`Matching ${matchingRules(this.profile,this.filter.relaxed)}. ${n(rows.length)} responses.`:details.length?`Filters: ${details.join(' / ')}.`:'All responses included. Filters change the sample; arrangement changes its layout.';
    this.layout(duration);
  }
private references(category:string){
    return ([['alex',ALEX],['you',this.profile]] as const).filter((pair):pair is readonly ['alex'|'you',Profile]=>!!pair[1]&&profileInScope(pair[1],this.filter,this.profile)&&profileCategory(pair[1],this.dimension)===category);
  }
  openQueue(packet:Packet){
    if(!packet)return;this.focused=packet;this.layout(480);
  }
  layout(duration=480){
    if(!this.active||this.field.width<10||this.field.height<10)return;
    const w=this.field.width,h=this.field.height,positions:Position[]=[];
    const labels=$('#cluster-labels'),pins=$('#identity-pins');labels.replaceChildren();pins.replaceChildren();pins.classList.remove('settled');updateIndicators();
    $('#queue-toolbar').hidden=!this.focused;$('.field-window').dataset.level=this.focused?'individual':'overview';
    $('.unit-note').textContent=this.focused?'One figure = one response · references excluded':'Overview: one figure = up to 50 replies';
    $('#field-heading').textContent=this.focused?label(this.focused.category,this.dimension):`${dimensions.find(d=>d.key===this.dimension)!.name} / ${this.visible.length===this.records.length?'all respondents':'filtered respondents'}`;
    if(!this.groups.length){this.field.set([],0);return;}
    const color=document.documentElement.dataset.theme==='dark'?'#b3b5af':'#696d64';
    if(this.focused){
      const packet=this.focused,group=this.groups.find(g=>g.name===packet.category)!,index=group.packets.indexOf(packet),refs=this.references(packet.category);
      $('#queue-select').innerHTML=group.packets.map((p,i)=>`<option value="${i}" ${i===index?'selected':''}>${n(i*50+1)}–${n(i*50+p.members.length)} of ${n(group.count)}</option>`).join('');
      $<HTMLButtonElement>('#queue-prev').disabled=index===0;$<HTMLButtonElement>('#queue-next').disabled=index===group.packets.length-1;
      const layout=individualQueue(w,h,packet.members.length,refs.length);
      packet.members.forEach((member,i)=>positions.push({...layout.people[i],color,packet:{id:member.id,category:packet.category,members:[member]}}));
      const callouts=identityCallouts(layout.references,w);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('aria-hidden','true');svg.classList.add('identity-lines');pins.append(svg);
      refs.forEach(([key],i)=>{
        const slot=layout.references[i],callout=callouts[i];positions.push({...slot,color,reference:key,packet:{id:'reference:'+key,category:packet.category,members:[]}});
        const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.dataset.identity=key;line.setAttribute('points',callout.points.map(p=>p.join(',')).join(' '));svg.append(line);
        const pin=document.createElement('button');pin.id='pin-'+key;pin.className='identity-pin '+key;pin.textContent=key==='alex'?'Alex':'YOU';pin.style.cssText=`left:${callout.labelX}px;top:${callout.labelY}px;width:${callout.labelWidth}px`;
        pin.dataset.personX=String(slot.x);pin.dataset.personY=String(slot.y);pin.dataset.personSize=String(slot.size);
        pin.setAttribute('aria-label',`${key==='alex'?'Alex, fictional guide':'YOU, your reference'}; excluded from survey counts`);
        pin.onclick=()=>{$('#locate-message').textContent=`${key==='alex'?'Alex is a fictional guide':'YOU is your reference'} among ${label(packet.category,this.dimension)}. Neither is counted as a survey response.`;};pins.append(pin);
      });
      $('#unit-count').textContent=`${packet.members.length} actual people · ${refs.length} references`;
      $('.stage-bottom > span').textContent='Select a person to read their response. Use the range selector to reach everyone in this group.';
    }else{
      const cols=this.groups.length===1?1:w<600?2:this.groups.length<=4?2:3,rows=Math.ceil(this.groups.length/cols),gap=w<600?16:24,cellW=(w-gap*(cols-1))/cols,cellH=(h-gap*(rows-1))/rows;
      const largest=Math.max(...this.groups.map(g=>g.packets.length)),head=42;
      const maxColumns=Math.max(1,Math.ceil(Math.sqrt(largest*cellW/Math.max(12,cellH-head))));
      const step=Math.min(cellW/maxColumns,Math.max(12,cellH-head)/Math.ceil(largest/maxColumns)),size=Math.min(step*.38,9);
      for(const [index,group]of this.groups.entries()){
        const x=index%cols*(cellW+gap),y=Math.floor(index/cols)*(cellH+gap);
        group.packets.forEach((packet,i)=>positions.push({packet,x:x+(i%maxColumns+.5)*step,y:y+head+(Math.floor(i/maxColumns)+.5)*step,size,color}));
        const button=document.createElement('button');button.className='cluster-label';button.style.cssText=`left:${x}px;top:${y}px;width:${cellW}px`;
        const refs=this.references(group.name).map(([key])=>key==='alex'?'Alex':'YOU');
        button.innerHTML=`<strong>${esc(label(group.name,this.dimension))}</strong><span>${n(group.count)}${refs.length?' · '+refs.join(' / ')+' here':''}</span>`;
        button.setAttribute('aria-label',`Explore ${label(group.name,this.dimension)}, ${n(group.count)} respondents`);button.onclick=()=>this.openQueue(group.packets[0]);labels.append(button);
      }
      $('#unit-count').textContent=`${n(this.groups.reduce((v,g)=>v+g.packets.length,0))} groups of up to 50`;
      $('.stage-bottom > span').textContent='Select a group or figure to meet individual people. Every response remains accessible.';
    }
    this.field.set(positions,duration);
  }

  locate(key:'alex'|'you'){
    const p=key==='alex'?ALEX:this.profile;if(!p)return;
    const cat=profileCategory(p,this.dimension);
    if(profileInScope(p,this.filter,this.profile)){const group=this.groups.find(g=>g.name===cat);if(group&&(!this.focused||this.focused.category!==cat))this.openQueue(group.packets[0]);}
    let pin=$<HTMLButtonElement>(`#pin-${key}`);
    if(!pin){$('#locate-message').textContent=`${key==='alex'?'Alex':'YOU'} belongs to ${label(cat,this.dimension)}, which is outside the current results. Clear filters or choose another arrangement to see this marker.`;return;}
    pin.focus();pin.scrollIntoView({block:'nearest',behavior:'instant'});
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)pin.animate([{outlineOffset:'2px',transform:'scale(1)'},{outlineOffset:'8px',transform:'scale(1.12)'},{outlineOffset:'2px',transform:'scale(1)'}],{duration:400,easing:'cubic-bezier(.16,1,.3,1)'});
    $('#locate-message').textContent=`${key==='alex'?'Alex':'YOU'} / ${label(cat,this.dimension)}. Reference marker only; excluded from ${n(this.visible.length)} actual responses.`;
  }
  close(){this.inspector.dismiss();this.setActive(false);}
}
