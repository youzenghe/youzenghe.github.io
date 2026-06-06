window.SiteApp.registerPage('learning', () => {
  const absoluteBase = 'https://yzh1019.top';
  const pageSize = 5;
  const plans = Array.isArray(LEARNING_PLANS) ? LEARNING_PLANS : [];
  const categoryLabels = {
    总览: '总览',
    主线: '📘 主线',
    八股速通这一块: '⚡ 八股速通',
    番外: '🌸 番外',
    绝望拷打之啥也不会: '🔥 专项拷打',
  };
  const categories = ['全部', ...new Set(plans.map((plan) => plan.cat).filter(Boolean))];
  const params = new URLSearchParams(location.search);
  const focusId = Number(params.get('id')) || 0;
  const focusedPlanSummary = plans.find((plan) => plan.id === focusId);
  let currentCategory = params.get('cat') || focusedPlanSummary?.cat || '全部';
  let currentPage = 1;
  let currentList = [];

  if (!categories.includes(currentCategory)) {
    currentCategory = '全部';
  }

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute(attr, value);
    }
  }

  function toAbsoluteAssetUrl(path) {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    return `${absoluteBase}/${path.replace(/^\.\.\//, '').replace(/^\//, '')}`;
  }

  function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html || '';
    return temp.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  function makeHeadingSlug(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/&[a-z0-9#]+;/gi, '')
      .replace(/[\u3000]/g, ' ')
      .replace(/([\u4e00-\u9fff])\s+(\d)/g, '$1$2')
      .replace(/[，。、：:；;！？?（）()【】[\]《》“”"']/g, '')
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function hashCandidates(hash = location.hash) {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return [];

    const candidates = [raw];
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded && decoded !== raw) candidates.push(decoded);
    } catch (error) {
      // Keep the raw hash. A malformed hash should not break the detail page.
    }

    return [...new Set(candidates)];
  }

  function escapeSelectorIdent(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function findDetailHashTarget(root, hash = location.hash) {
    const candidates = hashCandidates(hash);
    for (const candidate of candidates) {
      const target = root.querySelector(`[data-heading-slug="${escapeSelectorIdent(candidate)}"]`);
      if (target) return target;
    }

    for (const candidate of candidates) {
      const target = document.getElementById(candidate);
      if (target) return target;
    }

    return null;
  }

  function scrollToCurrentHash(root) {
    if (!location.hash) return;

    const expectedHash = location.hash;
    const scrollDelays = [0, 80, 240, 600];
    scrollDelays.forEach((delay) => {
      const timer = window.setTimeout(() => {
        if (location.hash !== expectedHash) return;
        window.requestAnimationFrame(() => {
          const target = findDetailHashTarget(root, expectedHash);
          if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
      }, delay);
      cleanupFns.push(() => window.clearTimeout(timer));
    });
  }

  function categoryLabel(category) {
    return category === '全部' ? '全部' : categoryLabels[category] || category;
  }

  function planUrl(plan) {
    return `learning.html?id=${plan.id}`;
  }

  function detailForPlan(plan) {
    if (!plan) return null;
    const details = window.SITE_DATA?.learningDetails?.[String(plan.id)] || {};
    return { ...plan, ...details };
  }

  function loadLearningDetails() {
    if (window.SITE_DATA?.learningDetails) return Promise.resolve();
    const existing = document.getElementById('learning-detail-data-script');
    if (existing) {
      if (existing.dataset.loaded === 'true') return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => {
          existing.dataset.loaded = 'true';
          resolve();
        }, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'learning-detail-data-script';
      script.src = resolveVersionedDataUrl('js/data-learning.js');
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function renderDetailLoading() {
    const stats = document.getElementById('learning-stats');
    const listView = document.getElementById('learning-list-view');
    const detail = document.getElementById('learning-detail');
    if (stats) stats.hidden = true;
    if (listView) listView.hidden = true;
    if (!detail) return;
    detail.hidden = false;
    detail.innerHTML = `
      <a class="learning-back-link" href="learning.html">← 返回学习计划列表</a>
      <div class="learning-detail-body learning-detail-empty">正在加载学习计划正文...</div>
    `;
  }

  function updateListStructuredData() {
    const script = document.getElementById('learning-structured-data');
    if (!script) return;

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      url: `${absoluteBase}/pages/learning.html`,
      name: '学习计划 · 次元日记',
      description: '整理 Java 后端学习计划、主线训练、面试八股和专项复盘。',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: plans.map((plan, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${absoluteBase}/pages/learning.html?id=${plan.id}`,
          name: plan.title,
          item: {
            '@type': 'CreativeWork',
            name: plan.title,
            description: plan.excerpt,
            image: toAbsoluteAssetUrl(plan.cover),
          },
        })),
      },
    });
  }

  function updateDetailMeta(plan) {
    const title = `${plan.title} · 学习计划 · 次元日记`;
    const description = plan.excerpt || '阅读学习计划 Markdown 文档。';
    const canonicalUrl = `${absoluteBase}/pages/learning.html?id=${plan.id}`;
    const image = toAbsoluteAssetUrl(plan.cover);

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[property="og:image:alt"]', 'content', `${plan.title} 的学习计划封面`);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);
    setMeta('meta[name="twitter:image:alt"]', 'content', `${plan.title} 的学习计划封面`);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = canonicalUrl;
    }

    const script = document.getElementById('learning-structured-data');
    if (script) {
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: plan.title,
        url: canonicalUrl,
        datePublished: plan.date,
        dateModified: plan.updatedAt || plan.date,
        timeRequired: `PT${plan.readTime || 0}M`,
        description,
        image,
        keywords: (plan.tags || []).join(', '),
        articleBody: stripHtml(plan.content),
      });
    }
  }

  function renderStats() {
    const stats = document.getElementById('learning-stats');
    if (!stats) return;

    const totalMinutes = plans.reduce((sum, plan) => sum + Number(plan.readTime || 0), 0);
    const tagCount = new Set(plans.flatMap((plan) => plan.tags || [])).size;
    const categoryCount = new Set(plans.map((plan) => plan.cat).filter(Boolean)).size;
    stats.innerHTML = `
      <div class="learning-stat"><strong>${plans.length}</strong><span>计划条目</span></div>
      <div class="learning-stat"><strong>${categoryCount}</strong><span>分类</span></div>
      <div class="learning-stat"><strong>${tagCount}</strong><span>标签</span></div>
      <div class="learning-stat"><strong>${totalMinutes}</strong><span>分钟</span></div>
    `;
  }

  function renderTabs(activeCategory) {
    const tabs = document.getElementById('learning-tabs');
    if (!tabs) return;

    tabs.innerHTML = categories.map((category) => `
      <button class="learning-tab${category === activeCategory ? ' active' : ''}" type="button" data-cat="${escapeHtml(category)}">
        ${escapeHtml(categoryLabel(category))}
      </button>
    `).join('');

    tabs.querySelectorAll('.learning-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.learning-tab').forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        currentPage = 1;
        renderList(btn.dataset.cat || '全部', { preserveFocus: false });
      });
    });
  }

  function renderPagination(total) {
    const list = document.getElementById('learning-list');
    if (!list) return;

    let pager = document.getElementById('learning-pagination');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'learning-pagination';
      pager.className = 'pagination';
      list.after(pager);
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

  function renderPlanCard(plan, index) {
    const eagerImage = index < 2;
    const cover = escapeHtml(resolveAssetUrl(plan.cover));
    const title = escapeHtml(plan.title);
    const subcategory = plan.subcategory ? `<span>${escapeHtml(plan.subcategory)}</span>` : '';
    const tags = (plan.tags || []).slice(0, 5).map((tag) => `<span class="study-tag">#${escapeHtml(tag)}</span>`).join('');
    const highlights = (plan.highlights || []).slice(0, 3).map((item) => `<span class="study-highlight">${escapeHtml(item)}</span>`).join('');

    return `
      <a class="study-card reveal" id="learning-${plan.id}" href="${planUrl(plan)}" style="transition-delay:${index * 0.07}s">
        <div class="study-preview">
          ${plan.cover
            ? `<img src="${cover}" alt="${title}" loading="${eagerImage ? 'eager' : 'lazy'}" decoding="async"${index === 0 ? ' fetchpriority="high"' : ''} />`
            : `<span>${escapeHtml(plan.emoji || '📚')}</span>`}
        </div>
        <div class="study-body">
          <div class="study-meta">
            <span class="study-cat" style="color:${safeCssColor(plan.catColor)}">${escapeHtml(plan.cat)}</span>
            ${subcategory}
            <span>${escapeHtml(plan.date)}</span>
            <span>${escapeHtml(plan.readTime)} min</span>
            <span class="study-status">${escapeHtml(plan.status)}</span>
          </div>
          <h2 class="study-title">${title}</h2>
          <p class="study-excerpt">${escapeHtml(plan.excerpt)}</p>
          <div class="study-tags">${tags}</div>
          ${highlights ? `<div class="study-highlights">${highlights}</div>` : ''}
        </div>
        <div class="study-footer">
          <span>来源：${escapeHtml(plan.source || '学习计划')}</span>
          <span class="study-anchor">阅读全文 →</span>
        </div>
      </a>
    `;
  }

  function renderList(category, options = {}) {
    currentCategory = category;
    currentList = category === '全部' ? [...plans] : plans.filter((plan) => plan.cat === category);
    const list = document.getElementById('learning-list');
    if (!list) return;
    list.innerHTML = '';

    if (!currentList.length) {
      list.innerHTML = '<div class="learning-empty"><span>🔍</span>该分类下暂时没有学习计划</div>';
      renderPagination(0);
      return;
    }

    const focusedIndex = focusId ? currentList.findIndex((plan) => plan.id === focusId) : -1;
    if (options.preserveFocus !== false && focusedIndex >= 0) {
      currentPage = Math.floor(focusedIndex / pageSize) + 1;
    }

    const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = currentList.slice(start, start + pageSize);

    list.innerHTML = pageItems.map(renderPlanCard).join('');
    renderPagination(currentList.length);
    initReveal();
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

  function wireCodeCopy(root) {
    root.querySelectorAll('.code-block code').forEach(highlightCode);
    root.querySelectorAll('.copy-code-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const code = btn.closest('.code-block')?.querySelector('code')?.textContent || '';
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = '已复制';
          window.setTimeout(() => { btn.textContent = '复制'; }, 1200);
        } catch (error) {
          btn.textContent = '复制失败';
        }
      });
    });
  }

  const cleanupFns = [];

  function renderDetailToc(root) {
    const toc = root.querySelector('#learning-detail-toc');
    if (!toc) return;

    const headings = Array.from(root.querySelectorAll('.learning-detail-body h1, .learning-detail-body h2, .learning-detail-body h3'));
    if (!headings.length) {
      toc.innerHTML = '<span class="learning-detail-empty">暂无目录</span>';
      return;
    }

    const usedSlugs = new Map();
    toc.innerHTML = `<ul class="learning-toc-list">${headings.map((heading, index) => {
      const baseSlug = makeHeadingSlug(heading.textContent) || `learning-heading-${index}`;
      const usedCount = usedSlugs.get(baseSlug) || 0;
      usedSlugs.set(baseSlug, usedCount + 1);
      const headingId = usedCount ? `${baseSlug}-${usedCount + 1}` : baseSlug;
      heading.id = headingId;
      heading.dataset.headingSlug = baseSlug;
      const level = heading.tagName.toLowerCase();
      return `<li><a class="toc-${level}" href="#${encodeURIComponent(baseSlug)}">${escapeHtml(heading.textContent || '')}</a></li>`;
    }).join('')}</ul>`;

    toc.scrollTop = 0;

    const links = Array.from(toc.querySelectorAll('a'));
    let lastActiveIndex = -1;
    const keepActiveLinkInView = (index) => {
      const link = links[index];
      if (!link || toc.matches(':hover, :focus-within')) return;

      const tocRect = toc.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const topBuffer = 36;
      const bottomBuffer = 48;
      const isVisible = linkRect.top >= tocRect.top + topBuffer && linkRect.bottom <= tocRect.bottom - bottomBuffer;
      if (isVisible) return;

      const targetTop = link.offsetTop - (toc.clientHeight / 2) + (link.offsetHeight / 2);
      toc.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'auto',
      });
    };
    const onTocClick = (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const heading = findDetailHashTarget(root, link.getAttribute('href'));
      if (!heading) return;
      event.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState({}, '', `${location.pathname}${location.search}${link.getAttribute('href')}`);
      keepActiveLinkInView(links.indexOf(link));
    };
    const syncActiveToc = () => {
      let activeIndex = 0;
      headings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top <= 120) {
          activeIndex = index;
        }
      });
      links.forEach((link, index) => {
        const isActive = index === activeIndex;
        link.classList.toggle('active', isActive);
        link.toggleAttribute('aria-current', isActive);
      });
      if (activeIndex !== lastActiveIndex) {
        keepActiveLinkInView(activeIndex);
        lastActiveIndex = activeIndex;
      }
    };

    toc.addEventListener('click', onTocClick);
    window.addEventListener('scroll', syncActiveToc, { passive: true });
    syncActiveToc();
    cleanupFns.push(() => {
      toc.removeEventListener('click', onTocClick);
      window.removeEventListener('scroll', syncActiveToc);
    });
  }

  function renderMissingDetail() {
    document.title = '学习计划未找到 · 次元日记';
    const stats = document.getElementById('learning-stats');
    const listView = document.getElementById('learning-list-view');
    const detail = document.getElementById('learning-detail');
    if (stats) stats.hidden = true;
    if (listView) listView.hidden = true;
    if (!detail) return;
    detail.hidden = false;
    detail.innerHTML = `
      <a class="learning-back-link" href="learning.html">← 返回学习计划列表</a>
      <div class="learning-detail-body learning-detail-empty">这个学习计划不存在或已经被移除。</div>
    `;
    initReveal();
  }

  function renderDetail(plan) {
    if (!plan) {
      renderMissingDetail();
      return;
    }

    const stats = document.getElementById('learning-stats');
    const listView = document.getElementById('learning-list-view');
    const detail = document.getElementById('learning-detail');
    if (stats) stats.hidden = true;
    if (listView) listView.hidden = true;
    if (!detail) return;

    updateDetailMeta(plan);

    const cover = plan.cover ? escapeHtml(resolveAssetUrl(plan.cover)) : '';
    const tags = (plan.tags || []).map((tag) => `<span class="study-tag">#${escapeHtml(tag)}</span>`).join('');
    const related = plans
      .filter((item) => item.id !== plan.id && item.cat === plan.cat)
      .slice(0, 5);
    const relatedHtml = related.length
      ? related.map((item) => `<a href="${planUrl(item)}">${escapeHtml(item.title)}</a>`).join('')
      : '<span class="learning-detail-empty">暂无同类条目</span>';
    const content = plan.content || '<p>这个学习计划还没有绑定 MD 文档。可以在后台上传 MD 后重新构建。</p>';

    detail.hidden = false;
    detail.innerHTML = `
      <a class="learning-back-link" href="learning.html">← 返回学习计划列表</a>
      <section class="learning-detail-hero">
        <div class="learning-detail-copy">
          <div class="learning-detail-meta">
            <span style="color:${safeCssColor(plan.catColor)}">${escapeHtml(plan.cat)}</span>
            ${plan.subcategory ? `<span>${escapeHtml(plan.subcategory)}</span>` : ''}
            <span>${escapeHtml(plan.date)}</span>
            <span>${escapeHtml(plan.readTime)} min</span>
            <span>${escapeHtml(plan.status)}</span>
          </div>
          <h2 class="learning-detail-title">${escapeHtml(plan.title)}</h2>
          <p class="learning-detail-desc">${escapeHtml(plan.excerpt)}</p>
          <div class="study-tags">${tags}</div>
        </div>
        ${cover ? `<div class="learning-detail-cover"><img src="${cover}" alt="${escapeHtml(plan.title)}" loading="eager" decoding="async" fetchpriority="high"></div>` : ''}
      </section>
      <div class="learning-detail-layout">
        <div class="learning-detail-main">
          <div class="learning-detail-cards">
            <div class="learning-side-card">
              <div class="learning-side-title">文档信息</div>
              <div class="learning-related">
                <span>来源：${escapeHtml(plan.source || plan.contentFile || '学习计划')}</span>
                <span>更新：${escapeHtml(plan.updatedAt || plan.date)}</span>
              </div>
            </div>
            <div class="learning-side-card">
              <div class="learning-side-title">同类学习计划</div>
              <div class="learning-related">${relatedHtml}</div>
            </div>
          </div>
          <article class="learning-detail-body" id="learning-detail-body">${content}</article>
        </div>
        <aside class="learning-detail-side">
          <div class="learning-side-card learning-toc-card">
            <div class="learning-side-title">目录</div>
            <div class="learning-toc" id="learning-detail-toc" role="navigation" aria-label="学习计划目录"></div>
          </div>
        </aside>
      </div>
    `;

    renderDetailToc(detail);
    wireCodeCopy(detail);
    initReveal();
    scrollToCurrentHash(detail);
  }

  const onPaginationClick = (event) => {
    const btn = event.target.closest('#learning-pagination .page-btn');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 1;
    renderList(currentCategory, { preserveFocus: false });
    document.getElementById('learning-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  if (focusId) {
    renderDetailLoading();
    loadLearningDetails()
      .then(() => {
        renderDetail(detailForPlan(focusedPlanSummary));
      })
      .catch(() => {
        renderDetail({
          ...(focusedPlanSummary || {}),
          content: '<p>学习计划正文加载失败，可以返回列表后稍后再试。</p>',
        });
      });
    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }

  document.addEventListener('click', onPaginationClick);
  renderStats();
  renderTabs(currentCategory);
  renderList(currentCategory);
  updateListStructuredData();
  initReveal();

  return () => {
    document.removeEventListener('click', onPaginationClick);
    cleanupFns.forEach((cleanup) => cleanup());
  };
});
