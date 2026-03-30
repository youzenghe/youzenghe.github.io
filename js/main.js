/* ============================================================
   次元日记 · Global JavaScript
   ============================================================ */

const PAGE_SCRIPT_RE = /\/js\/pages\/[^/]+\.js(?:\?.*)?$/i;
const PAGE_STYLE_ATTR = 'data-page-style';
const MUSIC_STORAGE_KEY = 'acg-blog:music-state';
const MUSIC_SAVE_INTERVAL = 800;
const PAGE_MODULES = new Map();
const LOADED_PAGE_SCRIPTS = new Set();
const PAGE_CACHE = new Map();

let currentPageCleanup = null;
let currentNavigationId = 0;
let live2dReady = false;
let live2dLoading = false;
let pendingPageRunRaf = 0;
const BG_PREFETCH_POOL_SIZE = 3;
const bgReadyQueue = [];
const bgPendingUrls = new Set();
let bgPoolFillPromise = null;
let navigationPendingCount = 0;

function createBgUrl() {
  return `https://www.loliapi.com/acg/?t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function preloadBg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'high';
    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch (error) {
        // decode failure should not block a successfully loaded image
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

function getNextBgCandidateUrl() {
  let nextUrl = '';

  while (!nextUrl || bgPendingUrls.has(nextUrl) || bgReadyQueue.some((item) => item.url === nextUrl)) {
    nextUrl = createBgUrl();
  }

  return nextUrl;
}

function fillBgQueue() {
  if (bgReadyQueue.length >= BG_PREFETCH_POOL_SIZE) {
    return Promise.resolve(bgReadyQueue[0] || null);
  }

  if (bgPoolFillPromise) return bgPoolFillPromise;

  const missingCount = BG_PREFETCH_POOL_SIZE - bgReadyQueue.length;
  const tasks = Array.from({ length: missingCount }, () => {
    const url = getNextBgCandidateUrl();
    bgPendingUrls.add(url);

    return preloadBg(url)
      .then((readyBg) => {
        if (!bgReadyQueue.some((item) => item.url === readyBg.url)) {
          bgReadyQueue.push(readyBg);
        }
        return readyBg;
      })
      .catch(() => null)
      .finally(() => {
        bgPendingUrls.delete(url);
      });
  });

  bgPoolFillPromise = Promise.all(tasks)
    .then(() => bgReadyQueue[0] || null)
    .finally(() => {
      bgPoolFillPromise = null;
      if (bgReadyQueue.length < BG_PREFETCH_POOL_SIZE && !bgPendingUrls.size) {
        window.setTimeout(() => {
          fillBgQueue().catch(() => {});
        }, 0);
      }
    });

  return bgPoolFillPromise;
}

async function takeNextBgUrl() {
  if (bgReadyQueue.length) {
    const nextUrl = bgReadyQueue.shift() || null;
    fillBgQueue().catch(() => {});
    return nextUrl;
  }

  await fillBgQueue().catch(() => null);
  const nextUrl = bgReadyQueue.shift() || null;
  fillBgQueue().catch(() => {});
  return nextUrl;
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

function loadBg(bgLayer, btn) {
  if (!bgLayer) return;
  if (btn) btn.classList.add('spinning');

  const finishButton = () => {
    if (btn) {
      window.setTimeout(() => btn.classList.remove('spinning'), 400);
    }
  };

  const applyAndRefill = (url) => {
    if (url?.url) {
      swapBgPane(bgLayer, url);
    }
    fillBgQueue().catch(() => {});
    finishButton();
    return url?.url || '';
  };

  const existingUrl = bgLayer.dataset.bgUrl || '';
  return takeNextBgUrl()
    .then((readyBg) => {
      if (readyBg?.url) {
        return applyAndRefill(readyBg);
      }

      const fallbackUrl = getNextBgCandidateUrl();
      return preloadBg(fallbackUrl)
        .then((fallbackBg) => applyAndRefill(fallbackBg))
        .catch(() => applyAndRefill(existingUrl));
    })
    .catch(() => {
      finishButton();
      return existingUrl;
    });
}

function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || canvas.dataset.inited === 'true') return;
  canvas.dataset.inited = 'true';

  const ctx = canvas.getContext('2d');
  const particles = [];

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

  for (let i = 0; i < 28; i += 1) {
    const particle = createParticle();
    particle.y = Math.random() * canvas.height;
    particles.push(particle);
  }

  function draw() {
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

    requestAnimationFrame(draw);
  }

  draw();
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
  if (!getSiteConfig().live2d || window.innerWidth <= 768 || live2dLoading) return;

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

function readMusicState() {
  try {
    const raw = localStorage.getItem(MUSIC_STORAGE_KEY);
    if (!raw) {
      return {
        playing: true,
        currentTime: 0,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      playing: Boolean(parsed.playing),
      currentTime: Number.isFinite(parsed.currentTime) ? parsed.currentTime : 0,
    };
  } catch (error) {
    return {
      playing: true,
      currentTime: 0,
    };
  }
}

function writeMusicState(patch) {
  const nextState = {
    ...readMusicState(),
    ...patch,
  };

  localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(nextState));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const remainSeconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${remainSeconds}`;
}

