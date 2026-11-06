"""Create a locally appended M7 without modifying the original Google document."""
from pathlib import Path
from xml.sax.saxutils import escape
import json, hashlib
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
E=ROOT/'evidence';W,H=landscape(A4)
regular=Path('C:/Windows/Fonts/segoeui.ttf');bold=Path('C:/Windows/Fonts/segoeuib.ttf')
if regular.exists():
    pdfmetrics.registerFont(TTFont('Body',str(regular)));pdfmetrics.registerFont(TTFont('Strong',str(bold)))
else:
    # Portable PDF rebuild uses PDF's standard fonts when Segoe UI is unavailable.
    from reportlab.pdfbase.pdfmetrics import Font
    pdfmetrics.registerFont(Font('Body','Helvetica','WinAnsiEncoding'));pdfmetrics.registerFont(Font('Strong','Helvetica-Bold','WinAnsiEncoding'))
ink=HexColor('#242621');amber=HexColor('#9b5c1d');muted=HexColor('#61665b');paper=HexColor('#f4f2eb')
appendix=OUT/'Where-Do-We-Stand-A-M7.pdf'
c=canvas.Canvas(str(appendix),pagesize=(W,H));c.setTitle('Where Do We Stand? - A version, Milestone 7');c.setAuthor('Current milestone human contributors pending confirmation')
page=0
def para(text,x,y,w,size=11,color=ink,bold=False):
    style=ParagraphStyle('p',fontName='Strong' if bold else 'Body',fontSize=size,leading=size*1.36,textColor=color,spaceAfter=0)
    text=text.replace('\u2013','-').replace('\u2014','-').replace('\u2011','-')
    p=Paragraph(text,style);_,h=p.wrap(w,1000)
    assert y-h>=43,f'Text exceeds page: {text[:75]}'
    p.drawOn(c,x,y-h);return y-h
def begin(title,tag='MILESTONE 7 / PROTOTYPE A'):
    global page
    page+=1;c.setFillColor(paper);c.rect(0,0,W,H,fill=1,stroke=0)
    para(tag,42,H-26,W-84,9,amber,True);para(title,42,H-49,W-84,25,ink,True)
    c.setStrokeColor(HexColor('#b8bcaf'));c.setLineWidth(.6);c.line(42,37,W-42,37)
    c.setFont('Body',8);c.setFillColor(muted);c.drawString(42,23,'Where Do We Stand? / Local implementation / 05 Nov 2026');c.drawRightString(W-42,23,f'M7 / {page:02d}')
def shot(name,x,y,w,maxh):
    path=E/name;im=ImageReader(str(path));iw,ih=im.getSize();scale=min(w/iw,maxh/ih);dw,dh=iw*scale,ih*scale
    c.drawImage(im,x+(w-dw)/2,y-dh,width=dw,height=dh);return y-dh
def image_page(title,name,caption):
    begin(title);bottom=shot(name,42,H-98,W-84,382);para(caption,42,min(bottom-12,100),W-84,10);c.showPage()
def block(title,text,x,y,w):
    y=para(title,x,y,w,15,ink,True)-9;y=para(text,x,y,w,11)-21;return y

begin('One guide. A whole population. Your next question.')
para('A complete local prototype for students, early-career developers and career switchers. Alex is fictional; all 65,437 people in the map are real anonymous survey responses.',42,H-95,W-84,12)
shot('01-opening.jpg',42,H-143,W-84,303)
para('Implemented: four D3 chart groups, a continuous person-to-population reveal, five layouts, full record access, filtering, and a three-step YOU flow. Human contributors for this milestone remain pending user confirmation.',42,107,W-84,11)
c.showPage()

begin('A story that earns its population reveal','STORYBOARD / OBSERVED BROWSER STATES')
for x,y,name,label in [(42,490,'02-alex-aha.jpg','Aha: Alex carries the same silhouette and amber identity.'),(438,490,'03-pulling-back.jpg','Pull back: the camera exposes nearby real responses.'),(42,285,'04-all-respondents.jpg','Overview: 65,437 stable IDs; Alex is an extra marker.'),(438,285,'05-role-groups.jpg','Regroup: the same IDs travel into named role regions.')]:
    b=shot(name,x,y,362,169);para(label,x,b-7,362,9)
