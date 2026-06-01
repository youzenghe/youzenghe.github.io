window.SiteApp.registerPage('categories', () => {
  const root = document.getElementById('category-list');
  if (!root) return null;

  const byCategory = POSTS.reduce((map, post) => {
    const key = post.cat || '未分类';
    map.set(key, [...(map.get(key) || []), post]);
    return map;
  }, new Map());

  root.innerHTML = [...byCategory.entries()].map(([cat, posts]) => `
    <section class="category-section reveal">
      <div class="category-head">
        <h2 class="category-title">${escapeHtml(cat)}</h2>
        <span class="category-count">${posts.length} 篇</span>
      </div>
      <div class="archive-list">
        ${posts.map((post) => `
          <a class="archive-row" href="post.html?id=${post.id}">
            <span class="archive-date">${escapeHtml(String(post.date).slice(5))}</span>
            <span class="archive-title">${escapeHtml(post.title)}</span>
            <span class="archive-cat">${escapeHtml((post.tags || []).slice(0, 2).join(' · '))}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `).join('');

  initReveal();
  return null;
});
