window.SiteApp.registerPage('acg', () => {
  const tabs = document.getElementById('acg-tabs');
  const grid = document.getElementById('acg-grid');
  if (!tabs || !grid) return null;

  const acg = window.SITE_DATA?.acg || { galgames: [], bangumi: [] };
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
    if (!item.cover) return '';
    return /^https?:\/\//i.test(item.cover) ? item.cover : resolveAssetUrl(item.cover);
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

  function render(kind) {
    const list = kind === 'works' ? works : (acg[kind] || []);
    grid.classList.toggle('is-list', kind === 'bangumi');
    grid.innerHTML = list.map((item, index) => (
      kind === 'bangumi' ? renderBangumiCard(item, index) : renderGridCard(item, index)
    )).join('');
    initReveal();
  }

  tabs.addEventListener('click', (event) => {
    const btn = event.target.closest('.acg-tab');
    if (!btn) return;
    tabs.querySelectorAll('.acg-tab').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.kind);
  });

  render('galgames');
  return null;
});
