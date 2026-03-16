import { normalizeBannerGallery } from '../../../lib/banner-gallery.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPayloadSource(data = {}) {
  if (data?.siteData && typeof data.siteData === 'object') {
    return data.siteData;
  }
  return data && typeof data === 'object' ? data : {};
}

function buildPlaceholderImage(siteName, label, palette = ['#f4d03f', '#5dade2', '#1f2937']) {
  const [primary = '#f4d03f', accent = '#5dade2', depth = '#1f2937'] = palette;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="900" height="1200" rx="48" fill="url(#g)" />
      <circle cx="170" cy="180" r="120" fill="${depth}" opacity="0.12" />
      <circle cx="730" cy="980" r="150" fill="#ffffff" opacity="0.14" />
      <text x="50%" y="45%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="74" font-weight="700">${escapeHtml(siteName)}</text>
      <text x="50%" y="56%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="36" opacity="0.92">${escapeHtml(label)}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolvePalette(payload = {}) {
  const source = payload?.theme?.palette || payload?.palette || [];
  const colors = Array.isArray(source) ? source.filter(Boolean) : [];
  return colors.length ? colors : ['#f4d03f', '#5dade2', '#1f2937'];
}

function resolveBannerImages(payload = {}) {
  const directImages = normalizeBannerGallery(
    payload?.banner_gallery,
    payload?.banner,
  );

  if (directImages.length) {
    return directImages;
  }

  const fallbackImages = normalizeBannerGallery(
    payload?.group_photo,
    payload?.lead_image,
    payload?.logo,
  );

  if (fallbackImages.length) {
    return fallbackImages;
  }

  const siteName = String(
    payload?.site_name || payload?.community_name || payload?.name || 'Community',
  ).trim() || 'Community';
  const palette = resolvePalette(payload);
  return Array.from({ length: 10 }, (_, index) => (
    buildPlaceholderImage(siteName, `Gallery Card ${String(index + 1).padStart(2, '0')}`, palette)
  ));
}

function renderGalleryCards(images = [], siteName = '') {
  return images.map((image, index) => {
    const isFeatured = index === 0 && images.length > 2;
    const label = isFeatured ? 'Gallery Highlight' : `Gallery Card ${String(index + 1).padStart(2, '0')}`;

    return `
      <article class="banner-card ${isFeatured ? 'banner-card-featured' : ''}" aria-hidden="true">
        <div class="banner-card-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(siteName)} gallery image ${index + 1}" loading="lazy" decoding="async">
          <span class="banner-card-overlay" aria-hidden="true"></span>
        </div>
        <div class="banner-card-copy">
          <span class="banner-card-index">${escapeHtml(label)}</span>
          <strong class="banner-card-label">${escapeHtml(siteName)}</strong>
        </div>
      </article>
    `;
  }).join('');
}

function renderGalleryThumbnails(images = [], siteName = '') {
  return images.map((image, index) => (
    `
      <button class="banner-thumb" type="button" data-index="${index}" aria-label="Open gallery image ${index + 1}">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(siteName)} thumbnail ${index + 1}" loading="lazy" decoding="async">
      </button>
    `
  )).join('');
}

