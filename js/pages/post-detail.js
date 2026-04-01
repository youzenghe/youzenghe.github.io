window.SiteApp.registerPage('post-detail', () => {
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('id'), 10) || 1;
  const post = POSTS.find((item) => item.id === id) || POSTS[0];
  const postIndex = POSTS.indexOf(post);

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute(attr, value);
    }
  }

  document.title = `${post.title} · 次元日记`;
  setMeta('meta[name="description"]', 'content', post.excerpt);
  setMeta('meta[property="og:title"]', 'content', `${post.title} · 次元日记`);
  setMeta('meta[property="og:description"]', 'content', post.excerpt);
  setMeta('meta[property="og:image"]', 'content', post.cover || '../assets/avatar.png');
  setMeta('meta[name="twitter:title"]', 'content', `${post.title} · 次元日记`);
  setMeta('meta[name="twitter:description"]', 'content', post.excerpt);
  setMeta('meta[name="twitter:image"]', 'content', post.cover || '../assets/avatar.png');

  const header = document.getElementById('post-header');
  if (header) {
    header.innerHTML = `
      <span class="post-header-cat" style="color:${post.catColor}">${post.cat}</span>
      <h1>${post.title}</h1>
      <div class="post-header-meta">
        <span>📅 ${post.date}</span>
        <span>⏱ ${post.readTime} 分钟阅读</span>
        <span>🏷 ${post.tags.join(' · ')}</span>
      </div>
    `;
  }

  const cover = document.getElementById('post-cover');
  if (cover) {
    cover.innerHTML = post.cover
      ? `<div class="img-bg" style="background-image:url('${post.cover}')"></div><img src="${post.cover}" alt="文章封面" loading="eager" decoding="async" fetchpriority="high" />`
      : post.emoji;
  }

  const body = document.getElementById('post-body');
  if (body) {
    body.innerHTML = post.content;
  }

  const tags = document.getElementById('post-tags');
  if (tags) {
    tags.innerHTML = post.tags.map((tag) => `<span class="post-tag">#${tag}</span>`).join('');
  }

  const toc = document.getElementById('toc');
  if (toc) {
    toc.innerHTML = '';
    document.querySelectorAll('.post-body h2').forEach((heading, index) => {
      heading.id = `heading-${index}`;
      toc.innerHTML += `<li><a href="#heading-${index}">${heading.textContent}</a></li>`;
    });
  }

  const related = POSTS.filter((item) => item.id !== id && item.cat === post.cat).slice(0, 3);
  const relatedEl = document.getElementById('related');
  if (relatedEl) {
    relatedEl.innerHTML = '';
    (related.length ? related : POSTS.filter((item) => item.id !== id).slice(0, 3)).forEach((item) => {
      relatedEl.innerHTML += `<a class="related-item" href="post.html?id=${item.id}"><span class="related-emoji">${item.emoji}</span>${item.title}</a>`;
    });
  }

  const prev = POSTS[postIndex - 1];
  const next = POSTS[postIndex + 1];
  const prevNext = document.getElementById('prev-next');
  if (prevNext) {
    prevNext.innerHTML = `
      ${prev ? `<a class="pn-card" href="post.html?id=${prev.id}"><div class="pn-label">← 上一篇</div><div class="pn-title">${prev.title}</div></a>` : '<div></div>'}
      ${next ? `<a class="pn-card next" href="post.html?id=${next.id}"><div class="pn-label">下一篇 →</div><div class="pn-title">${next.title}</div></a>` : '<div></div>'}
    `;
  }

  initReveal();
});
