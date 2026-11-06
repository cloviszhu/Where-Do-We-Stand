# Where Do We Stand?

Two complete, independent data stories built with TypeScript, Vite and D3, using the Stack Overflow Developer Survey.

- [A — Retro-Futurism](https://cloviszhu.github.io/Where-Do-We-Stand/a/): scrolling narrative, chapter snapping, animated crowd and same-size Alex/YOU markers.
- [B — Endfield](https://cloviszhu.github.io/Where-Do-We-Stand/b/): seven story scenes, six chapter tabs, grey people, yellow emphasis and light/dark themes.
- [Version selector](https://cloviszhu.github.io/Where-Do-We-Stand/).

The initial source import uses the latest working A/B source from 6 November 2026, rather than the older delivery ZIPs. A lives in `prototypes/people`; B lives in `prototypes/archives`.

## Development

Use Node.js 24 and npm:

```sh
npm run install:sites
npm test
npm run build
```

Run one development server with `npm run dev --prefix prototypes/people` or `npm run dev --prefix prototypes/archives`.

The root build produces `dist/index.html`, `dist/a/` and `dist/b/`. Both builds use relative asset paths and retain their independent data and navigation. Serve `dist` over HTTP for a production preview; do not open the HTML directly with `file://`.

## Deployment

GitHub Pages uses the **GitHub Actions** publishing source. `.github/workflows/pages.yml` installs the two locked dependency sets, tests both apps, builds them and publishes one artifact containing two separate entry points. Every push to `main` repeats this pipeline; it can also be run manually.

Deployment acceptance and recovery are tracked in [the deployment spec](docs/features/github-pages-ab.md). The repository keeps runnable source, processed public data, licenses and data-rebuild scripts. Original CSV downloads, local QA captures, historical PDFs/ZIPs and the unrelated C prototype remain outside Git. Older prototype README references to those local files are historical delivery records.

## Data and attribution

Both explorers retain all 65,437 anonymous 2024 survey responses. Individual chart years and definitions remain version-specific and are disclosed in each site. Alex and YOU are illustrative markers and never enter the survey counts. Profile values stay in page memory.

Source: [Stack Overflow Developer Survey](https://survey.stackoverflow.co/) and the commit-pinned archive recorded in each app's `data/sources.json`. Database: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); individual contents: [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/). See each prototype's notices and `public/licenses` for dependency and font attribution.
