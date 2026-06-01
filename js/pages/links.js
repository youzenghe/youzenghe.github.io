window.SiteApp.registerPage('links', () => {
  const friendLinksContainer = document.getElementById('friend-links-list');
  const contactList = document.getElementById('contact-list');
  const contactActions = document.getElementById('contact-actions');
  const form = document.getElementById('friend-message-form');
  const copyButton = document.getElementById('copy-message');
  const formNote = document.getElementById('message-form-note');
  const pageSize = 3;
  let currentPage = 1;
  const contacts = [
    { label: '主邮箱', user: '2442616509', domain: 'qq.com', primary: true },
    { label: '备用邮箱', user: 'A507507334', domain: 'qq.com' },
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

  function webMailUrl(email, subject = '友链交换 / 站点留言', body = '') {
    return email.toLowerCase().endsWith('@gmail.com') ? gmailUrl(email, subject, body) : qqMailUrl(email);
  }

  function formSubmitEndpoint(email) {
    return `https://formsubmit.co/${email}`;
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
      contactActions.innerHTML = `
        <a class="btn btn-primary" href="${escapeHtml(qqMailUrl(primary))}" target="_blank" rel="noreferrer noopener">QQ 邮箱网页版</a>
        <a class="btn btn-ghost" href="${escapeHtml(gmailUrl(primary))}" target="_blank" rel="noreferrer noopener">Gmail 编写</a>
        <a class="btn btn-ghost" href="https://github.com/youzenghe/youzenghe.github.io/issues" target="_blank" rel="noreferrer noopener">GitHub 留言</a>
      `;
    }
  }

  function messageText() {
    const data = new FormData(form);
    return [
      `称呼：${String(data.get('name') || '').trim()}`,
      `联系方式：${String(data.get('contact') || '').trim()}`,
      '',
      '留言内容：',
      String(data.get('message') || '').trim(),
    ].join('\n');
  }

  function setNote(text) {
    if (formNote) formNote.textContent = text;
  }

  renderFriendLinks();
  renderContacts();

  if (form) {
    form.method = 'POST';
    form.action = formSubmitEndpoint(emailOf(contacts[0]));
    form.target = '_blank';
  }

  const onPaginationClick = (event) => {
    const btn = event.target.closest('#friend-links-pagination .page-btn');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 1;
    renderFriendLinks();
    friendLinksContainer?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  document.addEventListener('click', onPaginationClick);

  form?.addEventListener('submit', (event) => {
    if (!form.reportValidity()) return;
    const subject = form.querySelector('input[name="_subject"]');
    const cc = form.querySelector('input[name="_cc"]');
    if (subject) subject.value = '友链交换 / 站点留言';
    if (cc) cc.value = contacts.slice(1).map(emailOf).join(',');
    setNote('已经提交到静态表单服务。首次使用可能需要站长邮箱确认启用。');
  });

  copyButton?.addEventListener('click', async () => {
    if (!form?.reportValidity()) return;
    const text = messageText();
    try {
      await navigator.clipboard.writeText(text);
      setNote('留言内容已复制，可以粘贴到任意邮箱发送。');
    } catch (error) {
      setNote('浏览器不允许自动复制，可以手动选中文本后发送。');
    }
  });

  initReveal();
  return () => {
    document.removeEventListener('click', onPaginationClick);
  };
});
