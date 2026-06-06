import { readFileSync } from 'node:fs';

const source = readFileSync('js/main.js', 'utf8');
const initSearchStart = source.indexOf('function initSearch()');
const initThemeStart = source.indexOf('function initTheme()', initSearchStart);
const searchSource = source.slice(initSearchStart, initThemeStart);
const errors = [];

if (!searchSource.includes('LEARNING_PLANS')) {
  errors.push('site search should include learning plans from data-core.js');
}

if (!searchSource.includes('PROJECTS')) {
  errors.push('site search should include projects from data-core.js');
}

if (!searchSource.includes("type: 'learning'") || !searchSource.includes("type: 'project'")) {
  errors.push('site search results should carry explicit learning/project types');
}

if (!searchSource.includes("pages/learning.html") || !searchSource.includes("pages/project.html")) {
  errors.push('site search should link learning and project results to their detail pages');
}

if (!searchSource.includes('function searchScore') || !searchSource.includes('.sort((a, b) => b.score - a.score || a.index - b.index)')) {
  errors.push('site search should rank stronger title/category matches ahead of weaker full-text matches');
}

if (searchSource.includes('js/data-learning.js')) {
  errors.push('site search should not load the heavy learning detail bundle by default');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('site_search_ok');
