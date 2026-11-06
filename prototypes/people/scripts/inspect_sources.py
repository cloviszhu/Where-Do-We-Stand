import csv, collections
from pathlib import Path
csv.field_size_limit(10000000)
root=Path(__file__).resolve().parents[1]/'data/raw'
for year in (2023,2024,2025):
    print('\nYEAR',year)
    for r in csv.DictReader((root/str(year)/'schema.csv').open(encoding='utf-8-sig')):
        if r.get('qname') in ['YearsCodePro','WorkExp','DevType','AISelect','AIAcc','CompTotal','Language']:
            print(r)
    rows=list(csv.DictReader((root/str(year)/'results.csv').open(encoding='utf-8-sig')))
    print('rows',len(rows),'unique IDs',len({r['ResponseId'] for r in rows}))
    print('multi roles',sum(';' in r['DevType'] for r in rows))
    print('AISelect',collections.Counter(r['AISelect'] for r in rows))
    print('pro experience options',collections.Counter(r.get('YearsCodePro') for r in rows).most_common(65))
