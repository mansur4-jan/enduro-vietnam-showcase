"""Archive publicly linked source pages and assets; retain exact URL mappings."""
import concurrent.futures, hashlib, json, pathlib, re, time, urllib.request, urllib.parse
from html.parser import HTMLParser

ROOT = pathlib.Path('.shipstudio/source')
ORIGIN = 'https://enduro-vietnam.com'
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.assets=[]; self.title=''; self.intitle=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='title': self.intitle=True
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        for k in ['src','poster','data-src']:
            if a.get(k): self.assets.append(a[k])
        if tag=='link' and a.get('href') and a.get('rel') in ['stylesheet','icon','preload','apple-touch-icon-precomposed']: self.assets.append(a['href'])
    def handle_endtag(self,tag):
        if tag=='title':self.intitle=False
    def handle_data(self,d):
        if self.intitle:self.title+=d

def get(url):
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'*/*'})
            with urllib.request.urlopen(req,timeout=35) as r:
                return r.read(),r.headers.get('Content-Type',''),r.geturl(),r.status
        except Exception as e:
            if attempt==2:return None,str(e),url,0
            time.sleep(1+attempt)

def urls(text):
    found=re.findall(r'(?:url\(\s*[\"\']?)([^\s\"\')]+)',text)
    found+=re.findall(r'https?://[^\s\"\'<>\\)]+',text)
    return [u.replace('&amp;','&') for u in found]

def main():
    ROOT.mkdir(parents=True,exist_ok=True);(ROOT/'pages').mkdir(exist_ok=True);(ROOT/'assets').mkdir(exist_ok=True)
    pending={ORIGIN+'/'};visited=set();pages=[];assets=set();external=set()
    sitemap=(ROOT/'sitemap.xml').read_text()
    pending.update(re.findall(r'<loc>(.*?)</loc>',sitemap))
    while pending:
        batch=sorted(pending-visited);pending=set()
        if not batch:break
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            results=list(pool.map(get,batch))
        for url,(data,typ,final,status) in zip(batch,results):
            visited.add(url)
            if data is None:pages.append({'url':url,'status':status,'error':typ});continue
            p=urllib.parse.urlsplit(url);name=p.path.strip('/').replace('/','__') or 'home'
            path=ROOT/'pages'/(name+'.html');path.write_bytes(data)
            parser=Parser();text=data.decode('utf-8','replace');parser.feed(text)
            links=[]
            for link in parser.links:
                absurl=urllib.parse.urljoin(url,link);parts=urllib.parse.urlsplit(absurl)
                if parts.netloc=='enduro-vietnam.com':
                    clean=urllib.parse.urlunsplit((parts.scheme,parts.netloc,parts.path.rstrip('/') or '/','',''))
                    links.append(absurl)
                    if not re.search(r'\.(?:jpg|png|svg|webp|pdf|mp4|css|js)$',parts.path):pending.add(clean)
                    else:assets.add(clean)
                elif parts.scheme in ['http','https']:external.add(absurl)
            assets.update(urllib.parse.urljoin(url,u) for u in parser.assets+urls(text) if not u.startswith('data:'))
            pages.append({'url':url,'finalUrl':final,'status':status,'title':parser.title,'file':str(path),'links':links})
        print('Pages archived:',len(pages), 'next:',len(pending-visited),flush=True)
        (ROOT/'pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2))
    # Only actual static resources, never analytics or messenger endpoints.
    assets={u for u in assets if urllib.parse.urlsplit(u).netloc in ['enduro-vietnam.com','img2.creatium.app','fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net','cdnjs.cloudflare.com'] and re.search(r'\.(?:css|js|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp4|pdf)(?:[?#]|$)',u) or 'fonts.googleapis.com/css' in u}
    records=json.loads((ROOT/'assets.json').read_text()) if (ROOT/'assets.json').exists() else [];seen={r['url'] for r in records if r.get('status')==200}
    while assets-seen:
        batch=sorted(assets-seen);seen.update(batch)
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(get,batch))
        for url,(data,typ,final,status) in zip(batch,results):
            if data is None:records.append({'url':url,'status':status,'error':typ});continue
            ext=pathlib.Path(urllib.parse.urlsplit(url).path).suffix or '.css'
            path=ROOT/'assets'/(hashlib.sha256(url.encode()).hexdigest()[:20]+ext);path.write_bytes(data)
            records.append({'url':url,'file':str(path),'bytes':len(data),'contentType':typ,'status':status})
            if 'css' in typ:assets.update(urllib.parse.urljoin(url,u) for u in urls(data.decode('utf-8','replace')) if not u.startswith('data:'))
        print('Assets archived:',len(records),flush=True)
        (ROOT/'assets.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
    (ROOT/'external-links.json').write_text(json.dumps(sorted(external),indent=2))

if __name__=='__main__':main()
