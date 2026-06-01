import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const publicRootEntries = new Set([
  '.nojekyll',
  '404.html',
  'CNAME',
  'admin',
  'assets',
  'css',
  'games',
  'index.html',
  'js',
  'pages',
  'robots.txt',
  'rss.xml',
  'services',
  'sitemap.xml',
]);
const cleanCss = new CleanCSS({ level: 2 });
const assetVersion = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 12);

function shouldSkip(relativePath) {
  const parts = relativePath.split(path.sep);
  const first = parts[0];
  if (parts.some((part) => part.startsWith('__'))) return true;
  if (path.basename(relativePath).toLowerCase() === 'readme.md') return true;
  return !publicRootEntries.has(first);
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeMinifiedJs(sourcePath, targetPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = await minifyJs(source, {
    compress: true,
    mangle: true,
    format: {
      comments: false,
    },
  });

  await ensureDir(targetPath);
  await fs.writeFile(targetPath, result.code || source, 'utf8');
}

async function writeMinifiedCss(sourcePath, targetPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  if (/@import\s+/i.test(source)) {
    await ensureDir(targetPath);
    await fs.writeFile(targetPath, source, 'utf8');
    return;
  }
  const result = cleanCss.minify(source);
  if (result.errors.length) {
    throw new Error(`CSS minify failed for ${sourcePath}: ${result.errors.join(', ')}`);
  }

  await ensureDir(targetPath);
  await fs.writeFile(targetPath, result.styles || source, 'utf8');
}

function appendAssetVersion(url) {
  if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('#')) {
    return url;
  }

  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const separator = withoutHash.includes('?') ? '&' : '?';
  return `${withoutHash}${separator}v=${assetVersion}${hash}`;
}

function versionHtmlAssets(html) {
  return html
    .replace(/(<script\b[^>]*\bsrc=["'])([^"']+?\.js(?:\?[^"']*)?)(["'][^>]*>)/gi, (_match, before, src, after) => (
      `${before}${appendAssetVersion(src)}${after}`
    ))
    .replace(/(<link\b[^>]*\bhref=["'])([^"']+?\.css(?:\?[^"']*)?)(["'][^>]*>)/gi, (_match, before, href, after) => (
      `${before}${appendAssetVersion(href)}${after}`
    ));
}

async function writeVersionedHtml(sourcePath, targetPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  await ensureDir(targetPath);
  await fs.writeFile(targetPath, versionHtmlAssets(source), 'utf8');
}

async function copyFile(sourcePath, targetPath) {
  await ensureDir(targetPath);
  await fs.copyFile(sourcePath, targetPath);
}

async function copyEntry(sourcePath, relativePath = '') {
  if (relativePath && shouldSkip(relativePath)) return;

  const stat = await fs.stat(sourcePath);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(sourcePath);
    await Promise.all(entries.map((entry) => {
      const nextRelative = relativePath ? path.join(relativePath, entry) : entry;
      return copyEntry(path.join(sourcePath, entry), nextRelative);
    }));
    return;
  }

  const targetPath = path.join(dist, relativePath);
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === '.js') {
    await writeMinifiedJs(sourcePath, targetPath);
    return;
  }
  if (ext === '.css') {
    await writeMinifiedCss(sourcePath, targetPath);
    return;
  }
  if (ext === '.html') {
    await writeVersionedHtml(sourcePath, targetPath);
    return;
  }

  await copyFile(sourcePath, targetPath);
}

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
await copyEntry(root);
