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
  { src: '../assets/avatar.webp' },
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
  let sectionObserver = null;
  let previousActiveElement = null;
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
    previousActiveElement = document.activeElement;
    galleryLightboxIndex = index >= 0 ? index : 0;
    galleryPaused = true;
    galleryTracks.forEach((track) => track.pause());
    document.getElementById('pause-hint')?.classList.remove('show');
    renderGalleryLightbox();
    document.getElementById('lightbox')?.classList.add('open');
    document.getElementById('lightbox')?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('lb-close')?.focus();
  }

  function closeGalleryLightbox() {
    document.getElementById('lightbox')?.classList.remove('open');
    document.getElementById('lightbox')?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    galleryPaused = false;
    galleryTracks.forEach((track) => track.resume());
    previousActiveElement?.focus?.();
  }

  function buildGalleryRow(trackEl, photos, direction, speed) {
    if (!trackEl) return null;

    const repeated = [];
    const isMobile = window.innerWidth <= 768;
    const targetCount = isMobile ? Math.max(photos.length, 18) : Math.max(photos.length * 2, 30);
    while (repeated.length < targetCount) {
      repeated.push(...shufflePhotos(photos));
    }

    repeated.forEach((photo) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.dataset.src = photo.src;
      const img = document.createElement('img');
      img.src = typeof resolveThumbnailUrl === 'function' ? resolveThumbnailUrl(photo.src) : photo.src;
      img.dataset.fullSrc = photo.src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      img.onerror = () => {
        img.onerror = null;
        img.src = img.dataset.fullSrc;
      };
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
    let inViewport = true;
    const hint = document.getElementById('pause-hint');
    let onMove = null;
    let onUp = null;

    function getHalfWidth() {
      return trackEl.scrollWidth / 2;
    }

    function applyTransform() {
      trackEl.style.transform = `translateX(${-offset}px)`;
    }

    function shouldAnimate() {
      return !destroyed && !paused && inViewport && !document.hidden;
    }

    function stopAnimation() {
      if (!rafId) return;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function animate() {
      rafId = 0;
      if (!shouldAnimate()) return;
      offset += direction * speed;
      const half = getHalfWidth();
      if (direction > 0 && offset >= half) offset -= half;
      if (direction < 0 && offset <= -half) offset += half;
      applyTransform();
      rafId = window.requestAnimationFrame(animate);
    }

    function syncAnimation() {
      if (shouldAnimate()) {
        if (!rafId) {
          rafId = window.requestAnimationFrame(animate);
        }
        return;
      }
      stopAnimation();
    }

    function handleMouseEnter() {
      paused = true;
      syncAnimation();
      hint?.classList.add('show');
    }

    function handleMouseLeave() {
      if (!galleryPaused) {
        paused = false;
        syncAnimation();
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
      syncAnimation();

      onMove = (moveEvent) => {
        const dx = moveEvent.clientX - dragStartX;
        if (Math.abs(dx) > 4) isDragging = true;
        offset = dragOffsetStart - dx;
        const half = getHalfWidth();
        if (offset < 0) offset += half;
        if (offset > half) offset -= half;
        applyTransform();
      };

      onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        onMove = null;
        onUp = null;
        window.setTimeout(() => {
          isDragging = false;
        }, 50);
        if (!galleryPaused) paused = false;
        syncAnimation();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    trackEl.addEventListener('mouseenter', handleMouseEnter);
    trackEl.addEventListener('mouseleave', handleMouseLeave);
    trackEl.addEventListener('click', handleClick);
    trackEl.addEventListener('mousedown', handleMouseDown);

    applyTransform();
    syncAnimation();

    return {
      pause() {
        paused = true;
        syncAnimation();
      },
      resume() {
        paused = false;
        syncAnimation();
      },
      setViewportActive(next) {
        inViewport = next;
        syncAnimation();
      },
      destroy() {
        destroyed = true;
        stopAnimation();
        if (onMove) {
          window.removeEventListener('mousemove', onMove);
        }
        if (onUp) {
          window.removeEventListener('mouseup', onUp);
        }
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
  document.addEventListener('visibilitychange', syncTrackVisibility);

  galleryTracks = [
    buildGalleryRow(document.getElementById('track-1'), shufflePhotos(ALL_PHOTOS), 1, 0.6),
    buildGalleryRow(document.getElementById('track-2'), shufflePhotos(ALL_PHOTOS), -1, 0.45),
    buildGalleryRow(document.getElementById('track-3'), shufflePhotos(ALL_PHOTOS), 1, 0.75),
  ].filter(Boolean);

  function syncTrackVisibility() {
    if (document.hidden) {
      galleryTracks.forEach((track) => track.pause());
      return;
    }

    galleryTracks.forEach((track) => {
      if (galleryPaused) {
        track.pause();
        return;
      }
      track.resume();
    });
  }

  if ('IntersectionObserver' in window) {
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const rowIndex = Number(entry.target.dataset.trackRowIndex || -1);
        const track = galleryTracks[rowIndex];
        if (!track) return;
        track.setViewportActive(entry.isIntersecting);
      });
    }, { rootMargin: '180px 0px' });

    document.querySelectorAll('.track-section').forEach((section, index) => {
      section.dataset.trackRowIndex = String(index);
      sectionObserver.observe(section);
    });
  }

  initReveal();

  return () => {
    closeGalleryLightbox();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', syncTrackVisibility);
    sectionObserver?.disconnect();
    galleryTracks.forEach((track) => track.destroy());
    galleryTracks = [];
  };
});
