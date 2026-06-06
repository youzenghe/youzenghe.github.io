import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mainSource = readFileSync(path.join(root, 'js/main.js'), 'utf8');
const errors = [];

const applyStart = mainSource.indexOf('async function applyFetchedPage');
const applyEnd = mainSource.indexOf('async function fetchPageDocument');
const applySource = applyStart >= 0 && applyEnd > applyStart ? mainSource.slice(applyStart, applyEnd) : '';

if (!applySource) {
  errors.push('js/main.js: applyFetchedPage should exist.');
}

if (/requestAnimationFrame\(\(\)\s*=>\s*{[\s\S]*runCurrentPageModule/.test(applySource)) {
  errors.push('js/main.js: SPA page modules should not be delayed until requestAnimationFrame after swapping content.');
}

const runIndex = applySource.indexOf('runCurrentPageModule');
const scrollIndex = applySource.indexOf('scrollToNavigationTarget');
if (runIndex < 0) {
  errors.push('js/main.js: applyFetchedPage should run the target page module after scripts are ready.');
}
if (scrollIndex >= 0 && runIndex >= 0 && scrollIndex < runIndex) {
  errors.push('js/main.js: hash scrolling should happen after the target page module renders dynamic anchors.');
}

if (!mainSource.includes('[PageModule]')) {
  errors.push('js/main.js: page module execution should report failures without leaving a silent blank page.');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('spa_router_ok');
