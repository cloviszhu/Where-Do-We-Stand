"""Self-contained current B package; never overwrite the legacy delivery."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import json, sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/full-review'
MOTION='--motion' in sys.argv
DEST=ROOT/'output/motion-review' if MOTION else OUT
ZIP=DEST/('Where-Do-We-Stand-B-Endfield-Motion.zip' if MOTION else 'Where-Do-We-Stand-B-Endfield-Complete.zip')
files={}
def add(path,name=None):
    assert path.is_file(),path
    files[name or path.relative_to(ROOT).as_posix()]=path
def tree(path,prefix=None):
    for p in sorted(path.rglob('*')):
        if p.is_file() and '__pycache__' not in p.parts:
            add(p,(prefix+'/'+p.relative_to(path).as_posix()) if prefix else None)
for name in ['src','public','tests','dist']:tree(ROOT/name)
for name in ['README.md','package.json','package-lock.json','tsconfig.json','index.html','index.v1.html','.gitignore','data/sources.json','research/process-book-original.pdf']:
    add(ROOT/name)
for name in ['download_data.py','build_data.py','validate_data.py','build_full_process_book.py','package_full_delivery.py']:add(ROOT/'scripts'/name)
for p in (ROOT/'research').glob('questionnaire-*.txt'):add(p)
for p in OUT.iterdir():
    if p.is_file() and p.suffix in ['.md','.json','.txt','.jpg'] and p.name!='package-validation.json':add(p)
for p in (OUT/'pdf').glob('*.pdf'):add(p)
tree(OUT/'egm');tree(OUT/'baseline')
if MOTION:
    for p in DEST.iterdir():
        if p.is_file() and p.suffix in ['.md','.json','.txt','.jpg'] and p.name!='package-validation.json':add(p)
    tree(DEST/'baseline')
plans=ROOT.parents[1]/'docs/prototype-plans'
if not plans.exists():plans=ROOT/'delivery-plan'
add(plans/'02-档案群体原型.md','delivery-plan/02-档案群体原型.md')
for name in ['teacher-requirements.md','process-book-snapshot.md','data-and-delivery-contract.md','reference-reading-and-skills.md','sketch-3-technologies.png','sketch-5-peer-heatmap.png','sketch-8-compensation.png','sketch-9-ai.png','milestone-7-requirements.png','milestone-6-storyboard.png']:
    add(plans/'references'/name,'delivery-plan/references/'+name)
manifest={name:{'bytes':p.stat().st_size,'sha256':sha256(p.read_bytes()).hexdigest()} for name,p in sorted(files.items())}
with ZipFile(ZIP,'w',ZIP_DEFLATED,compresslevel=8) as z:
    for name,p in sorted(files.items()):z.write(p,'where-do-we-stand-b/'+name)
    z.writestr('where-do-we-stand-b/DELIVERY-MANIFEST.json',json.dumps(manifest,indent=2,ensure_ascii=False))
with ZipFile(ZIP) as z:
    assert z.testzip() is None
    for name,meta in manifest.items():assert sha256(z.read('where-do-we-stand-b/'+name)).hexdigest()==meta['sha256']
report={'archive':ZIP.name,'files':len(manifest)+1,'bytes':ZIP.stat().st_size,'sha256':sha256(ZIP.read_bytes()).hexdigest(),'crc_and_all_member_hashes':'passed','excluded':['node_modules','raw downloads','clean-room','PDF render cache','legacy outputs','Google Drive readback JSON']}
(DEST/'package-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
