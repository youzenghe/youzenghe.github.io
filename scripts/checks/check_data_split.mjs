import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pagesDir = path.join(root, 'pages');
const pageFiles = [
  'about.html',
  'acg.html',
  'archive.html',
  'blog.html',
  'categories.html',
  'changelog.html',
  'games.html',
  'learning.html',
  'links.html',
  'moments.html',
  'post.html',
  'posts.html',
  'project.html',
  'projects.html',
  'tags.html',
  '../404.html',
  '../services/index.html',
].map((file) => path.resolve(pagesDir, file));

const errors = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

for (const file of pageFiles) {
  const html = readFileSync(file, 'utf8');
  const relative = path.relative(root, file);
  if (/src=["'][^"']*\/?js\/data\.js(?:[?"'])/i.test(html)) {
    errors.push(`${relative}: still references legacy js/data.js`);
  }
}

const aboutHtml = read('pages/about.html');
if (aboutHtml.includes('<title>关于我 · 超级小识/title>')) {
  errors.push('pages/about.html: malformed title tag remains');
}
if (aboutHtml.includes('超级小识/div>')) {
  errors.push('pages/about.html: malformed acm-name closing tag remains');
}

const legacySize = statSync(path.join(root, 'js/data.js')).size;
const coreSize = statSync(path.join(root, 'js/data-core.js')).size;
if (coreSize >= legacySize * 0.4) {
  errors.push(`js/data-core.js is not small enough: ${coreSize} >= ${Math.round(legacySize * 0.4)}`);
}
if (read('js/data-core.js').includes('"content":')) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(`${read('js/data-core.js')}\nglobalThis.__payload = { POSTS, LEARNING_PLANS };`, context);
  const hasPostBodies = context.__payload.POSTS.some((post) => Object.hasOwn(post, 'content'));
  const hasLearningBodies = context.__payload.LEARNING_PLANS.some((plan) => Object.hasOwn(plan, 'content'));
  if (hasPostBodies || hasLearningBodies) {
    errors.push('js/data-core.js still contains heavy article or learning content bodies');
  }
}

for (const splitFile of ['js/data-posts.js', 'js/data-projects.js', 'js/data-learning.js']) {
  statSync(path.join(root, splitFile));
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`data_split_ok legacy=${legacySize} core=${coreSize}`);
