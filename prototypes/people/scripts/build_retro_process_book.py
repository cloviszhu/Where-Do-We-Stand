"""Append the complete Retro-Futurism M7 to the unchanged original Process Book."""
from pathlib import Path
from xml.sax.saxutils import escape
import hashlib, json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf'; OUT.mkdir(parents=True,exist_ok=True)
E=ROOT/'evidence/retro-full'
SHOTS=E/'regression'
W,H=landscape(A4)
APPENDIX=OUT/'Where-Do-We-Stand-A-Retro-Futurism-M7.pdf'
FULL=OUT/'Where-Do-We-Stand-A-Retro-Futurism-Process-Book.pdf'
c=canvas.Canvas(str(APPENDIX),pagesize=(W,H))
c.setTitle('Where Do We Stand? / Retro-Futurism A / Milestone 7')
c.setAuthor('Current milestone human contributors pending confirmation')
ink=HexColor('#211833'); muted=HexColor('#635773'); accent=HexColor('#a32460'); paper=HexColor('#faf7fc')
page=0

def para(text,x,y,w,size=11,bold=False,color=ink):
    for ch in ['\u2013','\u2014','\u2011']: text=text.replace(ch,'-')
    p=Paragraph(text,ParagraphStyle('text',fontName='Helvetica-Bold' if bold else 'Helvetica',fontSize=size,leading=size*1.4,textColor=color))
    _,h=p.wrap(w,1000)
    assert y-h>=44, f'Page {page} overflow: {text[:90]}'
    p.drawOn(c,x,y-h)
    return y-h

def begin(title,tag='M7 / RETRO-FUTURISM A'):
    global page
    page+=1; c.setFillColor(paper); c.rect(0,0,W,H,fill=1,stroke=0)
    para(tag,40,H-25,W-80,9,True,accent)
    para(title,40,H-49,W-80,24,True)
    c.setStrokeColor(HexColor('#d2c5dc')); c.line(40,37,W-40,37)
    c.setFillColor(muted);c.setFont('Helvetica',8)
    c.drawString(40,23,'Where Do We Stand? / Complete local A prototype / 06 Nov 2026')
    c.drawRightString(W-40,23,f'M7 / {page:02d}')

def shot(name,x,y,w,h):
    im=ImageReader(str(SHOTS/name));iw,ih=im.getSize();s=min(w/iw,h/ih)
    c.drawImage(im,x+(w-iw*s)/2,y-ih*s,width=iw*s,height=ih*s)
    return y-ih*s

def image_page(title,name,caption):
    begin(title);bottom=shot(name,40,H-96,W-80,350)
    para(caption,40,min(bottom-12,132),W-80,11);c.showPage()

def block(title,text,x,y,w):
    y=para(title,x,y,w,14,True)-9
    return para(text,x,y,w,11)-22

image_page('One guide. A whole crowd. Your next question.','desktop-home.png',
    'Complete A version, extended from the reviewed Retro-Futurism homepage. The English story follows fictional student Alex into the real survey crowd and a personal YOU workflow, then continues through peers, pay, languages and AI. All 65,437 anonymous 2024 responses are retained; Alex and YOU never enter the counts.')

begin('A consistent visual identity, from story to exploration','DESIGN / STORYBOARD')
shot('desktop-alex.png',40,H-98,368,235)
shot('desktop-guided.png',434,H-98,368,235)
y=H-345
y=block('Sequence','Opening > Meet Alex > crowd reveal > role and experience regrouping > free exploration / YOU > Peers > Pay > Skills > AI > your next question.',40,y,368)
block('Identity and evidence','Alex keeps the pink silhouette and an explicit fictional label. YOU is cyan and follows a stable matching response. Stable category colors identify groups of actual records. A unit contains up to 50 replies within the current category; repacking changes units, not respondent IDs.',40,y,368)
y=H-345
y=block('Reviewed design carried through','Night purple, neon pink/cyan, an 1980s striped sun, perspective grid and restrained CRT texture. Orbitron supplies the display hierarchy; self-hosted IBM Plex fonts serve body text and metadata. No left sidebar.',434,y,368)
block('Motion and control','Full motion defaults on; no selector. Member IDs carry ordinary units through staggered position, size and color transitions. Replay restores guided scrolling. System reduced motion is respected. Mobile charts scroll and have tables.',434,y,368)
c.showPage()

image_page('The novel view / a complete, inspectable crowd','desktop-crowd.png',
    'IMPLEMENTED - Canvas units with D3 zoom, easing and spatial indexing. Overview has 1,309 units, including a final unit of 37; role grouping has 1,313. Every record belongs to exactly one current unit. Classification repacks within categories, keeping source IDs and the YOU anchor. Group labels show count and share of the displayed sample. Filtering changes the sample; grouping does not.')
image_page('Every response remains reachable','desktop-record.png',
    'Browse units opens category and unit selectors plus a complete member list. Overview unit 1,309 contains 37 actual replies, ending at 2024-65437. Details retain original role, experience, education, coding context, languages, wanted languages, AI use/trust and pay. A separate paginated record search also exposes all responses. Closing returns focus to the initiating control.')

