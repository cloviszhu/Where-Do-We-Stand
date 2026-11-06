"""Fetch official, commit-pinned survey inputs; reuse verified local files."""
from pathlib import Path
import urllib.request, hashlib, json, datetime
ROOT = Path(__file__).resolve().parents[1]
REV = '9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7'
def main():
    manifest = []
    source_path=ROOT/'data'/'sources.json'
    prior=json.loads(source_path.read_text()) if source_path.exists() else None
    expected={r['file']:r for r in prior['files']} if prior else {}
    downloaded=False
    for year in (2023, 2024, 2025):
        folder = ROOT / 'data' / 'raw' / str(year)
        folder.mkdir(parents=True, exist_ok=True)
        for name in ('results.csv', 'schema.csv', 'survey.pdf'):
            url = f'https://raw.githubusercontent.com/StackExchange/Survey/{REV}/packages/archive/{year}/{name}'
            path = folder / name
            if not path.exists():
                downloaded=True
                print(f'Downloading {year}/{name}', flush=True)
                urllib.request.urlretrieve(url, path)
            pointer = path.read_bytes()[:200]
            lfs_sha = None
            if pointer.startswith(b'version https://git-lfs.github.com/spec/v1'):
                lfs_sha = pointer.decode().split('oid sha256:')[1].splitlines()[0]
                url = f'https://media.githubusercontent.com/media/StackExchange/Survey/{REV}/packages/archive/{year}/{name}'
                print(f'Resolving official Git LFS object: {year}/{name}', flush=True)
                urllib.request.urlretrieve(url, path)
                assert hashlib.sha256(path.read_bytes()).hexdigest() == lfs_sha, 'LFS checksum mismatch'
            digest=hashlib.sha256(path.read_bytes()).hexdigest()
            previous=expected.get(f'{year}/{name}')
            if previous:
                assert digest==previous['sha256'], f'Cached/downloaded source mismatch: {year}/{name}; remove only that raw file and run again.'
                url=previous['url']
            manifest.append(dict(year=year, file=f'{year}/{name}', url=url, bytes=path.stat().st_size,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (ROOT/'data'/'sources.json').write_text(json.dumps(dict(revision=REV, retrieved_at=prior['retrieved_at'] if prior and not downloaded else datetime.datetime.now(datetime.timezone.utc).isoformat(),
        official_index='https://survey.stackoverflow.co/', license='ODbL 1.0; individual contents DbCL 1.0', files=manifest), indent=2))
    print('Official source files ready.', flush=True)
if __name__ == '__main__': main()
