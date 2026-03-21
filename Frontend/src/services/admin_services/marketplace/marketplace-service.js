import { api } from '../../ecommerce_services/api.js';
import { fetchAdminJsonWithFallback, getAdminHeaders } from '../../../components/Admin_components/Components/admin-sites.js';

const DEFAULT_ADMIN_API_BASE = 'https://fanhub-deployment-production.up.railway.app/v1/admin';
function resolveAdminApiBase() {
  const raw = String(import.meta.env.VITE_ADMIN_API_URL || '').trim().replace(/\/+$/, '');
  const normalized = raw.toLowerCase();
  const unusable =
    !raw ||
    normalized === 'thread' ||
    normalized === 'null' ||
    normalized === 'undefined';
  if (unusable) return DEFAULT_ADMIN_API_BASE;
  if (/^https?:\/\//i.test(raw)) return raw;
  return DEFAULT_ADMIN_API_BASE;
}
const ADMIN_API_BASE = resolveAdminApiBase();
const BASE_V1 = import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1';
const API_V1_BASE = String(BASE_V1 || 'https://fanhub-deployment-production.up.railway.app/v1')
  .trim()
  .replace(/\/+$/, '');
const STOREFRONT_API_BASE = `${API_V1_BASE}/ecommerce`;
const API_KEY = import.meta.env.VITE_API_KEY || 'thread';

function getAuthToken() {
  return String(
    sessionStorage.getItem('adminAuthToken') ||
    localStorage.getItem('adminAuthToken') ||
    ''
  ).trim();
}

function getAdminRequestOptions() {
  const token = getAuthToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers };
}

async function readJsonOrThrow(res) {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const baseMessage = payload?.error || payload?.message || `HTTP ${res.status}`;
    const details = String(payload?.details || '').trim();
    const message = details && !baseMessage.includes(details)
      ? `${baseMessage}: ${details}`
      : baseMessage;
    throw new Error(message);
  }
  return payload;
}

function buildStorefrontHeaders(siteSlug = '') {
  const normalizedSiteSlug = String(siteSlug || '').trim().toLowerCase();
  const headers = {
    apikey: API_KEY,
    ...getAdminHeaders(),
  };
  if (normalizedSiteSlug) {
    headers['x-site-slug'] = normalizedSiteSlug;
    headers['x-community-type'] = normalizedSiteSlug;
  }
  return headers;
}

async function fetchStorefrontJson(path, siteSlug = '') {
  const normalizedPath = String(path || '').trim();
  const normalizedSiteSlug = String(siteSlug || '').trim().toLowerCase();
  const query = new URLSearchParams();
  if (normalizedSiteSlug) {
    query.set('site_slug', normalizedSiteSlug);
  }
  const url = `${STOREFRONT_API_BASE}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}${
    query.toString() ? `?${query.toString()}` : ''
  }`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildStorefrontHeaders(normalizedSiteSlug),
  });
  return readJsonOrThrow(response);
}

export async function fetchAdminCommunities() {
  const res = await api(
    `${ADMIN_API_BASE}/generate/generated-websites`,
    getAdminRequestOptions(),
  );
  const payload = await readJsonOrThrow(res);
  return Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.websites)
      ? payload.websites
      : Array.isArray(payload?.result)
        ? payload.result
        : [];
}

export async function fetchMarketplaceProducts(community, communityId = null) {
  const payload = await fetchAdminJsonWithFallback(
    'marketplace',
    {
      ...(community ? { community: String(community).toLowerCase() } : {}),
      ...(communityId && Number(communityId) > 0 ? { community_id: String(communityId) } : {}),
    },
    { headers: getAdminHeaders() },
  );
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchMarketplaceCollections(community, communityId = null) {
  const payload = await fetchAdminJsonWithFallback(
    'marketplace/collections',
    {
      ...(community ? { community: String(community).toLowerCase() } : {}),
      ...(communityId && Number(communityId) > 0 ? { community_id: String(communityId) } : {}),
    },
    { headers: getAdminHeaders() },
  );
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function createMarketplaceCollection({ community, community_id, name, img_url }) {
  const res = await api(`${ADMIN_API_BASE}/marketplace/collections`, {
    ...getAdminRequestOptions(),
    method: 'POST',
    body: JSON.stringify({ community, community_id, name, img_url }),
  });
  return readJsonOrThrow(res);
}

export async function fetchMarketplaceCategories({ community, community_id, collectionId }) {
  const payload = await fetchAdminJsonWithFallback(
    'marketplace/categories',
    {
      community: String(community || '').toLowerCase(),
      ...(community_id && Number(community_id) > 0 ? { community_id: String(community_id) } : {}),
      ...(collectionId ? { collection_id: String(collectionId) } : {}),
    },
    { headers: getAdminHeaders() },
  );
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchStorefrontCollections(community) {
  const payload = await fetchStorefrontJson('/shop/getCollections', community);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchStorefrontProductsByCollection(collectionId, community) {
  const payload = await fetchStorefrontJson(
    `/shop/getProductCollection/${encodeURIComponent(collectionId)}`,
    community,
  );
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchStorefrontProductDetails(productId, community) {
  const payload = await fetchStorefrontJson(
    `/shop/getProductDetails/${encodeURIComponent(productId)}`,
    community,
  );
  return {
    product: payload?.data?.product || payload?.product || null,
    variants: Array.isArray(payload?.data?.variants)
      ? payload.data.variants
      : (Array.isArray(payload?.variants) ? payload.variants : []),
  };
}

export async function createMarketplaceCategory(payload) {
  const res = await api(`${ADMIN_API_BASE}/marketplace/categories`, {
    ...getAdminRequestOptions(),
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(res);
}

export async function createMarketplaceProduct(payload, community, communityId = null) {
  const params = new URLSearchParams();
  if (community) params.set('community', String(community).toLowerCase());
  if (communityId && Number(communityId) > 0) params.set('community_id', String(communityId));
  const url = `${ADMIN_API_BASE}/marketplace${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  const res = await api(url, {
    ...getAdminRequestOptions(),
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(res);
}

export async function updateMarketplaceProduct(productId, payload, community, communityId = null) {
  const params = new URLSearchParams();
  if (community) params.set('community', String(community).toLowerCase());
  if (communityId && Number(communityId) > 0) params.set('community_id', String(communityId));
  const url = `${ADMIN_API_BASE}/marketplace/${productId}${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  const res = await api(url, {
    ...getAdminRequestOptions(),
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(res);
}

export async function deleteMarketplaceProduct(productId, community, communityId = null) {
  const params = new URLSearchParams();
  if (community) params.set('community', String(community).toLowerCase());
  if (communityId && Number(communityId) > 0) params.set('community_id', String(communityId));
  const url = `${ADMIN_API_BASE}/marketplace/${productId}${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  const res = await api(url, {
    ...getAdminRequestOptions(),
    method: 'DELETE',
  });
  return readJsonOrThrow(res);
}

export async function uploadMarketplaceImage(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('image_file', file);

  const headers = { apikey: API_KEY };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${BASE_V1}/bini/cloudinary/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.url) {
      throw new Error(result.message || 'Image upload failed');
    }
    return result.url;
  } catch (error) {
    console.error('Image upload failed, continuing without new image:', error);
    return null;
  }
}



