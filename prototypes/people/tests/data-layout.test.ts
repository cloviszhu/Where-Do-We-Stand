import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutPeople} from '../src/layout.ts';
import {heatData,technologyData,quantiles,matching,profileCriteria,type Person,type GroupKey} from '../src/data.ts';
const packed=JSON.parse(readFileSync(new URL('../public/data/people.json',import.meta.url),'utf8'));
const people:Person[]=packed.rows.map((r:unknown[])=>Object.fromEntries(packed.columns.map((k:string,i:number)=>[k,packed.dictionaries[k]?packed.dictionaries[k][r[i] as number]:r[i]])));
test('all source identities survive every layout, with finite in-bounds positions',()=>{
 assert.equal(people.length,65437);assert.equal(new Set(people.map(p=>p.id)).size,65437);
 for(const key of ['all','role','experience','education','ai'] as GroupKey[]){
  const layout=layoutPeople(people,key);assert.equal(layout.positions.size,people.length);
  assert.equal(layout.zones.reduce((s,z)=>s+z.n,0),people.length);
  for(const p of layout.positions.values()){assert.ok(p.x>=0&&p.x<=layout.width);assert.ok(p.y>=0&&p.y<=layout.height,`${key}: y ${p.y}`);}
  const repeat=layoutPeople(people,key);assert.deepEqual(repeat.positions,layout.positions);
 }
});
test('empty and one-person subsets have usable, bounded layouts',()=>{
 assert.equal(layoutPeople([],'role').positions.size,0);
 const l=layoutPeople([people[0]],'role');assert.equal(l.positions.size,1);assert.ok(l.positions.get(people[0].id)!.y<l.height);
});
test('AND matching ignores omitted fields, preserves unknown and separates goals',()=>{
 const p=people.find(p=>p.languages.includes('Python'))!;
 assert.ok(matching(people,{roleRaw:p.roleRaw,language:'Python'}).every(r=>r.roleRaw===p.roleRaw&&r.languages.includes('Python')));
 assert.equal(matching(people,{country:'a country not in the data'}).length,0);
 assert.equal(matching(people,{}).length,65437);
 assert.equal(matching(people,{experience:'Unknown'}).length,13827);
 assert.ok(!('goal' in profileCriteria({roleRaw:'Student',experience:'<1',education:'',country:'',language:'',goal:'CEO'})));
});
test('chart math has within-role denominators, paired language answers and R7 quartiles',()=>{
 const p=people[0],fixture=[{...p,roleRaw:'A',experience:'<1',languages:['X'],wanted:['X','Y']},{...p,roleRaw:'A',experience:'1–2',languages:['Y'],wanted:['Y']},{...p,roleRaw:'A',experience:'Unknown',languages:['X'],wanted:[]}];
 const heat=heatData(fixture)[0];assert.equal(heat.total,3);assert.equal(heat.n,2);assert.equal(heat.missing,1);assert.equal(heat.cells.reduce((s,c)=>s+c.n,0),2);
 assert.deepEqual(technologyData(fixture).find(d=>d.language==='X'),{language:'X',n:2,used:1,wanted:1});
 assert.deepEqual(quantiles([10,20,30,100]),{n:4,q1:17.5,median:25,q3:47.5});
});
