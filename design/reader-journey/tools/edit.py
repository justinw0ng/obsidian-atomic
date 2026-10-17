import re
P='/workspace/reader-openpencil/journey.source.html'
s=open('/tmp/rx/journey.source.bak.html').read()

CSS='''
/* ---- Book size control (S/M/L/XL) ---- */
.bsize{display:inline-flex;align-items:center;gap:8px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.bsize .seg{display:inline-flex;align-items:center;height:28px;padding:2px;border-radius:9px;border:1px solid rgba(34,34,34,.12);background:rgba(34,34,34,.03);box-sizing:border-box}
.bsize .opt{height:22px;min-width:34px;padding:0 7px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;gap:5px;font-size:11.5px;font-weight:500;line-height:1;color:#5c5c5c;box-sizing:border-box}
.bsize .opt.on{background:#fff;color:#222;box-shadow:0 0 0 1px rgba(34,34,34,.12),0 1px 2px rgba(0,0,0,.08)}
.bsize .bk{display:inline-block;border:1.25px solid currentColor;border-left-width:2.5px;border-radius:1.5px;box-sizing:border-box;opacity:.85}
.bsize .b1{width:6px;height:8px}.bsize .b2{width:7px;height:10px}.bsize .b3{width:8px;height:12px}.bsize .b4{width:9px;height:14px}
.bsize .kbd{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;color:#8a8a8a;white-space:nowrap}
.desk.dark .bsize .seg{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.04)}
.desk.dark .bsize .opt{color:#9a9a9a}
.desk.dark .bsize .opt.on{background:#3a3a3a;color:#f0f0f0;box-shadow:0 0 0 1px rgba(255,255,255,.1)}
.desk.dark .bsize .kbd{color:#7a7a7a}
.nav-pills .tb-sp{flex:1}
/* theater auto-hiding chrome */
.th-chrome{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:12px;height:40px;padding:0 6px 0 12px;border-radius:14px;box-sizing:border-box;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;font-weight:500;white-space:nowrap}
.theater.light .th-chrome{background:rgba(251,250,247,.92);color:#3a3834;box-shadow:0 0 0 1px rgba(60,50,40,.12),0 10px 24px -12px rgba(60,50,40,.35)}
.theater.dark .th-chrome{background:rgba(38,38,38,.92);color:#dadada;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 10px 24px -10px rgba(0,0,0,.7)}
.th-chrome .sep{width:1px;height:18px;background:currentColor;opacity:.16}
.th-chrome .exit{height:28px;padding:0 10px;border-radius:9px;display:inline-flex;align-items:center;gap:6px}
.th-chrome .exit .kbd{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;opacity:.6}
.theater.light .th-chrome .exit{background:rgba(60,50,40,.06)}
.theater.dark .th-chrome .exit{background:rgba(255,255,255,.06)}
.theater.idle .th-chrome{opacity:.78}
/* theater XL book */
.theater.sz-xl .curtain{width:108px}
.theater.sz-xl .tbook{left:148px;top:68px;width:680px;height:520px}
.theater.sz-xl .tbook .page{width:340px;height:500px}
.theater.sz-xl .tbook-shadow{left:20px;top:44px;width:640px;height:500px}
.theater.sz-xl .gutter-seam{left:337px;height:484px}
.theater.sz-xl .lamp-pool{top:170px;height:340px}
.theater.sz-xl .lamp-pool.L{left:96px}.theater.sz-xl .lamp-pool.R{right:96px}
.theater.sz-xl .th-key{left:60px;top:30px;width:640px;height:520px}
.theater.sz-xl .th-hint{bottom:14px;white-space:nowrap}
.theater.sz-m .tbook .page{height:340px}
.lc{overflow:hidden}
.theater.sz-m .lc{height:285px}
.theater.sz-xl .lc{height:437px}
/* 07b normal reader size compare */
.bs .spread{align-items:flex-start;padding-top:4px}
.bs .spread .page{min-height:0;box-sizing:border-box;padding:26px 24px}
.bs.m .spread .page{width:270px;height:340px}
.bs.m .lc{height:285px}
.bs.xl .content{padding-left:28px;padding-right:28px}
.bs.xl .spread{padding-left:0;padding-right:0}
.bs.xl .spread .page{width:340px;height:488px}
.bs.xl .lc{height:418px}
.bs .pn{position:absolute;bottom:10px;left:0;right:0;text-align:center}
.lines-tag{display:inline-block;margin-left:8px;padding:2px 7px;border-radius:3px;background:rgba(91,124,250,.12);color:#3d5bd9;font-weight:600;letter-spacing:.04em}
/* phone reader sheet */
.psheet .rs-title{font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#222;padding:0 4px 10px}
.psheet .rs-row{display:flex;align-items:center;justify-content:space-between;padding:10px 4px;border-top:1px solid #ececec;font-family:Inter,sans-serif;font-size:13px;color:#222}
.psheet .rs-row .v{color:#6b6b6b;font-size:13px}
.psheet .bsize{width:100%}
.psheet .bsize .seg{width:100%;height:36px;padding:3px}
.psheet .bsize .opt{flex:1;height:28px;font-size:13px}
.psheet .rs-hint{font-family:Inter,sans-serif;font-size:12px;color:#6b6b6b;padding:2px 4px 12px}
'''
s=s.replace('</style>',CSS+'</style>',1)

