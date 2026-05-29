window.SiteApp.registerPage('changelog', () => {
  const list = document.getElementById('changelog-list');
  if (!list) return null;

  const entries = Array.isArray(window.SITE_DATA?.changelog) ? window.SITE_DATA.changelog : [];
  if (!entries.length) {
    list.innerHTML = '<div class="glass-card" style="padding:2rem;text-align:center;color:var(--text-muted)">暂时还没有更新记录</div>';
    return null;
  }

  list.innerHTML = entries.map((entry, index) => `
    <article class="change-card reveal" style="transition-delay:${index * 0.05}s">
      <div>
        <div class="change-date">${escapeHtml(entry.date)}</div>
        <div class="change-type">${escapeHtml(entry.type)}</div>
      </div>
      <div>
        <h2 class="change-title">${escapeHtml(entry.title)}</h2>
        <ul class="change-items">
          ${(entry.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    </article>
  `).join('');

  initReveal();
  return null;
});
