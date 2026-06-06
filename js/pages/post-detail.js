window.SiteApp.registerPage('post-detail', () => {
  const absoluteBase = 'https://yzh1019.top';
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('id'), 10);
  const postIndex = POSTS.findIndex((item) => item.id === id);
  const postSummary = POSTS[postIndex];
  const postDetails = window.SITE_DATA?.postDetails?.[String(id)] || {};
  const post = postSummary ? { ...postSummary, ...postDetails } : null;

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

  function imageSrc(image) {
    return typeof image === 'string' ? image : image?.src || image?.image || '';
  }

  function imageAlt(image, fallback) {
    return typeof image === 'string' ? fallback : image?.alt || fallback;
  }

  function imageIsAnimated(image) {
    return typeof image === 'object' && Boolean(image?.animated);
  }

  function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent?.replace(/\s+/g, ' ').trim() || '';
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

  function originalCoverFigure(post) {
    if (!post.originalCover || post.originalCover === post.cover) return '';
    const src = resolveAssetUrl(post.originalCover);
    return `
      <figure class="md-image original-cover-image">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(`${post.title} 原始封面`)}" loading="eager" decoding="async">
      </figure>
    `;
  }

  function highlightCode(code) {
    const raw = code.textContent || '';
    const keywords = 'const|let|var|function|return|if|else|for|while|class|import|from|export|async|await|def|try|except|catch|finally|public|private|protected|void|new|throw|throws|static|final|extends|implements';
    const tokenRe = new RegExp('//[^\\n]*|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`|\\b(?:' + keywords + ')\\b', 'g');
    let highlighted = '';
    let cursor = 0;
    let match;

    while ((match = tokenRe.exec(raw)) !== null) {
      const token = match[0];
      highlighted += escapeHtml(raw.slice(cursor, match.index));
      if (token.startsWith('//')) {
        highlighted += `<span class="code-token-comment">${escapeHtml(token)}</span>`;
      } else if (/^["'`]/.test(token)) {
        highlighted += `<span class="code-token-string">${escapeHtml(token)}</span>`;
      } else {
        highlighted += `<span class="code-token-keyword">${escapeHtml(token)}</span>`;
      }
      cursor = match.index + token.length;
    }

    highlighted += escapeHtml(raw.slice(cursor));
    code.innerHTML = highlighted;
  }

  function renderMissingPost() {
    document.title = '文章未找到 · 次元日记';
    setMeta('meta[name="description"]', 'content', '这篇文章不存在或已经被移除。');
    setMeta('meta[property="og:title"]', 'content', '文章未找到 · 次元日记');
    setMeta('meta[property="og:description"]', 'content', '这篇文章不存在或已经被移除。');
    setMeta('meta[name="twitter:title"]', 'content', '文章未找到 · 次元日记');
    setMeta('meta[name="twitter:description"]', 'content', '这篇文章不存在或已经被移除。');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = `${absoluteBase}/pages/posts.html`;
    }
    document.getElementById('post-structured-data')?.remove();

    const header = document.getElementById('post-header');
    if (header) {
      header.innerHTML = `
        <span class="post-header-cat">404</span>
        <h1>文章未找到</h1>
        <div class="post-header-meta"><span>这篇文章不存在或已经被移除。</span></div>
      `;
    }

    document.getElementById('post-cover')?.remove();
    const body = document.getElementById('post-body');
    if (body) {
      body.innerHTML = '<p>可以返回文章列表，继续浏览其他内容。</p><p><a class="btn btn-ghost" href="posts.html">返回文章列表</a></p>';
    }
    document.getElementById('post-gallery')?.replaceChildren();
    document.getElementById('post-tags')?.replaceChildren();
    document.getElementById('prev-next')?.replaceChildren();
    document.getElementById('toc')?.replaceChildren();
    document.getElementById('related')?.replaceChildren();
    document.getElementById('back-to-top')?.remove();
    initReveal();
    return null;
  }

  if (!post) {
    return renderMissingPost();
  }

  const seo = post.seo || {};
  const seoTitle = seo.title || `${post.title} · 次元日记`;
  const seoDescription = seo.description || post.excerpt;
  const seoImage = seo.image || post.cover;
  const canonicalUrl = seo.canonical || `https://yzh1019.top/pages/post.html?id=${post.id}`;

  document.title = seoTitle;
  setMeta('meta[name="description"]', 'content', seoDescription);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[property="og:title"]', 'content', seoTitle);
  setMeta('meta[property="og:description"]', 'content', seoDescription);
  setMeta('meta[property="og:image"]', 'content', toAbsoluteAssetUrl(seoImage));
  setMeta('meta[property="og:image:alt"]', 'content', `${post.title} 的文章封面`);
  setMeta('meta[name="twitter:title"]', 'content', seoTitle);
  setMeta('meta[name="twitter:description"]', 'content', seoDescription);
  setMeta('meta[name="twitter:image"]', 'content', toAbsoluteAssetUrl(seoImage));
  setMeta('meta[name="twitter:image:alt"]', 'content', `${post.title} 的文章封面`);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = canonicalUrl;
  }
  const structuredData = document.getElementById('post-structured-data');
  if (structuredData) {
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      articleSection: post.cat,
      keywords: post.tags.join(', '),
      datePublished: post.date,
      dateModified: post.updatedAt || post.date,
      timeRequired: `PT${post.readTime}M`,
      description: seoDescription,
      image: toAbsoluteAssetUrl(seoImage),
      url: `https://yzh1019.top/pages/post.html?id=${post.id}`,
      author: {
        '@type': 'Person',
        name: '次元日记',
        url: `${absoluteBase}/pages/about.html`,
      },
      publisher: {
        '@type': 'Person',
        name: '次元日记',
        url: `${absoluteBase}/pages/about.html`,
      },
      articleBody: stripHtml(post.content),
    });
  }

  const header = document.getElementById('post-header');
  if (header) {
    header.innerHTML = `
      <span class="post-header-cat" style="color:${safeCssColor(post.catColor)}">${escapeHtml(post.cat)}</span>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-header-meta">
        <span>📅 ${escapeHtml(post.date)}</span>
        <span>⏱ ${escapeHtml(post.readTime)} 分钟阅读</span>
        <span>🏷 ${post.tags.map(escapeHtml).join(' · ')}</span>
        ${post.series ? `<span>📚 ${escapeHtml(post.series)}</span>` : ''}
      </div>
    `;
  }

  const cover = document.getElementById('post-cover');
  if (cover) {
    if (post.cover) {
      const fullUrl = resolveAssetUrl(post.cover);
      const thumbUrl = post.coverAnimated ? fullUrl : resolveThumbnailUrl(post.cover);
      // 先用列表页已缓存的缩略图即时显示封面，再后台加载大图无缝替换，
      // 避免「进文章后主图要等一下才出来」的卡顿感。
      cover.innerHTML = `<div class="img-bg" style="background-image:url('${escapeCssUrl(thumbUrl)}')"></div><img src="${escapeHtml(thumbUrl)}" alt="文章封面" decoding="async" />`;
      const coverImg = cover.querySelector('img');
      if (coverImg && fullUrl !== thumbUrl) {
        const fullImage = new Image();
        fullImage.onload = () => { coverImg.src = fullUrl; };
        fullImage.src = fullUrl;
      }
    } else {
      cover.innerHTML = escapeHtml(post.emoji);
    }
  }

  const body = document.getElementById('post-body');
  if (body) {
    body.innerHTML = `${originalCoverFigure(post)}${post.content}`;
  }

  document.querySelectorAll('.code-block code').forEach(highlightCode);
  document.querySelectorAll('.copy-code-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.closest('.code-block')?.querySelector('code')?.textContent || '';
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = '已复制';
        window.setTimeout(() => {
          btn.textContent = '复制';
        }, 1200);
      } catch (error) {
        btn.textContent = '复制失败';
      }
    });
  });

  const gallery = document.getElementById('post-gallery');
  if (gallery) {
    const images = Array.isArray(post.images) ? post.images : [];
    gallery.replaceChildren(...images.map((image) => {
      const src = imageSrc(image);
      const animated = imageIsAnimated(image);
      const previewSrc = animated ? resolveAssetUrl(src) : resolveThumbnailUrl(src);
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = previewSrc;
      img.dataset.fullSrc = resolveAssetUrl(src);
      img.alt = imageAlt(image, `${post.title} 图片`);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => {
        img.onerror = null;
        img.src = img.dataset.fullSrc;
      };
      figure.appendChild(img);
      if (typeof image === 'object' && image?.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = image.caption;
        figure.appendChild(caption);
      }
      return figure;
    }));
  }

  const tags = document.getElementById('post-tags');
  if (tags) {
    tags.innerHTML = post.tags.map((tag) => `<span class="post-tag">#${escapeHtml(tag)}</span>`).join('');
  }

  const toc = document.getElementById('toc');
  const tocLinks = [];
  if (toc) {
    toc.innerHTML = '';
    document.querySelectorAll('.post-body h2, .post-body h3').forEach((heading, index) => {
      heading.id = `heading-${index}`;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#heading-${index}`;
      link.textContent = heading.textContent;
      if (heading.tagName === 'H3') link.style.paddingLeft = '1.2rem';
      item.appendChild(link);
      toc.appendChild(item);
      tocLinks.push(link);
    });
  }

  const tocToggle = document.getElementById('toc-toggle');
  tocToggle?.addEventListener('click', () => {
    const opened = toc?.classList.toggle('open') || false;
    tocToggle.setAttribute('aria-expanded', String(opened));
  });

  const manualRelated = (post.relatedPosts || [])
    .map((relatedId) => POSTS.find((item) => item.id === relatedId && item.id !== id))
    .filter(Boolean);
  const fallbackRelated = POSTS.filter((item) => (
    item.id !== id &&
    item.cat === post.cat &&
    !manualRelated.some((relatedPost) => relatedPost.id === item.id)
  ));
  const related = [...manualRelated, ...fallbackRelated].slice(0, 3);
  const relatedEl = document.getElementById('related');
  if (relatedEl) {
    relatedEl.innerHTML = '';
    (related.length ? related : POSTS.filter((item) => item.id !== id).slice(0, 3)).forEach((item) => {
      relatedEl.innerHTML += `<a class="related-item" href="post.html?id=${item.id}"><span class="related-emoji">${escapeHtml(item.emoji)}</span>${escapeHtml(item.title)}</a>`;
    });
  }

  const newer = POSTS[postIndex - 1];
  const older = POSTS[postIndex + 1];
  const prevNext = document.getElementById('prev-next');
  if (prevNext) {
    prevNext.innerHTML = `
      ${older ? `<a class="pn-card" href="post.html?id=${older.id}"><div class="pn-label">← 上一篇</div><div class="pn-title">${escapeHtml(older.title)}</div></a>` : '<div></div>'}
      ${newer ? `<a class="pn-card next" href="post.html?id=${newer.id}"><div class="pn-label">下一篇 →</div><div class="pn-title">${escapeHtml(newer.title)}</div></a>` : '<div></div>'}
    `;
  }

  const backToTop = document.getElementById('back-to-top');
  const progress = document.getElementById('reading-progress');
  const headings = Array.from(document.querySelectorAll('.post-body h2, .post-body h3'));
  const syncBackToTop = () => {
    backToTop?.classList.toggle('visible', window.scrollY > 520);

    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    if (progress) progress.style.width = `${percent}%`;

    let activeIndex = 0;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= 120) activeIndex = index;
    });
    tocLinks.forEach((link, index) => {
      link.classList.toggle('active', index === activeIndex);
    });
  };
  const scrollToTop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const scroller = document.scrollingElement || document.documentElement;
    try {
      scroller?.scrollTo?.({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      window.scrollTo(0, 0);
    }
    window.setTimeout(() => {
      if (window.scrollY < 4) return;
      if (scroller) scroller.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 220);
  };
  backToTop?.addEventListener('click', scrollToTop);
  window.addEventListener('scroll', syncBackToTop, { passive: true });
  syncBackToTop();

  initReveal();

  return () => {
    backToTop?.removeEventListener('click', scrollToTop);
    window.removeEventListener('scroll', syncBackToTop);
  };
});
