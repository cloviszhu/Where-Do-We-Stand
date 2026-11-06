import {json,quantileSorted} from 'd3';
export type Person={id:string;role:string;roleRaw:string;status:string;experience:string;experienceRaw:string;education:string;educationRaw:string;country:string;pay:number|null;languages:string[];wanted:string[];ai:string;trust:string};
export type GroupKey='role'|'experience'|'education'|'ai'|'all';
export type Profile={roleRaw:string;experience:string;education:string;country:string;language:string;goal:string};
export type Criteria=Partial<Pick<Person,'roleRaw'|'experience'|'education'|'country'|'role'|'ai'>>&{language?:string};
export const bands=['<1','1–2','3–5','6–10','11–20','21–30','31+','Unknown'];
export const number=new Intl.NumberFormat('en-US');
export const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
export const pct=(n:number,d:number)=>d?`${(100*n/d).toFixed(1)}%`:'Not available';
export function matches(p:Person,c:Criteria){return Object.entries(c).every(([k,v])=>!v||(k==='language'?p.languages.includes(v):p[k as keyof Person]===v));}
export function matching(people:Person[],c:Criteria){return people.filter(p=>matches(p,c));}
export function profileCriteria(p:Profile):Criteria {return {roleRaw:p.roleRaw,experience:p.experience,education:p.education,country:p.country,language:p.language};}
export function quantiles(values:number[]){const sorted=values.toSorted((a,b)=>a-b);return {n:sorted.length,q1:quantileSorted(sorted,.25)!,median:quantileSorted(sorted,.5)!,q3:quantileSorted(sorted,.75)!};}
export function heatData(people:Person[]){return [...new Set(people.map(p=>p.roleRaw))].map(role=>{const rows=people.filter(p=>p.roleRaw===role),valid=rows.filter(p=>p.experience!=='Unknown');return{role,total:rows.length,n:valid.length,missing:rows.length-valid.length,cells:bands.slice(0,-1).map(e=>({experience:e,n:valid.filter(p=>p.experience===e).length}))}}).sort((a,b)=>b.total-a.total);}
export function technologyData(people:Person[]){const paired=people.filter(p=>p.languages.length&&p.wanted.length);return [...new Set(paired.flatMap(p=>[...p.languages,...p.wanted]))].map(language=>({language,n:paired.length,used:paired.filter(p=>p.languages.includes(language)).length,wanted:paired.filter(p=>p.wanted.includes(language)).length}));}
export async function loadData(){
 const [packed,charts,manifest,dictionary]=await Promise.all([json<any>('./data/people.json'),json<any>('./data/charts.json'),json<any>('./data/manifest.json'),json<any>('./data/dictionary.json')]);
 if(!packed?.rows?.length||!charts?.trend)throw new Error('The local survey files are missing or incomplete.');
 const people:Person[]=packed.rows.map((row:any[])=>Object.fromEntries(packed.columns.map((k:string,i:number)=>[k,packed.dictionaries[k]?packed.dictionaries[k][row[i]]:row[i]])));
 if(new Set(people.map(p=>p.id)).size!==people.length||people.length!==manifest.quality.retained)throw new Error('Survey record counts do not match the manifest. Rebuild the data files.');
 return {people,charts,manifest,dictionary};
}
export function esc(s:unknown){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function shortRole(s:string){return s.replace('Developer, ','').replace('United Kingdom of Great Britain and Northern Ireland','United Kingdom').replace('United States of America','United States');}
