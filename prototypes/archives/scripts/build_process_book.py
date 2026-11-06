"""Create the M7 appendix; preserve every original Process Book page.
Requires reportlab and pypdf. Run from any directory. No cloud writes.
"""
from pathlib import Path
from hashlib import sha256
import json
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
SHOTS = ROOT / 'output/screenshots'
REG, BOLD = 'Helvetica', 'Helvetica-Bold'
if Path('C:/Windows/Fonts/segoeui.ttf').exists():
    pdfmetrics.registerFont(TTFont('PlexFallback', 'C:/Windows/Fonts/segoeui.ttf'))
    pdfmetrics.registerFont(TTFont('PlexFallbackBold', 'C:/Windows/Fonts/segoeuib.ttf'))
    REG, BOLD = 'PlexFallback', 'PlexFallbackBold'
pdfmetrics.registerFontFamily(REG, normal=REG, bold=BOLD)
INK, MUTED, AMBER, PAPER = map(HexColor, ['#222820','#5d6258','#a45b0b','#f7f6f1'])
W, H, M = 612, 792, 46
WIDTH = W-2*M
STYLE = ParagraphStyle('body',fontName=REG,fontSize=10.3,leading=15,textColor=INK,spaceAfter=9)
SMALL = ParagraphStyle('small',parent=STYLE,fontSize=8.2,leading=11,textColor=MUTED)
CELL = ParagraphStyle('cell',parent=STYLE,fontSize=8.7,leading=12)
APPENDIX = OUT/'M7-Archive-Prototype-B.pdf'
c=canvas.Canvas(str(APPENDIX),pagesize=(W,H))
c.setTitle('Where Do We Stand? - Milestone 7 / Archive prototype B')
c.setAuthor('CSC316 project - contribution attribution pending confirmation')
page_no=0; y=0

def page(title, subtitle='Milestone 7 / Archive prototype B'):
    global page_no,y
    if page_no:c.showPage()
    page_no+=1
    c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setStrokeColor(HexColor('#c5c6bb'));c.line(M, H-45,W-M,H-45)
    c.setFont(REG,8);c.setFillColor(MUTED);c.drawString(M,H-33,'WHERE DO WE STAND?  /  PROCESS BOOK')
    c.drawRightString(W-M,H-33,'05 NOV 2026')
    c.setFont(REG,9);c.setFillColor(AMBER);c.drawString(M,H-70,subtitle)
    c.setFont(BOLD,24);c.setFillColor(INK);c.drawString(M,H-104,title)
    c.setFont(REG,8);c.setFillColor(MUTED);c.drawString(M,27,'B / local implementation and verification')
    c.drawRightString(W-M,27,f'M7 - {page_no:02d}')
    y=H-130

def para(text,style=STYLE,x=M,width=WIDTH):
    global y
    p=Paragraph(text,style);_,h=p.wrap(width,700)
    if y-h<48:raise ValueError(f'Page {page_no} overflow: {text[:50]}')
    p.drawOn(c,x,y-h);y-=h+style.spaceAfter

def heading(text):
    global y
    y-=7;c.setFont(BOLD,12);c.setFillColor(INK);c.drawString(M,y,text);y-=22

def photo(name,width=WIDTH,maxheight=340,x=M):
    global y
    path=SHOTS/name;img=ImageReader(str(path));iw,ih=img.getSize();scale=min(width/iw,maxheight/ih)
    dw,dh=iw*scale,ih*scale
    c.drawImage(img,x,y-dh,width=dw,height=dh)
    c.setStrokeColor(HexColor('#c5c6bb'));c.rect(x,y-dh,dw,dh,stroke=1,fill=0)
    y-=dh+13

