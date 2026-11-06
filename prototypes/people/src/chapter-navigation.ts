/** Native snapping owns chapter changes. Cap a gesture at the unread edge of a long chapter. */
export function initChapterNavigation(){
 const sections=[...document.querySelectorAll<HTMLElement>('main>section')];
 let lastWheel=0,heldDirection=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function nestedScroll(target:EventTarget|null){
  for(let node=target instanceof Element?target:null;node&&node!==document.body;node=node.parentElement){
   if(node.matches('dialog,input,select,textarea,[contenteditable=true]'))return true;
   const style=getComputedStyle(node);
   if(node.scrollHeight>node.clientHeight+1&&/(auto|scroll)/.test(style.overflowY))return true;
  }
  return false;
 }
 function unreadEdge(delta:number):number|null{
  const inset=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0;
  const section=sections.find(s=>{const b=s.getBoundingClientRect();return b.top<=inset+2&&b.bottom>inset+2;});
  if(!section)return null;
  const b=section.getBoundingClientRect();
  if(delta>0&&b.bottom>innerHeight+2&&delta>=b.bottom-innerHeight)return scrollY+b.bottom-innerHeight;
  if(delta<0&&b.top<inset-2&&-delta>=inset-b.top)return scrollY+b.top-inset;
  const index=sections.indexOf(section);
  if(delta>0&&index<sections.length-1){const next=sections[index+1].getBoundingClientRect().top-inset;if(next>2&&delta>=next)return scrollY+next;}
  if(delta<0&&index>0){const previous=sections[index-1].getBoundingClientRect().bottom-innerHeight;if(previous<-2&&delta<=previous)return scrollY+previous;}
  return null;
 }
 addEventListener('wheel',event=>{
  if(event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||nestedScroll(event.target))return;
  const now=performance.now(),direction=Math.sign(event.deltaY),sameGesture=now-lastWheel<180;lastWheel=now;
  // A trackpad's trailing momentum must not push the next chapter into the reading area.
  if(sameGesture&&heldDirection===direction){event.preventDefault();return;}
  heldDirection=0;
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1),edge=unreadEdge(delta);
  if(edge!==null){event.preventDefault();heldDirection=direction;window.scrollTo({top:edge,behavior:reduced.matches?'instant':'smooth'});}
 },{passive:false});
 addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||nestedScroll(event.target))return;
  if(event.target instanceof Element&&event.target.closest('button,summary,a,[role=button],canvas'))return;
  const delta=event.key==='PageDown'||event.key===' '&&!event.shiftKey?innerHeight:event.key==='PageUp'||event.key===' '&&event.shiftKey?-innerHeight:0;
  if(!delta)return;
  const edge=unreadEdge(delta);if(edge!==null){event.preventDefault();window.scrollTo({top:edge,behavior:reduced.matches?'instant':'smooth'});}
 });
}
