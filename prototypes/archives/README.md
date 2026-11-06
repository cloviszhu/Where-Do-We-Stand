# Where Do We Stand? — B / Endfield complete site

## Current: discrete story scenes and people — 6 November 2026

The independent homepage now leads to seven viewport-based scenes under six chapter tabs. Scroll to advance one scene, or use tabs, previous/next and keyboard. AI trend and composition are separate (`#/story/ai-trust` is the additional scene). Tables open in dialogs; languages are paginated. Small/short windows retain readable internal scrolling.

The archive uses grey human figures with yellow interaction emphasis. Overview figures represent up to 50 responses; open a group/figure to see an individual queue and access every response through its range selector. Alex and YOU use the same figure, with names and non-overlapping leaders in reserved space, and remain excluded from all counts. Both themes have stronger continuous contours, with no motion controls.

Current verification: `output/scene-review/verification.md` — 17 tests, final production build, 49 story layout combinations, people/callout checks and production browser checks. Recovery files are in `output/scene-review/baseline/`. The PDFs and ZIPs described below are historical; they have not been regenerated for this revision.

## Previous complete-site and motion delivery

Current local implementation: 6 November 2026. A separate homepage leads into six story chapters, the complete 2024 archive, a two-step YOU profile and data notes.

## Latest motion revision — 6 November 2026

Navigation now keeps the frame and Alex rail stationary, with transitions confined to changing content. Added continuous selection indicators, chart reveals and sorting, archive label/marker movement, and richer control feedback. The background is a live D3 contour field rendered on Canvas. All effects default on with no in-page motion options; OS reduced motion is automatic.

Current evidence: `output/motion-review/verification.md`, tests/build, 40 responsive checks and screenshots. The previous `output/full-review/` PDFs, screenshots and ZIP preserve the earlier complete-site snapshot. Current source/build is newer; data and statistical definitions are unchanged.

Package this revision with `python scripts/package_full_delivery.py --motion`; output is `output/motion-review/Where-Do-We-Stand-B-Endfield-Motion.zip`.

## Run

Node.js 20.19+ or 22.12+. From this directory:

```sh
npm ci
npm run dev
```

Development: http://127.0.0.1:5174/ (strict port). Reuse a running instance. Production: `npm run build`, then `npm run preview` at http://127.0.0.1:4174/. Serve over HTTP; file:// does not load modules/data.

```sh
npm test
npm run build
```

Locked stack: Vite 6.4.5, TypeScript 5.9.3 and D3 7.9.0. Source/CSS imports are inside this package; no sibling shared directory required.

## Experience

- `#/`: independent cover, Start with Alex, Explore the survey and chapter index.
- `#/story/intro|peers|pay|technology|ai|reflection`: six chapters, fictional Alex reference, four chart groups/five SVGs, accessible tables, previous/next and browser history.
- `#/explore`: all 65,437 real 2024 replies. Everyone / Role / Experience / Education / AI use; independent filters; details through canvas or Browse units.
- `#/you`: current role and optional professional coding years, education, country, programming language, AI use and desired role. Review before placing; edit, locate, clear and transparent matching.
- `#/method`: sample definitions, missingness, denominators and profile boundaries.

Each unit holds at most 50 actual records within its category. Everyone has 1,309 units, ending with 37 people; Role has 1,313. Regrouping repacks units but preserves individual IDs. Missing fields stay missing. Alex and YOU are extra illustrative markers, excluded from counts. Markers follow grouping and respect filters.

YOU matching uses current role and chosen experience band, plus specified education/country/language/AI. Unspecified optional fields impose no condition. Desired role is excluded. Explicit “Role & experience only” removes optional conditions. Inputs remain in page memory, clear on refresh and are not persisted/transmitted.

Light/dark Endfield: yellow accent, neutral paper, standard cuts, contours, standard density and short mechanical motion. No sidebar or looping decoration. System reduced motion settles animations. Narrow charts scroll inside their regions.

## Data

