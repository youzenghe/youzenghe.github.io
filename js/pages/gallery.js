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
  let previousActiveElement = null;
  const gallerySources = ALL_PHOTOS.map((item) => item.src);

  function renderGallery() {
    const container = document.getElementById('gallery-masonry');
    if (!container) return;

    gallerySources.forEach((src, index) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.dataset.index = String(index);

      const img = document.createElement('img');
      img.src = typeof resolveThumbnailUrl === 'function' ? resolveThumbnailUrl(src) : src;
      img.dataset.fullSrc = src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => {
        img.onerror = null;
        img.src = img.dataset.fullSrc;
      };

      card.appendChild(img);
      card.addEventListener('click', () => openGalleryLightbox(index));
      container.appendChild(card);
    });
  }

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
    previousActiveElement?.focus?.();
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

  renderGallery();
  initReveal();

  return () => {
    closeGalleryLightbox();
    document.removeEventListener('keydown', onKeyDown);
  };
});
