import {hierarchy,treemap,treemapSquarify} from 'd3';
import {BANDS,Dimension,RecordRow} from './data';
export interface Position {x:number;y:number;w:number;h:number;group:string}
export interface GroupBox {key:string;n:number;x:number;y:number;w:number;h:number}
export interface Layout {positions:Map<string,Position>;groups:GroupBox[];width:number;height:number}
export function makeLayout(rows:RecordRow[],dimension:Dimension|'all',width=1400,height=1000,markers:{id:string;group:string}[]=[]):Layout {
  const grouped=new Map<string,RecordRow[]>();
  for(const row of rows){const key=dimension==='all'?'All respondents':row[dimension];if(!grouped.has(key))grouped.set(key,[]);grouped.get(key)!.push(row);}
  for(const marker of markers)if(!grouped.has(marker.group))grouped.set(marker.group,[]);
  const entries=[...grouped].sort((a,b)=>dimension==='experience'?BANDS.indexOf(a[0])-BANDS.indexOf(b[0]):b[1].length-a[1].length||a[0].localeCompare(b[0]));
  const minimum=Math.min(180,Math.max(1,rows.length*.00366));
  const data={name:'root',children:entries.map(([name,rs])=>({name,value:Math.max(minimum,rs.length+markers.filter(m=>m.group===name).length)}))};
  const root=hierarchy<{name:string;value?:number;children?:{name:string;value:number}[]}>(data).sum(d=>d.value??0);
  const tree=treemap<typeof data>().tile(treemapSquarify.ratio(1.4)).size([width,height]).paddingInner(14).round(false)(root as never);
  const positions=new Map<string,Position>();const groups:GroupBox[]=[];
  for(const leaf of tree.leaves()){
    const key=leaf.data.name;const records=grouped.get(key)!;const ids=[...markers.filter(m=>m.group===key).map(m=>m.id),...records.map(r=>r.id)];
    const x=leaf.x0,y=leaf.y0,w=leaf.x1-x,h=leaf.y1-y;groups.push({key,n:records.length,x,y,w,h});
    const pad=Math.min(5,w*.06,h*.06),top=Math.min(30,h*.18);
    const iw=Math.max(.01,w-pad*2),ih=Math.max(.01,h-top-pad);
    const cols=Math.max(1,Math.ceil(Math.sqrt(ids.length*iw/(ih*.72))));const numRows=Math.max(1,Math.ceil(ids.length/cols));
    const cw=iw/cols,ch=ih/numRows;const markW=Math.min(cw*.76,ch*.72),markH=Math.min(ch*.78,markW*1.42);
    ids.forEach((id,i)=>positions.set(id,{x:x+pad+(i%cols)*cw+(cw-markW)/2,y:y+top+Math.floor(i/cols)*ch+(ch-markH)/2,w:markW,h:markH,group:key}));
  }
  return {positions,groups,width,height};
}
export function interpolatePosition(a:Position,b:Position,t:number):Position {
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,w:a.w+(b.w-a.w)*t,h:a.h+(b.h-a.h)*t,group:b.group};
}
