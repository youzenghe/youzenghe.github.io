window.SiteApp.registerPage('archive', () => {
  const list = document.getElementById('archive-list');
  const stats = document.getElementById('archive-stats');
  if (!list) return null;

  const posts = [...POSTS].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const byYear = posts.reduce((map, post) => {
    const year = String(post.date || '').slice(0, 4) || '未知';
    map.set(year, [...(map.get(year) || []), post]);
    return map;
  }, new Map());

  list.innerHTML = [...byYear.entries()].map(([year, items]) => `
    <section class="archive-year reveal">
      <h2 class="archive-year-title">${escapeHtml(year)}</h2>
      <div class="archive-list">
        ${items.map((post) => `
          <a class="archive-row" href="post.html?id=${post.id}">
            <span class="archive-date">${escapeHtml(String(post.date).slice(5))}</span>
            <span class="archive-title">${escapeHtml(post.title)}</span>
            <span class="archive-cat">${escapeHtml(post.cat)}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `).join('');

  if (stats) {
    const tags = new Set(posts.flatMap((post) => post.tags || []));
    const categories = new Set(posts.map((post) => post.cat).filter(Boolean));
    const totalMinutes = posts.reduce((sum, post) => sum + Number(post.readTime || 0), 0);
    stats.innerHTML = `
      <div class="mini-stat"><strong>${posts.length}</strong><span>文章</span></div>
      <div class="mini-stat"><strong>${categories.size}</strong><span>分类</span></div>
      <div class="mini-stat"><strong>${tags.size}</strong><span>标签</span></div>
      <div class="mini-stat"><strong>${totalMinutes}</strong><span>分钟</span></div>
    `;
  }

  initReveal();
  return null;
});
