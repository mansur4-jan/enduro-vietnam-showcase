import json,pathlib,urllib.parse,collections
root=pathlib.Path('.shipstudio/source');pages=json.load(open('content/pages.json'));routes={p['route']:p for p in pages};mapping={};unresolved=collections.defaultdict(list)
for p in pages:
 canonical=urllib.parse.urlsplit(p['canonical']).path.rstrip('/') or '/'
 mapping[p['route']]={'target':canonical if canonical in routes else p['route'],'sourceStatus':200,'implemented':p['route']=='/'}
for record in json.load(open(root/'pages.json')):
 if record['status']==200:continue
 path=urllib.parse.urlsplit(record['url']).path.rstrip('/') or '/';target=None
 if '/ru/tours/' in path:target=path.replace('/ru/tours/','/ru/all-tours/')
 elif 'rent-scooter-nhatrang' in path:target='/ru/rent-scooter-nhatrang'
 elif 'rent-motorbike-dalat' in path:target='/ru/rent-motorbike-dalat'
 mapping[path]={'target':target if target in routes else None,'sourceStatus':404,'implemented':False}
for p in pages:
 for link in p['links']:
  absolute=urllib.parse.urljoin('https://enduro-vietnam.com'+p['route'],link);parts=urllib.parse.urlsplit(absolute)
  if parts.netloc!='enduro-vietnam.com':continue
  path=parts.path.rstrip('/') or '/'
  if path not in mapping:unresolved[path].append(p['route'])
manifest={'source':'https://enduro-vietnam.com/','routes':mapping,'unresolved':dict(unresolved),'countAvailable':len(routes),'countSource404':sum(x['sourceStatus']==404 for x in mapping.values())}
pathlib.Path('content/routes.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print('Available',len(routes),'source 404',manifest['countSource404'],'unclassified internal paths',len(unresolved))
