window.SiteApp.registerPage('links', () => {
  const friendLinksContainer = document.getElementById('friend-links-list');
  const contactList = document.getElementById('contact-list');
  const contactActions = document.getElementById('contact-actions');
  const pageSize = 4;
  let currentPage = 1;
  const contacts = [
    { label: '主邮箱', user: '2442616509', domain: 'qq.com', primary: true },
    { label: '备用邮箱', user: 'A5075073344', domain: '163.com' },
    { label: '备用邮箱', user: 'skyberggrenzmb3391', domain: 'gmail.com' },
  ];

  function emailOf(contact) {
    return `${contact.user}@${contact.domain}`;
  }

  function qqMailUrl(email) {
    return `https://mail.qq.com/cgi-bin/qm_share?t=qm_mailme&email=${encodeURIComponent(email)}`;
  }

  function gmailUrl(email, subject = '友链交换 / 站点留言', body = '') {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function neteaseMailUrl() {
    return 'https://mail.163.com/';
  }

  function webMailUrl(email, subject = '友链交换 / 站点留言', body = '') {
    if (email.toLowerCase().endsWith('@163.com')) return neteaseMailUrl();
    return email.toLowerCase().endsWith('@gmail.com') ? gmailUrl(email, subject, body) : qqMailUrl(email);
  }

  function renderPagination(total) {
    if (!friendLinksContainer) return;
    let pager = document.getElementById('friend-links-pagination');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'friend-links-pagination';
      pager.className = 'pagination';
      friendLinksContainer.after(pager);
    }
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    if (totalPages <= 1) {
      pager.innerHTML = '';
      return;
    }
    pager.innerHTML = `
      <button class="page-btn" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
      ${Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `<button class="page-btn${page === currentPage ? ' active' : ''}" type="button" data-page="${page}">${page}</button>`;
      }).join('')}
      <button class="page-btn" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;
  }

  function renderFriendLinks() {
    const friendLinks = window.SITE_DATA?.friendLinks || [];
    if (!friendLinksContainer) return;
    if (friendLinks.length === 0) {
      friendLinksContainer.innerHTML = '<div class="friend-link-empty">暂时还没有友链。</div>';
      renderPagination(0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(friendLinks.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const pageItems = friendLinks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    friendLinksContainer.innerHTML = pageItems.map((item, index) => {
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
    renderPagination(friendLinks.length);
    initReveal();
  }

  function renderContacts() {
    if (contactList) {
      contactList.innerHTML = contacts.map((contact) => {
        const email = emailOf(contact);
        return `<a href="${escapeHtml(webMailUrl(email))}" target="_blank" rel="noreferrer noopener">${escapeHtml(contact.label)}：${escapeHtml(email)}</a>`;
      }).join('');
    }
    if (contactActions) {
      const primary = emailOf(contacts[0]);
      const gmail = emailOf(contacts[2]);
      contactActions.innerHTML = `
        <a class="btn btn-primary" href="${escapeHtml(qqMailUrl(primary))}" target="_blank" rel="noreferrer noopener">QQ 邮箱网页版</a>
        <a class="btn btn-ghost" href="${escapeHtml(neteaseMailUrl())}" target="_blank" rel="noreferrer noopener">163 邮箱</a>
        <a class="btn btn-ghost" href="${escapeHtml(gmailUrl(gmail))}" target="_blank" rel="noreferrer noopener">Gmail 编写</a>
        <a class="btn btn-ghost" href="https://github.com/youzenghe/youzenghe.github.io/issues" target="_blank" rel="noreferrer noopener">GitHub 留言</a>
      `;
    }
  }

  renderFriendLinks();
  renderContacts();

  const onPaginationClick = (event) => {
    const btn = event.target.closest('#friend-links-pagination .page-btn');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 1;
    renderFriendLinks();
    friendLinksContainer?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  document.addEventListener('click', onPaginationClick);

  return () => {
    document.removeEventListener('click', onPaginationClick);
  };
});
