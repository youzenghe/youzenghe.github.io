window.SiteApp.registerPage('tags', () => {
  const cloud = document.getElementById('tag-cloud');
  if (!cloud) return null;

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
  const byTag = items.reduce((map, item) => {
    [...new Set(item.tags || [])].forEach((tag) => {
      map.set(tag, [...(map.get(tag) || []), item]);
    });
    return map;
  }, new Map());
  const tags = [...byTag.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-Hans-CN'));
  const params = new URLSearchParams(location.search);
  let currentTag = byTag.has(params.get('tag')) ? params.get('tag') : '';
  let currentPage = Math.max(1, Number(params.get('page')) || 1);

  function updateUrl() {
    const next = new URLSearchParams(location.search);
    if (currentTag) {
      next.set('tag', currentTag);
    } else {
      next.delete('tag');
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
      <div class="pagination" id="tag-pagination" aria-label="标签分页">
        <button class="page-btn" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        ${Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          return `<button class="page-btn${page === currentPage ? ' active' : ''}" type="button" data-page="${page}">${page}</button>`;
        }).join('')}
        <button class="page-btn" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
      </div>
    `;
  }

  function renderTagDetail() {
    if (!currentTag) return '';
    const list = byTag.get(currentTag) || [];
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    return `
      <section class="tag-detail-panel reveal" aria-live="polite">
        <div class="archive-panel-head">
          <h2 class="archive-panel-title">#${escapeHtml(currentTag)}</h2>
          <span class="archive-panel-count">${list.length} 项 · 第 ${currentPage} / ${totalPages} 页</span>
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
        ${renderPagination(totalPages)}
      </section>
    `;
  }

  function renderTags() {
    cloud.innerHTML = tags.length ? `
      <div class="tag-cloud-grid">
        ${tags.map(([tag, list], index) => `
          <a class="tag-cloud-item reveal${tag === currentTag ? ' active' : ''}" style="transition-delay:${Math.min(index * 0.03, 0.35)}s" href="tags.html?tag=${encodeURIComponent(tag)}" data-tag="${escapeHtml(tag)}">
            <span>#${escapeHtml(tag)}</span><strong>${list.length}</strong>
          </a>
        `).join('')}
      </div>
      ${renderTagDetail()}
    ` : '<div class="feature-card">暂时还没有标签。</div>';

    updateUrl();
    initReveal();
  }

  const onTagClick = (event) => {
    const tagLink = event.target.closest('[data-tag]');
    if (tagLink) {
      event.preventDefault();
      currentTag = tagLink.dataset.tag;
      currentPage = 1;
      renderTags();
      cloud.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }

    const pageBtn = event.target.closest('#tag-pagination .page-btn');
    if (!pageBtn || pageBtn.disabled) return;
    currentPage = Math.max(1, Number(pageBtn.dataset.page) || 1);
    renderTags();
    cloud.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  cloud.addEventListener('click', onTagClick);
  renderTags();

  return () => {
    cloud.removeEventListener('click', onTagClick);
  };
});
