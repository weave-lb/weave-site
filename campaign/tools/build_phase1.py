"""Build only Phase 1. Run from any directory; no network or deployment."""
from pathlib import Path
from html import escape
import json
import re
import shutil
import hashlib

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT.parent / 'Company' / 'Brand'
FORM_ENDPOINT = ''
HOMEPAGE_LIVE = False
COMMUNITY_NAME = '[COMMUNITY_NAME]'
NOTIFICATION_INBOX = '[NOTIFICATION_INBOX]'
POSTING_FOUNDER = 'Ibrahim'

DATA = {
    'fictional': True, 'currency': 'USD', 'store': 'Tila Demo Store',
    'order': '1048', 'customer': 'Lina Haddad', 'location': 'Beirut',
    'item': 'Canvas day bag', 'quantity': 1, 'unitPrice': '42.00',
    'delivery': '6.00', 'total': '48.00', 'paymentReference': 'DEMO-P1048',
    'paymentReceived': '07 Oct, 09:44', 'paymentConfirmed': '07 Oct, 10:02',
    'owner': 'Maya Nader', 'supplier': 'Cedar Demo Supply',
    'delayMessage': '1048: dispatch moved to tomorrow.',
    'delayAt': '07 Oct, 11:05', 'nextCheck': '07 Oct, 11:30',
    'delayUpdate': 'Your order is delayed at the supplier. Next update tomorrow morning.',
    'delayUpdateSent': '07 Oct, 11:12',
    'supplierConfirmed': '08 Oct, 09:10', 'courier': 'Demo Courier',
    'dispatched': '08 Oct, 10:20', 'tracking': 'DEMO-LB1048',
    'trackingLinked': '08 Oct, 10:22',
    'customerUpdate': 'Your order has dispatched. Tracking: DEMO-LB1048.',
    'customerUpdateSent': '08 Oct, 10:24', 'recordUpdated': '08 Oct, 10:25',
    'ownerView': '1 dispatched · 0 unresolved exceptions',
}

FONT = ROOT / 'assets/fonts/Montserrat/Montserrat-VariableFont_wght.ttf'
LOGO = BRAND / 'logo-assets/master/weave-logo.svg'
if not FONT.is_file() or not LOGO.is_file():
    raise SystemExit('STOP: official logo SVG or Montserrat font missing.')

for rel in ['campaign/assets', 'campaign/data', 'campaign/poster', 'campaign/qa', 'community/assets']:
    (ROOT / rel).mkdir(parents=True, exist_ok=True)

# Exact official geometry; monochrome fill adaptation avoids decorative orange.
svg = LOGO.read_text(encoding='utf8')
svg = re.sub(r'fill:#[0-9a-fA-F]{6}', 'fill:#4F35E8', svg)
svg = svg.replace('<title>Asset 1</title>', '<title>Weave</title>')
svg = svg.replace('<svg ', '<svg role="img" aria-label="Weave" ', 1)
for folder in ['campaign/assets', 'community/assets']:
    dest = ROOT / folder
    (dest / 'weave-logo.svg').write_text(svg, encoding='utf8')
    shutil.copy2(FONT, dest / FONT.name)
    license_file = FONT.parent / 'OFL.txt'
    if license_file.exists():
        shutil.copy2(license_file, dest / 'OFL.txt')

TOKENS = '''
--ink:#16131F;--paper:#F5F5F2;--sheet:#FFFFFF;--violet:#4F35E8;
--deep-violet:#2A1B8C;--thread:#8B79FF;--orange:#FF5B1A;--orange-ink:#B23A00;
--ink-rgb:22 19 31;--orange-rgb:255 91 26;
--sans:Montserrat,Helvetica,sans-serif;--mono:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;
--muted:color-mix(in srgb,var(--ink) 74%,var(--paper));
--dur-fast:180ms;--dur:300ms;--dur-slow:450ms;
--ease-out:cubic-bezier(.2,.7,.2,1);--ease-inout:cubic-bezier(.45,0,.2,1);
'''
RECORD_CSS = (ROOT / 'campaign/components/record.css').read_text(encoding='utf8')

def compact_record(prefix):
    rows = [
        ('payment', 'Paid · $48.00', ' data-payment', '<span class="payment-action" aria-label="Maya Nader confirmed payment">MN</span>'),
        ('supplier', '<span class="glyph" aria-hidden="true">⚑</span> Supplier delayed', ' data-exception', ''),
        ('owner', 'Maya → 11:30', ' data-human', ''),
        ('held', 'Dispatch held', ' data-held', ''),
    ]
    layers = ''
    for i,(kind, text, attr, action) in enumerate(rows,1):
        layers += f'''<li class="layer" data-layer="{i}" data-row="{kind}"{attr} id="{prefix}-{kind}">
          <div class="layer-face"><div class="layer-key"><span class="num" aria-hidden="true">{i:02}</span></div>
          <p class="line{' has-action' if action else ''}" data-fit>{text}{action}</p></div></li>'''
    return f'''<article class="record compact" aria-label="Order 1048 connected record, supplier delay open">
      <header class="record-top"><span class="folio" data-fit>ORDER 1048</span><span class="micro" data-fit>Connected record</span></header>
      <div class="layers-window"><ol class="layers" role="list">{layers}</ol></div></article>'''

