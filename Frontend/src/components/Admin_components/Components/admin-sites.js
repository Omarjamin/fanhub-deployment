const API_KEY = (import.meta.env.VITE_API_KEY || 'thread').trim() || 'thread';
const ADMIN_SELECTED_SITE_KEY = 'admin_selected_site';
const ADMIN_DEBUG = true;

function resolveAdminApiBase() {
  const preferred = String(import.meta.env.VITE_ADMIN_API_URL || '').trim();
  const fallback = String(
    import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1',
  ).trim();

  const isUsable = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === 'thread' || normalized === 'null' || normalized === 'undefined') return false;
    return true;
  };

  return isUsable(preferred) ? preferred : fallback;
}

const ADMIN_API_BASE = resolveAdminApiBase();

function adminDebug(label, payload) {
  if (!ADMIN_DEBUG) return;
  if (payload === undefined) {
    console.log(`[ADMIN DEBUG] ${label}`);
    return;
  }
  console.log(`[ADMIN DEBUG] ${label}`, payload);
}

export function normalizeAdminSiteSlug(value, { allowAll = false } = {}) {
  const normalized = decodeURIComponent(String(value || ''))
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/-website$/, '');

  if (!normalized) return '';
  if (normalized === 'all') return allowAll ? 'all' : '';
  if (normalized === 'community-platform') return '';
  return normalized;
}

export function resolveSelectedAdminSite() {
  const fromStorage = normalizeAdminSiteSlug(String(
    sessionStorage.getItem(ADMIN_SELECTED_SITE_KEY) ||
    sessionStorage.getItem('site_slug') ||
    ''
  ));

  if (fromStorage) return fromStorage;

  const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
  if (parts[0] === 'fanhub' && parts[1] === 'community-platform' && parts[2]) {
    return normalizeAdminSiteSlug(parts[2]);
  }
  if (parts[0] === 'fanhub' && parts[1] && parts[1] !== 'community-platform') {
    return normalizeAdminSiteSlug(parts[1]);
  }

  return '';
}

export function resolveAdminSiteFromPath() {
  const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
  if (parts[0] === 'fanhub' && parts[1] && parts[1] !== 'community-platform') {
    return normalizeAdminSiteSlug(parts[1]);
  }
  if (parts[0] === 'fanhub' && parts[1] === 'community-platform' && parts[2]) {
    return normalizeAdminSiteSlug(parts[2]);
  }
  return '';
}

export function getAdminApiBase() {
  return ADMIN_API_BASE;
}

function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    query.set(key, normalized);
  });
  return query.toString();
}

export function resolveAdminEndpointUrls(endpointPath, params = {}, rawBase = ADMIN_API_BASE) {
  const urls = [];
  const push = (value) => {
    const normalized = String(value || '').trim().replace(/\/+$/, '');
    if (!normalized) return;
    if (!urls.includes(normalized)) urls.push(normalized);
  };

  const endpoint = String(endpointPath || '').trim().replace(/^\/+/, '');
  const query = buildQueryString(params);
  const pathWithQuery = query ? `${endpoint}?${query}` : endpoint;
  const trimmedBase = String(rawBase || '').trim().replace(/\/+$/, '');
  const baseLooksLikeUrl =
    /^https?:\/\//i.test(trimmedBase) ||
    trimmedBase.startsWith('/') ||
    trimmedBase.includes('/v1') ||
    trimmedBase.includes('/admin');

  if (trimmedBase && baseLooksLikeUrl) {
    if (/\/v1\/admin$/i.test(trimmedBase)) {
      push(`${trimmedBase}/${pathWithQuery}`);
    } else if (/\/admin$/i.test(trimmedBase)) {
      push(`${trimmedBase}/${pathWithQuery}`);
      push(`${trimmedBase.replace(/\/admin$/i, '/v1/admin')}/${pathWithQuery}`);
    } else if (/\/v1$/i.test(trimmedBase)) {
      push(`${trimmedBase}/admin/${pathWithQuery}`);
    } else {
      push(`${trimmedBase}/admin/${pathWithQuery}`);
      push(`${trimmedBase}/v1/admin/${pathWithQuery}`);
    }
  } else if (trimmedBase) {
    adminDebug('resolveAdminEndpointUrls:ignored-invalid-base', { rawBase: trimmedBase });
  }

  const apiOrigin = String(window.__API_ORIGIN__ || '').trim().replace(/\/+$/, '');
  if (apiOrigin) {
    push(`${apiOrigin}/v1/admin/${pathWithQuery}`);
    push(`${apiOrigin}/admin/${pathWithQuery}`);
  }

  push(`https://fanhub-deployment-production.up.railway.app/v1/admin/${pathWithQuery}`);
  return urls;
}

export function getAdminToken() {
  const candidates = [
    sessionStorage.getItem('adminAuthToken'),
    sessionStorage.getItem('token'),
    sessionStorage.getItem('authToken'),
    localStorage.getItem('adminAuthToken'),
    localStorage.getItem('token'),
    localStorage.getItem('authToken'),
  ];

  const selectedSite = resolveSelectedAdminSite();
  if (selectedSite) {
    candidates.unshift(sessionStorage.getItem(`authToken:${selectedSite}`));
    candidates.unshift(localStorage.getItem(`authToken:${selectedSite}`));
  }
  candidates.push(sessionStorage.getItem('authToken:global'));
  candidates.push(sessionStorage.getItem('authToken'));
  candidates.push(localStorage.getItem('authToken:global'));

  for (const raw of candidates) {
    const token = String(raw || '').trim().replace(/^Bearer\s+/i, '');
    if (!token || token === 'null' || token === 'undefined') continue;
    return token;
  }
  return '';
}

