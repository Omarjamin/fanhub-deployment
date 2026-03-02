const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4000/v1/admin';
const API_KEY = (import.meta.env.VITE_API_KEY || 'thread').trim() || 'thread';
const ADMIN_SELECTED_SITE_KEY = 'admin_selected_site';

function resolveSelectedAdminSite() {
  const fromStorage = String(
    sessionStorage.getItem(ADMIN_SELECTED_SITE_KEY) ||
    sessionStorage.getItem('site_slug') ||
    ''
  ).trim().toLowerCase();

  if (fromStorage && fromStorage !== 'all') return fromStorage;

  const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
  if (parts[0] === 'fanhub' && parts[1] && parts[1] !== 'community-platform') {
    return String(parts[1]).trim().toLowerCase();
  }

  return '';
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
  if (selectedSite) headers['x-site-slug'] = selectedSite;
  return headers;
}

export async function fetchAdminSites() {
  const res = await fetch(`${ADMIN_API_BASE}/generate/generated-websites`, {
    method: 'GET',
    headers: getAdminHeaders(),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${res.status}`);
  }

  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.websites)
      ? payload.websites
      : [];

  const seen = new Set();
  return rows
    .map((row, index) => {
      const domain = String(row?.domain || '').trim().toLowerCase();
      const siteName = String(row?.site_name || row?.name || domain).trim();
      if (!domain || seen.has(domain)) return null;
      seen.add(domain);
      const parsedId = Number(row?.site_id ?? row?.id ?? 0);
      return {
        id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : index + 1,
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
        members: Array.isArray(row?.members) ? row.members : [],
      };
    })
    .filter(Boolean);
}
