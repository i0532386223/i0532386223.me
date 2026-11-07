#!/usr/bin/env python3
"""Check static references, document IDs, JSON data, and CSP coverage."""
from collections import Counter
from fnmatch import fnmatchcase
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1] / 'html'
errors = []

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = []
        self.refs = []
        self.script_type = None
        self.script_text = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        for name in ('href', 'src', 'action', 'poster'):
            if attrs.get(name):
                self.refs.append(attrs[name])
        if attrs.get('srcset'):
            self.refs.extend(candidate.strip().split()[0] for candidate in attrs['srcset'].split(','))
        for name in attrs:
            if name.startswith('on') or name == 'style':
                errors.append(f'{self.path}: inline code: {name}')
        if tag == 'script' and not attrs.get('src'):
            self.script_type = attrs.get('type', 'executable')
            self.script_text = ''

    def handle_data(self, data):
        if self.script_type:
            self.script_text += data

    def handle_endtag(self, tag):
        if tag != 'script' or not self.script_type:
            return
        if self.script_type != 'application/json':
            errors.append(f'{self.path}: inline executable script')
        else:
            try:
                json.loads(self.script_text)
            except ValueError as error:
                errors.append(f'{self.path}: invalid JSON: {error}')
        self.script_type = None

pages = {path: Page(path.relative_to(ROOT)) for path in ROOT.rglob('*.html')}
for path, page in pages.items():
    page.feed(path.read_text())
    for identifier, count in Counter(page.ids).items():
        if count > 1:
            errors.append(f'{page.path}: duplicate ID: {identifier}')

def check_reference(source, value):
    url = urlsplit(value)
    if url.scheme or url.netloc:
        return
    path = unquote(url.path)
    destination = (ROOT / path.lstrip('/')) if path.startswith('/') else source.parent / path
    destination = destination.resolve() if path else source
    if not destination.is_relative_to(ROOT):
        errors.append(f'{source.relative_to(ROOT)}: reference leaves the site: {value}')
        return
    if destination.is_dir():
        destination /= 'index.html'
    if not destination.is_file():
        errors.append(f'{source.relative_to(ROOT)}: missing file: {value}')
    elif url.fragment and destination in pages and unquote(url.fragment) not in pages[destination].ids:
        errors.append(f'{source.relative_to(ROOT)}: missing fragment: {value}')

references = 0
for path, page in pages.items():
    for value in page.refs:
        references += 1
        check_reference(path, value)
for path in ROOT.rglob('*.css'):
    for match in re.finditer(r'url\(\s*([\'"]?)(.*?)\1\s*\)', path.read_text()):
        references += 1
        check_reference(path, match[2])

rules = []
for line in (ROOT / '_headers').read_text().splitlines():
    if not line.strip() or line.startswith('#'):
        continue
    if not line[0].isspace():
        rules.append((line, []))
    else:
        key, value = line.strip().split(':', 1)
        rules[-1][1].append((key.lower(), value.strip()))

for path in pages:
    relative = path.relative_to(ROOT).as_posix()
    urls = {'/' + relative}
    if path.name == 'index.html':
        urls.add('/' + relative.removesuffix('index.html'))
    elif path.name != '404.html':
        urls.add('/' + relative.removesuffix('.html'))
    for url in urls:
        headers = [item for pattern, values in rules if fnmatchcase(url, pattern) for item in values]
        policies = [value for key, value in headers if key == 'content-security-policy']
        if len(policies) != 1:
            errors.append(f'{url}: expected one CSP, got {len(policies)}')
        for key, expected in [('x-frame-options', 'DENY'), ('x-content-type-options', 'nosniff')]:
            if (key, expected) not in headers:
                errors.append(f'{url}: missing {key}')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    raise SystemExit(1)
print(f'PASS: {len(pages)} HTML pages; {references} HTML/CSS references; unique IDs; valid JSON; CSP coverage.')
