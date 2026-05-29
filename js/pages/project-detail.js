window.SiteApp.registerPage('project-detail', () => {
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('id'), 10) || 1;
  const project = PROJECTS.find((item) => item.id === id) || PROJECTS[0];
  if (!project) return null;

  document.title = `${project.title} · 项目复盘`;

  const head = document.getElementById('project-detail-head');
  if (head) {
    head.innerHTML = `
      <div class="section-label">${project.cat}</div>
      <h1 class="project-detail-title">${project.title}</h1>
      <p class="project-detail-desc">${project.desc}</p>
      <div class="project-detail-meta">
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
      ? `<div class="project-gallery">${project.images.map((src) => `<img src="${resolveThumbnailUrl(src)}" data-full-src="${resolveAssetUrl(src)}" alt="${project.title} 截图" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc">`).join('')}</div>`
      : '';
    body.innerHTML = `
      ${project.detail || `<p>${project.desc}</p><h2>复盘重点</h2><p>这里可以继续补充背景、技术选型、遇到的问题和最终结果。</p>`}
      ${gallery}
    `;
  }

  const side = document.getElementById('project-detail-side');
  if (side) {
    side.innerHTML = `
      <p><span class="tag">${project.awardText}</span></p>
      <p style="margin-top:0.8rem;color:var(--text-muted);line-height:1.8">时间：${project.date}</p>
      <p style="color:var(--text-muted);line-height:1.8">分类：${project.cat}</p>
      <p style="margin-top:1rem"><a class="btn btn-ghost" href="projects.html">返回项目列表</a></p>
    `;
  }

  initReveal();
  return null;
});
