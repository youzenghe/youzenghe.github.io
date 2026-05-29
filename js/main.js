/* ============================================================
   次元日记 · Global JavaScript
   ============================================================ */

const PAGE_SCRIPT_RE = /\/js\/pages\/[^/]+\.js(?:\?.*)?$/i;
const PAGE_STYLE_ATTR = 'data-page-style';
const PAGE_HEAD_JSON_LD_ATTR = 'data-page-json-ld';
const SAKANA_WIDGET_STYLE_ID = 'sakana-widget-style';
const SAKANA_WIDGET_SCRIPT_ID = 'sakana-widget-script';
const SAKANA_WIDGET_CSS_URL = 'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.0/lib/sakana.min.css';
const SAKANA_WIDGET_JS_URL = 'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.0/lib/sakana.min.js';
const LOCAL_BG_DESKTOP = 'assets/bg-pc.webp';
const LOCAL_BG_MOBILE = 'assets/bg-phone.webp';
const PAGE_MODULES = new Map();
const LOADED_PAGE_SCRIPTS = new Set();
const PAGE_CACHE = new Map();
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

function createBgUrl() {
  return `https://www.loliapi.com/acg/?t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function preloadBg(url, priority = 'auto') {
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
      }
      resolve({
        url,
        img,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
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
  document.getElementById('loader')?.classList.remove('hidden');
}

function hideNavigationLoader() {
  navigationPendingCount = Math.max(0, navigationPendingCount - 1);
  if (navigationPendingCount === 0) {
    document.getElementById('loader')?.classList.add('hidden');
  }
}

function resolvePagePath(path) {
  return `${getSiteConfig().rootPrefix}${path}`;
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

  if (path === '' || path === '/' || path.endsWith('/index.html')) return 'home';
  if (path.endsWith('/pages/posts.html')) return 'posts';
  if (path.endsWith('/pages/post.html')) return 'post-detail';
  if (path.endsWith('/pages/projects.html')) return 'projects';
  if (path.endsWith('/pages/games.html')) return 'games';
  if (path.endsWith('/pages/gallery.html')) return 'gallery';
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

function setPaneImage(pane, readyBg) {
  if (!pane || !readyBg?.img) return;

  pane.replaceChildren();
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
        activePane.replaceChildren();
        activePane.dataset.bgUrl = '';
      }
    }, 700);
  });

  return url;
}

function loadInitialBg(bgLayer) {
  if (!bgLayer) return Promise.resolve('');
  const url = getLocalBgUrl();
  if (bgLayer.dataset.bgUrl === url) return Promise.resolve(url);

  return preloadBg(url, 'high')
    .then((readyBg) => {
      swapBgPane(bgLayer, readyBg);
      return readyBg.url;
    })
    .catch(() => '');
}

function prefetchRandomBg() {
  if (randomBgReady) return Promise.resolve(randomBgReady);
  if (randomBgPromise) return randomBgPromise;

  randomBgPromise = preloadBg(createBgUrl(), 'low')
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

  let readyBg = randomBgReady;
  randomBgReady = null;

  if (!readyBg) {
    readyBg = await prefetchRandomBg();
    randomBgReady = null;
  }

  if (readyBg?.url) {
    swapBgPane(bgLayer, readyBg);
    prefetchRandomBg();
    return readyBg.url;
  }

  const fallbackUrl = getLocalBgUrl();
  const fallbackBg = await preloadBg(fallbackUrl, 'low').catch(() => null);
  if (fallbackBg?.url) {
    swapBgPane(bgLayer, fallbackBg);
    prefetchRandomBg();
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
      hue: Math.random() * 40 + 320,
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

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  els.forEach((el) => io.observe(el));
}

function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu || toggle.dataset.inited === 'true') return;

  toggle.dataset.inited = 'true';
  toggle.addEventListener('click', () => menu.classList.toggle('open'));
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}

function initSearch() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const openBtns = document.querySelectorAll('.search-trigger');
  const closeBtn = document.getElementById('search-close');

  if (!overlay || !input || !results || typeof POSTS === 'undefined' || overlay.dataset.inited === 'true') return;
  overlay.dataset.inited = 'true';

  function render(query) {
    const list = query
      ? POSTS.filter((post) =>
          post.title.includes(query) ||
          post.excerpt.includes(query) ||
          post.tags.some((tag) => tag.includes(query)))
      : POSTS;

    if (!list.length) {
      results.innerHTML = `<div class="search-empty">没有找到“${query}”相关的文章</div>`;
      return;
    }

    results.innerHTML = list.map((post) => `
      <a class="search-result-item" href="${resolvePagePath('pages/post.html')}?id=${post.id}">
        <div class="sri-cat">${post.cat}</div>
        <div class="sri-title">${post.title}</div>
        <div class="sri-excerpt">${post.excerpt}</div>
      </a>
    `).join('');
  }

  function open() {
    overlay.classList.add('open');
    input.focus();
    render('');
  }

  function close() {
    overlay.classList.remove('open');
  }

  openBtns.forEach((btn) => btn.addEventListener('click', open));
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
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
    render(event.target.value.trim());
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
      jsonPath: '/assets/live2d/haru/haru02.model.json',
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
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/live2d-widget@3.0.4/lib/L2Dwidget.min.js';
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
  link.href = href;
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
    script.src = src;
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
    if (PAGE_SCRIPT_RE.test(src)) {
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
  document.head.querySelectorAll(`script[${PAGE_HEAD_JSON_LD_ATTR}]`).forEach((scriptEl) => scriptEl.remove());
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

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function ensurePageScripts(doc) {
  const scripts = Array.from(doc.querySelectorAll('script[src]'))
    .map((script) => new URL(script.getAttribute('src'), doc.URL).href)
    .filter((src) => PAGE_SCRIPT_RE.test(src));

  for (const src of scripts) {
    if (LOADED_PAGE_SCRIPTS.has(src)) continue;
    await loadScript(src);
    LOADED_PAGE_SCRIPTS.add(src);
  }
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
  const pageKey = getPageKey(targetUrl);
  const bgTask = pageKey === 'home' ? loadInitialBg(bgLayer) : loadNavigationBg(bgLayer);
  Promise.resolve(bgTask).catch(() => {});

  pendingPageRunRaf = window.requestAnimationFrame(() => {
    pendingPageRunRaf = 0;
    runCurrentPageModule();
  });
}

async function fetchPageDocument(url) {
  const cacheKey = normalizePageUrl(url);
  if (PAGE_CACHE.has(cacheKey)) {
    return PAGE_CACHE.get(cacheKey);
  }

  const response = await fetch(cacheKey, {
    headers: {
      'X-Requested-With': 'site-shell',
    },
  });
  const html = await response.text();
  if (!response.ok && !html) {
    throw new Error(`Navigation failed: ${response.status}`);
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  PAGE_CACHE.set(cacheKey, doc);
  return doc;
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
  prefetchRandomBg();
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
    document.querySelectorAll('nav a[href], #mobile-menu a[href]').forEach((link) => {
      navLinks.add(link.href);
    });
    navLinks.forEach((href) => prefetchPage(href));
  }, 1000);
}

window.SiteApp = {
  registerPage: registerPageModule,
  navigate: navigateTo,
  runPageModule: runCurrentPageModule,
};

document.addEventListener('DOMContentLoaded', () => {
  const bgLayer = document.getElementById('bg-layer');
  let initialBgPromise = Promise.resolve('');
  if (bgLayer) {
    initialBgPromise = Promise.resolve(loadInitialBg(bgLayer));
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

  window.addEventListener('load', () => {
    initialBgPromise.catch(() => '').finally(() => {
      document.getElementById('loader')?.classList.add('hidden');
      syncLive2DVisibility();
    });
  });

  window.addEventListener('pagehide', markLive2DHidden);

  runCurrentPageModule();
});
