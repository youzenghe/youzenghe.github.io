import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const errors = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function runDataFile(relativePath, context) {
  vm.runInContext(read(relativePath), context, { filename: relativePath });
}

function headingSlug(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/gi, '')
    .replace(/[\u3000]/g, ' ')
    .replace(/([\u4e00-\u9fff])\s+(\d)/g, '$1$2')
    .replace(/[，。、：:；;！？?（）()【】[\]《》“”"']/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function collectHeadings(html) {
  return Array.from(html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/g))
    .map((match) => match[2].replace(/<[^>]*>/g, '').trim());
}

const mainSource = read('js/main.js');
const learningSource = read('js/pages/learning.js');
const adminConfig = read('admin/config.yml');
const learningPlansData = JSON.parse(read('content/learning-plans.json'));

const categoryLabelsStart = learningSource.indexOf('const categoryLabels = {');
const categoryLabelsEnd = learningSource.indexOf('};', categoryLabelsStart);
const categoryLabelsSource = categoryLabelsStart >= 0 && categoryLabelsEnd > categoryLabelsStart
  ? learningSource.slice(categoryLabelsStart, categoryLabelsEnd)
  : '';

if (!categoryLabelsSource) {
  errors.push('js/pages/learning.js should define categoryLabels.');
} else if (/\p{Extended_Pictographic}/u.test(categoryLabelsSource)) {
  errors.push('learning category labels should use plain text without decorative emoji.');
}

if (!adminConfig.includes('options: ["总览", "主线", "八股速通这一块", "番外", "绝望拷打之啥也不会", "面经"]')) {
  errors.push('admin/config.yml should expose 面经 as a learning category.');
}

const interviewPlan = learningPlansData.plans.find((plan) => plan.cat === '面经' && /牧原股份/.test(plan.title));
if (!interviewPlan) {
  errors.push('content/learning-plans.json should include the 牧原股份 Java 面经 under 面经.');
} else {
  const contentFile = String(interviewPlan.contentFile || '').replace(/^\//, '');
  if (!contentFile.endsWith('.md') || !existsSync(path.join(root, contentFile))) {
    errors.push('the 牧原股份 Java 面经 should reference an existing Markdown contentFile.');
  }
}

if (!mainSource.includes('function findHashTarget(')) {
  errors.push('js/main.js should use a safe hash-target resolver before scrolling.');
}

if (/document\.querySelector\(hash\)/.test(mainSource)) {
  errors.push('js/main.js should not pass raw URL hashes directly into querySelector.');
}

if (!learningSource.includes('function makeHeadingSlug(')) {
  errors.push('js/pages/learning.js should generate stable heading ids from heading text.');
}

if (/heading\.id\s*=\s*`learning-heading-\$\{index\}`/.test(learningSource)) {
  errors.push('js/pages/learning.js should not overwrite all detail headings with transient numeric ids.');
}

if (!learningSource.includes('function loadLearningDetail(')) {
  errors.push('js/pages/learning.js should load a single learning detail bundle for the focused plan.');
}

if (!learningSource.includes('learning-details/learning-${plan.id}.js')) {
  errors.push('js/pages/learning.js should fall back to per-id learning detail bundle paths.');
}

if (!learningSource.includes('script.dataset.loaded = \'true\'')) {
  errors.push('js/pages/learning.js should mark lazy learning scripts after they load.');
}

if (!learningSource.includes('scriptPromise(scriptId, scriptSrc, { force: true })')) {
  errors.push('js/pages/learning.js should force-reload a detail script when the script tag loaded but detail content is missing.');
}

if (!learningSource.includes('Learning detail content missing for id=')) {
  errors.push('js/pages/learning.js should fail explicitly when a learning detail script cannot provide content.');
}

if (!learningSource.includes('function scrollToCurrentHash(')) {
  errors.push('js/pages/learning.js should scroll to URL hashes after async detail content renders.');
}

const context = {
  window: {
    SITE_DATA: Object.freeze({}),
  },
};
vm.createContext(context);
runDataFile('js/data-learning.js', context);

const manifest = context.window.SITE_DATA.learningDetailManifest || {};
const expectedLearningHashes = {
  9: ['五附录高频追问串讲'],
  10: ['十一高频追问串讲'],
};

for (const [id, expectedHashes] of Object.entries(expectedLearningHashes)) {
  const detailScript = manifest[id]?.detailScript || `js/learning-details/learning-${id}.js`;
  runDataFile(detailScript, context);
  const details = context.window.SITE_DATA.learningDetails || {};
  const content = details[id]?.content || '';
  if (!content) {
    errors.push(`learning detail ${id} should include rendered markdown content in ${detailScript}.`);
    continue;
  }

  const headingSlugs = new Set(collectHeadings(content).map(headingSlug).filter(Boolean));
  const missingHashes = expectedHashes.filter((hash) => !headingSlugs.has(hash));

  if (missingHashes.length) {
    errors.push(`learning detail ${id} should generate matching heading ids for: ${missingHashes.join(', ')}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('learning_navigation_ok');
