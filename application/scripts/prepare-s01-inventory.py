import csv, json, pathlib, re, urllib.parse, zipfile, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parents[1]
routes = json.loads((ROOT/'content/routes.json').read_text())['routes']
pages = {p['route']:p for p in json.loads((ROOT/'content/pages.json').read_text())}
index = {p['route']:p for p in json.loads((ROOT/'content/page-index.json').read_text())}
paths = {p:{'local_inventory'} for p in routes}
csv_source = ROOT/'data/03_existing_urls.csv'
csv_available = csv_source.is_file()
if csv_available:
    values = csv_source.read_text().splitlines()
else:
    values = []
audit = pathlib.Path('/Users/KuznecovAndrei/Downloads/enduro_vietnam_seo_audit_2026-10-03.xlsx')
if audit.is_file():
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(audit) as z:
        strings=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
        rels={n.attrib['Id']:n.attrib['Target'] for n in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        sheet=next(n for n in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',ns) if n.attrib['name']=='Обход URL')
        target=rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        xml=ET.fromstring(z.read(target.lstrip('/') if target.startswith('/') else 'xl/'+target))
        for cell in xml.findall('.//s:c',ns):
            value=cell.find('s:v',ns)
            if value is not None and value.text: values.append(strings[int(value.text)] if cell.attrib.get('t')=='s' else value.text)
for value in values:
    for url in re.findall(r'https?://(?:www\.)?enduro-vietnam\.com[^\s"<>]*',value):
        path=urllib.parse.urlsplit(url).path.rstrip('/') or '/'
        paths.setdefault(path,set()).add('03_existing_urls.csv' if csv_available else 'audit_workbook_url_sheet')

def kind(path):
    short=path.removeprefix('/ru') or '/'
    if short=='/':return 'home'
    if short=='/all-tours':return 'tour_catalog'
    if short in ['/dalat','/danang','/nhatrang','/muine']:return 'destination'
    if 'rent-' in short:return 'rental'
    if short=='/privacy':return 'legal'
    return 'tour_detail' if short.startswith('/all-tours/') or 'tour-' in short else 'unknown'
rows=[]
for path,sources in sorted(paths.items()):
    record=routes.get(path,{});page=pages.get(path,{})
    rows.append({'old_path':path,'local_file':page.get('sourceFile',''),'editable_file':index.get(path,{}).get('file',''),'type':kind(path),'language':'ru' if path=='/ru' or path.startswith('/ru/') else 'en','title':page.get('title',''),'resource_state':'available' if record.get('sourceStatus')==200 else 'source_404' if record.get('sourceStatus')==404 else 'not_found_locally','proposed_action':'preserve' if record.get('sourceStatus')==200 else 'exact_redirect' if record.get('target') else 'retain_404_pending_source','target':record.get('target') or '', 'evidence':'|'.join(sorted(sources))})
(ROOT/'data').mkdir(exist_ok=True)
with (ROOT/'data/url-map.csv').open('w',newline='') as file:
    writer=csv.DictWriter(file,fieldnames=list(rows[0]));writer.writeheader();writer.writerows({k: ("'"+v if v.startswith(('=','+','-','@')) else v) for k,v in row.items()}for row in rows)
sheet_refs=set()
for directory in ['app','components','lib','content','.shipstudio/source/pages']:
    for file in (ROOT/directory).rglob('*'):
        if file.is_file() and file.suffix in {'.ts','.tsx','.js','.json','.html'}:
            text=file.read_text(errors='replace')
            sheet_refs.update(re.findall(r'https://docs\.google\.com/spreadsheets/[^\s"<>\\]+',text))
result={'urlMapRows':len(rows),'publicPageRecords':len(pages),'source404Routes':sum(v['sourceStatus']==404 for v in routes.values()),'provided03CsvAvailable':csv_available,'auditWorkbookUrlSheetRead':audit.is_file(),'additionalPaths':sorted(set(paths)-set(routes)),'googleSheetsReferencesFound':sorted(sheet_refs),'runtime':{'framework':'Next.js App Router','localData':'repository JSON','database':'not configured','notifications':'not configured','rawCreatiumRuntime':'archive only'}}
(ROOT/'.shipstudio/s01-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2))
