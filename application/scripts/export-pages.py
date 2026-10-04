"""Export public content and all source hyperlinks without builder markup."""
import csv
import json
import pathlib
import urllib.parse
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = 'https://enduro-vietnam.com'
pages = json.loads((ROOT / 'content/pages.json').read_text())
routes = json.loads((ROOT / 'content/routes.json').read_text())['routes']
assets = json.loads((ROOT / 'content/assets.json').read_text())

class Node:
    def __init__(self, tag, attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []
    def text(self):
        return ''.join(c if isinstance(c, str) else ('\n' if c.tag == 'br' else c.text()) for c in self.children)
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()

class Tree(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = Node('root')
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {'img', 'input', 'meta', 'link', 'br', 'hr', 'source', 'area', 'wbr', 'embed'}:
            self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break
    def handle_data(self, value):
        self.stack[-1].children.append(value)

def normalize_link(raw, route):
    absolute = urllib.parse.urljoin(SOURCE + route, raw)
    url = urllib.parse.urlsplit(absolute)
    if url.scheme not in {'http', 'https', 'mailto', 'tel'}:
        return {'originalHref': raw, 'href': None, 'kind': 'unsupported', 'sourceStatus': None}
    if url.netloc not in {'enduro-vietnam.com', 'www.enduro-vietnam.com'}:
        return {'originalHref': raw, 'href': absolute, 'kind': 'external', 'sourceStatus': None}
    path = urllib.parse.unquote(url.path).rstrip('/') or '/'
    record = routes.get(path)
    target = record.get('target') if record else None
    if not target:
        return {'originalHref': raw, 'href': None, 'kind': 'unavailable', 'sourceStatus': record.get('sourceStatus') if record else None, 'sourcePath': path}
    suffix = ('?' + url.query if url.query else '') + ('#' + url.fragment if url.fragment else '')
    return {'originalHref': raw, 'href': target + suffix, 'kind': 'internal', 'sourceStatus': record['sourceStatus'], 'sourcePath': path}

def inlines(children, route):
    result = []
    for child in children:
        if isinstance(child, str):
            result.append({'type': 'text', 'text': child})
        elif child.tag == 'br':
            result.append({'type': 'break'})
        elif child.tag in {'script', 'style', 'svg', 'iframe', 'img'}:
            continue
        elif child.tag == 'a':
            result.append({'type': 'link', **normalize_link(child.attrs.get('href', ''), route), 'children': inlines(child.children, route)})
        elif child.tag in {'strong', 'b', 'em', 'i', 's', 'u'}:
            result.append({'type': 'strong' if child.tag == 'b' else 'em' if child.tag == 'i' else child.tag, 'children': inlines(child.children, route)})
        else:
            result.extend(inlines(child.children, route))
    return result

index, ledger = [], []
out = ROOT / 'content/exported-pages'
out.mkdir(exist_ok=True)
for page in pages:
    parser = Tree()
    parser.feed((ROOT / page['sourceFile']).read_text())
    body = next((n for n in parser.root.walk() if n.tag == 'body'), parser.root)
    route = page['route']
    blocks, images, links = [], [], []
    anchors = list(dict.fromkeys(n.attrs['id'] for n in body.walk() if n.attrs.get('id')))

    def visit(node):
        if node.tag in {'script', 'style', 'noscript', 'svg', 'iframe', 'select', 'textarea'}:
            return
        if node.tag in {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote', 'figcaption', 'a', 'button', 'label', 'summary'} and node.text().strip():
            blocks.append({'type': node.tag if node.tag in {'h1','h2','h3','h4','h5','h6','p','blockquote'} else 'p', 'id': node.attrs.get('id'), 'children': inlines([node] if node.tag == 'a' else node.children, route)})
            return
        for child in node.children:
            if isinstance(child, Node):
                visit(child)
            elif child.strip():
                blocks.append({'type': 'p', 'children': [{'type': 'text', 'text': child.strip()}]})
    visit(body)

    repairs = []
    if route == '/ru':
        # The original navigation points to this missing anchor. Attach it to
        # the existing services/pricing section rather than creating a page.
        services = next((block for block in blocks if block['type']=='h2' and 'СТОИМОСТЬ АРЕНДЫ' in json.dumps(block, ensure_ascii=False)), None)
        if services and 'uslugi' not in anchors:
            services['id'] = 'uslugi'
            anchors.append('uslugi')
            repairs.append('Restored missing #uslugi anchor on the existing rental/services pricing heading')

    for node in body.walk():
        if node.tag == 'a' and node.attrs.get('href'):
            link = {**normalize_link(node.attrs['href'], route), 'text': node.text().strip()}
            if not link['text']:
                link['text'] = next((n.attrs.get('alt') for n in node.walk() if n.tag == 'img' and n.attrs.get('alt')), '') or link.get('href') or node.attrs['href']
            links.append(link)
            ledger.append({'from': route, **{k:link.get(k) for k in ['text','originalHref','href','kind','sourceStatus','sourcePath']}})
        for key in ('data-lazy-image', 'data-lazy-bgimage', 'src'):
            if key == 'src' and node.tag != 'img':
                continue
            raw = node.attrs.get(key)
            if not raw:
                continue
            url = urllib.parse.urljoin(SOURCE + route, raw).split('#')[0]
            local = assets.get(url) or assets.get(raw)
            if local and not any(image['src'] == local for image in images):
                images.append({'src': local, 'alt': node.attrs.get('alt', ''), 'originalSrc': raw})

    filename = ('home' if route == '/' else route.strip('/').replace('/', '__')) + '.json'
    record = {**{k:page[k] for k in ['route','title','description','canonical']}, 'language': 'ru' if route == '/ru' or route.startswith('/ru/') else 'en', 'sourceUrl': SOURCE + route, 'blocks': blocks, 'links': links, 'images': images, 'anchors': anchors, 'repairs': repairs, 'originalText': page['text']}
    (out / filename).write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    index.append({'route': route, 'title': page['title'], 'language': record['language'], 'file': 'content/exported-pages/' + filename, 'blocks': len(blocks), 'images': len(images), 'links': len(links)})

(ROOT / 'content/page-index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'content/link-ledger.json').write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
with (ROOT / 'content/link-ledger.csv').open('w', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=['from','text','originalHref','href','kind','sourceStatus','sourcePath'])
    writer.writeheader()
    writer.writerows(ledger)
print(json.dumps({'pages': len(index), 'linkOccurrences': len(ledger), 'internal': sum(x['kind']=='internal' for x in ledger), 'unavailable': sum(x['kind']=='unavailable' for x in ledger), 'images': sum(x['images'] for x in index)}))