def sources():
    return '''<div class="sources" aria-label="Detached evidence for order 1048">
      <div class="source receipt" data-source="payment"><span class="source-label" data-fit>Paid?</span><p data-fit>$48.00</p></div>
      <div class="source message" data-source="supplier"><span class="source-label" data-fit>SUPPLIER</span><p data-fit>Update?</p></div>
      <div class="source sheet" data-source="sheet"><span class="source-label" data-fit>SHEET 1048</span><p data-fit>Tracking?</p></div></div>'''

poster_css = '''
*{box-sizing:border-box}html,body{margin:0}body{background:var(--paper);font-family:var(--sans);color:var(--ink)}
@font-face{font-family:Montserrat;src:url('../assets/Montserrat-VariableFont_wght.ttf') format('truetype');font-weight:100 900;font-display:block}
.poster{position:relative;width:1080px;height:1350px;background:var(--paper);overflow:hidden;isolation:isolate}
.poster .brand{position:absolute;left:64px;top:40px;width:224px;height:auto}
.poster h1{position:absolute;left:64px;top:125px;margin:0;font:500 100px/1.04 var(--sans);letter-spacing:-.045em;width:952px}
.poster h1 span{display:block}.poster h1 .between{color:var(--violet)}
.poster .support{position:absolute;left:64px;top:460px;width:952px;margin:0;font:400 48px/1.2 var(--sans);letter-spacing:-.025em}
.poster .sources{position:absolute;left:64px;top:554px;width:952px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;z-index:3}
.source{background:var(--sheet);border:2px solid rgb(var(--ink-rgb)/.15);padding:14px 16px;min-width:0}
.source-label{display:block;font:500 42px/1.15 var(--sans);letter-spacing:.01em;color:var(--deep-violet);white-space:nowrap}
.source p{margin:12px 0 0;font:400 48px/1.14 var(--sans);letter-spacing:-.035em;white-space:nowrap}
.source.message{border-radius:3px 18px 3px 3px}.source.receipt{transform:rotate(-1.1deg)}.source.sheet{transform:rotate(.8deg)}
.poster .record-wrap{position:absolute;left:64px;top:742px;width:952px;z-index:2}
.poster .fiction{position:absolute;left:64px;top:1112px;margin:0;font:400 42px/1.2 var(--sans);color:var(--muted)}
.poster .cta{position:absolute;left:64px;top:1190px;margin:0;font:600 52px/1.18 var(--sans);letter-spacing:-.035em;color:var(--deep-violet)}
.poster .destination{position:absolute;left:64px;top:1266px;margin:0;font:400 44px/1.18 var(--sans);letter-spacing:-.025em}
.poster .thread-links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:visible}
.thread-links path{fill:none;stroke:var(--violet);stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
.thread-links circle{fill:var(--paper);stroke:var(--violet);stroke-width:4}
.poster.square{height:1080px}.square h1{top:112px;font-size:88px;line-height:1.03}.square h1 .between{display:inline}.square h1 .apps{display:inline}
.square h1 .apps:before{content:' '}
.square .brand{top:32px;width:202px}.square .support{display:none}.square .sources{top:326px}
.square .record-wrap{top:502px}.square .fiction{top:878px}.square .cta{top:944px}.square .destination{top:1015px}
.poster.og{width:1200px;height:630px}.og .brand{left:64px;top:32px;width:216px}
.og h1{left:64px;top:122px;width:1072px;font-size:100px;line-height:1.02}
.og .sources,.og .thread-links,.og .record-wrap,.og .destination{display:none}
.og .support{top:454px;width:1072px}
.og .fiction{left:800px;top:520px;width:352px;font-size:42px;line-height:1.14;letter-spacing:-.03em}
.og .cta{left:64px;top:550px;font-size:52px;line-height:1.15}
'''
poster_js = '''
const format = new URLSearchParams(location.search).get('format');
if (format === 'square' || format === 'og') document.querySelector('.poster').classList.add(format);
function drawLinks(){
  const root=document.querySelector('.poster'), svg=root.querySelector('.thread-links');
  if(root.classList.contains('og')) return;
  const b=root.getBoundingClientRect();
  const mappings=[['payment','payment'],['supplier','supplier'],['sheet','held']];
  svg.innerHTML=mappings.map(([source,target],i)=>{
    const s=root.querySelector('[data-source="'+source+'"]').getBoundingClientRect();
    const row=root.querySelector('[data-row="'+target+'"]').getBoundingClientRect();
    const sx=s.left-b.left+s.width/2,sy=s.bottom-b.top;
    const tx=92,ty=row.top-b.top+row.height/2;
    const lane=40-i*12,turn=sy+10+i*6;
    return '<path data-source="'+source+'" data-target="'+target+'" d="M'+sx+' '+sy+' V'+turn+' Q'+sx+' '+(turn+6)+' '+(sx-6)+' '+(turn+6)+' H'+(lane+6)+' Q'+lane+' '+(turn+6)+' '+lane+' '+(turn+12)+' V'+(ty-12)+' Q'+lane+' '+ty+' '+(lane+12)+' '+ty+' H'+tx+'"/><circle cx="'+sx+'" cy="'+sy+'" r="7"/>';
  }).join('');
}
document.fonts.ready.then(drawLinks);
window.addEventListener('resize',drawLinks);
'''
poster_html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Weave community poster</title><style>:root{{{TOKENS}}}{RECORD_CSS}{poster_css}</style></head><body>
<main class="poster s2" aria-label="Weave: the business between the apps">
<img class="brand" src="../assets/weave-logo.svg" alt="Weave" width="224" height="65">
<h1><span data-fit>THE BUSINESS</span><span class="between" data-fit>BETWEEN</span><span class="apps" data-fit>THE APPS.</span></h1>
<p class="support" data-fit>The order is in. Now the chasing starts.</p>
{sources()}<div class="record-wrap">{compact_record('poster')}</div>
<svg class="thread-links" aria-hidden="true"></svg>
<p class="fiction" data-fit>Fictional workflow · USD</p><p class="cta" data-fit>Request a workflow review</p>
<p class="destination" data-fit>weave-lb.com/community</p></main><script>{poster_js}</script></body></html>'''
(ROOT / 'campaign/poster/poster.html').write_text(poster_html,encoding='utf8')

TABLE = [
('Orders','Store → sheet → DMs','One queue. One owner.',False),
('Payment','Trust a screenshot.','Match. Confirm.',True),
('Supplier','“Any update?” Again.','ETA + next check.',False),
('Fulfilment','“Who\'s sending it?”','Owner + hold status.',True),
('Tracking','Copy each tracking ID.','Linked to the order.',False),
('Support','Search every chat.','Status beside the reply.',False),
('Refunds','Remember it later.','Approval + refund record.',True),
('Reporting','Rebuild the totals.','Checked record totals.',False),
('Visibility','Ask everyone.','See blockers + owners.',False),
]
table_rows=''.join(f'<tr><th scope="row">{escape(work)}</th><td class="before"><span class="mobile-label" aria-hidden="true">Before</span>{escape(before)}</td><td class="after{" person" if human else ""}"><span class="mobile-label" aria-hidden="true">After</span>{escape(after)}</td></tr>' for work,before,after,human in TABLE)

def full_layer(n,key,line,body,human=False):
    return f'''<li class="layer" data-layer="{n}"{' data-human' if human else ''}>
    <div class="layer-face"><div class="layer-key"><span class="num" aria-hidden="true">{n:02}</span><h4>{key}</h4></div>
    <p class="line">{line}</p><div class="layer-body">{body}</div></div></li>'''

full_record = '<article class="record full-record" aria-labelledby="full-folio full-title"><header class="record-top"><span class="folio" id="full-folio">ORDER 1048</span><span class="micro">Connected record</span></header><div class="record-head"><h3 id="full-title">Dispatched.</h3><p>Tila Demo Store · 08 Oct</p></div><div class="layers-window"><ol class="layers" role="list">'
full_record += full_layer(1,'What came in','One order. One original record.', '''<dl class="fields"><div><dt class="field">Customer</dt><dd>Lina Haddad · Beirut</dd></div><div><dt class="field">Product</dt><dd>Canvas day bag · quantity 1</dd></div><div><dt class="field">Item / delivery</dt><dd>$42.00 / $6.00</dd></div><div><dt class="field">Total · USD</dt><dd>$48.00</dd></div></dl>''')
full_record += full_layer(2,'Payment checked','The screenshot is checked against a payment record.', '''<p>Screenshot received <time>07 Oct, 09:44</time> · $48.00 · <span class="folio">DEMO-P1048</span>.</p><p class="human-mark">Maya Nader confirms the matched payment <time>07 Oct, 10:02</time>.</p>''',True)
full_record += full_layer(3,'Supplier exception','A delay stops dispatch and creates a next action.', '''<p>Cedar Demo Supply · <time>07 Oct, 11:05</time></p><blockquote>“1048: dispatch moved to tomorrow.”</blockquote><p class="exception"><span class="glyph" aria-hidden="true">⚑</span> Supplier delayed · dispatch held.</p><p class="human-mark">Maya → next check <time>07 Oct, 11:30</time>.</p><p class="human-mark">Maya approves the delay message · sent <time>07 Oct, 11:12</time>.</p><blockquote>“Your order is delayed at the supplier. Next update tomorrow morning.”</blockquote>''')
full_record += full_layer(4,'What happened next','Confirmation releases fulfilment. Tracking stays attached.', '''<p>Supplier confirms dispatch <time>08 Oct, 09:10</time>.</p><p class="human-mark">Maya releases fulfilment after confirmation.</p><dl class="fields"><div><dt class="field">Courier / dispatch</dt><dd>Demo Courier · <time>08 Oct, 10:20</time></dd></div><div><dt class="field">Tracking linked</dt><dd><span class="folio">DEMO-LB1048</span> · <time>08 Oct, 10:22</time></dd></div></dl>''')
full_record += full_layer(5,'Customer informed','The customer gets the update. The record keeps it.', '''<blockquote>“Your order has dispatched. Tracking: DEMO-LB1048.”</blockquote><p>Sent <time>08 Oct, 10:24</time>.</p>''')
full_record += full_layer(6,'What remains','Clear status. Named owner. Retained history.', '''<p>Record updated <time>08 Oct, 10:25</time>.</p><p>Paid $48.00 · dispatched · tracking linked · customer informed.</p><p class="human-mark">Owner: Maya Nader.</p><p class="owner-totals">1 dispatched · 0 unresolved exceptions</p><p>The resolved supplier delay stays in the history of this one-order example.</p>''')
full_record += '</ol></div></article>'

landing_css = '''
@font-face{font-family:Montserrat;src:url('assets/Montserrat-VariableFont_wght.ttf') format('truetype');font-weight:100 900;font-style:normal;font-display:swap}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:400 18px/1.65 var(--sans);-webkit-font-smoothing:antialiased}
.community :is(h1,h2,h3,h4,p,figure,blockquote){margin-top:0}.community figure{margin:0}.community [hidden]{display:none!important}
.community :is(a,button,input,textarea):focus-visible{outline:3px solid var(--violet);outline-offset:5px}
.community .container{width:min(1120px,calc(100% - 48px));margin-inline:auto}
.community .masthead{padding:30px 0 18px}.community .brand{display:inline-block;line-height:0;min-height:48px}
.community .brand img{width:176px;height:auto}.community .eyebrow{font-size:14px;font-weight:500;letter-spacing:.09em;line-height:1.5;margin-bottom:20px;color:var(--deep-violet)}
.community .hero{padding:36px 0 84px}.community .hero-grid{display:grid;gap:54px}
.community h1{font-size:clamp(40px,5vw,64px);line-height:1.04;letter-spacing:-.045em;font-weight:500;margin-bottom:28px}
.community h1 span{display:block}.community h1 .between{color:var(--violet)}
.community .hero-copy p{max-width:34em;margin-bottom:16px}.community .hero-copy .lead{font-size:18px;line-height:1.65}
.community .cta{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:14px 24px;border:1px solid var(--violet);border-radius:3px;background:var(--violet);color:var(--sheet);font:600 16px/1.4 var(--sans);cursor:pointer;text-align:center;text-decoration:none;transition:background var(--dur-fast) var(--ease-out)}
.community .cta:hover{background:var(--deep-violet)}.community .hero-copy .cta{margin:14px 0 16px}
.community .supporting{font-size:16px;line-height:1.6;max-width:30em;color:var(--muted)}
.community .hero-demo{align-self:center;min-width:0}.community .sources{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 40px;position:relative}
.community .source{position:relative;background:var(--sheet);padding:12px 10px;border:1px solid rgb(var(--ink-rgb)/.15);min-width:0;min-height:94px}
.community .source:after{content:'';position:absolute;left:50%;top:100%;height:40px;width:2px;background:var(--violet)}
.community .source-label{display:block;color:var(--deep-violet);font-size:12px;line-height:1.4;letter-spacing:.025em;font-weight:600}
.community .source p{font-size:17px;line-height:1.3;letter-spacing:-.025em;margin:8px 0 0}
.community .source.message{border-radius:3px 14px 3px 3px}.community .hero-demo .record{--rs:18px}
:where(.s2).community .compact .record-top{min-height:42px;padding:12px 14px;gap:12px}
:where(.s2).community .compact .record-top .folio{font-size:14px;white-space:nowrap}
:where(.s2).community .compact .record-top .micro{font-size:13px;letter-spacing:-.015em}
:where(.s2).community .compact .layer{--gutter:32px;--knot:27px;--key:26px;min-height:54px;padding:10px 14px 10px 40px;column-gap:8px}
:where(.s2).community .compact .layer:before{width:2px;left:15px}
:where(.s2).community .compact .layer:after{width:10px;height:10px;left:11px;top:calc(var(--knot) - 5px);border-width:2px}
:where(.s2).community .compact .num{font-size:22px}
:where(.s2).community .compact .line{font-size:18px;line-height:1.5}
:where(.s2).community .compact .payment-action{width:28px;height:28px;font-size:14px;border-width:1px}
.community .caption{font-size:14px;line-height:1.55;color:var(--muted);margin:24px 0 0}
.community .section{padding:80px 0;border-top:1px solid rgb(var(--ink-rgb)/.14)}
.community h2{font-size:clamp(30px,3.6vw,46px);line-height:1.1;letter-spacing:-.04em;font-weight:500;margin-bottom:24px;text-wrap:balance}
.community .intro{max-width:740px;margin-bottom:42px}.community .intro p{margin-bottom:16px}
.community .full-record{--rs:18px;--gutter:72px;--key:144px}
.community .full-record .record-top{padding:18px 28px 18px 72px}.community .full-record .record-top .folio{font-size:15px}
.community .full-record .record-top .micro{font-size:12px}.community .full-record .record-head{padding:26px 28px 26px 72px}
.community .full-record .layer-key h4{font-size:13px}.community .full-record .field{font-size:12px}
.community .full-record .layer{padding:30px 28px 30px 72px;row-gap:18px;column-gap:24px}
.community .full-record .layer:before{left:35px}.community .full-record .layer:after{left:30px;top:43px;width:12px;height:12px}
.community .full-record .layer:last-child:before{height:49px}.community .full-record .line{font-size:24px}
.community .full-record .layer-body{padding-top:18px}.community .full-record .layer-body p+p{margin-top:16px}
.community .full-record blockquote{margin:16px 0;padding:0 0 0 16px;border-left:1px solid rgb(var(--ink-rgb)/.24)}
.community .full-record .layer-body .fields{margin-top:20px}.community .owner-totals{font-weight:500;color:var(--deep-violet)}
.community .comparison{width:100%;border-collapse:collapse;text-align:left;font-size:18px;line-height:1.5}
.community .comparison th,.community .comparison td{padding:24px 20px;border-bottom:1px solid rgb(var(--ink-rgb)/.14);vertical-align:top}
.community .comparison thead th{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--deep-violet);font-weight:600;padding-top:0}
.community .comparison tbody th{width:22%;font-weight:500;padding-left:0}.community .comparison .before{width:35%;color:var(--muted)}
.community .comparison .after{color:var(--deep-violet);font-weight:500}.community .comparison .person{color:var(--ink)}
.community .comparison .person:before{content:'';display:inline-block;width:3px;height:1.15em;background:var(--orange);margin-right:12px;vertical-align:-.2em}
.community .mobile-label{display:none}.community .offer{max-width:800px}.community .offer .closing{font-size:22px;line-height:1.5;letter-spacing:-.02em;font-weight:500;margin-top:28px}
.community .origin{background:var(--ink);color:var(--paper)}.community .origin p{max-width:790px;margin-bottom:0;font-size:20px;line-height:1.7}
.community .review-grid{display:grid;gap:40px}.community .review-heading p{max-width:26em}
.community form{display:grid;gap:24px}.community .field-group label{display:block;font-weight:500;font-size:17px;margin-bottom:8px;line-height:1.45}
.community .helper{font-size:14px;line-height:1.55;color:var(--muted);margin:8px 0 0}
.community :is(input,textarea){display:block;width:100%;min-height:52px;font:400 17px/1.5 var(--sans);color:var(--ink);background:var(--sheet);border:1px solid rgb(var(--ink-rgb)/.4);border-radius:3px;padding:13px 14px}
.community textarea{min-height:170px;resize:vertical}.community input::placeholder,.community textarea::placeholder{color:var(--muted);opacity:1}
.community .field-error{color:var(--deep-violet);font-weight:500;font-size:14px;margin:8px 0 0}
.community [aria-invalid='true']{border:2px solid var(--violet)}.community .form-error{border-left:3px solid var(--violet);padding:14px 18px;background:var(--sheet);margin:0;font-size:16px}
.community form .cta{width:100%}.community .cta:disabled{cursor:wait;opacity:.8}.community .data-use{margin:0;font-size:14px;line-height:1.6;color:var(--muted)}
.community .confirmation{border-top:2px solid var(--violet);background:var(--sheet);padding:32px}.community .confirmation h3{font-size:26px;line-height:1.2;letter-spacing:-.025em;font-weight:500}
.community .questions{max-width:820px}.community .question{margin-bottom:32px}.community .question h3{font-size:20px;line-height:1.4;font-weight:500;letter-spacing:-.02em;margin-bottom:10px}.community .question p{margin-bottom:0}
.community .closing-cta{margin-top:46px}.community .footer{border-top:1px solid rgb(var(--ink-rgb)/.14);padding:30px 0;font-size:14px;color:var(--muted)}
.community .dev-warning{padding:18px 24px;border:2px solid var(--violet);background:var(--sheet);font-size:15px;color:var(--ink);margin-top:20px}
.community .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.community .record.full-record{--draw:1}.js .community .record.full-record:before{content:'';position:absolute;left:0;top:0;width:2px;height:100%;background:var(--violet);transform:scaleY(var(--draw));transform-origin:top;transition:transform 1.2s var(--ease-inout);pointer-events:none}
@media(min-width:1000px){.community .hero-grid{grid-template-columns:44fr 56fr;gap:48px}.community .review-grid{grid-template-columns:38fr 62fr;gap:72px}}
@media(max-width:767px){.community{font-size:17px}.community .masthead{padding:22px 0 10px}.community .brand img{width:160px}.community .hero{padding:24px 0 64px}.community .hero-grid{gap:40px}.community .eyebrow{margin-bottom:18px}.community h1{margin-bottom:24px}.community .hero-copy .lead{font-size:17px;line-height:1.6}.community .hero-copy .cta{width:100%;margin-top:10px}.community .supporting{font-size:16px;margin-bottom:0}.community .section{padding:64px 0}.community h2{font-size:30px}.community .intro{margin-bottom:32px}
 .community .full-record{--rs:17px;--gutter:32px}.community .full-record .record-top{padding:14px 16px;gap:8px}.community .full-record .record-top .folio{font-size:13px}.community .full-record .record-top .micro{font-size:11px;letter-spacing:.04em}
 .community .full-record .record-head{padding:22px 20px}.community .full-record .record-head h3{font-size:27px}.community .full-record .record-head p{font-size:14px}
 .community .full-record .layer{grid-template-columns:minmax(0,1fr);grid-template-areas:'key' 'line' 'body';padding:24px 20px 24px 32px;row-gap:16px}
 .community .full-record .layer-key{flex-direction:row;align-items:center;gap:12px}.community .full-record .num{font-size:28px}.community .full-record .layer-key h4{font-size:12px;letter-spacing:.055em}
 .community .full-record .layer:before{left:13px}.community .full-record .layer:after{left:8px;top:34px}.community .full-record .layer:last-child:before{height:40px}.community .full-record .line{font-size:21px;line-height:1.35}
 .community .full-record .fields{grid-template-columns:minmax(0,1fr)}.community .full-record .layer-body{font-size:16px;line-height:1.65}.community .full-record .folio{overflow-wrap:anywhere}
 .community .comparison thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.community .comparison,.community .comparison tbody,.community .comparison tr,.community .comparison th,.community .comparison td{display:block;width:100%}
 .community .comparison tr{padding:22px 0;border-bottom:1px solid rgb(var(--ink-rgb)/.14)}.community .comparison th,.community .comparison td{padding:0;border:0}.community .comparison tbody th{width:100%;font-size:19px;margin-bottom:12px}
 .community .comparison .before{width:100%;font-size:17px}.community .comparison .after{margin-top:8px;font-size:17px}.community .mobile-label{display:inline-block;font-size:12px;letter-spacing:.03em;min-width:58px;margin-right:10px;color:var(--muted);font-weight:400}
 .community .comparison .person:before{margin-right:8px}.community .origin p{font-size:18px}.community .review-grid{gap:28px}.community .confirmation{padding:24px}.community .offer .closing{font-size:21px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.community *{transition:none!important;animation:none!important}.js .community .record.full-record:before{transform:none}}
'''

landing_js = '''
(() => {
  'use strict';
  const form = document.getElementById('review-form');
  const dev = new URLSearchParams(location.search).get('dev') === '1';
  const warning = document.getElementById('dev-warning');
  const name = document.getElementById('review-name');
  const button = document.getElementById('submit-review');
  const failure = document.getElementById('form-failure');
  const confirmation = document.getElementById('confirmation');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  form.noValidate = true;
  document.querySelector('.brand').href = HOMEPAGE_LIVE ? '/' : '#top';
  if (FORM_ENDPOINT) form.action = FORM_ENDPOINT;
  if (dev && !FORM_ENDPOINT) warning.hidden = false;
  document.querySelectorAll('[data-review-cta]').forEach(cta => cta.addEventListener('click',event => {
    event.preventDefault();
    document.getElementById('review').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    name.focus({preventScroll:true});
  }));
  function validate(){
    let first = null;
    ['name','email','process'].forEach(key => {
      const field=document.getElementById('review-'+key), error=document.getElementById(key+'-error');
      const valid=field.value.trim().length>0 && (key!=='email' || field.validity.valid);
      field.setAttribute('aria-invalid',String(!valid));
      error.hidden=valid;
      if(!valid && !first) first=field;
    });
    if(first) first.focus();
    return !first;
  }
  form.addEventListener('input',event => {
    if(event.target.matches('input,textarea') && event.target.getAttribute('aria-invalid')==='true'){
      event.target.removeAttribute('aria-invalid');
      document.getElementById(event.target.name+'-error').hidden=true;
    }
  });
  form.addEventListener('submit',async event => {
    event.preventDefault(); failure.hidden=true;
    if(!validate()) return;
    button.disabled=true; button.textContent='Sending your request…'; form.setAttribute('aria-busy','true');
    const submittedAt=new Date().toISOString();
    const payload={name:name.value.trim(),email:document.getElementById('review-email').value.trim(),process:document.getElementById('review-process').value.trim(),source:'community',submittedAt};
    document.getElementById('submitted-at').value=submittedAt;
    try {
      if(!FORM_ENDPOINT && !dev) throw new Error('Endpoint not configured');
      if(FORM_ENDPOINT){
        const response=await fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
        if(!response.ok) throw new Error('Request failed');
      } else {
        // Explicit preview exception: only ?dev=1 can simulate success.
        await new Promise(resolve=>setTimeout(resolve,300));
        document.getElementById('dev-confirmation').hidden=false;
      }
      form.hidden=true; confirmation.hidden=false;
      document.getElementById('confirmation-title').focus();
    } catch(error) {
      failure.hidden=false; failure.focus();
    } finally {
      button.disabled=false; button.textContent='Request a workflow review'; form.removeAttribute('aria-busy');
    }
  });
  const record=document.querySelector('.full-record');
  if(!reduced.matches && 'IntersectionObserver' in window){
    record.style.setProperty('--draw','0');
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){record.style.setProperty('--draw','1');observer.disconnect();}
    },{threshold:.05}); observer.observe(record);
    reduced.addEventListener('change',event=>{if(event.matches){record.style.setProperty('--draw','1');observer.disconnect();}},{once:true});
  }
})();
'''

community = escape(COMMUNITY_NAME) if not COMMUNITY_NAME.startswith('[') else 'this community'
logo_href = '/' if HOMEPAGE_LIVE else '#top'
landing_html = f'''<!doctype html>
<html lang="en" class="no-js"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#F5F5F2">
<title>The business between the apps — Weave workflow review</title>
<meta name="description" content="Bring one repeated process that feels manual, messy, or too dependent on you. Request a workflow review with Weave.">
<link rel="canonical" href="https://weave-lb.com/community"><link rel="icon" type="image/svg+xml" href="assets/weave-logo.svg">
<meta property="og:type" content="website"><meta property="og:url" content="https://weave-lb.com/community">
<meta property="og:title" content="The business between the apps — Weave">
<meta property="og:description" content="Bring one messy, repeated process. Request a workflow review with Weave.">
<meta property="og:image" content="https://weave-lb.com/community/assets/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Weave. The business between the apps. The order is in. Now the chasing starts. Request a workflow review.">
<meta name="twitter:card" content="summary_large_image">
<script>
const FORM_ENDPOINT = {json.dumps(FORM_ENDPOINT)};
const HOMEPAGE_LIVE = {str(HOMEPAGE_LIVE).lower()};
document.documentElement.classList.replace('no-js','js');
</script>
<style>:root{{{TOKENS}}}{RECORD_CSS}{landing_css}</style>
</head><body class="community s2">
<header class="masthead container" id="top"><a class="brand" href="{logo_href}" aria-label="Weave — top of page"><img src="assets/weave-logo.svg" alt="Weave" width="176" height="51"></a></header>
<main>
<section class="hero container" aria-labelledby="hero-title"><div class="hero-grid">
<div class="hero-copy"><p class="eyebrow">For members of {community}</p>
<h1 id="hero-title"><span>THE BUSINESS</span><span class="between">BETWEEN</span><span>THE APPS.</span></h1>
<p class="lead">The order is in. Now you're checking the payment, chasing the supplier, sending the tracking number, and updating the sheet.</p>
<p>Weave studies those handoffs and builds a practical system around how your business actually runs.</p>
<a class="cta" href="#review" data-review-cta>Request a workflow review</a>
<p class="supporting">Bring one repeated process. We'll spend about 30 minutes understanding it with you.</p></div>
<figure class="hero-demo">{sources()} {compact_record('hero')}<figcaption class="caption">Fictional workflow · USD</figcaption></figure>
</div></section>
<section class="section" aria-labelledby="demo-title"><div class="container"><div class="intro">
<h2 id="demo-title">One order. Every handoff attached.</h2>
<p>A payment screenshot is something to check. A supplier delay needs an owner. A tracking number needs to reach the customer and stay attached to the order.</p>
<p>The system connects what came in, what was checked, who acted, and what happens next.</p></div>
<figure>{full_record}<figcaption class="caption">Illustrative example. All business data is fictional.</figcaption></figure>
</div></section>
<section class="section" aria-labelledby="comparison-title"><div class="container"><h2 id="comparison-title">Same work. Clearer control.</h2>
<table class="comparison" aria-labelledby="comparison-title"><thead><tr><th scope="col">Work</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>{table_rows}</tbody></table>
<p class="caption">Illustrative workflow. Exact connections and rules depend on your tools and process.</p></div></section>
<section class="section" aria-labelledby="offer-title"><div class="container offer">
<h2 id="offer-title">What process in your business is taking too much time?</h2>
<p>Bring one repeated process that feels manual, messy, or too dependent on you.</p>
<p>In about 30 minutes, we'll walk through the steps, tools, and exceptions with you. Then we'll show what we'd change, automate, or build into a system.</p>
<p>It could be payment checks, supplier follow-ups, tracking updates, refunds, or the report you rebuild every week.</p>
<p class="closing">You don't need a software brief. Start with the work.</p></div></section>
<section class="section origin" aria-labelledby="origin-title"><div class="container"><h2 id="origin-title">Where this started.</h2>
<p>Weave started inside a port operation: stacks of paperwork, about two hours of typing per stack, several stacks a week. One of our founders built the app that took that work over. It's been live since May 2026. Same approach here: understand the work, find what everyone's quietly working around, build straight at it.</p></div></section>
<section class="section" id="review" aria-labelledby="review-title"><div class="container review-grid"><div class="review-heading"><h2 id="review-title">Bring your process.</h2></div><div>
<p class="dev-warning" id="dev-warning" hidden role="status"><strong>Development preview:</strong> FORM_ENDPOINT is empty. Requests are not delivered. Success is simulated only with ?dev=1. Notification inbox: {escape(NOTIFICATION_INBOX)}.</p>
<form id="review-form" action="{escape(FORM_ENDPOINT,quote=True)}" method="post">
<div class="field-group"><label for="review-name">Your name</label><input id="review-name" name="name" autocomplete="name" required aria-describedby="name-error"><p class="field-error" id="name-error" hidden>Enter your name.</p></div>
<div class="field-group"><label for="review-email">Email</label><input id="review-email" name="email" type="email" autocomplete="email" required aria-describedby="email-help email-error"><p class="helper" id="email-help">We'll reply here to arrange the review.</p><p class="field-error" id="email-error" hidden>Enter a valid email address.</p></div>
<div class="field-group"><label for="review-process">What process in your business is taking too much time?</label><textarea id="review-process" name="process" required aria-describedby="process-help process-error" placeholder="I check payment screenshots, message suppliers, and update a sheet for every order."></textarea><p class="helper" id="process-help">One or two sentences is enough. Mention the tools involved.</p><p class="field-error" id="process-error" hidden>Tell us which process you'd like to review.</p></div>
<input type="hidden" name="source" value="community"><input type="hidden" name="submittedAt" id="submitted-at" value="">
<p class="form-error" id="form-failure" tabindex="-1" role="alert" hidden>Your request couldn't be sent. Your answers are still here. Please try again.</p>
<button class="cta" type="submit" id="submit-review">Request a workflow review</button>
<p class="data-use">We'll use these details to respond to your workflow review request.</p>
</form>
<section class="confirmation" id="confirmation" hidden aria-labelledby="confirmation-title" aria-live="polite">
<p id="dev-confirmation" class="helper" hidden><strong>Development preview only — no request was delivered.</strong></p>
<h3 id="confirmation-title" tabindex="-1">Your workflow review request is in.</h3>
<p>We'll email you to arrange a time. The review takes about 30 minutes and focuses on the process you described.</p>
<p>Before we speak, think of one recent example: where it started, what you had to check or chase, and where it got stuck.</p></section>
</div></div></section>
<section class="section" aria-label="Questions about the workflow review"><div class="container questions">
<div class="question"><h3>Is this a sales call?</h3><p>It's a workflow review with the people who would build the system. If there's a fit, we may discuss paid work. Any build is scoped and priced separately, and you decide whether to continue.</p></div>
<div class="question"><h3>Do I have to replace all my tools?</h3><p>We start with what you use today. The review establishes which tools, connections, and process changes make sense for your workflow.</p></div>
<div class="question"><h3>What if I don't need custom software?</h3><p>We'll say so. The useful next step may be a clearer process, a better use of a tool you already have, or a system worth building.</p></div>
<div class="question"><h3>What should I prepare?</h3><p>One process and one recent example. You can describe it; there's no need to upload business records to request the review.</p></div>
<a class="cta closing-cta" href="#review" data-review-cta>Request a workflow review</a></div></section>
</main><footer class="footer"><div class="container">Weave · Built around the work.</div></footer>
<script>{landing_js}</script></body></html>'''
(ROOT / 'community/index.html').write_text(landing_html,encoding='utf8')

proof = "Before Weave, I built an operations app for a port. It took over the manual typing from stacks of paperwork — about two hours a stack, several stacks a week."
if POSTING_FOUNDER == 'Ali':
    proof = "Before Weave, my co-founder Ibrahim built an operations app for a port that took over hours of manual typing from paperwork every week."
primary = f'''Order in. Now the chasing starts.