begin('YOU / transparent conditions, honest zero matches','PERSONALIZATION / DESKTOP AND MOBILE')
shot('desktop-you.png',40,H-100,548,315)
shot('mobile-profile.png',612,H-100,190,390)
para('Three steps collect current status and background, optional country/language and a goal note, then review exact conditions. Filled conditions match with AND; a future goal is never a matching criterion. Student + under 1 professional year + Canada + JavaScript returns 15 exact matches.',40,170,548,11)
para('YOU sits beside the unit holding the first matching source ID (2024-736 in this example), without adding a response. Zero matches retain an explicit margin marker. Edit, Locate and Reset are available. Inputs remain in tab memory and are not submitted or persisted.',40,108,548,11)
c.showPage()

image_page('Peers / percentages need a denominator','desktop-peers.png',
    'IMPLEMENTED - D3 heatmap. Full-stack is 18,260 / 65,437 = 27.9% overall; within that role, 6,807 / 17,431 with known professional coding experience have 0-5 years (39.1%). Missing experience is excluded per row and disclosed. Hover/focus gives exact counts; Enter or click opens the underlying records. The first full-stack cell links to 637 responses.')
image_page('Pay / experience does not determine a salary','desktop-pay.png',
    'IMPLEMENTED - D3 median and interquartile interval by experience and country. Default United States: 4,663 positive finite pay answers with known experience, from 11,095 country respondents. Under 1 year: median $65,000, IQR $50,000-$90,000, n=85. No upper trimming; n below 20 is suppressed. IQR describes the middle 50%, not uncertainty in a forecast.')
image_page('Skills / what people use and want next','desktop-skills.png',
    'IMPLEMENTED - D3 dumbbell chart. Circles encode current use; squares encode next-year interest. Both endpoints use the same 55,752 respondents who answered both questions. Multiple choices do not sum to 100%. Search, sort and early-career cohort controls update the chart and table. Interest includes continuing a tool; it does not measure job openings.')
image_page('AI / use and positive trust take different paths','desktop-ai.png',
    'IMPLEMENTED - D3 trends and a second trust-composition chart. Current use rises from 44.4% (2023) to 61.8% (2024) to 78.5% (2025). Positive accuracy trust among current users who answered trust is 48.2%, 43.0%, 39.3%. The denominators differ. Annual samples contain different people; 2023 uses AIBen, 2024/2025 use AIAcc. The 2025 frequency composition retains missing trust as Unknown.')
begin('Real data, reproducible transformations','DATA PIPELINE / IMPLEMENTATION')
y=H-104
y=block('Source lineage','Official Stack Overflow survey index > commit-pinned StackExchange/Survey archive > raw CSV, schema and questionnaire > standard-library Python cleaning > losslessly dictionary-encoded records, aggregates, dictionary and manifest > D3 JSON loading and rendering. Source and output SHA-256 checks are included.',40,y,368)
y=block('Why the main story uses 2024','2025 lacks YearsCodePro. WorkExp is general professional work, not professional coding experience. Main people, peers, pay and languages therefore use 2024. Only AI trends span 2023-2025; usage-frequency composition is 2025 alone.',40,y,368)
block('People are not discarded for missing answers','All 65,437 rows and unique source IDs survive. Missing experience: 13,827; role: 5,992; education: 4,653; pay: 42,002. Missing answers become explicit Unknown categories. Raw education wording remains available despite source encoding artifacts.',40,y,368)
y=H-104
y=block('Local architecture','Vite + strict TypeScript + D3. home.ts coordinates story, filters, details and YOU; charts.ts renders five SVG charts in four groups; unit-layout.ts partitions and places records; unit-crowd.ts draws and navigates the map. src/units contains the independent A inspector and packet code.',434,y,368)
y=block('A is self-contained','The final source and processed data run without B, C or prototypes/shared. Existing historical files are retained in the workspace. No database, API key, account or hosted service is required. npm ci, npm test and npm run build use the lockfile.',434,y,368)
block('Matching and interpretation','Exact conditions are descriptive, not a similarity score, salary prediction or career assessment. Survey answers are self-selected and unweighted. Original reported roles remain accessible even when smaller roles share a display group.',434,y,368)
c.showPage()

