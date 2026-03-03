import { api } from '../../ecommerce_services/api.js';

const ADMIN_API_BASE =
  import.meta.env.VITE_ADMIN_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1/admin';
const BASE_V1 = import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1';
const API_KEY = import.meta.env.VITE_API_KEY || 'thread';

function getAuthToken() {
  return (
    localStorage.getItem('adminAuthToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('adminAuthToken') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    ''
  );
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

export async function fetchMarketplaceProducts(community) {
  const params = new URLSearchParams();
  if (community) params.append('community', String(community).toLowerCase());
  const url = `${ADMIN_API_BASE}/marketplace${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  const res = await api(url, getAdminRequestOptions());
  const payload = await readJsonOrThrow(res);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchMarketplaceCollections(community) {
  const params = new URLSearchParams();
  if (community) params.append('community', String(community).toLowerCase());
  const res = await api(
    `${ADMIN_API_BASE}/marketplace/collections?${params.toString()}`,
    getAdminRequestOptions(),
  );
  const payload = await readJsonOrThrow(res);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function createMarketplaceCollection({ community, name, img_url }) {
  const res = await api(`${ADMIN_API_BASE}/marketplace/collections`, {
    ...getAdminRequestOptions(),
    method: 'POST',
    body: JSON.stringify({ community, name, img_url }),
  });
  return readJsonOrThrow(res);
}

export async function fetchMarketplaceCategories({ community, collectionId }) {
  const params = new URLSearchParams();
  params.append('community', String(community || '').toLowerCase());
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

export async function createMarketplaceProduct(payload) {
  const res = await api(`${ADMIN_API_BASE}/marketplace`, {
    ...getAdminRequestOptions(),
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(res);
}

export async function updateMarketplaceProduct(productId, payload, community) {
  const params = new URLSearchParams();
  if (community) params.set('community', String(community).toLowerCase());
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

export async function deleteMarketplaceProduct(productId, community) {
  const params = new URLSearchParams();
  if (community) params.set('community', String(community).toLowerCase());
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


