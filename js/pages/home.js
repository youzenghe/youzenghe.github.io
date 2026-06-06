window.SiteApp.registerPage('home', () => {
  const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const stopTypewriter = typewriter(
    document.getElementById('typewriter'),
    ['Java 后端开发者', 'AI 应用实践者', '项目复盘记录者', 'ACG 玩家'],
    120
  );

  let rafId = 0;

  function buildPostCard(post, index) {
    const el = document.createElement('a');
    el.className = 'post-card reveal';
    el.style.transitionDelay = `${index * 0.1}s`;
    el.href = resolvePagePath(`pages/post.html?id=${post.id}`);
    const cover = escapeHtml(resolveAssetUrl(post.cover));
    const previewSource = post.coverAnimated ? resolveAssetUrl(post.cover) : resolveThumbnailUrl(post.cover);
    const thumb = escapeHtml(previewSource);
    const thumbCss = escapeCssUrl(previewSource);
    const title = escapeHtml(post.title);
    el.innerHTML = `
      <div class="post-card-img">
        ${post.cover
          ? `<div class="img-bg"></div><img src="${transparentPixel}" data-lazy-src="${thumb}" data-lazy-bg-target=".img-bg" data-full-src="${cover}" alt="${title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc">`
          : escapeHtml(post.emoji)}
      </div>
      <div class="post-card-body">
        <div class="post-meta">
          <span class="post-cat" style="color:${safeCssColor(post.catColor)}">${escapeHtml(post.cat)}</span>
          <span>${escapeHtml(post.date)}</span>
        </div>
        <div class="post-card-title">${title}</div>
        <p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>
      </div>
      <div class="post-card-footer">
        <span>阅读 · ${escapeHtml(post.readTime)} min</span>
        <span class="post-read-more">继续阅读 →</span>
      </div>
    `;
    return el;
  }

  function buildProjectCard(project) {
    const el = document.createElement('div');
    el.className = 'bm-card reveal';
    const image = escapeHtml(resolveAssetUrl(project.img));
    const previewSource = project.imgAnimated ? resolveAssetUrl(project.img) : resolveThumbnailUrl(project.img);
    const thumb = escapeHtml(previewSource);
    const thumbCss = escapeCssUrl(previewSource);
    const title = escapeHtml(project.title);
    el.innerHTML = `
      <div class="bm-cover">
        ${project.img
          ? `<div class="img-bg" style="position:absolute;inset:-4px;background-position:center;background-size:cover;filter:blur(10px) brightness(0.5);transform:scale(1.05)"></div><img src="${transparentPixel}" data-lazy-src="${thumb}" data-lazy-bg-target=".img-bg" data-full-src="${image}" alt="${title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc" style="position:relative;z-index:1;max-width:100%;max-height:100%;width:auto;height:100%;object-fit:contain;display:block">`
          : escapeHtml(project.emoji)}
      </div>
      <div class="bm-info">
        <div class="bm-title">${title}</div>
        <div class="bm-bar"><div class="bm-fill" style="width:100%"></div></div>
        <div class="bm-ep">${escapeHtml(project.cat)} · ${escapeHtml(project.date)}</div>
      </div>
    `;
    return el;
  }

  function renderHomeSections() {
    rafId = 0;
    const secondary = document.getElementById('home-secondary');
    if (!secondary) return;

    secondary.innerHTML = `
      <div class="stats-bar reveal home-deferred" id="home-stats">
        <div class="stat-item"><div class="stat-num">${POSTS.length}</div><div class="stat-label">篇文章</div></div>
        <div class="stat-item"><div class="stat-num">${PROJECTS.length}</div><div class="stat-label">个项目</div></div>
        <div class="stat-item"><div class="stat-num">${typeof GAMES !== 'undefined' ? GAMES.length : 0}</div><div class="stat-label">款游戏</div></div>
        <div class="stat-item"><div class="stat-num">∞</div><div class="stat-label">热爱</div></div>
      </div>
      <section class="home-deferred">
        <div class="glass-card reveal">
          <div class="about-strip">
            <div class="about-avatar"></div>
            <div class="about-info">
              <h2>你好，我是超级小识 ✦</h2>
              <p>这里用来整理项目经历、技术选择和实际踩坑。ACG 内容会保留，但它更像个人标签，不会抢走技术记录的位置。</p>
              <div class="about-tags">
                <span class="tag">Java 后端</span>
                <span class="tag">AI 应用</span>
                <span class="tag">项目复盘</span>
                <span class="tag">ACG</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="home-deferred">
        <div class="section-header">
          <div class="section-header-row">
            <div>
              <div class="section-label">Notes</div>
              <div class="divider"></div>
              <h2 class="section-title">最近记录</h2>
            </div>
            <a href="${resolvePagePath('pages/posts.html')}" class="btn btn-ghost" style="align-self: flex-end;">查看全部 →</a>
          </div>
        </div>
        <div class="posts-grid" id="home-posts"></div>
      </section>
      <section class="home-deferred">
        <div class="section-header">
          <div class="section-header-row">
            <div>
              <div class="section-label">Builds</div>
              <div class="divider"></div>
              <h2 class="section-title">项目复盘</h2>
            </div>
            <a href="${resolvePagePath('pages/projects.html')}" class="btn btn-ghost" style="align-self: flex-end;">项目列表 →</a>
          </div>
        </div>
        <div class="project-mini reveal" id="home-projects"></div>
      </section>
    `;

    initReveal();

    const postsContainer = document.getElementById('home-posts');
    if (postsContainer) {
      const postsFragment = document.createDocumentFragment();
      POSTS.slice(0, 3).forEach((post, index) => {
        postsFragment.appendChild(buildPostCard(post, index));
      });
      postsContainer.replaceChildren(postsFragment);
      initReveal();
    }

    const projectContainer = document.getElementById('home-projects');
    if (projectContainer) {
      const projectFragment = document.createDocumentFragment();
      [...PROJECTS].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 4).forEach((project) => {
        projectFragment.appendChild(buildProjectCard(project));
      });
      projectContainer.replaceChildren(projectFragment);
      initReveal();
    }

    if (typeof initLazyMedia === 'function') {
      initLazyMedia(secondary, { rootMargin: '320px 0px' });
    }
  }

  const secondary = document.getElementById('home-secondary');
  let observer = null;

  function scheduleRender() {
    if (rafId || !secondary || secondary.dataset.rendered === 'true') return;
    rafId = window.requestAnimationFrame(() => {
      if (!secondary || secondary.dataset.rendered === 'true') {
        rafId = 0;
        return;
      }
      secondary.dataset.rendered = 'true';
      renderHomeSections();
    });
  }

  if (secondary && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      observer = null;
      scheduleRender();
    }, { rootMargin: '240px 0px' });
    observer.observe(secondary);
  } else {
    scheduleRender();
  }

  return () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    observer?.disconnect();
    if (typeof stopTypewriter === 'function') {
      stopTypewriter();
    }
  };
});
