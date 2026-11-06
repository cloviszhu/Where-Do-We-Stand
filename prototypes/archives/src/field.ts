import * as d3 from 'd3';
import {RecordRow,Dimension,Profile,profileGroup,ALEX,n} from './data';
import {Layout,Position,makeLayout,interpolatePosition} from './layout';
export class ArchiveField {
  rows:RecordRow[]=[];layout:Layout={positions:new Map(),groups:[],width:1400,height:1000};
  current=new Map<string,Position>();from=new Map<string,Position>();
  transform=d3.zoomIdentity;selected:string|null=null;highlight=new Set<string>();
  reduced=false;reveal=0;year=2025;dimension:Dimension|'all'='all';profile:Profile|null=null;
  width=1;height=1;start=0;duration=0;raf=0;lastPointer={x:0,y:0};
  private ctx:CanvasRenderingContext2D;private zoom:d3.ZoomBehavior<HTMLCanvasElement,unknown>;
  private tree:d3.Quadtree<{id:string;x:number;y:number}>|null=null;
  private rowById=new Map<string,RecordRow>();private keyIndex=0;
  onMotion:()=>void=()=>{};
  constructor(public canvas:HTMLCanvasElement,private open:(id:string)=>void,private manual:()=>void){
    this.ctx=canvas.getContext('2d',{alpha:false})!;
    this.zoom=d3.zoom<HTMLCanvasElement,unknown>().scaleExtent([.08,45]).filter(e=>e.type!=='wheel'||e.ctrlKey||e.metaKey).on('start',e=>{if(e.sourceEvent)this.manual();}).on('zoom',e=>{this.transform=e.transform;this.render();});
    d3.select(canvas).call(this.zoom).on('dblclick.zoom',null);
    canvas.addEventListener('click',e=>{const hit=this.hit(e.offsetX,e.offsetY);if(hit){this.manual();this.select(hit);this.open(hit);}});
    canvas.addEventListener('dblclick',e=>{this.manual();const [x,y]=this.transform.invert([e.offsetX,e.offsetY]);this.setZoom(d3.zoomIdentity.translate(this.width/2-x*this.transform.k*2,this.height/2-y*this.transform.k*2).scale(this.transform.k*2));});
    canvas.addEventListener('pointermove',e=>{if(e.buttons)return;const hit=this.hit(e.offsetX,e.offsetY);const tip=document.getElementById('canvas-hover')!;this.lastPointer={x:e.offsetX,y:e.offsetY};if(hit){const row=this.rowById.get(hit);tip.textContent=row?`${row.id} · ${row.role} · ${row.experience} years`:hit;tip.style.left=`${Math.min(e.offsetX+15,this.width-280)}px`;tip.style.top=`${Math.min(e.offsetY+15,this.height-45)}px`;tip.hidden=false;canvas.style.cursor='pointer';}else{tip.hidden=true;canvas.style.cursor='grab';}});
    canvas.addEventListener('pointerleave',()=>{document.getElementById('canvas-hover')!.hidden=true;});
    canvas.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();this.manual();this.zoomBy(1.6);}else if(e.key==='-'){e.preventDefault();this.manual();this.zoomBy(1/1.6);}else if(e.key.startsWith('Arrow')){e.preventDefault();this.manual();this.keyIndex=Math.max(0,Math.min(this.rows.length-1,this.keyIndex+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)));const r=this.rows[this.keyIndex];if(r){this.select(r.id);this.locate(r.id);document.getElementById('keyboard-status')!.textContent=`${r.id}, ${r.role}, ${r.experience} years. Enter opens this archive.`;}}else if(e.key==='Enter'&&this.selected){e.preventDefault();this.open(this.selected);}else if(e.key==='Home'){e.preventDefault();this.overview();}});
    new ResizeObserver(()=>this.resize()).observe(canvas.parentElement!);
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const resized=Math.abs(this.width-rect.width)>2||Math.abs(this.height-rect.height)>2;
    this.width=rect.width;this.height=rect.height;const dpr=Math.min(devicePixelRatio,2);
    this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);
    if(resized&&this.rows.length)this.update(this.rows,this.dimension,this.year,this.profile,false);
    if(resized||!this.start)this.overview(false);else this.render();
  }
  update(rows:RecordRow[],dimension:Dimension|'all',year:number,profile:Profile|null,animate=true){
    this.sampleCurrent(performance.now());
    const startTime=performance.now();const changedYear=year!==this.year;this.year=year;this.dimension=dimension;this.profile=profile;this.rows=rows;this.rowById=new Map(rows.map(r=>[r.id,r]));
    const markers=[{id:'ALEX',group:dimension==='all'?'All respondents':profileGroup(ALEX,dimension,year)}];if(profile)markers.push({id:'YOU',group:dimension==='all'?'All respondents':profileGroup(profile,dimension,year)});
    const worldWidth=Math.max(700,1000*Math.max(1,this.width-24)/Math.max(1,this.height-24));
    this.layout=makeLayout(rows,dimension,worldWidth,1000,markers);this.from=changedYear?new Map():this.current;
    this.current=new Map();for(const [id,p]of this.layout.positions){this.current.set(id,this.from.get(id)??p);}
    this.start=performance.now();this.duration=animate&&!this.reduced&&!changedYear?850:0;
    if(changedYear){this.selected=null;this.overview(false);}
    this.buildLabels();this.tree=null;this.tick();
    performance.measure('archive-layout',{start:startTime,end:performance.now()});
    this.canvas.dataset.recordCount=String(rows.length);this.canvas.dataset.year=String(year);this.canvas.dataset.dimension=dimension;
  }
  sampleCurrent(now:number){
    if(!this.duration)return;
    const t=d3.easeCubicInOut(Math.min(1,(now-this.start)/this.duration));
    for(const [id,b]of this.layout.positions){this.current.set(id,interpolatePosition(this.from.get(id)??b,b,t));}
  }
  tick(){
    cancelAnimationFrame(this.raf);this.sampleCurrent(performance.now());
    if(!this.duration)this.current=new Map(this.layout.positions);
    this.render();
    if(this.duration&&performance.now()-this.start<this.duration)this.raf=requestAnimationFrame(()=>this.tick());
    else{this.duration=0;this.current=new Map(this.layout.positions);this.tree=d3.quadtree([...this.current].filter(([id])=>id!=='ALEX'&&id!=='YOU').map(([id,p])=>({id,x:p.x+p.w/2,y:p.y+p.h/2})),d=>d.x,d=>d.y);this.render();}
  }
  buildLabels(){
    const root=d3.select('#group-labels');root.selectAll<HTMLButtonElement,typeof this.layout.groups[number]>('button').data(this.layout.groups,d=>d.key).join('button').attr('class','group-label').attr('aria-label',d=>`Focus ${d.key}, ${n(d.n)} respondents`).each(function(d){this.replaceChildren();const title=document.createElement('strong');title.textContent=d.key;const count=document.createElement('small');count.textContent=`${n(d.n)}`;this.append(title,count);}).on('click',(_,d)=>{this.manual();this.focusGroup(d.key);});
    const menu=document.getElementById('focus-group') as HTMLSelectElement;
    menu.replaceChildren(new Option('Focus any group…',''),...this.layout.groups.map(g=>new Option(`${g.key} · ${n(g.n)} (${this.rows.length?(100*g.n/this.rows.length).toFixed(1):'0'}%)`,g.key)));
  }
  render(){
    const c=this.ctx,dpr=Math.min(devicePixelRatio,2),k=this.transform.k;c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#f5f4ed';c.fillRect(0,0,this.width,this.height);
    if(this.reveal<=0){document.getElementById('group-labels')!.style.opacity='0';this.onMotion();return;}
    c.save();c.translate(this.transform.x,this.transform.y);c.scale(k,k);c.globalAlpha=this.reveal;
    c.lineWidth=.65/k;c.strokeStyle='#b6bd9f';
    for(const g of this.layout.groups){c.strokeRect(g.x,g.y,g.w,g.h);}
    const [minX,minY]=this.transform.invert([-10,-10]);const [maxX,maxY]=this.transform.invert([this.width+10,this.height+10]);
    // A single Canvas rectangle always maps to one actual row. Offscreen records are culled, never sampled.
    c.fillStyle=this.selected?'#aeb49e':'#8c957b';let drawn=0;
    for(const [id,p]of this.current){if(id==='ALEX'||id==='YOU'||p.x>maxX||p.x+p.w<minX||p.y>maxY||p.y+p.h<minY)continue;c.fillRect(p.x,p.y,p.w,p.h);drawn++;}
    if(k>3){c.fillStyle='#f2f0e5';for(const [id,p]of this.current){if(id==='ALEX'||id==='YOU'||p.w*k<10||p.x>maxX||p.x+p.w<minX||p.y>maxY||p.y+p.h<minY)continue;c.fillRect(p.x+p.w*.12,p.y+p.h*.16,p.w*.55,p.h*.07);}}
    if(k>3){c.fillStyle='#f7f6f1';c.font=`${10/k}px monospace`;for(const [id,p]of this.current){if(id==='ALEX'||id==='YOU'||p.w*k<36||p.x>maxX||p.x+p.w<minX||p.y>maxY||p.y+p.h<minY)continue;c.fillText(id.split('-')[1],p.x+3/k,p.y+p.h*.6,p.w-6/k);}}
    c.fillStyle='#246b66';for(const id of this.highlight){const p=this.current.get(id);if(p&&p.x>=minX&&p.x<=maxX&&p.y>=minY&&p.y<=maxY)c.fillRect(p.x,p.y,p.w,p.h);}
    if(this.selected){const p=this.current.get(this.selected);if(p){c.fillStyle='#222820';c.fillRect(p.x,p.y-3/k,p.w,p.h);c.strokeStyle='#a45b0b';c.lineWidth=2/k;c.strokeRect(p.x-3/k,p.y-6/k,p.w+6/k,p.h+6/k);}}
    c.restore();this.canvas.dataset.drawnCount=String(drawn);this.canvas.dataset.selected=this.selected??'';
    const labels=document.getElementById('group-labels')!;labels.style.opacity=String(this.reveal);
    d3.select(labels).selectAll<HTMLButtonElement,typeof this.layout.groups[number]>('button').each((g,i,nodes)=>{const x=g.x*k+this.transform.x,y=g.y*k+this.transform.y;const el=nodes[i];el.style.transform=`translate(${x+3}px,${y+3}px)`;el.style.maxWidth=`${Math.max(30,g.w*k-6)}px`;el.hidden=x+g.w*k<0||x>this.width||y<-24||y>this.height||g.w*k<70;});
    this.onMotion();
  }
  hit(x:number,y:number):string|null{
    const [wx,wy]=this.transform.invert([x,y]);
    let best:string|null=null,bestDist=Infinity;
    const candidate=this.tree?.find(wx,wy,18/this.transform.k);
    if(candidate){const p=this.current.get(candidate.id)!;if(wx>=p.x-2/this.transform.k&&wx<=p.x+p.w+2/this.transform.k&&wy>=p.y-2/this.transform.k&&wy<=p.y+p.h+2/this.transform.k)return candidate.id;}
    if(!this.tree)for(const [id,p]of this.current){if(id==='ALEX'||id==='YOU')continue;if(wx>=p.x&&wx<=p.x+p.w&&wy>=p.y&&wy<=p.y+p.h){const dist=(wx-p.x-p.w/2)**2+(wy-p.y-p.h/2)**2;if(dist<bestDist){best=id;bestDist=dist;}}}
    return best;
  }
  select(id:string|null){this.selected=id;this.render();}
  setHighlight(ids:Set<string>){this.highlight=ids;this.render();}
  setReveal(value:number){this.reveal=value;this.render();}
  setReduced(value:boolean){this.reduced=value;if(value){this.duration=0;this.tick();}}
  setZoom(t:d3.ZoomTransform,animate=true){d3.select(this.canvas).interrupt();const selection=d3.select(this.canvas);if(animate&&!this.reduced)selection.transition().duration(380).call(this.zoom.transform,t);else selection.call(this.zoom.transform,t);}
  overview(animate=true){const {width,height}=this.layout;const k=Math.min((this.width-24)/width,(this.height-24)/height);this.setZoom(d3.zoomIdentity.translate((this.width-width*k)/2,(this.height-height*k)/2).scale(k),animate);}
  zoomBy(factor:number){const k=Math.min(45,Math.max(.08,this.transform.k*factor));const [x,y]=this.transform.invert([this.width/2,this.height/2]);this.setZoom(d3.zoomIdentity.translate(this.width/2-x*k,this.height/2-y*k).scale(k));}
  focusGroup(key:string){const g=this.layout.groups.find(g=>g.key===key);if(!g)return;const k=Math.min((this.width-60)/g.w,(this.height-60)/g.h,12);this.setZoom(d3.zoomIdentity.translate((this.width-g.w*k)/2-g.x*k,(this.height-g.h*k)/2-g.y*k).scale(k));}
  locate(id:string){const p=this.layout.positions.get(id);if(!p)return;const k=Math.min(30,Math.max(3,24/Math.max(p.w,1)));this.setZoom(d3.zoomIdentity.translate(this.width*.4-(p.x+p.w/2)*k,this.height*.45-(p.y+p.h/2)*k).scale(k));}
  screenPosition(id:string){const p=this.current.get(id);if(!p)return null;return {x:p.x*this.transform.k+this.transform.x,y:p.y*this.transform.k+this.transform.y,w:p.w*this.transform.k,h:p.h*this.transform.k};}
}
