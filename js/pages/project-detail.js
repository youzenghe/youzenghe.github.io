window.SiteApp.registerPage('project-detail', () => {
  const absoluteBase = 'https://yzh1019.top';
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('id'), 10);
  const project = PROJECTS.find((item) => item.id === id);

  function imageSrc(image) {
    return typeof image === 'string' ? image : image?.src || image?.image || '';
  }

  function imageAlt(image, fallback) {
    return typeof image === 'string' ? fallback : image?.alt || fallback;
  }

  function imageIsAnimated(image) {
    return typeof image === 'object' && Boolean(image?.animated);
  }

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute(attr, value);
    }
  }

  function toAbsoluteAssetUrl(path) {
    if (!path) return `${absoluteBase}/assets/avatar.webp`;
    if (/^https?:\/\//i.test(path)) return path;
    return `${absoluteBase}/${path.replace(/^\.\.\//, '').replace(/^\//, '')}`;
  }

  function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html || '';
    return temp.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  function originalProjectFigure(project) {
    if (!project.originalImg || project.originalImg === project.img) return '';
    const src = resolveAssetUrl(project.originalImg);
    return `
      <figure class="md-image original-project-image">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(`${project.title} 原始封面`)}" loading="eager" decoding="async">
      </figure>
    `;
  }

  function renderMissingProject() {
    document.title = '项目未找到 · 次元日记';
    setMeta('meta[name="description"]', 'content', '这个项目不存在或已经被移除。');
    setMeta('meta[property="og:title"]', 'content', '项目未找到 · 次元日记');
    setMeta('meta[property="og:description"]', 'content', '这个项目不存在或已经被移除。');
    setMeta('meta[name="twitter:title"]', 'content', '项目未找到 · 次元日记');
    setMeta('meta[name="twitter:description"]', 'content', '这个项目不存在或已经被移除。');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = `${absoluteBase}/pages/projects.html`;
    }
    document.getElementById('project-structured-data')?.remove();

    const head = document.getElementById('project-detail-head');
    if (head) {
      head.innerHTML = `
        <div class="section-label">404</div>
        <h1 class="project-detail-title">项目未找到</h1>
        <p class="project-detail-desc">这个项目不存在或已经被移除。</p>
      `;
    }
    document.getElementById('project-detail-cover')?.remove();
    const body = document.getElementById('project-detail-body');
    if (body) {
      body.innerHTML = '<p>可以返回项目列表，继续查看其他项目复盘。</p>';
    }
    const side = document.getElementById('project-detail-side');
    if (side) {
      side.innerHTML = '<p><a class="btn btn-ghost" href="projects.html">返回项目列表</a></p>';
    }
    initReveal();
    return null;
  }

  if (!project) {
    return renderMissingProject();
  }

  const seoTitle = `${project.title} · 项目复盘`;
  const seoDescription = project.desc || '查看项目背景、技术栈、截图和复盘记录。';
  const seoImage = project.img;
  const canonicalUrl = `${absoluteBase}/pages/project.html?id=${project.id}`;

  document.title = seoTitle;
  setMeta('meta[name="description"]', 'content', seoDescription);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[property="og:title"]', 'content', seoTitle);
  setMeta('meta[property="og:description"]', 'content', seoDescription);
  setMeta('meta[property="og:image"]', 'content', toAbsoluteAssetUrl(seoImage));
  setMeta('meta[property="og:image:alt"]', 'content', `${project.title} 的项目封面`);
  setMeta('meta[name="twitter:title"]', 'content', seoTitle);
  setMeta('meta[name="twitter:description"]', 'content', seoDescription);
  setMeta('meta[name="twitter:image"]', 'content', toAbsoluteAssetUrl(seoImage));
  setMeta('meta[name="twitter:image:alt"]', 'content', `${project.title} 的项目封面`);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = canonicalUrl;
  }
  const structuredData = document.getElementById('project-structured-data');
  if (structuredData) {
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: project.title,
      description: seoDescription,
      image: toAbsoluteAssetUrl(seoImage),
      url: canonicalUrl,
      keywords: project.tech.join(', '),
      dateCreated: project.date,
      genre: project.cat,
      award: project.awardText,
      text: stripHtml(project.detail || project.desc),
      author: {
        '@type': 'Person',
        name: '次元日记',
        url: `${absoluteBase}/pages/about.html`,
      },
    });
  }

  const head = document.getElementById('project-detail-head');
  if (head) {
    head.innerHTML = `
      <div class="section-label">${escapeHtml(project.cat)}</div>
      <h1 class="project-detail-title">${escapeHtml(project.title)}</h1>
      <p class="project-detail-desc">${escapeHtml(project.desc)}</p>
      <div class="project-detail-meta">
        ${project.status ? `<span class="tag">${escapeHtml(project.status)}</span>` : ''}
        ${project.tech.map((tech) => `<span class="tag">${escapeHtml(tech)}</span>`).join('')}
      </div>
    `;
  }

  const cover = document.getElementById('project-detail-cover');
  if (cover) {
    if (project.img) {
      const fullUrl = resolveAssetUrl(project.img);
      const thumbUrl = project.imgAnimated ? fullUrl : resolveThumbnailUrl(project.img);
      // 先用列表页已缓存的缩略图即时显示，再后台加载大图无缝替换。
      cover.innerHTML = `<img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(project.title)}" decoding="async">`;
      const coverImg = cover.querySelector('img');
      if (coverImg && fullUrl !== thumbUrl) {
        const fullImage = new Image();
        fullImage.onload = () => { coverImg.src = fullUrl; };
        fullImage.src = fullUrl;
      }
    } else {
      cover.innerHTML = `<div style="padding:4rem;text-align:center;font-size:4rem">${escapeHtml(project.emoji || '🧩')}</div>`;
    }
  }

  const body = document.getElementById('project-detail-body');
  if (body) {
    const gallery = Array.isArray(project.images) && project.images.length
      ? `<div class="project-gallery">${project.images.map((image) => {
          const src = imageSrc(image);
          const caption = typeof image === 'object' && image?.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : '';
          const animated = imageIsAnimated(image);
          const previewSrc = animated ? resolveAssetUrl(src) : resolveThumbnailUrl(src);
          const fullSrc = resolveAssetUrl(src);
          return `<figure><img src="${escapeHtml(previewSrc)}" data-full-src="${escapeHtml(fullSrc)}" alt="${escapeHtml(imageAlt(image, `${project.title} 截图`))}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc">${caption}</figure>`;
        }).join('')}</div>`
      : '';
    const role = project.role ? `<h2>我的职责</h2><p>${escapeHtml(project.role)}</p>` : '';
    const highlights = Array.isArray(project.highlights) && project.highlights.length
      ? `<h2>技术亮点</h2><ul>${project.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '';
    const challenges = Array.isArray(project.challenges) && project.challenges.length
      ? `<h2>踩坑与难点</h2><ul>${project.challenges.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '';
    const result = project.result ? `<h2>结果复盘</h2><p>${escapeHtml(project.result)}</p>` : '';
    body.innerHTML = `
      ${originalProjectFigure(project)}
      ${project.detail || `<p>${escapeHtml(project.desc)}</p>`}
      ${role}
      ${highlights}
      ${challenges}
      ${result}
      ${gallery}
    `;
  }

  const side = document.getElementById('project-detail-side');
  if (side) {
    const links = Array.isArray(project.links) && project.links.length
      ? `<div class="project-links">${project.links.map((link) => `<a href="${escapeHtml(safeExternalUrl(link.url))}" target="_blank" rel="noreferrer noopener">${escapeHtml(link.label || link.type || '项目链接')}</a>`).join('')}</div>`
      : '';
    side.innerHTML = `
      <p><span class="tag">${escapeHtml(project.awardText)}</span></p>
      ${project.status ? `<p style="margin-top:0.8rem"><span class="tag">${escapeHtml(project.status)}</span></p>` : ''}
      <p style="margin-top:0.8rem;color:var(--text-muted);line-height:1.8">时间：${escapeHtml(project.date)}</p>
      <p style="color:var(--text-muted);line-height:1.8">分类：${escapeHtml(project.cat)}</p>
      ${links}
      <p style="margin-top:1rem"><a class="btn btn-ghost" href="projects.html">返回项目列表</a></p>
    `;
  }

  initReveal();
  return null;
});
