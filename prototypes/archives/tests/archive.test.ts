import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decode,Dictionary,Packed,filterRecords,blankFilters,Profile,experienceBand,matchesProfile,profileGroup} from '../src/data';
import {makeLayout,interpolatePosition} from '../src/layout';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`../public/data/${name}`,import.meta.url),'utf8'));
const dict:Dictionary=read('field-dictionary.json');
const full=decode(read('records-2025.json') as Packed,dict);
const older=decode(read('records-2024.json') as Packed,dict);
test('all actual respondents are indexed once; annual IDs cannot collide',()=>{
  assert.equal(full.length,49191);assert.equal(older.length,65437);
  assert.equal(new Set([...full,...older].map(r=>r.id)).size,114628);
  assert.ok(full.every(r=>r.codingYears===null));
  assert.ok(full.some(r=>r.workYears===null));
});
test('all four layouts retain the same real identities and keep marks inside their group',()=>{
  for(const width of [950,1400,3750])for(const dim of ['role','experience','education','ai'] as const){
    const layout=makeLayout(full,dim,width,1000,[{id:'ALEX',group:dim==='experience'?'<1':dim==='role'?'Student':dim==='education'?'Some college':'Not reported'}]);
    assert.equal(layout.positions.size,full.length+1);
    assert.equal(layout.groups.reduce((sum,g)=>sum+g.n,0),full.length);
    const groups=new Map(layout.groups.map(g=>[g.key,g]));
    for(const row of full){const p=layout.positions.get(row.id)!;const g=groups.get(p.group)!;assert.ok(p.w>0&&p.h>0);assert.ok(p.x>=g.x&&p.y>=g.y&&p.x+p.w<=g.x+g.w+.01&&p.y+p.h<=g.y+g.h+.01,`${dim}/${p.group}/${row.id} outside group`);}
  }
});
test('interrupted movement can continue from the displayed position without changing identity',()=>{
  const a={x:0,y:0,w:4,h:6,group:'old'},b={x:100,y:200,w:3,h:5,group:'middle'},c={x:30,y:10,w:8,h:9,group:'final'};
  const current=interpolatePosition(a,b,.4);assert.deepEqual(interpolatePosition(current,c,0),{...current,group:'final'});assert.deepEqual(interpolatePosition(current,c,1),c);
});
test('missing experience is not zero, and matches have transparent optional conditions',()=>{
  assert.equal(experienceBand(null),'Not reported');assert.equal(experienceBand(0),'<1');
  const p:Profile={role:'Full-stack',workYears:5,codingYears:null,education:'',country:'',technology:'',aspiration:'Architect',ai:'Not reported'};
  assert.equal(profileGroup(p,'education',2025),'Not reported');
  const matching=filterRecords(full,{...blankFilters(),similar:true},p);
  assert.ok(matching.length>0);assert.ok(matching.every(r=>r.role==='Full-stack'&&r.experience==='3-5'));
  assert.ok(full.filter(r=>matchesProfile(r,p)).length===matching.length);
  assert.equal(full.length,49191);
  assert.equal(filterRecords(full,{...blankFilters(),query:'not-a-real-id'},null).length,0);
  assert.equal(filterRecords(full,{...blankFilters(),query:'2025-49191'},null).length,1);
});
test('heatmap scope opens exactly the documented source cohort',()=>{
  const charts=read('charts.json');
  for(const row of charts.heatmap.rows){for(const cell of row.cells){const files=filterRecords(older,{...blankFilters(),role:row.role,experience:cell.band},null);assert.equal(files.length,cell.n);}}
});
test('adding illustrative markers never changes group counts or real-record access',()=>{
  const layout=makeLayout(full,'role',1400,1000,[{id:'ALEX',group:'Student'},{id:'YOU',group:'An uncommon local role'}]);
  assert.equal(layout.positions.size,49193);assert.equal(layout.groups.reduce((s,g)=>s+g.n,0),49191);
  assert.equal(layout.groups.find(g=>g.key==='An uncommon local role')!.n,0);
  assert.ok(layout.positions.has('2025-49191'));
});
