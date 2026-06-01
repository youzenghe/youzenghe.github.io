window.SiteApp.registerPage('acg', () => {
  const tabs = document.getElementById('acg-tabs');
  const grid = document.getElementById('acg-grid');
  if (!tabs || !grid) return null;

  const bangumiPageSize = 3;
  let currentKind = 'galgames';
  let currentBangumiPage = 1;
  const acg = window.SITE_DATA?.acg || { galgames: [], bangumi: [] };
  const galgameCoverMap = {
    '常轨脱离 Creative': '../assets/acg/galgames/galgame-01.webp',
    '夏日口袋': '../assets/acg/galgames/galgame-02.webp',
    '甜蜜女友 2': '../assets/acg/galgames/galgame-03.webp',
    '与你心相连': '../assets/acg/galgames/galgame-04.webp',
    '妹相随': '../assets/acg/galgames/galgame-05.webp',
    '妹生活': '../assets/acg/galgames/galgame-06.webp',
  };
  const works = (window.SITE_DATA?.games || []).map((game) => ({
    title: game.title,
    type: game.category || game.type || 'Game',
    score: game.status || '',
    status: game.platform || '',
    cover: game.image,
    link: game.downloadLink,
    description: game.description,
  }));

  function itemUrl(item) {
    const cover = item.cover || galgameCoverMap[item.title] || '';
    if (!cover) return '';
    return /^https?:\/\//i.test(cover) ? cover : resolveAssetUrl(cover);
  }

  function renderBangumiCard(item, index) {
    const cover = itemUrl(item);
    const meta = [item.type || '番剧', item.episodes || '', item.status || ''].filter(Boolean);
    const card = `
      <article class="feature-card acg-card acg-bangumi-card is-row reveal" style="transition-delay:${Math.min(index * 0.04, 0.35)}s">
        <div class="acg-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async">` : '📺'}</div>
        <div class="acg-body">
          <div class="acg-meta">
            <span>${escapeHtml(meta.join(' · '))}</span>
            ${item.score ? `<span>${escapeHtml(item.score)}</span>` : ''}
          </div>
          <h2 class="feature-card-title">${escapeHtml(item.title)}</h2>
          <p class="acg-desc">${escapeHtml(item.description || '')}</p>
          <div class="feature-card-tags">
            ${meta.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      </article>
    `;
    return item.link ? `<a class="acg-link-card" href="${escapeHtml(safeExternalUrl(item.link))}" target="_blank" rel="noreferrer noopener">${card}</a>` : card;
  }

  function renderGridCard(item, index) {
    const cover = itemUrl(item);
    const body = `
      <article class="feature-card acg-card reveal" style="transition-delay:${Math.min(index * 0.04, 0.35)}s">
        <div class="acg-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="${index < 4 ? 'eager' : 'lazy'}" decoding="async">` : '🎮'}</div>
        <div class="acg-body">
          <div class="acg-meta"><span>${escapeHtml(item.type || 'ACG')}</span><span>${escapeHtml(item.score || '')}</span></div>
          <h2 class="feature-card-title">${escapeHtml(item.title)}</h2>
          <div class="feature-card-meta">${escapeHtml(item.status || '')}</div>
          <p class="acg-desc">${escapeHtml(item.description || '')}</p>
        </div>
      </article>
    `;
    return item.link ? `<a class="acg-link-card" href="${escapeHtml(safeExternalUrl(item.link))}" target="_blank" rel="noreferrer noopener">${body}</a>` : body;
  }

  function renderPagination(total) {
    let pager = document.getElementById('acg-pagination');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'acg-pagination';
      pager.className = 'pagination';
      grid.after(pager);
    }
    if (currentKind !== 'bangumi') {
      pager.innerHTML = '';
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / bangumiPageSize));
    currentBangumiPage = Math.min(currentBangumiPage, totalPages);
    if (totalPages <= 1) {
      pager.innerHTML = '';
      return;
    }

    pager.innerHTML = `
      <button class="page-btn" type="button" data-page="${currentBangumiPage - 1}" ${currentBangumiPage === 1 ? 'disabled' : ''}>上一页</button>
      ${Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `<button class="page-btn${page === currentBangumiPage ? ' active' : ''}" type="button" data-page="${page}">${page}</button>`;
      }).join('')}
      <button class="page-btn" type="button" data-page="${currentBangumiPage + 1}" ${currentBangumiPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;
  }

  function render(kind) {
    currentKind = kind;
    const list = kind === 'works' ? works : (acg[kind] || []);
    const pageItems = kind === 'bangumi'
      ? list.slice((currentBangumiPage - 1) * bangumiPageSize, currentBangumiPage * bangumiPageSize)
      : list;
    grid.classList.toggle('is-list', kind === 'bangumi');
    grid.innerHTML = pageItems.map((item, index) => (
      kind === 'bangumi' ? renderBangumiCard(item, index) : renderGridCard(item, index)
    )).join('');
    renderPagination(list.length);
    initReveal();
  }

  const onTabClick = (event) => {
    const btn = event.target.closest('.acg-tab');
    if (!btn) return;
    tabs.querySelectorAll('.acg-tab').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.kind === 'bangumi') {
      currentBangumiPage = 1;
    }
    render(btn.dataset.kind);
  };

  const onPaginationClick = (event) => {
    const btn = event.target.closest('#acg-pagination .page-btn');
    if (!btn || btn.disabled) return;
    currentBangumiPage = Number(btn.dataset.page) || 1;
    render('bangumi');
    grid.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  tabs.addEventListener('click', onTabClick);
  document.addEventListener('click', onPaginationClick);

  render('galgames');
  return () => {
    tabs.removeEventListener('click', onTabClick);
    document.removeEventListener('click', onPaginationClick);
  };
});
