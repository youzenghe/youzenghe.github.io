/* ============================================================
   次元日记 · Global JavaScript
   ============================================================ */

const DYNAMIC_SCRIPT_RE = /\/js\/(?:pages\/[^/]+|data-(?:posts|projects|learning))\.js(?:\?.*)?$/i;
const PAGE_STYLE_ATTR = 'data-page-style';
const PAGE_HEAD_JSON_LD_ATTR = 'data-page-json-ld';
const SAKANA_WIDGET_STYLE_ID = 'sakana-widget-style';
const SAKANA_WIDGET_SCRIPT_ID = 'sakana-widget-script';
const SAKANA_WIDGET_CSS_URL = 'assets/sakana-widget/sakana.min.css';
const SAKANA_WIDGET_JS_URL = 'assets/sakana-widget/sakana.min.js';
const LOCAL_BG_DESKTOP = 'assets/bg-pc.webp';
const LOCAL_BG_MOBILE = 'assets/bg-phone.webp';

// 本地背景图片池配置
const USE_BG_POOL = true; // 是否启用背景图片池（false则使用固定背景）
const USE_VIDEO_BG_PC = true; // PC端启用视频背景；改为 false 时使用 pc-video poster 静态图。
const BG_POOL_SIZE_MOBILE = 154; // 移动端图片数量
const BG_POOL_SIZE_PC_VIDEO = 120; // PC端视频数量
const BG_POOL_VIDEO_FOLDER = 'pc-video';

const PAGE_MODULES = new Map();
const LOADED_PAGE_SCRIPTS = new Set();
const PAGE_CACHE = new Map();
const PAGE_CACHE_TTL = 600000; // 10分钟内复用已预取页面，减少导航等待。
const PAGE_CACHE_MAX_ENTRIES = 24;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let currentPageCleanup = null;
let currentNavigationId = 0;
let live2dReady = false;
let live2dLoading = false;
let live2dIdleScheduled = false;
let sakanaWidgetLoadPromise = null;
let sakanaWidgetInstance = null;
let sakanaWidgetCharacter = 'takina';
let pendingPageRunRaf = 0;
let randomBgReady = null;
let randomBgPromise = null;
let navigationPendingCount = 0;
let navLoaderTimer = 0;
let modalLockCount = 0;

function prefersReducedMotion() {
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches || false;
}

function requestIdleWork(callback, timeout = 1200) {
  const run = window.requestIdleCallback;
  if (typeof run === 'function') {
    return run(callback, { timeout });
  }
  return window.setTimeout(callback, Math.min(timeout, 300));
}

function isMobileViewport() {
  return window.matchMedia?.('(max-width: 768px)').matches || window.innerWidth <= 768;
}

function shouldPlayPcVideoBg() {
  const saveData = navigator.connection?.saveData === true;
  return USE_VIDEO_BG_PC && !isMobileViewport() && !prefersReducedMotion() && !saveData;
}

function normalizeBgSource(source) {
  if (!source || typeof source === 'string') {
    return {
      type: 'image',
      url: source || '',
      src: source || '',
    };
  }
  return {
    ...source,
    type: source.type || 'image',
    url: source.url || source.src || source.webm || source.poster || '',
  };
}

function createBgUrl(customRootPrefix) {
  const config = getSiteConfig();
  const rootPrefix = customRootPrefix !== undefined ? customRootPrefix : config.rootPrefix;

  // 如果不启用背景图片池，使用固定背景
  if (!USE_BG_POOL) {
    return getLocalBgUrl();
  }

  // 根据设备选择对应的图片池大小
  const isMobile = isMobileViewport();
  if (!isMobile) {
    const index = Math.floor(Math.random() * BG_POOL_SIZE_PC_VIDEO) + 1;
    const stem = `${rootPrefix}assets/bg-pool/${BG_POOL_VIDEO_FOLDER}/bg${index}`;
    if (!USE_VIDEO_BG_PC) {
      return `${stem}.webp`;
    }
    return {
      type: 'video',
      url: `${stem}.webm`,
      webm: `${stem}.webm`,
      poster: `${stem}.webp`,
      loadVideo: shouldPlayPcVideoBg(),
    };
  }

  // 随机选择一张图片（1到poolSize）
  const index = Math.floor(Math.random() * BG_POOL_SIZE_MOBILE) + 1;
  return `${rootPrefix}assets/bg-pool/mobile/bg${index}.webp`;
}

function preloadImageBg(source, priority = 'auto') {
  const bgSource = normalizeBgSource(source);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = priority;

    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch (error) {
        // 图片已加载即可继续，解码失败不阻塞背景显示。
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          console.warn('[Background] Image decode failed:', bgSource.url, error);
        }
      }
      resolve({
        type: 'image',
        url: bgSource.url,
        img,
      });
    };

    img.onerror = reject;
    img.src = bgSource.src || bgSource.url;
  });
}

function preloadVideoBg(source, priority = 'auto') {
  const bgSource = normalizeBgSource(source);

  return new Promise((resolve, reject) => {
    let settled = false;
    let videoEl = bgSource.loadVideo === false ? null : document.createElement('video');
    const posterImg = new Image();
    posterImg.decoding = 'async';
    posterImg.fetchPriority = priority;

    if (videoEl) {
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.preload = priority === 'low' ? 'metadata' : 'auto';
      videoEl.poster = bgSource.poster;
      videoEl.src = bgSource.webm || bgSource.url;
      videoEl.setAttribute('aria-hidden', 'true');
      videoEl.addEventListener('error', () => {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          console.warn('[Background] Video playback failed after poster was shown:', bgSource.url);
        }
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
        videoEl = null;
      }, { once: true });
      videoEl.load();
    }

    posterImg.onload = async () => {
      try {
        if (typeof posterImg.decode === 'function') {
          await posterImg.decode();
        }
      } catch (error) {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          console.warn('[Background] Poster decode failed:', bgSource.poster, error);
        }
      }

      if (settled) return;
      settled = true;
      resolve({
        ...bgSource,
        type: 'video',
        videoEl,
        posterImg,
      });
    };
    posterImg.onerror = () => {
      if (settled) return;
      settled = true;
      reject(new Error(`Video poster failed: ${bgSource.poster}`));
    };
    posterImg.src = bgSource.poster;
  });
}

function fallbackBgSource() {
  const url = getLocalBgUrl();
  return {
    type: 'image',
    url,
    src: url,
  };
}

