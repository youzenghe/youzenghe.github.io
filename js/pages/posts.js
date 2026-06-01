window.SiteApp.registerPage('posts', () => {
  const absoluteBase = 'https://yzh1019.top';
  const pageSize = 5;
  let currentPage = 1;
  let currentCategory = '全部';

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
    const coverVersion = encodeURIComponent(post.updatedAt || post.date || post.id);
    const previewSource = post.coverAnimated
      ? `${resolveAssetUrl(post.cover)}${resolveAssetUrl(post.cover).includes('?') ? '&' : '?'}v=${coverVersion}`
      : resolveThumbnailUrl(post.cover);
    const thumb = escapeHtml(previewSource);
    const thumbCss = escapeCssUrl(previewSource);
    const title = escapeHtml(post.title);
    const thumbClass = `plc-thumb${post.coverAnimated ? ' is-animated-cover' : ''}`;
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
      <div class="${thumbClass}">${thumbContent}</div>
      <div class="plc-content">
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

  function renderPagination(total) {
    const container = document.getElementById('posts-list');
    if (!container) return;
    let pager = document.getElementById('posts-pagination');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'posts-pagination';
      pager.className = 'pagination';
      container.after(pager);
    }
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) {
      pager.innerHTML = '';
      return;
    }
    const buttons = Array.from({ length: totalPages }, (_, index) => index + 1);
    pager.innerHTML = `
      <button class="page-btn" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
      ${buttons.map((page) => `<button class="page-btn${page === currentPage ? ' active' : ''}" type="button" data-page="${page}">${page}</button>`).join('')}
      <button class="page-btn" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;
  }

  function mountPosts(list, simple = false) {
    const container = document.getElementById('posts-list');
    if (!container) return;
    container.innerHTML = '';

    if (!list.length) {
      container.innerHTML = '<div class="no-results"><span>🔍</span>该分类下暂时没有文章</div>';
      renderPagination(0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const pageItems = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    pageItems.forEach((post, index) => {
      const el = document.createElement('a');
      el.className = 'post-list-card reveal';
      el.style.transitionDelay = `${index * 0.07}s`;
      el.href = `post.html?id=${post.id}`;
      el.innerHTML = renderCard(post, simple, index);
      container.appendChild(el);
    });
    renderPagination(list.length);

    initReveal();
  }

  function clearFilterState() {
    document.querySelectorAll('.filter-btn, .sw-series-btn').forEach((item) => item.classList.remove('active'));
  }

  function renderPosts(category) {
    currentCategory = category;
    const params = new URLSearchParams(location.search);
    const tag = params.get('tag');
    const byCategory = category === '全部' ? POSTS : POSTS.filter((post) => post.cat === category);
    const list = tag ? byCategory.filter((post) => (post.tags || []).includes(tag)) : byCategory;
    mountPosts(list);
  }

  function categoryLabel(category) {
    const labels = {
      荣誉证明: '🏆 荣誉证明',
      趣味生活: '🌸 趣味生活',
      技术笔记: '💻 技术笔记',
    };
    return labels[category] || category;
  }

  function renderCategoryFilters() {
    if (!filterBar) return;
    const categories = ['全部', ...new Set(POSTS.map((post) => post.cat).filter(Boolean))];
    filterBar.innerHTML = '';
    categories.forEach((category, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `filter-btn${index === 0 ? ' active' : ''}`;
      btn.dataset.cat = category;
      btn.textContent = category === '全部' ? '全部' : categoryLabel(category);
      filterBar.appendChild(btn);
    });
  }

  const filterBar = document.getElementById('filter-bar');
  renderCategoryFilters();
  if (filterBar) {
    filterBar.addEventListener('click', (event) => {
      const btn = event.target.closest('.filter-btn');
      if (!btn) return;

      clearFilterState();
      btn.classList.add('active');
      currentPage = 1;
      renderPosts(btn.dataset.cat);
    });
  }

  const onPaginationClick = (event) => {
    const btn = event.target.closest('#posts-pagination .page-btn');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 1;
    renderPosts(currentCategory);
    document.getElementById('posts-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  document.addEventListener('click', onPaginationClick);

  const activeTag = new URLSearchParams(location.search).get('tag');
  if (activeTag && filterBar) {
    const note = document.createElement('a');
    note.className = 'filter-btn active';
    note.href = 'posts.html';
    note.textContent = `#${activeTag} ×`;
    filterBar.prepend(note);
  }

  renderPosts('全部');
  updateStructuredData();
  initReveal();

  return () => {
    document.removeEventListener('click', onPaginationClick);
  };
});