def ctl(on='M',kbd=True):
    o=''
    for i,l in enumerate(['S','M','L','XL']):
        o+=f'<span class="opt{" on" if l==on else ""}"><i class="bk b{i+1}"></i>{l}</span>'
    k='<span class="kbd">⌘ − / +</span>' if kbd else ''
    return f'<span class="bsize"><span class="seg">{o}</span>{k}</span>'

PILLS='<div class="nav-pills"><span class="nav-pill">Shelf</span><span class="nav-pill on">Pride and Prejudice</span><span class="nav-pill">Canvas</span><span class="nav-pill">Note</span>'
# 07: add control to toolbar (step-07 only)
i=s.find('id="step-07"'); j=s.find('id="step-08"')
seg=s[i:j]; assert seg.count(PILLS)==1
seg=seg.replace(PILLS,PILLS+'<span class="tb-sp"></span>'+ctl('M'),1)
s=s[:i]+seg+s[j:]

def chrome(on): return f'<div class="th-chrome">{ctl(on,kbd=True)}<span class="sep"></span><span class="exit">Exit<span class="kbd">Esc</span></span></div>'

# 06: chrome in both theaters (idle, M)
for tid in ['theater-light','theater-dark']:
    a=f'<div class="theater {tid.split("-")[1]}" id="{tid}">'
    assert a in s
    s=s.replace(a,f'<div class="theater {tid.split("-")[1]} idle" id="{tid}">\n  '+chrome('M'),1)
s=s.replace('<div class="th-hint">Esc exits · move mouse to restore chrome</div>','<div class="th-hint">Chrome hides after 2 s · move mouse to show</div>')

T1="It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters. “My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?” Mr. Bennet replied that he had not. “But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.” Mr. Bennet made no answer. “Do you not want to know who has taken it?” cried his wife impatiently. “You want to tell me, and I have no objection to hearing it.” This was invitation enough. “Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it that he agreed with Mr. Morris immediately.”"
T2="“What is his name?” “Bingley.” “Is he married or single?” “Oh, single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!” “How so? How can it affect them?” “My dear Mr. Bennet,” replied his wife, “how can you be so tiresome! You must know that I am thinking of his marrying one of them.” “Is that his design in settling here?” “Design! Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes.” “I see no occasion for that. You and the girls may go, or you may send them by themselves, which perhaps will be still better, for as you are as handsome as any of them, Mr. Bingley may like you the best of the party.” “My dear, you flatter me. I certainly have had my share of beauty, but I do not pretend to be anything extraordinary now.” “In such cases, a woman has not often much beauty to think of.” “But, my dear, you must indeed go and see Mr. Bingley when he comes into the neighbourhood.” “It is more than I engage for, I assure you.” “But consider your daughters. Only think what an establishment it would be for one of them.”"
def tpages(): return f'<div class="page left"><div class="lc"><div class="book-text">{T1}</div></div></div>\n    <div class="page right"><div class="lc"><div class="book-text">{T2}</div></div></div>'

