const RESERVED_BINI_PAGES = new Set([
  'home',
  'profile',
  'others-profile',
  'search',
  'notifications',
  'messages',
  'message',
  'threads',
  'thread',
  'login',
  'signup',
]);

const AUTH_TOKEN_PREFIX = 'authToken:';

export function setActiveSiteSlug(siteSlug = '') {
  const value = String(siteSlug || '').trim().toLowerCase();
  if (!value) return '';

  try {
    sessionStorage.setItem('site_slug', value);
    sessionStorage.setItem('community_type', value);
  } catch (_) {}

  return value;
}

export function clearActiveSiteSlug() {
  try {
    sessionStorage.removeItem('site_slug');
    sessionStorage.removeItem('community_type');
  } catch (_) {}
}

function getTokenKey(siteSlug = '') {
  const normalized = String(siteSlug || '').trim().toLowerCase();
  return `${AUTH_TOKEN_PREFIX}${normalized || 'global'}`;
}

export function setSessionToken(token, siteSlug = '') {
  const value = String(token || '').trim();
  if (!value) return;
  const activeSite = getActiveSiteSlug(siteSlug);
  const key = getTokenKey(activeSite);
  try {
    sessionStorage.setItem(key, value);
  } catch (_) {}
}

export function getSessionToken(siteSlug = '') {
  const activeSite = getActiveSiteSlug(siteSlug);
  const candidates = [getTokenKey(activeSite), getTokenKey('global')];
  try {
    for (const key of candidates) {
      const token = String(sessionStorage.getItem(key) || '').trim();
      if (token) return token;
    }
  } catch (_) {}
  return '';
}

export function clearSessionToken(siteSlug = '') {
  const activeSite = getActiveSiteSlug(siteSlug);
  try {
    sessionStorage.removeItem(getTokenKey(activeSite));
    sessionStorage.removeItem(getTokenKey('global'));
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('currentUserId');
  } catch (_) {}
}

export function getActiveSiteSlug(preferred = '') {
  const fromArg = String(preferred || '').trim().toLowerCase();
  if (fromArg) return setActiveSiteSlug(fromArg);

  try {
    const fromStorage = String(
      sessionStorage.getItem('site_slug') ||
      sessionStorage.getItem('community_type') ||
      sessionStorage.getItem('active_site_slug') ||
      localStorage.getItem('active_site_slug') ||
      sessionStorage.getItem('admin_selected_site') ||
      ''
    ).trim().toLowerCase();
    if (fromStorage && fromStorage !== 'all' && fromStorage !== 'community-platform') {
      return setActiveSiteSlug(fromStorage);
    }

    const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
    if (parts[0] === 'fanhub' && parts[1] === 'community-platform' && parts[2]) {
      return setActiveSiteSlug(parts[2]);
    }
    if (parts[0] === 'fanhub' && parts[1] && parts[1] !== 'community-platform') {
      return setActiveSiteSlug(parts[1]);
    }
    if (parts[0] === 'bini') {
      if (!parts[1]) return setActiveSiteSlug('bini');
      const candidate = String(parts[1] || '').trim().toLowerCase();
      return setActiveSiteSlug(RESERVED_BINI_PAGES.has(candidate) ? 'bini' : candidate);
    }
  } catch (_) {}

  return '';
}

export function getSiteHeaders(preferred = '') {
  const siteSlug = getActiveSiteSlug(preferred);
  if (!siteSlug) return {};

  return {
    'x-site-slug': siteSlug,
    'x-community-type': siteSlug,
  };
}

export function getSiteCandidates(...inputs) {
  const set = new Set();
  inputs.forEach((value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized) set.add(normalized);
  });

  const active = getActiveSiteSlug();
  if (active) set.add(active);

  return Array.from(set);
}
