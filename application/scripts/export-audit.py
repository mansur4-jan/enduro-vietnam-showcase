import json,csv,re
from pathlib import Path
source=json.loads(Path('data/source-audit.json').read_text())
items=[]
for kind,sheet in [('content','Замечания'),('technical','Техническая проверка')]:
 for row in source['sheets'][sheet]:
  if row and re.fullmatch(r'EV-\d{3}|T\d{2}',row[0]):
   items.append({'id':row[0],'kind':kind,'sourceFile':source['sourceFile'],'sourceSheet':sheet,'sourceRow':row,'status':'untested','evidence':None,'recommendation':'Проверить на локальном маршруте; неизвестные сведения сохранить в журнале конфликтов'})
assert len([r for r in items if r['kind']=='content'])==91
assert len([r for r in items if r['kind']=='technical'])==18
Path('data/audit-register.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
with Path('data/audit-register.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=['id','kind','status','evidence','recommendation']);w.writeheader();w.writerows({k:r[k] for k in w.fieldnames} for r in items)
print('91 EV IDs and 18 technical IDs preserved; untested until evidence exists')
