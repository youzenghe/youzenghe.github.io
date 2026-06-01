window.SiteApp.registerPage('about', () => {
  const skills = document.getElementById('skills-list');
  const friendLinksContainer = document.getElementById('friend-links-list');

  function renderFriendLinks() {
    const friendLinks = window.SITE_DATA?.friendLinks || [];
    if (!friendLinksContainer) return;
    if (friendLinks.length === 0) {
      friendLinksContainer.innerHTML = '<div class="friend-link-empty">暂时还没有友链。</div>';
      return;
    }
    friendLinksContainer.innerHTML = friendLinks.map((item) => {
      const name = escapeHtml(item.name);
      const avatar = item.avatar ? `<img src="${escapeHtml(resolveAssetUrl(item.avatar))}" alt="${name} 头像" loading="lazy" decoding="async">` : name.slice(0, 1);
      return `
      <a class="friend-link-card" href="${escapeHtml(safeExternalUrl(item.url))}" target="_blank" rel="noreferrer noopener">
        <span class="friend-link-avatar">${avatar}</span>
        <div class="friend-link-main">
          <div class="friend-link-name">${name}</div>
          <div class="friend-link-url">${escapeHtml(item.displayUrl || String(item.url || '').replace(/^https?:\/\//, ''))}</div>
          ${item.description ? `<div class="friend-link-url">${escapeHtml(item.description)}</div>` : ''}
        </div>
        <span class="friend-link-badge">${escapeHtml(item.badge || 'Friend Link')}</span>
      </a>
    `;
    }).join('');
  }

  renderFriendLinks();

  if (!skills) {
    initReveal();
    return null;
  }

  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.skill-fill').forEach((bar) => {
        bar.style.transform = `scaleX(${bar.dataset.width})`;
      });
      skillObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  skillObserver.observe(skills);
  initReveal();

  return () => {
    skillObserver.disconnect();
  };
});
