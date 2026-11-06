import {PacketField,type Position} from './units/packet-field.ts';
import {partition} from './units/packets.ts';
import type {Person} from './data.ts';

export function initHero(people:Person[]) {
 const root=document.querySelector<HTMLElement>('.retro-home')!;
 const field=new PacketField(document.querySelector<HTMLCanvasElement>('#hero-canvas')!,'retro',()=>document.getElementById('skip-story')!.click());
 const group=partition(people,'all')[0];
 const colors=['#fc8cbd','#9db6f6','#73dbe7','#d6a6ee','#9c86ce','#eabeb9','#a3d2d6'];
 function layout(duration=0){
  const w=field.width,h=field.height,cols=w<600?40:62,rows=Math.ceil(group.packets.length/cols);
  const positions:Position[]=group.packets.map((packet,i)=>{const row=Math.floor(i/cols),depth=row/(rows-1),spread=w*(.46+depth*.5);return {packet,x:w/2+((i%cols)/(cols-1)-.5)*spread,y:h*(.72+depth*.16),size:2+depth*(w<600?2:4),color:colors[row%colors.length]};});
  field.set(positions,duration);
 }
 let first=true;field.onResize=()=>{layout(first?1400:700);first=false;};root.classList.add('entering');
 root.addEventListener('pointermove',event=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches||field.paused)return;const b=root.getBoundingClientRect();root.style.setProperty('--sun-x',`${(event.clientX/b.width-.5)*14}px`);root.style.setProperty('--sun-y',`${((event.clientY-b.top)/b.height-.5)*10}px`);});
 return field;
}
