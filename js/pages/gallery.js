const ALL_PHOTOS = [
  { src: '../assets/posts/人工智能大赛国一.webp' },
  { src: '../assets/posts/实习证明.webp' },
  { src: '../assets/posts/软著1.webp' },
  { src: '../assets/posts/软著2.webp' },
  { src: '../assets/posts/校园算法精英大赛省三.webp' },
  { src: '../assets/posts/神本无相.webp' },
  { src: '../assets/posts/软件引入证明.webp' },
  { src: '../assets/posts/我深思熟虑，准备做一个由乔瓮执笔的GalGame.webp' },
  { src: '../assets/projects/legalmind.webp' },
  { src: '../assets/projects/moment-henan.webp' },
  { src: '../assets/projects/fuguang-cloud-classroom.webp' },
  { src: '../assets/projects/law-contract-assistant.webp' },
  { src: '../assets/projects/green-credit.webp' },
  { src: '../assets/projects/quanyi-zhongyuan.webp' },
  { src: '../assets/projects/literary-knowledge-map.webp' },
  { src: '../assets/projects/poem-project.webp' },
  { src: '../assets/avatar.png' },
  { src: '../assets/game1.webp' },
];

function shufflePhotos(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

window.SiteApp.registerPage('gallery', () => {
  let galleryLightboxIndex = 0;
  let galleryPaused = false;
  let galleryTracks = [];
  const gallerySources = ALL_PHOTOS.map((item) => item.src);

  function renderGalleryLightbox() {
    const src = gallerySources[galleryLightboxIndex] || gallerySources[0];
    const image = document.getElementById('lb-img');
    const background = document.getElementById('lb-bg');
    if (image) {
      image.src = src;
    }
    if (background) {
      background.style.backgroundImage = `url('${src}')`;
    }
  }

  function openGalleryLightbox(index) {
    galleryLightboxIndex = index >= 0 ? index : 0;
    galleryPaused = true;
    galleryTracks.forEach((track) => track.pause());
    document.getElementById('pause-hint')?.classList.remove('show');
    renderGalleryLightbox();
    document.getElementById('lightbox')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeGalleryLightbox() {
    document.getElementById('lightbox')?.classList.remove('open');
    document.body.style.overflow = '';
    galleryPaused = false;
    galleryTracks.forEach((track) => track.resume());
  }

  function buildGalleryRow(trackEl, photos, direction, speed) {
    if (!trackEl) return null;

    const repeated = [];
    while (repeated.length < Math.max(photos.length * 2, 30)) {
      repeated.push(...shufflePhotos(photos));
    }

    repeated.forEach((photo) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.dataset.src = photo.src;
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      card.appendChild(img);
      trackEl.appendChild(card);
    });

    let paused = false;
    let offset = direction > 0 ? 0 : trackEl.scrollWidth / 4;
    let dragStartX = 0;
    let dragOffsetStart = 0;
    let isDragging = false;
    let rafId = 0;
    let destroyed = false;
    const hint = document.getElementById('pause-hint');

    function getHalfWidth() {
      return trackEl.scrollWidth / 2;
    }

    function animate() {
      if (destroyed) return;
      if (!paused) {
        offset += direction * speed;
        const half = getHalfWidth();
        if (direction > 0 && offset >= half) offset -= half;
        if (direction < 0 && offset <= -half) offset += half;
        trackEl.style.transform = `translateX(${-offset}px)`;
      }
      rafId = window.requestAnimationFrame(animate);
    }

    function handleMouseEnter() {
      paused = true;
      hint?.classList.add('show');
    }

    function handleMouseLeave() {
      if (!galleryPaused) {
        paused = false;
        hint?.classList.remove('show');
      }
    }

    function handleClick(event) {
      const card = event.target.closest('.photo-card');
      if (!card || isDragging) return;
      openGalleryLightbox(gallerySources.indexOf(card.dataset.src));
    }

    function handleMouseDown(event) {
      isDragging = false;
      dragStartX = event.clientX;
      dragOffsetStart = offset;
      paused = true;

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - dragStartX;
        if (Math.abs(dx) > 4) isDragging = true;
        offset = dragOffsetStart - dx;
        const half = getHalfWidth();
        if (offset < 0) offset += half;
        if (offset > half) offset -= half;
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.setTimeout(() => {
          isDragging = false;
        }, 50);
        if (!galleryPaused) paused = false;
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    trackEl.addEventListener('mouseenter', handleMouseEnter);
    trackEl.addEventListener('mouseleave', handleMouseLeave);
    trackEl.addEventListener('click', handleClick);
    trackEl.addEventListener('mousedown', handleMouseDown);

    animate();

    return {
      pause() {
        paused = true;
      },
      resume() {
        paused = false;
      },
      destroy() {
        destroyed = true;
        window.cancelAnimationFrame(rafId);
        trackEl.removeEventListener('mouseenter', handleMouseEnter);
        trackEl.removeEventListener('mouseleave', handleMouseLeave);
        trackEl.removeEventListener('click', handleClick);
        trackEl.removeEventListener('mousedown', handleMouseDown);
      },
    };
  }

  function onKeyDown(event) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox?.classList.contains('open')) return;

    if (event.key === 'ArrowLeft') {
      galleryLightboxIndex = (galleryLightboxIndex - 1 + gallerySources.length) % gallerySources.length;
      renderGalleryLightbox();
    }
    if (event.key === 'ArrowRight') {
      galleryLightboxIndex = (galleryLightboxIndex + 1) % gallerySources.length;
      renderGalleryLightbox();
    }
    if (event.key === 'Escape') {
      closeGalleryLightbox();
    }
  }

  document.getElementById('lightbox')?.addEventListener('click', (event) => {
    if (event.target.id === 'lightbox') closeGalleryLightbox();
  });
  document.getElementById('lb-close')?.addEventListener('click', closeGalleryLightbox);
  document.getElementById('lb-prev')?.addEventListener('click', () => {
    galleryLightboxIndex = (galleryLightboxIndex - 1 + gallerySources.length) % gallerySources.length;
    renderGalleryLightbox();
  });
  document.getElementById('lb-next')?.addEventListener('click', () => {
    galleryLightboxIndex = (galleryLightboxIndex + 1) % gallerySources.length;
    renderGalleryLightbox();
  });
  document.addEventListener('keydown', onKeyDown);

  galleryTracks = [
    buildGalleryRow(document.getElementById('track-1'), shufflePhotos(ALL_PHOTOS), 1, 0.6),
    buildGalleryRow(document.getElementById('track-2'), shufflePhotos(ALL_PHOTOS), -1, 0.45),
    buildGalleryRow(document.getElementById('track-3'), shufflePhotos(ALL_PHOTOS), 1, 0.75),
  ].filter(Boolean);

  initReveal();

  return () => {
    closeGalleryLightbox();
    document.removeEventListener('keydown', onKeyDown);
    galleryTracks.forEach((track) => track.destroy());
    galleryTracks = [];
  };
});