para('Before this transition: Setting > Peers > Pay > Languages > AI. After role and experience regrouping: free exploration > Find your place > Your plan. Reverse scrolling restores earlier story stages; manual exploration has explicit ownership until Replay.',42,78,W-84,10)
c.showPage()

image_page('Every figure has an identity','17-final-overview.jpg',
 'Map encoding: one mark = one 2024 response, ordered by source ID inside deterministic D3 treemap regions. At far zoom a thin mark preserves every record; near zoom reveals a human silhouette. Group labels show n and share of the filtered sample. Other reported roles is an explicit merge; Unknown is missing data.')

image_page('Details remain attached to the same record','07-record-detail.jpg',
 'Click a figure or search the complete 20-record-per-page index. Details use original responses without invented names or biographies. The selected record survives grouping and zoom. The side panel explains its group, supports matching-role/experience highlighting, and closes without resetting the view. Narrow screens use a bottom panel.')

image_page('Sketch 5 / Peers, within each reported role','chart-peers.jpg',
 'IMPLEMENTED - D3 heatmap. 2024 main role is single-select. Full-stack is 18,260 / 65,437 = 27.9% overall; 6,807 / 17,431 = 39.1% have 0-5 years within full-stack respondents with known professional coding experience. These denominators differ. Hover/focus explains counts and missingness; selecting a cell opens its real cohort.')

image_page('Sketch 8 / A median and the spread around it','chart-pay.jpg',
 'IMPLEMENTED - D3 median + interquartile interval. Default: USA, 2024, annual total compensation in USD. 4,663 positive finite pay answers with known experience, from 11,095 country respondents. Under 1 year: median $65,000, IQR $50,000-$90,000, n=85. No upper trimming; n<20 is suppressed. IQR is not a confidence interval or Alex\'s future salary.')

image_page('Sketch 3 / Use and next-year interest','chart-skills.jpg',
 'IMPLEMENTED - D3 dumbbell chart with language search, sort and early-career filter. Both endpoints use the same 55,752 respondents answering both language questions. Each token is counted once per person; multiple choices need not sum to 100%. Desired use includes continuing an existing tool and is not a measure of hiring demand.')

image_page('Sketch 9 / More use, less positive trust','chart-ai.jpg',
 'IMPLEMENTED - D3 trend across independent samples. Use: 39,042/87,973 (2023), 37,662/60,907 (2024), 26,469/33,720 (2025). Positive trust among current users answering trust: 18,734/38,888, 16,055/37,302, 10,280/26,126. 2023 trust is AIBen; AIAcc there means benefits. 2024/2025 trust is AIAcc. 2025 Yes frequencies are harmonized only for use.')

image_page('Sketch 9 / Look inside the 2025 answers','chart-ai-composition.jpg',
 'IMPLEMENTED - D3 trust composition by AI-use frequency. Each usage group includes all its respondents, including missing trust. Unknown use is retained as its own group. Exact segment counts and denominators are available on focus/hover and in the table. This is a 2025 sample of 49,191 people, separate from the 2024 crowd.')

image_page('YOU is a placement rule, not a prediction','09-you-in-crowd.jpg',
 'Current role + professional coding experience + education, with optional country and one used language. Every filled condition must match; the future goal is not a condition. Student + under 1 year + Bachelor\'s gives 257 exact matches. YOU sits beside the first matching source ID, without changing n. Zero matches keep a labeled margin marker. Edit, back, reset and Locate remain available.')

