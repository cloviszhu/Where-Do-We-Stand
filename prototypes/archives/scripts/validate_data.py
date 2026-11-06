"""Independent checks against raw CSV. Does not import the cleaning implementation."""
import csv,collections,hashlib,json,pathlib,statistics,time,argparse
ROOT=pathlib.Path(__file__).resolve().parents[1]
csv.field_size_limit(10000000)
checks=[]
def check(name,condition,detail=None):
    checks.append(dict(name=name,passed=bool(condition),detail=detail))
    if not condition:raise AssertionError(name)
def raw(year):
    with (ROOT/f'data/raw/{year}/results.csv').open(encoding='utf-8-sig') as f:return list(csv.DictReader(f))
def experience(v):
    if v=='Less than 1 year':return .5
    if v=='More than 50 years':return 51
    try:
        f=float(v)
        return f if 0<=f<=80 else None
    except (TypeError,ValueError):return None
def band(n):
    if n is None:return 'Not reported'
    return next(label for end,label in [(1,'<1'),(3,'1-2'),(6,'3-5'),(11,'6-10'),(21,'11-20'),(float('inf'),'21+')] if n<end)
def main(output=None):
    start=time.time();charts=json.loads((ROOT/'public/data/charts.json').read_text());manifest=json.loads((ROOT/'public/data/manifest.json').read_text());dictionary=json.loads((ROOT/'public/data/field-dictionary.json').read_text())
    cohorts={y:raw(y) for y in (2023,2024,2025)}
    for y in (2024,2025):
        rows=cohorts[y];p=json.loads((ROOT/f'public/data/records-{y}.json').read_text(encoding='utf-8'));q=manifest['quality'][str(y)];ids=[r['ResponseId'] for r in rows]
        check(f'{y}: all source rows retained',len(rows)==len(p['rows'])==q['retained_rows'])
        check(f'{y}: IDs unique and one-to-one',len(set(ids))==len(ids) and set(ids)==set(str(r[0]) for r in p['rows']))
        for key,counts in q['categories'].items():check(f'{y}: {key} partitions reconcile',sum(counts.values())==len(rows))
        positions={int(r[0]):r for r in p['rows']};src={int(r['ResponseId']):r for r in rows};pairs=[('roleRaw','DevType'),('status','MainBranch'),('workRaw','WorkExp'),('codingRaw','YearsCodePro'),('educationRaw','EdLevel'),('country','Country'),('used','LanguageHaveWorkedWith'),('wanted','LanguageWantToWorkWith'),('aiRaw','AISelect'),('trust','AIAcc')]
        # 200 evenly-spaced records plus first/last: test original source-to-detail values, not fixture copies.
        sample=ids[::max(1,len(ids)//200)]+[ids[-1]]
        for sid in sample:
            a=src[int(sid)];b=positions[int(sid)]
            for key,original in pairs:
                val=a.get(original);val=None if val in ('','NA','N/A',None) else val.strip();idx=p['columns'].index(key)
                check(f'{y}-{sid}: {original}',p['dictionaries'][key][b[idx]]==val)
    older=cohorts[2024];names=dictionary['role_labels']
    for row in charts['heatmap']['rows']:
        rs=[r for r in older if names.get(r['DevType'],r['DevType'])==row['role'] or r['DevType']=='NA' and row['role']=='Not reported']
        valid=[r for r in rs if experience(r.get('YearsCodePro')) is not None]
        check(f'heatmap {row["role"]}: denominator',len(valid)==row['valid'] and len(rs)==row['n'])
        check(f'heatmap {row["role"]}: cells',all(sum(band(experience(r.get('YearsCodePro')))==c['band'] for r in valid)==c['n'] for c in row['cells']))
        check(f'heatmap {row["role"]}: percentages',all(abs(c['pct']-c['n']/len(valid)*100)<1e-9 for c in row['cells']) if valid else True)
    us=[]
    for r in older:
        if r['Country']!='United States of America':continue
        try:v=float(r['ConvertedCompYearly'])
        except ValueError:continue
        if v>0 and experience(r['YearsCodePro']) is not None:us.append((band(experience(r['YearsCodePro'])),v))
    check('pay: total n',len(us)==charts['pay']['validN'])
    for group in charts['pay']['groups']:
        vals=[v for b,v in us if b==group['band']];quart=statistics.quantiles(vals,n=4,method='inclusive')
        check(f'pay {group["band"]}: independent quartiles',len(vals)==group['n'] and statistics.median(vals)==group['median'] and abs(quart[0]-group['q1'])<1e-8 and abs(quart[2]-group['q3'])<1e-8)
    tech=[r for r in cohorts[2025] if r['LanguageHaveWorkedWith'] not in ('NA','') and r['LanguageWantToWorkWith'] not in ('NA','')]
    check('technology: paired denominator',len(tech)==charts['technology']['n'])
    for row in charts['technology']['rows']:
        a=sum(row['name'] in set(r['LanguageHaveWorkedWith'].split(';')) for r in tech);b=sum(row['name'] in set(r['LanguageWantToWorkWith'].split(';')) for r in tech)
        check(f'technology {row["name"]}: exact counts and percentages',a==row['used'] and b==row['wanted'] and abs(a/len(tech)*100-row['usedPct'])<1e-8 and abs(b/len(tech)*100-row['wantedPct'])<1e-8)
    trust=['Highly distrust','Somewhat distrust','Neither trust nor distrust','Somewhat trust','Highly trust']
    for point in charts['ai']['trend']:
        y=point['year'];field='AIBen' if y==2023 else 'AIAcc';valid=[r for r in cohorts[y] if r['AISelect'] not in ('NA','')];users=[r for r in valid if r['AISelect'].startswith('Yes')];answers=[r for r in users if r[field] in trust];pos=sum(r[field] in trust[-2:] for r in answers)
        check(f'AI {y}: exact denominators',len(valid)==point['useN'] and len(users)==point['users'] and len(answers)==point['trustN'] and pos==point['positive'])
    usage={'Daily':'Yes, I use AI tools daily','Weekly':'Yes, I use AI tools weekly','Monthly / less':'Yes, I use AI tools monthly or infrequently','Plans to use':'No, but I plan to soon','No plans':"No, and I don't plan to"}
    for row in charts['ai']['composition']:
        rs=[r for r in cohorts[2025] if r['AISelect']==usage[row['usage']] and r['AIAcc'] in trust];counts=collections.Counter(r['AIAcc'] for r in rs)
        check(f'AI composition {row["usage"]}: exact counts',len(rs)==row['n'] and all(counts[s['label']]==s['n'] for s in row['segments']))
        check(f'AI composition {row["usage"]}: 100 percent',abs(sum(s['pct'] for s in row['segments'])-100)<1e-9)
    for source in manifest['sources']:
        path=ROOT/f'data/raw/{source["year"]}/{source["file"]}'
        check(f'SHA-256 {source["year"]}/{source["file"]}',hashlib.file_digest(path.open('rb'),'sha256').hexdigest()==source['sha256'])
    report=dict(status='passed',checks=len(checks),failed=0,elapsed_seconds=round(time.time()-start,3),cohort_rows={str(y):len(cohorts[y]) for y in cohorts},source_detail_spot_checks='200+ evenly spaced original rows per archive year, 10 fields each',statistics='independent raw-CSV counts and statistics.quantiles(method=inclusive)',results=checks)
    destination=pathlib.Path(output) if output else ROOT/'output/data-validation.json'
    if not destination.is_absolute():destination=ROOT/destination
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',help='Report destination, relative to this project or absolute')
    main(parser.parse_args().output)
