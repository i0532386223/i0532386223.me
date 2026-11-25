"""Read the Cloudflare Pages header rules used by the preview and the site check."""
from fnmatch import fnmatchcase


def read_rules(path):
    rules = []
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if not line[0].isspace():
            rules.append((line, []))
        elif line.strip().startswith('! '):
            rules[-1][1].append((line.strip()[2:].strip().lower(), None))
        else:
            key, value = line.strip().split(':', 1)
            rules[-1][1].append((key.lower(), value.strip()))
    return rules


def headers_for_path(rules, path):
    headers = []
    for pattern, entries in rules:
        if fnmatchcase(path, pattern):
            for key, value in entries:
                if value is None:
                    headers = [entry for entry in headers if entry[0] != key]
                else:
                    headers.append((key, value))
    return headers
