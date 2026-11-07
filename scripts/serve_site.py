#!/usr/bin/env python3
"""Serve the local site and its _headers for browser checks. Not a production server."""
import argparse
import fnmatch
import functools
import http.server
from pathlib import Path
from urllib.parse import unquote, urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1] / 'html')
parser.add_argument('--port', type=int, default=8766)
args = parser.parse_args()

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        requested = self.path
        path = urlsplit(requested).path
        target = args.root / unquote(path).lstrip('/')
        if not target.exists() and target.with_suffix('.html').is_file():
            self.path = path + '.html'
        try:
            return super().send_head()
        finally:
            self.path = requested

    def send_error(self, code, message=None, explain=None):
        page = args.root / '404.html'
        if code != 404 or not page.is_file():
            return super().send_error(code, message, explain)
        body = page.read_bytes()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def end_headers(self):
        path = urlsplit(self.path).path
        rule = None
        for line in (args.root / '_headers').read_text().splitlines():
            if not line.strip() or line.startswith('#'):
                continue
            if not line[0].isspace():
                rule = line
            elif rule and fnmatch.fnmatchcase(path, rule):
                key, value = line.strip().split(':', 1)
                self.send_header(key, value.strip())
        super().end_headers()

    def log_message(self, *values):
        pass

    def log_error(self, message, *values):
        print('[site-preview] ' + message % values, flush=True)

class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True

print(f'Serving {args.root} on http://127.0.0.1:{args.port} with _headers and a local 404 page.', flush=True)
Server(('127.0.0.1', args.port), functools.partial(Handler, directory=str(args.root))).serve_forever()
