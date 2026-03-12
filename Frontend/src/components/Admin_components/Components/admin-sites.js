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

function isMeaningfulAdminValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function mergeAdminSiteRow(baseRow = {}, incomingRow = {}) {
  const merged = { ...baseRow };

  Object.entries(incomingRow || {}).forEach(([key, value]) => {
    if (isMeaningfulAdminValue(value) || !(key in merged)) {
      merged[key] = value;
    }
  });

  return merged;
}

export async function fetchAdminSites() {
  let communityRows = [];
  let generatedRows = [];
  adminDebug('fetchAdminSites:start', {
    selectedSite: resolveSelectedAdminSite(),
  });

  try {
    const communityPayload = await fetchAdminJsonWithFallback(
      'generate/community-selections',
      {},
      { headers: getAdminHeaders() },
    );
    communityRows = Array.isArray(communityPayload?.data) ? communityPayload.data : [];
    adminDebug('fetchAdminSites:community-selections', communityRows);
  } catch (error) {
    adminDebug('fetchAdminSites:community-selections:error', error?.message || String(error));
  }

  try {
    const payload = await fetchAdminJsonWithFallback(
      'generate/generated-websites',
      {},
      { headers: getAdminHeaders() },
    );
    generatedRows = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.websites)
        ? payload.websites
        : [];
    adminDebug('fetchAdminSites:generated-websites', generatedRows);
  } catch (error) {
    adminDebug('fetchAdminSites:generated-websites:error', error?.message || String(error));
  }

  const mergedByDomain = new Map();
  const pushRows = (rows, source) => {
    (rows || []).forEach((row) => {
      const domain = normalizeAdminSiteSlug(
        row?.domain || row?.community_type || row?.community_name || row?.site_name || '',
      );
      if (!domain) return;

      const existing = mergedByDomain.get(domain) || {};
      const generatedRecordId = source === 'generated'
        ? Number(row?.generated_website_id ?? row?.id ?? 0) || null
        : (existing.generated_website_id ?? null);

      mergedByDomain.set(
        domain,
        mergeAdminSiteRow(existing, {
          ...row,
          domain,
          generated_website_id: generatedRecordId,
        }),
      );
    });
  };

  pushRows(communityRows, 'community');
  pushRows(generatedRows, 'generated');

  const rows = Array.from(mergedByDomain.values());
  if (!rows.length) {
    adminDebug('fetchAdminSites:mapped', []);
    return [];
  }

  const mapped = rows
    .map((row, index) => {
      const domain = normalizeAdminSiteSlug(
        row?.domain || row?.community_type || row?.community_name || row?.site_name || '',
      );
      const siteName = String(row?.site_name || row?.name || row?.community_name || domain).trim();
      const parsedCommunityId = Number(row?.community_id ?? row?.id ?? 0);
      const parsedSiteId = Number(row?.site_id ?? 0);
      const parsedGeneratedId = Number(row?.generated_website_id ?? 0);
      const parsedId = Number.isFinite(parsedGeneratedId) && parsedGeneratedId > 0
        ? parsedGeneratedId
        : (Number.isFinite(parsedCommunityId) && parsedCommunityId > 0
          ? parsedCommunityId
          : (Number.isFinite(parsedSiteId) && parsedSiteId > 0 ? parsedSiteId : Number(row?.id ?? 0)));
      return {
        id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : index + 1,
        generated_website_id: Number.isFinite(parsedGeneratedId) && parsedGeneratedId > 0 ? parsedGeneratedId : null,
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
        font_type: row?.font_type ?? '',
        font_name: row?.font_name ?? '',
        font_url: row?.font_url ?? '',
        font_heading: row?.font_heading ?? '',
        font_body: row?.font_body ?? '',
        font_size_base: row?.font_size_base ?? '',
        line_height: row?.line_height ?? '',
        letter_spacing: row?.letter_spacing ?? '',
        palette: row?.palette ?? [],
        typography: row?.typography ?? {},
        theme: row?.theme ?? {},
        nav_position: row?.nav_position ?? '',
        logo: row?.logo ?? '',
        banner: row?.banner ?? row?.banner_link ?? '',
        group_photo: row?.group_photo ?? row?.groupPhoto ?? '',
        lead_image: row?.lead_image ?? row?.leadImage ?? '',
        banner_link: row?.banner_link ?? row?.bannerLink ?? '',
        instagram_url: row?.instagram_url ?? '',
        facebook_url: row?.facebook_url ?? '',
        tiktok_url: row?.tiktok_url ?? '',
        spotify_url: row?.spotify_url ?? '',
        x_url: row?.x_url ?? '',
        youtube_url: row?.youtube_url ?? '',
        banner: row?.banner ?? '',
        members: Array.isArray(row?.members) ? row.members : [],
      };
    })
    .filter(Boolean);

  adminDebug('fetchAdminSites:mapped', mapped);
  return mapped;
}
