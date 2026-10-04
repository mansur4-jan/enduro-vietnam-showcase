"""Audit every workbook sheet; prepare only unambiguous fleet/price corrections."""
import json,re,hashlib,copy,collections
from pathlib import Path
source=Path('/Users/KuznecovAndrei/Downloads/БД Эндуро Вьтнам.xlsx')
w=json.loads(Path('.shipstudio/workbook-source.json').read_text())
seed=json.loads(Path('data/catalog-seed.json').read_text())
sha=hashlib.sha256(source.read_bytes()).hexdigest()
def columns(row):return {re.sub(r'\d','',k):v for k,v in row['cells'].items()}
def rows(name):return [dict(columns(r),_row=r['row']) for r in next(s for s in w['sheets'] if s['name']==name)['rows'][1:]]
def idof(v):return str(int(float(v)))
def clean(v):return ' '.join(re.sub('[^A-Za-zА-Яа-я0-9 .()-]',' ',v).split())
def slug(v):return re.sub('[^a-z0-9]+','-',v.lower()).strip('-')
def number(v):
 v=v.strip()
 if not re.fullmatch(r'\d+(?:\.\d{3})+|\d+',v):return None
 return int(v.replace('.',''))
def parse_rates(text):
 rates=[];bad=[];deposit=None
 for line in text.splitlines():
  m=re.match(r'\s*([\d.]+)\s*vnd\s*/\s*(.+)',line,re.I)
  if m:
   period={'day':'day','сутки':'day','3 days':'3_days','3 суток':'3_days','week':'week','неделя':'week','month':'month','месяц':'month'}.get(m[2].strip().lower())
   if not period:bad.append(line);continue
   amount=number(m[1]);rates.append({'id':period,'period':period,'currency':'VND','amountMinor':amount,'status':'workbook_tariff' if amount is not None else 'needs_source'})
   if amount is None:bad.append(line)
  elif re.search('deposit|депозит',line,re.I):
   m=re.search(r'(\d+)\s*\$',line)
   if m:deposit={'currency':'USD','amountMinor':int(m[1])*100}
 return rates,deposit,bad
report={'source':source.name,'sha256':sha,'sheets':[],'fleet':{},'tourPrices':[],'issues':[],'media':{},'prepared':[]}
for s in w['sheets']:
 rr=[columns(r) for r in s['rows'][1:]]
 ids=[r['A'] for r in rr if 'A' in r];report['sheets'].append({'name':s['name'],'dataRows':len(rr),'identifiedRows':len(ids),'columns':len(columns(s['rows'][0])),'repeatedIds':{k:v for k,v in collections.Counter(ids).items() if v>1}})
 for r in s['rows'][1:]:
  if any('GPT_ASK_SHEET' in v for v in r['cells'].values()):report['issues'].append({'sheet':s['name'],'row':r['row'],'kind':'formula_or_prompt','action':'Archive only; never execute or publish as content'})
