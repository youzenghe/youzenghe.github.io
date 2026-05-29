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
    const cover = escapeHtml(resolveAssetUrl(post.cover));
    const thumb = escapeHtml(resolveThumbnailUrl(post.cover));
    const thumbCss = escapeCssUrl(resolveThumbnailUrl(post.cover));
    const title = escapeHtml(post.title);
    const thumbContent = post.cover
      ? `<div class="img-bg" style="background-image:url('${thumbCss}')"></div><img src="${thumb}" data-full-src="${cover}" alt="${title}" loading="${eagerImage ? 'eager' : 'lazy'}" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc"${index === 0 ? ' fetchpriority="high"' : ''} />`
      : escapeHtml(post.emoji);
    const tags = simple ? '' : `<div class="plc-tags">${post.tags.map((tag) => `<span class="plc-tag">#${escapeHtml(tag)}</span>`).join('')}</div>`;
    const readMeta = simple ? '' : `<span>· ${escapeHtml(post.readTime)} min</span>`;
    const flags = [
      post.pinned ? '<span class="plc-flag">置顶</span>' : '',
      post.featured ? '<span class="plc-flag">精选</span>' : '',
    ].join('');

    return `
      <div class="plc-thumb">${thumbContent}</div>
      <div>
        <div class="plc-meta">
          <span class="plc-cat" style="${simple ? '' : `color:${safeCssColor(post.catColor)}`}">${escapeHtml(post.cat)}</span>
          <span>${escapeHtml(post.date)}</span>
          ${readMeta}
          ${flags}
        </div>
        <div class="plc-title">${title}</div>
        <div class="plc-excerpt">${escapeHtml(post.excerpt)}</div>
        ${tags}
      </div>
    `;
  }

  function mountPosts(list, simple = false) {
    const container = document.getElementById('posts-list');
    if (!container) return;
    container.innerHTML = '';
    container.scrollTop = 0;

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

  function clearFilterState() {
    document.querySelectorAll('.filter-btn, .sw-series-btn').forEach((item) => item.classList.remove('active'));
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

      clearFilterState();
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
      popular.innerHTML += `<a href="post.html?id=${post.id}"><span class="sw-list-num">${index + 1}</span>${escapeHtml(post.title)}</a>`;
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
        clearFilterState();
      });
      tagsEl.appendChild(el);
    });
  }

  const seriesMap = {};
  POSTS.forEach((post) => {
    const series = post.series || post.cat || '未分组';
    seriesMap[series] = (seriesMap[series] || 0) + 1;
  });

  const seriesEl = document.getElementById('sw-series');
  if (seriesEl) {
    seriesEl.innerHTML = '';
    Object.entries(seriesMap).forEach(([series, count]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sw-series-btn';
      btn.innerHTML = `<span>${escapeHtml(series)}</span><span class="sw-series-count">${count} 篇</span>`;
      btn.addEventListener('click', () => {
        clearFilterState();
        btn.classList.add('active');
        mountPosts(POSTS.filter((post) => (post.series || post.cat || '未分组') === series), true);
      });
      seriesEl.appendChild(btn);
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
            <span>${escapeHtml(cat)}</span>
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
