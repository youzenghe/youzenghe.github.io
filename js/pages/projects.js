window.SiteApp.registerPage('projects', () => {
  const absoluteBase = 'https://yzh1019.top';
  const awardClassMap = {
    gold: 'award-gold',
    silver: 'award-silver',
    bronze: 'award-bronze',
    none: 'award-none',
  };
  const allCategories = ['全部', ...new Set(PROJECTS.map((project) => project.cat))];
  let currentProjectList = [];
  let projectLightboxIndex = 0;
  let previousActiveElement = null;
  let currentCategory = '全部';
  let currentPage = 1;
  const pageSize = 5;

  function toAbsoluteAssetUrl(path) {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    return `${absoluteBase}/${path.replace(/^\.\.\//, '').replace(/^\//, '')}`;
  }

  function updateStructuredData() {
    const script = document.getElementById('projects-structured-data');
    if (!script) return;

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      url: `${absoluteBase}/pages/projects.html`,
      name: '项目列表 · 次元日记',
      description: '查看个人项目、参赛经历、技术栈和复盘记录。',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: PROJECTS.map((project, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'CreativeWork',
            name: project.title,
            description: project.desc,
            image: toAbsoluteAssetUrl(project.img),
          },
        })),
      },
    });
  }

  function renderProjectTabs(active) {
    const el = document.getElementById('tabs-el');
    if (!el) return;

    el.innerHTML = allCategories.map((cat) =>
      `<button class="tab-btn${cat === active ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    ).join('');

    el.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        currentPage = 1;
        renderProjectGrid(btn.dataset.cat);
      });
    });
  }

  function renderProjectStats() {
    const total = PROJECTS.length;
    const awards = PROJECTS.filter((project) => project.award !== 'none').length;
    const cats = new Set(PROJECTS.map((project) => project.cat)).size;
    const gold = PROJECTS.filter((project) => project.award === 'gold').length;

    const statsEl = document.getElementById('stats-el');
    if (!statsEl) return;

    statsEl.innerHTML = `
      <div class="sum-item"><div class="sum-num">${total}</div><div class="sum-label">项目总数</div></div>
      <div class="sum-item"><div class="sum-num">${awards}</div><div class="sum-label">获奖项目</div></div>
      <div class="sum-item"><div class="sum-num">${gold}</div><div class="sum-label">一等奖</div></div>
      <div class="sum-item"><div class="sum-num">${cats}</div><div class="sum-label">涉及领域</div></div>
    `;
  }

  function renderProjectPagination(total) {
    let pager = document.getElementById('project-pagination');
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'project-pagination';
      pager.className = 'pagination';
      grid.after(pager);
    }
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
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

  function renderProjectGrid(cat) {
    currentCategory = cat;
    currentProjectList = cat === '全部' ? [...PROJECTS] : PROJECTS.filter((project) => project.cat === cat);
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!currentProjectList.length) {
      grid.innerHTML = '<div class="no-results" style="grid-column:1/-1"><span>🔍</span>该分类暂时没有项目</div>';
      renderProjectPagination(0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(currentProjectList.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = currentProjectList.slice(start, start + pageSize);

    pageItems.forEach((project, index) => {
      const absoluteIndex = start + index;
      const eagerImage = index < 2;
      const projectImage = escapeHtml(resolveAssetUrl(project.img));
      const projectThumb = escapeHtml(resolveAssetUrl(project.img));
      const projectTitle = escapeHtml(project.title);
      const awardClass = awardClassMap[project.award] || awardClassMap.none;
      const card = document.createElement('div');
      card.className = 'proj-card reveal';
      card.style.transitionDelay = `${index * 0.07}s`;
      card.innerHTML = `
        <div class="proj-preview" data-idx="${absoluteIndex}" role="button" tabindex="0" aria-label="放大查看 ${projectTitle}">
          ${project.img
            ? `<img src="${projectThumb}" data-full-src="${projectImage}" alt="${projectTitle}" loading="${eagerImage ? 'eager' : 'lazy'}" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc"${index === 0 ? ' fetchpriority="high"' : ''} />`
            : `<div class="proj-preview-placeholder"><span class="p-emoji">${escapeHtml(project.emoji)}</span><span class="p-hint">暂无预览图</span></div>`}
        </div>
        <div class="proj-body">
          <div class="proj-header">
            <div class="proj-title">${projectTitle}</div>
            <span class="proj-award ${awardClass}">${escapeHtml(project.awardText)}</span>
          </div>
          <p class="proj-desc">${escapeHtml(project.desc)}</p>
          <div class="proj-meta-row">
            <span class="proj-cat">${escapeHtml(project.cat)}</span>
            ${project.status ? `<span class="proj-tech-tag">${escapeHtml(project.status)}</span>` : ''}
            ${project.tech.map((tech) => `<span class="proj-tech-tag">${escapeHtml(tech)}</span>`).join('')}
          </div>
        </div>
        <div class="proj-footer"><span class="proj-date">📅 ${escapeHtml(project.date)}</span><a class="proj-detail-link" href="project.html?id=${project.id}">查看复盘 →</a></div>
      `;
      const preview = card.querySelector('.proj-preview');
      preview?.addEventListener('click', () => openProjectLightbox(absoluteIndex));
      preview?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openProjectLightbox(absoluteIndex);
      });
      grid.appendChild(card);
    });
    renderProjectPagination(currentProjectList.length);

    initReveal();
  }

  function renderProjectLightbox() {
    const project = currentProjectList[projectLightboxIndex];
    if (!project) return;

    document.getElementById('lb-img-box').innerHTML = project.img
      ? `<img src="${escapeHtml(resolveAssetUrl(project.img))}" alt="${escapeHtml(project.title)}" decoding="async" />`
      : `<div class="lb-placeholder"><span class="lbp-emoji">${escapeHtml(project.emoji)}</span><span class="lbp-name">${escapeHtml(project.title)}</span><span class="lbp-hint">暂时没有上传预览图</span></div>`;

    document.getElementById('lb-info').innerHTML = `
      <div class="lb-info-left">
        <h3>${escapeHtml(project.title)} <span class="proj-award ${awardClassMap[project.award] || awardClassMap.none}" style="font-size:0.7rem;vertical-align:middle">${escapeHtml(project.awardText)}</span></h3>
        <p>${escapeHtml(project.desc)}</p>
      </div>
    `;
  }

  function openProjectLightbox(index) {
    previousActiveElement = document.activeElement;
    projectLightboxIndex = index;
    renderProjectLightbox();
    const lightbox = document.getElementById('lightbox');
    if (lightbox.classList.contains('open')) return;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    window.SiteApp?.lockBodyScroll?.();
    document.getElementById('lb-close')?.focus();
  }

  function closeProjectLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    window.SiteApp?.unlockBodyScroll?.();
    previousActiveElement?.focus?.();
  }

  function onKeyDown(event) {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (event.key === 'Escape') closeProjectLightbox();
    if (event.key === 'ArrowLeft') {
      projectLightboxIndex = (projectLightboxIndex - 1 + currentProjectList.length) % currentProjectList.length;
      renderProjectLightbox();
    }
    if (event.key === 'ArrowRight') {
      projectLightboxIndex = (projectLightboxIndex + 1) % currentProjectList.length;
      renderProjectLightbox();
    }
  }

  document.getElementById('lb-close')?.addEventListener('click', closeProjectLightbox);
  document.getElementById('lightbox')?.addEventListener('click', (event) => {
    if (event.target.id === 'lightbox') {
      closeProjectLightbox();
    }
  });
  document.getElementById('lb-prev')?.addEventListener('click', () => {
    projectLightboxIndex = (projectLightboxIndex - 1 + currentProjectList.length) % currentProjectList.length;
    renderProjectLightbox();
  });
  document.getElementById('lb-next')?.addEventListener('click', () => {
    projectLightboxIndex = (projectLightboxIndex + 1) % currentProjectList.length;
    renderProjectLightbox();
  });
  const onPaginationClick = (event) => {
    const btn = event.target.closest('#project-pagination .page-btn');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 1;
    renderProjectGrid(currentCategory);
    document.getElementById('project-grid')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  document.addEventListener('click', onPaginationClick);
  document.addEventListener('keydown', onKeyDown);

  renderProjectStats();
  renderProjectTabs('全部');
  renderProjectGrid('全部');
  updateStructuredData();

  return () => {
    closeProjectLightbox();
    document.removeEventListener('click', onPaginationClick);
    document.removeEventListener('keydown', onKeyDown);
  };
});
