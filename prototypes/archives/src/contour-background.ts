import {contours, geoPath} from 'd3';

/** Slowly evolving scalar field, rendered as true isolines. Independent of route DOM. */
export class ContourBackground {
  private canvas=document.createElement('canvas');
  private context:CanvasRenderingContext2D|null;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private raf=0;
  private last=0;
  private time=0;
  private width=0;
  private height=0;
  private ratio=1;
  private cols=96;
  private rows=64;
  private values:number[]=new Array(this.cols*this.rows).fill(0);
  private generate=contours().size([this.cols,this.rows]).thresholds(Array.from({length:18},(_,i)=>.12+i*.075));
  private pointer=[0,0];
  private offset=[0,0];
  private dark=false;
  constructor(){
    this.canvas.id='contour-background';this.canvas.setAttribute('aria-hidden','true');
    this.context=this.canvas.getContext('2d',{alpha:true});
    if(!this.context)return;
    document.body.prepend(this.canvas);document.body.classList.add('live-contours');
    this.dark=document.documentElement.dataset.theme==='dark';
    this.resize();
    window.addEventListener('resize',()=>this.resize(),{passive:true});
    window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')this.pointer=[e.clientX/innerWidth-.5,e.clientY/innerHeight-.5];},{passive:true});
    document.addEventListener('visibilitychange',()=>this.sync());
    this.reduced.addEventListener('change',()=>{this.draw();this.sync();});
    new MutationObserver(()=>{this.dark=document.documentElement.dataset.theme==='dark';this.draw();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    this.sync();
  }
  private resize(){
    this.width=document.documentElement.clientWidth;this.height=innerHeight;
    this.ratio=Math.min(devicePixelRatio||1,1.5);
    this.canvas.width=Math.round(this.width*this.ratio);this.canvas.height=Math.round(this.height*this.ratio);
    this.draw();
  }
  private sync(){
    cancelAnimationFrame(this.raf);this.raf=0;this.last=0;
    const stopped=this.reduced.matches;
    this.canvas.dataset.motion=stopped?'still':document.hidden?'suspended':'running';
    if(!stopped&&!document.hidden)this.raf=requestAnimationFrame(this.tick);
  }
  private tick=(now:number)=>{
    if(!this.last)this.last=now;
    const elapsed=now-this.last;
    // 20 fps is enough for this slow surface; avoid competing with interaction frames.
    if(elapsed>=50){this.time+=Math.min(elapsed,100)*.001;this.last=now;this.draw();}
    this.raf=requestAnimationFrame(this.tick);
  };
  private draw(){
    const ctx=this.context;if(!ctx||!this.width)return;
    if(!this.reduced.matches){for(let i=0;i<2;i++)this.offset[i]+=(this.pointer[i]-this.offset[i])*.045;}
    const phase=this.time*.09,ox=this.offset[0]*.018,oy=this.offset[1]*.018;
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const u=x/(this.cols-1),v=y/(this.rows-1);
      const a=(u-.9-ox-Math.sin(phase)*.045)/.34,b=(v-.22-oy-Math.cos(phase*.8)*.035)/.54;
      const c=(u+.08+Math.sin(phase*.7)*.035)/.39,d=(v-.95+Math.cos(phase*.6)*.04)/.49;
      this.values[y*this.cols+x]=1.5*Math.exp(-(a*a+b*b))+1.05*Math.exp(-(c*c+d*d))+.16*Math.sin(u*9+v*5+phase)+.08*Math.cos(v*11-u*4-phase*.7);
    }
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const sx=this.width/this.cols,sy=this.height/this.rows;
    ctx.setTransform(this.ratio*sx,0,0,this.ratio*sy,0,0);
    const path=geoPath(null,ctx);
    this.generate(this.values).forEach((shape,i)=>{
      ctx.beginPath();path(shape);ctx.strokeStyle=this.dark?`rgba(201,207,188,${i%4===0?.43:.24})`:`rgba(78,87,66,${i%4===0?.38:.22})`;
      ctx.lineWidth=(i%4===0?1.35:.9)/Math.sqrt(sx*sy);ctx.stroke();
    });
  }
}
