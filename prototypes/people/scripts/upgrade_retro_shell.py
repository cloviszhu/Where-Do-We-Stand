"""One-time local migration from the reviewed homepage and retained story markup."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
old=(ROOT/'index.v1.html').read_text(encoding='utf-8')
home=(ROOT/'output/home-review/homepage-baseline/index.html').read_text(encoding='utf-8')
# Preserve the approved hero; its actions now lead into the complete document.
hero=home[home.index('    <main'):home.index('    <dialog')]
hero=hero.replace('<main id="main"','<section id="start"').replace('</main>','</section>')
a=hero.index('      <header'); b=hero.index('      <div class="opening-copy">')
hero=hero[:a]+hero[b:]
a=hero.index('      <div class="story-rail"'); b=hero.index('      <canvas')
hero=hero[:a]+hero[b:]
a=hero.index('      <div class="explore-dock"'); b=hero.index('      <footer')
hero=hero[:a]+hero[b:]
hero=hero.replace('id="packet-canvas"','id="hero-canvas"').replace('id="cohort-labels"','id="hero-labels"').replace('id="packet-tip"','id="hero-tip"')
hero=hero.replace('Meet Alex <span','Meet Alex <span').replace('A single story, seen in perspective.','Scroll to follow Alex ↓')
hero=hero.replace('Interactive survey units. Use Browse units for a keyboard-accessible record index.','Overview of 1,309 units containing all 65,437 responses. Explore the crowd below to open records.')
sections=old[old.index(' <section id="peers"'):old.index(' <section id="people"')]
sections=sections.replace('class="story-section"','class="story-section wrap"')
sections=sections.replace('Using a tool<br>is not the same<br>as trusting it.','AI use grows.<br>Trust takes work.')
sections=sections.replace('A median is a midpoint, not a promise','Compensation has a range')
sections=sections.replace('Experience is context. It does not measure ability, hiring demand, or readiness for a role.','Experience describes time spent coding professionally. Hiring demand and ability are different questions.')
sections=sections.replace('<section id="pay"','<section id="pay"').replace('class="dot amber"','class="dot pink"')
crowd=old[old.index(' <section id="people"'):old.index(' <section id="your-plan"')]
crowd=crowd.replace('Browse all records','Search records').replace('One figure = one real response. Dashed Alex and outlined YOU are extra markers.','1 unit = up to 50 responses. Alex / YOU are extra markers.')
crowd=crowd.replace('<button id="open-filter">','<button id="browse-units">Browse units</button><button id="open-filter">')
crowd=crowd.replace('Survey respondent map. Use the record list for accessible selection.', 'Survey units, each containing up to 50 responses. Use Browse units or Search records for accessible selection.')
crowd=crowd.replace('<div id="zone-labels"','<div id="unit-tip" role="status" hidden></div><div id="zone-labels"')
crowd=crowd.replace('<button id="enter-explore">Explore freely</button>','<button id="enter-explore">Explore freely</button><a class="plan-jump" href="#your-plan">Your next step ↓</a>')
tail=old[old.index(' <section id="your-plan"'):old.index('<div id="announcer"')]
tail=tail.replace('class="plan-section"','class="plan-section wrap"').replace('Where Do We Stand?</b>','Where Do We Stand?</b>').replace('<footer>','<footer class="site-footer wrap">')
tail=tail.replace('Visual references:', 'Story reference:').replace('<a href="https://github.com/LBEILC/RhineLabUI">RhineLabUI</a>,<br>','')
intro='''
 <section id="alex" class="alex-chapter wrap" aria-labelledby="alex-title">
  <div class="alex-copy"><p class="section-index">01 / Meet Alex</p><h2 id="alex-title">The code runs.<br>What comes next?</h2><p class="lead">Graduation is close. Alex knows JavaScript.<br>The next step feels less certain.</p><p>A CS student in Canada, considering a full-stack role. A fictional starting point for a very real question: where do people like me stand?</p><a class="solid-link" href="#peers">Find Alex’s peers <span aria-hidden="true">↓</span></a></div>
  <div class="alex-portrait" aria-label="Alex is a fictional guide, excluded from survey counts"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="portrait-person" aria-hidden="true"><span class="alex-figure"><i></i><b></b></span></div><div class="portrait-name">ALEX <span>Fictional guide</span></div><dl class="alex-facts"><div><dt>Current status</dt><dd>CS student</dd></div><div><dt>Professional coding</dt><dd>Under 1 year</dd></div><div><dt>Next question</dt><dd>Where could I begin?</dd></div></dl></div>
 </section>
'''
head=home[:home.index('  <body>')].replace('<title>Where Do We Stand? / A</title>','<title>Where Do We Stand? / A — People, paths & possibilities</title>')
nav='''  <body>
<!-- Software / survey narrative. Reviewed Retro-Futurism palette and hero; data, not marketing cards, carries the story. -->
<a class="skip" href="#main">Skip to the story</a>
<header class="site-nav"><a class="brand" href="#start" aria-label="Where Do We Stand home"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 11v18h7V17h6v12h7V11h6v18h8V11" fill="none" stroke="currentColor" stroke-width="3"/></svg><span>WHERE DO<br>WE STAND?</span></a><nav aria-label="Chapters"><a href="#peers">Peers</a><a href="#pay">Pay</a><a href="#skills">Skills</a><a href="#ai">AI</a><a href="#people" id="nav-explore">The crowd</a></nav><div class="nav-tools"><button id="source-button">The data</button><button id="motion-button" aria-pressed="false" aria-label="Pause motion"><span class="pause-icon">Ⅱ</span></button></div><div id="progress"></div></header>
<div class="chapter-track"><span id="chapter">A starting point</span><span>2024 survey / 65,437 voices</span></div>
<main id="main">
'''
source=home[home.index('    <dialog'):home.index('    <script')]
source=source.replace('<p>\n        Alex is a fictional guide','<p>Alex and YOU are extra markers. AI trend charts use independent 2023–2025 samples; the main crowd always uses 2024. Profiles stay in memory in this tab and disappear on reload.</p><p>\n        Alex is a fictional guide')
result=head+nav+hero+'<div id="load-status" role="status" class="load-status">Loading the survey…</div>'+intro+sections+crowd+tail+source+'<div id="announcer" class="sr-only" aria-live="polite"></div><script type="module" src="/src/home.ts"></script></body></html>'
(ROOT/'index.html').write_text(result,encoding='utf-8')
css=(ROOT/'output/home-review/homepage-baseline/home.css').read_text(encoding='utf-8').replace('@import "../../shared/inspector.css";','@import "./units/inspector.css";').replace('#packet-canvas','#hero-canvas')
(ROOT/'src/home.css').write_text(css,encoding='utf-8')
# The existing statistical code remains in A; only its palette and accessible marks change.
chart=(ROOT/'output/home-review/homepage-baseline/charts.ts').read_text(encoding='utf-8')
for a,b in {"const ink='#252923',amber='#a76320',green='#32655a'":"const ink='#74edff',amber='#ff77b6',green='#74edff'","'#d2d2c7'":"'#3f3357'","'#999f94'":"'#9384ad'","'#f8f6f1'":"'#18112f'","'#e9e6dd','#aa6f2c'":"'#261b3d','#fc8cbd'","'#e9e6dd'":"'#261b3d'","['#51463d','#967255','#b4b4a6','#b8884d','#e3b76f','#e8e6df']":"['#b44e81','#ef9fc4','#9e92ba','#8bc3df','#74edff','#393043']"}.items(): chart=chart.replace(a,b)
chart=chart.replace(".attr('fill',ink).text(row.n?", ".attr('fill',percent>.15?'#100c26':'#fff1fc').text(row.n?")
# Touch readers can reveal tooltips too; chart tables remain a complete alternate path.
chart=chart.replace("node.on('pointerenter.tip focus.tip'", "node.on('pointerenter.tip focus.tip click.tip'")
# The two series have distinct marker shapes as well as colors.
chart=chart.replace("g.append('circle').attr('cx',x(wanted)).attr('cy',cy).attr('r',5).attr('fill',amber);", "g.append('rect').attr('x',x(wanted)-5).attr('y',cy-5).attr('width',10).attr('height',10).attr('fill',amber);")
(ROOT/'src/charts.ts').write_text(chart,encoding='utf-8')
print('Prepared complete Retro-Futurism document and chart theme.')