export default function Banner(root, data = {}) {
  const payload = getPayloadSource(data);
  const siteName = String(
    payload?.site_name || payload?.community_name || payload?.name || 'Community',
  ).trim() || 'Community';
  const images = resolveBannerImages(payload);

  root.innerHTML += `
    <section id="home" class="banner">
      <div class="banner-shell">
        <div class="banner-header">
          <div class="banner-copy-block">
            <h2 class="banner-title">Gallery</h2>
            <p class="banner-description">
              Explore the homepage gallery through responsive image cards sized to keep every uploaded visual clear and balanced, including sets with 10 images or more.
            </p>
          </div>
          <div class="banner-header-actions"></div>
        </div>
        <div class="banner-gallery-grid" role="region" aria-label="Homepage gallery">
          <div class="banner-gallery-track">
            ${renderGalleryCards(images, siteName)}
          </div>
        </div>
        <div class="banner-gallery-meta">
          <div class="banner-gallery-caption" aria-live="polite"></div>
          <div class="banner-gallery-dots" role="tablist" aria-label="Select gallery image"></div>
        </div>
        <div class="banner-gallery-thumbs" role="list">
          ${renderGalleryThumbnails(images, siteName)}
        </div>
        <div class="banner-lightbox" aria-hidden="true">
          <div class="banner-lightbox-backdrop" data-action="close"></div>
          <div class="banner-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Full screen image">
            <button class="banner-lightbox-close" type="button" data-action="close" aria-label="Close full screen image">X</button>
            <img class="banner-lightbox-image" alt="">
            <button class="banner-lightbox-toggle" type="button" data-action="toggle-grid" aria-expanded="false">View all</button>
            <div class="banner-lightbox-grid" role="list">
              ${renderGalleryThumbnails(images, siteName)}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  const grid = root.querySelector('.banner-gallery-grid');
  const track = root.querySelector('.banner-gallery-track');
  if (!grid || !track) return;

  const dots = root.querySelector('.banner-gallery-dots');
  const caption = root.querySelector('.banner-gallery-caption');
  const thumbs = Array.from(root.querySelectorAll('.banner-gallery-thumbs .banner-thumb'));
  const lightbox = root.querySelector('.banner-lightbox');
  const lightboxImage = root.querySelector('.banner-lightbox-image');
  const lightboxToggle = root.querySelector('[data-action="toggle-grid"]');
  const lightboxGrid = root.querySelector('.banner-lightbox-grid');
  const lightboxThumbs = Array.from(root.querySelectorAll('.banner-lightbox-grid .banner-thumb'));
  const cards = Array.from(track.querySelectorAll('.banner-card'));
  if (!cards.length) return;

  let activeIndex = 0;
  let cardSpacing = 180;
  let autoplayRafId = null;
  let autoplayLastTime = 0;
  let autoplayProgress = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartIndex = 0;
  let dragDeltaX = 0;
  let dragDeltaY = 0;
  let pointerDownTarget = null;
  let dotButtons = [];
  let lastMetaIndex = -1;

  const setOverlayActive = (active) => {
    track.classList.toggle('is-transitioning', active);
  };

  const renderDots = () => {
    if (!dots) return;
    dots.innerHTML = cards.map((_, index) => (
      `<button class="banner-dot" type="button" role="tab" aria-label="Go to gallery image ${index + 1}" aria-selected="false" data-index="${index}"></button>`
    )).join('');
    dotButtons = Array.from(dots.querySelectorAll('.banner-dot'));
  };

  const updateMeta = (index) => {
    const count = cards.length;
    const safeIndex = ((Math.round(index) % count) + count) % count;
    if (safeIndex === lastMetaIndex) return;
    lastMetaIndex = safeIndex;
    dotButtons.forEach((button, idx) => {
      const isActive = idx === safeIndex;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
    });
    thumbs.forEach((button, idx) => {
      button.classList.toggle('is-active', idx === safeIndex);
    });
    lightboxThumbs.forEach((button, idx) => {
      button.classList.toggle('is-active', idx === safeIndex);
    });
    if (caption) {
      const label = safeIndex === 0 && cards.length > 2
        ? 'Gallery Highlight'
        : `Gallery Card ${String(safeIndex + 1).padStart(2, '0')}`;
      caption.textContent = label;
    }
  };

  const measure = () => {
    const cardWidth = cards[0].offsetWidth || 160;
    cardSpacing = Math.max(150, Math.min(240, cardWidth * 0.8));
  };

  const circularOffset = (index, progressIndex, count) => {
    const half = count / 2;
    let offset = index - progressIndex;
    offset = ((offset % count) + count) % count;
    if (offset > half) offset -= count;
    return offset;
  };

  const updateCards = (progressIndex, animate = true) => {
    const count = cards.length;
    const safeActiveIndex = ((Math.round(progressIndex) % count) + count) % count;
    cards.forEach((card, index) => {
      const offset = circularOffset(index, progressIndex, count);
      const abs = Math.abs(offset);
      const scale = 1 - Math.min(abs, 2) * 0.12;
      const rotate = offset * -8;
      const translateX = offset * cardSpacing;
      const opacity = abs > 2.4 ? 0 : 1 - Math.max(0, abs - 1.2) * 0.35;
      card.style.transition = animate ? 'transform 500ms ease, opacity 500ms ease' : 'none';
      card.style.transform = `translate(-50%, -50%) translateX(${translateX}px) scale(${scale}) rotateY(${rotate}deg)`;
      card.style.opacity = opacity;
      card.style.zIndex = String(100 - Math.round(abs * 10));
      card.classList.toggle('is-active', index === safeActiveIndex);
      card.setAttribute('aria-hidden', index === safeActiveIndex ? 'false' : 'true');
    });
    updateMeta(safeActiveIndex);
  };

  const closeLightbox = () => {
    if (!lightbox || !lightboxImage) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage.removeAttribute('src');
    lightboxImage.alt = '';
    lightboxToggle?.setAttribute('aria-expanded', 'false');
    lightboxGrid?.classList.remove('is-open');
    document.body.classList.remove('banner-no-scroll');
    if (!prefersReduced && !(grid?.matches?.(':hover'))) startAutoplay();
  };

  const openLightbox = (src, alt) => {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = src;
    lightboxImage.alt = alt || 'Gallery image';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('banner-no-scroll');
    stopAutoplay();
  };

  const snapToIndex = (index) => {
    const count = cards.length;
    activeIndex = (index + count) % count;
    autoplayProgress = activeIndex;
    setOverlayActive(true);
    updateCards(activeIndex, true);
  };

  const next = () => snapToIndex(activeIndex + 1);
  const prev = () => snapToIndex(activeIndex - 1);

  const startAutoplay = () => {
    if (prefersReduced) return;
    stopAutoplay();
    autoplayLastTime = performance.now();
    const secondsPerSlide = 12;

    const tick = (now) => {
      autoplayRafId = window.requestAnimationFrame(tick);

      if (isDragging) {
        autoplayLastTime = now;
        return;
      }

      if (lightbox?.classList.contains('is-open')) {
        autoplayLastTime = now;
        return;
      }

      const dt = Math.max(0, now - autoplayLastTime);
      autoplayLastTime = now;

      autoplayProgress += dt / (secondsPerSlide * 1000);
      const count = cards.length;
      if (autoplayProgress >= count) autoplayProgress -= count;
      if (autoplayProgress < 0) autoplayProgress += count;

      activeIndex = autoplayProgress;
      updateCards(autoplayProgress, false);
    };

    autoplayRafId = window.requestAnimationFrame(tick);
  };

  const stopAutoplay = () => {
    if (autoplayRafId) {
      window.cancelAnimationFrame(autoplayRafId);
      autoplayRafId = null;
    }
  };

  track.addEventListener('transitionend', () => {
    setOverlayActive(false);
  });

  const onPointerDown = (clientX) => {
    isDragging = true;
    dragStartX = clientX;
    dragStartIndex = activeIndex;
    dragDeltaX = 0;
    dragDeltaY = 0;
    grid.classList.add('is-dragging');
    stopAutoplay();
    updateCards(activeIndex, false);
  };

  const onPointerMove = (clientX, clientY) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartX;
    dragDeltaX = deltaX;
    dragDeltaY = clientY;
    const progress = dragStartIndex - deltaX / cardSpacing;
    updateCards(progress, false);
    activeIndex = progress;
    autoplayProgress = progress;
  };

  const onPointerUp = (event) => {
    if (!isDragging) return;
    isDragging = false;
    grid.classList.remove('is-dragging');
    const snappedIndex = Math.round(activeIndex);
    snapToIndex(snappedIndex);
    if (!prefersReduced) startAutoplay();

    const isTap = Math.abs(dragDeltaX) < 6;
    if (!isTap) {
      pointerDownTarget = null;
      return;
    }

    const target = pointerDownTarget || event.target;
    pointerDownTarget = null;
    const card = target?.closest?.('.banner-card');
    if (!card) return;
    const image = card.querySelector('img');
    if (!image) return;
    openLightbox(image.currentSrc || image.src, image.alt);
  };

  grid.addEventListener('mouseenter', stopAutoplay);
  grid.addEventListener('mouseleave', startAutoplay);
  grid.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    grid.setPointerCapture(e.pointerId);
    pointerDownTarget = e.target;
    onPointerDown(e.clientX);
  });
  grid.addEventListener('pointermove', (e) => {
    onPointerMove(e.clientX, e.clientY);
  });
  grid.addEventListener('pointerup', onPointerUp);
  grid.addEventListener('pointercancel', onPointerUp);

  dots?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-index]');
    if (!target) return;
    const index = Number(target.getAttribute('data-index'));
    if (Number.isNaN(index)) return;
    snapToIndex(index);
  });

  const onThumbClick = (event) => {
    const target = event.target.closest('[data-index]');
    if (!target) return;
    const index = Number(target.getAttribute('data-index'));
    if (Number.isNaN(index)) return;
    snapToIndex(index);
    if (lightbox?.classList.contains('is-open')) {
      const activeCard = cards[index];
      const image = activeCard?.querySelector('img');
      if (image) openLightbox(image.currentSrc || image.src, image.alt);
    }
  };

  root.querySelector('.banner-gallery-thumbs')?.addEventListener('click', onThumbClick);
  lightboxGrid?.addEventListener('click', onThumbClick);

  lightbox?.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close"]')) {
      closeLightbox();
    }
    if (event.target.closest('[data-action="toggle-grid"]')) {
      const isOpen = lightboxGrid?.classList.toggle('is-open');
      lightboxToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (lightbox?.classList.contains('is-open')) {
      closeLightbox();
    }
  });

  window.addEventListener('resize', () => {
    measure();
    updateCards(autoplayProgress, false);
  });

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  measure();
  renderDots();
  snapToIndex(0);
  if (!prefersReduced) startAutoplay();
}
