import { api } from '../config.js';
import { authHeaders, setSiteSlug } from '../auth/auth.js';

function resolveSiteSlug(explicitSiteSlug = '') {
  const direct = String(explicitSiteSlug || '').trim().toLowerCase();
  if (direct) return setSiteSlug(direct);

  const fromStorage = String(
    sessionStorage.getItem('site_slug') || localStorage.getItem('site_slug') || ''
  ).trim().toLowerCase();
  if (fromStorage) return fromStorage;

  const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
  if (parts[0] === 'fanhub' && parts[1]) return setSiteSlug(parts[1]);

  return '';
}

// Fetch product details + variants from backend and return { product, variants }
export async function fetchProductDetails(productId, siteSlug = '') {
  console.log("Fetching product details for ID:", productId);
  const activeSiteSlug = resolveSiteSlug(siteSlug);
  const headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders());
  const query = activeSiteSlug ? `?site_slug=${encodeURIComponent(activeSiteSlug)}` : '';
  const resp = await fetch(api(`/shop/getProductDetails/${productId}${query}`), { method: 'GET', headers });
  if (!resp.ok) {
    const err = await resp.json().catch(()=>({ message: 'unknown' }));
    throw new Error(err.message || `HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const product = data?.data?.product || data?.product || null;
  const variants = data?.data?.variants || data?.variants || [];
  return { product, variants };
}

// provide a default export for compatibility with components importing default
export default fetchProductDetails;