function initMusicPlayer() {
  const player = document.getElementById('music-player');
  const audio = document.getElementById('global-audio');
  const toggle = document.getElementById('music-toggle');
  const status = document.getElementById('music-status');

  if (!player || !audio || !toggle || !status || player.dataset.inited === 'true') return;
  player.dataset.inited = 'true';

  const state = readMusicState();
  let lastSavedAt = 0;
  let unlockHandlersBound = false;

  function setStatus(text) {
    status.textContent = text;
  }

  function syncButton() {
    const playing = !audio.paused && !audio.ended;
    player.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
  }

  function syncProgress() {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const percent = duration ? Math.min((currentTime / duration) * 100, 100) : 0;
    player.style.setProperty('--music-progress', `${percent}%`);
    setStatus(`${formatTime(currentTime)} / ${duration ? formatTime(duration) : '--:--'}`);
  }

  function persistCurrentTime(force = false) {
    const now = Date.now();
    if (!force && now - lastSavedAt < MUSIC_SAVE_INTERVAL) return;
    lastSavedAt = now;
    writeMusicState({
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      playing: !audio.paused && !audio.ended,
    });
  }

  function detachUnlockHandlers() {
    if (!unlockHandlersBound) return;
    ['pointermove', 'wheel', 'scroll', 'keydown', 'touchstart'].forEach((eventName) => {
      window.removeEventListener(eventName, handleUnlockGesture, true);
    });
    unlockHandlersBound = false;
  }

  async function tryPlay() {
    try {
      await audio.play();
      writeMusicState({ playing: true });
      detachUnlockHandlers();
      syncButton();
      syncProgress();
    } catch (error) {
      setStatus('滑动、滚动或移动鼠标后继续播放');
      if (!unlockHandlersBound) {
        ['pointermove', 'wheel', 'scroll', 'keydown', 'touchstart'].forEach((eventName) => {
          window.addEventListener(eventName, handleUnlockGesture, { passive: true, capture: true });
        });
        unlockHandlersBound = true;
      }
    }
  }

  function handleUnlockGesture() {
    if (!readMusicState().playing) {
      detachUnlockHandlers();
      return;
    }
    tryPlay();
  }

  function restoreCurrentTime() {
    const savedState = readMusicState();
    const nextTime = savedState.currentTime;
    if (!Number.isFinite(nextTime) || nextTime <= 0) {
      syncProgress();
      return;
    }

    const applyTime = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : nextTime;
      audio.currentTime = Math.min(nextTime, Math.max(duration - 0.25, 0));
      syncProgress();
    };

    if (audio.readyState >= 1) {
      applyTime();
    } else {
      audio.addEventListener('loadedmetadata', applyTime, { once: true });
    }
  }

  toggle.addEventListener('click', async () => {
    if (!audio.paused && !audio.ended) {
      audio.pause();
      writeMusicState({ playing: false, currentTime: audio.currentTime });
      detachUnlockHandlers();
      syncButton();
      syncProgress();
      return;
    }

    writeMusicState({ playing: true, currentTime: audio.currentTime });
    await tryPlay();
  });

  audio.addEventListener('play', () => {
    writeMusicState({ playing: true });
    syncButton();
    syncProgress();
  });

  audio.addEventListener('pause', () => {
    syncButton();
    syncProgress();
    persistCurrentTime(true);
  });

  audio.addEventListener('loadedmetadata', syncProgress);
  audio.addEventListener('timeupdate', () => {
    syncProgress();
    persistCurrentTime();
  });
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    writeMusicState({ playing: false, currentTime: 0 });
    syncButton();
    syncProgress();
  });

  window.addEventListener('pagehide', () => {
    writeMusicState({
      playing: !audio.paused && !audio.ended,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    });
  });

  restoreCurrentTime();
  syncButton();
  syncProgress();

  if (state.playing) {
    setStatus('正在恢复播放...');
    tryPlay();
  }
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
      child.id === 'music-player'
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
  doc.head.querySelectorAll('style').forEach((styleEl) => {
    const clone = styleEl.cloneNode(true);
    clone.setAttribute(PAGE_STYLE_ATTR, 'true');
    document.head.appendChild(clone);
  });

  const selectors = [
    'meta[name="description"]',
    'meta[name="theme-color"]',
    'meta[property="og:type"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:image"]',
    'meta[property="og:locale"]',
    'meta[name="twitter:card"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[name="twitter:image"]',
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

  const bgReady = loadBg(document.getElementById('bg-layer'));
  await Promise.resolve(bgReady);

  const appContent = ensureAppContentRoot();
  appContent.replaceChildren(...extractPageNodes(doc));
  document.getElementById('search-overlay')?.classList.remove('open');
  document.getElementById('mobile-menu')?.classList.remove('open');

  await ensurePageScripts(doc);
  syncLive2DVisibility();
  scrollToNavigationTarget(hash);

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
    cache: 'no-store',
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
  });

  document.addEventListener('touchstart', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    prefetchPage(link.href);
  }, { passive: true });

  window.addEventListener('popstate', () => {
    navigateTo(location.href, { replaceHistory: true });
  });

  const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 300));
  idle(() => {
    document.querySelectorAll('a[href]').forEach((link) => {
      prefetchPage(link.href);
    });
  });
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
    initialBgPromise = Promise.resolve(loadBg(bgLayer));
  }

  ensureAppContentRoot();
  registerCurrentScripts();

  initParticles('particles');
  initReveal();
  initMobileNav();
  initSearch();
  initTheme();
  initMusicPlayer();
  applyShellConfig();
  initRouter();
  fillBgQueue().catch(() => {});

  window.addEventListener('load', () => {
    Promise.all([
      initialBgPromise.catch(() => ''),
      new Promise((resolve) => window.setTimeout(resolve, 700)),
    ]).finally(() => {
      document.getElementById('loader')?.classList.add('hidden');
      syncLive2DVisibility();
      fillBgQueue().catch(() => {});
    });
  });

  window.addEventListener('pagehide', markLive2DHidden);

  runCurrentPageModule();
});
