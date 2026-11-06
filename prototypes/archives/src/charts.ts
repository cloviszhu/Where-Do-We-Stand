import * as d3 from 'd3';
import {ALEX,BANDS,Charts,Profile,esc,experienceBand,fmtPct,n,PayGroup,TechRow} from './data';
const ink='#333e2b',amber='#a45b0b',teal='#246b66';
const TRUST_COLORS=['#754b3d','#b28866','#d3d1c6','#819889','#355e53'];
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
function frame(id:string,width:number,height:number,label:string){
  const box=d3.select(`#${id}`);box.selectAll('*').remove();
  const svg=box.append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('width',width).attr('height',height).attr('role','group').attr('aria-label',label);
  svg.append('title').text(label);return svg;
}
function accessible<G extends d3.BaseType,D>(selection:d3.Selection<G,D,any,any>,describe:(d:D)=>string,readout:string){
  selection.attr('tabindex',0).attr('class','chart-mark').attr('role','img').attr('aria-label',describe).on('pointerenter',(_,d)=>{$(readout).textContent=describe(d);}).on('focus',(_,d)=>{$(readout).textContent=describe(d);});
  selection.append('title').text(describe);
}
export class StoryCharts {
  profile:Profile|null=null;
  constructor(public data:Charts,private openCohort:(role:string,experience:string)=>void){
    $('heat-scope').addEventListener('change',()=>this.heat());
    $('tech-search').addEventListener('input',()=>this.technology());
    $('tech-sort').addEventListener('change',()=>this.technology());
    const more=document.createElement('button');more.id='tech-more';more.textContent='Show all languages';more.setAttribute('aria-expanded','false');more.className='chart-more';
    $('tech-chart').after(more);more.addEventListener('click',()=>{more.setAttribute('aria-expanded',String(more.getAttribute('aria-expanded')!=='true'));more.textContent=more.getAttribute('aria-expanded')==='true'?'Show 12 languages':'Show all languages';this.technology();});
    this.heat();this.pay();this.technology();this.ai();
  }
  setProfile(p:Profile|null){this.profile=p;this.heat();}
  heat(){
    const all=($('heat-scope') as HTMLSelectElement).value==='all';
    const featured=['Full-stack','Back-end','Front-end','Student','Desktop / enterprise','Mobile','Senior executive'];
    let rows=all?this.data.heatmap.rows:this.data.heatmap.rows.filter(r=>featured.includes(r.role));
    if(this.profile&&!rows.some(r=>r.role===this.profile!.role)){const r=this.data.heatmap.rows.find(r=>r.role===this.profile!.role);if(r)rows=[...rows,r];}
    const w=680,left=137,right=55,top=35,rowH=45,h=top+rows.length*rowH+63;
    const svg=frame('heat-chart',w,h,'2024 primary role by years of professional coding experience. Each cell reports a percentage within its role. Activate a cell to open those records.');
    const x=d3.scaleBand<string>().domain(this.data.bands).range([left,w-right]).padding(.05);
    const y=d3.scaleBand<string>().domain(rows.map(r=>r.role)).range([top,h-63]).padding(.07);
    const max=d3.max(rows.flatMap(r=>r.cells),d=>d.pct)??1;
    const color=d3.scaleSequential(d3.interpolateRgb('#f2f0e6','#b96f22')).domain([0,max]);
    svg.selectAll('.role-label').data(rows).join('text').attr('x',left-10).attr('y',r=>y(r.role)!+y.bandwidth()/2+4).attr('text-anchor','end').attr('fill',ink).attr('font-size',12).text(r=>r.role.length>20?r.role.slice(0,18)+'…':r.role).append('title').text(r=>r.role);
    svg.selectAll('.role-total').data(rows).join('text').attr('x',w-right+8).attr('y',r=>y(r.role)!+y.bandwidth()/2+4).attr('font-size',10).attr('fill','#5d6258').text(r=>n(r.valid));
    svg.append('text').attr('x',w-right+8).attr('y',17).attr('font-size',10).attr('fill','#5d6258').text('valid n');
    svg.selectAll('.band-label').data(this.data.bands).join('text').attr('x',b=>x(b)!+x.bandwidth()/2).attr('y',21).attr('text-anchor','middle').attr('font-size',12).text(b=>b);
    const cells=rows.flatMap(r=>r.cells.map(c=>({...c,role:r.role,valid:r.valid,missing:r.missing})));
    const g=svg.selectAll('.cell').data(cells).join('g').attr('transform',c=>`translate(${x(c.band)},${y(c.role)})`);
    g.append('rect').attr('width',x.bandwidth()).attr('height',y.bandwidth()).attr('fill',c=>color(c.pct)).attr('class','heat-cell');
    g.append('text').attr('x',x.bandwidth()/2).attr('y',y.bandwidth()/2+4).attr('text-anchor','middle').attr('font-size',13).attr('fill','#222820').text(c=>c.pct>0&&c.pct<1?'<1%':`${c.pct.toFixed(0)}%`);
    const desc=(c:typeof cells[number])=>`${c.role}, ${c.band} professional coding years: ${n(c.n)} of ${n(c.valid)} (${fmtPct(c.pct)}). ${n(c.missing)} missing experience answers excluded for this role. 2024. Activate to view these archives.`;
    accessible(g,desc,'heat-readout');g.attr('role','button').on('click',(_,c)=>this.openCohort(c.role,c.band)).on('keydown',(e:KeyboardEvent,c)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.openCohort(c.role,c.band);}});
    const mark=(p:Profile,label:string,c:string)=>{const b=experienceBand(p.codingYears);if(!x(b)||!y(p.role))return;const group=svg.append('g').attr('aria-label',`${label}: ${p.role}, ${b} professional coding years, illustrative position`);group.append('rect').attr('x',x(b)!).attr('y',y(p.role)!).attr('width',x.bandwidth()).attr('height',y.bandwidth()).attr('fill','none').attr('stroke',c).attr('stroke-width',3);group.append('rect').attr('x',x(b)!+2).attr('y',y(p.role)!+2).attr('width',label==='Alex'?28:25).attr('height',12).attr('fill','#f7f6f1');group.append('text').attr('x',x(b)!+5).attr('y',y(p.role)!+11).attr('fill',c).attr('font-size',9).attr('font-weight',600).text(label);};
    mark(ALEX,'Alex',amber);if(this.profile)mark(this.profile,'YOU',teal);
    svg.append('text').attr('x',left).attr('y',h-30).attr('font-size',11).attr('fill','#5d6258').text('Years coding professionally · colour = share within role');
    const legend=svg.append('g').attr('transform',`translate(${left},${h-13})`);
    [0,.25,.5,.75,1].forEach((t,i)=>{legend.append('rect').attr('x',i*32).attr('y',-7).attr('width',32).attr('height',7).attr('fill',color(t*max));});
    legend.append('text').attr('x',170).attr('font-size',10).attr('fill','#5d6258').text(`0 → ${max.toFixed(0)}% · markers excluded from n`);
  }
  pay(){
    const rows=this.data.pay.groups,w=680,h=360,l=64,r=22,t=40,b=65;
    const svg=frame('pay-chart',w,h,'Median annual compensation in USD and interquartile range by professional coding experience. United States, 2024.');
    const x=d3.scalePoint<string>().domain(rows.map(r=>r.band)).range([l,w-r]).padding(.5);
    const y=d3.scaleLinear().domain([0,(d3.max(rows,r=>r.q3??0)??1)*1.15]).nice().range([h-b,t]);
    svg.append('g').attr('transform',`translate(${l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w-l-r)).tickFormat(v=>`$${Number(v)/1000}k`)).call(g=>g.select('.domain').remove()).call(g=>g.selectAll('.tick line').attr('stroke','#d6d7cb').attr('stroke-dasharray','2 4'));
    svg.append('g').attr('transform',`translate(0,${h-b})`).call(d3.axisBottom(x).tickSize(0).tickPadding(12));
    svg.append('text').attr('x',l).attr('y',17).attr('font-size',11).attr('fill','#5d6258').text('Annual compensation (USD)');
    const g=svg.selectAll('.pay-group').data(rows).join('g');
    g.append('rect').attr('x',d=>x(d.band)!-25).attr('y',t).attr('width',50).attr('height',h-t-b).attr('fill','transparent');
    g.filter(d=>d.median!==null).append('line').attr('x1',d=>x(d.band)!).attr('x2',d=>x(d.band)!).attr('y1',d=>y(d.q1!)).attr('y2',d=>y(d.q3!)).attr('stroke',ink).attr('stroke-width',2);
    for(const key of ['q1','q3'] as const)g.filter(d=>d.median!==null).append('line').attr('x1',d=>x(d.band)!-12).attr('x2',d=>x(d.band)!+12).attr('y1',d=>y(d[key]!)).attr('y2',d=>y(d[key]!)).attr('stroke',ink).attr('stroke-width',2);
    g.filter(d=>d.median!==null).append('circle').attr('cx',d=>x(d.band)!).attr('cy',d=>y(d.median!)).attr('r',6).attr('fill',amber).attr('stroke','#f7f6f1').attr('stroke-width',2);
    g.append('text').attr('x',d=>x(d.band)!).attr('y',h-26).attr('text-anchor','middle').attr('font-size',10).attr('fill','#5d6258').text(d=>`n=${n(d.n)}`);
    g.filter(d=>d.median!==null).append('text').attr('x',d=>x(d.band)!).attr('y',d=>y(d.q3!)-12).attr('text-anchor','middle').attr('font-size',11).attr('fill',amber).text(d=>`$${(d.median!/1000).toFixed(0)}k`);
    accessible(g,(d:PayGroup)=>`${d.band} professional coding years, n=${n(d.n)}. Median $${n(d.median??0)}; middle 50% $${n(d.q1??0)}–$${n(d.q3??0)} per year. United States, 2024.`,'pay-readout');
    svg.append('text').attr('x',(w+l-r)/2).attr('y',h-4).attr('text-anchor','middle').attr('font-size',11).attr('fill','#5d6258').text('Years coding professionally');
    $('pay-fact').textContent=`$${((rows.find(r=>r.band==='3-5')!.median??0)/1000).toFixed(0)}k`;
    $('pay-note').textContent=`${n(this.data.pay.validN)} US responses with positive annual compensation and valid professional coding experience. ${n(this.data.pay.excluded)} US responses excluded for a missing/invalid required value. No upper cap; n < 10 would be hidden. IQR is not a confidence interval.`;
  }
  technology(){
    const query=($('tech-search') as HTMLInputElement).value.trim().toLowerCase(),sort=($('tech-sort') as HTMLSelectElement).value;
    let rows=this.data.technology.rows.filter(d=>d.name.toLowerCase().includes(query));
    rows.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name):sort==='gap'?(a,b)=>(b.wantedPct-b.usedPct)-(a.wantedPct-a.usedPct):sort==='wanted'?(a,b)=>b.wanted-a.wanted:(a,b)=>b.used-a.used);
    const total=rows.length;if(!query&&$('tech-more').getAttribute('aria-expanded')!=='true')rows=rows.slice(0,12);
    const w=680,l=130,r=30,t=26,b=42,h=t+rows.length*32+b;
    if(!rows.length){$('tech-chart').innerHTML='<p class="chart-empty">No languages match. Clear the search or try another name.</p>';$('tech-readout').textContent='No matching language; the survey sample has not changed.';return;}
    $('tech-readout').textContent='Focus or hover a language to compare both percentages and counts.';
    const svg=frame('tech-chart',w,h,'2025 language use and desired use. Both measures use the same denominator.');
    const x=d3.scaleLinear().domain([0,80]).range([l,w-r]);const y=d3.scalePoint<string>().domain(rows.map(d=>d.name)).range([t+12,h-b-12]);
    svg.append('g').attr('transform',`translate(0,${h-b+6})`).call(d3.axisBottom(x).ticks(4).tickFormat(v=>`${v}%`).tickSize(-(h-b-t)));
    const g=svg.selectAll('.tech-row').data(rows).join('g');
    g.append('rect').attr('x',0).attr('y',d=>y(d.name)!-14).attr('width',w).attr('height',28).attr('fill','transparent');
    g.append('text').attr('x',l-12).attr('y',d=>y(d.name)!+4).attr('text-anchor','end').attr('font-size',12).text(d=>d.name.length>20?d.name.slice(0,18)+'…':d.name);
    g.append('line').attr('x1',d=>x(d.usedPct)).attr('x2',d=>x(d.wantedPct)).attr('y1',d=>y(d.name)!).attr('y2',d=>y(d.name)!).attr('stroke','#979d88').attr('stroke-width',1.5);
    for(const key of ['usedPct','wantedPct'] as const)g.append('circle').attr('cx',d=>x(d[key])).attr('cy',d=>y(d.name)!).attr('r',4.5).attr('fill',key==='usedPct'?ink:amber).attr('stroke','#f7f6f1').attr('stroke-width',1);
    accessible(g,(d:TechRow)=>`${d.name}: used ${fmtPct(d.usedPct)} (${n(d.used)}), want to use ${fmtPct(d.wantedPct)} (${n(d.wanted)}). Shared denominator ${n(this.data.technology.n)} respondents answering both items, 2025.`,'tech-readout');
    $('tech-note').textContent=`Showing ${rows.length} of ${total} matching languages. Same denominator at both ends: ${n(this.data.technology.n)} people answering both language questions; ${n(this.data.technology.excluded)} responses missing at least one item excluded. Multiple answers allowed; percentages do not sum to 100%.`;
  }
  ai(){
    const rows=this.data.ai.trend,w=680,h=270,l=48,r=40,t=30,b=40;
    const svg=frame('ai-trend',w,h,'AI use and positive trust in three independent survey samples, 2023 to 2025. The lines use different denominators.');
    const x=d3.scalePoint<number>().domain(rows.map(d=>d.year)).range([l+25,w-r-25]),y=d3.scaleLinear().domain([0,100]).range([h-b,t]);
    svg.append('g').attr('transform',`translate(${l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(v=>`${v}%`).tickSize(-(w-l-r))).call(g=>g.select('.domain').remove());
    svg.append('g').attr('transform',`translate(0,${h-b})`).call(d3.axisBottom(x).tickSize(0).tickPadding(12));
    for(const key of ['usePct','trustPct'] as const){
      const c=key==='usePct'?ink:amber;
      svg.append('path').datum(rows).attr('d',d3.line<typeof rows[number]>().x(d=>x(d.year)!).y(d=>y(d[key]))).attr('stroke',c).attr('stroke-width',2.5).attr('fill','none');
      const points=svg.selectAll(`.ai-${key}`).data(rows).join('g');points.append('circle').attr('cx',d=>x(d.year)!).attr('cy',d=>y(d[key])).attr('r',6).attr('fill',c).attr('stroke','#f7f6f1').attr('stroke-width',2);
      points.append('text').attr('x',d=>x(d.year)!).attr('y',d=>y(d[key])+(key==='usePct'?-14:24)).attr('text-anchor','middle').attr('fill',c).attr('font-size',13).text(d=>fmtPct(d[key]));
      accessible(points,d=>key==='usePct'?`${d.year} AI use: ${n(d.users)} current users / ${n(d.useN)} valid adoption answers = ${fmtPct(d.usePct)}. ${n(d.total-d.useN)} missing adoption answers.`:`${d.year} trust: ${n(d.positive)} somewhat/highly trust / ${n(d.trustN)} current AI users answering trust = ${fmtPct(d.trustPct)}. Original field ${d.trustField}.`,'ai-readout');
    }
    $('ai-trend-note').textContent='Use = current users / valid adoption answers. Trust = somewhat or highly trust / current users answering trust. 2025 frequency options collapse to “yes” for use. Independent annual samples; missing answers excluded from each denominator.';
    const comp=this.data.ai.composition,sh=comp.length*43+42;const chart=frame('ai-composition',w,sh,'2025 trust composition within each reported AI-use frequency group.');
    const xx=d3.scaleLinear().domain([0,100]).range([145,w-45]);
    chart.append('g').attr('transform','translate(0,25)').call(d3.axisTop(xx).ticks(4).tickFormat(v=>`${v}%`).tickSize(0));
    for(const [i,row] of comp.entries()){
      const yy=38+i*43;chart.append('text').attr('x',134).attr('y',yy+15).attr('text-anchor','end').attr('font-size',12).text(row.usage);
      chart.append('text').attr('x',w-38).attr('y',yy+15).attr('font-size',9).attr('fill','#5d6258').text(n(row.n));
      let cum=0;for(const [j,s]of row.segments.entries()){
        const rect=chart.append('rect').datum(s).attr('x',xx(cum)).attr('y',yy).attr('width',xx(s.pct)-xx(0)).attr('height',25).attr('fill',TRUST_COLORS[j]).attr('stroke','#f7f6f1').attr('stroke-width',.5);
        accessible(rect,d=>`${row.usage}, ${d.label}: ${n(d.n)} / ${n(row.n)} (${fmtPct(d.pct)}). ${row.missing} trust answers missing in this group. 2025.`,'ai-readout');cum+=s.pct;
      }
    }
    chart.append('text').attr('x',w-38).attr('y',20).attr('font-size',9).attr('fill','#5d6258').text('n');
    $('trust-legend').innerHTML=this.data.ai.trustOrder.map((label,i)=>`<span><i style="background:${TRUST_COLORS[i]}"></i>${esc(label)}</span>`).join('');
  }
}
