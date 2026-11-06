import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutUnits} from '../src/unit-layout.ts';
import {transitionUnits,advanceUnits} from '../src/unit-transition.ts';
import {markerTarget,createMarker,retargetMarker,advanceMarker} from '../src/unit-markers.ts';
import {matching,profileCriteria,type Person,type Profile} from '../src/data.ts';
const packed=JSON.parse(readFileSync(new URL('../public/data/people.json',import.meta.url),'utf8'));
const people:Person[]=packed.rows.map((r:any[])=>Object.fromEntries(packed.columns.map((k:string,i:number)=>[k,packed.dictionaries[k]?.[r[i]]??r[i]])));
test('every respondent maps to exactly one current unit across all classifications',()=>{
 for(const key of ['all','role','experience','education','ai'] as const){
  const a=layoutUnits(people,key);
  assert.equal(a.respondentUnit.size,65437);
  assert.equal([...a.packets.values()].reduce((s,p)=>s+p.members.length,0),65437);
  for(const [id,packet] of a.packets){assert(packet.members.length<=50&&packet.members.length>0);assert(a.positions.has(id));for(const p of packet.members){assert.equal(a.respondentUnit.get(p.id),id);if(key!=='all')assert.equal(p[key],packet.category);}}
 }
 const all=layoutUnits(people,'all');assert.equal(all.packets.size,1309);assert.equal([...all.packets.values()].at(-1)!.members.length,37);
 assert.equal(layoutUnits(people,'role').packets.size,1313);
});
test('layout stays finite and in bounds at desktop/mobile aspect ratios, including empty subsets',()=>{
 for(const key of ['all','role','experience','education','ai'] as const)for(const h of [450,780,1440])for(const source of [people,people.slice(0,1),[]]){
  const l=layoutUnits(source,key,1440,h);for(const p of l.positions.values()){assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(p.x>=0&&p.x<=l.width&&p.y>=0&&p.y<=l.height);}assert.equal(l.respondentUnit.size,source.length);
 }
});
test('YOU finds the same underlying record after repacking and never changes survey counts',()=>{
 const profile:Profile={roleRaw:'Student',experience:'<1',education:'',country:'Canada',language:'JavaScript',goal:'full-stack'};
 const cohort=matching(people,profileCriteria(profile));assert(cohort.length>0);
 for(const key of ['all','role','experience','education','ai'] as const){const l=layoutUnits(people,key);const unit=l.respondentUnit.get(cohort[0].id)!;assert(l.packets.get(unit)!.members.some(p=>p.id===cohort[0].id));assert.equal(l.respondentUnit.size,people.length);}
 assert.equal(matching(people,{roleRaw:'Student',country:'not-a-country'}).length,0);
});

test('all category changes animate ordinary units through intermediate positions, not only Alex',()=>{
 const keys=['all','role','experience','education','ai'] as const;
 for(const fromKey of keys)for(const toKey of keys){
  if(fromKey===toKey)continue;
  const before=layoutUnits(people,fromKey),after=layoutUnits(people,toKey);
  const units=transitionUnits(before,before.positions,after);
  const travelers=units.filter(p=>Math.hypot(p.from.x-p.to.x,p.from.y-p.to.y)>1);
  assert(travelers.length>units.length*.9,`${fromKey} -> ${toKey}: ordinary people must travel`);
  for(const p of units)assert.deepEqual(p.from,before.positions.get(before.respondentUnit.get(p.anchorId)!));
  assert(advanceUnits(units,550,1100)>units.length*.9);
  for(const p of travelers){assert.notDeepEqual(p.pos,p.from);assert.notDeepEqual(p.pos,p.to);}
  assert.equal(advanceUnits(units,1300,1100),0);
  for(const p of units){assert.deepEqual(p.pos,p.to);assert.equal(p.displayColor,p.color);}
 }
});

