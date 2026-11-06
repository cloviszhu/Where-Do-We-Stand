"""Build current Endfield M7 appendix and merge all retained original pages. No cloud writes."""
from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/full-review'
PDF=OUT/'pdf'
PDF.mkdir(parents=True,exist_ok=True)
W,H,M=612,792,42
WIDTH=W-2*M
INK,MUTED,PAPER,SIGNAL=map(HexColor,['#161616','#656660','#f4f4f2','#fffa00'])
STYLE=ParagraphStyle('body',fontName='Helvetica',fontSize=10,leading=14,textColor=INK,spaceAfter=10)
SMALL=ParagraphStyle('small',parent=STYLE,fontSize=8.5,leading=12,textColor=MUTED)
CELL=ParagraphStyle('cell',parent=STYLE,fontSize=9,leading=12)
APPENDIX=PDF/'M7-Endfield-B-Full-Site.pdf'
c=canvas.Canvas(str(APPENDIX),pagesize=(W,H))
c.setTitle('Where Do We Stand? - B Endfield complete site / Milestone 7')
c.setAuthor('CSC316 project; current contributors pending confirmation')
page_no=0
y=0
def page(title,subtitle):
    global page_no,y
    if page_no:c.showPage()
    page_no+=1
    c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(INK);c.rect(M,H-39,24,3,fill=1,stroke=0)
    c.setFillColor(SIGNAL);c.rect(M+27,H-39,12,3,fill=1,stroke=0)
    c.setFont('Helvetica',8);c.setFillColor(MUTED);c.drawString(M+50,H-38,'WHERE DO WE STAND? / B ENDFIELD')
    c.drawRightString(W-M,H-38,'06 NOV 2026')
    c.setFillColor(INK);c.setFont('Helvetica-Bold',23);c.drawString(M,H-82,title)
    c.setFont('Helvetica',9);c.setFillColor(MUTED);c.drawString(M,H-103,subtitle)
    c.setFont('Helvetica',8);c.drawString(M,25,'Local prototype / M7 update / no course upload or deployment')
    c.drawRightString(W-M,25,f'{page_no:02d}')
    y=H-126
def para(text,style=STYLE):
    global y
    p=Paragraph(text,style);_,h=p.wrap(WIDTH,700)
    if y-h<47:raise ValueError(f'Page {page_no} overflow: {text[:60]}')
    p.drawOn(c,M,y-h);y-=h+style.spaceAfter
def shot(name,maxheight=340,width=WIDTH):
    global y
    image=ImageReader(str(OUT/name));iw,ih=image.getSize();ratio=min(width/iw,maxheight/ih);dw,dh=iw*ratio,ih*ratio
    if y-dh<47:raise ValueError(f'Page {page_no} image overflow')
    c.drawImage(image,M+(WIDTH-dw)/2,y-dh,width=dw,height=dh)
    c.setStrokeColor(HexColor('#d1d2cc'));c.rect(M+(WIDTH-dw)/2,y-dh,dw,dh,fill=0,stroke=1)
    y-=dh+16
