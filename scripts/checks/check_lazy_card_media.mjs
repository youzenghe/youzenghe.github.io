import { readFileSync } from 'node:fs';

const homeSource = readFileSync('js/pages/home.js', 'utf8');
const mainSource = readFileSync('js/main.js', 'utf8');
const errors = [];

if (!mainSource.includes('function initLazyMedia')) {
  errors.push('js/main.js should expose initLazyMedia for deferred image/background loading');
}

if (!homeSource.includes('data-lazy-bg-target=')) {
  errors.push('js/pages/home.js should reuse lazy image loads for card background layers with data-lazy-bg-target');
}

if (!homeSource.includes('data-lazy-src=')) {
  errors.push('js/pages/home.js should defer non-eager card image src values with data-lazy-src');
}

if (/class="img-bg"[^>]*(?:data-lazy-bg=|style=["'][^"']*(?:background-image\s*:|background\s*:)\s*url\()/.test(homeSource)) {
  errors.push('js/pages/home.js should not make card background layers request image URLs independently');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('lazy_card_media_ok');
