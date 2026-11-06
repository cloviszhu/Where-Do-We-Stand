"""Fetch immutable official survey releases and verify Git LFS SHA-256 hashes."""
import concurrent.futures, datetime, hashlib, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
REV = '9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7'
BASE = 'https://raw.githubusercontent.com/StackExchange/Survey/' + REV

def fetch(year, name):
    rel = f'packages/archive/{year}/{name}'
    url = f'{BASE}/{rel}'
    pointer = urllib.request.urlopen(url, timeout=120).read()
    expected = None
    if pointer.startswith(b'version https://git-lfs'):
        expected = pointer.decode().split('oid sha256:')[1].splitlines()[0]
        url = f'https://media.githubusercontent.com/media/StackExchange/Survey/{REV}/{rel}'
    path = ROOT / 'data' / 'raw' / str(year) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and (not expected or hashlib.file_digest(path.open('rb'), 'sha256').hexdigest() == expected):
        pass
    elif expected:
        with urllib.request.urlopen(url, timeout=180) as response, path.with_suffix(path.suffix+'.part').open('wb') as out:
            while block := response.read(1024*1024): out.write(block)
        path.with_suffix(path.suffix+'.part').replace(path)
    else:
        path.write_bytes(pointer)
    checksum = hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()
    if expected and checksum != expected: raise ValueError(f'Hash mismatch: {path}')
    result = dict(year=year, file=name, source_url=url, sha256=checksum, bytes=path.stat().st_size,
                  retrieved_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), upstream_commit=REV)
    print(f'{year}/{name}: verified {result["bytes"]:,} bytes', flush=True)
    return result

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        tasks = [executor.submit(fetch, year, name) for year in (2023,2024,2025) for name in ('results.csv','schema.csv','survey.pdf')]
        results = [task.result() for task in tasks]
    (ROOT/'data'/'sources.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