def table(rows,widths):
    global y
    data=[[Paragraph(str(s),CELL) for s in row] for row in rows]
    t=Table(data,colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),HexColor('#e1e3d7')),('LINEBELOW',(0,0),(-1,-1),.4,HexColor('#c5c6bb')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    _,h=t.wrap(WIDTH,700)
    if y-h<48:raise ValueError(f'Page {page_no} table overflow')
    t.drawOn(c,M,y-h);y-=h+15

page('One file, a whole field of people.')
para('An implemented English story and explorable archive. Follow a fictional graduate through peers, pay, technology and AI, then locate your own background among real anonymous responses.')
photo('01-opening-desktop.jpg',maxheight=285)
table([['Implemented scope','Status'],['Four D3 chart groups / five SVG views','Complete, real data'],['2025 archive + complete 2024 sample','49,191 + 65,437 actual responses'],['YOU / zoom / index / filters / regrouping','Implemented and locally verified'],['Current M7 contributors','Pending user confirmation']], [WIDTH*.62,WIDTH*.38])
para('This appendix accompanies all 28 original Process Book pages. Historical team names remain in that original material; they are not a claim that everyone worked on this prototype. This is a local deliverable, not a course submission or public deployment.',SMALL)

page('From references to a visual system.')
para('<b>Direct observation:</b> RhineLabUI intro, array, X-001 extraction and return; The Pudding personal opening, population transition, gender/income grouping, individual detail and exploration controls. Read the online Process Book, M4 sketches 3/5/8/9, M6 storyboard and teacher requirement image before implementation.')
table([['Reference / retained principle','Application in B'],['RhineLabUI: warm paper, fine lines, layered file, extraction continuity','Ivory and warm grey, near-black type, amber example, teal local profile; no game logo, soundtrack or login fiction.'],['The Pudding: identity survives a change of scale and grouping','Stable annual IDs move between role, experience, education and AI groups. Individual detail remains selected.'],['Process Book: a graduate asks practical career questions','Alex reads the whole story before the full population first appears. Survey evidence supports comparisons, not a prescribed career.']], [WIDTH*.47,WIDTH*.53])
heading('Sequence and ownership of control')
table([['Story','Explore'],['Open file -> peers -> pay -> languages -> AI -> reflect','File folds into sample -> role -> experience -> manual exploration'],['One persistent Alex element, amber identity','Manual input pauses guided grouping. Resume story restores the narrative.']], [WIDTH/2,WIDTH/2])
para('<b>Skills actually used:</b> agents-mainline, sites, find-skills, Google Drive, computer-use, pdf and frontend-design. frontend-design was installed by another user-approved process; this implementation read and used it without reinstalling or changing the global registry. No additional skill was installed.',SMALL)
para('Reference commits: RhineLabUI 12cc5e4013acb9408f753ff71de6b8492299b7c8; the-pudding/love-story 243ddbd90c14a4abf2d37447bdd5906e5506dc74. Detailed observations and design critique are in research/design-and-reference-notes.md.',SMALL)

page('A complete, reproducible pipeline.')
para('Official Stack Overflow survey CSVs, schema CSVs and questionnaires are pinned to StackExchange/Survey commit 9dd5c163b7ec09ce5503f711c37a99dbd80ff3c7. The download script follows Git LFS pointers and verifies SHA-256. It does not scrape chart screenshots.')
table([['Year','Original rows','Used for'],['2023','89,184','AI trend'],['2024','65,437','Peer heatmap, USA pay, complete secondary archive'],['2025','49,191','Main archive, languages, AI trend/composition']], [55,85,WIDTH-140])
heading('Source -> clean -> aggregate -> D3')
para('download_data.py -> data/raw/{year}/ -> build_data.py -> public/data/. Dictionary-packed rows retain stable year-ResponseId identities and original field values. charts.json contains independently checkable aggregates; manifest.json describes counts/exclusions and field-dictionary.json records question semantics.')
para('<b>Missingness:</b> blank/NA becomes null, never a fabricated biography. Salary missingness does not remove a person from the archive. Experience bins are &lt;1, 1-2, 3-5, 6-10, 11-20, 21+, plus Not reported. Boundary text is mapped for binning; original answers remain available.')
para('<b>Schema decision:</b> 2025 does not collect YearsCodePro. The main archive uses WorkExp, while the professional-coding peer/pay views use 2024. The 2025 questionnaire asks people with zero work years to leave the field blank, so zero cannot be recovered from missing answers.')
para('<b>Quality:</b> 4,229 independent raw-source checks passed: IDs/counts, full group totals, 200+ sampled rows per archive year across 10 fields, every heatmap cell, quartiles, language denominators and AI statistics. Alex and YOU are never survey rows.')
para('Run: python scripts/download_data.py; then build_data.py; then validate_data.py. Raw inputs are about 459 MB and omitted from the ZIP; processed data, pinned URLs, hashes and reproducible scripts are included. Survey derivative database: ODbL 1.0; contents: DbCL 1.0. Licence URIs and notices are included.',SMALL)

page('Peers / a title is only a beginning.','Sketch 5 / implemented')
photo('02-peers-desktop.jpg',maxheight=320)
para('<b>Encoding:</b> primary role on rows, professional coding years on columns, colour and label as share within each role. Valid n appears at the row edge; a focus/hover readout reports cell count, denominator and missing experience. Small positive percentages are shown as &lt;1%, not 0%.')
para('<b>Real example:</b> 770 of 1,539 students with valid coding-experience answers fall below one year (50.0%); 3,563 student responses have missing experience and are excluded only from this denominator. Activating that cell opens exactly 770 corresponding 2024 records.')
para('<b>Personal positioning:</b> Alex is marked at Student / &lt;1 year, with Full-stack retained as an aspiration. YOU uses the separately entered coding years here. Neither marker changes percentages. Every heatmap cohort was checked against the full record filter.')
para('Source: Stack Overflow Developer Survey 2024, DevType and YearsCodePro. This is a cross-section of respondents, not a census or a probability of getting a role.',SMALL)

page('Pay / the middle and the range.','Sketch 8 / implemented')
photo('03-pay-desktop.jpg',maxheight=300)
para('<b>Encoding:</b> experience categories on x, annual USD on y. Amber dots are medians; capped intervals are Q1-Q3, the middle 50%. Six sample counts remain visible. Adjacent intervals overlap, showing variation within each experience group.')
table([['Coding years','n','Median USD','Q1-Q3 USD'],['&lt;1','85','65,000','50,000-90,000'],['1-2','427','89,000','68,000-117,439.5'],['3-5','801','110,000','85,000-145,000'],['6-10','1,225','145,000','110,000-187,000'],['11-20','1,207','170,000','130,000-215,000'],['21+','918','170,000','132,153-210,750']], [85,55,115,WIDTH-255])
para('USA 2024 only. 4,663 valid positive-compensation + experience responses; 6,432 US responses excluded for a required missing/invalid value. Type-7 interpolated quartiles, no upper salary cap; n&lt;10 would be suppressed. IQR is not a confidence interval. These differences do not predict Alex\'s future pay.',SMALL)

page('Languages / use and intention.','Sketch 3 / implemented')
photo('04-technologies-desktop.jpg',maxheight=340)
para('<b>Encoding:</b> one row per language, shared percentage scale. Dark dot = used in the past year; amber dot = want to use next year. The connecting line shows the difference without implying that all respondents change language.')
para('<b>Shared sample:</b> 27,079 people answered both multi-select questions in 2025; 22,112 responses missing either item are excluded. Deduplicated selections count once per respondent. Language percentages can sum beyond 100%.')
para('<b>Interaction:</b> search, sort by use / desire / difference / name, show all 42 languages, and accessible focus/hover readouts with both counts. Empty search explains how to recover. The archive separately filters by an actually used language.')
para('JavaScript: 17,896 used (66.1%); 10,581 want to use (39.1%), in this paired-answer sample. Desired use includes continuing with a tool. It is developer preference, not hiring demand or a salary promise.',SMALL)

page('AI / use and trust ask different things.','Sketch 9 / both views implemented')
photo('05-ai-desktop.jpg',maxheight=328)
table([['Year','Current use / valid adoption','Positive trust / current users answering trust'],['2023','39,042 / 87,973 = 44.4%','18,734 / 38,888 = 48.2%'],['2024','37,662 / 60,907 = 61.8%','16,055 / 37,302 = 43.0%'],['2025','26,469 / 33,720 = 78.5%','10,280 / 26,126 = 39.3%']], [44,205,WIDTH-249])
para('The trend connects independent samples, not the same people. 2025 frequency answers collapse to current use for the trend. The correct trust field is AIBen in 2023 and AIAcc in 2024/25; the 2023 AIAcc question has a different meaning.')
para('The second view is a 100% trust composition within each 2025 frequency group. Daily n=15,662; weekly 5,901; monthly/less 4,563; plans 1,754; no plans 5,380. These exclude missing trust within each group. Each segment exposes count, denominator and missing count.',SMALL)

page('The archive / an individual remains real.','Innovative view / implemented')
photo('06-archive-overview.jpg',maxheight=340)
para('<b>One rectangle = one anonymous response.</b> All 49,191 records are represented, with 65,437 accessible in the separate 2024 sample. Stable year-ResponseId keys bind layout, detail and selection. Canvas uses viewport culling when zoomed; it never replaces the background with decorative fake records.')
para('<b>One dimension at a time:</b> role/status, experience, education or AI use controls partitioning. Group labels and the complete group menu show n and %. Filters alter the scope independently; group changes move the same identities.')
para('<b>Area limitation:</b> a treemap allocates broadly by count, with a minimum weight min(180, max(1, scope n x 0.00366)) to retain small categories and markers. Exact counts are authoritative; empty marker groups do not add respondents. This is not a strictly proportional area chart.')
para('D3 supplies the treemap, zoom transform and quadtree. Layout fits the viewport aspect ratio. A current-position map lets rapid regrouping interrupt and continue; year changes deliberately switch independent samples without implying longitudinal identity.',SMALL)

page('Open a file; keep its place.','Interaction / implemented')
photo('07-record-detail.jpg',maxheight=310)
para('<b>Three scales:</b> far view exposes group names/counts and identity markers; group focus and zoom reveal discrete files; selecting one opens an overlaid reading panel while its origin remains highlighted. Anonymous ID labels appear at sufficient scale; pointer readout and record index give precise access.')
para('<b>Verified real detail:</b> a canvas click opened 2025-99, a student in Germany with one work year, reported languages and no reported salary. Keyboard opening 2025-2 showed its actual Netherlands / Back-end / two work years fields. No school, employer, portrait or biography is invented.')
para('<b>Control:</b> closing or Escape returns focus without rebuilding the layout. Group changes preserve selection and explain the current filing rule. Manual input pauses the scroll controller. Locate Alex / Locate me, Reset overview and Resume story keep recovery explicit.')
para('<b>Complete access:</b> a paginated DOM index, filters and ID search complement Canvas. Tested the final response 2025-49191 and its missing data, rather than only the first screen of examples. Arrow keys select, Enter opens, +/- zoom; labels and group menus are keyboard operable.',SMALL)

page('YOU / a reference, not a score.','Personal profile / implemented')
photo('09-you-matches.jpg',maxheight=330)
para('Three steps collect current role and optional work/coding experience, optional education/country/language/aspiration, then an input summary. Confirmation folds a teal YOU marker into the current group. Data remains only in tab memory; reset or reload removes it. No account, upload, model call or matching score.')
table([['Browser test conditions','Actual outcome'],['Full-stack + 3-5 work years + Canada + JavaScript','42 matching survey responses'],['Relax to role + experience','2,294 matching responses'],['Full-stack + 21+ work years + Andorra + JavaScript','0; explicit empty state and recovery'],['Relax the zero-match profile','2,111; all conditions remain explained']], [WIDTH*.71,WIDTH*.29])
para('Profile creation, editing, grouping, locating, opening and reset were exercised. Blank education files under Not reported. Work years and coding years remain separate. Aspiration never changes current role. The full survey total stays 49,191 throughout.',SMALL)

page('Responsive, recoverable, measured.')
top=y
photo('10-mobile-archive.jpg',width=200,maxheight=390,x=M)
y=top;photo('11-mobile-profile.jpg',width=200,maxheight=390,x=M+WIDTH-200)
y=top-405
para('<b>Actual environment:</b> Windows / Edge 156, desktop 1592x817 and 1440x1000, plus emulated 390x844. Final narrow document width was 390 px. Charts scroll inside their containers; expanded index, filters and match results flow with the page. The profile dialog fits the narrow viewport.')
para('<b>Recovery:</b> simulated blocked 2024 records preserved the prior sample; retry loaded all 65,437. Blocked chart loading showed a meaningful error and retry; recovery loaded all 49,191. Reduced-motion control, keyboard actions and focus restoration were exercised.')
para('<b>Measured final production reload:</b> ready 867.6 ms; layout 91.2/94.1 ms; filter+layout 131.3/132.5 ms. Local cached run, concurrent browser use, DPR 2. Background animation-frame sampling was throttled and is not a valid FPS benchmark. No 60 fps, physical-phone or screen-reader certification is claimed.',SMALL)

page('Evidence and submission checklist.')
table([['Teacher requirement','B delivery / exact status'],['Active team member documentation','Pending user confirmation; historical team list preserved, no contribution invented.'],['Complete real-data pipeline','Done for the three used years; pinned downloads, schemas, cleaning, manifest, independent validation.'],['Two functional D3 visualizations','Exceeded: four groups / five SVG views, actual JSON loading and rendering.'],['2-3 additional unimplemented drafts','Literal mismatch: all four selected groups are implemented. No teacher waiver claimed; this remains a submission decision.'],['Website structure and clear story','Implemented opening, four questions, reflection, population, exploration and conclusion.'],['Innovative view / interaction design','Implemented archive field, identity continuity, grouping, extraction, YOU and accessible index.'],['All previous milestones + M7','28 original PDF pages preserved, followed by this 12-page appendix.'],['Code / PDF / one ZIP','Local code, processed data, scripts, README, screenshots, full PDF and appendix are packaged; no upload performed.']], [185,WIDTH-185])
para('<b>Validation:</b> 4,229 independent data checks and 6 full-data tests pass. Typecheck/build pass in the original and a fresh clean directory; the clean production build was browser-tested. Vite patched to 6.4.5, npm audit reports zero vulnerabilities. Final evidence is bound to source/build hashes in output/build-manifest.json.')
para('<b>Reproduce:</b> npm ci; npm run dev (127.0.0.1:5174). npm test; npm run build; npm run preview (4174). Python scripts rebuild data. See README.md and output/verification.md for commands, all observed cases and limitations.',SMALL)
para('Sources: survey.stackoverflow.co; github.com/StackExchange/Survey; rhine.lubeiluchen.cc; pudding.cool/2026/06/love-story; original Process Book: docs.google.com/document/d/1OurDQy_H5T7FQDVvEVlX9px6ZpiuPQ6LyLowf9AXWDY. The teacher screenshot gives PDF as upload type and ZIP in its instructions; the user checks the portal and submits. The online Doc is unchanged.',SMALL)
c.save()
assert page_no==12

original=ROOT/'research/process-book-original.pdf'
before=PdfReader(original);appendix=PdfReader(APPENDIX)
assert len(before.pages)==28 and len(appendix.pages)==12
writer=PdfWriter();writer.append(before,outline_item='Original Process Book / all previous milestones');writer.append(appendix,outline_item='Milestone 7 / Archive prototype B')
writer.add_metadata({'/Title':'Where Do We Stand? - Complete Process Book + M7 Archive B','/Author':'CSC316 project - M7 contributors pending confirmation'})
combined=OUT/'Process-Book-Complete-with-M7-B.pdf'
with combined.open('wb') as f:writer.write(f)
after=PdfReader(combined)
checks=[]
for i,p in enumerate(before.pages):
    old=p.get_contents().get_data();new=after.pages[i].get_contents().get_data()
    assert old==new, f'Original page {i+1} content stream changed'
    assert p.extract_text()==after.pages[i].extract_text()
    checks.append({'page':i+1,'content_sha256':sha256(old).hexdigest(),'preserved':True})
assert len(after.pages)==40
(ROOT/'output/pdf-validation.json').write_text(json.dumps({'original_pages':28,'appendix_pages':12,'combined_pages':40,'original_content_and_text_preserved':checks,'pdf_sha256':sha256(combined.read_bytes()).hexdigest(),'visual_review':'Render all pages and inspect before delivery'},indent=2),encoding='utf-8')
print(f'Created {APPENDIX.name} (12 pages) and {combined.name} (40 pages). Original 28 pages preserved.')
