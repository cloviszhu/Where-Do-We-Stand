import {select,zoom,zoomIdentity,quadtree,easeCubicInOut,type ZoomBehavior,type ZoomTransform,type Quadtree} from 'd3';
import {layoutUnits as layoutPeople,type UnitLayout as Layout,type Point as Position} from './unit-layout.ts';
import {type Packet} from './units/packets.ts';
import {transitionUnits,advanceUnits,type UnitMotion} from './unit-transition.ts';
import {categoryColor} from './unit-layout.ts';
import {markerTarget,createMarker,retargetMarker,advanceMarker,type GuideMarker} from './unit-markers.ts';
import {number,pct,type Person,type GroupKey} from './data.ts';
export class UnitCrowd {
 canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;key:GroupKey='all';people:Person[];layout:Layout;current=new Map<string,Position>();from=new Map<string,Position>();
 items:UnitMotion[]=[];movingUnits=0;
 onUnit:(packet:Packet)=>void=()=>{};hover:string|null=null;selected:string|null=null;highlight=new Set<string>();you:string|null=null;youActive=false;guides:Record<'Alex'|'YOU',GuideMarker>;transform:ZoomTransform=zoomIdentity;zoomBehavior:ZoomBehavior<HTMLCanvasElement,unknown>;index:Quadtree<{id:string;x:number;y:number}>|null=null;
 w=1000;h=600;frame=0;started=0;duration=0;progress=0;story=true;reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;drawTimes:number[]=[];lastDrawn=0;labelSignature='';markerLabels:{name:string;x:number;y:number;w:number;h:number}[]=[];
 onSelect:(id:string)=>void;onManual:()=>void;observer:ResizeObserver;labelHost:HTMLElement;sprites=new Map<string,HTMLCanvasElement>();
 constructor(canvas:HTMLCanvasElement,people:Person[],labels:HTMLElement,onSelect:(id:string)=>void,onManual:()=>void){
  this.canvas=canvas;this.ctx=canvas.getContext('2d')!;this.people=people;this.labelHost=labels;this.onSelect=onSelect;this.onManual=onManual;
  this.layout=layoutPeople(people,'all');this.items=transitionUnits(this.layout,this.layout.positions,this.layout);this.current=new Map(this.items.map(p=>[p.id,p.pos]));
  this.guides={Alex:createMarker('Alex',markerTarget(this.layout,'all','Alex')),YOU:createMarker('YOU',markerTarget(this.layout,'all','YOU'))};
  this.zoomBehavior=zoom<HTMLCanvasElement,unknown>().scaleExtent([.07,15]).filter(e=>!this.story&&(e.type!=='wheel'||e.ctrlKey)&&!e.button).on('start',e=>{if(e.sourceEvent)this.onManual();}).on('zoom',e=>{this.transform=e.transform;this.schedule();});
  select(canvas).call(this.zoomBehavior).on('dblclick.zoom',null);
  canvas.addEventListener('click',e=>{if(this.story){this.onManual();return;}const rect=canvas.getBoundingClientRect(),[x,y]=this.transform.invert([e.clientX-rect.left,e.clientY-rect.top]);const hit=this.index?.find(x,y,Math.max(8/this.transform.k,this.layout.size));if(hit){const packet=this.layout.packets.get(hit.id);if(packet)this.onUnit(packet);}});
  canvas.addEventListener('pointermove',e=>{if(this.story)return;const b=canvas.getBoundingClientRect(),[x,y]=this.transform.invert([e.clientX-b.left,e.clientY-b.top]);const hit=this.index?.find(x,y,Math.max(10/this.transform.k,this.layout.size));this.hover=hit?.id||null;canvas.style.cursor=hit?'pointer':'grab';const tip=document.getElementById('unit-tip');if(tip){tip.hidden=!hit;if(hit){const p=this.layout.packets.get(hit.id)!;tip.textContent=p.category+' / '+p.members.length+' responses — open unit';}}this.schedule();});
  canvas.addEventListener('pointerleave',()=>{this.hover=null;document.getElementById('unit-tip')!.hidden=true;this.schedule();});
  canvas.addEventListener('keydown',e=>{if(this.story)return;const moves:Record<string,[number,number]>={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};if(moves[e.key]){e.preventDefault();this.pan(...moves[e.key]);}if(e.key==='+'||e.key==='='){e.preventDefault();this.scale(1.5);}if(e.key==='-'){e.preventDefault();this.scale(1/1.5);}if(e.key==='Home'){e.preventDefault();this.fit();}});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement!);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{this.reduced=e.matches;if(this.reduced){select(this.canvas).interrupt();this.advance(performance.now());if(this.story)this.setStory(this.progress);}this.schedule();});
 }
 get groups(){return this.layout.groups;}
 get alex(){return this.guides.Alex.pos;}
 updateMarkers(animate=true){const now=performance.now();for(const name of ['Alex','YOU'] as const)retargetMarker(this.guides[name],markerTarget(this.layout,this.key,name,this.you),now,animate&&!this.reduced);this.schedule();}
 setYou(id:string|null,active:boolean){this.you=id;this.youActive=active;retargetMarker(this.guides.YOU,markerTarget(this.layout,this.key,'YOU',id),performance.now(),active&&!this.reduced);this.schedule();}
 positionFor(id:string){return this.current.get(this.layout.respondentUnit.get(id)||id);}
 person(c:CanvasRenderingContext2D,x:number,y:number,size:number,color:string){
  c.fillStyle=color;c.beginPath();c.arc(x,y-size*.55,size*.19,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(x-size*.2,y-size*.28);c.lineTo(x+size*.2,y-size*.28);c.lineTo(x+size*.33,y+size*.25);c.lineTo(x+size*.13,y+size*.25);c.lineTo(x+size*.12,y+size*.65);c.lineTo(x+size*.015,y+size*.65);c.lineTo(x,y+size*.25);c.lineTo(x-size*.015,y+size*.65);c.lineTo(x-size*.12,y+size*.65);c.lineTo(x-size*.13,y+size*.25);c.lineTo(x-size*.33,y+size*.25);c.closePath();c.fill();
 }
 resize(){this.w=this.canvas.parentElement!.clientWidth;this.h=this.canvas.parentElement!.clientHeight;const dpr=Math.min(devicePixelRatio,2);this.canvas.width=this.w*dpr;this.canvas.height=this.h*dpr;this.canvas.style.width=`${this.w}px`;this.canvas.style.height=`${this.h}px`;this.regroup(this.key,false);if(this.story)this.setStory(this.progress);else this.fit();}
 setPeople(people:Person[]){this.people=people;this.regroup(this.key);}
 regroup(key:GroupKey,animate=true){
  this.advance(performance.now());const previous=this.layout;
  this.key=key;this.layout=layoutPeople(this.people,key,1440,Math.max(450,1440*this.h/this.w),(this.w<600?60:42)*1440/this.w,90*1440/this.w);
  this.items=transitionUnits(previous,this.current,this.layout,this.items);this.sprites.clear();
  this.current=new Map(this.items.map(p=>[p.id,p.pos]));
  this.started=performance.now();this.duration=animate&&!this.reduced?1100:0;
  this.updateMarkers(animate);
  if(!this.duration)advanceUnits(this.items,0,0);
  this.movingUnits=this.duration?this.items.filter(p=>Math.hypot(p.to.x-p.from.x,p.to.y-p.from.y)>1).length:0;
  this.hover=null;document.getElementById('unit-tip')!.hidden=true;this.index=null;this.labelSignature='';this.schedule();
 }
 sprite(color:string){let sprite=this.sprites.get(color);if(!sprite){sprite=document.createElement('canvas');sprite.width=24;sprite.height=40;this.person(sprite.getContext('2d')!,12,20,20,color);this.sprites.set(color,sprite);}return sprite;}
 setStory(p:number){this.story=true;this.progress=p;const key:GroupKey=p<1.8?'all':p<2.8?'role':'experience';if(key!==this.key)this.regroup(key);const fit=Math.min((this.w-36)/this.layout.width,(this.h-50)/this.layout.height);const t=Math.max(0,Math.min(1,(p-.3)/1.05));const k=this.reduced?fit:Math.exp(Math.log(18)*(1-t)+Math.log(fit)*t);this.transform=zoomIdentity.translate(this.w/2-this.alex.x*k,this.h*.53-this.alex.y*k).scale(k);if(t>=1)this.transform=zoomIdentity.translate((this.w-this.layout.width*k)/2,(this.h-this.layout.height*k)/2).scale(k);this.schedule();}
 explore(){if(!this.story)return;this.story=false;select(this.canvas).call(this.zoomBehavior.transform,this.transform);this.fit();}
 fit(){const k=Math.min((this.w-24)/this.layout.width,(this.h-24)/this.layout.height);this.moveTo(zoomIdentity.translate((this.w-this.layout.width*k)/2,(this.h-this.layout.height*k)/2).scale(k));}
 moveTo(t:ZoomTransform,animate=false){const s=select(this.canvas);s.interrupt();if(animate&&!this.reduced)s.transition().duration(900).ease(easeCubicInOut).call(this.zoomBehavior.transform,t);else s.call(this.zoomBehavior.transform,t);}
 scale(factor:number){this.onManual();select(this.canvas).call(this.zoomBehavior.scaleBy,factor);}
 pan(x:number,y:number){this.onManual();this.moveTo(zoomIdentity.translate(this.transform.x+x,this.transform.y+y).scale(this.transform.k));}
 locate(id:string){const targetFor=(record:string)=>this.layout.positions.get(this.layout.respondentUnit.get(record)||'');const pos=id==='Alex'?this.guides.Alex.to:id==='YOU'?this.guides.YOU.to:targetFor(id);if(!pos)return;this.onManual();const k=Math.min(6,Math.max(this.transform.k,2.5));this.moveTo(zoomIdentity.translate(this.w/2-pos.x*k,this.h/2-pos.y*k).scale(k),true);}
 focusZone(name:string){const z=this.layout.zones.find(z=>z.name===name);if(!z)return;this.onManual();const k=Math.min((this.w-36)/z.w,(this.h-36)/z.h);this.moveTo(zoomIdentity.translate((this.w-z.w*k)/2-z.x*k,(this.h-z.h*k)/2-z.y*k).scale(k));}
 advance(now:number){
  const alexMoving=advanceMarker(this.guides.Alex,now,this.reduced),youMoving=advanceMarker(this.guides.YOU,now,this.reduced);
  if(this.duration){this.movingUnits=advanceUnits(this.items,now-this.started,this.reduced?0:this.duration);if(!this.movingUnits)this.duration=0;}
  return this.duration||alexMoving||youMoving?0:1;
 }
 brightUnits=new Set<string>();cachedHighlight:Set<string>|null=null;cachedSize=-1;cachedLayout:Layout|null=null;
 schedule(){if(this.cachedHighlight!==this.highlight||this.cachedSize!==this.highlight.size||this.cachedLayout!==this.layout){this.brightUnits=new Set([...this.highlight].map(id=>this.layout.respondentUnit.get(id)).filter(Boolean) as string[]);this.cachedHighlight=this.highlight;this.cachedSize=this.highlight.size;this.cachedLayout=this.layout;}if(!this.frame)this.frame=requestAnimationFrame(t=>this.draw(t));}
 draw(now:number){this.frame=0;const start=performance.now(),t=this.advance(now),c=this.ctx,dpr=this.canvas.width/this.w,k=this.transform.k;
  // During reverse/replay, the marker may still be moving back from its old group.
  // Keep the close camera attached to its current position, not its old anchor.
  if(this.story&&this.progress<1.35)this.transform=zoomIdentity.translate(this.w/2-this.alex.x*k,this.h*.53-this.alex.y*k).scale(k);
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,this.w,this.h);c.save();c.translate(this.transform.x,this.transform.y);c.scale(k,k);
  const reveal=!this.story||this.progress>.3;let count=0;
  if(reveal){c.globalAlpha=this.story?Math.max(0,Math.min(1,(this.progress-.3)*1.8)):1;
   for(const p of this.items){const pos=p.pos;const sx=pos.x*k+this.transform.x,sy=pos.y*k+this.transform.y;if(sx<-15||sx>this.w+15||sy<-15||sy>this.h+15)continue;count++;const size=p.size*.8;
    const opacity=(this.story?Math.max(0,Math.min(1,(this.progress-.3)*1.8)):1)*(this.highlight.size&&!this.brightUnits.has(p.id)?.25:1);c.globalAlpha=opacity;
    if(size*k<3){c.fillStyle=p.displayColor;c.fillRect(pos.x-size*.2,pos.y-size*.7,size*.4,size*1.4);}else{
     if(p.blend<1){c.globalAlpha=opacity*(1-p.blend);c.drawImage(this.sprite(p.fromColor),pos.x-size*.6,pos.y-size,size*1.2,size*2);}
     c.globalAlpha=opacity*p.blend;c.drawImage(this.sprite(p.color),pos.x-size*.6,pos.y-size,size*1.2,size*2);c.globalAlpha=opacity;
    }
    if(this.hover===p.id){c.strokeStyle='#74edff';c.lineWidth=1/k;c.strokeRect(pos.x-size,pos.y-size,size*2,size*2);}
    if(this.brightUnits.has(p.id)){c.strokeStyle='#74edff';c.lineWidth=1/k;c.strokeRect(pos.x-size*.7,pos.y-size,size*1.4,size*2);}
   }
  }
  c.globalAlpha=1;
  this.markerLabels=[];
  for(const guide of [this.guides.Alex,...(this.youActive?[this.guides.YOU]:[])]){
   const {pos,size,color,name}=guide,sx=pos.x*k+this.transform.x,sy=pos.y*k+this.transform.y;
   if(sx<0||sx>this.w||sy<0||sy>this.h)continue;
   // The same body scale as ordinary units; emphasis comes only from color and a leader.
   c.save();c.shadowColor=color;c.shadowBlur=3/k;this.person(c,pos.x,pos.y,size,color);c.restore();
   c.save();c.setTransform(dpr,0,0,dpr,0,0);c.font=`500 ${this.w<600?11:13}px 'IBM Plex Mono',monospace`;
   const textWidth=c.measureText(name).width,labelX=Math.max(textWidth+8,sx-Math.max(25,size*k*.8)),labelY=Math.max(18,Math.min(this.h-12,sy+(name==='Alex'?-16:20)));
   c.strokeStyle=color;c.lineWidth=.9;c.setLineDash([2,3]);c.beginPath();c.moveTo(sx-size*k*.45,sy);c.lineTo(labelX+6,labelY-4);c.stroke();c.setLineDash([]);
   c.fillStyle=color;c.textAlign='right';c.fillText(name,labelX,labelY);c.restore();
   this.markerLabels.push({name,x:labelX-textWidth,y:labelY-13,w:textWidth,h:16});
  }
  if(this.selected&&this.layout.respondentUnit.has(this.selected)){const pos=this.positionFor(this.selected)!;c.strokeStyle='#ffffff';c.lineWidth=2/k;c.beginPath();c.arc(pos.x,pos.y,Math.max(this.layout.size,9/k),0,Math.PI*2);c.stroke();}
  c.restore();this.lastDrawn=count;this.canvas.dataset.unitCount=String(this.items.length);this.canvas.dataset.responseCount=String(this.people.length);this.canvas.dataset.drawn=String(count);this.canvas.dataset.group=this.key;this.canvas.dataset.selected=this.selected||'';
  this.labels();if(t<1)this.schedule();else if(!this.index)this.index=quadtree<{id:string;x:number;y:number}>().x(p=>p.x).y(p=>p.y).addAll([...this.current].map(([id,pos])=>({id,...pos})));
  this.drawTimes.push(performance.now()-start);if(this.drawTimes.length>300)this.drawTimes.shift();
 }
 labels(){const visible=(!this.story||this.progress>=1.8)&&this.transform.k<2;const signature=`${visible}/${this.key}/${this.people.length}/${this.transform.toString()}`;if(signature===this.labelSignature)return;this.labelSignature=signature;this.labelHost.replaceChildren();if(!visible)return;for(const z of this.layout.zones){const x=z.x*this.transform.k+this.transform.x,y=z.y*this.transform.k+this.transform.y,w=z.w*this.transform.k;if(x+w<0||x>this.w||y<0||y>this.h)continue;const b=document.createElement('button');b.className='zone-label';b.style.left=`${x}px`;b.style.top=`${y}px`;b.style.width=`${Math.max(60,w-8)}px`;b.textContent=`${z.name==='All respondents'?'Everyone':z.name} · ${number.format(z.n)} (${pct(z.n,this.people.length)})`;b.style.setProperty('--cohort-color',categoryColor(this.key,z.name));b.title=`Zoom into ${z.name}`;b.onclick=()=>this.focusZone(z.name);this.labelHost.append(b);}}
}
