import urllib.request,pathlib,re,hashlib,json
ua='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
records=[];css=[]
for url in ['https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap','https://fonts.googleapis.com/css2?family=Unbounded:wght@200..900&display=swap']:
 raw=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':ua}),timeout=30).read().decode()
 for u in set(re.findall(r'url\((https://[^)]+)\)',raw)):
  name=hashlib.sha256(u.encode()).hexdigest()[:20]+'.woff2';data=urllib.request.urlopen(u,timeout=30).read();pathlib.Path('public/assets/'+name).write_bytes(data);records.append({'url':u,'file':'public/assets/'+name,'bytes':len(data)});raw=raw.replace(u,'/assets/'+name)
 css.append(raw)
old=pathlib.Path('app/fonts.css').read_text();faces=[b for b in re.findall(r'@font-face[^}]+}',old) if "'Open Sans'" in b];pathlib.Path('app/fonts.css').write_text('\n'.join(css+faces));pathlib.Path('.shipstudio/source/browser-fonts.json').write_text(json.dumps(records,indent=2));print('Localized modern browser fonts:',len(records))
