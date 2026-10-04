import json,re,pathlib
from html.parser import HTMLParser
class N:
 def __init__(self,t,a=None):self.tag=t;self.attrs=dict(a or []);self.children=[]
 def text(self):return ''.join(c if isinstance(c,str) else ('\n' if c.tag=='br' else c.text()) for c in self.children).strip()
 def walk(self):
  yield self
  for c in self.children:
   if isinstance(c,N):yield from c.walk()
class P(HTMLParser):
 def __init__(self):super().__init__();self.root=N('root');self.stack=[self.root]
 def handle_starttag(self,t,a):
  n=N(t,a);self.stack[-1].children.append(n)
  if t not in ['img','input','meta','link','br','hr','source','area','wbr','embed']:self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,d):self.stack[-1].children.append(d)
p=P();p.feed(open('/tmp/enduro-home.html').read());nodes=list(p.root.walk());assets=json.load(open('content/assets.json'))
def txt(cls):return [n.text() for n in nodes if cls in n.attrs.get('class','').split() and n.tag in ['p','h1','h2','h3']]
def pic(filename):
 for u,l in assets.items():
  if u.split('#')[0].split('/')[-1]==filename:return l
 raise ValueError(filename)
def info(cls):
 return [{'text':n.text(),'images':[c.attrs.get('data-lazy-image',c.attrs.get('data-lazy-bgimage','')).split('#')[0] for c in n.walk() if 'data-lazy-image' in c.attrs or 'data-lazy-bgimage' in c.attrs]} for n in nodes if cls in n.attrs.get('class','').split()]

d={'hero':{'eyebrow':txt('css65')[0],'intro':txt('css66')[:2],'title':txt('css67')[0],'subtitle':txt('css67')[1],'image':pic('serpantin_s_motocilistom.webp'),'poster':pic('img_0568.png')},'logo':pic('logoendurov2.png'),'cities':[{'name':n,'description':t,'image':pic(f),'href':h} for n,t,f,h in zip(txt('css105'),txt('css107'),['dalat_1.webp','nhatrang.webp','danang_2.webp','muine_2.webp'],['/dalat','/nhatrang','/danang','/muine'])],'advantages':[{'title':n,'description':t,'image':pic(f)} for n,t,f in zip(txt('css191'),txt('css194'),['besplatnoe_obuchenie_dlya_novichkov.webp','nujni_li_prava_vo_vetname.webp','trassi_lyuboy_slojnosti_vokrug_dalata.webp','kak_dobratsya_do_dalata.webp'])],'advantagesBg':pic('img_7120_1.webp'),'formImage':pic('doroga_v_dalate_1.webp'),'socialImage':pic('socseti.webp'),'socialCopy':txt('css231')[0],'popularIntro':txt('css117')[0],'tourNames':txt('css133'),'tourSpecs':txt('css134'),'prices':txt('css132'),'reviewCopy':txt('css96'),'instructors':[{'name':n,'description':t,'image':pic(f)} for n,t,f in zip(txt('css223')[:2],txt('css224')[:2],['photo_2025_12_10_11_56_04.webp','photo_2025_12_10_11_57_09.webp'])],'bikes':[{'name':n,'image':u} for n,u in zip(txt('css175')[:5],[pic(f) for f in ['honda_xr230_1.webp','82027359_0b8e_465f_bcb9_e9981b429609_2.png','suzuki_dr_200.webp','suzuki_drz_400.webp','honda_xr150_1.webp']]) ]}
# Tour records are extracted by semantic text ownership, never rendered builder markup.
cards=[]
for item in info('css125'):
 text=item['text'];pass
for n in nodes:
 if n.tag=='s' and n.text():pass
links=[n.attrs['href'] for n in nodes if n.tag=='a' and '/all-tours/' in n.attrs.get('href','') and len(n.attrs.get('href','').rstrip('/').split('/'))>4]
tourimages=[]
for x in json.load(open('.shipstudio/source/computed-1230.json'))['elements']:
 if x['image'].startswith('url(') and 2700<x['y']<3100:
  u=re.search(r'"(.*?)"',x['image'])[1];tourimages.append(assets[u])
d['tourImages']=tourimages;d['tourLinks']=[u for u in dict.fromkeys(links) if u.rstrip('/')!='https://enduro-vietnam.com/all-tours'];
source=json.load(open('.shipstudio/source/computed-1230.json'))['elements']
for bike,image in zip(d['bikes'],[x for x in source if x['tag']=='IMG' and 3390<x['y']<3650]):bike['image']=assets[image['src']]
for a,width,gap in zip(d['advantages'],[177,177,174.39,174.39],[19,15,21,19]):a['mediaWidth']=width;a['mediaGap']=gap
pathlib.Path('content/homepage.json').write_text(json.dumps(d,ensure_ascii=False,indent=2))
