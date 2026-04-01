window.SiteApp.registerPage('games', () => {
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
      const imageContent = game.image
        ? `<img src="${game.image}" alt="${game.title}" loading="${eagerImage ? 'eager' : 'lazy'}" decoding="async"${index === 0 ? ' fetchpriority="high"' : ''}>`
        : game.previewEmoji;
      card.innerHTML = `
        <div class="game-card-img">${imageContent}</div>
        <div class="game-card-body">
          <div class="game-meta">
            <span class="game-category">${game.category}</span>
            <span>${game.releaseDate}</span>
          </div>
          <h3 class="game-title">${game.title}</h3>
          <p class="game-description">${game.description}</p>
          <div class="game-stats">
            <span>${game.platform}</span>
            <span class="game-download">点击查看详情 →</span>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function openGameModal(game) {
    document.getElementById('modal-game-title').textContent = game.title;
    document.getElementById('modal-game-description').textContent = game.description;
    document.getElementById('modal-game-type').textContent = game.type;
    document.getElementById('modal-game-platform').textContent = game.platform;
    document.getElementById('modal-game-date').textContent = game.releaseDate;
    document.getElementById('modal-game-status').textContent = game.status;
    document.getElementById('modal-download-link').href = game.downloadLink;
    document.getElementById('modal-game-image').innerHTML = game.image
      ? `<img src="${game.image}" alt="${game.title}" decoding="async">`
      : game.previewEmoji;

    document.getElementById('game-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeGameModal() {
    const modal = document.getElementById('game-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    document.body.style.overflow = '';
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

  return () => {
    closeGameModal();
  };
});
