window.SiteApp.registerPage('archive', () => {
  const list = document.getElementById('archive-list');
  const stats = document.getElementById('archive-stats');
  if (!list) return null;

  const posts = POSTS.map((post) => ({
    ...post,
    archiveType: '文章',
    archiveHref: `post.html?id=${post.id}`,
    archiveCat: post.cat,
  }));
  const learningPlans = LEARNING_PLANS.map((plan) => ({
    ...plan,
    archiveType: '学习计划',
    archiveHref: `learning.html?id=${plan.id}`,
    archiveCat: `学习计划 · ${plan.cat}`,
  }));
  const items = [...posts, ...learningPlans].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const byYear = items.reduce((map, item) => {
    const year = String(item.date || '').slice(0, 4) || '未知';
    map.set(year, [...(map.get(year) || []), item]);
    return map;
  }, new Map());

  list.innerHTML = [...byYear.entries()].map(([year, items]) => `
    <section class="archive-year reveal">
      <h2 class="archive-year-title">${escapeHtml(year)}</h2>
      <div class="archive-list">
        ${items.map((item) => `
          <a class="archive-row" href="${escapeHtml(item.archiveHref)}">
            <span class="archive-date">${escapeHtml(String(item.date).slice(5))}</span>
            <span class="archive-title">${escapeHtml(item.title)}</span>
            <span class="archive-cat">${escapeHtml(item.archiveCat)}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `).join('');

  if (stats) {
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

  initReveal();
  return null;
});
