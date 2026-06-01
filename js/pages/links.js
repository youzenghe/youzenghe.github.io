window.SiteApp.registerPage('links', () => {
  const friendLinksContainer = document.getElementById('friend-links-list');
  const commentsHost = document.getElementById('friend-comments');

  function renderFriendLinks() {
    const friendLinks = window.SITE_DATA?.friendLinks || [];
    if (!friendLinksContainer) return;
    if (friendLinks.length === 0) {
      friendLinksContainer.innerHTML = '<div class="friend-link-empty">暂时还没有友链。</div>';
      return;
    }

    friendLinksContainer.innerHTML = friendLinks.map((item, index) => {
      const name = escapeHtml(item.name);
      const avatar = item.avatar ? `<img src="${escapeHtml(resolveAssetUrl(item.avatar))}" alt="${name} 头像" loading="lazy" decoding="async">` : name.slice(0, 1);
      return `
        <a class="friend-link-card reveal" style="transition-delay:${Math.min(index * 0.05, 0.3)}s" href="${escapeHtml(safeExternalUrl(item.url))}" target="_blank" rel="noreferrer noopener">
          <span class="friend-link-avatar">${avatar}</span>
          <span class="friend-link-main">
            <span class="friend-link-name">${name}</span>
            <span class="friend-link-url">${escapeHtml(item.displayUrl || String(item.url || '').replace(/^https?:\/\//, ''))}</span>
            ${item.description ? `<span class="friend-link-desc">${escapeHtml(item.description)}</span>` : ''}
          </span>
          <span class="friend-link-badge">${escapeHtml(item.badge || 'Friend Link')}</span>
        </a>
      `;
    }).join('');
  }

  function mountComments() {
    if (!commentsHost || commentsHost.dataset.mounted === 'true') return;
    commentsHost.dataset.mounted = 'true';
    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('repo', 'youzenghe/youzenghe.github.io');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('label', '留言');
    script.setAttribute('theme', 'github-dark');
    commentsHost.appendChild(script);
  }

  renderFriendLinks();
  mountComments();
  initReveal();
  return null;
});
