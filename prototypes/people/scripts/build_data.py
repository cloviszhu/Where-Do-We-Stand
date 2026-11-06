"""Deterministic standard-library pipeline; no samples or imputed survey answers."""
import csv, json, math, re, hashlib
from pathlib import Path
from collections import Counter, defaultdict
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data'
csv.field_size_limit(10000000)
EXP=['<1','1–2','3–5','6–10','11–20','21–30','31+','Unknown']
TRUST=['Highly distrust','Somewhat distrust','Neither trust nor distrust','Somewhat trust','Highly trust','Unknown']
FIELDS=['ResponseId','MainBranch','DevType','YearsCodePro','EdLevel','Country','ConvertedCompYearly','LanguageHaveWorkedWith','LanguageWantToWorkWith','AISelect','AIAcc']
def clean(v): return '' if v is None or v.strip() in ('','NA','N/A','null') else v.strip()
def exp(v):
    v=clean(v)
    if v=='Less than 1 year': return '<1'
    if v=='More than 50 years': return '31+'
    try:
        n=float(v)
        if not math.isfinite(n) or n<0 or n>100: return 'Unknown'
        return '<1' if n<1 else '1–2' if n<=2 else '3–5' if n<=5 else '6–10' if n<=10 else '11–20' if n<=20 else '21–30' if n<=30 else '31+'
    except ValueError: return 'Unknown'
def education(v):
    v=clean(v)
    if not v: return 'Unknown'
    for prefix,label in [('Bachelor','Bachelor’s'),('Master','Master’s'),('Professional','Professional / doctorate'),('Associate','Associate'),('Some college','Some college'),('Secondary','Secondary'),('Primary','Primary')]:
        if v.startswith(prefix): return label
    return 'Other education'
def role(v):
    v=clean(v)
    if not v:return 'Unknown'
    if ';' in v:return 'Multiple roles'
    return {'Developer, full-stack':'Full-stack','Developer, back-end':'Back-end','Developer, front-end':'Front-end','Developer, desktop or enterprise applications':'Desktop / enterprise','Developer, mobile':'Mobile','Developer, embedded applications or devices':'Embedded','Student':'Student'}.get(v,'Other reported roles')
def num(v):
    try:
        n=float(v)
        return n if math.isfinite(n) else None
    except (ValueError,TypeError): return None
def multi(v): return sorted(set(clean(v).split(';'))) if clean(v) else []
def load(y):
    return list(csv.DictReader((ROOT/f'data/raw/{y}/results.csv').open(encoding='utf-8-sig',newline='')))
