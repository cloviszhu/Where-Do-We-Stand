import {select,zoom,zoomIdentity,quadtree,easeCubicInOut,type ZoomBehavior,type ZoomTransform,type Quadtree} from 'd3';
import {layoutPeople,type Layout,type Position} from './layout.ts';
import {number,pct,type Person,type GroupKey} from './data.ts';
export class Crowd {
 canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;key:GroupKey='all';people:Person[];layout:Layout;current=new Map<string,Position>();from=new Map<string,Position>();
 items:{id:string;pos:Position;from:Position;to:Position}[]=[];
 selected:string|null=null;highlight=new Set<string>();you:string|null=null;youActive=false;alex:Position={x:1200,y:700}; transform:ZoomTransform=zoomIdentity;zoomBehavior:ZoomBehavior<HTMLCanvasElement,unknown>;index:Quadtree<{id:string;x:number;y:number}>|null=null;
 w=1000;h=600;frame=0;started=0;duration=0;progress=0;story=true;reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;drawTimes:number[]=[];lastDrawn=0;labelSignature='';alexFrom:Position={x:1200,y:720};alexTarget:Position={x:1200,y:720};
 onSelect:(id:string)=>void;onManual:()=>void;observer:ResizeObserver;labelHost:HTMLElement; sprite:HTMLCanvasElement;
 constructor(canvas:HTMLCanvasElement,people:Person[],labels:HTMLElement,onSelect:(id:string)=>void,onManual:()=>void){
  this.canvas=canvas;this.ctx=canvas.getContext('2d')!;this.people=people;this.labelHost=labels;this.onSelect=onSelect;this.onManual=onManual;
  this.layout=layoutPeople(people,'all');this.current=new Map(this.layout.positions);this.items=[...this.current].map(([id,pos])=>({id,pos,from:pos,to:pos}));this.sprite=document.createElement('canvas');this.sprite.width=24;this.sprite.height=40;this.person(this.sprite.getContext('2d')!,12,20,20,'#555e50');
  this.zoomBehavior=zoom<HTMLCanvasElement,unknown>().scaleExtent([.07,15]).filter(e=>!this.story&&(e.type!=='wheel'||e.ctrlKey)&&!e.button).on('start',e=>{if(e.sourceEvent)this.onManual();}).on('zoom',e=>{this.transform=e.transform;this.schedule();});
  select(canvas).call(this.zoomBehavior).on('dblclick.zoom',null);
  canvas.addEventListener('click',e=>{if(this.story)return;const rect=canvas.getBoundingClientRect(),[x,y]=this.transform.invert([e.clientX-rect.left,e.clientY-rect.top]);const hit=this.index?.find(x,y,Math.max(8/this.transform.k,this.layout.size));if(hit)this.onSelect(hit.id);});
  canvas.addEventListener('keydown',e=>{if(this.story)return;const moves:Record<string,[number,number]>={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};if(moves[e.key]){e.preventDefault();this.pan(...moves[e.key]);}if(e.key==='+'||e.key==='='){e.preventDefault();this.scale(1.5);}if(e.key==='-'){e.preventDefault();this.scale(1/1.5);}if(e.key==='Home'){e.preventDefault();this.fit();}});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement!);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{this.reduced=e.matches;this.schedule();});
 }
 person(c:CanvasRenderingContext2D,x:number,y:number,size:number,color:string){
  c.fillStyle=color;c.beginPath();c.arc(x,y-size*.55,size*.19,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(x-size*.2,y-size*.28);c.lineTo(x+size*.2,y-size*.28);c.lineTo(x+size*.33,y+size*.25);c.lineTo(x+size*.13,y+size*.25);c.lineTo(x+size*.12,y+size*.65);c.lineTo(x+size*.015,y+size*.65);c.lineTo(x,y+size*.25);c.lineTo(x-size*.015,y+size*.65);c.lineTo(x-size*.12,y+size*.65);c.lineTo(x-size*.13,y+size*.25);c.lineTo(x-size*.33,y+size*.25);c.closePath();c.fill();
 }
 resize(){this.w=this.canvas.parentElement!.clientWidth;this.h=this.canvas.parentElement!.clientHeight;const dpr=Math.min(devicePixelRatio,2);this.canvas.width=this.w*dpr;this.canvas.height=this.h*dpr;this.canvas.style.width=`${this.w}px`;this.canvas.style.height=`${this.h}px`;if(this.story)this.setStory(this.progress);else this.fit();}
 setPeople(people:Person[]){this.people=people;this.regroup(this.key);}
 regroup(key:GroupKey){this.advance(performance.now());this.key=key;this.from=new Map([...this.current].map(([id,p])=>[id,{...p}]));this.layout=layoutPeople(this.people,key);this.current=new Map([...this.layout.positions].map(([id,p])=>[id,{...(this.from.get(id)||p)}]));this.items=[...this.layout.positions].map(([id,to])=>({id,to,from:this.from.get(id)||to,pos:this.current.get(id)!}));this.started=performance.now();this.duration=1100;this.alexFrom={...this.alex};this.alexTarget=key==='all'?{x:1200,y:720}:this.markerFor(key==='role'?'Student':key==='experience'?'<1':'Unknown');this.index=null;this.labelSignature='';this.schedule();}
 markerFor(group:string){const z=this.layout.zones.find(z=>z.name===group)||this.layout.zones[0];return z?{x:z.x+z.w-22,y:z.y+34}:{x:1200,y:700};}
 setStory(p:number){this.story=true;this.progress=p;const key:GroupKey=p<1.8?'all':p<2.8?'role':'experience';if(key!==this.key)this.regroup(key);const fit=Math.min((this.w-36)/this.layout.width,(this.h-50)/this.layout.height);const t=Math.max(0,Math.min(1,(p-.3)/1.05));const k=this.reduced?fit:Math.exp(Math.log(18)*(1-t)+Math.log(fit)*t);if(!this.duration)this.alex=key==='all'?{x:1200,y:720}:this.alexTarget;this.transform=zoomIdentity.translate(this.w/2-this.alex.x*k,this.h*.53-this.alex.y*k).scale(k);if(t>=1)this.transform=zoomIdentity.translate((this.w-this.layout.width*k)/2,(this.h-this.layout.height*k)/2).scale(k);this.schedule();}
 explore(){if(!this.story)return;this.story=false;select(this.canvas).call(this.zoomBehavior.transform,this.transform);this.fit();}
 fit(){const k=Math.min((this.w-24)/this.layout.width,(this.h-24)/this.layout.height);this.moveTo(zoomIdentity.translate((this.w-this.layout.width*k)/2,(this.h-this.layout.height*k)/2).scale(k));}
 moveTo(t:ZoomTransform,animate=false){const s=select(this.canvas);s.interrupt();if(animate&&!this.reduced)s.transition().duration(900).ease(easeCubicInOut).call(this.zoomBehavior.transform,t);else s.call(this.zoomBehavior.transform,t);}
 scale(factor:number){this.onManual();select(this.canvas).call(this.zoomBehavior.scaleBy,factor);}
 pan(x:number,y:number){this.onManual();this.moveTo(zoomIdentity.translate(this.transform.x+x,this.transform.y+y).scale(this.transform.k));}
 locate(id:string){let pos=id==='Alex'?this.alex:id==='YOU'?(this.you?this.current.get(this.you):{x:50,y:50}):this.current.get(id);if(!pos)return;this.onManual();const k=Math.min(12,Math.max(this.transform.k,3));this.moveTo(zoomIdentity.translate(this.w/2-pos.x*k,this.h/2-pos.y*k).scale(k),true);}
 focusZone(name:string){const z=this.layout.zones.find(z=>z.name===name);if(!z)return;this.onManual();const k=Math.min((this.w-36)/z.w,(this.h-36)/z.h);this.moveTo(zoomIdentity.translate((this.w-z.w*k)/2-z.x*k,(this.h-z.h*k)/2-z.y*k).scale(k));}
 advance(now:number){if(!this.duration)return 1;const t=this.reduced?1:Math.min(1,Math.max(0,(now-this.started)/this.duration)),a=easeCubicInOut(t);for(const item of this.items){const {pos,from,to}=item;pos.x=from.x+(to.x-from.x)*a;pos.y=from.y+(to.y-from.y)*a;}this.alex={x:this.alexFrom.x+(this.alexTarget.x-this.alexFrom.x)*a,y:this.alexFrom.y+(this.alexTarget.y-this.alexFrom.y)*a};if(t===1)this.duration=0;return t;}
 schedule(){if(!this.frame)this.frame=requestAnimationFrame(t=>this.draw(t));}
 draw(now:number){this.frame=0;const start=performance.now(),t=this.advance(now),c=this.ctx,dpr=this.canvas.width/this.w,k=this.transform.k;
  // During reverse/replay, the marker may still be moving back from its old group.
  // Keep the close camera attached to its current position, not its old anchor.
  if(this.story&&this.progress<1.35)this.transform=zoomIdentity.translate(this.w/2-this.alex.x*k,this.h*.53-this.alex.y*k).scale(k);
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,this.w,this.h);c.save();c.translate(this.transform.x,this.transform.y);c.scale(k,k);
  const reveal=!this.story||this.progress>.3;let count=0;
  if(reveal){c.globalAlpha=this.story?Math.max(0,Math.min(1,(this.progress-.3)*1.8)):1;
   for(const p of this.items){const pos=p.pos;const sx=pos.x*k+this.transform.x,sy=pos.y*k+this.transform.y;if(sx<-15||sx>this.w+15||sy<-15||sy>this.h+15)continue;count++;const size=this.layout.size*.8;
    c.globalAlpha=(this.story?Math.max(0,Math.min(1,(this.progress-.3)*1.8)):1)*(this.highlight.size&&!this.highlight.has(p.id)?.18:1);
    if(size*k<3){c.fillStyle=this.highlight.has(p.id)?'#9b5c1d':'#555e50';c.fillRect(pos.x-size*.2,pos.y-size*.7,size*.4,size*1.4);}else c.drawImage(this.sprite,pos.x-size*.6,pos.y-size,size*1.2,size*2);
    if(size*k>=3&&this.highlight.has(p.id))this.person(c,pos.x,pos.y,size,'#9b5c1d');
   }
  }
  c.globalAlpha=1;
  const marker=(pos:Position,label:string,color:string)=>{const size=Math.max(this.story?7:this.layout.size*1.3,10/k);this.person(c,pos.x,pos.y,size,color);c.strokeStyle=color;c.lineWidth=1.3/k;c.setLineDash(label==='Alex'?[3/k,3/k]:[]);c.strokeRect(pos.x-size*.65,pos.y-size*.95,size*1.3,size*1.9);c.setLineDash([]);c.font=`600 ${12/k}px 'Segoe UI',sans-serif`;c.fillStyle=color;c.fillText(label,pos.x+size*.8,pos.y);};
  marker(this.alex,'Alex','#9b5c1d');if(this.youActive){const pos=this.you?this.current.get(this.you):null;marker(pos?{x:pos.x+this.layout.size*1.7,y:pos.y}:{x:50,y:50},pos?'YOU':'YOU · no displayed match','#1e645e');}
  if(this.selected&&this.current.has(this.selected)){const pos=this.current.get(this.selected)!;c.strokeStyle='#242621';c.lineWidth=2/k;c.beginPath();c.arc(pos.x,pos.y,Math.max(this.layout.size,9/k),0,Math.PI*2);c.stroke();}
  c.restore();this.lastDrawn=count;this.canvas.dataset.drawn=String(count);this.canvas.dataset.group=this.key;this.canvas.dataset.selected=this.selected||'';
  this.labels();if(t<1)this.schedule();else if(!this.index)this.index=quadtree<{id:string;x:number;y:number}>().x(p=>p.x).y(p=>p.y).addAll([...this.current].map(([id,pos])=>({id,...pos})));
  this.drawTimes.push(performance.now()-start);if(this.drawTimes.length>300)this.drawTimes.shift();
 }
 labels(){const visible=(!this.story||this.progress>=1.8)&&this.transform.k<2;const signature=`${visible}/${this.key}/${this.people.length}/${this.transform.toString()}`;if(signature===this.labelSignature)return;this.labelSignature=signature;this.labelHost.replaceChildren();if(!visible)return;for(const z of this.layout.zones){const x=z.x*this.transform.k+this.transform.x,y=z.y*this.transform.k+this.transform.y,w=z.w*this.transform.k;if(x+w<0||x>this.w||y<0||y>this.h)continue;const b=document.createElement('button');b.className='zone-label';b.style.left=`${x}px`;b.style.top=`${y}px`;b.style.width=`${Math.max(60,w-8)}px`;b.textContent=`${z.name} · ${number.format(z.n)} (${pct(z.n,this.people.length)})`;b.title=`Zoom into ${z.name}`;b.onclick=()=>this.focusZone(z.name);this.labelHost.append(b);}}
}
