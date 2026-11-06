export const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const active=new Set<Animation>();
const ease='cubic-bezier(.22,1,.36,1)';

export function motion(el:Element,frames:Keyframe[],duration=300,delay=0){
  if(reducedMotion.matches)return;
  const animation=el.animate(frames,{duration,delay,easing:ease,fill:'backwards'});
  active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));return animation;
}
export function settleMotion(){active.forEach(a=>a.cancel());active.clear();}
reducedMotion.addEventListener('change',settleMotion);

export function revealChart(root:Element|null,delay=0){
  if(!root||!root.getBoundingClientRect().height||reducedMotion.matches)return;
  const marks=[...root.querySelectorAll<SVGElement>('.chart-mark')];
  marks.forEach((mark,i)=>motion(mark,[{opacity:.15},{opacity:1}],300,delay+Math.min(i*9,180)));
  root.querySelectorAll<SVGPathElement>('svg > path').forEach(path=>{
    if(path.getAttribute('stroke-dasharray'))return; // Trust remains dashed throughout.
    const length=path.getTotalLength();motion(path,[{strokeDasharray:`${length}`,strokeDashoffset:`${length}`},{strokeDasharray:`${length}`,strokeDashoffset:'0'}],540,delay);
  });
}

/** Keep layout/chrome fixed; only animate the content that actually changed. */
export function enterContent(root:HTMLElement,home=false,first=false){
  if(home){
    root.querySelectorAll('.landing-title h1 span').forEach((el,i)=>motion(el,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],first?560:360,i*65));
    root.querySelectorAll('.landing-top,.landing-entry,.landing-index>a,.landing-footer').forEach((el,i)=>motion(el,[{opacity:0},{opacity:1}],360,Math.min(i*45,230)));
    if(first)document.querySelectorAll('.brand-symbol i').forEach((el,i)=>motion(el,[{transform:'scaleY(.2)'},{transform:'scaleY(1)'}],420,80+i*70));
    return;
  }
  const parts=root.querySelectorAll(':scope > .chapter-kicker,:scope > h1,.chapter-heading,.intro-layout,.reflection-grid,.archive-invitation,.inner-heading,.profile-form-layout,.method-grid,.classification-bar,.stage-toolbar,.field-window');
  if(!parts.length)motion(root,[{opacity:.3},{opacity:1}],240);
  parts.forEach((el,i)=>motion(el,[{opacity:.1,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],280,Math.min(i*30,120)));
  root.querySelectorAll('.chart-story').forEach(el=>motion(el,[{opacity:.15},{opacity:1}],280,35));
  revealChart(root,45);
}

export function updateIndicators(){
  for(const [navSelector,selectedSelector] of [['.site-nav','[aria-current="page"]'],['.chapter-nav','[aria-current="step"]'],['#dimension-buttons','[aria-pressed="true"]']]){
    const nav=document.querySelector<HTMLElement>(navSelector);const selected=nav?.querySelector<HTMLElement>(selectedSelector);
    if(!nav||!selected||!nav.getBoundingClientRect().width)continue;
    let indicator=nav.querySelector<HTMLElement>('.nav-indicator');
    const fresh=!indicator;
    if(!indicator){indicator=document.createElement('span');indicator.className='nav-indicator';indicator.setAttribute('aria-hidden','true');nav.append(indicator);}
    const parent=nav.getBoundingClientRect(),target=selected.getBoundingClientRect();
    const underline=navSelector==='.site-nav';
    indicator.style.transition=fresh?'none':'';
    indicator.style.width=`${target.width}px`;indicator.style.height=underline?'3px':`${target.height}px`;
    const inset=underline?(parseFloat(getComputedStyle(selected,'::after').bottom)||0)+3:0;
    indicator.style.transform=`translate(${target.left-parent.left}px,${underline?target.bottom-parent.top-inset:target.top-parent.top}px)`;
    nav.classList.add('has-indicator');
  }
}

export function installInteractions(){
  window.addEventListener('resize',updateIndicators,{passive:true});
  void document.fonts.ready.then(updateIndicators);
  document.querySelectorAll<HTMLDetailsElement>('.filter-panel,.data-table').forEach(details=>{
    const summary=details.querySelector('summary')!,content=details.querySelector<HTMLElement>('div')!;
    let animation:Animation|undefined;let expanded=details.open;let generation=0;
    summary.addEventListener('click',event=>{
      if(reducedMotion.matches)return;
      event.preventDefault();const from=details.getBoundingClientRect().height;expanded=!expanded;const ticket=++generation;animation?.cancel();
      details.open=true;details.style.overflow='hidden';
      const to=expanded?details.scrollHeight:summary.getBoundingClientRect().height;
      animation=motion(details,[{height:`${from}px`},{height:`${to}px`}],expanded?280:180);
      motion(content,[{opacity:expanded?0:1},{opacity:expanded?1:0}],expanded?240:120);
      void animation?.finished.catch(()=>{}).finally(()=>{if(ticket===generation){details.open=expanded;details.style.overflow='';}});
    });
    details.addEventListener('toggle',()=>{if(!animation||animation.playState!=='running')expanded=details.open;});
    reducedMotion.addEventListener('change',()=>{animation?.cancel();details.open=expanded;});
  });
}
