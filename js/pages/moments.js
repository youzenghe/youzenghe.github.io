window.SiteApp.registerPage('moments', () => {
  const root = document.getElementById('moment-list');
  if (!root) return null;

  const pageSize = 6;
  let currentPage = 1;
  const moments = [...(window.SITE_DATA?.moments || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  function renderPager() {
    let pager = document.getElementById('moments-pagination');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'moments-pagination';
      pager.className = 'pagination';
      root.after(pager);
    }
    const totalPages = Math.max(1, Math.ceil(moments.length / pageSize));
    if (totalPages <= 1) {
      pager.innerHTML = '';
      return;
    }
    pager.innerHTML = `
      <button class="page-btn" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
      ${Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `<button class="page-btn${page === currentPage ? ' active' : ''}" type="button" data-page="${page}">${page}</button>`;
      }).join('')}
      <button class="page-btn" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;
  }

  function renderMoments() {
    const totalPages = Math.max(1, Math.ceil(moments.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const pageItems = moments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    root.innerHTML = moments.length ? pageItems.map((moment, index) => `
      <article class="feature-card moment-card reveal" style="transition-delay:${Math.min(index * 0.05, 0.4)}s">
        <div class="moment-date">${escapeHtml(moment.date)} · ${escapeHtml(moment.mood || '记录')}</div>
        <h2 class="feature-card-title">${escapeHtml(moment.title)}</h2>
        <p class="moment-body">${escapeHtml(moment.content)}</p>
        <div class="feature-card-tags">
          ${(moment.tags || []).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
        </div>
      </article>
    `).join('') : '<div class="feature-card">暂时还没有瞬间。</div>';
    renderPager();
    initReveal();
  }

  const onPagerClick = (event) => {
    const btn = event.target.closest('#moments-pagination .page-btn');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 1;
    renderMoments();
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  document.addEventListener('click', onPagerClick);

  renderMoments();
  return () => {
    document.removeEventListener('click', onPagerClick);
  };
});
