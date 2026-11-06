import { experienceBand, type Profile, type RecordRow, type PayGroup } from './data';
import type { SurveyRecord, Dimension } from './site-packets';

export const NAMED_ROLES = ['Full-stack', 'Back-end', 'Front-end', 'Desktop / enterprise', 'Mobile', 'Embedded', 'Student'];
export const EXPERIENCE = ['<1', '1–2', '3–5', '6–10', '11–20', '21–30', '31+', 'Unknown'];
export function band2024(years: number | null): string {
  return years === null ? 'Unknown' : years < 1 ? '<1' : years <= 2 ? '1–2' : years <= 5 ? '3–5' : years <= 10 ? '6–10' : years <= 20 ? '11–20' : years <= 30 ? '21–30' : '31+';
}
export function groupRole(role: string, raw: string | null = role): string {
  return !raw || role === 'Not reported' ? 'Unknown' : NAMED_ROLES.includes(role) ? role : 'Other reported roles';
}
export function normalize(rows: RecordRow[]): SurveyRecord[] {
  return rows.map(r => ({id:r.id, role:groupRole(r.role,r.roleRaw), roleRaw:r.roleRaw || 'Not reported', experience:band2024(r.codingYears), education:r.education, country:r.country, pay:r.pay, languages:r.used, ai:r.ai}));
}
export type ExploreFilter = { role:string; experience:string; education:string; country:string; technology:string; query:string; chartBand:string; similar:boolean; relaxed:boolean };
export const emptyFilter = ():ExploreFilter => ({role:'',experience:'',education:'',country:'',technology:'',query:'',chartBand:'',similar:false,relaxed:false});
export function displayPayGroup(row:PayGroup,minimum:number):PayGroup {
  return row.n<minimum||row.median===null||row.q1===null||row.q3===null?{...row,median:null,q1:null,q3:null}:row;
}
export function similar(r:RecordRow,p:Profile,relaxed=false):boolean {
  return r.role===p.role && (p.codingYears===null || band2024(r.codingYears)===band2024(p.codingYears)) && (relaxed || ((!p.education || r.education===p.education) && (!p.country || r.country===p.country) && (!p.technology || r.used.includes(p.technology)) && (p.ai==='Not reported'||r.ai===p.ai)));
}
export function applyFilters(rows:RecordRow[],f:ExploreFilter,p:Profile|null):RecordRow[] {
  const query=f.query.trim().toLowerCase();
  return rows.filter(r=>(!f.role||r.role===f.role)&&(!f.experience||band2024(r.codingYears)===f.experience)&&(!f.chartBand||experienceBand(r.codingYears)===f.chartBand)&&(!f.education||r.education===f.education)&&(!f.country||r.country===f.country)&&(!f.technology||r.used.includes(f.technology))&&(!query||r.id.toLowerCase().includes(query))&&(!f.similar||!!p&&similar(r,p,f.relaxed)));
}
export function profileCategory(p:Profile,dimension:Dimension):string {
  return dimension==='all'?'Everyone':dimension==='role'?groupRole(p.role):dimension==='experience'?band2024(p.codingYears):dimension==='education'?(p.education||'Not reported'):p.ai;
}
export function profileInScope(p:Profile,f:ExploreFilter,matching:Profile|null):boolean {
  if(f.query.trim())return false;
  if(f.role&&p.role!==f.role||f.experience&&band2024(p.codingYears)!==f.experience||f.chartBand&&experienceBand(p.codingYears)!==f.chartBand||f.education&&p.education!==f.education||f.country&&p.country!==f.country||f.technology&&p.technology!==f.technology)return false;
  if(f.similar){if(!matching)return false;if(p.role!==matching.role||matching.codingYears!==null&&band2024(p.codingYears)!==band2024(matching.codingYears))return false;if(!f.relaxed&&(['education','country','technology'] as const).some(k=>matching[k]&&p[k]!==matching[k]))return false;if(!f.relaxed&&matching.ai!=='Not reported'&&p.ai!==matching.ai)return false;}
  return true;
}
export function matchingRules(p:Profile,relaxed=false):string {
  return [p.role,p.codingYears===null?'any professional experience':`${band2024(p.codingYears)} professional coding years`,...(relaxed?[]:[p.education,p.country,p.technology?`uses ${p.technology}`:'',p.ai==='Not reported'?'':p.ai])].filter(Boolean).join(' + ');
}
export function readProfile(values:Record<string,string>):Profile {
  const years=values.years.trim()===''?null:Number(values.years);
  if(years!==null&&(!Number.isFinite(years)||years<0||years>80||!Number.isInteger(years)))throw Error('Enter whole years from 0 to 80, or leave experience blank.');
  if(!values.role)throw Error('Choose your current role.');
  return {role:values.role,codingYears:years,workYears:null,education:values.education||'',country:values.country||'',technology:values.technology||'',aspiration:values.aspiration||'',ai:values.ai||'Not reported'};
}
