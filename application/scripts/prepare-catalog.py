"""Build a conservative, provenance-preserving seed from the downloaded source.
Money is integer minor units. Unconfirmed prices remain null, never zero.
"""
import json, hashlib, re
from pathlib import Path
from datetime import datetime, timezone
seed_path=Path('data/catalog-seed.json')
if seed_path.exists() and json.loads(seed_path.read_text()).get('workbookSource'):
 raise SystemExit('Workbook-backed catalog exists; use prepare-workbook.py instead of replacing it with the older public-site seed.')
pages=json.loads(Path('content/pages.json').read_text())
index={p['route']:p for p in json.loads(Path('content/page-index.json').read_text())}
byroute={p['route']:p for p in pages}
prices={'dalat-enduro-tour-one-day':120,'dalat-enduro-tour-advanced':150,'dalat-enduro-tour-two-day':300,'three-day-tour-dalat-nhatrang':1000,'three-day-tour-dalat-muine':1000,'dalat-easy-rider-enduro-beginners':100,'nhatrang-enduro-tour-one-day':120,'nhatrang-enduro-tour-advanced':150,'motorbike-tour-south-vietnam-4-days':960,'5-day-motorbike-tour-from-saigon-ho-chi-minh-city':1000,'mekong-delta-and-coastline-vietnam-motorbike-tour-6-days':1240,'motorcycle-tour-on-coastline-and-highlands-vietnam-7-days':1380,'saigon-motorbike-tour-10-days':2000,'south-vietnam-motorbike-tour-7-days':1780,'danang-enduro-tour-one-day':120,'danang-enduro-tour-advanced':150}
durations={'dalat-enduro-tour-one-day':(3,'hours'),'dalat-enduro-tour-advanced':(6,'hours'),'dalat-easy-rider-enduro-beginners':(2.5,'hours'),'nhatrang-enduro-tour-one-day':(2.5,'hours'),'nhatrang-enduro-tour-advanced':(4,'hours'),'danang-enduro-tour-one-day':(3,'hours'),'danang-enduro-tour-advanced':(6,'hours')}
def destination(slug):
 data['endDestinationId']='nhatrang' if slug in ['three-day-tour-dalat-nhatrang','5-day-motorbike-tour-from-saigon-ho-chi-minh-city'] else 'muine' if slug=='three-day-tour-dalat-muine' else None
 if slug.startswith(('dalat','three-day-tour-dalat')): return 'dalat'
 if slug.startswith('nhatrang'): return 'nhatrang'
 if slug.startswith('danang'): return 'danang'
 return 'saigon' if not slug.startswith('vietnam-motorcycle') else 'north-vietnam'
def textblocks(p):
 # Source body kept verbatim in provenance, visible editorial body excludes navigation/pricing duplicates.
 text=p['text']; begin=next((i for i,v in enumerate(text) if v in ['TOUR OVERVIEW','ОБЗОР ТУРА']),None)
 end=next((i for i,v in enumerate(text) if i>(begin or 0) and v in ['MOST POPULAR TOURS','САМЫЕ ПОПУЛЯРНЫЕ ТУРЫ']),len(text))
 return text[begin:end] if begin is not None else []
