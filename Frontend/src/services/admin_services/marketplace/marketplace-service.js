import { api } from '../../ecommerce_services/api.js';

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
    const message = payload?.error || payload?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return payload;
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
  const params = new URLSearchParams();
  if (community) params.append('community', String(community).toLowerCase());
  if (communityId && Number(communityId) > 0) params.append('community_id', String(communityId));
  const url = `${ADMIN_API_BASE}/marketplace${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  const res = await api(url, getAdminRequestOptions());
  const payload = await readJsonOrThrow(res);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchMarketplaceCollections(community, communityId = null) {
  const params = new URLSearchParams();
  if (community) params.append('community', String(community).toLowerCase());
  if (communityId && Number(communityId) > 0) params.append('community_id', String(communityId));
  const res = await api(
    `${ADMIN_API_BASE}/marketplace/collections?${params.toString()}`,
    getAdminRequestOptions(),
  );
  const payload = await readJsonOrThrow(res);
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
  const params = new URLSearchParams();
  params.append('community', String(community || '').toLowerCase());
  if (community_id && Number(community_id) > 0) params.append('community_id', String(community_id));
  if (collectionId) params.append('collection_id', String(collectionId));
  const res = await api(
    `${ADMIN_API_BASE}/marketplace/categories?${params.toString()}`,
    getAdminRequestOptions(),
  );
  const payload = await readJsonOrThrow(res);
  return Array.isArray(payload?.data) ? payload.data : [];
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



