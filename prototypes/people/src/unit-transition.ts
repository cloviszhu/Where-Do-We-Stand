import type {Point,UnitLayout} from './unit-layout.ts';

export type UnitMotion={id:string;anchorId:string;from:Point;to:Point;pos:Point;color:string;fromColor:string;displayColor:string;blend:number;fromSize:number;size:number;toSize:number;delay:number};
function mixColor(a:string,b:string,t:number){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');}

/** Units are view-specific. Follow an actual member to its previously drawn unit. */
export function transitionUnits(previous:UnitLayout,current:Map<string,Point>,next:UnitLayout,previousItems:UnitMotion[]=[]):UnitMotion[]{
 const oldItems=new Map(previousItems.map(p=>[p.id,p]));
 return [...next.packets].map(([id,packet],i)=>{
  const anchor=packet.members.find(r=>current.has(previous.respondentUnit.get(r.id)||''))||packet.members[0];
  const oldId=previous.respondentUnit.get(anchor.id),old=oldId?current.get(oldId):undefined;
  const from=old?{...old}:{x:next.width/2,y:next.height*.55};
  const to=next.positions.get(id)!;
  const fromSize=oldId?(oldItems.get(oldId)?.size??previous.size):0;
  const fromColor=(oldId?oldItems.get(oldId)?.displayColor||previous.colors.get(oldId):undefined)||next.colors.get(id)!;
  return {id,anchorId:anchor.id,from,to,pos:{...from},color:next.colors.get(id)!,fromColor,displayColor:fromColor,blend:0,fromSize,size:fromSize,toSize:next.size,delay:(i%37)*4};
 });
}

/** Finite duration reaches exact targets; interrupted changes start at the rendered frame. */
export function advanceUnits(items:UnitMotion[],elapsed:number,duration:number):number {
 let moving=0;
 for(const p of items){
  const t=duration<=0?1:Math.max(0,Math.min(1,(elapsed-p.delay)/duration));
  if(t===1){Object.assign(p.pos,p.to);p.size=p.toSize;p.blend=1;p.displayColor=p.color;continue;}
  const a=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  p.pos.x=p.from.x+(p.to.x-p.from.x)*a;p.pos.y=p.from.y+(p.to.y-p.from.y)*a;
  p.size=p.fromSize+(p.toSize-p.fromSize)*a;
  p.blend=a;p.displayColor=mixColor(p.fromColor,p.color,a);
  if(t<1)moving++;
 }
 return moving;
}
