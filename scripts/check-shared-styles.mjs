import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL('../dist/', import.meta.url));
async function htmlFiles(directory) {
  const entries = await fs.readdir(directory, {withFileTypes:true});
  const nested = await Promise.all(entries.map(entry => {
    const file = path.join(directory,entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith('.html') ? [file] : [];
  }));
  return nested.flat();
}

const rows = [], skipped = [], failures = [];
for (const file of (await htmlFiles(root)).sort()) {
  const html = parse(await fs.readFile(file,'utf8'));
  const documentPath = path.relative(root,file);
  if (!html.querySelector('html')) {
    skipped.push({path:documentPath,reason:'Redirect-only fragment without a document layout'});
    continue;
  }
  if (!html.querySelector('#main-grid')) {
    skipped.push({path:documentPath,reason:'Standalone document outside the blog layout'});
    continue;
  }
  const styles = html.querySelectorAll('style').map(node => node.textContent);
  for (const link of html.querySelectorAll('link[rel="stylesheet"]')) {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) continue;
    const asset = path.resolve(root,`.${decodeURIComponent(href.split(/[?#]/)[0])}`);
    const relative = path.relative(root,asset);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Stylesheet outside output root');
    styles.push(await fs.readFile(asset,'utf8'));
  }
  const css = styles.join('\n');
  const checks = {
    themeTokens: /--radius-large\s*:/.test(css) && /--primary\s*:/.test(css) && /--card-bg\s*:/.test(css),
    markdown: !html.querySelector('.custom-md') || /\.custom-md\s+a:not\(\.no-styling\)/.test(css),
    repositoryCards: !html.querySelector('.card-github') || /\.gc-titlebar\s*\{[^}]*display\s*:\s*flex/.test(css),
  };
  rows.push({path:documentPath,...checks});
  if (Object.values(checks).some(value=>!value)) failures.push(rows.at(-1));
}
console.log(JSON.stringify({documents:rows.length,skipped,rows,failures},null,2));
if (failures.length) process.exitCode=1;