begin('Data lineage and interaction ownership','IMPLEMENTATION / REPRODUCIBILITY')
y=H-104
y=block('Official files, not chart estimates','Official survey index > commit-pinned StackExchange/Survey archive > raw CSV/schema/questionnaire > standard-library Python cleaning > lossless records + aggregates + dictionary + manifest > D3 JSON loading and rendering. SHA-256 checks cover all inputs and data artifacts.',42,y,356)
y=block('A justified year change','2025 lacks YearsCodePro. WorkExp is general professional work and does not substitute for professional coding experience. Main people, peers, compensation and languages use 2024. Only the AI trend crosses years. Frequency composition uses 2025. No annual record is animated as the same person across years.',42,y,356)
block('Cleaning preserves people','65,437 raw rows = 65,437 retained unique IDs. Missing experience: 13,827; role: 5,992; education: 4,653; pay: 42,002. Missing pay does not remove a person. Raw education text is retained despite source encoding artifacts; category labels are normalized.',42,y,356)
y=H-104
y=block('Story > Explore > Profile','Scroll drives only Story. Any manual grouping, filter, zoom or selection takes Explore ownership. Replay clears filters and returns to the guided start. Profile is a native dialog; completion returns to Explore and continuously locates YOU. Reduced motion uses immediate settled layouts.',444,y,356)
y=block('Interruption and access','New layouts start from current interpolated coordinates, using stable IDs. One quadtree supports picking after settling. Selected IDs and YOU anchors survive regrouping. All records remain in the searchable list; group layout never changes the sample. Filtering changes both visible records and denominators.',444,y,356)
block('Technology used for a reason','Vite + strict TypeScript + D3. SVG for five charts in four groups; Canvas for 65,437 units. D3 supplies loading, scales, axes, SVG rendering, treemap regions, easing, zoom and indexing. The design uses native controls, visible focus, keyboard tooltips and data tables. Inputs stay in tab memory.',444,y,356)
c.showPage()

begin('Verification is part of the prototype','VALIDATION / ACTUAL LOCAL EVIDENCE')
y=H-104
y=block('Data and code checks','Four Node tests pass, covering every full layout, bounds, determinism, matching and statistical fixtures. Independent Python validation passes 22 checks: source/artifact hashes, all 65,437 source-to-detail mappings, category totals, 35 compensation summaries, paired languages and all AI denominators. TypeScript and production build pass.',42,y,480)
y=block('Browser behaviors exercised','Edge 156: desktop, 390x844 and 360x640 emulation; forward/reverse/fast story scrolling; interrupted grouping; direct point selection; detail persistence and close; filters/zero results; YOU match/edit/reset/zero; keyboard; reduced motion; data-load failure and successful retry. Selected 2024-102 and direct pick 2024-26623 retained their identities.',42,y,480)
y=block('Measured cost and practical limits','Intel Core i7-14650HX, desktop about 1592x820 CSS px, DPR 2. Local ready time about 1.3-2.6 s. Final 20 complete-sample draw timings: median 30.2 ms, maximum 63.1 ms. No 60 fps guarantee. Draw timing is not total input/compositing latency. Physical touch devices, screen-reader software and non-Chromium browsers were not tested.',42,y,480)
para('Evidence: browser-validation.json, data-validation.json, unit-tests.txt, VALIDATION.md and captured screenshots. Final package checks are recorded in delivery-validation.json; PDF preservation/render checks are in pdf-validation.json.',42,y,480,10,muted)
shot('12-mobile-map.jpg',560,H-104,240,414);c.showPage()

