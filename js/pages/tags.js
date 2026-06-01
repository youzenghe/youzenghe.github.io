window.SiteApp.registerPage('tags', () => {
  const cloud = document.getElementById('tag-cloud');
  if (!cloud) return null;

  const counts = new Map();
  POSTS.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'));
  cloud.innerHTML = tags.length ? tags.map(([tag, count], index) => `
    <a class="tag-cloud-item reveal" style="transition-delay:${Math.min(index * 0.03, 0.35)}s" href="posts.html?tag=${encodeURIComponent(tag)}">
      <span>#${escapeHtml(tag)}</span><strong>${count}</strong>
    </a>
  `).join('') : '<div class="feature-card">暂时还没有标签。</div>';

  initReveal();
  return null;
});
