# Where Do We Stand? - A / Retro-Futurism

A complete local, English-language data story in the reviewed purple/pink/cyan Retro-Futurism direction. Meet fictional student Alex, then explore **all 65,437 anonymous 2024 survey responses** in units of up to 50 records before continuing to peers, compensation, languages and AI. Add a separate YOU marker using transparent, exact matching. This complete version supersedes the homepage-only review, dated 6 November 2026.

## Run locally

Requirements: Node.js 22.12+ (Node 24 tested), npm, a modern browser. No API key, account or hosted service is needed.

```powershell
cd "path/to/extracted/Where-Do-We-Stand-A-Retro-Futurism"
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/`. Do not open `index.html` using `file://`: the site loads local JSON over HTTP.

```powershell
npm test
npm run build
npm run preview -- --port 4173
```

`npm ci` needs internet for the first dependency installation. After installation the application and its included processed data run locally; external links are optional references. `Ctrl+C` stops either server. The build is static in `dist/`; this task did not deploy it.

## Walkthrough

1. Meet Alex, then enter the crowd. All four D3 chart groups follow the crowd: Peers, Pay, Skills and AI. Hover or focus marks for exact numbers; every chart has a text table.
2. After Meet Alex, keep scrolling: Alex shrinks, the complete sample appears, then records regroup by role and experience. Scroll backward or use Replay story. Each classification repacks units within categories; the respondent IDs remain unchanged.
3. Choose Explore freely. Grouping changes positions; filtering changes the sample. Manual interaction holds control until Replay story.
4. Select a unit or use Browse units to choose a category, unit and actual member. Overview has 1,309 units; the final unit has 37 records, ending at 2024-65437. Alternatively, search Browse records by ID, role, country or language, with 20 per page. Close details to retain the viewpoint and selection.
5. Find your place collects current role, professional coding experience and education, plus optional country, a language and a future goal. Review conditions before adding YOU. All filled conditions match with AND; the future goal is only a note. Edit and reset are in Your plan below the map.

Keyboard: Tab through controls, Enter/Space to activate heatmap cells, Escape to close dialogs, arrow keys to pan the focused map, `+`/`-` to zoom, Home to fit all. Ctrl+wheel zooms; ordinary scrolling advances the story. Touch users have zoom buttons, group targets and the record list. On narrow screens charts scroll horizontally inside their containers and retain data-table alternatives. Full entry, camera and crowd transitions are enabled by default; there is no motion selector. System reduced-motion preferences remain supported for accessibility.

## Data and reproducibility

The processed files in `public/data/` are sufficient to run the site. Original CSVs (about 459 MB total), questionnaires and schemas are omitted from the ZIP and can be fetched from the official commit-pinned archive with Python 3.10+:

```powershell
python scripts/download_data.py
python scripts/build_data.py
python scripts/validate_data.py
```

The pipeline uses Python's standard library. On Windows, use a real Python installation, not an unconfigured Windows Store alias. The scripts resolve paths relative to themselves and do not require the author's computer paths.

