window.SiteApp.registerPage('home', () => {
  const stopTypewriter = typewriter(
    document.getElementById('typewriter'),
    ['吃谷爱好者', 'AI 爱好者', '编程爱好者', 'ACG 爱好者'],
    120
  );

  let rafId = 0;
  let timeoutIds = [];

  function queueTask(callback, delay = 0) {
    const id = window.setTimeout(() => {
      timeoutIds = timeoutIds.filter((item) => item !== id);
      callback();
    }, delay);
    timeoutIds.push(id);
  }

  function buildPostCard(post, index) {
    const el = document.createElement('a');
    el.className = 'post-card reveal';
    el.style.transitionDelay = `${index * 0.1}s`;
    el.href = `pages/post.html?id=${post.id}`;
    el.innerHTML = `
      <div class="post-card-img">
        ${post.cover
          ? `<div class="img-bg" style="background-image:url('${post.cover.replace('../', '')}')"></div><img src="${post.cover.replace('../', '')}" alt="${post.title}" loading="lazy" decoding="async">`
          : post.emoji}
      </div>
      <div class="post-card-body">
        <div class="post-meta">
          <span class="post-cat" style="color:${post.catColor}">${post.cat}</span>
          <span>${post.date}</span>
        </div>
        <div class="post-card-title">${post.title}</div>
        <p class="post-card-excerpt">${post.excerpt}</p>
      </div>
      <div class="post-card-footer">
        <span>阅读 · ${post.readTime} min</span>
        <span class="post-read-more">继续阅读 →</span>
      </div>
    `;
    return el;
  }

  function buildProjectCard(project) {
    const el = document.createElement('div');
    el.className = 'bm-card reveal';
    el.innerHTML = `
      <div class="bm-cover">
        ${project.img
          ? `<div class="img-bg" style="position:absolute;inset:-4px;background:url('${project.img.replace('../', '')}') center/cover;filter:blur(10px) brightness(0.5);transform:scale(1.05)"></div><img src="${project.img.replace('../', '')}" alt="${project.title}" loading="lazy" decoding="async" style="position:relative;z-index:1;max-width:100%;max-height:100%;width:auto;height:100%;object-fit:contain;display:block">`
          : project.emoji}
      </div>
      <div class="bm-info">
        <div class="bm-title">${project.title}</div>
        <div class="bm-bar"><div class="bm-fill" style="width:100%"></div></div>
        <div class="bm-ep">${project.cat} · ${project.date}</div>
      </div>
    `;
    return el;
  }

  function renderHomeCards() {
    rafId = 0;

    const postsContainer = document.getElementById('home-posts');
    if (postsContainer) {
      postsContainer.innerHTML = '';
      const fragment = document.createDocumentFragment();
      POSTS.slice(0, 3).forEach((post, index) => {
        fragment.appendChild(buildPostCard(post, index));
      });
      postsContainer.appendChild(fragment);
      initReveal();
    }

    queueTask(() => {
      const projectContainer = document.getElementById('home-projects');
      if (!projectContainer) return;
      projectContainer.innerHTML = '';
      const fragment = document.createDocumentFragment();
      PROJECTS.slice(0, 4).forEach((project) => {
        fragment.appendChild(buildProjectCard(project));
      });
      projectContainer.appendChild(fragment);
      initReveal();
    }, 120);
  }

  rafId = window.requestAnimationFrame(() => {
    queueTask(renderHomeCards, 16);
  });

  return () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    timeoutIds.forEach((id) => window.clearTimeout(id));
    timeoutIds = [];
    if (typeof stopTypewriter === 'function') {
      stopTypewriter();
    }
  };
});
