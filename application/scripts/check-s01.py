import datetime, json, os, pathlib, urllib.error, urllib.parse, urllib.request
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=os.environ.get('MIGRATION_BASE_URL','http://127.0.0.1:3000').rstrip('/')
if urllib.parse.urlsplit(BASE).hostname not in {'localhost','127.0.0.1','::1'}:raise SystemExit('S01 tests are loopback-only')
class Page(HTMLParser):
    def __init__(self):super().__init__();self.title='';self.h1=[];self.words=[];self.tag='';self.heading='';self.resources=[];self.contacts=[];self.disabled_submit=False
    def handle_starttag(self,t,a):
        a=dict(a)
        if t in ['title','h1']:self.tag=t;self.heading=''
        if t in ['script','iframe','img'] and a.get('src'):self.resources.append(a['src'])
        if t=='a' and a.get('href','').startswith(('https://t.me/','https://wa.me/','mailto:','tel:')):self.contacts.append(a['href'])
        if t=='button' and a.get('type')=='submit' and 'disabled' in a:self.disabled_submit=True
    def handle_data(self,d):
        self.words.append(d)
        if self.tag=='title':self.title+=d
        if self.tag=='h1':self.heading+=d
    def handle_endtag(self,t):
        if t=='h1':self.h1.append(self.heading);self.tag=''
        if t=='title':self.tag=''
sources={p['route']:p for p in json.loads((ROOT/'content/pages.json').read_text())}
routes=['/','/ru','/all-tours','/ru/all-tours','/all-tours/dalat-enduro-tour-one-day','/rent-motorbike-dalat']
results=[];errors=[]
for route in routes:
    checks=[]
    for attempt in range(2):
        with urllib.request.urlopen(BASE+route,timeout=60) as response:
            body=response.read().decode();page=Page();page.feed(body)
            expected=next(h['text']for h in sources[route]['headings']if h['level']=='h1')
            result={'status':response.status,'titleMatches':page.title==sources[route]['title'],'h1Matches':expected in page.h1,'noindex':'noindex' in response.headers.get('X-Robots-Tag',''),'contactActionsDisabled':not page.contacts,'externalRuntimeResources':[u for u in page.resources if u.startswith(('http:','https:'))]}
            if route=='/':result['submitDisabled']=page.disabled_submit
            if response.status!=200 or not all(result[k]for k in ['titleMatches','h1Matches','noindex','contactActionsDisabled']) or result['externalRuntimeResources'] or (route=='/' and not page.disabled_submit):errors.append({'route':route,'result':result})
            checks.append(result)
    results.append({'route':route,'directAndRepeatedRequest':checks})
for payload in [b'{}',b'[]',b'not-json']:
    try:urllib.request.urlopen(urllib.request.Request(BASE+'/api/booking',data=payload,headers={'Content-Type':'application/json'}));errors.append({'form':'unexpected success'})
    except urllib.error.HTTPError as error:
        data=json.loads(error.read());
        if error.code!=503 or data.get('code')!='LOCAL_DELIVERY_DISABLED':errors.append({'form':'safe-mode refusal missing'})
for route in ['/.shipstudio/backups/s01-original/manifest.json','/.shipstudio/source/pages/home.html','/not-a-real-tour-s01']:
    try:urllib.request.urlopen(BASE+route);errors.append({'privateOrUnknownRoute':route,'unexpected':'200'})
    except urllib.error.HTTPError as error:
        if error.code!=404:errors.append({'route':route,'status':error.code})
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseUrl':BASE,'routeResults':results,'localFormRefusals':3,'privateAndUnknown404Checks':3,'errors':errors}
(ROOT/'docs/S01_CHECKS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'routes':len(results),'errorCount':len(errors),'errors':errors},ensure_ascii=False,indent=2));raise SystemExit(bool(errors))
