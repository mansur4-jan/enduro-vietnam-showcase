"""Check every exported route and the links actually rendered by the rebuild."""
import concurrent.futures
import datetime
import json
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = os.environ.get('MIGRATION_BASE_URL', 'http://localhost:3000').rstrip('/')
inventory = json.loads((ROOT / 'content/routes.json').read_text())
pages = json.loads((ROOT / 'content/page-index.json').read_text())

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.ids, self.images = [], set(), []
        self.title, self.h1, self.text = '', [], []
        self.in_title, self.in_h1, self.heading = False, False, ''
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'h1': self.in_h1, self.heading = True, ''
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'img' and attrs.get('src'):
            self.images.append(attrs['src'])
    def handle_data(self, value):
        if self.in_title: self.title += value
        if self.in_h1: self.heading += value
        self.text.append(value)
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'h1':
            self.h1.append(self.heading.strip())
            self.in_h1 = False

def request(route):
    url = BASE + route
    try:
        with urllib.request.urlopen(url, timeout=90) as response:
            parser = Page()
            body = response.read().decode('utf8')
            parser.feed(body)
            result = {'status': response.status, 'finalPath': urllib.parse.urlsplit(response.url).path, 'links': parser.links, 'ids': sorted(parser.ids), 'images': parser.images, 'title': parser.title, 'h1': parser.h1}
            if route == '/sitemap.xml':
                result['sitemapPaths'] = [urllib.parse.urlsplit(node.text).path.rstrip('/') or '/' for node in ET.fromstring(body).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
            return route, result
    except urllib.error.HTTPError as error:
        return route, {'status': error.code, 'finalPath': route}
    except Exception as error:
        return route, {'status': 0, 'error': str(error)}

all_routes = list(dict.fromkeys(list(inventory['routes']) + ['/site-map', '/sitemap.xml', '/this-page-does-not-exist']))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    responses = dict(pool.map(request, all_routes))

errors, internal, image_count = [], set(), 0
source_pages = json.loads((ROOT / 'content/pages.json').read_text())
for page in source_pages:
    response = responses[page['route']]
    if response.get('title') != page['title']:
        errors.append({'route': page['route'], 'titleMismatch': response.get('title'), 'expected': page['title']})
    expected_h1 = next((h['text'] for h in page['headings'] if h['level']=='h1'), None)
    if expected_h1 and expected_h1 not in response.get('h1', []):
        errors.append({'route': page['route'], 'missingSourceH1': expected_h1})
for route, record in inventory['routes'].items():
    response = responses[route]
    expected = 200 if record['target'] else 404
    if response['status'] != expected:
        errors.append({'route': route, 'expected': expected, 'actual': response})
    if record['target'] and response.get('finalPath') != record['target']:
        errors.append({'route': route, 'wrongRedirect': response.get('finalPath'), 'expectedTarget': record['target']})

for route, response in list(responses.items()):
    if response['status'] != 200:
        continue
    for href in response.get('links', []):
        parsed = urllib.parse.urlsplit(urllib.parse.urljoin(BASE + route, href))
        if parsed.netloc in {'enduro-vietnam.com', 'www.enduro-vietnam.com'}:
            errors.append({'route': route, 'sourceHostLink': href})
        if parsed.netloc != urllib.parse.urlsplit(BASE).netloc:
            continue
        target = urllib.parse.unquote(parsed.path).rstrip('/') or '/'
        internal.add(target)
        result = responses.get(target)
        if not result:
            _, result = request(target)
            responses[target] = result
        if result['status'] != 200:
            errors.append({'route': route, 'brokenLink': href, 'status': result['status']})
        elif parsed.fragment and urllib.parse.unquote(parsed.fragment) not in result.get('ids', []):
            errors.append({'route': route, 'missingAnchor': href})
    for image in response.get('images', []):
        parsed = urllib.parse.urlsplit(image)
        if parsed.netloc in {'enduro-vietnam.com', 'img2.creatium.app', 'img.creatium.app'}:
            errors.append({'route': route, 'sourceHostImage': image})
        if not parsed.netloc and parsed.path.startswith('/assets/'):
            image_count += 1
            if not (ROOT / 'public' / parsed.path.lstrip('/')).is_file():
                errors.append({'route': route, 'missingLocalImage': image})

if responses['/site-map']['status'] != 200 or responses['/this-page-does-not-exist']['status'] != 404:
    errors.append({'utilityRoutes': 'Incorrect site index or unknown-page response'})
if set(responses['/sitemap.xml'].get('sitemapPaths', [])) != {page['route'] for page in pages}:
    errors.append({'sitemapCoverage': 'Sitemap must include exactly all 53 available public source routes'})
report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'baseUrl': BASE, 'availableSourcePages': len(pages), 'successfulPageRoutes': sum(responses[p['route']]['status']==200 for p in pages), 'redirectsVerified': sum(bool(r['target'] and r['target']!=k and responses[k].get('finalPath')==r['target']) for k,r in inventory['routes'].items()), 'source404WithoutReplacement': sum(r['target'] is None for r in inventory['routes'].values()), 'distinctRenderedInternalTargets': len(internal), 'localImageOccurrencesChecked': image_count, 'errors': errors, 'responses': responses}
(ROOT / '.shipstudio/route-check-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({**{k:v for k,v in report.items() if k not in {'responses','errors'}}, 'errorCount': len(errors), 'firstErrors': errors[:10]}, ensure_ascii=False, indent=2))
raise SystemExit(1 if errors else 0)
