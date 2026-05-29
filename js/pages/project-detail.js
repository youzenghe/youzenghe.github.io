window.SiteApp.registerPage('project-detail', () => {
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('id'), 10) || 1;
  const project = PROJECTS.find((item) => item.id === id) || PROJECTS[0];
  if (!project) return null;

  function imageSrc(image) {
    return typeof image === 'string' ? image : image?.src || image?.image || '';
  }

  function imageAlt(image, fallback) {
    return typeof image === 'string' ? fallback : image?.alt || fallback;
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  document.title = `${project.title} · 项目复盘`;

  const head = document.getElementById('project-detail-head');
  if (head) {
    head.innerHTML = `
      <div class="section-label">${project.cat}</div>
      <h1 class="project-detail-title">${project.title}</h1>
      <p class="project-detail-desc">${project.desc}</p>
      <div class="project-detail-meta">
        ${project.status ? `<span class="tag">${project.status}</span>` : ''}
        ${project.tech.map((tech) => `<span class="tag">${tech}</span>`).join('')}
      </div>
    `;
  }

  const cover = document.getElementById('project-detail-cover');
  if (cover) {
    cover.innerHTML = project.img
      ? `<img src="${resolveAssetUrl(project.img)}" alt="${project.title}" decoding="async" fetchpriority="high">`
      : `<div style="padding:4rem;text-align:center;font-size:4rem">${project.emoji || '🧩'}</div>`;
  }

  const body = document.getElementById('project-detail-body');
  if (body) {
    const gallery = Array.isArray(project.images) && project.images.length
      ? `<div class="project-gallery">${project.images.map((image) => {
          const src = imageSrc(image);
          const caption = typeof image === 'object' && image?.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : '';
          return `<figure><img src="${escapeHtml(resolveThumbnailUrl(src))}" data-full-src="${escapeHtml(resolveAssetUrl(src))}" alt="${escapeHtml(imageAlt(image, `${project.title} 截图`))}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc">${caption}</figure>`;
        }).join('')}</div>`
      : '';
    const role = project.role ? `<h2>我的职责</h2><p>${project.role}</p>` : '';
    const highlights = Array.isArray(project.highlights) && project.highlights.length
      ? `<h2>技术亮点</h2><ul>${project.highlights.map((item) => `<li>${item}</li>`).join('')}</ul>`
      : '';
    const challenges = Array.isArray(project.challenges) && project.challenges.length
      ? `<h2>踩坑与难点</h2><ul>${project.challenges.map((item) => `<li>${item}</li>`).join('')}</ul>`
      : '';
    const result = project.result ? `<h2>结果复盘</h2><p>${project.result}</p>` : '';
    body.innerHTML = `
      ${project.detail || `<p>${project.desc}</p><h2>复盘重点</h2><p>这里可以继续补充背景、技术选型、遇到的问题和最终结果。</p>`}
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
      ? `<div class="project-links">${project.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(link.label || link.type || '项目链接')}</a>`).join('')}</div>`
      : '';
    side.innerHTML = `
      <p><span class="tag">${project.awardText}</span></p>
      ${project.status ? `<p style="margin-top:0.8rem"><span class="tag">${project.status}</span></p>` : ''}
      <p style="margin-top:0.8rem;color:var(--text-muted);line-height:1.8">时间：${project.date}</p>
      <p style="color:var(--text-muted);line-height:1.8">分类：${project.cat}</p>
      ${links}
      <p style="margin-top:1rem"><a class="btn btn-ghost" href="projects.html">返回项目列表</a></p>
    `;
  }

  initReveal();
  return null;
});
