#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_SOURCE_DIR = '/mnt/c/Users/ASUS/Desktop/兄控妹妹Java物语/主线/MySQL周-特殊';
const DEFAULT_COVER_DIR = '/mnt/c/Users/ASUS/Desktop/图库/blue_archive_wallpapers-webp';
const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif']);

function usage() {
  console.log(`
Usage:
  npm run daily
  npm run submit:learning -- --file "/path/to/MySQL拷打-0607.md"

Options:
  --file <path>             Markdown file to publish. Default: newest dated .md in source dir.
  --source-dir <path>       Directory to pick the newest Markdown from.
  --category <name>         Learning category. Default: 主线
  --subcategory <name>      Learning subcategory. Default: MySQL周-特殊
  --status <name>           Learning status. Default: 主线训练
  --cat-color <hex>         Category color. Default: #5b9dff
  --tags <a,b,c>            Comma-separated tags. Default is inferred.
  --date <YYYY-MM-DD>       Publish date. Default is inferred from filename or today.
  --read-time <minutes>     Reading time. Default is estimated from Markdown length.
  --cover-dir <path>        Directory to consume the next cover image from.
  --keep-cover-source       Copy cover but do not delete the source image.
  --no-commit               Do not create a git commit.
  --no-push                 Do not push after committing.
  --allow-dirty             Allow running with existing unrelated changes.
  --dry-run                 Print planned changes without writing files.
  --help                    Show this help.

Example:
  npm run daily
  npm run submit:learning -- --file "/mnt/c/Users/ASUS/Desktop/兄控妹妹Java物语/主线/MySQL周-特殊/MySQL拷打-0607.md"
`);
}

