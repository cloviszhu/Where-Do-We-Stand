"""Package only the B deliverables; exclude raw data, caches and copied reference code."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'
ZIP=OUT/'Where-Do-We-Stand-B-local-delivery.zip'
PREFIX='where-do-we-stand-b'
files={}
def add(path,relative=None):
    if path.is_dir():
        for p in sorted(path.rglob('*')):
            if p.is_file() and '__pycache__' not in p.parts:add(p)
    else:
        assert path.is_file(),path
        files[relative or str(path.relative_to(ROOT)).replace('\\','/')]=path

for name in ['src','public','scripts','tests','dist']:
    add(ROOT/name)
for name in ['README.md','package.json','package-lock.json','tsconfig.json','index.html','.gitignore','data/sources.json','research/process-book-original.pdf','research/design-and-reference-notes.md']:
    add(ROOT/name)
for name in ['pdf','screenshots']:
    add(OUT/name)
for name in ['data-validation.json','verification.md','browser-evidence.json','story-motion-evidence.json','production-browser-evidence.json','pdf-validation.json','build-manifest.json','dependency-audit.json']:
    add(OUT/name)

plans=ROOT.parents[1]/'docs/prototype-plans'
if not plans.exists():plans=ROOT/'delivery-plan'
add(plans/'02-档案群体原型.md','delivery-plan/02-档案群体原型.md')
for p in (plans/'references').rglob('*'):
    if p.is_file():add(p,'delivery-plan/references/'+str(p.relative_to(plans/'references')).replace('\\','/'))

manifest={name:{'bytes':p.stat().st_size,'sha256':sha256(p.read_bytes()).hexdigest()} for name,p in sorted(files.items())}
with ZipFile(ZIP,'w',ZIP_DEFLATED,compresslevel=8) as z:
    for name,p in sorted(files.items()):z.write(p,PREFIX+'/'+name)
    z.writestr(PREFIX+'/DELIVERY-MANIFEST.json',json.dumps(manifest,indent=2,ensure_ascii=False))
with ZipFile(ZIP) as z:
    assert z.testzip() is None
    for name,meta in manifest.items():
        data=z.read(PREFIX+'/'+name)
        assert len(data)==meta['bytes'] and sha256(data).hexdigest()==meta['sha256']
    assert not any('/node_modules/' in n or '/data/raw/' in n or '/clean-room/' in n or n.endswith('.env') for n in z.namelist())
report={'archive':ZIP.name,'files':len(manifest)+1,'bytes':ZIP.stat().st_size,'sha256':sha256(ZIP.read_bytes()).hexdigest(),'crc_and_all_member_hashes':'passed','excluded':['node_modules','raw CSV/questionnaire download','clean-room','PDF render cache','third-party reference source copies','Google Drive readback JSON'],'clean_source_and_build_equal':json.loads((OUT/'build-manifest.json').read_text())['clean_build_equal']}
(OUT/'package-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