function preloadBg(source, priority = 'auto', retryCount = 0, customRootPrefix = undefined) {
  const MAX_RETRIES = 2; // 最多重试2次
  const bgSource = normalizeBgSource(source);
  const loader = bgSource.type === 'video' ? preloadVideoBg : preloadImageBg;

  return loader(bgSource, priority).catch((error) => {
    if (retryCount < MAX_RETRIES) {
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.warn(`[Background] Load failed (retry ${retryCount + 1}/${MAX_RETRIES}):`, bgSource.url, error);
      }
      const nextSource = bgSource.posterOnly ? posterOnlyBgSource(createBgUrl(customRootPrefix)) : createBgUrl(customRootPrefix);
      return preloadBg(nextSource, priority, retryCount + 1, customRootPrefix);
    }

    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.error('[Background] All retries failed, using fallback:', bgSource.url, error);
    }
    return preloadImageBg(fallbackBgSource(), priority);
  });
}

function posterOnlyBgSource(source) {
  const bgSource = normalizeBgSource(source);
  if (bgSource.type !== 'video' || !bgSource.poster) return bgSource;
  return {
    type: 'image',
    url: bgSource.url,
    src: bgSource.poster,
    posterOnly: true,
  };
}

function getSiteConfig() {
  const { dataset } = document.body;
  return {
    rootPrefix: dataset.rootPrefix || '',
    activeNav: dataset.activeNav || '',
    live2d: dataset.live2d !== 'false',
    searchPlaceholder: dataset.searchPlaceholder || '搜索文章...',
    footerHtml: dataset.footerHtml || '',
    loaderText: dataset.loaderText || '加载中...',
  };
}

function getLocalBgUrl() {
  const isMobile = window.matchMedia?.('(max-width: 768px)').matches || window.innerWidth <= 768;
  const file = isMobile ? LOCAL_BG_MOBILE : LOCAL_BG_DESKTOP;
  return `${getSiteConfig().rootPrefix}${file}`;
}

function showNavigationLoader() {
  navigationPendingCount += 1;
  // 延迟显示加载条：命中缓存的快速切换通常在 160ms 内完成，根本不闪 loader，
  // 用户感觉是「瞬间出现」；只有真正较慢的导航才会显示加载反馈。
  if (navLoaderTimer || !document.getElementById('loader')) return;
  navLoaderTimer = window.setTimeout(() => {
    navLoaderTimer = 0;
    if (navigationPendingCount > 0) {
      document.getElementById('loader')?.classList.remove('hidden');
    }
  }, 160);
}