offerings=[]; conflicts=[]
for slug in [*prices,'vietnam-motorcycle-tours-12-days']:
 en=byroute.get('/all-tours/'+slug); ru=byroute.get('/ru/all-tours/'+slug)
 translations={}; routes={}; photos=[]
 for lang,p in [('en',en),('ru',ru)]:
  if not p: continue
  exported=json.loads(Path(index[p['route']]['file']).read_text())
  description=' '.join(sentence for sentence in re.split(r'(?<=[.!?])\s+',p['description']) if not re.search(r'[$€₫]\s*\d|\d[\d., ]*\s*(?:USD|VND|\$)',sentence,re.I))
  translations[lang]={'title':next((h['text'] for h in p['headings'] if h['level']==1),p['title']),'description':description,'body':textblocks(p),'sourcePage':p['route']}
  routes[lang]=p['route']
  for im in exported['images']:
   if im['src'].startswith('/assets/') and im['src'] not in [v['src'] for v in photos] and not re.search(r'logo|icon|hamburger|\.svg|/tg\.|/wa\.',im.get('originalSrc',''),re.I):photos.append({'src':im['src'],'alt':{lang:im.get('alt','')},'rights':'source website; rights confirmation pending'})
 duration=durations.get(slug)
 if not duration:
  m=re.search(r'(\d+)-(?:day|days)',slug); duration=(int(m[1]),'days') if m else (2 if 'two-day' in slug else 3,'days')
 oid='tour-'+slug
 data={'translations':translations,'routes':routes,'photos':photos[:12],'duration':{'value':duration[0],'unit':duration[1],'nights':None},'groupSize':None,'level':None,'guideLanguages':[],'commerce':{'currency':'USD','amountMinor':prices[slug]*100 if slug in prices else None,'basis':'from','unit':None,'priceStatus':'source_starting_price' if slug in prices else 'needs_source'},'variants':[],'program':{},'conditions':{},'supplier':'Enduro Vietnam','sourceNotice':True}
 data['endDestinationId']='nhatrang' if slug in ['three-day-tour-dalat-nhatrang','5-day-motorbike-tour-from-saigon-ho-chi-minh-city'] else 'muine' if slug=='three-day-tour-dalat-muine' else None
 if slug.startswith(('dalat','nhatrang','danang','three-day-tour-dalat')):
  conflicts.append({'sourceId':oid,'field':'variants','detail':{'reason':'XR230/XR150 and RU/EN price variants require confirmation; no automatic minimum or maximum selected'}})
 if slug not in prices: conflicts.append({'sourceId':oid,'field':'commerce','detail':{'auditOnlyUSD':1900,'reason':'No readable EN price; old audit amount is not a published price'}})
 raw={'en':en,'ru':ru}; digest=hashlib.sha256(json.dumps(raw,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
 offerings.append({'id':oid,'sourceId':oid,'hash':digest,'sourceFile':(en or ru)['sourceFile'],'type':'tour','category':'motorbike-tours','destination':destination(slug),'slug':slug,'data':data,'raw':raw})
rentals=[('dalat','Yamaha Nouvo LX135',[150000,750000,2000000],200),('dalat','Yamaha NVX155',[300000,1600000,4500000],200),('dalat','Honda Leed125',[150000,750000,2000000],200),('dalat','Yamaha Nouvo LX6',[170000,900000,2000000],200),('dalat','SYM WOLF125',[300000,1600000,4500000],200),('dalat','Peugeot Django',[300000,1600000,4500000],200),('dalat','SYM Attila Elizabeth',[150000,750000,2000000],200),('dalat','SYM Attila',[150000,750000,2000000],200),('nhatrang','YADEA VEKOO',[150000,350000,700000,2000000],200),('nhatrang','YADEA ORIS',[350000,850000,1700000,3500000],250),('nhatrang','VICTORY CITY',[200000,500000,None,None],200),('nhatrang','VINSKY CREA50',[250000,600000,None,None],100),('nhatrang','YADEA XBULL',[120000,300000,700000,1900000],250)]
for city,model,amounts,deposit in rentals:
 slug=city+'-'+re.sub(r'[^a-z0-9]+','-',model.lower()).strip('-'); oid='rental-'+slug
 route='/rent-motorbike-dalat' if city=='dalat' else '/rent-scooter-nhatrang'
 raw={'model':model,'amountsVND':amounts,'depositUSD':deposit,'source':'TZ_v1 section rental prices','sourcePage':route}
 periods=['day','week','month'] if city=='dalat' else ['day','3_days','week','month']
 data={'translations':{lang:{'title':model,'description':model,'body':[],'sourcePage':('/ru' if lang=='ru' else '')+route} for lang in ['en','ru']},'routes':{'en':'/rentals/'+slug,'ru':'/ru/rentals/'+slug},'photos':[],'vehicle':{'model':model,'kind':'motorbike','engineCC':None,'gearbox':None,'seats':None,'luggage':None,'selfDrive':None},'commerce':{'currency':'VND','amountMinor':amounts[0],'basis':'from','unit':'day','priceStatus':'source_tariff'},'tariffs':[{'id':period,'period':period,'currency':'VND','amountMinor':amount,'status':'needs_source' if amount is None else 'source_tariff'} for period,amount in zip(periods,amounts)],'deposit':{'amountMinor':deposit*100,'currency':'USD'},'handoff':{},'conditions':{},'variants':[],'supplier':'Enduro Vietnam','sourceNotice':True}
 if None in amounts:conflicts.append({'sourceId':oid,'field':'tariffs','detail':{'reason':'Unreadable source week/month amounts preserved as price on request; no zeros repaired'}})
 exported=json.loads(Path(index[route]['file']).read_text())
 normalized=lambda s:re.sub(r'[^a-z0-9]','',s.lower())
 candidates=[im for im in exported['images'] if normalized(model) in normalized(im.get('alt','')) and im.get('alt')]
 if not candidates and model=='Yamaha Nouvo LX135':candidates=[im for im in exported['images'] if 'nouvo_lx135' in im.get('originalSrc','')]
 data['photos']=[{'src':im['src'],'alt':{'en':model,'ru':model},'rights':'original rental page; rights confirmation pending'} for im in candidates[:3]]
 offerings.append({'id':oid,'sourceId':oid,'hash':hashlib.sha256(json.dumps(raw,sort_keys=True).encode()).hexdigest(),'sourceFile':'docs/TZ_v1-extracted.txt','type':'rental','category':'motorbike-rentals','destination':city,'slug':slug,'data':data,'raw':raw})
conflicts.append({'sourceId':'rental-dalat-honda-winner-x','field':'source','detail':{'reason':'RU-only Honda Winner X retained from downloaded source; EN translation, deposit and current availability not confirmed','sourcePage':'/ru/rent-motorbike-dalat','sourceTariffsVND':{'day':500000,'week':2000000,'month':6000000}}})
winner={'translations':{'ru':{'title':'Honda Winner X','description':'Аренда Honda Winner X в Далате. Условия и наличие подтверждаются после заявки.','body':[],'sourcePage':'/ru/rent-motorbike-dalat'}},'routes':{'ru':'/ru/rentals/dalat-honda-winner-x'},'photos':[],'vehicle':{'model':'Honda Winner X','kind':'motorbike','engineCC':None},'commerce':{'currency':'VND','amountMinor':None,'basis':'request','unit':'day','priceStatus':'needs_source'},'tariffs':[{'id':k,'period':k,'currency':'VND','amountMinor':None,'status':'needs_source'} for k in ['day','week','month']],'variants':[],'supplier':'Enduro Vietnam','sourceNotice':True}
winner_source=byroute['/ru/rent-motorbike-dalat'];winner_export=json.loads(Path(index[winner_source['route']]['file']).read_text());winner['photos']=[{'src':im['src'],'alt':{'ru':'Honda Winner X'},'rights':'original RU rental page; rights confirmation pending'} for im in winner_export['images'] if 'winner' in (im.get('alt','')+' '+im.get('originalSrc','')).lower()]
offerings.append({'id':'rental-dalat-honda-winner-x','sourceId':'rental-dalat-honda-winner-x','hash':hashlib.sha256(json.dumps(winner,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),'sourceFile':winner_source['sourceFile'],'type':'rental','category':'motorbike-rentals','destination':'dalat','slug':'dalat-honda-winner-x','data':winner,'raw':{'text':winner_source['text'],'note':'RU-only; price verification required'}})
seed={'generatedAt':datetime.now(timezone.utc).isoformat(),'organizations':[{'id':'enduro-vietnam','name':'Enduro Vietnam','slug':'enduro-vietnam','source':'existing public website'}],'destinations':[{'id':i,'names':{'en':en,'ru':ru},'aliases':aliases} for i,en,ru,aliases in [('dalat','Dalat','Далат',['da lat','đà lạt','далат']),('nhatrang','Nha Trang','Нячанг',['nha trang','нячанг','нья чанг']),('danang','Da Nang','Дананг',['da nang','дананг']),('muine','Mui Ne','Муйне',['mui ne','муйне']),('saigon','Ho Chi Minh City','Хошимин',['saigon','сайгон','ho chi minh','хошимин']),('north-vietnam','Northern Vietnam','Северный Вьетнам',['hanoi','ханой'])]],'categories':[{'id':i,'slug':i,'names':{'en':en,'ru':ru}} for i,en,ru in [('motorbike-tours','Motorbike tours','Мототуры'),('motorbike-rentals','Motorbike rental','Аренда мотоциклов'),('car-rentals','Car rental','Аренда автомобилей'),('hiking','Hiking','Хайкинг'),('car-tours','Car tours','Автотуры')]],'offerings':offerings,'conflicts':conflicts}
Path('data/catalog-seed.json').write_text(json.dumps(seed,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'offerings':len(offerings),'tours':len(prices)+1,'rentals':len(rentals),'conflicts':len(conflicts)}))
