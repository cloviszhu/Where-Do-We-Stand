import {hierarchy,treemap,treemapSquarify} from 'd3';
import {bands,type Person,type GroupKey} from './data.ts';
export type Position={x:number;y:number};
export type Zone={name:string;n:number;x:number;y:number;w:number;h:number};
export type Layout={positions:Map<string,Position>;zones:Zone[];size:number;width:number;height:number};
export function layoutPeople(people:Person[],key:GroupKey):Layout{
 const width=2400,height=1450,groups=new Map<string,Person[]>();
 for(const p of people){const k=key==='all'?'All respondents':p[key];if(!groups.has(k))groups.set(k,[]);groups.get(k)!.push(p);}
 const entries=[...groups.entries()].sort((a,b)=>key==='experience'?bands.indexOf(a[0])-bands.indexOf(b[0]):b[1].length-a[1].length||a[0].localeCompare(b[0]));
 if(!people.length)return{positions:new Map(),zones:[],size:6,width,height};
 const root=hierarchy<any>({children:entries.map(([name,rows])=>({name,value:rows.length}))}).sum(d=>d.value||0);
 const rects=treemap<any>().tile(treemapSquarify).size([width,height]).paddingOuter(8).paddingInner(25)(root).leaves();
 const zones=rects.map(r=>({name:r.data.name,n:r.value!,x:r.x0,y:r.y0,w:r.x1-r.x0,h:r.y1-r.y0}));
 let size=12;
 for(const z of zones){while(Math.max(1,Math.floor((z.w-14)/size))*Math.max(1,Math.floor((z.h-72)/(size*1.5)))<z.n&&size>.7)size-=.1;}
 const positions=new Map<string,Position>();
 for(const z of zones){const rows=groups.get(z.name)!,cols=Math.max(1,Math.floor((z.w-14)/size)); rows.forEach((p,i)=>positions.set(p.id,{x:z.x+8+(i%cols+.5)*size,y:z.y+65+(Math.floor(i/cols)+.5)*size*1.5}));}
 return {positions,zones,size,width,height};
}