lookup={o['id']:o for o in seed['offerings']}
legacy={6:'rental-nhatrang-yadea-vekoo',7:'rental-nhatrang-yadea-oris',8:'rental-nhatrang-victory-city',9:'rental-nhatrang-vinsky-crea50',12:'rental-nhatrang-yadea-xbull'}
changes=[];photo_urls=set()
for city,en,ru in [('nhatrang','Карточки мотоциклов Нячанг EN','Карточки мотоциклов Нячанг РУ'),('dalat','Карточки мотоциклов Далат EN',None)]:
 english=rows(en);russian={idof(r['A']):r for r in rows(ru)} if ru else {}
 covered=[]
 for row in english:
  ident=idof(row['A']);name=clean(row['B']);translation=russian.get(ident);rates,deposit,bad=parse_rates(row['C'])
  if translation:
   ru_rates,ru_dep,ru_bad=parse_rates(translation['C'])
   if rates!=ru_rates or deposit!=ru_dep:report['issues'].append({'sheet':en,'id':ident,'kind':'language_tariff_conflict'});continue
  for raw in bad:report['issues'].append({'sheet':en,'id':ident,'kind':'malformed_tariff','raw':raw,'action':'NULL, needs_source'})
  if city=='nhatrang':old=lookup.get(legacy.get(int(ident),''))
  else:old=next((o for o in seed['offerings'] if o['type']=='rental' and o['destination']=='dalat' and slug(o['data'].get('vehicle',{}).get('model',''))==slug(name)),None)
  # Eight Dalat fleet rows align by stable order/model; preserve all existing URLs.
  if city=='dalat' and not old:old=[o for o in seed['offerings'] if o['type']=='rental' and o['destination']=='dalat' and 'winner' not in o['id']][int(ident)-1]
  item=copy.deepcopy(old) if old else {'id':f'rental-nhatrang-fleet-{ident}','sourceId':f'workbook:nhatrang:moto:{ident}','type':'rental','category':'motorbike-rentals','destination':city,'slug':f'nhatrang-{slug(name)}-{ident}','sourceFile':f'{source.name}#{en}!{row["_row"]}','raw':{}}
  data=copy.deepcopy(item.get('data',{'translations':{},'routes':{},'photos':[],'supplier':'Enduro Vietnam','variants':[],'sourceNotice':True}))
  for lang in ['en','ru']:
   title=clean((translation or row)['B']) if lang=='ru' else name
   data['translations'][lang]={'title':title,'description':f'{title} · '+('Аренда в Нячанге. Тарифы и залог указаны отдельно; дата и условия подтверждаются после заявки.' if city=='nhatrang' else 'Аренда в Далате. Тарифы и залог указаны отдельно; дата и условия подтверждаются после заявки.') if lang=='ru' else f'{title} rental in '+('Nha Trang' if city=='nhatrang' else 'Dalat')+'. Rental rates and deposit are listed separately; dates and terms are confirmed on request.','body':[]}
   data['routes'].setdefault(lang,('/ru' if lang=='ru' else '')+'/rentals/'+item['slug'])
  day=next((r for r in rates if r['period']=='day'),None)
  if not day or not deposit:report['issues'].append({'sheet':en,'id':ident,'kind':'missing_day_or_deposit'});continue
  data['commerce']={'currency':'VND','amountMinor':day['amountMinor'],'basis':'from','unit':'day','priceStatus':'workbook_tariff'};data['tariffs']=rates;data['deposit']=deposit
  data.setdefault('vehicle',{})['model']=name;data['vehicle']['inventoryCode']=f'{city.upper()}-{ident}';data['vehicle']['kind']='motorbike'
  urls=list(dict.fromkeys(row[k] for k in ['E','F','G','H','I'] if row.get(k,'').startswith('https://')));photo_urls.update(urls)
  item['data']=data;item['workbook']={'city':city,'id':ident,'sheet':en,'row':row['_row'],'photos':urls,'category':row.get('D'),'fingerprint':sha};item['sourceFile']=f'{source.name}#{en}!{row["_row"]}'
  changes.append(item);covered.append({'id':ident,'offeringId':item['id'],'model':name,'existing':bool(old),'photos':len(urls)})
 report['fleet'][city]={'rows':len(english),'covered':covered,'existing':sum(c['existing'] for c in covered),'new':sum(not c['existing'] for c in covered),'uniqueModels':len(set(slug(c['model']) for c in covered))}
