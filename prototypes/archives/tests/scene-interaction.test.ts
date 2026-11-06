import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneGesture} from '../src/story-gesture';
import {individualQueue,identityCallouts} from '../src/people-layout';

test('a long inertial wheel burst advances once, the next intentional gesture can advance',()=>{
  const gate=new SceneGesture();const advances=[];
  for(let t=0;t<1600;t+=16){const d=gate.feed(t<200?18:3,t);if(d)advances.push(d);}
  assert.deepEqual(advances,[1]);assert.equal(gate.feed(90,2000),1);
  assert.equal(gate.feed(-90,2700),-1);
});
test('small movements do not advance; reading a long surface consumes its entire gesture',()=>{
  const gate=new SceneGesture();assert.equal(gate.feed(12,0),0);assert.equal(gate.feed(12,20),0);
  assert.equal(gate.feed(100,400,true),0);assert.equal(gate.feed(100,450,false),0);
  assert.equal(gate.feed(100,900,false),1);
});
test('queue labels and leader segments avoid every person, including both references',()=>{
  for(const width of [260,339,689,959,1260,1500])for(const height of [215,240,300,370,500,640])for(const count of [1,15,37,50])for(const refs of [0,1,2]){
    const q=individualQueue(width,height,count,refs),all=[...q.references,...q.people],labels=identityCallouts(q.references,width);
    assert.equal(q.people.length,count);assert.equal(q.references.length,refs);
    for(const p of all){assert.ok(p.size>0);assert.ok(p.x-p.size*.6>=0&&p.x+p.size*.6<=width);assert.ok(p.y-p.size*1.2>=0&&p.y+p.size*1.2<=height);assert.equal(p.size,all[0].size);}
    for(const l of labels){
      assert.ok(l.labelX>=0&&l.labelX+l.labelWidth<=width);
      for(const p of all){
        const box={x1:p.x-p.size*.6,x2:p.x+p.size*.6,y1:p.y-p.size*1.2,y2:p.y+p.size*1.2};
        assert.ok(l.labelX+l.labelWidth<=box.x1||l.labelX>=box.x2||l.labelY+24<=box.y1||l.labelY>=box.y2,'label overlaps person');
        for(let i=1;i<l.points.length;i++){
          const [a,b]=[l.points[i-1],l.points[i]];
          assert.ok(Math.max(a[0],b[0])<box.x1||Math.min(a[0],b[0])>box.x2||Math.max(a[1],b[1])<box.y1||Math.min(a[1],b[1])>box.y2,'line crosses person');
        }
      }
    }
    if(labels.length===2){const [a,b]=labels;assert.ok(a.labelY+24<=b.labelY||a.labelX+a.labelWidth<=b.labelX||b.labelX+b.labelWidth<=a.labelX);}
  }
});
