import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decode,ALEX,type Packed,type Dictionary,type Charts} from '../src/data';
import {normalize,band2024,applyFilters,emptyFilter,similar,readProfile,profileCategory,profileInScope,displayPayGroup} from '../src/model';
import {partition,dimensions} from '../src/site-packets';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`../public/data/${name}`,import.meta.url),'utf8'));
const source=decode(read('records-2024.json') as Packed,read('field-dictionary.json') as Dictionary);
const records=normalize(source);
test('B real 2024 data: every arrangement retains every ID exactly once and every remainder',()=>{
  assert.equal(records.length,65437);
  for(const d of dimensions){const groups=partition(records,d.key);const all=groups.flatMap(g=>g.packets.flatMap(p=>{assert.ok(p.members.length>0&&p.members.length<=50);assert.ok(p.members.every(r=>d.key==='all'||r[d.key]===g.name));return p.members.map(r=>r.id);}));assert.equal(all.length,65437);assert.equal(new Set(all).size,65437);}
  const overview=partition(records,'all')[0].packets;assert.equal(overview.length,1309);assert.equal(overview.at(-1)!.members.length,37);
});
test('B professional experience preserves missing answers and does not use WorkExp',()=>{
  assert.equal(band2024(null),'Unknown');assert.equal(band2024(0),'<1');assert.equal(band2024(30),'21–30');assert.equal(band2024(31),'31+');
  for(let i=0;i<source.length;i++)assert.equal(records[i].experience,band2024(source[i].codingYears));
  assert.equal(records.filter(r=>r.role==='Unknown').length,source.filter(r=>!r.roleRaw).length);
  const different=source.find(r=>r.codingYears!==null&&r.workYears!==null&&band2024(r.codingYears)!==band2024(r.workYears));assert.ok(different);assert.equal(records.find(r=>r.id===different.id)!.experience,band2024(different.codingYears));
});
test('Every heatmap cell opens its exact original role and chart band including 21+',()=>{
  const charts=read('charts.json') as Charts;
  for(const row of charts.heatmap.rows)for(const cell of row.cells){const filtered=applyFilters(source,{...emptyFilter(),role:row.role,chartBand:cell.band},null);assert.equal(filtered.length,cell.n,`${row.role} ${cell.band}`);}
  const roles=source.filter(r=>r.role==='Senior executive');assert.ok(roles.length);assert.ok(normalize(roles).every(r=>r.role==='Other reported roles'));
});
test('YOU strict matching and explicit relaxation never add a survey respondent',()=>{
  const person=source.find(r=>r.codingYears!==null&&r.used.length&&r.country!=='Not reported')!;
  const profile={...ALEX,role:person.role,codingYears:person.codingYears,education:person.education,country:person.country,technology:person.used[0],ai:person.ai};
  assert.ok(similar(person,profile));assert.equal(similar(person,{...profile,aspiration:'A different target'}),true);
  const strict=applyFilters(source,{...emptyFilter(),similar:true},profile),relaxed=applyFilters(source,{...emptyFilter(),similar:true,relaxed:true},profile);assert.ok(strict.length>0);assert.ok(relaxed.length>=strict.length);
  const impossible={...profile,country:'No such country'};assert.equal(applyFilters(source,{...emptyFilter(),similar:true},impossible).length,0);assert.ok(applyFilters(source,{...emptyFilter(),similar:true,relaxed:true},impossible).length>0);
  assert.equal(source.length,65437);assert.equal(profileCategory(profile,'experience'),band2024(profile.codingYears));
});
test('Profile input keeps unknown distinct from zero and rejects invalid years',()=>{
  const base={role:'Student',years:'',education:'',country:'',technology:'',aspiration:'Full-stack',ai:''};assert.equal(readProfile(base).codingYears,null);assert.equal(readProfile({...base,years:'0'}).codingYears,0);
  for(const invalid of ['-1','81','NaN','1.5'])assert.throws(()=>readProfile({...base,years:invalid}));assert.throws(()=>readProfile({...base,role:''}));
});
test('Record ID filtering reaches the last real response and zero results are explicit',()=>{
  const last=applyFilters(source,{...emptyFilter(),query:'2024-65437'},null);assert.equal(last.length,1);assert.equal(last[0].id,'2024-65437');
  assert.equal(applyFilters(source,{...emptyFilter(),query:'does-not-exist'},null).length,0);assert.deepEqual(partition([],'role'),[]);
});
test('Illustrative markers never imply membership in incompatible filtered samples',()=>{
  assert.equal(profileInScope(ALEX,{...emptyFilter(),role:'Full-stack'},null),false);
  assert.equal(profileInScope(ALEX,{...emptyFilter(),query:'2024-6'},null),false);
  assert.equal(profileInScope(ALEX,{...emptyFilter(),role:'Student',experience:'<1'},null),true);
});
test('Compensation suppression is consistent at threshold and for partial values',()=>{
  const row={band:'<1',n:10,median:70000,q1:50000,q3:100000};
  for(const count of [0,9])assert.equal(displayPayGroup({...row,n:count},10).median,null);
  assert.equal(displayPayGroup(row,10).median,70000);
  for(const field of ['median','q1','q3'] as const){const hidden=displayPayGroup({...row,[field]:null},10);assert.equal(hidden.median,null);assert.equal(hidden.q1,null);assert.equal(hidden.q3,null);}
});
