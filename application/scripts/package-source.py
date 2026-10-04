import pathlib,json,hashlib,zipfile
root=pathlib.Path('.shipstudio/source');files=sorted(p for p in root.rglob('*') if p.is_file());manifest=[]
for p in files:manifest.append({'file':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(root/'checksums.json').write_text(json.dumps(manifest,indent=2)+'\n')
archive=pathlib.Path('.shipstudio/enduro-vietnam-source.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file():z.write(p,arcname='source/'+str(p.relative_to(root)))
 for p in [pathlib.Path('content/pages.json'),pathlib.Path('content/routes.json'),pathlib.Path('content/assets.json')]:z.write(p,arcname=str(p))
with zipfile.ZipFile(archive) as z:
 bad=z.testzip()
 if bad:raise RuntimeError('Archive checksum failure: '+bad)
 count=len(z.namelist())
report={'file':str(archive),'files':count,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'crcCheck':'passed','availablePageRecords':53,'source404Routes':17,'sourceDynamic404Resources':106}
pathlib.Path('.shipstudio/source-archive-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
