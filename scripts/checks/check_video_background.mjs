import { existsSync, readdirSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('js/main.js', 'utf8');

if (source.includes('assets/bg-pool/pc/')) {
  throw new Error('main.js should not reference deleted assets/bg-pool/pc/ static pool');
}
if (source.includes('BG_POOL_SIZE_PC =')) {
  throw new Error('main.js should not keep the deleted PC static pool size config');
}

if (existsSync('assets/bg-pool/pc')) {
  throw new Error('legacy assets/bg-pool/pc directory should be removed after video background migration');
}

const pcVideoFiles = readdirSync('assets/bg-pool/pc-video');
const webmCount = pcVideoFiles.filter((file) => /^bg\d+\.webm$/.test(file)).length;
const posterCount = pcVideoFiles.filter((file) => /^bg\d+\.webp$/.test(file)).length;
if (webmCount !== 120 || posterCount !== 120) {
  throw new Error(`pc-video pool should contain 120 webm + 120 poster files, got ${webmCount} webm and ${posterCount} webp`);
}

function createContext({ width = 1200, reducedMotion = false, saveData = false } = {}) {
  const body = {
    dataset: { rootPrefix: '../' },
    classList: { add() {}, remove() {} },
    style: {},
  };

  return {
    window: {
      innerWidth: width,
      matchMedia: (query) => ({
        matches: query.includes('max-width') ? width <= 768 : reducedMotion,
      }),
      requestIdleCallback: null,
      setTimeout() {},
      clearTimeout() {},
      addEventListener() {},
    },
    navigator: {
      connection: saveData ? { saveData: true } : {},
    },
    document: {
      readyState: 'loading',
      body,
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      getElementById() { return null; },
      createElement(tagName) {
        return {
          tagName: tagName.toUpperCase(),
          dataset: {},
          classList: { add() {}, remove() {}, contains() { return false; } },
          style: {},
          setAttribute() {},
          removeAttribute() {},
          appendChild() {},
          replaceChildren() {},
          addEventListener() {},
          cloneNode() { return this; },
          pause() {},
          play() { return Promise.resolve(); },
          load() {},
        };
      },
    },
    location: { hostname: '127.0.0.1', href: 'http://127.0.0.1/pages/posts.html' },
    Image: function Image() {},
    URL,
    console,
    setTimeout() {},
    clearTimeout() {},
  };
}

function runExpression(expression, options) {
  const context = createContext(options);
  vm.createContext(context);
  return vm.runInContext(`${source}\n${expression}`, context, { filename: 'js/main.js' });
}

const desktopBg = runExpression('createBgUrl();');
if (desktopBg?.type !== 'video') {
  throw new Error('PC background should use video source objects');
}
if (!desktopBg.webm?.endsWith('.webm') || !desktopBg.poster?.endsWith('.webp')) {
  throw new Error(`PC video background should expose webm and poster paths: ${JSON.stringify(desktopBg)}`);
}
if (!desktopBg.url.includes('/pc-video/')) {
  throw new Error(`PC video background should come from pc-video pool: ${desktopBg.url}`);
}

const mobileBg = runExpression('createBgUrl();', { width: 390 });
if (typeof mobileBg !== 'string' || !mobileBg.includes('/mobile/') || !mobileBg.endsWith('.webp')) {
  throw new Error(`Mobile background should keep using the static mobile WebP pool: ${JSON.stringify(mobileBg)}`);
}

const reducedMotionBg = runExpression('createBgUrl();', { reducedMotion: true });
if (reducedMotionBg?.type !== 'video' || reducedMotionBg.loadVideo !== false) {
  throw new Error(`Reduced-motion PC background should use poster-only video source: ${JSON.stringify(reducedMotionBg)}`);
}

const saveDataBg = runExpression('createBgUrl();', { saveData: true });
if (saveDataBg?.type !== 'video' || saveDataBg.loadVideo !== false) {
  throw new Error(`Save-data PC background should use poster-only video source: ${JSON.stringify(saveDataBg)}`);
}

console.log('video_background_rules_ok');