ru=rows('Страницы туров РУ');en={r['C']:r for r in rows('Страницы туров EN') if r.get('C')}
for r in ru:
 if not r.get('C'):continue
 old=lookup.get('tour-'+r['C']);e=en.get(r['C']);ru_price=int(r['K'].replace('$',''))*100;en_price=int(e['J'].replace('$',''))*100 if e else None
 report['tourPrices'].append({'slug':r['C'],'ruMinor':ru_price,'enMinor':en_price,'currentMinor':old['data']['commerce']['amountMinor'] if old else None,'sameLanguages':ru_price==en_price})
 if ru_price!=en_price:report['issues'].append({'sheet':'Страницы туров RU/EN','id':r['A'],'kind':'language_price_conflict','ruMinor':ru_price,'enMinor':en_price,'action':'Keep prior curated shared amount; record conflict'})
 if old:
  item=copy.deepcopy(old);photo_keys_ru=['AB','AC','AD','AE','AF','AI','AJ','AK','AL','AM','AN','AO','AP','AQ'];photo_keys_en=['AA','AB','AC','AD','AE','AH','AI','AJ','AK','AL','AM','AN','AO','AP']
  urls=list(dict.fromkeys([r[k] for k in photo_keys_ru if r.get(k,'').startswith('https://img')]+[e[k] for k in photo_keys_en if e and e.get(k,'').startswith('https://img')]));photo_urls.update(urls)
  group_ru=int(re.search(r'\d+',r['H']).group());group_en=int(re.search(r'\d+',e['H']).group()) if e else None
  if group_ru==group_en:item['data']['groupSize']=group_ru
  else:report['issues'].append({'sheet':'Страницы туров RU/EN','id':idof(r['A']),'kind':'group_size_conflict','ru':group_ru,'en':group_en,'action':'Keep unknown until operator resolves'})
  level={'Легкий':'easy','Средний':'medium'}.get(r.get('AG'));en_level={'Easy':'easy','Medium':'medium'}.get(e.get('AF')) if e else None
  if level and level==en_level:item['data']['level']=level
  blocks=[b for b in rows('vietnam_tours_db (копия)') if b.get('A')==r['A']]
  if item['data'].get('duration',{}).get('unit')=='days' and blocks and all(re.match(r'^Day \d+',b.get('G','')) for b in blocks) and len(blocks)==item['data']['duration']['value']:
   item['data'].setdefault('program',{})['en']='\n\n'.join(b['G']+'\n'+b.get('H','') for b in blocks)
  if old['data']['commerce']['amountMinor'] is None and ru_price==en_price:
   item['data']['commerce']['amountMinor']=ru_price;item['data']['commerce']['priceStatus']='workbook_starting_price_unit_unconfirmed';item['data']['translations']['ru']['body']=[r.get('R','')]
   item['data']['routes']['en']='/all-tours/'+r['C'];item['data']['translations']['en']={'title':e['D'],'description':re.sub(r'[^.!?]*\$\s*\d+[^.!?]*[.!?]?','',e['E']).strip(),'body':[e.get('Q','')]}
  item['workbook']={'sheet':'Страницы туров РУ','row':r['_row'],'id':idof(r['A']),'fingerprint':sha,'photos':urls};changes.append(item)
# Vehicle facts are not an unambiguous rental tariff source.
mru={idof(r['A']):r for r in rows('Карточки мотоциклов РУ')};men={idof(r['A']):r for r in rows('Карточки мотоциклов EN')}
for ident,r in mru.items():
 if ident in men and slug(r['B'])!=slug(men[ident]['B']):report['issues'].append({'sheet':'Карточки мотоциклов RU/EN','id':ident,'kind':'vehicle_identity_conflict','ru':r['D'],'en':men[ident]['D'],'action':'Do not merge by numeric ID alone'})
for sname in ['Карточки мотоциклов РУ','Карточки мотоциклов EN']:
 counts=collections.Counter(r['B'] for r in rows(sname))
 for url,count in counts.items():
  if count>1:report['issues'].append({'sheet':sname,'kind':'duplicate_vehicle_url','url':url,'count':count})
report['issues'].append({'sheet':'vietnam_tours_db (копия)','kind':'91_program_blocks_not_91_tours','action':'Grouped by 17 tour IDs; source copied programmes/prices require semantic review, no automatic overwrite'})
report['media']={'uniqueUrls':len(photo_urls)};report['prepared']=[{'id':o['id'],'sourceId':o['sourceId'],'workbook':o['workbook']} for o in changes]
Path('.shipstudio/workbook-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');Path('.shipstudio/workbook-prepared.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sheets':len(report['sheets']),'fleet':{k:{a:v[a] for a in ['rows','existing','new','uniqueModels']} for k,v in report['fleet'].items()},'issues':len(report['issues']),'prepared':len(changes),'photos':len(photo_urls)},ensure_ascii=False))
