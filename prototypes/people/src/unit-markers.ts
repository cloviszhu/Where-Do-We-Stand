import type {GroupKey} from './data.ts';
import type {Point,UnitLayout} from './unit-layout.ts';

export type GuideName='Alex'|'YOU';
export type MarkerTarget={pos:Point;size:number;group:string|null};
export type GuideMarker=MarkerTarget&{name:GuideName;color:string;from:Point;to:Point;fromSize:number;toSize:number;started:number;duration:number};
const alexGroups:Record<GroupKey,string>={all:'All respondents',role:'Student',experience:'<1',education:'Some college',ai:'Unknown'};

/** A stable pseudo-random angle: redraws and resizing never reshuffle the identity. */
export function markerTarget(layout:UnitLayout,key:GroupKey,name:GuideName,record:string|null=null):MarkerTarget {
 const group=name==='Alex'?alexGroups[key]:layout.packets.get(layout.respondentUnit.get(record||'')||'')?.category;
 const zone=layout.zones.find(z=>z.name===group),size=layout.size*.8;
 if(!zone)return {pos:{x:layout.width*.1,y:layout.height*(name==='Alex'?.76:.88)},size,group:null};
 let hash=2166136261;
 for(const c of `${name}/${key}/${group}/${name==='YOU'?record:''}`)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 // Separate arcs keep two names readable even when they belong to the same cohort.
 const angle=((name==='Alex'?194:146)+(hash%1000)/1000*20)*Math.PI/180;
 if(key==='all'){
  const points=[...layout.positions.values()];
  const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
  return {pos:{x:left-size*1.6,y:(top+bottom)/2+Math.sin(angle)*(bottom-top)*.45},size,group:zone.name};
 }
 const radius=zone.radius+size*1.5;
 return {pos:{x:zone.center.x+Math.cos(angle)*radius,y:zone.center.y+Math.sin(angle)*radius},size,group:zone.name};
}

export function createMarker(name:GuideName,target:MarkerTarget):GuideMarker {
 return {...target,name,color:name==='Alex'?'#ffffff':'#ffe36e',from:{...target.pos},to:{...target.pos},fromSize:target.size,toSize:target.size,started:0,duration:0};
}
export function advanceMarker(marker:GuideMarker,now:number,reduced=false):boolean {
 if(!marker.duration)return false;
 const t=reduced?1:Math.min(1,Math.max(0,(now-marker.started)/marker.duration));
 const a=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 marker.pos={x:marker.from.x+(marker.to.x-marker.from.x)*a,y:marker.from.y+(marker.to.y-marker.from.y)*a};
 marker.size=marker.fromSize+(marker.toSize-marker.fromSize)*a;
 if(t===1){marker.pos={...marker.to};marker.size=marker.toSize;marker.duration=0;}
 return t<1;
}
export function retargetMarker(marker:GuideMarker,target:MarkerTarget,now:number,animate:boolean){
 advanceMarker(marker,now);
 marker.from={...marker.pos};marker.fromSize=marker.size;marker.to={...target.pos};marker.toSize=target.size;marker.group=target.group;marker.started=now;marker.duration=animate?1100:0;
 if(!animate){marker.pos={...target.pos};marker.size=target.size;}
}
