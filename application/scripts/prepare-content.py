import json,pathlib,re,shutil
from html.parser import HTMLParser
root=pathlib.Path('.shipstudio/source');out=pathlib.Path('content');out.mkdir(exist_ok=True)
records=json.loads((root/'assets.json').read_text());mapping={}
public=pathlib.Path('public/assets');public.mkdir(parents=True,exist_ok=True)
for a in records:
 if a.get('status')==200 and a.get('contentType','').startswith(('image/','font/','application/font','application/octet-stream')):
  src=pathlib.Path(a['file']);shutil.copy2(src,public/src.name);mapping[a['url']]='/assets/'+src.name
(out/'assets.json').write_text(json.dumps(mapping,indent=2)+'\n')
fonts=[]
for a in records:
 if a.get('contentType','').startswith('text/css') and 'fonts.googleapis.com/css2?family=' in a['url'] and any(f in a['url'] for f in ['Inter:','Unbounded:']):
  s=pathlib.Path(a['file']).read_text()
  for remote,local in mapping.items():s=s.replace(remote,local)
  fonts.append(s)
# Open Sans matches the source's actual bundled normal and bold fonts.
source=(root/'assets/default.css').read_text()
for block in re.findall(r'@font-face\s*\{[^}]+\}',source):
 if 'Open Sans' in block:
  for u in re.findall(r'url\([\"\']?([^\"\')]+)',block):
   absolute='https://enduro-vietnam.com'+u if u.startswith('/') else u
   if absolute in mapping:block=block.replace(u,mapping[absolute])
  fonts.append(block)
pathlib.Path('app/fonts.css').write_text('\n'.join(fonts))
computed=json.loads((root/'computed-1230.json').read_text())['elements']
texts=[x for x in computed if x['text']]
# Stable role strings, never source builder markup or classes in the runtime.
(out/'home.json').write_text(json.dumps({'text':[x['text'] for x in texts],'images':[{'url':x['src'] or x['image'],'y':x['y'],'x':x['x']} for x in computed if x['tag']=='IMG' or x['image'].startswith('url(')]},ensure_ascii=False,indent=2))
class Extract(HTMLParser):
 def __init__(self):super().__init__();self.texts=[];self.links=[];self.headings=[];self.inhead=None;self.heading='';self.skip=0;self.description='';self.canonical='';self.title='';self.intitle=False
 def handle_starttag(self,t,a):
  a=dict(a)
  if t in ['style','script']:self.skip+=1
  if t=='title':self.intitle=True
  if t in ['h1','h2','h3']:self.inhead=t;self.heading=''
  if t=='a' and a.get('href'):self.links.append(a['href'])
  if t=='meta' and a.get('name')=='description':self.description=a.get('content','')
  if t=='link' and a.get('rel')=='canonical':self.canonical=a.get('href','')
 def handle_endtag(self,t):
  if t in ['style','script']:self.skip=max(0,self.skip-1)
  if t=='title':self.intitle=False
  if t==self.inhead:self.headings.append({'level':t,'text':self.heading.strip()});self.inhead=None
 def handle_data(self,d):
  if self.intitle:self.title+=d
  if self.skip:return
  if self.inhead:self.heading+=d
  if d.strip():self.texts.append(d.strip())
pages=[]
for record in json.loads((root/'pages.json').read_text()):
 if record['status']!=200:continue
 p=Extract();p.feed(pathlib.Path(record['file']).read_text());route=record['url'].replace('https://enduro-vietnam.com','').rstrip('/') or '/'
 if any(x['route']==route for x in pages):continue
 pages.append({'route':route,'title':p.title,'description':p.description,'canonical':p.canonical,'headings':p.headings,'text':p.texts,'links':p.links,'sourceFile':record['file']})
(out/'pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(pages),'page records and',len(mapping),'local assets')
