import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveRequestPath(root, pathname) {
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes('\0') || decoded.includes('\\')) return null;
    const candidate = path.resolve(root, `.${decoded}`);
    return candidate === root || candidate.startsWith(root + path.sep) ? candidate : null;
  } catch {
    return null;
  }
}

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg',
};

export async function startPreview({ port = 4322, host = '127.0.0.1', root: directory = fileURLToPath(new URL('../dist/', import.meta.url)) } = {}) {
  const root = path.resolve(directory);
  await fs.access(path.join(root, 'index.html'));
  const actualRoot = await fs.realpath(root);
  const server = http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const url = new URL(request.url, 'http://localhost');
      let file = resolveRequestPath(root, url.pathname);
      if (!file) { response.writeHead(400).end(); return; }
      const stat = await fs.stat(file);
      if (stat.isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          response.writeHead(302, { Location: url.pathname + '/' + url.search }).end();
          return;
        }
        file = path.join(file, 'index.html');
      }
      const real = await fs.realpath(file);
      if (!real.startsWith(actualRoot + path.sep)) { response.writeHead(403).end(); return; }
      const bytes = await fs.readFile(real);
      response.writeHead(200, {
        'Content-Type': types[path.extname(real)] || 'application/octet-stream',
        'Content-Length': bytes.length, 'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      const fallback = await fs.realpath(path.join(root, '404.html')).catch(() => null);
      const notFound = fallback?.startsWith(actualRoot + path.sep)
        ? await fs.readFile(fallback).catch(() => null)
        : null;
      response.writeHead(404, {
        'Content-Type': notFound ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      }).end(request.method === 'HEAD' ? undefined : notFound || 'Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4322);
  startPreview({ port, host: process.env.HOST || '127.0.0.1' })
    .then(() => console.log(`Blog preview: http://localhost:${port}/ (Ctrl+C to stop)`))
    .catch(error => { console.error(`Cannot start preview: ${error.message}`); process.exitCode = 1; });
}
