window.SiteApp.registerPage('posts', () => {
  const absoluteBase = 'https://yzh1019.top';

  function updateStructuredData() {
    const script = document.getElementById('posts-structured-data');
    if (!script) return;

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      url: `${absoluteBase}/pages/posts.html`,
      name: '文章 · 次元日记',
      description: '浏览技术笔记、项目复盘、竞赛记录和 ACG 相关随笔。',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: POSTS.map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${absoluteBase}/pages/post.html?id=${post.id}`,
          name: post.title,
        })),
      },
    });
  }

  function renderCard(post, simple = false, index = 0) {
    const eagerImage = index < 2;
    const thumbContent = post.cover
      ? `<div class="img-bg" style="background-image:url('${post.cover}')"></div><img src="${post.cover}" alt="${post.title}" loading="${eagerImage ? 'eager' : 'lazy'}" decoding="async"${index === 0 ? ' fetchpriority="high"' : ''} />`
      : post.emoji;
    const tags = simple ? '' : `<div class="plc-tags">${post.tags.map((tag) => `<span class="plc-tag">#${tag}</span>`).join('')}</div>`;
    const readMeta = simple ? '' : `<span>· ${post.readTime} min</span>`;

    return `
      <div class="plc-thumb">${thumbContent}</div>
      <div>
        <div class="plc-meta">
          <span class="plc-cat" style="${simple ? '' : `color:${post.catColor}`}">${post.cat}</span>
          <span>${post.date}</span>
          ${readMeta}
        </div>
        <div class="plc-title">${post.title}</div>
        <div class="plc-excerpt">${post.excerpt}</div>
        ${tags}
      </div>
    `;
  }

  function mountPosts(list, simple = false) {
    const container = document.getElementById('posts-list');
    if (!container) return;
    container.innerHTML = '';

    if (!list.length) {
      container.innerHTML = '<div class="no-results"><span>🔍</span>该分类下暂时没有文章</div>';
      return;
    }

    list.forEach((post, index) => {
      const el = document.createElement('a');
      el.className = 'post-list-card reveal';
      el.style.transitionDelay = `${index * 0.07}s`;
      el.href = `post.html?id=${post.id}`;
      el.innerHTML = renderCard(post, simple, index);
      container.appendChild(el);
    });

    initReveal();
  }

  function renderPosts(category) {
    const list = category === '全部' ? POSTS : POSTS.filter((post) => post.cat === category);
    mountPosts(list);
  }

  const filterBar = document.getElementById('filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (event) => {
      const btn = event.target.closest('.filter-btn');
      if (!btn) return;

      document.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');
      renderPosts(btn.dataset.cat);
    });
  }

  renderPosts('全部');
  updateStructuredData();

  const popular = document.getElementById('sw-popular');
  if (popular) {
    popular.innerHTML = '';
    POSTS.slice(0, 3).forEach((post, index) => {
      popular.innerHTML += `<a href="post.html?id=${post.id}"><span class="sw-list-num">${index + 1}</span>${post.title}</a>`;
    });
  }

  const allTags = [...new Set(POSTS.flatMap((post) => post.tags))];
  const tagsEl = document.getElementById('sw-tags');
  if (tagsEl) {
    tagsEl.innerHTML = '';
    allTags.forEach((tag) => {
      const el = document.createElement('span');
      el.className = 'sw-tag';
      el.textContent = `#${tag}`;
      el.addEventListener('click', () => {
        mountPosts(POSTS.filter((post) => post.tags.includes(tag)), true);
        document.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active'));
      });
      tagsEl.appendChild(el);
    });
  }

  const cats = {};
  POSTS.forEach((post) => {
    cats[post.cat] = (cats[post.cat] || 0) + 1;
  });

  const catsEl = document.getElementById('sw-cats');
  if (catsEl) {
    catsEl.innerHTML = '';
    Object.entries(cats).forEach(([cat, count]) => {
      const pct = Math.round((count / POSTS.length) * 100);
      catsEl.innerHTML += `
        <div style="margin-bottom:0.7rem">
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:0.25rem">
            <span>${cat}</span>
            <span style="color:var(--text-muted)">${count}篇</span>
          </div>
          <div style="height:4px;background:var(--glass-border);border-radius:2px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--sakura-deep),var(--accent));border-radius:2px"></div>
          </div>
        </div>
      `;
    });
  }
});
