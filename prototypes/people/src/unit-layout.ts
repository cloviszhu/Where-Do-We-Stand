import {partition, type Packet, type Cohort} from './units/packets.ts';
import {type Person, type GroupKey} from './data.ts';

export type Point = {x:number;y:number};
export type Zone = {name:string;x:number;y:number;w:number;h:number;n:number;center:Point;radius:number};
export type UnitLayout = {positions:Map<string,Point>;colors:Map<string,string>;packets:Map<string,Packet>;respondentUnit:Map<string,string>;groups:Cohort[];zones:Zone[];size:number;width:number;height:number};

// Keep the reviewed palette and category identity even when filtering changes rank.
export const unitPalette=['#fc8cbd','#9db6f6','#73dbe7','#d6a6ee','#9c86ce','#eabeb9','#a3d2d6','#bf91ae','#9296ca'];
const domains:Record<GroupKey,string[]>={
 all:['All respondents'],
 role:['Full-stack','Other reported roles','Back-end','Unknown','Student','Front-end','Desktop / enterprise','Mobile','Embedded'],
 experience:['<1','1–2','3–5','6–10','11–20','21–30','31+','Unknown'],
 education:['Bachelor’s','Master’s','Some college','Secondary','Unknown','Professional / doctorate','Associate','Primary','Other education'],
 ai:['Yes',"No, and I don't plan to","No, but I plan to soon",'Unknown']
};
export function categoryColor(key:GroupKey,name:string){const i=domains[key].indexOf(name);return key==='all'?'#bca1d7':unitPalette[i<0?8:i%unitPalette.length];}

/** Layout identities belong to view-specific units; real respondent IDs remain stable. */
export function layoutUnits(people:Person[], key:GroupKey,width=1440,height=780,labelHeight=64,edgeGutter=90):UnitLayout {
 const groups=partition(people,key);
 const positions=new Map<string,Point>(),colors=new Map<string,string>(),packets=new Map<string,Packet>(),respondentUnit=new Map<string,string>(),zones:Zone[]=[];
 const count=groups.reduce((n,g)=>n+g.packets.length,0);
 let size=10;
 if(key==='all'){
  const usableWidth=width-edgeGutter-60;
  const cols=Math.max(1,Math.ceil(Math.sqrt(count*usableWidth/height))),rows=Math.max(1,Math.ceil(count/cols));
  const step=Math.min(usableWidth/cols,(height-120)/rows);size=Math.min(14,step*.6);
  groups[0]?.packets.forEach((p,i)=>positions.set(p.id,{x:edgeGutter+(usableWidth-cols*step)/2+(i%cols+.5)*step,y:(height-rows*step)/2+(Math.floor(i/cols)+.5)*step}));
  if(groups.length)zones.push({name:'All respondents',x:50,y:15,w:width-100,h:height-30,n:people.length,center:{x:width/2,y:height/2},radius:0});
 }else{
  const cols=Math.max(1,Math.min(5,Math.ceil(Math.sqrt(groups.length*width/height*.72)))),rows=Math.ceil(groups.length/cols),cw=width/cols,ch=height/Math.max(1,rows);
  const maximum=Math.max(1,...groups.map(g=>g.packets.length));
  const header=Math.min(ch*.6,labelHeight),radius=Math.min(cw*.42,(ch-header)*.43);size=Math.min(14,radius*Math.sqrt(Math.PI/maximum)*.72);
  groups.forEach((g,index)=>{
   const row=Math.floor(index/cols),inRow=Math.min(cols,groups.length-row*cols),cx=width/2+(index%cols-(inRow-1)/2)*cw,cy=row*ch+header+(ch-header)*.5;
   const r=radius*Math.sqrt(g.packets.length/maximum);
   g.packets.forEach((p,i)=>{const a=i*2.399963229728653,rr=r*Math.sqrt((i+.5)/g.packets.length);positions.set(p.id,{x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr});});
   zones.push({name:g.name,x:cx-cw*.46,y:row*ch+5,w:cw*.92,h:ch-12,n:g.count,center:{x:cx,y:cy},radius:r});
  });
 }
 for(const g of groups)for(const p of g.packets){packets.set(p.id,p);colors.set(p.id,categoryColor(key,g.name));for(const r of p.members)respondentUnit.set(r.id,p.id);}
 return {positions,colors,packets,respondentUnit,groups,zones,size,width,height};
}
