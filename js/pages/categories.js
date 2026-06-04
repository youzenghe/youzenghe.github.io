window.SiteApp.registerPage('categories', () => {
  const root = document.getElementById('category-list');
  if (!root) return null;

  const pageSize = 8;
  const sourcePosts = typeof POSTS !== 'undefined' && Array.isArray(POSTS) ? POSTS : [];
  const sourceLearningPlans = typeof LEARNING_PLANS !== 'undefined' && Array.isArray(LEARNING_PLANS) ? LEARNING_PLANS : [];
  const items = [
    ...sourcePosts.map((post) => ({
      ...post,
      archiveType: '文章',
      archiveHref: `post.html?id=${post.id}`,
      archiveCat: post.cat || '未分类',
    })),
    ...sourceLearningPlans.map((plan) => ({
      ...plan,
      archiveType: '学习计划',
      archiveHref: `learning.html?id=${plan.id}`,
      archiveCat: `学习计划 · ${plan.cat || '未分类'}`,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const byCategory = items.reduce((map, item) => {
    const key = item.archiveCat || '未分类';
    map.set(key, [...(map.get(key) || []), item]);
    return map;
  }, new Map());
  const categoryNames = [...byCategory.keys()]
    .sort((a, b) => (byCategory.get(b)?.length || 0) - (byCategory.get(a)?.length || 0) || a.localeCompare(b, 'zh-Hans-CN'));
  const categories = ['全部', ...categoryNames];
  const params = new URLSearchParams(location.search);
  let currentCategory = categories.includes(params.get('cat')) ? params.get('cat') : '全部';
  let currentPage = Math.max(1, Number(params.get('page')) || 1);

  function currentItems() {
    return currentCategory === '全部' ? items : byCategory.get(currentCategory) || [];
  }

  function updateUrl() {
    const next = new URLSearchParams(location.search);
    if (currentCategory === '全部') {
      next.delete('cat');
    } else {
      next.set('cat', currentCategory);
    }
    if (currentPage > 1) {
      next.set('page', String(currentPage));
    } else {
      next.delete('page');
    }
    const query = next.toString();
    history.replaceState({}, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) return '';
    return `
      <div class="pagination" id="category-pagination" aria-label="分类分页">
        <button class="page-btn" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        ${Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          return `<button class="page-btn${page === currentPage ? ' active' : ''}" type="button" data-page="${page}">${page}</button>`;
        }).join('')}
        <button class="page-btn" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
      </div>
    `;
  }

  function rowMeta(item) {
    if (currentCategory === '全部') return item.archiveCat;
    const tags = (item.tags || []).slice(0, 2).join(' · ');
    return tags ? `${item.archiveType} · ${tags}` : item.archiveType;
  }

  function renderCategories() {
    const list = currentItems();
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);
    const countFor = (category) => (category === '全部' ? items.length : byCategory.get(category)?.length || 0);

    root.innerHTML = `
      <section class="archive-filter-card reveal">
        <div class="archive-panel-head">
          <div>
            <span class="archive-kicker">Categories</span>
            <h2 class="archive-panel-title">按分类查看</h2>
          </div>
          <span class="archive-panel-count">${categoryNames.length} 个分类</span>
        </div>
        <div class="archive-switcher" id="category-tabs" role="tablist" aria-label="内容分类">
          ${categories.map((category) => `
            <button class="archive-switch${category === currentCategory ? ' active' : ''}" type="button" data-cat="${escapeHtml(category)}" role="tab" aria-selected="${category === currentCategory}">
              <span>${escapeHtml(category)}</span><strong>${countFor(category)}</strong>
            </button>
          `).join('')}
        </div>
      </section>
      <section class="category-section reveal" aria-live="polite">
        <div class="category-head">
          <h2 class="category-title">${escapeHtml(currentCategory)}</h2>
          <span class="category-count">${list.length} 项 · 第 ${currentPage} / ${totalPages} 页</span>
        </div>
        <div class="archive-list">
          ${pageItems.map((item) => `
            <a class="archive-row" href="${escapeHtml(item.archiveHref)}">
              <span class="archive-date">${escapeHtml(String(item.date || '').slice(5) || String(item.date || ''))}</span>
              <span class="archive-title">${escapeHtml(item.title)}</span>
              <span class="archive-cat">${escapeHtml(rowMeta(item))}</span>
            </a>
          `).join('')}
        </div>
        ${renderPagination(totalPages)}
      </section>
    `;

    updateUrl();
    initReveal();
  }

  const onCategoryClick = (event) => {
    const categoryBtn = event.target.closest('[data-cat]');
    if (categoryBtn) {
      currentCategory = categoryBtn.dataset.cat;
      currentPage = 1;
      renderCategories();
      root.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }

    const pageBtn = event.target.closest('#category-pagination .page-btn');
    if (!pageBtn || pageBtn.disabled) return;
    currentPage = Math.max(1, Number(pageBtn.dataset.page) || 1);
    renderCategories();
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  root.addEventListener('click', onCategoryClick);
  renderCategories();

  return () => {
    root.removeEventListener('click', onCategoryClick);
  };
});
