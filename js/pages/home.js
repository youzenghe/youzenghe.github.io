window.SiteApp.registerPage('home', () => {
  const stopTypewriter = typewriter(
    document.getElementById('typewriter'),
    ['吃谷爱好者', 'AI 爱好者', '编程爱好者', 'ACG 爱好者'],
    120
  );

  let rafId = 0;

  function buildPostCard(post, index) {
    const el = document.createElement('a');
    el.className = 'post-card reveal';
    el.style.transitionDelay = `${index * 0.1}s`;
    el.href = `pages/post.html?id=${post.id}`;
    el.innerHTML = `
      <div class="post-card-img">
        ${post.cover
          ? `<div class="img-bg" style="background-image:url('${post.cover.replace('../', '')}')"></div><img src="${post.cover.replace('../', '')}" alt="${post.title}" loading="lazy" decoding="async">`
          : post.emoji}
      </div>
      <div class="post-card-body">
        <div class="post-meta">
          <span class="post-cat" style="color:${post.catColor}">${post.cat}</span>
          <span>${post.date}</span>
        </div>
        <div class="post-card-title">${post.title}</div>
        <p class="post-card-excerpt">${post.excerpt}</p>
      </div>
      <div class="post-card-footer">
        <span>阅读 · ${post.readTime} min</span>
        <span class="post-read-more">继续阅读 →</span>
      </div>
    `;
    return el;
  }

  function buildProjectCard(project) {
    const el = document.createElement('div');
    el.className = 'bm-card reveal';
    el.innerHTML = `
      <div class="bm-cover">
        ${project.img
          ? `<div class="img-bg" style="position:absolute;inset:-4px;background:url('${project.img.replace('../', '')}') center/cover;filter:blur(10px) brightness(0.5);transform:scale(1.05)"></div><img src="${project.img.replace('../', '')}" alt="${project.title}" loading="lazy" decoding="async" style="position:relative;z-index:1;max-width:100%;max-height:100%;width:auto;height:100%;object-fit:contain;display:block">`
          : project.emoji}
      </div>
      <div class="bm-info">
        <div class="bm-title">${project.title}</div>
        <div class="bm-bar"><div class="bm-fill" style="width:100%"></div></div>
        <div class="bm-ep">${project.cat} · ${project.date}</div>
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
              <h2>你好，我是这个次元空间的主人 ✦</h2>
              <p>一个沉迷于二次元世界的普通人。在这里分享我喜欢的动画、漫画与游戏，也记录平凡却珍贵的生活瞬间。</p>
              <div class="about-tags">
                <span class="tag">ACG 爱好者</span>
                <span class="tag">编程爱好者</span>
                <span class="tag">AI 爱好者</span>
                <span class="tag">吃谷爱好者</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="home-deferred">
        <div class="section-header">
          <div class="section-header-row">
            <div>
              <div class="section-label">Latest Posts</div>
              <div class="divider"></div>
              <h2 class="section-title">最新文章</h2>
            </div>
            <a href="pages/posts.html" class="btn btn-ghost" style="align-self: flex-end;">查看全部 →</a>
          </div>
        </div>
        <div class="posts-grid" id="home-posts"></div>
      </section>
      <section class="home-deferred">
        <div class="section-header">
          <div class="section-header-row">
            <div>
              <div class="section-label">Projects</div>
              <div class="divider"></div>
              <h2 class="section-title">最近的项目</h2>
            </div>
            <a href="pages/projects.html" class="btn btn-ghost" style="align-self: flex-end;">项目列表 →</a>
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
      PROJECTS.slice(0, 4).forEach((project) => {
        projectFragment.appendChild(buildProjectCard(project));
      });
      projectContainer.replaceChildren(projectFragment);
      initReveal();
    }
  }

  rafId = window.requestAnimationFrame(() => {
    renderHomeSections();
  });

  return () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    if (typeof stopTypewriter === 'function') {
      stopTypewriter();
    }
  };
});