Official [Stack Overflow Developer Survey](https://survey.stackoverflow.co/) releases from the [StackExchange/Survey mirror](https://github.com/StackExchange/Survey/tree/9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7), pinned commit `9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7`. `data/sources.json` retains URLs/dates/SHA-256, `public/data/manifest.json` definitions and exclusions, `field-dictionary.json` questions/mappings. Questionnaires are retained in `research/`.

| View | Sample / denominator |
| --- | --- |
| Archive | All 65,437 replies in 2024; professional coding uses YearsCodePro. |
| Peers | 2024 valid professional coding years within each primary role. Missing years excluded from chart only. Every cell opens the exact cohort. |
| Pay | US 2024, positive finite annual USD and valid professional coding years: 4,663 included, 6,432 excluded, no upper cap. Median/inclusive Q1/Q3; n<10 or partial statistics suppressed. IQR is not a confidence interval. |
| Languages | 2025, both multi-select language questions answered: shared n=27,079. No hiring-demand claim. |
| AI trend | Independent 2023/24/25 samples. Use / valid adoption; positive trust / current users answering trust. 2023 trust is AIBen; 2024/25 AIAcc. |
| AI composition | Valid trust within each 2025 use-frequency group, not frequency prevalence. Missing trust: 221/57/65/43/74. |

2025 has no YearsCodePro; WorkExp is different and not substituted. These anonymous, self-selected, self-reported samples do not predict individual pay or hiring probability. Explorer filters do not change chart samples. Context is adjacent to each chart and available without hover; long pages require scrolling.

Python 3.10+, standard library only. Rebuilding raw inputs downloads about 459 MB and verifies Git LFS hashes. Raw files are omitted from ZIP.

```sh
python scripts/download_data.py
python scripts/build_data.py
python scripts/validate_data.py --output output/full-review/data-validation.json
```

## Source map

| File | Responsibility |
| --- | --- |
| `src/site.ts`, `src/site.css` | Current shell, routes, story, form, design |
| `src/model.ts` | Normalization, filters/matching, pay policy |
| `src/explorer.ts` | Archive controls, layout and markers |
| `src/site-charts.ts` | Current D3 views |
| `src/site-packets.ts`, `site-field.ts`, `site-inspector.ts` | B-local grouping, canvas, accessible detail dialog |
| `src/data.ts`, `public/data/` | Retained loader/data |
| `tests/site-model.test.ts` | Real-data grouping/cohort, matching/suppression checks |
| `index.v1.html`, old main/home/charts | Historical implementations; not current entry |

## Evidence and delivery

Current evidence is `output/full-review/`: B tests 14/14, production build, raw-source validation 4,229/4,229, 40 route/viewport checks (390/768/1024/1440), retry/empty states, screenshots, initial-plan EGM review and owner remediation. Shared baseline tests passed 3/3 with no shared edits. Browser tests use desktop emulation; no physical-phone, screen-reader or measured 60 fps claim.

`pdf/M7-Endfield-B-Full-Site.pdf`: current Milestone 7 appendix, 10 pages. `pdf/Process-Book-Complete-Endfield-B.pdf`: all 28 original pages plus update, 38 pages. PDF regeneration requires reportlab/pypdf; screenshots are inputs.

```sh
python scripts/build_full_process_book.py
python scripts/package_full_delivery.py
```

Current ZIP: `output/full-review/Where-Do-We-Stand-B-Endfield-Complete.zip`. Contains source, processed data, build, current evidence/PDFs and Spec snapshot. Original workspace retains historical reports/PDFs/ZIPs; legacy generation scripts target old outputs and should not be used for current delivery.

Single Feature Spec in workspace: `../../docs/prototype-plans/02-档案群体原型.md`; in ZIP: `delivery-plan/02-档案群体原型.md`. Recovery mapping: `output/full-review/change-manifest.json`; baseline backups preserve changed pre-existing files. Restore entry then rebuild. No Git repository, remote CI, deployment, cloud writeback or course upload is claimed.

Actual contributors remain pending confirmation. All four selected chart groups are implemented; the teacher's literal request for 2–3 additional unimplemented drafts is a separate requirement, not an inferred exemption. See packaged `delivery-plan/references/teacher-requirements.md` (workspace: `../../docs/prototype-plans/references/teacher-requirements.md`).
