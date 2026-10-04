import json,hashlib,time,urllib.request,concurrent.futures
from pathlib import Path
items=json.loads(Path('.shipstudio/workbook-prepared.json').read_text());mapping=json.loads(Path('content/assets.json').read_text());urls=sorted({u for o in items for u in o['workbook'].get('photos',[])})
Path('public/assets/workbook').mkdir(parents=True,exist_ok=True)
def save(url):
 if url in mapping and Path('public'+mapping[url]).exists():return url,mapping[url],None
 # Correct only the verified truncated extension; retain the original URL in evidence.
 if url.endswith('.web') and url+'p' in mapping and Path('public'+mapping[url+'p']).exists():return url,mapping[url+'p'],None
 path='/assets/workbook/'+hashlib.sha256(url.encode()).hexdigest()[:24]+'.webp';target=Path('public'+path)
 if target.exists():return url,path,None
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as response:data=response.read(12*1024*1024)
   if not (data[:4]==b'RIFF' and data[8:12]==b'WEBP'):raise ValueError('Unexpected image signature')
   target.write_bytes(data);return url,path,None
  except Exception as e:
   if attempt==2:return url,None,str(e)
   time.sleep(.3)
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for result in pool.map(save,urls):results.append(result)
errors=[{'url':u,'error':e} for u,p,e in results if e]
for u,p,e in results:
 if not e:mapping[u]=p
Path('content/assets.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
Path('.shipstudio/workbook-media.json').write_text(json.dumps({'sourceUrls':len(urls),'localized':len(urls)-len(errors),'errors':errors,'files':[{'url':u,'path':p,'sha256':hashlib.sha256(Path('public'+p).read_bytes()).hexdigest()} for u,p,e in results if not e]},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourceUrls':len(urls),'localized':len(urls)-len(errors),'errors':errors}))
if errors:raise SystemExit(1)
