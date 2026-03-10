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

function renderSection(root, leadImage, socials, siteLabel) {
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
        alt="${siteLabel} lead visual"
        loading="eager"
        decoding="async"
      />
    ` : ''}
    ${socials.length ? `
      <div class="ec-lead-image__socials" aria-label="${siteLabel} social links">
        ${socials.map((item) => `
          <a href="${item.href}" target="_blank" rel="noopener noreferrer" class="ec-lead-image__social" data-platform="${item.key}" aria-label="${siteLabel} ${item.label}">
            <img src="${SOCIAL_ICONS[item.key]}" alt="${item.label}">
          </a>
        `).join('')}
      </div>
    ` : ''}
  `;

  if (existing) {
    existing.setAttribute('aria-label', `${siteLabel} lead image section`);
    existing.innerHTML = markup;
    if (root.firstElementChild !== existing) {
      root.insertBefore(existing, root.firstElementChild);
    }
    return;
  }

  const section = document.createElement('section');
  section.className = 'ec-lead-image';
  section.setAttribute('aria-label', `${siteLabel} lead image section`);
  section.innerHTML = markup;
  root.insertBefore(section, root.firstElementChild);
}

export default function LeadImage(root, data = {}) {
  const siteSlug = resolveSiteSlug(data);
  const siteLabel = String(siteSlug || data?.site_name || 'Community').trim().toUpperCase();
  const initialLeadImage = String(data?.lead_image || '').trim();
  const initialSocials = normalizeSocials(data);

  renderSection(root, initialLeadImage, initialSocials, siteLabel);

  (async () => {
    try {
      if (!siteSlug) return;
      const res = await api.get(`/generate/generated-websites/type/${encodeURIComponent(siteSlug)}`);
      const payload = res?.data?.data || {};
      const leadImage = String(payload?.lead_image || initialLeadImage).trim();
      const socials = normalizeSocials(payload);
      const resolvedSocials = socials.length ? socials : initialSocials;
      renderSection(root, leadImage, resolvedSocials, siteLabel);
    } catch (error) {
      console.error('Lead image fetch failed:', error?.response?.data || error?.message || error);
      renderSection(root, initialLeadImage, initialSocials, siteLabel);
    }
  })();
}