function hideNavigationLoader() {
  navigationPendingCount = Math.max(0, navigationPendingCount - 1);
  if (navigationPendingCount === 0) {
    if (navLoaderTimer) {
      window.clearTimeout(navLoaderTimer);
      navLoaderTimer = 0;
    }
    document.getElementById('loader')?.classList.add('hidden');
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function lockBodyScroll() {
  modalLockCount += 1;
  document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
  modalLockCount = Math.max(0, modalLockCount - 1);
  if (modalLockCount === 0) {
    document.body.classList.remove('modal-open');
  }
}

function hideInitialLoader() {
  if (navigationPendingCount > 0) return;
  document.getElementById('loader')?.classList.add('hidden');
  syncLive2DVisibility();
}

function scheduleInitialLoaderHide(initialBgPromise) {
  const bgReadyOrTimeout = Promise.race([
    Promise.resolve(initialBgPromise).catch(() => ''),
    wait(1800),
  ]);

  const hideAfterReady = () => {
    bgReadyOrTimeout.finally(hideInitialLoader);
  };

  if (document.readyState === 'complete') {
    hideAfterReady();
  } else {
    window.addEventListener('load', hideAfterReady, { once: true });
  }

  window.setTimeout(hideInitialLoader, 3200);
}

function resolvePagePath(path) {
  return `${getSiteConfig().rootPrefix}${path}`;
}

function normalizeLocalAssetPath(path) {
  return path.replace(/^\.\.\//, '').replace(/^\//, '');
}

function resolveAssetUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `${getSiteConfig().rootPrefix}${normalizeLocalAssetPath(path)}`;
}

function resolveVersionedDataUrl(path) {
  const url = resolveAssetUrl(path);
  const coreScript = document.querySelector('script[src*="/js/data-core.js"], script[src*="js/data-core.js"]');
  if (!coreScript) return url;

  try {
    const version = new URL(coreScript.src, location.href).search;
    if (version && !url.includes('?')) {
      return `${url}${version}`;
    }
  } catch (error) {
    return url;
  }

  return url;
}

function resolveThumbnailUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const normalized = normalizeLocalAssetPath(path);
  if (!normalized.startsWith('assets/')) return resolveAssetUrl(path);
  if (/\.(gif|svg)$/i.test(normalized)) return resolveAssetUrl(path);
  const withoutAssets = normalized.slice('assets/'.length);
  return `${getSiteConfig().rootPrefix}assets/thumbs/${withoutAssets.replace(/\.[^.]+$/, '.webp')}`;
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function escapeCssUrl(url) {
  const safeUrl = String(url ?? '').replace(/['"()\\\n\r]/g, (char) => ({
    "'": '%27',
    '"': '%22',
    '(': '%28',
    ')': '%29',
    '\\': '%5C',
    '\n': '%0A',
    '\r': '%0D',
  })[char] || '');
  return escapeHtml(safeUrl);
}

function safeExternalUrl(url, fallback = '#') {
  const value = String(url ?? '').trim();
  return /^https?:\/\//i.test(value) ? value : fallback;
}

function safeCssColor(color, fallback = 'inherit') {
  const value = String(color ?? '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
  if (/^[a-z]+$/i.test(value)) return value;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(value)) return value;
  return fallback;
}

function normalizePageUrl(url) {
  const next = new URL(url, location.href);
  next.hash = '';
  if (/\/index\.html$/i.test(next.pathname)) {
    next.pathname = next.pathname.replace(/\/index\.html$/i, '/');
  }
  return next.href;
}

function getPageKey(url = location.href) {
  const path = new URL(url, location.href).pathname.replace(/\/+$/, '');

  if (path === '' || path === '/' || path.endsWith('/index.html')) return 'landing';
  if (path.endsWith('/pages/blog.html')) return 'home';
  if (path.endsWith('/pages/posts.html')) return 'posts';
  if (path.endsWith('/pages/post.html')) return 'post-detail';
  if (path.endsWith('/pages/learning.html')) return 'learning';
  if (path.endsWith('/pages/archive.html')) return 'archive';
  if (path.endsWith('/pages/tags.html')) return 'tags';
  if (path.endsWith('/pages/categories.html')) return 'categories';
  if (path.endsWith('/pages/projects.html')) return 'projects';
  if (path.endsWith('/pages/project.html')) return 'project-detail';
  if (path.endsWith('/pages/changelog.html')) return 'changelog';
  if (path.endsWith('/pages/games.html')) return 'games';
  if (path.endsWith('/pages/acg.html')) return 'acg';
  if (path.endsWith('/pages/moments.html')) return 'moments';
  if (path.endsWith('/pages/links.html')) return 'links';
  if (path.endsWith('/pages/message.html')) return 'links';
  if (path.endsWith('/pages/about.html')) return 'about';
  if (path.endsWith('/404.html')) return '404';
  return '';
}

function getBgPanes(bgLayer) {
  if (!bgLayer) {
    return {
      activePane: null,
      inactivePane: null,
      activeIndex: 0,
      nextIndex: 1,
    };
  }

  const panes = Array.from(bgLayer.querySelectorAll('[data-bg-pane]'));
  const activeIndex = Number(bgLayer.dataset.activePane || 0) === 1 ? 1 : 0;
  const nextIndex = activeIndex === 0 ? 1 : 0;

  return {
    activePane: panes[activeIndex] || null,
    inactivePane: panes[nextIndex] || null,
    activeIndex,
    nextIndex,
  };
}

function releasePaneVideo(pane) {
  const oldVideo = pane?.querySelector?.('video');
  if (!oldVideo) return;
  oldVideo.pause();
  oldVideo.removeAttribute('src');
  oldVideo.load();
}

function setPaneImage(pane, readyBg) {
  if (!pane || !readyBg) return;

  releasePaneVideo(pane);
  pane.replaceChildren();

  if (readyBg.type === 'video') {
    if (readyBg.videoEl) {
      const paneVideo = readyBg.videoEl;
      paneVideo.className = 'bg-pane-media';
      paneVideo.muted = true;
      paneVideo.loop = true;
      paneVideo.playsInline = true;
      paneVideo.poster = readyBg.poster || '';
      paneVideo.dataset.bgUrl = readyBg.url;
      paneVideo.setAttribute('aria-hidden', 'true');
      pane.appendChild(paneVideo);
      paneVideo.play().catch(() => {});
      return;
    }

    if (readyBg.posterImg) {
      const posterImg = readyBg.posterImg.cloneNode(false);
      posterImg.className = 'bg-pane-media';
      posterImg.alt = '';
      posterImg.decoding = 'async';
      posterImg.draggable = false;
      posterImg.dataset.bgUrl = readyBg.url;
      pane.appendChild(posterImg);
    }
    return;
  }

  if (!readyBg.img) return;
  const paneImg = readyBg.img.cloneNode(false);
  paneImg.className = 'bg-pane-media';
  paneImg.alt = '';
  paneImg.decoding = 'async';
  paneImg.draggable = false;
  paneImg.dataset.bgUrl = readyBg.url;
  pane.appendChild(paneImg);
}

function swapBgPane(bgLayer, readyBg) {
  const { activePane, inactivePane, nextIndex } = getBgPanes(bgLayer);
  const url = readyBg?.url || '';
  if (!inactivePane) {
    if (activePane && url) {
      setPaneImage(activePane, readyBg);
      activePane.dataset.bgUrl = url;
    }
    bgLayer.dataset.bgUrl = url || '';
    return url;
  }

  setPaneImage(inactivePane, readyBg);
  inactivePane.dataset.bgUrl = url;

  window.requestAnimationFrame(() => {
    inactivePane.classList.add('is-active');
    activePane?.classList.remove('is-active');
    bgLayer.dataset.activePane = String(nextIndex);
    bgLayer.dataset.bgUrl = url;

    window.setTimeout(() => {
      if (activePane && !activePane.classList.contains('is-active')) {
        releasePaneVideo(activePane);
        activePane.replaceChildren();
        activePane.dataset.bgUrl = '';
      }
    }, 700);
  });

  return url;
}

function loadInitialBg(bgLayer) {
  if (!bgLayer) return Promise.resolve('');

  // 如果启用了背景图片池，使用随机背景；否则使用固定背景
  const bgSource = USE_BG_POOL ? createBgUrl() : getLocalBgUrl();
  const normalizedSource = normalizeBgSource(bgSource);
  if (bgLayer.dataset.bgUrl === normalizedSource.url) return Promise.resolve(normalizedSource.url);

  return preloadBg(bgSource, 'high')
    .then((readyBg) => {
      swapBgPane(bgLayer, readyBg);
      return readyBg.url;
    })
    .catch(() => '');
}

function prefetchRandomBg(customRootPrefix) {
  if (randomBgReady) return Promise.resolve(randomBgReady);
  if (randomBgPromise) return randomBgPromise;

  const bgSource = posterOnlyBgSource(createBgUrl(customRootPrefix));
  randomBgPromise = preloadBg(bgSource, 'low', 0, customRootPrefix)
    .then((readyBg) => {
      randomBgReady = readyBg;
      return readyBg;
    })
    .catch(() => null)
    .finally(() => {
      randomBgPromise = null;
    });

  return randomBgPromise;
}

async function loadNavigationBg(bgLayer) {
  if (!bgLayer) return '';

  // 获取当前页面的 rootPrefix
  const currentRootPrefix = getSiteConfig().rootPrefix;

  if (!isMobileViewport() && USE_VIDEO_BG_PC) {
    const nextVideoBg = await preloadBg(createBgUrl(currentRootPrefix), 'high', 0, currentRootPrefix).catch(() => null);
    if (nextVideoBg?.url) {
      swapBgPane(bgLayer, nextVideoBg);
      prefetchRandomBg(currentRootPrefix);
      return nextVideoBg.url;
    }
  }

  let readyBg = randomBgReady;

  // 检查缓存的图片 URL 是否匹配当前页面的 rootPrefix
  if (readyBg?.url) {
    const expectedPrefix = `${currentRootPrefix}assets/bg-pool/`;
    if (!readyBg.url.startsWith(expectedPrefix)) {
      // 缓存的图片 URL 不匹配当前页面，丢弃缓存
      readyBg = null;
    }
  }

  randomBgReady = null;

  if (!readyBg) {
    // 如果没有预加载的图片，立即加载一张，使用当前页面的 rootPrefix
    readyBg = await prefetchRandomBg(currentRootPrefix);
    randomBgReady = null;
  }

  if (readyBg?.url) {
    swapBgPane(bgLayer, readyBg);
    // 立即预加载下一张，使用当前页面的 rootPrefix
    if (isMobileViewport()) {
      prefetchRandomBg(currentRootPrefix);
    }
    return readyBg.url;
  }

  const fallbackUrl = getLocalBgUrl();
  const fallbackBg = await preloadBg(fallbackUrl, 'low').catch(() => null);
  if (fallbackBg?.url) {
    swapBgPane(bgLayer, fallbackBg);
    // 即使使用fallback，也预加载随机背景，使用当前页面的 rootPrefix
    if (isMobileViewport()) {
      prefetchRandomBg(currentRootPrefix);
    }
    return fallbackBg.url;
  }

  return bgLayer.dataset.bgUrl || '';
}

function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || canvas.dataset.inited === 'true') return;
  canvas.dataset.inited = 'true';

  const ctx = canvas.getContext('2d');
  const particles = [];
  const reducedMotionQuery = window.matchMedia?.(REDUCED_MOTION_QUERY) || null;
  let rafId = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: -20,
      size: Math.random() * 7 + 3,
      vy: Math.random() * 1.1 + 0.3,
      vx: Math.random() * 0.8 - 0.4,
      op: Math.random() * 0.55 + 0.15,
      rot: Math.random() * Math.PI * 2,
      rs: (Math.random() - 0.5) * 0.035,
      hue: Math.random() * 50 + 190,
    };
  }

  resize();
  window.addEventListener('resize', resize);

  const particleCount = window.innerWidth <= 768 ? 8 : 24;
  for (let i = 0; i < particleCount; i += 1) {
    const particle = createParticle();
    particle.y = Math.random() * canvas.height;
    particles.push(particle);
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle, index) => {
      particle.y += particle.vy;
      particle.x += particle.vx + Math.sin(particle.y * 0.01) * 0.25;
      particle.rot += particle.rs;

      if (particle.y > canvas.height + 20) {
        particles[index] = createParticle();
      }

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rot);
      ctx.globalAlpha = particle.op;
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size * 0.55, particle.size, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle.hue},75%,82%,1)`;
      ctx.fill();
      ctx.restore();
    });
  }

  function stopLoop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function startLoop() {
    if (rafId || document.hidden || prefersReducedMotion()) {
      drawFrame();
      return;
    }

    const tick = () => {
      rafId = 0;
      if (document.hidden || prefersReducedMotion()) {
        drawFrame();
        return;
      }

      drawFrame();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
      return;
    }
    startLoop();
  });
  reducedMotionQuery?.addEventListener?.('change', () => {
    if (prefersReducedMotion()) {
      stopLoop();
      drawFrame();
      return;
    }
    startLoop();
  });

  startLoop();
}

function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!els.length) return;

  const revealIfInView = (el, margin = 80) => {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top <= viewportHeight + margin && rect.bottom >= -margin) {
      // 首屏就在视口内的内容立即显示，不播入场渐入；渐入动画留给滚动进入视口的元素。
      el.classList.add('reveal-instant', 'visible');
      return true;
    }
    return false;
  };

  if (typeof IntersectionObserver !== 'function') {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '80px 0px', threshold: 0.01 });

  els.forEach((el) => {
    if (revealIfInView(el)) return;
    io.observe(el);
  });

  window.requestAnimationFrame(() => {
    els.forEach((el) => {
      if (!el.classList.contains('visible')) {
        revealIfInView(el);
      }
    });
  });
}

function escapeRuntimeCssUrl(url) {
  return String(url ?? '').replace(/["\\\n\r]/g, (char) => ({
    '"': '%22',
    '\\': '%5C',
    '\n': '%0A',
    '\r': '%0D',
  })[char] || '');
}

function loadLazyMediaItem(el) {
  if (!el) return;

  const syncBgTarget = () => {
    const selector = el.dataset.lazyBgTarget;
    if (!selector) return;

    const bgTarget = el.parentElement?.querySelector(selector);
    const bgUrl = el.currentSrc || el.src;
    if (!bgTarget || !bgUrl || bgUrl.startsWith('data:')) return;

    bgTarget.style.backgroundImage = `url("${escapeRuntimeCssUrl(bgUrl)}")`;
    bgTarget.classList.add('lazy-media-loaded');
    delete el.dataset.lazyBgTarget;
  };

  const lazySrc = el.dataset.lazySrc;
  if (lazySrc) {
    if (el.tagName === 'IMG' || el.tagName === 'IFRAME' || el.tagName === 'VIDEO') {
      el.src = lazySrc;
    } else {
      el.setAttribute('src', lazySrc);
    }
    delete el.dataset.lazySrc;
  }

  if (el.dataset.lazyBgTarget) {
    if (el.complete && el.naturalWidth > 0) {
      syncBgTarget();
    } else {
      el.addEventListener('load', syncBgTarget, { once: true });
    }
  }

  const lazySrcset = el.dataset.lazySrcset;
  if (lazySrcset) {
    el.setAttribute('srcset', lazySrcset);
    delete el.dataset.lazySrcset;
  }

  const lazyBg = el.dataset.lazyBg;
  if (lazyBg) {
    el.style.backgroundImage = `url("${escapeRuntimeCssUrl(lazyBg)}")`;
    delete el.dataset.lazyBg;
  }

  el.classList.add('lazy-media-loaded');
}

function initLazyMedia(root = document, options = {}) {
  const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
  const items = Array.from(scope.querySelectorAll('[data-lazy-src], [data-lazy-srcset], [data-lazy-bg], [data-lazy-bg-target]'))
    .filter((el) => el.dataset.lazyMediaInited !== 'true');
  if (!items.length) return;

  if (typeof IntersectionObserver !== 'function') {
    items.forEach(loadLazyMediaItem);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      loadLazyMediaItem(entry.target);
      io.unobserve(entry.target);
    });
  }, {
    rootMargin: options.rootMargin || '520px 0px',
    threshold: options.threshold ?? 0.01,
  });

  items.forEach((el) => {
    el.dataset.lazyMediaInited = 'true';
    io.observe(el);
  });
}

function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu || toggle.dataset.inited === 'true') return;

  toggle.dataset.inited = 'true';
  function setOpen(opened) {
    menu.classList.toggle('open', opened);
    toggle.setAttribute('aria-expanded', String(opened));
    toggle.setAttribute('aria-label', opened ? '关闭菜单' : '打开菜单');
  }

  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });
  document.addEventListener('click', (event) => {
    if (!menu.classList.contains('open')) return;
    if (menu.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });
}

function initSearch() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const openBtns = document.querySelectorAll('.search-trigger');
  const closeBtn = document.getElementById('search-close');
  let previousActiveElement = null;
  let searchDetailsPromise = null;

  if (!overlay || !input || !results || typeof POSTS === 'undefined' || overlay.dataset.inited === 'true') return;
  overlay.dataset.inited = 'true';
  overlay.setAttribute('aria-hidden', 'true');

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html || '';
    return temp.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function mark(text, query) {
    const safe = escapeHtml(text || '');
    if (!query) return safe;
    return safe.replace(new RegExp(escapeRegExp(query), 'gi'), (match) => `<mark>${match}</mark>`);
  }

  function postSearchText(post) {
    const detail = window.SITE_DATA?.postDetails?.[String(post.id)] || {};
    return [
      post.title,
      post.excerpt,
      post.cat,
      post.series,
      post.tags.join(' '),
      stripHtml(detail.content || post.content),
    ].join(' ');
  }
  function resultExcerpt(post, query) {
    const detail = window.SITE_DATA?.postDetails?.[String(post.id)] || {};
    const body = stripHtml(detail.content || post.content);
    if (!query) return post.excerpt;
    const lowerBody = body.toLowerCase();
    const index = lowerBody.indexOf(query.toLowerCase());
    if (index < 0) return post.excerpt;

    const start = Math.max(0, index - 32);
    const end = Math.min(body.length, index + query.length + 72);
    return `${start > 0 ? '...' : ''}${body.slice(start, end)}${end < body.length ? '...' : ''}`;
  }

  function render(query) {
    const list = query
      ? POSTS.filter((post) => postSearchText(post).toLowerCase().includes(query.toLowerCase()))
      : POSTS;

    if (!list.length) {
      const picks = POSTS.slice(0, 3).map((post) => `
        <a class="search-result-item" href="${resolvePagePath('pages/post.html')}?id=${post.id}">
          <div class="sri-cat">${escapeHtml(post.cat)}</div>
          <div class="sri-title">${escapeHtml(post.title)}</div>
          <div class="sri-excerpt">${escapeHtml(post.excerpt)}</div>
        </a>
      `).join('');
      results.innerHTML = `<div class="search-empty">没有找到“${escapeHtml(query)}”相关的文章，先看看这些：</div>${picks}`;
      return;
    }

    results.innerHTML = list.map((post) => `
      <a class="search-result-item" href="${resolvePagePath('pages/post.html')}?id=${post.id}">
        <div class="sri-cat">${mark(post.cat, query)}</div>
        <div class="sri-title">${mark(post.title, query)}</div>
        <div class="sri-excerpt">${mark(resultExcerpt(post, query), query)}</div>
      </a>
    `).join('');
  }

  function ensureSearchDetails() {
    if (window.SITE_DATA?.postDetails) return Promise.resolve();
    if (searchDetailsPromise) return searchDetailsPromise;

    const src = new URL(resolveVersionedDataUrl('js/data-posts.js'), location.href).href;
    searchDetailsPromise = loadScript(src)
      .catch((error) => {
        searchDetailsPromise = null;
        throw error;
      });
    return searchDetailsPromise;
  }

  function open() {
    if (overlay.classList.contains('open')) return;
    previousActiveElement = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    input.focus();
    render('');
    ensureSearchDetails()
      .then(() => render(input.value.trim()))
      .catch(() => {});
  }

  function close() {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    previousActiveElement?.focus?.();
  }

  openBtns.forEach((btn) => btn.addEventListener('click', open));
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  results.addEventListener('click', (event) => {
    if (event.target.closest('.search-result-item')) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
  });

  input.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    render(query);
    if (query && !window.SITE_DATA?.postDetails) {
      ensureSearchDetails()
        .then(() => {
          if (input.value.trim() === query) render(query);
        })
        .catch(() => {});
    }
  });
}

function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light');
  }

  const btns = document.querySelectorAll('.theme-toggle');
  if (!btns.length || btns[0].dataset.inited === 'true') {
    syncThemeIcons();
    return;
  }

  btns.forEach((btn) => {
    btn.dataset.inited = 'true';
    btn.addEventListener('click', () => {
      document.body.classList.toggle('light');
      const isLight = document.body.classList.contains('light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      syncThemeIcons();
    });
  });

  syncThemeIcons();
}

function syncThemeIcons() {
  const isLight = document.body.classList.contains('light');
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.textContent = isLight ? '🌙' : '☀️';
  });
}

function setActiveNav() {
  const { activeNav } = getSiteConfig();
  if (!activeNav) return;

  document.querySelectorAll('[data-nav-key]').forEach((link) => {
    link.classList.toggle('active', link.dataset.navKey === activeNav);
  });
}

function typewriter(el, texts, speed = 90) {
  if (!el || !texts?.length) return;

  let textIndex = 0;
  let charIndex = 0;
  let deleting = false;
  let timerId = 0;
  let active = true;
  const holdDelay = 1800;
  const deleteSpeed = Math.max(40, Math.floor(speed / 2));

  el.textContent = '';

  function tick() {
    if (!active) return;
    const current = texts[textIndex];

    if (!deleting) {
      charIndex += 1;
      el.textContent = current.slice(0, charIndex);

      if (charIndex >= current.length) {
        charIndex = current.length;
        deleting = true;
        timerId = window.setTimeout(tick, holdDelay);
        return;
      }

      timerId = window.setTimeout(tick, speed);
      return;
    }

    charIndex -= 1;
    el.textContent = current.slice(0, Math.max(charIndex, 0));

    if (charIndex <= 0) {
      charIndex = 0;
      deleting = false;
      textIndex = (textIndex + 1) % texts.length;
      timerId = window.setTimeout(tick, speed);
      return;
    }

    timerId = window.setTimeout(tick, deleteSpeed);
  }

  tick();

  return () => {
    active = false;
    window.clearTimeout(timerId);
  };
}

function markLive2DHidden() {
  document.body.classList.remove('live2d-ready');
  document.body.classList.add('live2d-exiting');
}

function markLive2DReady() {
  document.body.classList.remove('live2d-loading', 'live2d-exiting');
  document.body.classList.add('live2d-ready');
}

function waitForLive2DDisplay() {
  let attempts = 0;
  const timer = window.setInterval(() => {
    const canvas = document.getElementById('live2dcanvas');
    const widget = document.getElementById('live2d-widget');
    const visible = (canvas && canvas.width > 0 && canvas.height > 0) || widget;

    if (visible || attempts > 30) {
      window.clearInterval(timer);
      if (visible) {
        markLive2DReady();
      } else {
        document.body.classList.remove('live2d-loading');
      }
    }

    attempts += 1;
  }, 80);
}

function initLive2DWidget() {
  if (live2dReady || !window.L2Dwidget || window.innerWidth <= 768) return;

  live2dReady = true;
  document.body.classList.add('live2d-loading');
  window.L2Dwidget.init({
    model: {
      jsonPath: resolveAssetUrl('assets/live2d/haru/haru02.model.json'),
    },
    display: {
      position: 'left',
      width: 140,
      height: 280,
      hOffset: 20,
      vOffset: 20,
    },
    mobile: {
      show: false,
    },
    react: {
      opacityDefault: 0.8,
      opacityOnHover: 1,
    },
  });
  waitForLive2DDisplay();
}

function initLive2D() {
  if (!getSiteConfig().live2d || window.innerWidth <= 768 || live2dLoading || live2dIdleScheduled) return;

  if (window.L2Dwidget) {
    initLive2DWidget();
    return;
  }

  live2dIdleScheduled = true;
  requestIdleWork(() => {
    live2dIdleScheduled = false;
    if (!getSiteConfig().live2d || window.innerWidth <= 768 || live2dReady || live2dLoading) return;

    if (window.L2Dwidget) {
      initLive2DWidget();
      return;
    }

    live2dLoading = true;
    document.body.classList.add('live2d-loading');

    // 设置 webpack publicPath，让 L2Dwidget 知道从哪里加载 chunk 文件
    const scriptPath = resolveAssetUrl('assets/live2d-widget/');
    window.__webpack_public_path__ = scriptPath.endsWith('/') ? scriptPath : scriptPath + '/';

    const script = document.createElement('script');
    script.src = resolveAssetUrl('assets/live2d-widget/L2Dwidget.min.js');
    script.onload = () => {
      live2dLoading = false;
      initLive2DWidget();
    };
    script.onerror = () => {
      live2dLoading = false;
      document.body.classList.remove('live2d-loading');
    };
    document.body.appendChild(script);
  }, 1800);
}

function syncLive2DVisibility() {
  const enabled = getSiteConfig().live2d && window.innerWidth > 768;
  const canvas = document.getElementById('live2dcanvas');
  const widget = document.getElementById('live2d-widget');

  if (canvas) {
    canvas.style.display = enabled ? '' : 'none';
  }
  if (widget) {
    widget.style.display = enabled ? '' : 'none';
  }

  if (!enabled) {
    markLive2DHidden();
    return;
  }

  if (live2dReady) {
    markLive2DReady();
    return;
  }

  initLive2D();
}

function loadExternalStylesheet(id, href) {
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  // 如果是相对路径，使用 resolveAssetUrl 处理
  link.href = /^https?:\/\//i.test(href) ? href : resolveAssetUrl(href);
  document.head.appendChild(link);
}

function loadExternalScript(id, src) {
  const existing = document.getElementById(id);
  if (existing) {
    if (existing.dataset.loaded === 'true') return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    // 如果是相对路径，使用 resolveAssetUrl 处理
    script.src = /^https?:\/\//i.test(src) ? src : resolveAssetUrl(src);
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function getSakanaWidgetCharacters() {
  return ['takina', 'chisato'];
}

function createSakanaWidgetShell(root) {
  root.replaceChildren();

  const switchButton = document.createElement('button');
  switchButton.type = 'button';
  switchButton.className = 'sakana-widget-btn';
  switchButton.textContent = '\u5207\u6362\u4eba\u7269';
  switchButton.addEventListener('click', () => {
    const characters = getSakanaWidgetCharacters();
    const currentIndex = characters.indexOf(sakanaWidgetCharacter);
    const nextIndex = (currentIndex + 1) % characters.length;
    sakanaWidgetCharacter = characters[nextIndex];
    initSakanaWidget();
  });

  const mountPoint = document.createElement('div');
  mountPoint.className = 'sakana-widget-mount';

  const githubCover = document.createElement('a');
  githubCover.className = 'sakana-widget-github-cover';
  githubCover.href = 'https://github.com/youzenghe';
  githubCover.target = '_blank';
  githubCover.rel = 'noreferrer noopener';
  githubCover.setAttribute('aria-label', '打开 GitHub 主页');

  mountPoint.addEventListener('click', (event) => {
    const widgetRect = mountPoint.getBoundingClientRect();
    const clickY = event.clientY - widgetRect.top;
    const coverHeight = 30;

    if (clickY >= widgetRect.height - coverHeight) {
      event.preventDefault();
      event.stopPropagation();
      window.open('https://github.com/youzenghe', '_blank', 'noopener,noreferrer');
    }
  }, true);

  mountPoint.appendChild(githubCover);
  root.appendChild(mountPoint);
  root.appendChild(switchButton);

  return mountPoint;
}

function ensureSakanaWidgetRoot() {
  let root = document.getElementById('sakana-widget-root');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'sakana-widget-root';
  root.className = 'sakana-widget-root';
  root.setAttribute('aria-label', '右下角摇摇乐挂件');

  const footer = document.querySelector('body > footer');
  if (footer?.nextSibling) {
    document.body.insertBefore(root, footer.nextSibling);
  } else {
    document.body.appendChild(root);
  }

  return root;
}

function initSakanaWidget() {
  const root = ensureSakanaWidgetRoot();
  if (window.innerWidth <= 768) {
    root.replaceChildren();
    return;
  }

  loadExternalStylesheet(SAKANA_WIDGET_STYLE_ID, SAKANA_WIDGET_CSS_URL);

  if (!sakanaWidgetLoadPromise) {
    sakanaWidgetLoadPromise = loadExternalScript(SAKANA_WIDGET_SCRIPT_ID, SAKANA_WIDGET_JS_URL).catch((error) => {
      sakanaWidgetLoadPromise = null;
      throw error;
    });
  }

  sakanaWidgetLoadPromise
    .then(() => {
      if (!document.getElementById('sakana-widget-root') || window.innerWidth <= 768) return;
      if (!window.SakanaWidget) return;

      const mountPoint = createSakanaWidgetShell(root);
      sakanaWidgetInstance = new window.SakanaWidget({
        size: 200,
        controls: false,
        character: sakanaWidgetCharacter,
        draggable: true,
        rod: true,
      });
      sakanaWidgetInstance.mount(mountPoint);
    })
    .catch(() => {});
}

function registerCurrentScripts() {
  document.querySelectorAll('script[src]').forEach((script) => {
    const src = script.src;
    if (DYNAMIC_SCRIPT_RE.test(src)) {
      LOADED_PAGE_SCRIPTS.add(src);
    }
  });
}

function registerPageModule(key, init) {
  PAGE_MODULES.set(key, init);
}

function teardownCurrentPageModule() {
  if (pendingPageRunRaf) {
    window.cancelAnimationFrame(pendingPageRunRaf);
    pendingPageRunRaf = 0;
  }
  if (typeof currentPageCleanup === 'function') {
    currentPageCleanup();
    currentPageCleanup = null;
  }
}

function runCurrentPageModule() {
  teardownCurrentPageModule();
  const init = PAGE_MODULES.get(getPageKey());
  if (typeof init === 'function') {
    currentPageCleanup = init() || null;
  }
}

function ensureAppContentRoot() {
  let root = document.getElementById('app-content');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'app-content';

  const footer = document.querySelector('body > footer');
  document.body.insertBefore(root, footer || null);

  Array.from(document.body.children).forEach((child) => {
    if (
      child === root ||
      child.tagName === 'SCRIPT' ||
      child.tagName === 'NAV' ||
      child.tagName === 'FOOTER' ||
      child.id === 'loader' ||
      child.id === 'bg-layer' ||
      child.id === 'bg-overlay' ||
      child.id === 'particles' ||
      child.id === 'search-overlay' ||
      child.id === 'mobile-menu' ||
      child.id === 'sakana-widget-root'
    ) {
      return;
    }

    root.appendChild(child);
  });

  return root;
}

function extractPageNodes(doc) {
  const nodes = [];
  let shouldCollect = false;

  Array.from(doc.body.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.id === 'site-shell-top') {
      shouldCollect = true;
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.id === 'site-shell-bottom') {
      shouldCollect = false;
      return;
    }

    if (!shouldCollect) return;
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') return;
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;

    nodes.push(document.importNode(node, true));
  });

  return nodes;
}

function syncBodyDataset(nextDataset) {
  Object.keys(document.body.dataset).forEach((key) => {
    delete document.body.dataset[key];
  });

  Object.entries(nextDataset).forEach(([key, value]) => {
    document.body.dataset[key] = value;
  });
}

function applyPageHead(doc) {
  document.title = doc.title;

  document.head.querySelectorAll(`style[${PAGE_STYLE_ATTR}]`).forEach((styleEl) => styleEl.remove());
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((scriptEl) => scriptEl.remove());
  doc.head.querySelectorAll('style').forEach((styleEl) => {
    const clone = styleEl.cloneNode(true);
    clone.setAttribute(PAGE_STYLE_ATTR, 'true');
    document.head.appendChild(clone);
  });
  doc.head.querySelectorAll('script[type="application/ld+json"]').forEach((scriptEl) => {
    const clone = scriptEl.cloneNode(true);
    clone.setAttribute(PAGE_HEAD_JSON_LD_ATTR, 'true');
    document.head.appendChild(clone);
  });

  const selectors = [
    'meta[name="description"]',
    'meta[name="theme-color"]',
    'meta[property="og:type"]',
    'meta[property="og:site_name"]',
    'meta[property="og:url"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:image"]',
    'meta[property="og:image:alt"]',
    'meta[property="og:locale"]',
    'meta[name="twitter:card"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:alt"]',
    'link[rel="canonical"]',
    'link[rel="icon"]',
  ];

  selectors.forEach((selector) => {
    const current = document.head.querySelector(selector);
    const incoming = doc.head.querySelector(selector);

    if (current && incoming) {
      if (current.tagName === 'LINK') {
        current.href = incoming.href;
      } else {
        current.setAttribute('content', incoming.getAttribute('content') || '');
      }
      return;
    }

    if (current && !incoming) {
      current.remove();
      return;
    }

    if (!current && incoming) {
      document.head.appendChild(document.importNode(incoming, true));
    }
  });
}

function applyShellConfig() {
  if (window.SiteShell?.sync) {
    window.SiteShell.sync(getSiteConfig());
  }
  setActiveNav();
}

function resetTransientPageState() {
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
  modalLockCount = 0;
}

function loadScript(src) {
  if (LOADED_PAGE_SCRIPTS.has(src)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      if (DYNAMIC_SCRIPT_RE.test(script.src)) {
        LOADED_PAGE_SCRIPTS.add(script.src);
      }
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function ensurePageScripts(doc) {
  const scripts = Array.from(doc.querySelectorAll('script[src]'))
    .map((script) => new URL(script.getAttribute('src'), doc.URL).href)
    .filter((src) => DYNAMIC_SCRIPT_RE.test(src));

  for (const src of scripts) {
    if (LOADED_PAGE_SCRIPTS.has(src)) continue;
    await loadScript(src);
    LOADED_PAGE_SCRIPTS.add(src);
  }
}

function rememberPageCache(cacheKey, task) {
  PAGE_CACHE.set(cacheKey, {
    promise: task,
    expiresAt: Date.now() + PAGE_CACHE_TTL,
  });

  if (PAGE_CACHE.size <= PAGE_CACHE_MAX_ENTRIES) return;
  const oldestKey = PAGE_CACHE.keys().next().value;
  if (oldestKey) PAGE_CACHE.delete(oldestKey);
}

function prefetchPageScripts(doc) {
  Array.from(doc.querySelectorAll('script[src]'))
    .map((script) => new URL(script.getAttribute('src'), doc.URL).href)
    .filter((src) => DYNAMIC_SCRIPT_RE.test(src))
    .forEach((src) => {
      const alreadyPrefetched = Array.from(document.head.querySelectorAll('link[data-page-prefetch]'))
        .some((link) => link.dataset.pagePrefetch === src);
      if (LOADED_PAGE_SCRIPTS.has(src) || alreadyPrefetched) {
        return;
      }

      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      link.href = src;
      link.dataset.pagePrefetch = src;
      document.head.appendChild(link);
    });
}

function scrollToNavigationTarget(hash) {
  if (hash) {
    const target = document.getElementById(hash.slice(1)) || document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

async function applyFetchedPage(doc, targetUrl, options = {}) {
  const { replaceHistory = false, hash = '' } = options;
  const historyMethod = replaceHistory ? 'replaceState' : 'pushState';
  history[historyMethod]({}, '', targetUrl);

  teardownCurrentPageModule();
  syncBodyDataset(doc.body.dataset);
  resetTransientPageState();
  applyPageHead(doc);
  applyShellConfig();

  const appContent = ensureAppContentRoot();
  appContent.replaceChildren(...extractPageNodes(doc));
  document.getElementById('search-overlay')?.classList.remove('open');
  document.getElementById('mobile-menu')?.classList.remove('open');

  await ensurePageScripts(doc);
  initSakanaWidget();
  syncLive2DVisibility();
  scrollToNavigationTarget(hash);

  const bgLayer = document.getElementById('bg-layer');
  // 所有页面都使用随机背景池（包括首页）
  const bgTask = loadNavigationBg(bgLayer);
  Promise.resolve(bgTask).catch(() => {});

  pendingPageRunRaf = window.requestAnimationFrame(() => {
    pendingPageRunRaf = 0;
    runCurrentPageModule();
    window.requestAnimationFrame(initReveal);
  });
}

async function fetchPageDocument(url) {
  const cacheKey = normalizePageUrl(url);
  const cached = PAGE_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }
  if (cached) {
    PAGE_CACHE.delete(cacheKey);
  }

  const task = fetch(cacheKey, { cache: 'default' })
    .then(async (response) => {
      const html = await response.text();
      if (!response.ok && !html) {
        throw new Error(`Navigation failed: ${response.status}`);
      }

      const doc = new DOMParser().parseFromString(html, 'text/html');
      prefetchPageScripts(doc);
      return doc;
    })
    .catch((error) => {
      PAGE_CACHE.delete(cacheKey);
      throw error;
    });

  rememberPageCache(cacheKey, task);
  return task;
}

function prefetchPage(url) {
  const targetUrl = new URL(url, location.href);
  if (targetUrl.origin !== location.origin) return;
  const cacheKey = normalizePageUrl(targetUrl.href);
  if (PAGE_CACHE.has(cacheKey)) return;

  fetchPageDocument(cacheKey).catch(() => {});
}

function prefetchNavigationBgFor(url) {
  const pageKey = getPageKey(url);
  if (!pageKey || pageKey === 'home') return;

  // 根据目标 URL 计算正确的 rootPrefix
  const targetUrl = new URL(url, location.href);
  const targetPath = targetUrl.pathname;

  // 判断目标页面是否在 pages/ 子目录下
  const isInPagesDir = targetPath.includes('/pages/');
  const targetRootPrefix = isInPagesDir ? '../' : '';

  // 使用目标页面的 rootPrefix 预加载背景
  prefetchRandomBg(targetRootPrefix);
}

function isSameDocumentHashNavigation(url) {
  return (
    url.pathname === location.pathname &&
    url.search === location.search &&
    url.hash &&
    url.hash !== location.hash
  );
}

function shouldHandleInternalLink(link, event) {
  if (!link || event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return false;
  if (href.startsWith('#')) return false;

  return true;
}

async function navigateTo(url, options = {}) {
  const targetUrl = new URL(url, location.href);

  if (isSameDocumentHashNavigation(targetUrl)) {
    history.pushState({}, '', targetUrl);
    scrollToNavigationTarget(targetUrl.hash);
    return;
  }

  const navigationId = ++currentNavigationId;
  showNavigationLoader();

  try {
    const doc = await fetchPageDocument(targetUrl.href);
    if (!doc.getElementById('site-shell-top') || !doc.getElementById('site-shell-bottom')) {
      location.assign(targetUrl.href);
      return;
    }
    if (navigationId !== currentNavigationId) return;

    await applyFetchedPage(doc, targetUrl.href, {
      replaceHistory: Boolean(options.replaceHistory),
      hash: targetUrl.hash,
    });
  } catch (error) {
    location.assign(targetUrl.href);
  } finally {
    hideNavigationLoader();
  }
}

function initRouter() {
  if (document.body.dataset.routerInited === 'true') return;
  document.body.dataset.routerInited = 'true';

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!shouldHandleInternalLink(link, event)) return;

    event.preventDefault();
    navigateTo(link.href);
  });

  document.addEventListener('mouseover', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    prefetchPage(link.href);
    prefetchNavigationBgFor(link.href);
  });

  document.addEventListener('touchstart', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    prefetchPage(link.href);
    prefetchNavigationBgFor(link.href);
  }, { passive: true });

  document.addEventListener('focusin', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    prefetchPage(link.href);
    prefetchNavigationBgFor(link.href);
  });

  window.addEventListener('popstate', () => {
    navigateTo(location.href, { replaceHistory: true });
  });

  requestIdleWork(() => {
    const navLinks = new Set();
    document.querySelectorAll('nav[aria-label="主导航"] a[href], #mobile-menu a[href]').forEach((link) => {
      navLinks.add(link.href);
    });
    navLinks.forEach((href) => prefetchPage(href));
  }, 300);
}

window.SiteApp = {
  registerPage: registerPageModule,
  navigate: navigateTo,
  runPageModule: runCurrentPageModule,
  lockBodyScroll,
  unlockBodyScroll,
};

document.addEventListener('DOMContentLoaded', () => {
  const bgLayer = document.getElementById('bg-layer');
  let initialBgPromise = Promise.resolve('');
  if (bgLayer) {
    // 首次加载也使用随机背景池
    initialBgPromise = Promise.resolve(loadNavigationBg(bgLayer));
  }

  ensureAppContentRoot();
  registerCurrentScripts();

  initParticles('particles');
  initReveal();
  initMobileNav();
  initSearch();
  initTheme();
  initSakanaWidget();
  applyShellConfig();
  initRouter();

  scheduleInitialLoaderHide(initialBgPromise);

  window.addEventListener('pagehide', markLive2DHidden);

  runCurrentPageModule();

  // 页面加载完成后，立即预加载下一张背景图片，加快切换速度
  if (USE_BG_POOL) {
    initialBgPromise.finally(() => {
      // 延迟一点点，让首屏渲染优先
      setTimeout(() => prefetchRandomBg(), 500);
    });
  }
});
