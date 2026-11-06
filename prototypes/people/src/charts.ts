import {select,scaleBand,scaleLinear,scalePoint,axisBottom,axisLeft,line,interpolateRgb} from 'd3';
import {bands,esc,heatData,matching,money,number,pct,quantiles,shortRole,technologyData,type Person,type Criteria,type Profile} from './data.ts';
const ink='#74edff',amber='#ff77b6',green='#74edff';
function cellText(p:number){
 const t=Math.min(1,p*2.5),from=[38,27,61],to=[252,140,189];
 const rgb=from.map((v,i)=>(v+(to[i]-v)*t)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const lum=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 return lum>.18?'#100c26':'#fff1fc';
}
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
function base(id:string,w:number,h:number,label:string){const host=el(id);const oldTip=el('chart-tooltip');if(oldTip)oldTip.hidden=true;host.setAttribute('tabindex','0');host.setAttribute('role','region');host.setAttribute('aria-label',label+'. Scrollable chart; data table follows.');host.replaceChildren();return select(host).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','group').attr('aria-label',label);}
function tooltip(node:any,text:string){node.on('pointerenter.tip focus.tip click.tip',()=>{let t=document.getElementById('chart-tooltip');if(document.querySelector('dialog[open]')){if(t)t.hidden=true;return;}if(!t){t=document.createElement('div');t.id='chart-tooltip';t.setAttribute('role','tooltip');document.body.append(t);}t.textContent=text;t.hidden=false;}).on('pointerleave.tip blur.tip',()=>{const t=document.getElementById('chart-tooltip');if(t)t.hidden=true;});}
function tip(node:any,text:string){node.attr('tabindex',0).attr('aria-label',text).append('title').text(text);tooltip(node,text);}
function table(id:string,head:string[],rows:(string|number)[][]){el(id).innerHTML=`<summary>Read the chart as a table</summary><div class="table-scroll"><table><thead><tr>${head.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,i)=>`<${i?'td':'th scope="row"'}>${esc(c)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
export class Charts {
 people:Person[];bundle:any;profile:Profile|null=null;onCohort:(c:Criteria)=>void;
 constructor(people:Person[],bundle:any,onCohort:(c:Criteria)=>void){this.people=people;this.bundle=bundle;this.onCohort=onCohort;
  const countries=[...new Set(people.map(p=>p.country))].sort();
  el<HTMLSelectElement>('peer-country').innerHTML='<option value="">All countries</option>'+countries.map(c=>`<option value="${esc(c)}">${esc(shortRole(c))}</option>`).join('');
  el<HTMLSelectElement>('peer-experience').innerHTML='<option value="">All experience bands</option>'+bands.slice(0,-1).map(e=>`<option>${esc(e)}</option>`).join('');
  el<HTMLSelectElement>('peer-role').innerHTML='<option value="">Most common roles</option>'+[...new Set(people.map(p=>p.roleRaw))].sort().map(r=>`<option value="${esc(r)}">${esc(shortRole(r))}</option>`).join('');
  for(const id of ['peer-country','peer-experience','peer-role'])el(id).addEventListener('change',()=>this.heat());
  for(const id of ['pay-country','pay-experience'])el(id).addEventListener('change',()=>this.pay());
  for(const id of ['tech-sort','tech-search','tech-cohort'])el(id).addEventListener(id==='tech-search'?'input':'change',()=>this.tech());
  this.heat();this.pay();this.tech();this.ai();
 }
 heat(){const country=el<HTMLSelectElement>('peer-country').value,experience=el<HTMLSelectElement>('peer-experience').value,roleFilter=el<HTMLSelectElement>('peer-role').value;
  const rows=heatData(matching(this.people,{country}));let chosen=roleFilter?rows.filter(r=>r.role===roleFilter):rows.slice(0,7);
  if(!roleFilter){for(const r of ['Student',this.profile?.roleRaw].filter(Boolean) as string[]){const found=rows.find(row=>row.role===r);if(found&&!chosen.includes(found))chosen.push(found);}}
  const w=900,h=110+chosen.length*48,x=scaleBand().domain(bands.slice(0,-1)).range([226,868]).padding(.07),y=scaleBand().domain(chosen.map(r=>r.role)).range([42,h-55]).padding(.09);
  const svg=base('heatmap',w,Math.max(180,h),'Professional coding experience within each reported role, 2024');
  if(!chosen.length){svg.append('text').attr('x',30).attr('y',80).text('No respondents for these conditions. Choose another country.');}
  for(const row of chosen){svg.append('text').attr('x',211).attr('y',y(row.role)!+16).attr('text-anchor','end').attr('font-size',13).text(shortRole(row.role));svg.append('text').attr('x',211).attr('y',y(row.role)!+32).attr('text-anchor','end').attr('class','svg-muted').text(`n = ${number.format(row.n)}`);
   for(const cell of row.cells){const percent=row.n?cell.n/row.n:0,desc=`${shortRole(row.role)}, ${cell.experience} years: ${number.format(cell.n)} / ${number.format(row.n)} (${pct(cell.n,row.n)}). ${row.missing} missing experience excluded. 2024.`;
    const g=svg.append('g').attr('role','button').attr('tabindex',0).attr('aria-label',`${desc} View these respondents.`).style('cursor','pointer').on('click',()=>this.onCohort({roleRaw:row.role,experience:cell.experience,country})).on('keydown',(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onCohort({roleRaw:row.role,experience:cell.experience,country});}});
    tooltip(g,desc);g.append('title').text(desc);g.append('rect').attr('x',x(cell.experience)!).attr('y',y(row.role)!).attr('width',x.bandwidth()).attr('height',y.bandwidth()).attr('fill',row.n?interpolateRgb('#261b3d','#fc8cbd')(Math.min(1,percent*2.5)):'#261b3d').attr('opacity',experience&&experience!==cell.experience?0.3:1);
    g.append('text').attr('x',x(cell.experience)!+x.bandwidth()/2).attr('y',y(row.role)!+y.bandwidth()/2+4).attr('text-anchor','middle').attr('font-size',13).attr('fill',cellText(percent)).text(row.n?`${Math.round(percent*100)}%`:'—');
    const marker=(label:string,color:string)=>g.append('text').attr('x',x(cell.experience)!+x.bandwidth()-6).attr('y',y(row.role)!+(label==='YOU'?30:13)).attr('fill',color).attr('text-anchor','end').attr('font-size',10).attr('font-weight',800).text(label);
    if(row.role==='Student'&&cell.experience==='<1')marker('A',cellText(percent));
    if(this.profile?.roleRaw===row.role&&this.profile.experience===cell.experience)marker('YOU',green);
   }
  }
  svg.append('g').attr('transform',`translate(0,${h-48})`).call(axisBottom(x).tickSize(0)).call(g=>g.select('.domain').remove());
  svg.append('text').attr('x',550).attr('y',h-9).attr('text-anchor','middle').attr('font-size',12).text('Years of professional coding · shade = share within role');
  el('heat-note').textContent=`2024 · ${country?shortRole(country):'All countries'} · ${number.format(matching(this.people,{country}).length)} respondents. Each row excludes its missing experience answers. The experience control highlights a band; it does not change row denominators. A = Alex’s illustrative Student / <1-year position, not a survey response. YOU projects your selected role and experience; all other conditions apply in the map.`;
  table('heat-table',['Role','Known experience n','Missing experience',...bands.slice(0,-1)],chosen.map(r=>[r.role,r.n,r.missing,...r.cells.map(c=>`${c.n} (${pct(c.n,r.n)})`)]));
 }
 pay(){const country=el<HTMLSelectElement>('pay-country').value,experience=el<HTMLSelectElement>('pay-experience').value;
  const scope=this.people.filter(p=>p.country===country),valid=scope.filter(p=>p.pay!==null&&p.pay>0&&p.experience!=='Unknown');
  const groups=bands.slice(0,-1).filter(e=>!experience||e===experience).map(e=>({experience:e,...quantiles(valid.filter(p=>p.experience===e).map(p=>p.pay!))}));
  const visible=groups.filter(g=>g.n>=20),w=900,h=390,x=scaleBand().domain(groups.map(g=>g.experience)).range([84,862]).padding(.4),max=Math.max(1000,...visible.map(g=>g.q3)),y=scaleLinear().domain([0,max*1.2]).nice().range([310,35]);
  const svg=base('pay-chart',w,h,'2024 annual compensation medians and interquartile ranges by professional coding experience');
  svg.append('g').attr('transform','translate(84,0)').call(axisLeft(y).ticks(5).tickFormat(d=>`$${Number(d)/1000}k`).tickSize(-778)).call(g=>g.select('.domain').remove()).call(g=>g.selectAll('.tick line').attr('stroke','#3f3357'));
  for(const d of groups){const cx=x(d.experience)!+x.bandwidth()/2;svg.append('text').attr('x',cx).attr('y',350).attr('text-anchor','middle').attr('class','svg-muted').text(`n = ${number.format(d.n)}`);
   if(d.n<20){svg.append('text').attr('x',cx).attr('y',160).attr('text-anchor','middle').attr('font-size',12).text('n < 20');continue;}
   const g=svg.append('g');g.append('line').attr('x1',cx).attr('x2',cx).attr('y1',y(d.q1)).attr('y2',y(d.q3)).attr('stroke',green).attr('stroke-width',3);
   for(const q of [d.q1,d.q3])g.append('line').attr('x1',cx-11).attr('x2',cx+11).attr('y1',y(q)).attr('y2',y(q)).attr('stroke',green).attr('stroke-width',2);
   g.append('circle').attr('cx',cx).attr('cy',y(d.median)).attr('r',6).attr('fill',amber);g.append('text').attr('x',cx).attr('y',y(d.q3)-15).attr('text-anchor','middle').attr('font-size',13).text(money.format(d.median));
   tip(g,`${shortRole(country)}, ${d.experience} years. Median ${money.format(d.median)}, IQR ${money.format(d.q1)}–${money.format(d.q3)}; n=${d.n}.`);
  }
  svg.append('g').attr('transform','translate(0,315)').call(axisBottom(x).tickSize(0)).call(g=>g.select('.domain').remove());
  svg.append('text').attr('x',84).attr('y',17).attr('font-size',12).text('Annual total compensation, USD');svg.append('text').attr('x',470).attr('y',381).attr('text-anchor','middle').attr('font-size',12).text('Years of professional coding');
  el('pay-note').textContent=`${shortRole(country)} · 2024 · ${number.format(valid.length)} positive, finite pay answers with known experience across all bands, from ${number.format(scope.length)} country respondents. Dots: median. Lines: middle 50% (IQR), not confidence intervals. No upper trimming. Groups with n < 20 are suppressed. USD conversion follows the survey; no cost-of-living adjustment.`;
  table('pay-table',['Years','n','Median USD','25th percentile','75th percentile'],groups.map(g=>[g.experience,g.n,...(g.n>=20?[g.median,g.q1,g.q3].map(money.format):['Suppressed','Suppressed','Suppressed'])]));
 }
 tech(){const sort=el<HTMLSelectElement>('tech-sort').value,query=el<HTMLInputElement>('tech-search').value.trim().toLowerCase(),early=el<HTMLSelectElement>('tech-cohort').value==='early';
  const source=early?this.people.filter(p=>['<1','1–2','3–5'].includes(p.experience)):this.people;
  let data=technologyData(source).filter(d=>d.language.toLowerCase().includes(query));data.sort((a,b)=>sort==='gap'?(b.wanted-b.used)-(a.wanted-a.used):sort==='wanted'?b.wanted-a.wanted:b.used-a.used);data=data.slice(0,query?40:12);
  const w=900,h=Math.max(200,data.length*35+90),x=scaleLinear().domain([0,100]).range([175,825]),y=scaleBand().domain(data.map(d=>d.language)).range([35,h-55]).padding(.4),svg=base('tech-chart',w,h,'Current use and desired next-year use of programming languages');
  if(!data.length)svg.append('text').attr('x',35).attr('y',95).text('No language matches. Clear the search or try another term.');
  for(const d of data){const cy=y(d.language)!+y.bandwidth()/2,used=d.used/d.n*100,wanted=d.wanted/d.n*100,g=svg.append('g');g.append('text').attr('x',160).attr('y',cy+4).attr('text-anchor','end').attr('font-size',13).text(d.language);
   g.append('line').attr('x1',x(used)).attr('x2',x(wanted)).attr('y1',cy).attr('y2',cy).attr('stroke','#9384ad').attr('stroke-width',2);g.append('circle').attr('cx',x(used)).attr('cy',cy).attr('r',5).attr('fill',ink);g.append('rect').attr('x',x(wanted)-5).attr('y',cy-5).attr('width',10).attr('height',10).attr('fill',amber);
   g.append('text').attr('x',838).attr('y',cy+4).attr('font-size',11).text(`${used.toFixed(0)} / ${wanted.toFixed(0)}`);
   tip(g,`${d.language}: used ${pct(d.used,d.n)}, want to use ${pct(d.wanted,d.n)}. Shared n=${d.n}.`);
  }
  svg.append('g').attr('transform',`translate(0,${h-42})`).call(axisBottom(x).ticks(5).tickFormat(d=>`${d}%`));
  el('tech-note').textContent=`2024 · ${early?'0–5 years of professional coding':'All experience bands'} · shared denominator ${number.format(source.filter(p=>p.languages.length&&p.wanted.length).length)} respondents who answered both questions. Multiple selections allowed; missing columns excluded. Desired use includes continuing a language, and does not measure job openings. Showing ${data.length} languages.`;
  table('tech-table',['Language','Shared n','Used','Want next year'],data.map(d=>[d.language,d.n,`${d.used} (${pct(d.used,d.n)})`,`${d.wanted} (${pct(d.wanted,d.n)})`]));
 }
 ai(){const trend=this.bundle.trend,w=900,h=340,x=scalePoint<number>().domain(trend.map((d:any)=>d.year)).range([150,730]),y=scaleLinear().domain([0,100]).range([285,32]),svg=base('ai-trend',w,h,'Current AI use and positive trust among current users across independent annual surveys');
  svg.append('g').attr('transform','translate(100,0)').call(axisLeft(y).ticks(5).tickFormat(d=>`${d}%`).tickSize(-630)).call(g=>g.select('.domain').remove()).call(g=>g.selectAll('.tick line').attr('stroke','#3f3357'));
  for(const [numerator,denominator,color,label]of [['useYes','useN',ink,'Current use'],['trustYes','trustN',amber,'Positive trust']] as string[][]){
   svg.append('path').datum(trend).attr('d',line<any>().defined(d=>d[denominator]>0).x(d=>x(d.year)!).y(d=>y(100*d[numerator]/d[denominator]))).attr('fill','none').attr('stroke',color).attr('stroke-width',2.5);
   for(const d of trend){if(!d[denominator])continue;const cy=y(100*d[numerator]/d[denominator]),g=svg.append('g');g.append('circle').attr('cx',x(d.year)!).attr('cy',cy).attr('r',5).attr('fill',color);g.append('text').attr('x',x(d.year)!).attr('y',cy+(d.year===2023?(label==='Current use'?24:-15):(label==='Current use'?-15:24))).attr('text-anchor','middle').attr('fill',color).attr('font-size',14).text(pct(d[numerator],d[denominator]));tip(g,`${d.year} ${label}: ${d[numerator]} / ${d[denominator]} (${pct(d[numerator],d[denominator])})`);}
   const last=trend.at(-1);svg.append('text').attr('x',750).attr('y',y(100*last[numerator]/last[denominator])+5).attr('fill',color).attr('font-size',12).text(label);
  }
  svg.append('g').attr('transform','translate(0,285)').call(axisBottom(x).tickFormat(d=>String(d)).tickSize(0));
  table('ai-table',['Year','Use / answered use','Trust / current users answering trust'],trend.map((d:any)=>[d.year,`${d.useYes} / ${d.useN} (${pct(d.useYes,d.useN)})`,`${d.trustYes} / ${d.trustN} (${pct(d.trustYes,d.trustN)})`]));
  const order=this.bundle.trustOrder,colors=['#b44e81','#ef9fc4','#9e92ba','#8bc3df','#74edff','#393043'],groups=this.bundle.frequency;
  const s=base('ai-composition',900,355,'2025 AI accuracy trust composition within usage frequency, including missing answers'),sx=scaleLinear().domain([0,1]).range([205,865]);
  groups.forEach((d:any,i:number)=>{const cy=30+i*46;let offset=0;s.append('text').attr('x',190).attr('y',cy+13).attr('text-anchor','end').attr('font-size',12).text(d.group.replace('Yes, I use AI tools ','').replace('No, and I don\'t plan to','No plan').replace('No, but I plan to soon','Plan to use'));
   order.forEach((key:string,j:number)=>{const n=d.counts[key]||0;if(!n)return;const g=s.append('g');g.append('rect').attr('x',sx(offset)).attr('y',cy).attr('width',sx(n/d.n)-sx(0)).attr('height',23).attr('fill',colors[j]).attr('stroke','#18112f').attr('stroke-width',.5);tip(g,`${d.group}: ${key}, ${n} / ${d.n} (${pct(n,d.n)}), 2025.`);offset+=n/d.n;});
   s.append('text').attr('x',190).attr('y',cy+29).attr('text-anchor','end').attr('class','svg-muted').text(`n = ${number.format(d.n)}`);
  });s.append('g').attr('transform','translate(0,320)').call(axisBottom(sx).ticks(4).tickFormat(d=>`${Number(d)*100}%`));
  el('trust-legend').innerHTML=order.map((s:string,i:number)=>`<span><i style="background:${colors[i]}"></i>${esc(s)}</span>`).join('');
  table('composition-table',['Usage group','n',...order],groups.map((g:any)=>[g.group,g.n,...order.map((k:string)=>`${g.counts[k]||0} (${pct(g.counts[k]||0,g.n)})`)]));
 }
}