# 06c/06d new section: copy step-06 desks, convert to XL + chrome shown
i=s.find('<section class="step" id="step-06"'); j=s.find('<section class="step" id="step-07"')
sec=s[i:j]
new=sec.replace('id="step-06" data-step="06"','id="step-06cd" data-step="06cd"')
new=re.sub(r'<div class="step-label">.*?</div><div class="step-note">.*?</div>','<div class="step-label"><b>06c · 06d</b> · Theater · book size XL</div><div class="step-note">Mouse move reveals the chrome; book size lives in it. XL grows the page (340×500) at the same 12.5/19 type, so each page shows 23 lines instead of 15. Curtains part wider to make room. Size persists per book.</div>',new,count=1,flags=re.S)
new=new.replace('<b>Light</b> · linen curtains · soft key','<b>Light</b> · XL · chrome shown<span class="lines-tag">23 lines / page</span>')
new=new.replace('<b>Dark</b> · museum key · Obsidian chrome','<b>Dark</b> · XL · chrome shown<span class="lines-tag">23 lines / page</span>')
new=new.replace('id="desk-theater-light"','id="desk-theater-size-light"').replace('id="desk-theater-dark"','id="desk-theater-size-dark"')
new=new.replace('class="theater light idle" id="theater-light"','class="theater light sz-xl" id="theater-size-light"').replace('class="theater dark idle" id="theater-dark"','class="theater dark sz-xl" id="theater-size-dark"')
new=new.replace(chrome('M'),chrome('XL'))
new=new.replace('<div class="th-hint">Chrome hides after 2 s · move mouse to show</div>','<div class="th-hint">Cmd/Ctrl +/− resizes the book · Esc exits</div>')
new=re.sub(r'<div class="page left"><div class="book-text">.*?</div></div>\s*<div class="page right"><div class="book-text">.*?</div></div>',tpages(),new,flags=re.S)
assert new.count('sz-xl')==2 and new.count('class="lc"')==4
# 06 theaters: mark sz-m and clip with lc (same visible lines as before? keep original text untouched)
s=s[:j]+new+s[j:]

# 07b section
def desk(cls,on,lines,dims):
    return f'''<div><div class="cap"><b>{on}</b> · page {dims} · 12.5/19 Literata<span class="lines-tag">{lines} lines / page</span></div><div class="desk bs {cls}"><div class="desk-titlebar"><div class="lights"><span></span><span></span><span></span></div><div class="tab">Pride and Prejudice<span class="x">×</span></div><div class="plus">+</div><div class="title-actions">⋯</div></div><div class="ribbon"><div>📚</div><div>📄</div><div>📅</div><div>🌐</div><div>▦</div></div><div class="main"><div class="viewhead"><span>‹</span><span>›</span><div class="crumbs">atomics / hobbies / Reading / <b>Pride and Prejudice</b></div><span>⌕</span><span>⋮</span></div><div class="content tight"><div class="reader-stage">{PILLS}<span class="tb-sp"></span>{ctl(on)}</div><div class="spread"><div class="page left" style="position:relative"><div class="lc"><div class="book-text">{T1}</div></div><div class="pn">46</div></div><div class="page right" style="position:relative"><div class="lc"><div class="book-text">{T2}</div></div><div class="pn">47</div></div></div><div class="progress"><span class="label">Last read p. 47</span><div class="track"><div class="fill"></div></div><span class="pct">47 / 432</span></div></div></div></div></div></div>'''
PHONE=f'''<div><div class="cap"><b>Phone</b> · reader sheet</div><div class="phone-shell"><div class="phone"><div class="island"></div><div class="statusbar"><span>9:41</span><span>▮▮▮</span></div><div class="mhead"><span>‹</span><div class="mhead-title">Pride and Prejudice</div><span>⋮</span></div><div class="mcontent"><div class="phone-page"><div class="book-text" style="font-size:15px;line-height:23px;padding:0 18px">{T1}</div></div></div><div class="sheet-scrim"><div class="sheet sheet-m psheet"><div class="sheet-handle"></div><div class="rs-title">Reading</div><div class="rs-row" style="border-top:0;padding-bottom:8px"><span>Book size</span><span class="v">L · 21 lines</span></div>{ctl('L',kbd=False)}<div class="rs-hint">Larger book, same type size — more lines per page. Saved for this book.</div><div class="rs-row"><span>Theme</span><span class="v">Match app</span></div><div class="rs-row"><span>Theater</span><span class="v">Off</span></div></div></div><div class="homebar"><div class="home-pill"></div></div></div></div></div>'''
SEC=f'''<section class="step" id="step-07b" data-step="07b"><div class="step-label"><b>07b</b> · Book size · M vs XL</div><div class="step-note">Same page, same 12.5/19 type. XL makes the book bigger (page 270×340 → 340×488), so it holds 22 lines instead of 15 and fits more words per line. Toolbar segmented control S · M · L · XL, ⌘ −/+ steps it. 200 ms resize, instant with reduced motion.</div><div class="frames" id="frames-07b">{desk("m","M",15,"270×340")}{desk("xl","XL",22,"340×488")}{PHONE}</div></section>'''
k=s.find('<section class="step" id="step-08"')
s=s[:k]+SEC+s[k:]
open(P,'w').write(s); print('ok')
