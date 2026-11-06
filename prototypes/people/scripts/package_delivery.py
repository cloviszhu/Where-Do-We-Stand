"""Create a portable, explicit-allowlist source/PDF archive. No raw CSVs or caches."""
from pathlib import Path
import zipfile,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
PROJECT=ROOT.parents[1]
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
archive=OUT/'Where-Do-We-Stand-A.zip'
files={}
for name in ['README.md','THIRD_PARTY_NOTICES.md','requirements-docs.txt','package.json','package-lock.json','tsconfig.json','index.html','.gitignore','data/sources.json','research/process-book-original.pdf']:
    files[name]=ROOT/name
for folder in ['src','scripts','tests','public','evidence','documentation','output/pdf']:
    for p in (ROOT/folder).rglob('*'):
        if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.pyc','.log'):
            files[p.relative_to(ROOT).as_posix()]=p
spec=PROJECT/'docs/prototype-plans/01-人物群体原型.md'
if spec.exists():
    files['documentation/feature-spec-A.md']=spec
    for p in (spec.parent/'references').iterdir():
        if p.is_file():files['documentation/references/'+p.name]=p
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name,path in sorted(files.items()):
        assert not any(part in name.split('/') for part in ['node_modules','tmp','raw','.git'])
        z.write(path,'Where-Do-We-Stand-A/'+name)
report={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'entries':len(files),'excluded':['node_modules','dist','raw inputs (download script included)','temporary renders','global brain/skill files','credentials and caches']}
(OUT/'package-manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
