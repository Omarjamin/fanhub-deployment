function toCleanString(value) {
  return String(value || '').trim();
}

function isYouTubeUrl(value) {
  const raw = toCleanString(value).toLowerCase();
  return raw.includes('youtube.com') || raw.includes('youtu.be');
}

function isSupportedBannerUrl(value) {
  const raw = toCleanString(value);
  if (!raw || isYouTubeUrl(raw)) return false;
  return true;
}

function pushBannerUrl(target, value) {
  const raw = toCleanString(value);
  if (!isSupportedBannerUrl(raw)) return;
  if (!target.includes(raw)) {
    target.push(raw);
  }
}

function appendBannerUrls(target, value) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach((entry) => appendBannerUrls(target, entry));
    return;
  }

  if (typeof value === 'object') {
    appendBannerUrls(
      target,
      value.url || value.src || value.image || value.image_url || value.secure_url || value.path || '',
    );
    return;
  }

  if (typeof value !== 'string') return;

  const raw = value.trim();
  if (!raw) return;

  if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
    try {
      const parsed = JSON.parse(raw);
      appendBannerUrls(target, parsed);
      return;
    } catch (_) {}
  }

  pushBannerUrl(target, raw);
}

export function normalizeBannerGallery(...values) {
  const images = [];
  values.forEach((value) => appendBannerUrls(images, value));
  return images;
}

export function resolvePrimaryBannerImage(...values) {
  return normalizeBannerGallery(...values)[0] || '';
}

export function hasBannerGallery(...values) {
  return normalizeBannerGallery(...values).length > 0;
}
