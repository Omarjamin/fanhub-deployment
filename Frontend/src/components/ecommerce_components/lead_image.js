import api from '../../lib/api.js';
import { getActiveSiteSlug } from '../../lib/site-context.js';

const SOCIAL_ICONS = {
  instagram: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980429/instagram_zwwjvb.png',
  facebook: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980422/facebook_otf7ub.png',
  tiktok: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980419/tiktok_i3uoas.png',
  spotify: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980414/spotify_n9ygps.png',
  x: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980413/twitter_jzfvjn.png',
  youtube: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980408/youtube_mrubg2.png',
};

function resolveSiteSlug(data = {}) {
  const candidate = String(
    data?.siteSlug ||
    data?.site_slug ||
    data?.domain ||
    data?.community_type ||
    sessionStorage.getItem('site_slug') ||
    sessionStorage.getItem('community_type') ||
    ''
  ).trim().toLowerCase();

  return getActiveSiteSlug(candidate) || candidate;
}

function getSiteDisplayName(data = {}) {
  const candidate = String(
    data?.site_name ||
    data?.community_name ||
    data?.name ||
    ''
  ).trim();

  if (candidate) return candidate;

  const siteSlug = resolveSiteSlug(data);
  return siteSlug ? siteSlug.toUpperCase() : 'Community';
}

function normalizeSocials(payload = {}) {
  return [
    { key: 'instagram', href: String(payload?.instagram_url || '').trim(), label: 'Instagram' },
    { key: 'facebook', href: String(payload?.facebook_url || '').trim(), label: 'Facebook' },
    { key: 'tiktok', href: String(payload?.tiktok_url || '').trim(), label: 'TikTok' },
    { key: 'spotify', href: String(payload?.spotify_url || '').trim(), label: 'Spotify' },
    { key: 'x', href: String(payload?.x_url || '').trim(), label: 'X' },
    { key: 'youtube', href: String(payload?.youtube_url || '').trim(), label: 'YouTube' },
  ].filter((item) => item.href);
}

function buildHeroCopy(payload = {}, siteName = 'Community', siteSlug = '') {
  const rawDescription = String(
    payload?.short_bio ||
    payload?.description ||
    payload?.about ||
    payload?.tagline ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
  const description = rawDescription
    ? rawDescription.slice(0, 180).trim()
    : `Shop curated merch, catch the latest highlights, and stay close to ${siteName} through one polished fan experience.`;

  return {
    kicker: 'Official Fan Hub',
    title: `Step Into ${siteName}`,
    description,
    primaryLabel: 'Shop Now',
    primaryHref: siteSlug ? `/fanhub/${encodeURIComponent(siteSlug)}/shop` : '/shop',
    secondaryLabel: 'View Gallery',
    secondaryHref: '#home',
  };
}

function renderSection(root, leadImage, socials, siteName, heroCopy) {
  const existing = root.querySelector('.ec-lead-image');
  if (!leadImage && socials.length === 0) {
    existing?.remove();
    return;
  }

  const markup = `
    ${leadImage ? `
      <img
        class="ec-lead-image__img"
        src="${leadImage}"
        alt="${siteName} lead visual"
        loading="eager"
        decoding="async"
      />
    ` : ''}
    <div class="ec-lead-image__scrim" aria-hidden="true"></div>
    <div class="ec-lead-image__content">
      <span class="ec-lead-image__kicker">${heroCopy.kicker}</span>
      <h1 class="ec-lead-image__title">${heroCopy.title}</h1>
      <p class="ec-lead-image__description">${heroCopy.description}</p>
      <div class="ec-lead-image__actions">
        <a href="${heroCopy.primaryHref}" class="ec-lead-image__cta ec-lead-image__cta--primary">${heroCopy.primaryLabel}</a>
        <a href="${heroCopy.secondaryHref}" class="ec-lead-image__cta ec-lead-image__cta--secondary">${heroCopy.secondaryLabel}</a>
      </div>
    </div>
    ${socials.length ? `
      <div class="ec-lead-image__socials" aria-label="${siteName} social links">
        ${socials.map((item) => `
          <a href="${item.href}" target="_blank" rel="noopener noreferrer" class="ec-lead-image__social" data-platform="${item.key}" aria-label="${siteName} ${item.label}">
            <img src="${SOCIAL_ICONS[item.key]}" alt="${item.label}">
          </a>
        `).join('')}
      </div>
    ` : ''}
  `;

  if (existing) {
    existing.setAttribute('aria-label', `${siteName} lead image section`);
    existing.innerHTML = markup;
    if (root.firstElementChild !== existing) {
      root.insertBefore(existing, root.firstElementChild);
    }
    return;
  }

  const section = document.createElement('section');
  section.className = 'ec-lead-image';
  section.setAttribute('aria-label', `${siteName} lead image section`);
  section.innerHTML = markup;
  root.insertBefore(section, root.firstElementChild);
}

export default function LeadImage(root, data = {}) {
  const siteSlug = resolveSiteSlug(data);
  const siteName = getSiteDisplayName(data);
  const initialLeadImage = String(data?.lead_image || '').trim();
  const initialSocials = normalizeSocials(data);
  const initialHeroCopy = buildHeroCopy(data, siteName, siteSlug);

  renderSection(root, initialLeadImage, initialSocials, siteName, initialHeroCopy);

  (async () => {
    try {
      if (!siteSlug) return;
      const res = await api.get(`/generate/generated-websites/type/${encodeURIComponent(siteSlug)}`);
      const payload = res?.data?.data || {};
      const leadImage = String(payload?.lead_image || initialLeadImage).trim();
      const socials = normalizeSocials(payload);
      const resolvedSocials = socials.length ? socials : initialSocials;
      const heroCopy = buildHeroCopy(payload, getSiteDisplayName(payload) || siteName, siteSlug);
      renderSection(root, leadImage, resolvedSocials, siteName, heroCopy);
    } catch (error) {
      console.error('Lead image fetch failed:', error?.response?.data || error?.message || error);
      renderSection(root, initialLeadImage, initialSocials, siteName, initialHeroCopy);
    }
  })();
}
