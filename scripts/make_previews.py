#!/usr/bin/env python3
"""Make responsive image previews. Requires Pillow and the cwebp CLI."""
import hashlib
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'html'
generated = {}
before = after = 0

for page in [ROOT / 'index.html', ROOT / 'apps.html', *sorted(ROOT.glob('projects/*/index.html')),
             *[ROOT / name / 'index.html' for name in ['TranslationBooks', 'SimpleServersMonitor', 'VisualAppLauncher']]]:
    text = page.read_text()
    legacy = page.parent.name in ['TranslationBooks', 'SimpleServersMonitor', 'VisualAppLauncher']
    sizes = ('(max-width: 767px) calc(100vw - 90px), (max-width: 1199px) 280px, 360px' if legacy else
             '(max-width: 760px) calc(100vw - 50px), (max-width: 1100px) 45vw, 30vw' if page.parent == ROOT else
             '(max-width: 760px) calc(100vw - 50px), 50vw')

    def preview(match):
        global before, after
        tag = match[0]
        src = re.search(r'\bsrc="([^"]+)"', tag)
        if not src:
            return tag
        url = src[1]
        if 'assets/apps/' not in url and '/screenshots/' not in url:
            return tag
        original = (page.parent / unquote(urlsplit(url).path)).resolve()
        if original.suffix not in ('.webp', '.jpg', '.png'):
            return tag
        with Image.open(original) as image:
            width, height = image.size
        if width <= 720 or '/screenshots/' not in url and original.suffix != '.webp':
            return tag
        target = original.with_name(original.stem + '-720.webp')
        if original not in generated:
            print(f'Create 720 pixel preview: {original.relative_to(ROOT)}', flush=True)
            subprocess.run(['cwebp', '-quiet', '-resize', '720', '0', '-q', '90', '-m', '6', str(original), '-o', str(target)], check=True)
            generated[original] = target
            before += original.stat().st_size
            after += target.stat().st_size
        preview_url = str(Path(urlsplit(url).path).with_name(target.name))
        preview_url += '?v=' + hashlib.sha256(target.read_bytes()).hexdigest()[:10]
        tag = re.sub(r'\s+(srcset|sizes)="[^"]*"', '', tag)
        tag = re.sub(r'\bwidth="\d+"', f'width="{width}"', tag)
        tag = re.sub(r'\bheight="\d+"', f'height="{height}"', tag)
        return tag[:-1] + f' srcset="{preview_url} 720w, {url} {width}w" sizes="{sizes}">'

    updated = re.sub(r'<img\b[^>]*>', preview, text)
    # Give the first visible image priority over the lazy galleries.
    if legacy:
        updated = updated.replace('class="img-icon"', 'class="img-icon" fetchpriority="high"') if 'fetchpriority="high"' not in updated else updated
    else:
        updated = updated.replace('loading="eager"', 'loading="eager" fetchpriority="high"', 1) if 'fetchpriority="high"' not in updated else updated
    if updated != text:
        page.write_text(updated)

print(f'Created {len(generated)} previews. Source bytes: {before}; preview bytes: {after}.')