Check the payment screenshot. Message the supplier. Update the sheet. Find the tracking number. Reply to “where's my order?”

I'm one of Weave's founders.
{proof}

This is the part of a business we work on: **the business between the apps.**

We study how the work actually happens, then build a system around it: checks, owners, next actions, and records that stay together.

The attached example uses fictional business data. Its supplier delay is still open: Maya owns the follow-up, the next check is 11:30, and dispatch is held.

For members here, we're offering a workflow review. Bring one repeated process that feels manual, messy, or too dependent on you. We'll spend about 30 minutes understanding it and show what we'd change, automate, or build into a system.

**What process keeps pulling you back in?**

Request a workflow review: https://weave-lb.com/community'''
short = f'''Payment screenshots. Supplier chasing. Tracking updates. Another sheet to update.

I'm one of Weave's founders.
{proof}

We build systems around that work: **the business between the apps.** The attached example uses fictional business data.

Members here can bring one messy, repeated process for a workflow review. About 30 minutes to understand it and show what we'd change or build.

Request a workflow review: https://weave-lb.com/community'''
caption = 'The business between the apps. Bring one messy process: https://weave-lb.com/community'
post = f'''# Community post copy — Phase 1

Attach **weave-community-poster.png**. The video is Phase 2. Discord doesn't autoplay video, so the poster carries the post.

Posting founder: **{POSTING_FOUNDER}** (default). Community: **{COMMUNITY_NAME}**; published copy says “members here.” Publish the landing page and configure the review form before posting.

## Primary Discord post

{primary}

## Short Discord / WhatsApp version

{short}

## One-line caption

{caption}

## If Ali posts

Replace the proof paragraph in either founder version with:

Before Weave, my co-founder Ibrahim built an operations app for a port that took over hours of manual typing from paperwork every week.
'''
(ROOT / 'campaign/post.md').write_text(post,encoding='utf8')
(ROOT / 'campaign/data/order-1048.json').write_text(json.dumps(DATA,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
manifest = {'phase':1,'FORM_ENDPOINT':FORM_ENDPOINT,'HOMEPAGE_LIVE':HOMEPAGE_LIVE,'COMMUNITY_NAME':COMMUNITY_NAME,'NOTIFICATION_INBOX':NOTIFICATION_INBOX,'POSTING_FOUNDER':POSTING_FOUNDER,'fontSha256':hashlib.sha256(FONT.read_bytes()).hexdigest(),'logoGeometryPreserved':True,'postLengths':{'primary':len(primary),'short':len(short),'caption':len(caption)}}
(ROOT / 'campaign/config.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
print(json.dumps({'created':'Phase 1 HTML, local assets, dataset and post copy','postLengths':manifest['postLengths']},indent=2))