def write(name,obj): (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def quantile(a,p):
    a=sorted(a); i=(len(a)-1)*p; lo=int(i); hi=math.ceil(i)
    return a[lo]+(a[hi]-a[lo])*(i-lo)
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    raw=load(2024); seen=set(); people=[]; excluded=Counter()
    for r in raw:
        sid=clean(r['ResponseId'])
        if not sid: excluded['missing source ID']+=1;continue
        if sid in seen: excluded['duplicate source ID']+=1;continue
        seen.add(sid)
        people.append(dict(id=f'2024-{sid}',role=role(r['DevType']),roleRaw=clean(r['DevType']) or 'Unknown',
            status=clean(r['MainBranch']) or 'Unknown',experience=exp(r['YearsCodePro']),experienceRaw=clean(r['YearsCodePro']) or 'Unknown',
            education=education(r['EdLevel']),educationRaw=clean(r['EdLevel']) or 'Unknown',country=clean(r['Country']) or 'Unknown',
            pay=num(r['ConvertedCompYearly']),languages=multi(r['LanguageHaveWorkedWith']),wanted=multi(r['LanguageWantToWorkWith']),
            ai=clean(r['AISelect']) or 'Unknown',trust=clean(r['AIAcc']) or 'Unknown'))
    people.sort(key=lambda p:int(p['id'].split('-')[1]))
    # Dictionary encoding is lossless; it does not select, sample or combine people.
    columns=list(people[0]); dictionaries={}; maps={}
    for k in columns:
        if k not in ['id','pay','languages','wanted']:
            dictionaries[k]=sorted({p[k] for p in people});maps[k]={v:i for i,v in enumerate(dictionaries[k])}
    rows=[[maps[k][p[k]] if k in maps else p[k] for k in columns] for p in people]
    write('people.json',dict(year=2024,columns=columns,dictionaries=dictionaries,rows=rows))
    heat=[]
    for role_raw in sorted({p['roleRaw'] for p in people}):
        subset=[p for p in people if p['roleRaw']==role_raw];valid=[p for p in subset if p['experience']!='Unknown']
        heat.append(dict(role=role_raw,n=len(valid),missing=len(subset)-len(valid),counts={e:sum(p['experience']==e for p in valid) for e in EXP[:-1]}))
    pay=[]
    for country in ['United States of America','Canada','United Kingdom of Great Britain and Northern Ireland','Germany','India']:
        for e in EXP[:-1]:
            vals=[p['pay'] for p in people if p['country']==country and p['experience']==e and p['pay'] is not None and p['pay']>0]
            pay.append(dict(country=country,experience=e,n=len(vals),q1=quantile(vals,.25) if len(vals)>=20 else None,median=quantile(vals,.5) if len(vals)>=20 else None,q3=quantile(vals,.75) if len(vals)>=20 else None))
    tech_people=[p for p in people if p['languages'] and p['wanted']]
    technologies=sorted({l for p in tech_people for l in p['languages']+p['wanted']})
    tech=[dict(language=l,n=len(tech_people),used=sum(l in p['languages'] for p in tech_people),wanted=sum(l in p['wanted'] for p in tech_people)) for l in technologies]
    trend=[];frequency=[];ai_quality={}
    for year in (2023,2024,2025):
        rows_y=raw if year==2024 else load(year)
        valid=[r for r in rows_y if clean(r['AISelect'])]
        users=[r for r in valid if r['AISelect'].startswith('Yes')]
        trust_field='AIBen' if year==2023 else 'AIAcc'
        trust=[r for r in users if clean(r[trust_field]) in TRUST[:-1]]
        trend.append(dict(year=year,total=len(rows_y),useN=len(valid),useYes=len(users),trustN=len(trust),trustYes=sum(r[trust_field] in ('Highly trust','Somewhat trust') for r in trust)))
        ai_quality[str(year)]=dict(trustField=trust_field,missingUse=len(rows_y)-len(valid),currentUsersWithoutTrust=len(users)-len(trust),observedTrustOptions=sorted({clean(r[trust_field]) for r in rows_y}))
        if year==2025:
            for value in sorted({clean(r['AISelect']) for r in rows_y}):
                sub=[r for r in rows_y if clean(r['AISelect'])==value];counts=Counter(clean(r['AIAcc']) or 'Unknown' for r in sub)
                frequency.append(dict(group=value or 'Unknown',n=len(sub),counts=dict(counts)))
    write('charts.json',dict(heat=heat,pay=pay,tech=tech,trend=trend,frequency=frequency,trustOrder=TRUST))
    fieldmap={}
    for y in (2023,2024,2025):
        sch=list(csv.DictReader((ROOT/f'data/raw/{y}/schema.csv').open(encoding='utf-8-sig')))
        fieldmap[str(y)]=[r for r in sch if r.get('qname') in FIELDS+['Language','WorkExp','AIBen']]
    write('dictionary.json',dict(fields=fieldmap,experienceBands=EXP,roleRules={v:role(v) for v in sorted({p['roleRaw'] for p in people})},
        notes=['2024 DevType is single-select: current job done most of the time. No multi-role answers observed.',
        '2025 WorkExp is general professional work, not professional coding; not used for peer or pay experience.',
        '2023 trust uses AIBen (QID316), not AIAcc (benefits). Both schema and questionnaire page 41 verify the same accuracy-trust question and five response options as AIAcc in 2024/2025.',
        '2025 AISelect adds frequency; all Yes options harmonized to current use. Independent annual samples.',
        'Education display labels normalize categories; original answer text retained, including replacement characters already present in official CSV.']))
    quality=dict(mainYear=2024,rawRows=len(raw),retained=len(people),excluded=dict(excluded),uniqueIds=len(seen),
        groups={k:dict(Counter(p[k] for p in people)) for k in ['role','experience','education','ai']},
        missing={k:sum(p[k]=='Unknown' for p in people) for k in ['role','experience','education','country','ai','trust']},
        pay=dict(missing=sum(p['pay'] is None for p in people),nonpositive=sum(p['pay'] is not None and p['pay']<=0 for p in people),rule='Positive finite converted annual compensation; no upper trimming. Median and IQR; n >= 20, otherwise suppressed.'),
        technology=dict(pairedN=len(tech_people),excludedMissingOneOrBoth=len(people)-len(tech_people),rule='Same respondents answered both language columns; distinct tokens per respondent; percentages need not sum to 100.'),
        ai=ai_quality)
    sources=json.loads((ROOT/'data/sources.json').read_text())
    write('manifest.json',dict(sources=sources,quality=quality,statistics=dict(heat='Within original reported role among known professional coding experience; Unknown excluded from percentage denominator, disclosed separately.',pay='Country-specific 2024 USD annual total compensation before tax; IQR is the middle 50%, not a confidence interval.',ai='Use / nonmissing AISelect; positive trust / current AI users answering accuracy trust (AIBen in 2023, AIAcc in 2024/2025). Frequency composition includes Unknown trust and Unknown frequency.'),
        artifacts={n:hashlib.sha256((OUT/n).read_bytes()).hexdigest() for n in ['people.json','charts.json','dictionary.json']}))
    print(json.dumps(dict(rows=len(people),encodedBytes=(OUT/'people.json').stat().st_size,technologyN=len(tech_people),trend=trend),indent=2))
if __name__=='__main__':main()
