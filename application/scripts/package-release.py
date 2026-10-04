"""Package code/public source data; never private DB, credentials or caches."""
import hashlib, json, zipfile
from pathlib import Path
from datetime import datetime, timezone
root=Path.cwd()
archive=root/'.shipstudio/enduro-vietnam-current-project.zip'
roots=['app','components','lib','server','db','scripts','content','data','public','docs']
files=[]
for directory in roots:
    for path in (root/directory).rglob('*'):
        if path.is_file() and not path.is_symlink() and '__pycache__' not in path.parts:
            files.append(path)
for name in ['package.json','package-lock.json','next.config.ts','tsconfig.json','tsconfig.build.json','next-env.d.ts','eslint.config.mjs','postcss.config.mjs','proxy.ts','Dockerfile','compose.yaml','.dockerignore','.env.example','.gitignore','SITE.md','CLAUDE.md','MIGRATION.md','EXPORT.md']:
    path=root/name
    if path.exists(): files.append(path)
reports=['rental-page-assets.json','rental-page-checks.json','rental-form-checks.json','rental-mobile-checks.json','rental-tour-regression.json','enduro-tour-assets.json','enduro-tour-checks.json','tour-city-regression.json','city-page-assets.json','city-page-checks.json','city-home-regression.json','ru-home-contact-checks.json','ru-home-checks.json','ru-home-assets.json','link-integrity-checks.json','external-link-checks.json','workbook-audit.json','workbook-checks.json','workbook-media.json','workbook-import.json','migration.json','public-route-checks.json','seo-checks.json','responsive-checks.json','s03-database-checks.json','application-checks.json','moderation-checks.json','mfa-checks.json','csv-import-checks.json','backup-restore-checks.json','audit-checks.json','source-reconciliation.json','s02-import.json','production-dependency-audit.json','dependency-audit.json','release-checks.json']
for name in reports:
    path=root/'.shipstudio'/name
    if path.exists():files.append(path)
# Include the browser/fidelity tool sources required by packaged QA scripts.
for path in (root/'.shipstudio/fidelity').rglob('*.mjs'):
    if path.is_file() and not path.is_symlink():files.append(path)
files=sorted(set(files))
manifest={'createdAt':datetime.now(timezone.utc).isoformat(),'privateDataIncluded':False,'files':[]}
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as output:
    for path in files:
        rel=path.relative_to(root).as_posix()
        if rel.startswith('.data/') or '/.env' in rel or rel in ['.env','.env.local','.env.production']:raise RuntimeError('Private file blocked')
        data=path.read_bytes()
        manifest['files'].append({'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        output.writestr(rel,data)
    output.writestr('PACKAGE_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(archive) as saved:
    bad=saved.testzip()
    if bad:raise RuntimeError('ZIP CRC failed: '+bad)
    for entry in manifest['files']:
        if hashlib.sha256(saved.read(entry['path'])).hexdigest()!=entry['sha256']:raise RuntimeError('SHA mismatch: '+entry['path'])
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'archive':str(archive.relative_to(root)),'files':len(files)+1,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'zipCrcPassed':True,'allFilesSha256Passed':True,'privateDataIncluded':False,'originalArchivesOverwritten':False}
(root/'.shipstudio/current-package-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report))
