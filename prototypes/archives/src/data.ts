import {json} from 'd3';
export const BANDS = ['<1','1-2','3-5','6-10','11-20','21+','Not reported'];
export type Dimension = 'role'|'experience'|'education'|'ai';
export interface RecordRow {
  id:string; year:number; role:string; roleRaw:string|null; status:string|null;
  workRaw:string|null; codingRaw:string|null; workYears:number|null; codingYears:number|null;
  experience:string; education:string; educationRaw:string|null; country:string;
  used:string[]; wanted:string[]; ai:string; aiRaw:string|null; trust:string|null; pay:number|null;
}
export interface Profile {role:string;workYears:number|null;codingYears:number|null;education:string;country:string;technology:string;aspiration:string;ai:string}
export interface Filters {role:string;experience:string;education:string;country:string;technology:string;query:string;similar:boolean}
export const blankFilters=():Filters=>({role:'',experience:'',education:'',country:'',technology:'',query:'',similar:false});
export const ALEX:Profile={role:'Student',workYears:0,codingYears:0,education:'Some college',country:'Canada',technology:'JavaScript',aspiration:'Full-stack',ai:'Not reported'};
export const n=(value:number)=>value.toLocaleString('en-US');
export const esc=(v:unknown)=>String(v??'Not reported').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const fmtPct=(v:number)=>`${v.toFixed(1)}%`;
export function parseYears(v:string|null):number|null {
  if(v==='Less than 1 year')return .5;
  if(v==='More than 50 years')return 51;
  if(v===null||!v.trim())return null;
  const x=Number(v);return Number.isFinite(x)&&x>=0&&x<=80?x:null;
}
export function experienceBand(v:number|null):string {
  if(v===null)return 'Not reported';
  return v<1?'<1':v<=2?'1-2':v<=5?'3-5':v<=10?'6-10':v<=20?'11-20':'21+';
}
export function educationLabel(v:string|null):string {
  if(!v)return 'Not reported';
  const names:[string,string][]=[['Bachelor','Bachelor degree'],['Master','Master degree'],['Professional','Professional degree'],['Associate','Associate degree'],['Some college','Some college'],['Secondary','Secondary school'],['Primary','Primary school'],['Something else','Other education'],['Other','Other education']];
  return names.find(([prefix])=>v.startsWith(prefix))?.[1]??v;
}
export function aiLabel(v:string|null):string {
  return ({'Yes':'Uses AI','Yes, I use AI tools daily':'Daily','Yes, I use AI tools weekly':'Weekly','Yes, I use AI tools monthly or infrequently':'Monthly / less','No, but I plan to soon':'Plans to use',"No, and I don't plan to":'No plans'} as {[k:string]:string})[v??'']??'Not reported';
}
export interface HeatRow {role:string;n:number;valid:number;missing:number;cells:{band:string;n:number;pct:number}[]}
export interface PayGroup {band:string;n:number;median:number|null;q1:number|null;q3:number|null}
export interface TechRow {name:string;used:number;wanted:number;usedPct:number;wantedPct:number}
export interface Trend {year:number;total:number;useN:number;users:number;usePct:number;trustField:string;trustN:number;positive:number;trustPct:number}
export interface Charts {bands:string[];heatmap:{year:number;rows:HeatRow[]};pay:{year:number;country:string;unit:string;countryN:number;validN:number;excluded:number;smallSampleMin:number;groups:PayGroup[]};technology:{year:number;n:number;excluded:number;rows:TechRow[]};ai:{trend:Trend[];trustOrder:string[];composition:{usage:string;n:number;missing:number;segments:{label:string;n:number;pct:number}[]}[]}}
export interface Packed {year:number;columns:string[];dictionaries:{[k:string]:(string|null)[]};rows:(number|null)[][]}
export interface Dictionary {role_labels:{[k:string]:string};source_questions:unknown[];notes:string[]}
export function decode(p:Packed, dictionary:Dictionary):RecordRow[]{
  return p.rows.map(row=>{
    const at=(i:number)=>p.dictionaries[p.columns[i]][row[i]!];
    const raw=at(1);const workRaw=at(3);const codingRaw=at(4);const educationRaw=at(5);const aiRaw=at(9);
    return {id:`${p.year}-${row[0]}`,year:p.year,role:raw?.includes(';')?'Multiple roles':dictionary.role_labels[raw??'']??raw??'Not reported',roleRaw:raw,status:at(2),workRaw,codingRaw,
      workYears:parseYears(workRaw),codingYears:parseYears(codingRaw),experience:experienceBand(parseYears(p.year===2025?workRaw:codingRaw)),education:educationLabel(educationRaw),educationRaw,country:at(6)??'Not reported',
      used:at(7)?.split(';')??[],wanted:at(8)?.split(';')??[],ai:aiLabel(aiRaw),aiRaw,trust:at(10),pay:row[11]};
  });
}
const cache=new Map<number,Promise<RecordRow[]>>();
export async function loadRecords(year:number,dictionary:Dictionary){
  if(!cache.has(year))cache.set(year,json<Packed>(`${import.meta.env.BASE_URL}data/records-${year}.json`).then(p=>{if(!p)throw Error('Empty record file');return decode(p,dictionary);}).catch(e=>{cache.delete(year);throw e;}));
  return cache.get(year)!;
}
export function profileGroup(p:Profile,dimension:Dimension,year:number):string{
  return dimension==='experience'?experienceBand(year===2025?p.workYears:p.codingYears):p[dimension]||'Not reported';
}
export function matchesProfile(r:RecordRow,p:Profile,relaxed=false):boolean{
  const exp=experienceBand(r.year===2025?p.workYears:p.codingYears);
  return r.role===p.role&&(exp==='Not reported'||r.experience===exp)&&(relaxed||(!p.education||r.education===p.education)&&(!p.country||r.country===p.country)&&(!p.technology||r.used.includes(p.technology)));
}
export function filterRecords(rows:RecordRow[],f:Filters,p:Profile|null,relaxed=false){
  const query=f.query.trim().toLowerCase();
  return rows.filter(r=>(!f.role||r.role===f.role)&&(!f.experience||r.experience===f.experience)&&(!f.education||r.education===f.education)&&(!f.country||r.country===f.country)&&(!f.technology||r.used.includes(f.technology))&&(!query||r.id.toLowerCase().includes(query))&&(!f.similar||!!p&&matchesProfile(r,p,relaxed)));
}
export function profileRules(p:Profile,year:number,relaxed=false){
  const exp=experienceBand(year===2025?p.workYears:p.codingYears);
  return [p.role,exp!=='Not reported'?`${exp} ${year===2025?'work':'professional coding'} years`:null,...(relaxed?[]:[p.education||null,p.country||null,p.technology?`uses ${p.technology}`:null])].filter(Boolean).join(' + ');
}
