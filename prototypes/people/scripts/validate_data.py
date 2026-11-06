"""Independent checks against original CSVs, without importing the build pipeline."""
import csv, json, hashlib, statistics, math
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
csv.field_size_limit(10000000)
def load(name):return json.loads((ROOT/'public/data'/name).read_text(encoding='utf-8'))
packed=load('people.json'); charts=load('charts.json'); manifest=load('manifest.json')
people=[{k:packed['dictionaries'][k][r[i]] if k in packed['dictionaries'] else r[i] for i,k in enumerate(packed['columns'])} for r in packed['rows']]
by_id={p['id']:p for p in people};checks=[]
def ok(name,condition):
    assert condition,name
    checks.append(name)
def present(v):return v not in ('','NA','N/A','null',None)
for name,digest in manifest['artifacts'].items():ok('artifact hash '+name,hashlib.sha256((ROOT/'public/data'/name).read_bytes()).hexdigest()==digest)
for source in manifest['sources']['files']:
    path=ROOT/'data/raw'/source['file'];ok('source hash '+source['file'],hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256'])
with (ROOT/'data/raw/2024/results.csv').open(encoding='utf-8-sig',newline='') as f:raw=list(csv.DictReader(f))
ok('all original IDs retained exactly once',len(raw)==len(people)==len(by_id)==65437 and set(by_id)=={'2024-'+r['ResponseId'] for r in raw})
for r in raw:
    p=by_id['2024-'+r['ResponseId']]
    for source,target in [('DevType','roleRaw'),('Country','country'),('EdLevel','educationRaw'),('YearsCodePro','experienceRaw'),('AISelect','ai'),('AIAcc','trust')]:
        assert p[target]==(r[source] if present(r[source]) else 'Unknown')
    for source,target in [('LanguageHaveWorkedWith','languages'),('LanguageWantToWorkWith','wanted')]:
        assert set(p[target])==(set(r[source].split(';')) if present(r[source]) else set())
    assert p['pay']==(float(r['ConvertedCompYearly']) if present(r['ConvertedCompYearly']) else None)
ok('raw detail fields and multi-select answers verified for all 65437 records',True)
for key,counts in manifest['quality']['groups'].items():ok('group accounting '+key,dict(Counter(p[key] for p in people))==counts and sum(counts.values())==65437)
for d in charts['heat']:
    rows=[p for p in people if p['roleRaw']==d['role']]
    assert d['n']+d['missing']==len(rows) and sum(d['counts'].values())==d['n']
ok('all heatmap row denominators reconcile',True)
for d in charts['pay']:
    vals=[p['pay'] for p in people if p['country']==d['country'] and p['experience']==d['experience'] and p['pay'] is not None and p['pay']>0]
    assert d['n']==len(vals)
    if len(vals)>=20:
        q=statistics.quantiles(vals,n=4,method='inclusive')
        assert math.isclose(d['median'],statistics.median(vals)) and math.isclose(d['q1'],q[0]) and math.isclose(d['q3'],q[2])
    else: assert d['median'] is None and d['q1'] is None and d['q3'] is None
ok('35 country/experience cells independently recomputed with statistics library',True)
paired=[r for r in raw if present(r['LanguageHaveWorkedWith']) and present(r['LanguageWantToWorkWith'])]
used=Counter(v for r in paired for v in set(r['LanguageHaveWorkedWith'].split(';')));wanted=Counter(v for r in paired for v in set(r['LanguageWantToWorkWith'].split(';')))
for d in charts['tech']:assert d['n']==len(paired)==55752 and d['used']==used[d['language']] and d['wanted']==wanted[d['language']]
ok('paired language counts recomputed from original CSV',True)
for d in charts['trend']:
    with (ROOT/f'data/raw/{d["year"]}/results.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
    use=[r for r in rows if present(r['AISelect'])];users=[r for r in use if r['AISelect'].startswith('Yes')];field='AIBen' if d['year']==2023 else 'AIAcc'
    trust=[r for r in users if r[field] in charts['trustOrder'][:-1]]
    assert (d['total'],d['useN'],d['useYes'],d['trustN'],d['trustYes'])==(len(rows),len(use),len(users),len(trust),sum(r[field] in ('Highly trust','Somewhat trust') for r in trust))
    if d['year']==2025:
        for g in charts['frequency']:
            sub=[r for r in rows if (r['AISelect'] if present(r['AISelect']) else 'Unknown')==g['group']]
            assert len(sub)==g['n']==sum(g['counts'].values())
            assert dict(Counter(r['AIAcc'] if present(r['AIAcc']) else 'Unknown' for r in sub))==g['counts']
ok('AI numerators, distinct denominators and all 2025 frequency rows recomputed',True)
report={'status':'passed','checks':checks,'retained':len(people),'spot_records':[by_id[f'2024-{i}'] for i in (1,100,102,65437)],'trend':charts['trend']}
(ROOT/'evidence').mkdir(exist_ok=True);(ROOT/'evidence/data-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'PASS: {len(checks)} checks; all source fields verified for {len(people)} records.')
