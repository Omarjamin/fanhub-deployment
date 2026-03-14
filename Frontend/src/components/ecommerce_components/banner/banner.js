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
      <article class="banner-card ${isFeatured ? 'banner-card-featured' : ''}">
        <div class="banner-card-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(siteName)} gallery image ${index + 1}" loading="lazy">
        </div>
        <div class="banner-card-copy">
          <span class="banner-card-index">${escapeHtml(label)}</span>
          <strong class="banner-card-label">${escapeHtml(siteName)}</strong>
        </div>
      </article>
    `;
  }).join('');
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
            <span class="banner-kicker">Gallery</span>
            <h2 class="banner-title">Gallery</h2>
            <p class="banner-description">
              Explore the homepage gallery through responsive image cards sized to keep every uploaded visual clear and balanced, including sets with 10 images or more.
            </p>
          </div>
        </div>
        <div class="banner-gallery-grid">
          ${renderGalleryCards(images, siteName)}
        </div>
      </div>
    </section>
  `;
}
