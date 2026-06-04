window.SiteApp.registerPage('archive', () => {
  const list = document.getElementById('archive-list');
  const stats = document.getElementById('archive-stats');
  if (!list) return null;

  const pageSize = 8;
  const sourcePosts = typeof POSTS !== 'undefined' && Array.isArray(POSTS) ? POSTS : [];
  const sourceLearningPlans = typeof LEARNING_PLANS !== 'undefined' && Array.isArray(LEARNING_PLANS) ? LEARNING_PLANS : [];
  const posts = sourcePosts.map((post) => ({
    ...post,
    archiveType: '文章',
    archiveHref: `post.html?id=${post.id}`,
    archiveCat: post.cat || '未分类',
  }));
  const learningPlans = sourceLearningPlans.map((plan) => ({
    ...plan,
    archiveType: '学习计划',
    archiveHref: `learning.html?id=${plan.id}`,
    archiveCat: `学习计划 · ${plan.cat || '未分类'}`,
  }));
  const items = [...posts, ...learningPlans].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const years = [...new Set(items.map((item) => String(item.date || '').slice(0, 4) || '未知'))]
    .sort((a, b) => String(b).localeCompare(String(a)));
  const params = new URLSearchParams(location.search);
  let currentYear = years.includes(params.get('year')) ? params.get('year') : years[0];
  let currentPage = Math.max(1, Number(params.get('page')) || 1);

  function itemsForYear(year) {
    return items.filter((item) => (String(item.date || '').slice(0, 4) || '未知') === year);
  }

  function updateUrl() {
    const next = new URLSearchParams(location.search);
    if (currentYear) next.set('year', currentYear);
    if (currentPage > 1) {
      next.set('page', String(currentPage));
    } else {
      next.delete('page');
    }
    const query = next.toString();
    history.replaceState({}, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }

  function renderPagination(total, totalPages) {
    if (totalPages <= 1) return '';
    return `
      <div class="pagination" id="archive-pagination" aria-label="归档分页">
        <button class="page-btn" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        ${Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          return `<button class="page-btn${page === currentPage ? ' active' : ''}" type="button" data-page="${page}">${page}</button>`;
        }).join('')}
        <button class="page-btn" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
      </div>
    `;
  }

  function renderArchive() {
    if (!items.length || !currentYear) {
      list.innerHTML = '<div class="feature-card">暂时还没有可归档的内容。</div>';
      return;
    }

    const currentItems = itemsForYear(currentYear);
    const totalPages = Math.max(1, Math.ceil(currentItems.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = currentItems.slice(start, start + pageSize);
    const yearCounts = new Map(years.map((year) => [year, itemsForYear(year).length]));

    list.innerHTML = `
      <section class="archive-filter-card reveal">
        <div class="archive-panel-head">
          <div>
            <span class="archive-kicker">Years</span>
            <h2 class="archive-panel-title">按年份查看</h2>
          </div>
          <span class="archive-panel-count">${years.length} 个年份</span>
        </div>
        <div class="archive-switcher" id="archive-year-tabs" role="tablist" aria-label="归档年份">
          ${years.map((year) => `
            <button class="archive-switch${year === currentYear ? ' active' : ''}" type="button" data-year="${escapeHtml(year)}" role="tab" aria-selected="${year === currentYear}">
              <span>${escapeHtml(year)}</span><strong>${yearCounts.get(year) || 0}</strong>
            </button>
          `).join('')}
        </div>
      </section>
      <section class="archive-year reveal" aria-live="polite">
        <div class="archive-panel-head">
          <h2 class="archive-year-title">${escapeHtml(currentYear)}</h2>
          <span class="archive-panel-count">${currentItems.length} 项 · 第 ${currentPage} / ${totalPages} 页</span>
        </div>
        <div class="archive-list">
          ${pageItems.map((item) => `
            <a class="archive-row" href="${escapeHtml(item.archiveHref)}">
              <span class="archive-date">${escapeHtml(String(item.date || '').slice(5) || String(item.date || ''))}</span>
              <span class="archive-title">${escapeHtml(item.title)}</span>
              <span class="archive-cat">${escapeHtml(item.archiveCat)}</span>
            </a>
          `).join('')}
        </div>
        ${renderPagination(currentItems.length, totalPages)}
      </section>
    `;

    updateUrl();
    initReveal();
  }

  function renderStats() {
    if (!stats) return;
    const tags = new Set(items.flatMap((item) => item.tags || []));
    const categories = new Set(items.map((item) => item.archiveCat || item.cat).filter(Boolean));
    const totalMinutes = items.reduce((sum, item) => sum + Number(item.readTime || 0), 0);
    stats.innerHTML = `
      <div class="mini-stat"><strong>${items.length}</strong><span>内容</span></div>
      <div class="mini-stat"><strong>${categories.size}</strong><span>分类</span></div>
      <div class="mini-stat"><strong>${tags.size}</strong><span>标签</span></div>
      <div class="mini-stat"><strong>${totalMinutes}</strong><span>分钟</span></div>
    `;
  }

  const onArchiveClick = (event) => {
    const yearBtn = event.target.closest('[data-year]');
    if (yearBtn) {
      currentYear = yearBtn.dataset.year;
      currentPage = 1;
      renderArchive();
      list.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }

    const pageBtn = event.target.closest('#archive-pagination .page-btn');
    if (!pageBtn || pageBtn.disabled) return;
    currentPage = Math.max(1, Number(pageBtn.dataset.page) || 1);
    renderArchive();
    list.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  list.addEventListener('click', onArchiveClick);
  renderStats();
  renderArchive();

  return () => {
    list.removeEventListener('click', onArchiveClick);
  };
});