test('interruption and filtering follow actual members, while category colors stay stable',()=>{
 const all=layoutUnits(people,'all'),role=layoutUnits(people,'role'),experience=layoutUnits(people,'experience');
 const first=transitionUnits(all,all.positions,role);advanceUnits(first,480,1100);
 const current=new Map(first.map(p=>[p.id,p.pos]));
 const interrupted=transitionUnits(role,current,experience,first);
 for(const p of interrupted)assert.deepEqual(p.from,current.get(role.respondentUnit.get(p.anchorId)!));
 for(const key of ['role','experience','education','ai'] as const){
  const full=layoutUnits(people,key),subset=layoutUnits(people.filter(p=>p.country==='Canada'),key);
  const colors=new Set(full.groups.map(g=>full.colors.get(g.packets[0].id)));
  assert.equal(colors.size,full.groups.length,'category colors must be distinguishable');
  const motion=transitionUnits(full,full.positions,subset);
  for(const p of motion){const oldId=full.respondentUnit.get(p.anchorId)!;assert.deepEqual(p.from,full.positions.get(oldId));assert.equal(p.color,full.colors.get(oldId));}
  advanceUnits(motion,0,0);for(const p of motion)assert.deepEqual(p.pos,p.to);
 }
});

test('story introduces the crowd before all four chart groups',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ids=[...html.matchAll(/<section id="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['start','alex','people','peers','pay','skills','ai','your-plan']);
 assert(!html.includes('id="motion-button"'),'full motion is the default; no motion picker');
});

test('guides keep ordinary body size and occupy the left rim of the correct cohort',()=>{
 const anchor=matching(people,{roleRaw:'Student',experience:'<1',country:'Canada',language:'JavaScript'})[0].id;
 for(const key of ['all','role','experience','education','ai'] as const)for(const h of [450,780,1440]){
  const l=layoutUnits(people,key,1440,h),count=l.respondentUnit.size;
  for(const name of ['Alex','YOU'] as const){
   const m=markerTarget(l,key,name,anchor),z=l.zones.find(z=>z.name===m.group)!;
   assert.equal(m.size,l.size*.8);assert(m.pos.x<z.center.x);assert(m.pos.x>=0&&m.pos.y>=0&&m.pos.y<=l.height);
   if(key!=='all')assert(Math.hypot(m.pos.x-z.center.x,m.pos.y-z.center.y)>z.radius,'guide must sit beyond real units');
   if(name==='YOU')assert.equal(m.group,l.packets.get(l.respondentUnit.get(anchor)!)!.category);
   assert.deepEqual(markerTarget(l,key,name,anchor),m,'redraw must not randomize the marker');
  }
  const a=markerTarget(l,key,'Alex'),y=markerTarget(l,key,'YOU',anchor);
  if(a.group===y.group)assert(a.pos.y<y.pos.y,'same-cohort names need separate upper/lower arcs');
  assert.equal(l.respondentUnit.size,count,'guides are never survey records');
 }
 const empty=layoutUnits([],'role');
 for(const name of ['Alex','YOU'] as const){const m=markerTarget(empty,'role',name,anchor);assert.equal(m.group,null);assert(Number.isFinite(m.pos.x)&&Number.isFinite(m.pos.y));}
 const subset=layoutUnits(people.filter(p=>p.role==='Full-stack'),'role');
 assert.equal(markerTarget(subset,'role','Alex').group,null,'do not invent a missing Student cohort');
 assert.equal(markerTarget(subset,'role','YOU',anchor).group,null,'hidden exact matches belong in the margin');
});

test('guide interruptions resume from the visible frame and reduced motion lands exactly',()=>{
 const all=layoutUnits(people,'all'),role=layoutUnits(people,'role'),experience=layoutUnits(people,'experience');
 const marker=createMarker('Alex',markerTarget(all,'all','Alex'));
 const initial={...marker.pos};retargetMarker(marker,markerTarget(role,'role','Alex'),0,true);
 assert(advanceMarker(marker,420));assert.notDeepEqual(marker.pos,initial);assert.notDeepEqual(marker.pos,marker.to);
 const middle={...marker.pos};retargetMarker(marker,markerTarget(experience,'experience','Alex'),420,true);
 assert.deepEqual(marker.from,middle);advanceMarker(marker,1700);assert.deepEqual(marker.pos,marker.to);assert.equal(marker.size,experience.size*.8);
 retargetMarker(marker,markerTarget(role,'role','Alex'),1800,true);assert.equal(advanceMarker(marker,1801,true),false);assert.deepEqual(marker.pos,marker.to);assert.equal(marker.size,role.size*.8);
});
