import { SceneGesture } from './story-gesture';
import { motion } from './site-motion';

/** Fixed stage, discrete route states; no intermediate scroll position between scenes. */
export class StoryDeck {
  private gesture = new SceneGesture();
  private touch: {x:number;y:number;forward:boolean;backward:boolean}|null = null;
  constructor(private step:(direction:number)=>void) {
    const story=document.querySelector<HTMLElement>('#story-view')!;
    const ai=document.querySelector<HTMLElement>('[data-story="ai"]')!;
    const trust=document.createElement('article');trust.className='chapter';trust.dataset.story='ai-trust';trust.hidden=true;
    trust.innerHTML='<div class="chapter-heading"><div><span class="chapter-kicker">05 / WORKING WITH AI · 2 OF 2</span><h1 tabindex="-1">Frequency and trust.</h1></div><p class="lead">Within each group, how much do people trust AI?</p></div><div class="chart-layout"><aside class="chart-story"><h2>Compare within each group.</h2><p>Each bar adds to 100% of valid trust answers in that use-frequency group.</p><p>The bars do not show how common each frequency is. Missing trust answers are excluded and listed beside the chart.</p><p class="source-line">2025 survey · independent groups · valid trust answers</p></aside><div class="chart-panel"></div></div>';
    const panel=trust.querySelector('.chart-panel')!;
    for(const id of ['ai-composition','trust-legend','ai-composition-note'])panel.append(document.getElementById(id)!);
    const readout=document.createElement('p');readout.id='ai-composition-readout';readout.className='chart-readout';readout.setAttribute('aria-live','polite');readout.textContent='Focus a segment for its count and group denominator.';panel.append(readout);
    ai.querySelector('.chart-panel h3')?.remove();ai.after(trust);
    ai.querySelector('.chapter-kicker')!.textContent='05 / WORKING WITH AI · 1 OF 2';
    const stage=document.createElement('div');stage.className='story-stage';
    story.insertBefore(stage,story.querySelector('.chapter'));
    story.querySelectorAll<HTMLElement>('.chapter').forEach(el=>{el.tabIndex=-1;stage.append(el);});
    const hint=document.createElement('span');hint.className='scene-hint';hint.textContent='Scroll to continue · or choose a chapter';document.querySelector('#chapter-progress')!.after(hint);
    // Long tables are explicit modal reading surfaces, not extra page length.
    story.querySelectorAll<HTMLDetailsElement>('.data-table').forEach(details=>{
      const text=details.querySelector('summary')!.textContent!;
      const button=document.createElement('button');button.type='button';button.className='text-link data-trigger';button.textContent=text;
      const dialog=document.createElement('dialog');dialog.className='story-detail';
      const id=details.querySelector('div')!.id+'-heading';dialog.setAttribute('aria-labelledby',id);
      dialog.innerHTML=`<header><h2 id="${id}">${text}</h2><button type="button" class="ef-btn" aria-label="Close data table">Close ×</button></header>`;
      dialog.append(details.querySelector('div')!);document.body.append(dialog);details.replaceWith(button);
      let returnFocus=button;
      const open=(trigger:HTMLButtonElement)=>{returnFocus=trigger;dialog.showModal();dialog.querySelector<HTMLButtonElement>('button')!.focus();};
      button.onclick=()=>open(button);
      if(id==='ai-table-heading'){const second=button.cloneNode(true) as HTMLButtonElement;panel.append(second);second.onclick=()=>open(second);}
      dialog.querySelector<HTMLButtonElement>('button')!.onclick=()=>dialog.close();
      dialog.addEventListener('close',()=>{if(returnFocus.getClientRects().length)returnFocus.focus({preventScroll:true});});
    });
    const enabled=()=>document.body.dataset.page==='story'&&!document.querySelector('dialog[open]');
    const interactive=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('input,select,textarea,button,a,[role="button"],[role="img"],[contenteditable="true"]');
    const canRead=(target:EventTarget|null,direction:number)=>{
      let el=target instanceof Element?target:null;
      while(el&&el!==story){
        if(el instanceof HTMLElement&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+2){
          if(direction>0?el.scrollTop+el.clientHeight<el.scrollHeight-2:el.scrollTop>2)return true;
        }
        el=el.parentElement;
      }
      return false;
    };
    window.addEventListener('wheel',e=>{
      if(!enabled()||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      if(e.target instanceof Element&&e.target.closest('input,select,textarea'))return;
      const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
      const reading=canRead(e.target,Math.sign(delta));
      const direction=this.gesture.feed(delta,performance.now(),reading);
      if(!reading)e.preventDefault();
      if(direction)this.step(direction);
    },{passive:false});
    window.addEventListener('keydown',e=>{
      if(!enabled()||interactive(e.target)||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
      const direction=['ArrowDown','PageDown',' '].includes(e.key)?1:['ArrowUp','PageUp'].includes(e.key)?-1:0;
      if(!direction||canRead(e.target,direction))return;
      e.preventDefault();this.gesture.reset();this.step(direction);
    });
    story.addEventListener('touchstart',e=>{
      if(!enabled()||e.touches.length!==1||interactive(e.target)){this.touch=null;return;}
      const p=e.touches[0];this.touch={x:p.clientX,y:p.clientY,forward:canRead(e.target,1),backward:canRead(e.target,-1)};
    },{passive:true});
    story.addEventListener('touchend',e=>{
      const start=this.touch;this.touch=null;if(!start||!enabled())return;
      const p=e.changedTouches[0],dy=start.y-p.clientY;
      if(dy>0?start.forward:start.backward)return;
      if(Math.abs(dy)>75&&Math.abs(dy)>Math.abs(start.x-p.clientX)*1.5)this.step(Math.sign(dy));
    },{passive:true});
  }
  enter(id:string,direction=1){
    document.querySelectorAll<HTMLDialogElement>('.story-detail[open]').forEach(d=>d.close());
    const scene=document.querySelector<HTMLElement>(`[data-story="${id}"]`)!;
    scene.scrollTop=0;
    motion(scene,[{opacity:.25,transform:`translateY(${direction*12}px)`},{opacity:1,transform:'translateY(0)'}],300);
    document.querySelector('.scene-hint')!.textContent=id==='reflection'?'Explore the people · or revisit a chapter':'Scroll to continue · or choose a chapter';
  }
}
