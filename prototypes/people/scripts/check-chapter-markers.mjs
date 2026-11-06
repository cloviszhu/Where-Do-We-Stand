// Local browser regression check. Pass an existing Playwright installation as argv[2].
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2]||'playwright');
const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const dir=fileURLToPath(new URL('../evidence/chapter-markers/',import.meta.url));
const report={date:new Date().toISOString(),browser:browser.version(),mode:'headless actual Canvas/rAF',checks:[],errors:[],failures:[]};
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();page.setDefaultTimeout(6000);
page.on('pageerror',e=>report.errors.push(e.message));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const save=()=>writeFile(dir+'browser-checks.json',JSON.stringify(report,null,2));
const open=async(p,suffix)=>{await p.goto('http://127.0.0.1:5183/'+suffix);await p.reload();await p.waitForFunction(()=>!!window.prototypeDiagnostics);};
const view=p=>p.evaluate(()=>({y:scrollY,visible:[...document.querySelectorAll('main>section')].map(e=>({id:e.id,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})).filter(e=>Math.min(e.bottom,innerHeight)-Math.max(e.top,112)>3)}));
const click=async(p,selector)=>{const b=await p.locator(selector).boundingBox();assert(b);await p.mouse.click(b.x+b.width/2,b.y+b.height/2);};
const ready=p=>p.waitForFunction(()=>!window.prototypeDiagnostics.animating&&!window.prototypeDiagnostics.markers.some(m=>m.moving));
const profile=async p=>{
 await p.locator('#find-place').click();await p.locator('[name=roleRaw]').selectOption('Student');await p.locator('[name=experience]').selectOption('<1');await p.locator('#profile-next').click();
 await p.locator('[name=country]').selectOption('Canada');await p.locator('[name=language]').selectOption('JavaScript');await p.locator('#profile-next').click();await p.locator('#profile-next').click();await ready(p);
};
async function check(name,fn){console.log('CHECK',name);try{const result=await fn();report.checks.push({name,result});console.log('PASS',name);}catch(e){report.failures.push({name,message:e.message});console.log('FAIL',name,e.message);}await save();}
try{
 await open(page,'?group=role#people');report.bundle=await page.locator('script[type=module]').getAttribute('src');
 await check('all five real animation frame traces',async()=>{
  await profile(page);const results=[];
  for(const group of ['experience','education','ai','all','role']){
   const y=await page.evaluate(()=>scrollY);
   const sampling=page.evaluate(()=>new Promise(resolve=>{const frames=[],start=performance.now();function frame(now){const d=window.prototypeDiagnostics;frames.push({t:now-start,group:d.group,moving:d.movingUnits,markers:d.markers,samples:d.transitionSamples.slice(0,5)});if(now-start<1450)requestAnimationFrame(frame);else resolve(frames);}requestAnimationFrame(frame);}));
   await click(page,'button[data-group='+group+']');
   if(group==='experience'){await delay(330);await page.screenshot({path:dir+'motion-role-experience-middle.png'});}
   const frames=await sampling;await writeFile(dir+'motion-'+group+'.json',JSON.stringify(frames));
   const d=await page.evaluate(()=>window.prototypeDiagnostics);
   const intermediate=frames.some(f=>f.group===group&&f.moving>0&&f.samples.some(s=>Math.hypot(s.current.x-s.from.x,s.current.y-s.from.y)>1&&Math.hypot(s.current.x-s.to.x,s.current.y-s.to.y)>1));
   assert(intermediate);assert.equal(d.movingUnits,0);assert.equal(await page.evaluate(()=>scrollY),y);
   assert(d.markers.every(m=>m.size===d.ordinarySize));assert.equal(d.profileMatches,15);
   assert.equal(await page.locator('#crowd').getAttribute('aria-pressed'),null);
   results.push({group,peakMoving:Math.max(...frames.map(f=>f.moving)),intermediate,unitCount:d.unitCount,markers:d.markers,ordinarySize:d.ordinarySize});
  }
  await page.screenshot({path:dir+'desktop-role-you.png'});return results;
 });
 await check('rapid interruption and Locate both guides',async()=>{
  await click(page,'button[data-group=experience]');await delay(300);await click(page,'button[data-group=education]');await delay(180);await click(page,'button[data-group=role]');await ready(page);
  const result=[];
  for(const [selector,name] of [['#locate-alex','Alex'],['#locate-me','YOU']]){
   await click(page,selector);await delay(1100);
   const r=await page.evaluate(name=>{const d=window.prototypeDiagnostics,m=d.markers.find(m=>m.name===name),c=document.getElementById('crowd');return {name,x:m.position.x*d.transform.k+d.transform.x,y:m.position.y*d.transform.k+d.transform.y,cx:c.clientWidth/2,cy:c.clientHeight/2,size:m.size,ordinarySize:d.ordinarySize};},name);
   assert(Math.hypot(r.x-r.cx,r.y-r.cy)<2);assert.equal(r.size,r.ordinarySize);result.push(r);
  }
  await page.screenshot({path:dir+'desktop-locate-you.png'});await click(page,'#fit-map');return result;
 });
 await check('YOU 15 -> 0 in view -> 15 and stable colors',async()=>{
  const colors=await page.evaluate(()=>window.prototypeDiagnostics.categoryColors);
  await page.locator('#open-filter').click();await page.locator('#filter-fields [name=country]').selectOption('United States of America');await page.locator('#filter-form button[type=submit]').click();await ready(page);
  const hidden=await page.evaluate(()=>({text:document.getElementById('profile-result').textContent,anchor:window.prototypeDiagnostics.youAnchor,marker:window.prototypeDiagnostics.markers.find(m=>m.name==='YOU'),colors:window.prototypeDiagnostics.categoryColors}));
  assert.equal(hidden.anchor,null);assert.equal(hidden.marker.group,null);assert(hidden.text.includes('0 / 15'));
  for(const c of hidden.colors)assert.equal(c.color,colors.find(g=>g.group===c.group).color);
  await page.locator('#open-filter').click();await page.locator('#clear-filters').click();await ready(page);const restored=await page.locator('#profile-result').innerText();assert(restored.includes('15 exact'));return {hidden,restored};
 });
 await check('wheel chapter starts and unread ends, forward/reverse',async()=>{
  await open(page,'?group=role#peers');await page.mouse.move(100,650);const states=[];
  for(const delta of [650,650,650,650,650,650,650,650,-650,-650]){await page.mouse.wheel(0,delta);await delay(750);const s=await view(page);assert(s.visible.length<=1);states.push({delta,...s});}
  assert.equal(states[0].visible[0].id,'peers');assert(Math.abs(states[0].visible[0].bottom-900)<2);assert.equal(states[1].visible[0].id,'pay');return states;
 });
 await check('keyboard paging and expanded table reading',async()=>{
  await open(page,'?group=role#peers');await page.evaluate(()=>document.activeElement?.blur());const states=[];
  for(const key of ['PageDown','PageDown','PageUp']){await page.keyboard.press(key);await delay(750);const s=await view(page);assert(s.visible.length<=1);states.push({key,...s});}
  assert.equal(states[0].visible[0].id,'peers');assert.equal(states[1].visible[0].id,'pay');
  await open(page,'?group=role#peers');await page.locator('#heat-table summary').click();await page.mouse.move(100,650);await page.mouse.wheel(0,700);await delay(750);
  const expanded=await view(page);assert.equal(expanded.visible[0].id,'peers');await page.screenshot({path:dir+'desktop-expanded-table.png'});return {states,expanded};
 });
 await check('keyboard chart linkage and detail focus',async()=>{
  await open(page,'?group=role#peers');await page.locator('#heatmap [role=button]').first().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.getElementById('records-dialog').open);
  const text=await page.locator('#record-count').innerText();assert(text.includes('637'));await page.locator('#record-list button').first().click();
  const d=await page.evaluate(()=>({filtered:window.prototypeDiagnostics.filtered,open:!document.getElementById('detail').hidden,focus:document.activeElement?.className}));assert.equal(d.filtered,637);assert(d.open);assert.equal(d.focus,'close-detail');return {text,...d};
 });
 await check('Pay/Skills controls and deep-link refresh',async()=>{
  await open(page,'?group=role#pay');await page.locator('#pay-country').selectOption('Canada');const pay=await page.locator('#pay-note').innerText();assert(pay.includes('Canada'));
  await open(page,'?group=role#skills');await page.locator('#tech-search').fill('Rust');await delay(200);const tech=await page.locator('#tech-chart').innerText();assert(tech.includes('Rust'));
  await open(page,'?group=role#peers');const deep=await page.evaluate(()=>({group:window.prototypeDiagnostics.group,top:document.getElementById('peers').getBoundingClientRect().top}));assert.equal(deep.group,'role');assert(Math.abs(deep.top-112)<2);return {pay,tech,deep};
 });
 await check('empty filter replay and reduced motion restore',async()=>{
  await open(page,'?country=not-a-country&group=role#people');assert.equal(await page.evaluate(()=>window.prototypeDiagnostics.filtered),0);assert(await page.locator('#browse-units').isDisabled());await page.locator('#resume-story').click();assert.equal(await page.evaluate(()=>window.prototypeDiagnostics.filtered),65437);assert(!(await page.locator('#browse-units').isDisabled()));
  await click(page,'#enter-explore');await page.emulateMedia({reducedMotion:'reduce'});await click(page,'button[data-group=experience]');await delay(50);const reduced=await page.evaluate(()=>({moving:window.prototypeDiagnostics.movingUnits,markers:window.prototypeDiagnostics.markers}));assert.equal(reduced.moving,0);assert(reduced.markers.every(m=>!m.moving));
  await page.emulateMedia({reducedMotion:'no-preference'});await click(page,'button[data-group=role]');await delay(180);const moving=await page.evaluate(()=>window.prototypeDiagnostics.movingUnits);assert(moving>0);return {reduced,resumedMoving:moving};
 });
 await check('mobile labels, touch reading, tablet and short viewport',async()=>{
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await mobileContext.newPage();mobile.setDefaultTimeout(6000);await open(mobile,'?group=role#people');await profile(mobile);await mobile.screenshot({path:dir+'mobile-role-you.png'});const sizes=[];
  for(const group of ['experience','education','ai','all']){await click(mobile,'button[data-group='+group+']');await ready(mobile);const s=await mobile.evaluate(()=>({group:window.prototypeDiagnostics.group,width:innerWidth,scroll:document.documentElement.scrollWidth,labels:window.prototypeDiagnostics.markerLabels,canvas:document.getElementById('crowd').clientWidth}));assert.equal(s.width,s.scroll);assert(s.labels.every(l=>l.x>=0&&l.x+l.w<=s.canvas));sizes.push(s);}
  await mobile.screenshot({path:dir+'mobile-overview-you.png'});await open(mobile,'?group=role#peers');const cdp=await mobileContext.newCDPSession(mobile);const touch=[];
  for(let i=0;i<4;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:378,y:720}]});for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:378,y:720-step*48}]});await delay(35);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(850);const s=await view(mobile);assert(s.visible.length<=1);touch.push(s);}
  const tablet=await context.newPage();await tablet.setViewportSize({width:768,height:1024});await open(tablet,'?group=experience#people');await ready(tablet);await tablet.screenshot({path:dir+'tablet-experience.png'});
  const tabletSize=await tablet.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.equal(tabletSize.client,tabletSize.scroll);await tablet.setViewportSize({width:1280,height:650});await delay(150);const short=await view(tablet);assert.equal(short.visible.length,1);return {sizes,touch,tabletSize,short};
 });
 report.limitations=['Headless Edge uses the real Canvas and requestAnimationFrame; no physical touch device, screen reader or non-Chromium check.','Touch/viewport tests are emulations. No fixed-fps claim.','Raw data pipeline unchanged and not rerun; PDF/ZIP remain the preceding iteration.'];
 await save();console.log(JSON.stringify({passed:report.checks.length,failures:report.failures,errors:report.errors,bundle:report.bundle}));
}finally{await save();await browser.close();}
if(report.failures.length||report.errors.length)process.exitCode=1;
