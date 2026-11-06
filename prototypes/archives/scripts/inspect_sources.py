import csv, pathlib, collections, json
from pypdf import PdfReader
ROOT=pathlib.Path(__file__).resolve().parents[1]
csv.field_size_limit(10000000)
for year in (2023,2024,2025):
    reader=PdfReader(ROOT/f'data/raw/{year}/survey.pdf')
    text='\n'.join(p.extract_text() or '' for p in reader.pages)
    (ROOT/f'research/questionnaire-{year}.txt').write_text(text,encoding='utf-8')
    rows=list(csv.DictReader((ROOT/f'data/raw/{year}/results.csv').open(encoding='utf-8-sig')))
    print(year, len(rows))
    for key in (['AIBen','AISelect'] if year==2023 else ['DevType','YearsCodePro','WorkExp','AISelect','AIAcc']):
        counts=collections.Counter(r.get(key) for r in rows)
        print(key, counts.most_common(8), 'zero',counts.get('0'), 'multi',sum(v for k,v in counts.items() if k and ';' in k))
original=PdfReader(ROOT/'research/process-book-original.pdf')
print('Original Process Book',len(original.pages),'pages')
print([(i+1,len(p.images)) for i,p in enumerate(original.pages)])
