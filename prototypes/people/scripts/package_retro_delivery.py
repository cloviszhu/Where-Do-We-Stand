"""Package the complete A version independently of shared/B/C and historical outputs."""
from pathlib import Path
import zipfile,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
archive=OUT/'Where-Do-We-Stand-A-Retro-Futurism.zip'
files={}
for name in ['README.md','THIRD_PARTY_NOTICES.md','requirements-docs.txt','package.json','package-lock.json','tsconfig.json','index.html','.gitignore','data/sources.json','research/process-book-original.pdf','documentation/dependency-licenses.txt','evidence/data-validation.json']:
    files[name]=ROOT/name
for folder in ['src','tests','public','evidence/retro-full']:
    for p in (ROOT/folder).rglob('*'):
        if p.is_file() and p.suffix not in ['.log','.pyc'] and 'contact' not in p.name:
            files[p.relative_to(ROOT).as_posix()]=p
for name in ['download_data.py','build_data.py','inspect_sources.py','validate_data.py','build_retro_process_book.py','package_retro_delivery.py']:
    files['scripts/'+name]=ROOT/'scripts'/name
for p in (ROOT/'output/pdf').glob('*Retro-Futurism*.pdf'):
    files[p.relative_to(ROOT).as_posix()]=p
spec=ROOT.parents[1]/'docs/prototype-plans/01-人物群体原型.md'
if spec.exists():
    files['documentation/feature-spec-A.md']=spec
    for p in (spec.parent/'references').iterdir():
        if p.is_file():files['documentation/references/'+p.name]=p
else:
    # Repacking the portable archive uses its included documentation snapshot.
    for p in (ROOT/'documentation').rglob('*'):
        if p.is_file():files[p.relative_to(ROOT).as_posix()]=p
assert all(p.is_file() for p in files.values())
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name,path in sorted(files.items()):
        assert not any(part in name.split('/') for part in ['node_modules','tmp','raw','.git'])
        z.write(path,'Where-Do-We-Stand-A-Retro-Futurism/'+name)
report={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'entries':len(files),'excluded':['node_modules','dist','raw inputs (downloader included)','B/C/shared','historical outputs','temporary files','credentials'],'entries_sha256':{name:hashlib.sha256(p.read_bytes()).hexdigest() for name,p in sorted(files.items())}}
(OUT/'retro-package-manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='entries_sha256'},indent=2))
