"""Render and exercise Phase 1 using headless Chromium. Local fixtures only."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse, parse_qs, parse_qsl
from PIL import Image
import json
import os
import re
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[2]
QA=ROOT/'campaign/qa'
POSTER=ROOT/'campaign/poster'
PORT=8765
BASE=f'http://127.0.0.1:{PORT}'
received=[]
checks=[]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):
        pass
    def do_GET(self):
        url=urlparse(self.path)
        if url.path=='/__configured':
            status=parse_qs(url.query).get('status',['200'])[0]
            native=parse_qs(url.query).get('native',['0'])[0]=='1'
            endpoint=f'{BASE}/__review?status={status}&native={int(native)}'
            page=(ROOT/'community/index.html').read_text(encoding='utf8')
            page=page.replace('const FORM_ENDPOINT = "";',f'const FORM_ENDPOINT = {json.dumps(endpoint)};')
            page=page.replace('action=""',f'action="{endpoint.replace("&","&amp;")}"')
            page=page.replace('href="assets/','href="/community/assets/').replace('src="assets/','src="/community/assets/').replace("url('assets/","url('/community/assets/")
            body=page.encode('utf8')
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        else:
            super().do_GET()
    def do_POST(self):
        url=urlparse(self.path)
        if url.path!='/__review':
            self.send_error(503,'Review endpoint not configured');return
        body=self.rfile.read(int(self.headers.get('Content-Length','0'))).decode('utf8')
        payload=json.loads(body) if 'application/json' in self.headers.get('Content-Type','') else dict(parse_qsl(body))
        received.append({'contentType':self.headers.get('Content-Type'),'payload':payload})
        status=int(parse_qs(url.query).get('status',['200'])[0])
        result=b'<!doctype html><html lang="en"><title>Native fixture</title><h1>Native request received</h1></html>' if status!=204 else b''
        self.send_response(status);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(result)));self.end_headers();self.wfile.write(result)

server=ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
Thread(target=server.serve_forever,daemon=True).start()

def check(name,condition,details=None):
    checks.append({'name':name,'pass':bool(condition),'details':details})
    print(('PASS ' if condition else 'FAIL ')+name,flush=True)

def ready(page,url):
    page.goto(url,wait_until='networkidle')
    page.evaluate('document.fonts.ready')

def fill(page):
    page.locator('#review-name').fill('QA Operator')
    page.locator('#review-email').fill('qa@example.test')
    page.locator('#review-process').fill('I check payments, chase suppliers, and update an orders sheet.')

FIT_JS='''() => Array.from(document.querySelectorAll('[data-fit]')).filter(el=>el.getClientRects().length).map(el=>{
 const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();
 const limit=getComputedStyle(el).display==='inline'?el.parentElement.getBoundingClientRect():box;
 return {text:el.textContent.trim(),font:getComputedStyle(el).fontSize,overflow:text.right>limit.right+1||text.left<limit.left-1};
})'''
OVERLAP_JS='''() => {
 const root=document.querySelector('.poster'),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),blocks=[],canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');let n;
 while(n=walker.nextNode()){if(!n.textContent.trim()||n.parentElement.closest('script,style,[aria-hidden="true"]')||!n.parentElement.getClientRects().length)continue;
 const style=getComputedStyle(n.parentElement);ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;const m=ctx.measureText(n.textContent.trim());
 const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width&&b.height){const baseline=b.bottom-m.fontBoundingBoxDescent;blocks.push({text:n.textContent.trim(),left:b.left,top:baseline-m.actualBoundingBoxAscent,right:b.right,bottom:baseline+m.actualBoundingBoxDescent});}}
 const hits=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){let a=blocks[i],b=blocks[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)hits.push([a.text,b.text]);}return hits;
}'''

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':1080,'height':1350},device_scale_factor=1)
        console=[]
        page.on('pageerror',lambda error:console.append(str(error)))
        for fmt,width,height,file in [('portrait',1080,1350,'weave-community-poster.png'),('square',1080,1080,'weave-community-poster-square.png'),('og',1200,630,'og.png')]:
            page.set_viewport_size({'width':width,'height':height})
            ready(page,BASE+'/campaign/poster/poster.html'+('' if fmt=='portrait' else '?format='+fmt))
            fit=page.evaluate(FIT_JS)
            overlaps=page.evaluate(OVERLAP_JS)
            check(fmt+' text fits',not any(x['overflow'] for x in fit),fit)
            check(fmt+' no text overlaps',not overlaps,overlaps)
            page.locator('.poster').screenshot(path=str(POSTER/file),animations='disabled')
            if fmt!='og':
                expected=[{'source':'payment','target':'payment'},{'source':'supplier','target':'supplier'},{'source':'sheet','target':'held'}]
                actual=page.locator('.thread-links path').evaluate_all('(els)=>els.map(e=>({source:e.dataset.source,target:e.dataset.target}))')
                check(fmt+' source links map to correct record rows',actual==expected,actual)
                check(fmt+' frozen state held',page.locator('[data-held] .line').inner_text()=='Dispatch held')
        context=browser.new_context(viewport={'width':1080,'height':1350},device_scale_factor=2)
        double=context.new_page();ready(double,BASE+'/campaign/poster/poster.html')
        double.locator('.poster').screenshot(path=str(POSTER/'weave-community-poster@2x.png'),animations='disabled');context.close()
        Image.open(POSTER/'weave-community-poster.png').resize((360,450),Image.Resampling.LANCZOS).save(QA/'poster-360.png')
        (ROOT/'community/assets/og.png').write_bytes((POSTER/'og.png').read_bytes())

        for width,height in [(360,800),(768,1024),(1280,900)]:
            page.set_viewport_size({'width':width,'height':height})
            ready(page,BASE+'/community/')
            check(f'landing {width} no horizontal scroll',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            check(f'landing {width} logo stays on page',page.locator('.brand').get_attribute('href')=='#top')
            if width==360:
                metrics=page.evaluate('''() => {const s=document.querySelector('.supporting').getBoundingClientRect(),d=document.querySelector('.hero-demo').getBoundingClientRect();return {supportBottom:s.bottom,demoTop:d.top,visible:['.eyebrow','h1','.hero-copy .lead','.hero-copy .cta','.supporting'].every(q=>{const e=document.querySelector(q);return !!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'}),tableStacked:getComputedStyle(document.querySelector('.comparison tr')).display==='block'};}''')
                check('360 all hero copy precedes demo',metrics['visible'] and metrics['supportBottom']<=metrics['demoTop'],metrics)
                check('360 comparison stacked',metrics['tableStacked'])
            page.screenshot(path=str(QA/f'landing-{width}.png'),animations='disabled')
            page.screenshot(path=str(QA/f'landing-{width}-full.png'),full_page=True,animations='disabled')
            if width in [360,1280]:
                for label,selector in [('record','.full-record'),('comparison','.comparison'),('origin','.origin'),('form','#review')]:
                    page.locator(selector).screenshot(path=str(QA/f'{label}-{width}.png'),animations='disabled')
        page.set_viewport_size({'width':1280,'height':900});ready(page,BASE+'/community/')
        dataset=json.loads((ROOT/'campaign/data/order-1048.json').read_text(encoding='utf8'))
        record_text=page.locator('.full-record').inner_text()
        values=[dataset[key] for key in ['store','order','customer','location','item','paymentReference','paymentReceived','paymentConfirmed','owner','supplier','delayMessage','delayAt','nextCheck','delayUpdate','delayUpdateSent','supplierConfirmed','courier','dispatched','tracking','trackingLinked','customerUpdate','customerUpdateSent','recordUpdated','ownerView']]
        check('full record retains canonical dataset',all(value in record_text for value in values),[v for v in values if v not in record_text])
        check('canonical amounts retained',all('$'+dataset[key] in record_text for key in ['unitPrice','delivery','total']))
        check('nine comparison rows',page.locator('.comparison tbody tr').count()==9)
        check('only human comparison rows marked orange',page.locator('.comparison .person').evaluate_all('(els)=>els.map(el=>el.parentElement.querySelector("th").textContent)')==['Payment','Fulfilment','Refunds'])
        pdf_fit=page.evaluate('''() => Array.from(document.querySelectorAll('.comparison td')).map(el=>{const p=document.createElement('p');p.style.cssText='position:absolute;left:-9999px;width:342px;font:400 48px/54px Montserrat;margin:0;letter-spacing:0';p.textContent=Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('');document.body.append(p);const result={text:p.textContent,lines:Math.round(p.getBoundingClientRect().height/54)};p.remove();return result;})''')
        check('comparison copy fits future 48px / 342px spec',all(item['lines']<=2 for item in pdf_fit),pdf_fit)
        production_files=[path for folder in [ROOT/'campaign/poster',ROOT/'campaign/assets',ROOT/'campaign/components',ROOT/'community'] for path in folder.rglob('*') if path.suffix in ['.html','.css','.svg']]
        forbidden_colors=['#1c0051','#5800ff','#f05023','#bf340d']
        color_hits=[str(path.relative_to(ROOT)) for path in production_files if any(color in path.read_text(encoding='utf8').lower() for color in forbidden_colors)]
        check('production assets contain no superseded colors',not color_hits,color_hits)
        page.set_viewport_size({'width':360,'height':800})
        ready(page,BASE+'/community/')
        page.locator('[data-review-cta]').first.click()
        check('CTA focuses first field',page.locator('#review-name').evaluate('(e)=>e===document.activeElement'))
        page.locator('#submit-review').click()
        check('empty form exact validation',page.locator('#name-error').is_visible() and page.locator('#name-error').inner_text()=='Enter your name.')
        fill(page);page.locator('#submit-review').click()
        check('empty endpoint never claims success',page.locator('#form-failure').is_visible() and not page.locator('#confirmation').is_visible())
        check('failure retains all answers',page.locator('#review-name').input_value()=='QA Operator' and page.locator('#review-process').input_value().startswith('I check payments'))
        check('dev warning absent in production',not page.locator('#dev-warning').is_visible())
        page.screenshot(path=str(QA/'form-failure-360.png'),animations='disabled')

        ready(page,BASE+'/community/?dev=1');fill(page);page.locator('#submit-review').click()
        page.locator('#confirmation').wait_for(state='visible')
        check('dev simulation visibly labeled',page.locator('#dev-warning').is_visible() and page.locator('#dev-confirmation').is_visible())

        for status in [200,204,500]:
            ready(page,BASE+'/__configured?status='+str(status));fill(page)
            page.locator('#submit-review').focus();page.keyboard.press('Enter')
            page.wait_for_function("!document.getElementById('submit-review').disabled")
            check(f'keyboard POST {status} correct outcome',page.locator('#confirmation').is_visible() if status<300 else page.locator('#form-failure').is_visible())
            payload=received[-1]['payload']
            check(f'POST {status} exact JSON keys',set(payload)=={'name','email','process','source','submittedAt'} and payload['source']=='community' and bool(payload['submittedAt']),payload)
        nojs=browser.new_context(java_script_enabled=False,viewport={'width':360,'height':800})
        native=nojs.new_page();native.goto(BASE+'/__configured?native=1');fill(native)
        native.locator('#submit-review').focus()
        with native.expect_navigation(wait_until='domcontentloaded'):native.keyboard.press('Enter')
        check('no-JS native POST reaches configured endpoint','/__review' in native.url and native.locator('h1').inner_text()=='Native request received')
        check('native POST includes three fields and source',all(k in received[-1]['payload'] for k in ['name','email','process','source']))
        native.goto(BASE+'/community/');check('no-JS complete record visible',native.locator('.full-record .layer').count()==6 and native.locator('.full-record .layer').last.is_visible())
        nojs.close()
        page.emulate_media(reduced_motion='reduce');ready(page,BASE+'/community/')
        check('reduced motion record complete',page.locator('.full-record').evaluate('(e)=>getComputedStyle(e).getPropertyValue("--draw").trim()')=='1')
        check('no console exceptions',not console,console)
        browser.close()
        if '--lighthouse' in sys.argv:
            env=os.environ.copy();env['CHROME_PATH']=p.chromium.executable_path
            cache=Path(os.environ.get('LOCALAPPDATA',''))/'npm-cache/_npx'
            cached=[path for path in cache.glob('*/node_modules/lighthouse/cli/index.js') if json.loads((path.parent.parent/'package.json').read_text(encoding='utf8')).get('version')=='13.5.0']
            runner=['node',str(cached[0])] if cached else ['npx.cmd','--yes','--package=lighthouse@13.5.0','--','lighthouse']
            audit_browser=p.chromium.launch(headless=True,args=['--remote-debugging-port=9222'])
            cli=runner+[BASE+'/community/','--port=9222','--only-categories=accessibility','--output=json','--output=html','--output-path='+str(QA/'lighthouse'),'--quiet']
            result=subprocess.run(cli,cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf8',errors='replace')
            audit_browser.close()
            if result.returncode:
                check('Lighthouse command',False,result.stderr[-4000:])
            else:
                audit=json.loads((QA/'lighthouse.report.json').read_text(encoding='utf8'))
                score=audit['categories']['accessibility']['score']*100
                failed=[{'id':k,'title':v['title'],'details':v.get('details',{})} for k,v in audit['audits'].items() if v.get('score')==0]
                check('Lighthouse accessibility >=95',score>=95,{'score':score,'failedAudits':failed})
finally:
    server.shutdown()
    (QA/'verification.json').write_text(json.dumps({'checks':checks,'pass':all(x['pass'] for x in checks)},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'passed':sum(x['pass'] for x in checks),'total':len(checks),'failures':[x['name'] for x in checks if not x['pass']]},indent=2),flush=True)
sys.exit(0 if all(x['pass'] for x in checks) else 1)