begin('Verification tied to the complete version','VALIDATION / OBSERVED RESULTS')
y=H-104
y=block('Code and source data','Ten Node tests pass: ID accounting, layout bounds, matching/statistics, max-50 packets, stable YOU mapping, all 20 distinct classification transitions, interruption, category colors and section order. TypeScript and the production build pass. Independent Python validation passes 22 checks, including every source-to-detail mapping and chart denominators.',40,y,520)
y=block('Browser checks','Current Edge checks verify real intermediate frames for all five classifications, forward/reverse story motion, refresh/deep links, 637-record chart linking, the final 37-record unit, YOU filtering, empty-filter replay, modal focus and mobile/tablet layouts. The earlier seven-test review missed the reported visual regressions; it is superseded.',40,y,520)
y=block('Responsive access and fixes','390 x 844 and 768 x 1024 emulation have no document-width overflow after constraining the rotating ornament. The record inspector restores focus to Browse units. Mobile charts scroll inside their own containers and retain text tables. The compact YOU result stays above the map.',40,y,520)
para('Limits: Chromium emulation is not physical touch-device testing. Screen-reader software and non-Chromium browsers were not tested. Draw timings are diagnostic samples, not a 60 fps or total-latency guarantee. See evidence/retro-full for captures and final validation records.',40,y,520,10,color=muted)
shot('mobile-crowd.png',594,H-104,208,400);c.showPage()

begin('Delivery and course requirements','PROCESS BOOK / RESPONSIBILITY')
y=H-104
y=block('The previous milestones are preserved','This complete PDF keeps all 28 original Process Book pages before the new appendix. Their extracted text is checked for equality after merge. The current Google Doc revision was re-read and matched the local baseline. No online document was overwritten.',40,y,368)
y=block('Completed local scope','The reviewed A visual direction now spans the complete story, four functional D3 groups, novel crowd exploration, full data access and YOU. Source, processed data, evidence, PDF and reproducible scripts are packaged in one ZIP. Deployment and course submission are not part of this delivery.',40,y,368)
block('Reference use','The original sketches and M6 storyboard were viewed. The Pudding crowd scene and scroll color change were observed for story-to-exploration ideas. This version follows the user-selected Retro-Futurism direction, replacing the older warm-gray A styling. No reference assets or code are copied.',40,y,368)
y=H-104
y=block('A literal course gap remains disclosed','The teacher asks for 2-3 additional visualizations not implemented yet. The authorized full A scope implements all four selected groups. Implemented views are not mislabeled as unimplemented sketches, and no teacher waiver is claimed. The user should resolve this course-specific requirement before submission.',434,y,368)
y=block('Current contributors need confirmation','The original authorship stays unchanged. The existing team list does not establish who actively worked on this milestone. Human contributors for this specific prototype remain pending user confirmation, as previously requested.',434,y,368)
block('What was not claimed','No hosted deployment, remote CI, repository push, online Process Book edit or course upload. Local browser, code and data checks are reported separately. The Feature Spec and A handoff identify the latest artifacts and distinguish them from historical homepage evidence.',434,y,368)
c.showPage()

begin('Sources, licenses and rebuilding','REFERENCES / DELIVERY GUIDE')
refs=[
 ('Original Process Book','https://docs.google.com/document/d/1OurDQy_H5T7FQDVvEVlX9px6ZpiuPQ6LyLowf9AXWDY/edit?tab=t.0','Complete original export retained under research; current M7 is a separate local appendix.'),
 ('Stack Overflow Developer Survey','https://survey.stackoverflow.co/','Official annual survey data and questionnaires for 2023, 2024 and 2025.'),
 ('Pinned source archive','https://github.com/StackExchange/Survey/tree/9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7/packages/archive','Exact URLs, SHA-256 values and retrieval timestamps: data/sources.json and public/data/manifest.json.'),
 ('The Pudding - A love story','https://pudding.cool/2026/06/love-story/','Story-to-population interaction reference; these annual survey samples do not provide longitudinal identities.'),
 ('ODbL 1.0','https://opendatacommons.org/licenses/odbl/1-0/','Database: Stack Overflow. Individual contents: DbCL 1.0. See THIRD_PARTY_NOTICES.md and bundled font licenses.')]
y=H-104
for title,url,note in refs:
    y=para(f'<link href="{escape(url)}" color="#a32460">{escape(title)}</link>',40,y,W-80,12,True)-5
    y=para(escape(note),40,y,W-80,10)-17
para('Run: npm ci; npm run dev. Verify: npm test; npm run build. Rebuild source data: python scripts/download_data.py; python scripts/build_data.py; python scripts/validate_data.py. Rebuild this appendix and the merged book: install requirements-docs.txt, then python scripts/build_retro_process_book.py. Package: python scripts/package_retro_delivery.py.',40,y,W-80,11)
c.showPage();c.save()

original=ROOT/'research/process-book-original.pdf'
r=PdfReader(original);a=PdfReader(APPENDIX);writer=PdfWriter()
writer.append(r);writer.append(a)
with FULL.open('wb') as f:writer.write(f)
merged=PdfReader(FULL)
assert len(r.pages)==28
assert all(x.extract_text()==merged.pages[i].extract_text() for i,x in enumerate(r.pages))
report={'original_pages':len(r.pages),'appendix_pages':len(a.pages),'complete_pages':len(merged.pages),'original_text_preserved':True,'original_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'outputs':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [APPENDIX,FULL]},'visual_review':'Render and inspect before delivery; see final validation note.'}
(E/'pdf-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