begin('Reference learning, course fit and remaining decisions','DELIVERY / RESPONSIBILITY BOUNDARY')
y=H-104
y=block('References were actually inspected','The complete online Process Book text/tables, four chosen sketches, M6 storyboard and teacher requirement image were read/viewed. Both live references were inspected: RhineLabUI opening/archive/detail/return, and The Pudding\'s Henry-to-population reveal, marital-status/gender/income regrouping, person detail and exploration controls.',42,y,356)
y=block('Applied design choices','RhineLabUI informed warm gray, fine rules, generous spacing, restrained amber and hierarchy. The Pudding informed identity-preserving motion and the transition to free exploration. Its longitudinal identity assumptions do not apply to these independent annual survey samples. No reference code, media or branding is bundled.',42,y,356)
block('Skills used in authoring','agents-mainline, Sites local/presentation workflow, Google Drive/Docs, computer-use and PDF skills were applied. Approved frontend-design was installed from anthropics/skills at ca45fc496a3436251f191354091d557da31c15b5, read and registered in the external brain. Other candidate skills were evaluated without unauthorized installation.',42,y,356)
y=H-104
y=block('Course requirement mapping','Functional D3: all four selected chart groups complete. Real acquisition/cleaning pipeline: complete. Novel linked population exploration: complete. Previous milestones: all original 28 pages retained before this appendix. Local source, data, evidence and PDF are packaged; PDF is also separate.',444,y,356)
y=block('A disclosed literal gap','The teacher asks for 2-3 not-yet-implemented design sketches. This A scope deliberately implements all four selected groups, so these pages cannot honestly be labeled unimplemented designs. No teacher exemption is claimed. That literal requirement remains a submission decision; no extra unapproved version is substituted.',444,y,356)
block('Before course submission','Human contributors for this milestone must be confirmed by the user. Original team authorship is preserved, not reassigned. This work only produced local artifacts: no online Process Book write-back, course upload, deployment, remote PR or CI is claimed.',444,y,356)
c.showPage()

begin('Sources and local deliverables','REFERENCES / LICENSE / REBUILD')
y=H-104
refs=[
 ('Original Process Book','https://docs.google.com/document/d/1OurDQy_H5T7FQDVvEVlX9px6ZpiuPQ6LyLowf9AXWDY/edit?tab=t.0','Full 28-page PDF export retained; existing milestones and images preserved.'),
 ('Official survey index','https://survey.stackoverflow.co/','2023, 2024 and 2025 public developer survey data, schema and questionnaires.'),
 ('Pinned source archive','https://github.com/StackExchange/Survey/tree/9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7/packages/archive','Exact retrieval URLs, dates and SHA-256 values are in the included source manifest.'),
 ('RhineLabUI','https://github.com/LBEILC/RhineLabUI','DESIGN.md and the live demonstration: https://rhine.lubeiluchen.cc/'),
 ('The Pudding - A love story','https://pudding.cool/2026/06/love-story/','Observed live; grouping/identity implementation also inspected in github.com/the-pudding/love-story.'),
 ('Open Database License 1.0','https://opendatacommons.org/licenses/odbl/1-0/','Database attribution: Stack Overflow. Individual contents: https://opendatacommons.org/licenses/dbcl/1-0/ .')]
for title,url,note in refs:
    y=para(f'<link href="{escape(url)}" color="#9b5c1d">{escape(title)}</link>',42,y,W-84,12,bold=True)-3
    y=para(escape(note),42,y,W-84,10)-14
para('Local deliverables: README and reproducible scripts; source and processed data; browser/data/test evidence; this M7 PDF; complete original + M7 PDF; clean ZIP. Run npm ci, npm run dev. Rebuild data with python scripts/download_data.py then python scripts/build_data.py. See README for verification and PDF rebuild instructions.',42,y,W-84,11)
c.showPage();c.save()

original=ROOT/'research/process-book-original.pdf'
merged=OUT/'Where-Do-We-Stand-Process-Book-with-A-M7.pdf'
writer=PdfWriter();writer.append(str(original));writer.append(str(appendix));writer.add_metadata({'/Title':'Where Do We Stand? - Complete Process Book + Prototype A M7'})
with merged.open('wb') as f:writer.write(f)
old=PdfReader(original);new=PdfReader(merged);extra=PdfReader(appendix)
assert len(new.pages)==len(old.pages)+len(extra.pages)
for i,p in enumerate(old.pages):
    assert p.extract_text()==new.pages[i].extract_text(),f'Original page {i+1} text changed'
    assert list(p.mediabox)==list(new.pages[i].mediabox)
    assert p.get_contents().get_data()==new.pages[i].get_contents().get_data()
report={'original_pages':len(old.pages),'m7_pages':len(extra.pages),'total_pages':len(new.pages),'original_text_content_streams_and_page_sizes':'identical','render_inspection':'pending','files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [original,appendix,merged]}}
(E/'pdf-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
