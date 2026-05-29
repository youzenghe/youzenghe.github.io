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
      `<button class="tab-btn${cat === active ? ' active' : ''}" data-cat="${cat}">${cat}</button>`
    ).join('');

    el.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
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

  function renderProjectGrid(cat) {
    currentProjectList = cat === '全部' ? [...PROJECTS] : PROJECTS.filter((project) => project.cat === cat);
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!currentProjectList.length) {
      grid.innerHTML = '<div class="no-results" style="grid-column:1/-1"><span>🔍</span>该分类暂时没有项目</div>';
      return;
    }

    currentProjectList.forEach((project, index) => {
      const eagerImage = index < 2;
      const projectImage = resolveAssetUrl(project.img);
      const projectThumb = resolveThumbnailUrl(project.img);
      const card = document.createElement('div');
      card.className = 'proj-card reveal';
      card.style.transitionDelay = `${index * 0.07}s`;
      card.innerHTML = `
        <div class="proj-preview" data-idx="${index}">
          ${project.img
            ? `<img src="${projectThumb}" data-full-src="${projectImage}" alt="${project.title}" loading="${eagerImage ? 'eager' : 'lazy'}" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc"${index === 0 ? ' fetchpriority="high"' : ''} />`
            : `<div class="proj-preview-placeholder"><span class="p-emoji">${project.emoji}</span><span class="p-hint">暂无预览图</span></div>`}
        </div>
        <div class="proj-body">
          <div class="proj-header">
            <div class="proj-title">${project.title}</div>
            <span class="proj-award ${awardClassMap[project.award]}">${project.awardText}</span>
          </div>
          <p class="proj-desc">${project.desc}</p>
          <div class="proj-meta-row">
            <span class="proj-cat">${project.cat}</span>
            ${project.status ? `<span class="proj-tech-tag">${project.status}</span>` : ''}
            ${project.tech.map((tech) => `<span class="proj-tech-tag">${tech}</span>`).join('')}
          </div>
        </div>
        <div class="proj-footer"><span class="proj-date">📅 ${project.date}</span><a class="proj-detail-link" href="project.html?id=${project.id}">查看复盘 →</a></div>
      `;
      card.querySelector('.proj-preview')?.addEventListener('click', () => openProjectLightbox(index));
      grid.appendChild(card);
    });

    initReveal();
  }

  function renderProjectLightbox() {
    const project = currentProjectList[projectLightboxIndex];
    if (!project) return;

    document.getElementById('lb-img-box').innerHTML = project.img
      ? `<img src="${resolveAssetUrl(project.img)}" alt="${project.title}" decoding="async" />`
      : `<div class="lb-placeholder"><span class="lbp-emoji">${project.emoji}</span><span class="lbp-name">${project.title}</span><span class="lbp-hint">暂时没有上传预览图</span></div>`;

    document.getElementById('lb-info').innerHTML = `
      <div class="lb-info-left">
        <h3>${project.title} <span class="proj-award ${awardClassMap[project.award]}" style="font-size:0.7rem;vertical-align:middle">${project.awardText}</span></h3>
        <p>${project.desc}</p>
      </div>
    `;
  }

  function openProjectLightbox(index) {
    previousActiveElement = document.activeElement;
    projectLightboxIndex = index;
    renderProjectLightbox();
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.getElementById('lb-close')?.focus();
  }

  function closeProjectLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
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
  document.addEventListener('keydown', onKeyDown);

  renderProjectStats();
  renderProjectTabs('全部');
  renderProjectGrid('全部');
  updateStructuredData();

  return () => {
    closeProjectLightbox();
    document.removeEventListener('keydown', onKeyDown);
  };
});
