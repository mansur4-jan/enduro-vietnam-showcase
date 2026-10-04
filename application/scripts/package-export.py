"""Create a self-contained project and evidence archive without caches/dependencies."""
import datetime
import hashlib
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
archive = ROOT / '.shipstudio/enduro-vietnam-export.zip'
files = []
for directory in ['app', 'components', 'lib', 'content', 'public', 'scripts', '.shipstudio/source']:
    files.extend(p for p in (ROOT / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='checksums.json')
for name in ['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'SITE.md', 'MIGRATION.md', 'EXPORT.md', 'CLAUDE.md', '.shipstudio/route-check-report.json']:
    file = ROOT / name
    if file.is_file():
        files.append(file)
manifest = [{'file': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(set(files))]
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as output:
    for file in sorted(set(files)):
        output.write(file, arcname=str(file.relative_to(ROOT)))
    output.writestr('export-checksums.json', json.dumps(manifest, indent=2) + '\n')
with zipfile.ZipFile(archive) as source:
    bad = source.testzip()
    if bad:
        raise RuntimeError('CRC failure: ' + bad)
    for record in manifest:
        if hashlib.sha256(source.read(record['file'])).hexdigest() != record['sha256']:
            raise RuntimeError('SHA-256 failure: ' + record['file'])
report = {'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'file': str(archive.relative_to(ROOT)), 'files': len(manifest)+1, 'bytes': archive.stat().st_size, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'crcCheck': 'passed', 'allFileSha256Check': 'passed', 'pageFiles': len(list((ROOT / 'content/exported-pages').glob('*.json'))), 'sourceLinks': len(json.loads((ROOT / 'content/link-ledger.json').read_text()))}
(ROOT / '.shipstudio/export-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
