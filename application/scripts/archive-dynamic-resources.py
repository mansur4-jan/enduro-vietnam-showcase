import pathlib,json,urllib.parse,hashlib,concurrent.futures
import importlib.util
spec=importlib.util.spec_from_file_location("archive", "scripts/archive-source.py");module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

root=pathlib.Path('.shipstudio/source');targets=set()
for page in json.loads((root/'pages.json').read_text()):
 if page['status']!=200:continue
 text=pathlib.Path(page['file']).read_text();prefix='window.creatium = ';start=text.find(prefix)
 if start<0:continue
 conf,_=json.JSONDecoder().raw_decode(text[start+len(prefix):]);options=conf.get('async',{})
 for key in ['js','css','js_adaptive_sections']:
  values=options.get(key,[]);values=[values] if isinstance(values,str) else values
  targets.update(urllib.parse.urljoin(page['url'],u) for u in values)
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 for url,response in zip(sorted(targets),pool.map(module.get,sorted(targets))):
  data,typ,final,status=response
  if data is None:results.append({'url':url,'status':status,'error':typ});continue
  ext='.css' if 'css' in typ else '.js';file=root/'assets'/(hashlib.sha256(url.encode()).hexdigest()[:20]+ext);file.write_bytes(data)
  results.append({'url':url,'file':str(file),'bytes':len(data),'contentType':typ,'status':status})
(root/'dynamic-resources.json').write_text(json.dumps(results,indent=2)+'\n')
print('Dynamic resources archived:',sum(r['status']==200 for r in results),'failures:',sum(r['status']!=200 for r in results),flush=True)