function parseArgs(argv) {
  const args = {
    category: '主线',
    subcategory: 'MySQL周-特殊',
    status: '主线训练',
    catColor: '#5b9dff',
    sourceDir: DEFAULT_SOURCE_DIR,
    coverDir: DEFAULT_COVER_DIR,
    commit: true,
    push: true,
    keepCoverSource: false,
    allowDirty: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      return value;
    };

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--file') {
      args.file = readValue();
    } else if (arg === '--source-dir') {
      args.sourceDir = readValue();
    } else if (arg === '--category') {
      args.category = readValue();
    } else if (arg === '--subcategory') {
      args.subcategory = readValue();
    } else if (arg === '--status') {
      args.status = readValue();
    } else if (arg === '--cat-color') {
      args.catColor = readValue();
    } else if (arg === '--tags') {
      args.tags = readValue().split(',').map((tag) => tag.trim()).filter(Boolean);
    } else if (arg === '--date') {
      args.date = readValue();
    } else if (arg === '--read-time') {
      args.readTime = Number(readValue());
    } else if (arg === '--cover-dir') {
      args.coverDir = readValue();
    } else if (arg === '--keep-cover-source') {
      args.keepCoverSource = true;
    } else if (arg === '--no-commit') {
      args.commit = false;
      args.push = false;
    } else if (arg === '--no-push') {
      args.push = false;
    } else if (arg === '--allow-dirty') {
      args.allowDirty = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (args.help) return args;
  if (args.push && !args.commit) throw new Error('--no-commit cannot be used with push enabled; add --no-push');
  return args;
}

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runProjectScript(scriptName) {
  execFileSync('npm', ['run', scriptName], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function gitStatusPaths() {
  const status = runGit(['status', '--porcelain']);
  if (!status) return new Set();
  return new Set(status.split('\n').filter(Boolean).map((line) => line.slice(3)));
}

function ensureCleanWorktree() {
  const status = runGit(['status', '--porcelain']);
  if (status) {
    throw new Error(`Working tree is not clean. Commit/stash existing changes or rerun with --allow-dirty.\n${status}`);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function padId(id) {
  return String(id).padStart(2, '0');
}

function normalizeSlashes(value) {
  return value.replaceAll(path.sep, '/');
}

function inferTitle(markdown, sourcePath) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(sourcePath, path.extname(sourcePath));
}

function todayInShanghai() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function inferDate(sourcePath, title, explicitDate) {
  if (explicitDate) return explicitDate;
  const haystack = `${path.basename(sourcePath)} ${title}`;
  const full = haystack.match(/(20\d{2})[-_.年/]?(\d{1,2})[-_.月/]?(\d{1,2})/);
  if (full) {
    const [, year, month, day] = full;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const short = haystack.match(/(?:^|[^0-9])(\d{2})(\d{2})(?:[^0-9]|$)/);
  if (short) {
    const [, month, day] = short;
    return `${todayInShanghai().slice(0, 4)}-${month}-${day}`;
  }
  return todayInShanghai();
}

function stripMarkdown(value) {
  return value
    .replace(/^#+\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/[`*_~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeExcerpt(title, markdown) {
  const quoteLines = markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('>'))
    .slice(0, 2)
    .map(stripMarkdown);
  const fallback = markdown
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#') && !line.trim().startsWith('---'))
    .slice(0, 2)
    .map(stripMarkdown);
  const text = [title, ...(quoteLines.length ? quoteLines : fallback)].join(' ');
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function makeHighlights(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tocStart = lines.findIndex((line) => /^##\s*目录\s*$/.test(line.trim()));
  const tocItems = [];
  if (tocStart >= 0) {
    for (const line of lines.slice(tocStart + 1, tocStart + 40)) {
      const match = line.trim().match(/^\d+\.\s+(.+)$/);
      if (match) tocItems.push(match[1].trim());
      if (tocItems.length >= 10) break;
    }
  }

  const picked = [];
  for (const item of tocItems.slice(0, 2)) picked.push(`${picked.length + 1}. ${item}`);
  const special = tocItems.find((item) => /速背|口述|复盘|总结|清单/.test(item));
  if (special) picked.push(special);

  if (picked.length < 3) {
    const headings = lines
      .map((line) => line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim())
      .filter(Boolean)
      .filter((heading) => !/^目录$/.test(heading));
    for (const heading of headings) {
      if (!picked.includes(heading)) picked.push(heading);
      if (picked.length >= 3) break;
    }
  }

  return picked.slice(0, 3);
}

function estimateReadTime(markdown, explicitReadTime) {
  if (Number.isFinite(explicitReadTime) && explicitReadTime > 0) return Math.round(explicitReadTime);
  const chineseChars = (markdown.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (markdown.match(/[A-Za-z0-9_+-]+/g) || []).length;
  return Math.max(3, Math.ceil((chineseChars + latinWords * 0.7) / 650));
}

function inferTags(args, title) {
  if (args.tags?.length) return args.tags;
  const tags = [args.category];
  if (args.subcategory) tags.push(args.subcategory);
  if (/mysql/i.test(title) || /MySQL/.test(args.subcategory)) tags.push('MySQL', '面试', 'SQL');
  return [...new Set(tags)];
}

function sourceLabel(sourcePath) {
  const normalized = normalizeSlashes(path.resolve(sourcePath));
  const marker = '/兄控妹妹Java物语/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) return normalized.slice(markerIndex + marker.length);
  return path.basename(sourcePath);
}

function nextCover(coverDir) {
  const entries = fs.readdirSync(coverDir)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  if (!entries.length) throw new Error(`No cover images found in ${coverDir}`);
  return path.join(coverDir, entries[0]);
}

function dateKeyFromFileName(file) {
  const name = path.basename(file);
  const full = name.match(/(20\d{2})[-_.年/]?(\d{1,2})[-_.月/]?(\d{1,2})/);
  if (full) {
    const [, year, month, day] = full;
    return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  }
  const short = name.match(/(?:^|[^0-9])(\d{2})(\d{2})(?:[^0-9]|$)/);
  if (short) {
    const [, month, day] = short;
    return `${todayInShanghai().slice(0, 4)}${month}${day}`;
  }
  return '';
}

function dateKeyFromDate(value) {
  const match = String(value || '').match(/(20\d{2})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : '';
}

function newestMarkdown(sourceDir, usedSources = new Set(), usedDateKeys = new Set()) {
  if (!fs.existsSync(sourceDir)) throw new Error(`Source directory does not exist: ${sourceDir}`);
  const entries = fs.readdirSync(sourceDir)
    .filter((name) => path.extname(name).toLowerCase() === '.md')
    .map((name) => {
      const file = path.join(sourceDir, name);
      return { file, dateKey: dateKeyFromFileName(file), mtimeMs: fs.statSync(file).mtimeMs };
    })
    .filter(({ file, dateKey }) => !usedSources.has(sourceLabel(file)) && !(dateKey && usedDateKeys.has(dateKey)))
    .sort((a, b) => {
      if (b.dateKey !== a.dateKey) return b.dateKey.localeCompare(a.dateKey);
      if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs;
      return path.basename(b.file).localeCompare(path.basename(a.file), 'zh-Hans-CN');
    });
  if (!entries.length) throw new Error(`No unpublished Markdown files found in ${sourceDir}`);
  return entries[0].file;
}

function insertPlanEntry(jsonPath, entry) {
  const source = fs.readFileSync(jsonPath, 'utf8');
  const marker = '"plans": [';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Cannot find ${marker} in ${jsonPath}`);
  const insertAt = source.indexOf('\n', markerIndex);
  if (insertAt < 0) throw new Error(`Cannot find insertion point in ${jsonPath}`);
  const entryText = JSON.stringify(entry, null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  fs.writeFileSync(jsonPath, `${source.slice(0, insertAt + 1)}${entryText},\n${source.slice(insertAt + 1)}`, 'utf8');
}

function makePlan(args) {
  const plansPath = path.join(ROOT, 'content', 'learning-plans.json');
  const data = readJson(plansPath);
  const usedSources = new Set(data.plans.map((plan) => plan.source).filter(Boolean));
  const usedDateKeys = new Set(data.plans
    .filter((plan) => plan.cat === args.category && plan.subcategory === args.subcategory)
    .map((plan) => dateKeyFromDate(plan.date))
    .filter(Boolean));
  const sourcePath = path.resolve(args.file || newestMarkdown(args.sourceDir, usedSources, usedDateKeys));
  if (!fs.existsSync(sourcePath)) throw new Error(`Markdown file does not exist: ${sourcePath}`);
  if (usedSources.has(sourceLabel(sourcePath))) {
    throw new Error(`Markdown source is already published: ${sourceLabel(sourcePath)}`);
  }
  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const title = inferTitle(markdown, sourcePath);
  const date = inferDate(sourcePath, title, args.date);
  const sourceDateKey = dateKeyFromDate(date);
  if (sourceDateKey && usedDateKeys.has(sourceDateKey)) {
    throw new Error(`Learning note date is already published for ${args.category} / ${args.subcategory}: ${date}`);
  }
  const ids = data.plans.map((plan) => Number(plan.id)).filter(Number.isFinite);
  const id = Math.max(0, ...ids) + 1;
  const idText = padId(id);
  const mdDest = path.join(ROOT, 'content', 'learning-plans-md', `learning-${idText}.md`);
  const coverSource = nextCover(args.coverDir);
  const coverDest = path.join(ROOT, 'assets', 'motion', 'learning', `blue-archive-learning-${idText}${path.extname(coverSource).toLowerCase()}`);

  const entry = {
    id,
    title,
    cat: args.category,
    catColor: args.catColor,
    subcategory: args.subcategory,
    date,
    updatedAt: date,
    status: args.status,
    readTime: estimateReadTime(markdown, args.readTime),
    emoji: '📚',
    cover: `../assets/motion/learning/${path.basename(coverDest)}`,
    coverAnimated: false,
    excerpt: makeExcerpt(title, markdown),
    tags: inferTags(args, title),
    highlights: makeHighlights(markdown),
    source: sourceLabel(sourcePath),
    contentFile: `/content/learning-plans-md/${path.basename(mdDest)}`,
  };

  return { id, title, date, sourcePath, mdDest, coverSource, coverDest, plansPath, entry };
}

function printPlan(plan, args) {
  console.log(`Learning note: ${plan.title}`);
  console.log(`ID: ${plan.id}`);
  console.log(`Date: ${plan.date}`);
  console.log(`Category: ${plan.entry.cat} / ${plan.entry.subcategory}`);
  console.log(`Markdown: ${plan.sourcePath} -> ${plan.mdDest}`);
  console.log(`Cover: ${plan.coverSource} -> ${plan.coverDest}`);
  console.log(`Delete cover source: ${args.keepCoverSource ? 'no' : 'yes'}`);
  console.log(`Commit: ${args.commit ? 'yes' : 'no'}`);
  console.log(`Push: ${args.push ? 'yes' : 'no'}`);
  console.log(`Prepare site: ${args.commit ? 'yes' : 'no'}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const plan = makePlan(args);
  printPlan(plan, args);

  if (args.dryRun) return;
  const baselineDirtyPaths = args.allowDirty ? gitStatusPaths() : new Set();
  if (!args.allowDirty) ensureCleanWorktree();
  if (fs.existsSync(plan.mdDest)) throw new Error(`Destination Markdown already exists: ${plan.mdDest}`);
  if (fs.existsSync(plan.coverDest)) throw new Error(`Destination cover already exists: ${plan.coverDest}`);

  fs.copyFileSync(plan.sourcePath, plan.mdDest);
  fs.copyFileSync(plan.coverSource, plan.coverDest);
  if (!args.keepCoverSource) fs.unlinkSync(plan.coverSource);
  insertPlanEntry(plan.plansPath, plan.entry);

  const relativePaths = [plan.mdDest, plan.coverDest, plan.plansPath]
    .map((file) => normalizeSlashes(path.relative(ROOT, file)));

  if (args.commit) {
    runProjectScript('prepare:site');
    const changedPaths = [...gitStatusPaths()].filter((file) => !baselineDirtyPaths.has(file));
    if (!changedPaths.length) {
      throw new Error('No generated changes found to commit after preparing the site.');
    }
    runGit(['add', '--', ...changedPaths], { stdio: 'inherit' });
    runGit(['commit', '-m', `Add ${plan.title} learning note`], { stdio: 'inherit' });
    if (args.push) {
      runGit(['push', 'origin', 'main'], { stdio: 'inherit' });
    }
  } else {
    console.log(`Files written but not committed:\n${relativePaths.join('\n')}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`submit_learning_note failed: ${error.message}`);
  process.exit(1);
}