- Official source: [Stack Overflow Developer Survey](https://survey.stackoverflow.co/), [StackExchange/Survey archive](https://github.com/StackExchange/Survey/tree/9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7/packages/archive).
- Version: `9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7`; retrieval timestamps, URLs, sizes and SHA-256 hashes are in `data/sources.json` and the public manifest. The downloader resolves Git LFS and checks pinned hashes, including cached files.
- `people.json`: losslessly dictionary-encoded 2024 records, stable ID `2024-ResponseId`; no sampling and no exclusions. Fields used by detail views are retained, including raw answers.
- `charts.json`: heatmap, country/experience compensation, paired language counts, AI trend and frequency composition.
- `dictionary.json`: original schema question wording, field mappings and grouping rules.
- `manifest.json`: missingness, denominators, exclusions, source files and artifact checksums.

**Year decision:** 2025 has no `YearsCodePro`. Its `WorkExp` describes general professional work and is not substituted for professional coding experience. Main people, peers, pay and languages therefore use 2024. AI trends use independent 2023-2025 samples; frequency composition is 2025 only.

**Statistics:** heatmap percentages are within each original role among known professional coding experience. Pay shows median and IQR of positive finite converted annual USD compensation in a chosen country, with no upper trimming; cells with n < 20 are suppressed. Language endpoints share 55,752 respondents answering both questions; multi-select percentages do not sum to 100. AI use is among answered use questions; positive trust is among current users answering accuracy trust. Trust uses `AIBen` in 2023 and `AIAcc` in 2024/2025. Unknown usage and trust remain in the 2025 composition chart.

Alex and YOU are extra markers, never survey records. Role grouping uses the single-select 2024 main-job field; smaller reported roles are combined explicitly, while original roles remain available. Missing answers are Unknown. Source encoding artifacts in education wording remain in raw details; display categories are normalized.

## Implementation

Vite + TypeScript + D3 7.9.2. D3 loads JSON, renders SVG charts and axes, and supplies zoom transforms, easing and the spatial index. Canvas draws deterministic category clusters of units. Each unit contains at most 50 real responses from its current category; unit counts can change across grouping while the response total stays constant. No image, audio or source code from the visual references was copied. Fonts are self-hosted and licensed under `public/licenses/`.

- `src/data.ts`: decoding, matching, shared statistics.
- `src/unit-layout.ts`: current-category packets, cluster placement and source-ID lookup.
- `src/unit-transition.ts`: member-ID continuity, staggered position/size/color interpolation and interruption.
- `src/unit-crowd.ts`: drawing, picking, camera, zoom and stable respondent anchors.
- `src/units/`: independent A packet, hero field and record-inspector implementation; no shared/B dependency.
- `src/charts.ts`: four D3 chart groups, tooltips and tables.
- `src/home.ts`: current entry, story/explore ownership, details, filters and profile flow.
- `src/hero.ts`, `src/home.css`, `src/story.css`: reviewed hero and complete responsive design.
- `src/main.ts`, `crowd.ts`, `layout.ts`, `style.css`: retained earlier implementation, not the current entry.

The hero enters with a staggered crowd reveal. Every classification transition follows real member IDs back to their previously drawn positions, including after repacking or interruption. Category colors remain stable under filtering and blend during transitions. The crowd stops drawing after the transition reaches its exact destination. Source IDs, selection and the YOU anchor survive regrouping. Alex (white) and YOU (gold) use the same body size as ordinary units, without boxes. Dashed leaders connect their names to stable positions on the left rim of their cohort. YOU’s cohort is determined by the first exact matching source ID; if no displayed match exists, its labeled marker stays in the margin. This is a placement rule, not a similarity score or career forecast. Profile input stays in tab memory; it is not stored or sent to a server. Explicit public-data filters are reflected in the URL.

## Validation and limitations

Current chapter/guide evidence is in `evidence/chapter-markers/VALIDATION.md`: 12 Node tests, production build and 9 actual headless Edge browser checks pass, including real animation frames. Native chapter snapping and gesture boundary protection let long charts settle at their unread edge. The earlier PDF/ZIP have not been refreshed for this UI iteration. Prior full-delivery evidence is in `evidence/retro-full/`; older root-level evidence belongs to the previous A design. The previous correction ran ten Node tests, including all 20 distinct classification transitions, interruption, category colors and section order. Current correction evidence is in `evidence/retro-full/regression/`. The previous seven-test run did not cover the reported visual regressions and is not evidence that they were correct. Independent Python validation verifies all 65,437 source-to-detail mappings, hashes and aggregate calculations (22 checks). Real Edge checks cover desktop, 390x844 and 768x1024 emulation, keyboard, reduced motion, grouping, filters, unit details, YOU, empty states and intentional data-load failure/recovery. The portable archive is extracted and checked with a clean `npm ci`, tests and production build.

The current sampled draw timings are saved with browser diagnostics; they are not a stable 60 fps claim or total input/compositing latency. Low-power and physical touch devices, screen-reader software and non-Chromium browsers were not tested. Units aggregate records visually; use their member list or the searchable full record list to inspect individuals.

Self-selected survey answers are descriptive and unweighted, not a census, job-opening measure or individual outcome prediction. Annual survey samples are different people.

## Process Book and course boundary

`output/pdf/Where-Do-We-Stand-A-Retro-Futurism-Process-Book.pdf` preserves the complete 28-page original export and appends the complete Retro-Futurism M7 appendix. The appendix is also available separately. `scripts/build_retro_process_book.py` creates both from current screenshots and the original PDF using `reportlab` and `pypdf` (see `requirements-docs.txt`). The included source export is retained for rebuilding.

```powershell
python -m pip install -r requirements-docs.txt
python scripts/build_retro_process_book.py
```

Re-render and inspect the PDFs after changes; rebuild the ZIP with `python scripts/package_retro_delivery.py`.

All four selected chart groups are implemented. The teacher's literal request for **2-3 not-yet-implemented design sketches** is therefore not satisfied by relabeling these implemented views; this discrepancy is disclosed in M7. No exemption is claimed. The current milestone's human contributor names remain for the user to confirm before submission. No online Process Book edits, course upload, PR, CI run or deployment occurred.

The authoritative project Feature Spec remains `docs/prototype-plans/01-人物群体原型.md` in the parent project. The archive's documentation copy is a delivery snapshot, not a second live requirements source.

## Attribution

Data: Stack Overflow, database under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), individual contents under [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/). Derived JSON data carries the same database attribution and license notice. See `THIRD_PARTY_NOTICES.md`.

Visual direction: user-reviewed Retro-Futurism (Orbitron, night purple, pink/cyan, striped sun and perspective field). Historical A research includes [RhineLabUI](https://github.com/LBEILC/RhineLabUI); its warm-gray styling is superseded here. [The Pudding - A love story](https://pudding.cool/2026/06/love-story/) informed person-to-population storytelling and the handoff to exploration. Our annual samples do not support that reference's longitudinal-person interpretation.
