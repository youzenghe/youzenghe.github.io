window.SiteApp.registerPage('games', () => {
  let previousActiveElement = null;

  function renderGames() {
    const container = document.getElementById('games-container');
    if (!container) return;
    container.innerHTML = '';

    GAMES.forEach((game, index) => {
      const card = document.createElement('a');
      card.className = 'game-card reveal';
      card.style.transitionDelay = `${index * 0.1}s`;
      card.href = '#';
      card.addEventListener('click', (event) => {
        event.preventDefault();
        openGameModal(game);
      });

      const eagerImage = index < 2;
      const image = escapeHtml(resolveAssetUrl(game.image));
      const thumb = escapeHtml(resolveThumbnailUrl(game.image));
      const title = escapeHtml(game.title);
      const imageContent = game.image
        ? `<img src="${thumb}" data-full-src="${image}" alt="${title}" loading="${eagerImage ? 'eager' : 'lazy'}" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc"${index === 0 ? ' fetchpriority="high"' : ''}>`
        : escapeHtml(game.previewEmoji);
      card.innerHTML = `
        <div class="game-card-img">${imageContent}</div>
        <div class="game-card-body">
          <div class="game-meta">
            <span class="game-category">${escapeHtml(game.category)}</span>
            <span>${escapeHtml(game.releaseDate)}</span>
          </div>
          <h3 class="game-title">${title}</h3>
          <p class="game-description">${escapeHtml(game.description)}</p>
          <div class="game-stats">
            <span>${escapeHtml(game.platform)}</span>
            <span class="game-download">点击查看详情 →</span>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function openGameModal(game) {
    previousActiveElement = document.activeElement;
    document.getElementById('modal-game-title').textContent = game.title;
    document.getElementById('modal-game-description').textContent = game.description;
    document.getElementById('modal-game-type').textContent = game.type;
    document.getElementById('modal-game-platform').textContent = game.platform;
    document.getElementById('modal-game-date').textContent = game.releaseDate;
    document.getElementById('modal-game-status').textContent = game.status;
    document.getElementById('modal-download-link').href = safeExternalUrl(game.downloadLink);
    document.getElementById('modal-game-image').innerHTML = game.image
      ? `<img src="${escapeHtml(resolveAssetUrl(game.image))}" alt="${escapeHtml(game.title)}" decoding="async">`
      : escapeHtml(game.previewEmoji);
    const modal = document.getElementById('game-modal');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-close')?.focus();
  }

  function closeGameModal() {
    const modal = document.getElementById('game-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    previousActiveElement?.focus?.();
  }

  function onKeyDown(event) {
    const modal = document.getElementById('game-modal');
    if (modal?.style.display !== 'flex') return;
    if (event.key === 'Escape') {
      closeGameModal();
    }
  }

  renderGames();
  initReveal();

  const closeBtn = document.getElementById('modal-close');
  const modal = document.getElementById('game-modal');

  closeBtn?.addEventListener('click', closeGameModal);
  modal?.addEventListener('click', (event) => {
    if (event.target.id === 'game-modal') {
      closeGameModal();
    }
  });
  document.addEventListener('keydown', onKeyDown);

  return () => {
    closeGameModal();
    document.removeEventListener('keydown', onKeyDown);
  };
});
