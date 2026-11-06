"""Reproducible, standard-library-only survey cleaning and chart aggregates."""
import csv, collections, hashlib, json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT/'public/data'
csv.field_size_limit(10_000_000)
MISSING = {'', 'NA', 'N/A'}
BANDS = ['<1', '1-2', '3-5', '6-10', '11-20', '21+']
TRUST = ['Highly distrust','Somewhat distrust','Neither trust nor distrust','Somewhat trust','Highly trust']
ROLE_NAMES = {
 'Developer, full-stack':'Full-stack', 'Developer, back-end':'Back-end', 'Developer, front-end':'Front-end',
 'Developer, desktop or enterprise applications':'Desktop / enterprise','Developer, mobile':'Mobile',
 'Developer, embedded applications or devices':'Embedded', 'Architect, software or solutions':'Architect',
 'Senior Executive (C-Suite, VP, etc.)':'Senior executive','Other (please specify):':'Other role',
 'Data scientist or machine learning specialist':'Data science / ML','Data or business analyst':'Data / business analyst',
 'Developer, QA or test':'QA / test','Engineer, data':'Data engineer','Engineer, site reliability':'Site reliability',
 'Developer, game or graphics':'Game / graphics','Cloud infrastructure engineer':'Cloud infrastructure',
 'Developer, AI':'AI developer','Developer, quality assurance or test':'QA / test',
}

def clean(value):
    return None if value is None or value.strip() in MISSING else value.strip()

def years(value):
    value=clean(value)
    if value=='Less than 1 year': return 0.5
    if value=='More than 50 years': return 51
    try:
        n=float(value)
        return n if math.isfinite(n) and 0<=n<=80 else None
    except (TypeError,ValueError): return None

def band(value):
    if value is None:return 'Not reported'
    if value<1:return '<1'
    if value<=2:return '1-2'
    if value<=5:return '3-5'
    if value<=10:return '6-10'
    if value<=20:return '11-20'
    return '21+'

def role(value):
    v=clean(value)
    if not v:return 'Not reported'
    if ';' in v:return 'Multiple roles'
    return ROLE_NAMES.get(v,v)

def education(value):
    v=clean(value)
    if not v:return 'Not reported'
    for a,b in [('Bachelor','Bachelor degree'),('Master','Master degree'),('Professional','Professional degree'),('Associate','Associate degree'),('Some college','Some college'),('Secondary','Secondary school'),('Primary','Primary school'),('Something else','Other education'),('Other','Other education')]:
        if v.startswith(a):return b
    return v

def ai_group(value):
    v=clean(value)
    return {'Yes':'Uses AI','Yes, I use AI tools daily':'Daily','Yes, I use AI tools weekly':'Weekly',
            'Yes, I use AI tools monthly or infrequently':'Monthly / less','No, but I plan to soon':'Plans to use',
            "No, and I don't plan to":'No plans'}.get(v, 'Not reported')

def split(value):
    return sorted(set(clean(value).split(';'))) if clean(value) else []

def pay(value):
    try:
        n=float(value)
        return n if math.isfinite(n) and n>0 else None
    except (TypeError,ValueError):return None

def quantile(sorted_values,p):
    i=(len(sorted_values)-1)*p
    a=math.floor(i); b=math.ceil(i)
    return sorted_values[a]*(b-i)+sorted_values[b]*(i-a) if a!=b else sorted_values[a]

def load(year):
    with (ROOT/f'data/raw/{year}/results.csv').open(encoding='utf-8-sig',newline='') as f:
        rows=list(csv.DictReader(f))
    ids=[r['ResponseId'] for r in rows]
    if len(set(ids))!=len(ids) or any(not clean(v) for v in ids):raise ValueError('Missing or duplicate source ID')
    return rows

