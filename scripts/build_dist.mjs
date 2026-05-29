import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const excludedRoots = new Set(['.git', '.github', '.idea', 'dist', 'node_modules']);
const cleanCss = new CleanCSS({ level: 2 });

function shouldSkip(relativePath) {
  const first = relativePath.split(path.sep)[0];
  return excludedRoots.has(first);
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
  const result = cleanCss.minify(source);
  if (result.errors.length) {
    throw new Error(`CSS minify failed for ${sourcePath}: ${result.errors.join(', ')}`);
  }

  await ensureDir(targetPath);
  await fs.writeFile(targetPath, result.styles || source, 'utf8');
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

  await copyFile(sourcePath, targetPath);
}

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
await copyEntry(root);
