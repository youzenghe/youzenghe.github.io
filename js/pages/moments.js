window.SiteApp.registerPage('moments', () => {
  const root = document.getElementById('moment-list');
  if (!root) return null;

  const moments = [...(window.SITE_DATA?.moments || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  root.innerHTML = moments.length ? moments.map((moment, index) => `
    <article class="feature-card moment-card reveal" style="transition-delay:${Math.min(index * 0.05, 0.4)}s">
      <div class="moment-date">${escapeHtml(moment.date)} · ${escapeHtml(moment.mood || '记录')}</div>
      <h2 class="feature-card-title">${escapeHtml(moment.title)}</h2>
      <p class="moment-body">${escapeHtml(moment.content)}</p>
      <div class="feature-card-tags">
        ${(moment.tags || []).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
      </div>
    </article>
  `).join('') : '<div class="feature-card">暂时还没有瞬间。</div>';

  initReveal();
  return null;
});
