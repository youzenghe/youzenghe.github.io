window.SiteApp.registerPage('links', () => {
  const friendLinksContainer = document.getElementById('friend-links-list');
  const contactList = document.getElementById('contact-list');
  const contactActions = document.getElementById('contact-actions');
  const form = document.getElementById('friend-message-form');
  const copyButton = document.getElementById('copy-message');
  const formNote = document.getElementById('message-form-note');
  const contacts = [
    { label: '主邮箱', user: '2442616509', domain: 'qq.com', primary: true },
    { label: '备用邮箱', user: 'A507507334', domain: 'qq.com' },
    { label: '备用邮箱', user: 'skyberggrenzmb3391', domain: 'gmail.com' },
  ];

  function emailOf(contact) {
    return `${contact.user}@${contact.domain}`;
  }

  function mailtoUrl(email, subject = '友链交换 / 站点留言', body = '') {
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

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

  function renderContacts() {
    if (contactList) {
      contactList.innerHTML = contacts.map((contact) => {
        const email = emailOf(contact);
        return `<a href="${escapeHtml(mailtoUrl(email))}">${escapeHtml(contact.label)}：${escapeHtml(email)}</a>`;
      }).join('');
    }
    if (contactActions) {
      const primary = emailOf(contacts[0]);
      contactActions.innerHTML = `
        <a class="btn btn-primary" href="${escapeHtml(mailtoUrl(primary))}">邮箱联系</a>
        <a class="btn btn-ghost" href="https://mail.qq.com/cgi-bin/qm_share?t=qm_mailme&email=${encodeURIComponent(primary)}" target="_blank" rel="noreferrer noopener">QQ 邮箱网页版</a>
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

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    location.href = mailtoUrl(emailOf(contacts[0]), '友链交换 / 站点留言', messageText());
    setNote('已经打开邮箱发送窗口。如果浏览器没有配置邮箱应用，可以复制内容后手动发送。');
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
  return null;
});
