(function (global) {
  const NAV_ITEMS = [
    { key: 'home', label: '首页', href: 'index.html' },
    { key: 'posts', label: '文章', href: 'pages/posts.html' },
    { key: 'gallery', label: '相册', href: 'pages/gallery.html' },
    { key: 'projects', label: '项目', href: 'pages/projects.html' },
    { key: 'games', label: '游戏', href: 'pages/games.html' },
    { key: 'about', label: '关于', href: 'pages/about.html' },
  ];

  function getBodyConfig() {
    const { dataset } = document.body;
    return {
      rootPrefix: dataset.rootPrefix || '',
      activeNav: dataset.activeNav || '',
      loaderText: dataset.loaderText || '加载中...',
      searchPlaceholder: dataset.searchPlaceholder || '搜索文章...',
      footerHtml: dataset.footerHtml || '',
    };
  }

  function pageHref(prefix, href) {
    return `${prefix}${href}`;
  }

  function renderNavLinks(prefix, activeKey) {
    return NAV_ITEMS.map((item) => {
      const activeClass = item.key === activeKey ? ' class="active"' : '';
      return `<a href="${pageHref(prefix, item.href)}" data-nav-key="${item.key}"${activeClass}>${item.label}</a>`;
    }).join('');
  }

  function topMarkup(config) {
    const navLinks = renderNavLinks(config.rootPrefix, config.activeNav);

    return `
      <div id="loader">
        <div class="loader-ring"></div>
        <div class="loader-text">${config.loaderText}</div>
      </div>
      <div id="bg-layer"></div>
      <div id="bg-overlay"></div>
      <canvas id="particles"></canvas>

      <div id="search-overlay">
        <div class="search-box">
          <div class="search-input-row">
            <span>🔍</span>
            <input id="search-input" type="text" placeholder="${config.searchPlaceholder}" autocomplete="off" />
            <button id="search-close" type="button" aria-label="关闭搜索">✕</button>
          </div>
          <div id="search-results"></div>
        </div>
      </div>

      <nav>
        <a id="site-logo" class="nav-logo" href="${pageHref(config.rootPrefix, 'index.html')}">✦ 次元日记</a>
        <div class="nav-center">${navLinks}</div>
        <div class="nav-right">
          <button class="nav-icon-btn search-trigger" type="button" title="搜索">🔍</button>
          <button class="nav-icon-btn theme-toggle" type="button" title="切换主题">☀️</button>
        </div>
        <button class="nav-toggle" id="nav-toggle" type="button" aria-label="打开菜单">☰</button>
      </nav>
      <div class="mobile-menu" id="mobile-menu">${navLinks}</div>
    `;
  }

  function bottomMarkup(config) {
    const footerExtra = config.footerHtml ? `<span>${config.footerHtml}</span>` : '';
    const musicSrc = encodeURI(pageHref(config.rootPrefix, 'music/温馨.mp3'));

    return `
      <footer>
        <div class="footer-inner">
          <span>© 次元日记</span>
          <span id="footer-extra">${footerExtra}</span>
        </div>
      </footer>
      <div id="music-player" class="music-player" aria-label="全局音乐播放器">
        <button id="music-toggle" class="music-toggle" type="button" aria-label="播放背景音乐">
          <span class="music-disc" aria-hidden="true">
            <span class="music-disc-core"></span>
          </span>
        </button>
        <div class="music-popover">
          <div id="music-title" class="music-title">要播放音乐嘛</div>
          <div id="music-status" class="music-status" aria-live="polite">等待播放</div>
        </div>
        <audio id="global-audio" preload="auto" playsinline src="${musicSrc}"></audio>
      </div>
    `;
  }

  function replaceNode(targetId, html) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.outerHTML = html;
  }

  global.SiteShell = {
    getBodyConfig,
    renderTop(targetId, override = {}) {
      replaceNode(targetId, topMarkup({ ...getBodyConfig(), ...override }));
    },
    renderBottom(targetId, override = {}) {
      replaceNode(targetId, bottomMarkup({ ...getBodyConfig(), ...override }));
    },
    sync(config = {}) {
      const next = { ...getBodyConfig(), ...config };
      const logo = document.getElementById('site-logo');
      if (logo) {
        logo.href = pageHref(next.rootPrefix, 'index.html');
      }

      document.querySelectorAll('[data-nav-key]').forEach((link) => {
        const item = NAV_ITEMS.find((navItem) => navItem.key === link.dataset.navKey);
        if (!item) return;
        link.href = pageHref(next.rootPrefix, item.href);
        link.classList.toggle('active', link.dataset.navKey === next.activeNav);
      });

      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.placeholder = next.searchPlaceholder;
      }

      const loaderText = document.querySelector('.loader-text');
      if (loaderText) {
        loaderText.textContent = next.loaderText;
      }

      const footerExtra = document.getElementById('footer-extra');
      if (footerExtra) {
        footerExtra.innerHTML = next.footerHtml || '';
      }
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('site-shell-top')) {
      global.SiteShell.renderTop('site-shell-top');
    }

    if (document.getElementById('site-shell-bottom')) {
      global.SiteShell.renderBottom('site-shell-bottom');
    }
  });
})(window);