def write(name,value):
    (OUT/name).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    cohorts={year:load(year) for year in (2023,2024,2025)}
    quality={}
    columns=['sourceId','roleRaw','status','workRaw','codingRaw','educationRaw','country','used','wanted','aiRaw','trust','pay']
    fields=['DevType','MainBranch','WorkExp','YearsCodePro','EdLevel','Country','LanguageHaveWorkedWith','LanguageWantToWorkWith','AISelect','AIAcc','ConvertedCompYearly']
    for year in (2024,2025):
        rows=cohorts[year]; dictionaries={k:[] for k in columns if k not in ('sourceId','pay')}; indexes={k:{} for k in dictionaries}
        packed=[]
        for r in rows:
            values=[r['ResponseId']]+[clean(r.get(f)) for f in fields]
            values[0]=int(values[0]); values[-1]=pay(values[-1])
            for i,k in enumerate(columns):
                if k not in dictionaries:continue
                value=values[i]
                if value not in indexes[k]:
                    indexes[k][value]=len(dictionaries[k]); dictionaries[k].append(value)
                values[i]=indexes[k][value]
            packed.append(values)
        write(f'records-{year}.json',dict(year=year,columns=columns,dictionaries=dictionaries,rows=packed))
        expfield='WorkExp' if year==2025 else 'YearsCodePro'
        quality[str(year)]=dict(raw_rows=len(rows),retained_rows=len(rows),excluded_rows=0,
            experience_field=expfield,missing_experience=sum(years(r.get(expfield)) is None for r in rows),
            invalid_nonmissing_experience=collections.Counter(r.get(expfield) for r in rows if clean(r.get(expfield)) and years(r.get(expfield)) is None),
            categories={k:dict(collections.Counter(fn(r) for r in rows)) for k,fn in {
                'role':lambda r:role(r.get('DevType')), 'experience':lambda r:band(years(r.get(expfield))),
                'education':lambda r:education(r.get('EdLevel')),'ai':lambda r:ai_group(r.get('AISelect'))}.items()},
            missing={f:sum(clean(r.get(f)) is None for r in rows) for f in fields},
            multi_role_answers=sum(';' in (r.get('DevType') or '') for r in rows))
    # Role-normalized heatmap, NOT total-coding years and NOT 2025 WorkExp.
    groups=collections.defaultdict(list)
    for r in cohorts[2024]:groups[role(r.get('DevType'))].append(r)
    heat=[]
    for name,rs in groups.items():
        valid=[r for r in rs if years(r.get('YearsCodePro')) is not None]
        counts=collections.Counter(band(years(r.get('YearsCodePro'))) for r in valid)
        heat.append(dict(role=name,n=len(rs),valid=len(valid),missing=len(rs)-len(valid),cells=[dict(band=b,n=counts[b],pct=counts[b]/len(valid)*100 if valid else 0) for b in BANDS]))
    heat.sort(key=lambda r:(-r['n'],r['role']))
    # US compensation, finite positive annual USD; no trimming/winsorization.
    payrows=[r for r in cohorts[2024] if r.get('Country')=='United States of America']
    payvalid=[r for r in payrows if pay(r.get('ConvertedCompYearly')) is not None and years(r.get('YearsCodePro')) is not None]
    salary=[]
    for b in BANDS:
        vals=sorted(pay(r['ConvertedCompYearly']) for r in payvalid if band(years(r['YearsCodePro']))==b)
        salary.append(dict(band=b,n=len(vals),median=quantile(vals,.5) if len(vals)>=10 else None,q1=quantile(vals,.25) if len(vals)>=10 else None,q3=quantile(vals,.75) if len(vals)>=10 else None))
    # Identical denominator: participants answering BOTH language questions.
    techrows=[r for r in cohorts[2025] if clean(r.get('LanguageHaveWorkedWith')) and clean(r.get('LanguageWantToWorkWith'))]
    used=collections.Counter(t for r in techrows for t in split(r['LanguageHaveWorkedWith']))
    wanted=collections.Counter(t for r in techrows for t in split(r['LanguageWantToWorkWith']))
    tech=[dict(name=t,used=used[t],wanted=wanted[t],usedPct=used[t]/len(techrows)*100,wantedPct=wanted[t]/len(techrows)*100) for t in sorted(set(used)|set(wanted))]
    trends=[]
    for year,rows in cohorts.items():
        valid=[r for r in rows if clean(r.get('AISelect'))]
        users=[r for r in valid if r['AISelect'].startswith('Yes')]
        field='AIBen' if year==2023 else 'AIAcc'
        trustrows=[r for r in users if r.get(field) in TRUST]
        positive=sum(r[field] in TRUST[-2:] for r in trustrows)
        trends.append(dict(year=year,total=len(rows),useN=len(valid),users=len(users),usePct=len(users)/len(valid)*100,
                           trustField=field,trustN=len(trustrows),positive=positive,trustPct=positive/len(trustrows)*100))
    composition=[]
    for usage in ['Daily','Weekly','Monthly / less','Plans to use','No plans']:
        eligible=[r for r in cohorts[2025] if ai_group(r['AISelect'])==usage]
        valid=[r for r in eligible if r['AIAcc'] in TRUST]
        counts=collections.Counter(r['AIAcc'] for r in valid)
        composition.append(dict(usage=usage,n=len(valid),missing=len(eligible)-len(valid),segments=[dict(label=t,n=counts[t],pct=counts[t]/len(valid)*100 if valid else 0) for t in TRUST]))
    charts=dict(bands=BANDS,heatmap=dict(year=2024,rows=heat),pay=dict(year=2024,country='United States of America',unit='USD / year',countryN=len(payrows),validN=len(payvalid),excluded=len(payrows)-len(payvalid),smallSampleMin=10,groups=salary),technology=dict(year=2025,n=len(techrows),excluded=len(cohorts[2025])-len(techrows),rows=tech),ai=dict(trend=trends,composition=composition,trustOrder=TRUST))
    write('charts.json',charts)
    mapping=[]
    wanted_fields=set(fields+['AIBen','Language','LanguageChoice'])
    for year in cohorts:
        with (ROOT/f'data/raw/{year}/schema.csv').open(encoding='utf-8-sig',newline='') as f:
            for r in csv.DictReader(f):
                if r.get('qname') in wanted_fields:mapping.append(dict(year=year,**r))
    write('field-dictionary.json',dict(source_questions=mapping,role_labels=ROLE_NAMES,trust_2023='AIBen',trust_2024_2025='AIAcc',bands=BANDS,
        notes=['2025 WorkExp measures professional work, not professional coding. Blank includes zero per the questionnaire; do not infer zero.','2024 YearsCodePro excludes education; Less than 1 year maps to 0.5 for binning only; More than 50 years maps to a lower-bound 51.','The 2023 trust question is AIBen. AIAcc in 2023 measures hoped-for benefits.','Primary DevType is single-choice in both cohort instruments. A defensive Multiple roles group preserves an unexpected multiselect without duplication.','Education labels shorten original text; raw answers, including any upstream encoding damage, are retained.','NA/empty map to null. Experience outside [0,80] is unreported for binning and counted separately; raw text is retained.']))
    source=json.loads((ROOT/'data/sources.json').read_text())
    manifest=dict(version=1,main_year=2025,additional_cohort_year=2024,sources=source,quality=quality,chart_contracts=dict(
        heatmap='2024; YearsCodePro; row denominator is primary-role respondents with valid professional coding years. Missing excluded per row. All rows retained in archive.',
        pay='2024 United States; positive finite ConvertedCompYearly plus valid YearsCodePro. Type-7 linear-interpolated quantiles; IQR=25th to 75th percentile, not a confidence interval. No upper cap. n<10 suppressed.',
        technology='2025; both language items nonmissing; deduplicated semicolon choices; shared denominator. Desire includes continuing to use, not hiring demand.',
        ai='Use: current yes / valid AISelect answers. Trust: highly or somewhat trust / current AI users answering trust. 2023 AIBen; 2024-25 AIAcc. 2025 yes frequency collapsed for trend; frequency composition uses valid trust answers within each AISelect group. Independent annual samples.'),
        license=dict(database='ODbL-1.0',contents='DbCL-1.0',attribution='Stack Overflow Annual Developer Survey, Stack Exchange Inc.',source='https://survey.stackoverflow.co/'),
        identity='year + ResponseId; Alex and YOU are overlays, never included in counts',
        outputs={p.name:dict(bytes=p.stat().st_size,sha256=hashlib.file_digest(p.open('rb'),'sha256').hexdigest()) for p in OUT.glob('*.json') if p.name!='manifest.json'})
    write('manifest.json',manifest)
    print(json.dumps(dict(cohorts={k:v['retained_rows'] for k,v in quality.items()},pay=charts['pay'],techN=len(techrows),ai=trends),indent=2))

if __name__=='__main__':main()
