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
      <a class="skip-link" href="#main-content">跳到主要内容</a>
      <div id="loader">
        <div class="loader-bar" aria-hidden="true">
          <span class="loader-bar-fill"></span>
        </div>
        <div class="loader-text">${config.loaderText}</div>
      </div>
      <div id="bg-layer" data-active-pane="0">
        <div class="bg-pane bg-pane-a is-active" data-bg-pane="0"></div>
        <div class="bg-pane bg-pane-b" data-bg-pane="1"></div>
      </div>
      <div id="bg-overlay"></div>
      <canvas id="particles"></canvas>

      <div id="search-overlay" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div class="search-box">
          <h2 id="search-title" class="sr-only">站内搜索</h2>
          <div class="search-input-row">
            <span>🔍</span>
            <input id="search-input" type="text" placeholder="${config.searchPlaceholder}" autocomplete="off" />
            <button id="search-close" type="button" aria-label="关闭搜索">✕</button>
          </div>
          <div id="search-results"></div>
        </div>
      </div>

      <nav aria-label="主导航">
        <a id="site-logo" class="nav-logo" href="${pageHref(config.rootPrefix, 'index.html')}">✦ 技术日志</a>
        <div class="nav-center">${navLinks}</div>
        <div class="nav-right">
          <button class="nav-icon-btn search-trigger" type="button" title="搜索" aria-label="打开站内搜索">🔍</button>
          <button class="nav-icon-btn theme-toggle" type="button" title="切换主题" aria-label="切换明暗主题">☀️</button>
        </div>
        <button class="nav-toggle" id="nav-toggle" type="button" aria-label="打开菜单">☰</button>
      </nav>
      <div class="mobile-menu" id="mobile-menu" aria-label="移动端导航">${navLinks}</div>
    `;
  }

  function bottomMarkup(config) {
    const changelogLink = `<a class="footer-changelog-link" href="${pageHref(config.rootPrefix, 'pages/changelog.html')}">更新日志</a>`;
    const footerExtra = config.footerHtml ? `<span>${config.footerHtml}</span>` : `<span>${changelogLink}</span>`;

    return `
      <footer>
        <div class="footer-inner">
          <span>© 超级小识 · 技术日志</span>
          <span id="footer-extra">${footerExtra}</span>
        </div>
      </footer>
      <div id="sakana-widget-root" class="sakana-widget-root" aria-label="右下角摇摇乐挂件"></div>
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
        footerExtra.innerHTML = next.footerHtml || `<a class="footer-changelog-link" href="${pageHref(next.rootPrefix, 'pages/changelog.html')}">更新日志</a>`;
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