def table(rows,widths):
    global y
    t=Table([[Paragraph(str(s),CELL) for s in row] for row in rows],colWidths=widths)
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),HexColor('#e4e5df')),('LINEBELOW',(0,0),(-1,-1),.4,HexColor('#d1d2cc')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    _,h=t.wrap(WIDTH,700)
    if y-h<47:raise ValueError(f'Page {page_no} table overflow')
    t.drawOn(c,M,y-h);y-=h+16

page('A cover before the archive.','Independent homepage / current complete B implementation')
shot('home-1440.jpg',330)
para('The latest design separates the homepage from data exploration. The cover introduces the question, then offers Start with Alex and Explore the survey. Top navigation makes the story, archive, personal reference and methods independently reachable.')
para('Endfield standard: yellow accent, neutral paper, standard cut corners, contour background, standard density and full motion. Saira headings and IBM Plex Sans body text are self-hosted. A complete dark theme is supported. No game artwork or official branding is used.',SMALL)
para('This appendix supersedes the earlier B implementation notes. It is merged after every page of the retained original Process Book, without inserting obsolete B screenshots or replacing previous milestones.',SMALL)

page('One guide. Six chapters.','Narrative / interaction / route structure')
table([['Route','Purpose'],['Home','A separate cover; no archive canvas or chart controls.'],['Meet Alex','A fictional Canadian student, zero professional coding years; interested in full-stack.'],['Find peers','Read within-role experience distributions; a selected cell opens exact matching 2024 records.'],['Experience & pay','US medians and interquartile ranges, with sample size and missingness.'],['Tools & interests','Compare 2025 language use and desired use on one denominator.'],['Working with AI','Different denominators for adoption, trust trend and trust composition.'],['Your next step','Reflect, then fold the Alex reference into the student archive group.'],['Archive / Your place / Data notes','Free exploration, two-step YOU input, and transparent methods.']],[125,WIDTH-125])
para('Hash routes support direct entry, refresh and browser history. Chapter changes are reader-controlled. One persistent Alex identity expands for introduction/reflection and becomes a compact anchor for charts; the archive entry uses a cancellable fold-and-move transition.',SMALL)
para('Motion uses short mechanical transitions; the cover entrance completes in under one second. Reduced motion settles to the final state. No looping decoration or forced scroll progression is used.',SMALL)

page('A title is a starting point.','Sketch 5 / functional D3 heatmap / 2024')
shot('peers-1440.jpg',345)
para('Rows are reported roles, columns are professional coding experience, and shades and printed values show the share within each role. Valid n is shown at the row edge; the keyboard/focus readout and data table retain the count and missing experience.')
para('770 of 1,539 students with valid professional experience answers report less than one year (50.0%). Another 3,563 students have missing experience. They remain in the archive. Alex is an illustrative Student / less-than-one-year marker; Full-stack is only an aspiration.')
para('Every chart cell is independently checked against decoded B records. The 21+ chart band opens both 21-30 and 31+ archive groups through professional-year values. Nonfeatured original roles remain exact filters even when displayed under Other reported roles.',SMALL)

page('The middle and the range.','Sketch 8 / functional D3 point-and-interval chart / US 2024')
shot('pay-1440.jpg',310)
table([['Professional years','n','Median USD','IQR USD'],['<1','85','65,000','50,000-90,000'],['1-2','427','89,000','68,000-117,439.5'],['3-5','801','110,000','85,000-145,000'],['6-10','1,225','145,000','110,000-187,000'],['11-20','1,207','170,000','130,000-215,000'],['21+','918','170,000','132,153-210,750']],[110,48,100,WIDTH-258])
para('4,663 US responses have positive annual USD compensation and valid professional experience; 6,432 are excluded. No upper cap. Values below the declared minimum n=10, or incomplete quartiles, are suppressed consistently in marks, readouts and tables. IQR is not a confidence interval. This is not a forecast for Alex in Canada.',SMALL)

page('Used and wanted are different.','Sketch 3 / functional D3 language comparison / 2025')
shot('technology-1440.jpg',350)
para('Filled and accent dots share a percentage axis. The connector exposes the gap between current use and desired use next year. Search, sort, show-all, focus readouts and an accessible table support exploration. A zero-result search explains how to recover.')
para('Both ends use the same 27,079 people who answered both multi-select language questions; 22,112 responses missing either answer are excluded. JavaScript: 17,896 used (66.1%), 10,581 wanted (39.1%). Percentages are not a whole-population composition.')
para('The represented domain is programming languages. These are respondent preferences, not job openings, hiring demand or a prediction of future adoption.',SMALL)

page('Use does not settle trust.','Sketch 9 / functional D3 trend and trust composition')
shot('ai-1440.jpg',325)
table([['Year','Use / valid adoption','Trust / users answering trust'],['2023','39,042 / 87,973 = 44.4%','18,734 / 38,888 = 48.2%'],['2024','37,662 / 60,907 = 61.8%','16,055 / 37,302 = 43.0%'],['2025','26,469 / 33,720 = 78.5%','10,280 / 26,126 = 39.3%']],[45,WIDTH*.42,WIDTH*.58-45])
para('The lower bars show trust within each 2025 use-frequency group, not frequency prevalence in the entire survey. Missing trust is excluded: Daily 221, Weekly 57, Monthly/less 65, Plans to use 43, No plans 74. Counts and denominators remain available in the data table.',SMALL)
para('Independent annual samples. 2025 current-use frequencies collapse to Yes; trust uses equivalent categories in 2023 AIBen and 2024-2025 AIAcc. Differences do not track individuals or demonstrate causation.',SMALL)

page('A whole archive, not a texture.','Novel grouped-record view / complete 2024 respondent access')
shot('explore-1440.jpg',360)
para('All 65,437 original responses remain accessible through the canvas, category labels or Browse units. A unit has up to 50 responses within its current group. Everyone has 1,309 units; the last contains 37 people. Role has 1,313 units because each category retains its own remainder.')
para('Reclassification repacks the units; individual respondent IDs stay stable. Unit size is equal within a view; shelf area is not a population measure. Missing values remain visible. Role display groups differ from original-role filter values.')
para('Filters change the sample and display its size. Arrangement changes placement. Alex and YOU are separate reference markers and are never counted. Incompatible filters hide their markers rather than implying they belong to the selected cohort.',SMALL)

page('A place for your own questions.','YOU / transparent matching / browser-local memory')
shot('you-review-desktop.jpg',340)
para('Two steps: enter current role and optional professional years, education, country, language, AI use and desired role; then review the complete summary before placing YOU in the archive. Zero experience and unspecified experience are distinct.')
para('Matching is exact current role plus experience band, then chosen optional education, country, language and AI. Desired role never filters current peers. Explicit relaxation removes optional conditions and keeps role plus experience. Empty matches are explained, never replaced with invented neighbours.')
para('A tested example (Student, 0 professional years, Canada, JavaScript) returns 15 strict matches and 770 role/experience-only matches. Creating, editing or removing YOU keeps the full sample at 65,437. Profile input stays in page memory and clears on refresh.',SMALL)

page('Evidence and implementation boundaries.','Current verification / retained data pipeline')
table([['Evidence','Result'],['TypeScript + Vite / unit tests','Production build passed; B tests 14/14, including real B records and pay suppression boundaries.'],['Shared baseline regression','3/3 tests; common A/B sources untouched. B uses its own adapted component copies.'],['Independent raw-source validation','4,229 checks passed: annual IDs/counts, sampled source rows, heatmap cells, US quartiles, language pairs and AI denominators.'],['Browser journey','Home, all chapters, chart-to-record cohort, direct canvas hit, unit selection and respondent 2024-65437; keyboard open/Escape/focus return.'],['YOU and empty states','Review/edit/place/locate/clear; exact and relaxed matches; zero-result profile and language search.'],['Responsive / reduced motion','40 route-and-size checks: 390, 768, 1024, 1440 wide; no document overflow; reduced-motion running animations = 0.'],['Failure and lifecycle','Blocked record/chart loads show recovery; retries succeed; home remains usable; quick regroup, close/navigation and back/forward checked.'],['Limits','Desktop browser emulation; no physical phone or screen-reader acceptance; no measured 60 fps claim.']],[145,WIDTH-145])
para('The retained official 2023-2025 pipeline remains reproducible through download_data.py, build_data.py and validate_data.py. Raw files are omitted from the portable ZIP; processed data, source URLs, hashes, dictionaries, questionnaires and licence notices are documented locally.',SMALL)
para('An EGM review of the initial plan used 10 fresh reviewers across five stages. Its findings are separate from implementation tests. The remediation record maps every consolidated action to the final code, documentation and evidence.',SMALL)

page('Milestone 7 delivery record.','Requirements, original Process Book, and remaining human decisions')
table([['Course requirement','Current status'],['Actual contributors documented','Pending user confirmation; historical names are not claimed as contributors to this revision.'],['Complete real-data pipeline','Retained reproducible official-source pipeline and current independent validation.'],['At least two functional D3 views','Four chart groups / five SVG views implemented with data loading, rendering and interaction.'],['2-3 additional unimplemented drafts','This enhanced B implements all four selected groups. This differs from the literal unimplemented-draft wording; no teacher exemption is claimed.'],['Website structure and storytelling','Independent home; six story chapters; archive, YOU and methods; no sidebar.'],['Novel view','Grouped real-record archive with category reflow and separate illustrative markers; peer-locator chart.'],['Updated full Process Book','All original pages preserved, followed by this current appendix.'],['Submission package','Local source/build/data/PDF/evidence ZIP. Separate PDF available. No course upload, public deployment or cloud-document writeback.']],[145,WIDTH-145])
para('Original Process Book: docs.google.com/document/d/1OurDQy_H5T7FQDVvEVlX9px6ZpiuPQ6LyLowf9AXWDY. Its revision was checked against the retained snapshot during this implementation. Teacher requirements are retained in delivery-plan/references/teacher-requirements.md.',SMALL)
para('Sources: survey.stackoverflow.co; official StackExchange/Survey dataset mirror; hhikr/endfield-ui-skill for the UI system. The Pudding A love story informed the personal-to-group narrative, while this implementation uses developer-survey categories and its own content.',SMALL)
c.save()
original=ROOT/'research/process-book-original.pdf'
reader=PdfReader(original);writer=PdfWriter()
for p in reader.pages:writer.add_page(p)
appendix_reader=PdfReader(APPENDIX)
for p in appendix_reader.pages:writer.add_page(p)
merged=PDF/'Process-Book-Complete-Endfield-B.pdf'
with merged.open('wb') as f:writer.write(f)
assert len(PdfReader(merged).pages)==len(reader.pages)+page_no
report={'original_pages':len(reader.pages),'appendix_pages':page_no,'total_pages':len(reader.pages)+page_no,'original_content_preserved':True,'outputs':[str(APPENDIX),str(merged)],'render_review':'required after generation'}
(OUT/'pdf-generation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