export function getAdminHeaders() {
  const headers = { apikey: API_KEY };
  const token = getAdminToken();
  const selectedSite = resolveSelectedAdminSite();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (selectedSite) {
    headers['x-site-slug'] = selectedSite;
    headers['x-community-type'] = selectedSite;
  }
  return headers;
}

export async function fetchAdminJsonWithFallback(endpointPath, params = {}, requestInit = {}) {
  const candidateUrls = resolveAdminEndpointUrls(endpointPath, params);
  adminDebug('fetchAdminJsonWithFallback:start', { endpointPath, params, candidateUrls });
  let response = null;
  let payload = {};
  let lastError = null;

  for (const candidateUrl of candidateUrls) {
    try {
      response = await fetch(candidateUrl, {
        method: 'GET',
        ...requestInit,
      });
      adminDebug('fetchAdminJsonWithFallback:attempt', {
        candidateUrl,
        status: response?.status,
      });
      const raw = await response.text().catch(() => '');
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch (_) {
          payload = { message: raw };
        }
      } else {
        payload = {};
      }
      if (response.status !== 404) break;
    } catch (error) {
      lastError = error;
      adminDebug('fetchAdminJsonWithFallback:error', {
        candidateUrl,
        message: error?.message || String(error),
      });
    }
  }

  if (!response) {
    throw (lastError || new Error('Unable to reach admin API endpoint.'));
  }

  if (!response.ok) {
    adminDebug('fetchAdminJsonWithFallback:failed', {
      endpointPath,
      status: response.status,
      payload,
    });
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }

  adminDebug('fetchAdminJsonWithFallback:success', {
    endpointPath,
    status: response.status,
    payload,
  });
  return payload;
}

export async function fetchAdminSites() {
  let rows = [];
  adminDebug('fetchAdminSites:start', {
    selectedSite: resolveSelectedAdminSite(),
  });
  try {
    const communityPayload = await fetchAdminJsonWithFallback(
      'generate/community-selections',
      {},
      { headers: getAdminHeaders() },
    );
    rows = Array.isArray(communityPayload?.data) ? communityPayload.data : [];
    adminDebug('fetchAdminSites:community-selections', rows);
  } catch (_) {
    const payload = await fetchAdminJsonWithFallback(
      'generate/generated-websites',
      {},
      { headers: getAdminHeaders() },
    );
    rows = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.websites)
        ? payload.websites
        : [];
    adminDebug('fetchAdminSites:generated-websites-fallback', rows);
  }

  const seen = new Set();
  const mapped = rows
    .map((row, index) => {
      const domain = normalizeAdminSiteSlug(
        row?.domain || row?.community_type || row?.community_name || row?.site_name || '',
      );
      const siteName = String(row?.site_name || row?.name || row?.community_name || domain).trim();
      if (!domain || seen.has(domain)) return null;
      seen.add(domain);
      const parsedCommunityId = Number(row?.community_id ?? row?.id ?? 0);
      const parsedSiteId = Number(row?.site_id ?? 0);
      const parsedId = Number.isFinite(parsedCommunityId) && parsedCommunityId > 0
        ? parsedCommunityId
        : (Number.isFinite(parsedSiteId) && parsedSiteId > 0 ? parsedSiteId : Number(row?.id ?? 0));
      return {
        id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : index + 1,
        site_id: Number.isFinite(parsedSiteId) && parsedSiteId > 0 ? parsedSiteId : null,
        community_id: Number.isFinite(parsedCommunityId) && parsedCommunityId > 0 ? parsedCommunityId : null,
        key: domain,
        domain,
        site_name: siteName || domain,
        status: String(row?.status || '').trim().toLowerCase(),
        short_bio: row?.short_bio ?? '',
        description: row?.description ?? '',
        community_type: String(row?.community_type || domain).trim().toLowerCase(),
        primary_color: row?.primary_color ?? '',
        secondary_color: row?.secondary_color ?? '',
        accent_color: row?.accent_color ?? '',
        button_style: row?.button_style ?? '',
        font_style: row?.font_style ?? '',
        nav_position: row?.nav_position ?? '',
        logo: row?.logo ?? '',
        banner: row?.banner ?? '',
        group_photo: row?.group_photo ?? '',
        lead_image: row?.lead_image ?? '',
        instagram_url: row?.instagram_url ?? '',
        facebook_url: row?.facebook_url ?? '',
        tiktok_url: row?.tiktok_url ?? '',
        spotify_url: row?.spotify_url ?? '',
        x_url: row?.x_url ?? '',
        youtube_url: row?.youtube_url ?? '',
        members: Array.isArray(row?.members) ? row.members : [],
      };
    })
    .filter(Boolean);

  adminDebug('fetchAdminSites:mapped', mapped);
  return mapped;
}
