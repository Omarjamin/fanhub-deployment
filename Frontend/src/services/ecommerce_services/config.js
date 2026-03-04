// Centralized frontend API base

const DEFAULT_API_V1 = 'https://fanhub-deployment-production.up.railway.app/v1';
const DEFAULT_ECOMMERCE_API = `${DEFAULT_API_V1}/ecommerce`;

function normalizeEcommerceBase(raw = '') {
  const base = String(raw || '').trim().replace(/\/$/, '');
  if (!base) return DEFAULT_ECOMMERCE_API;
  if (/\/ecommerce$/i.test(base)) return base;
  return `${base}/ecommerce`;
}

const ECOMMERCE_URL = normalizeEcommerceBase(import.meta.env.VITE_ECOMMERCE_API_URL || DEFAULT_ECOMMERCE_API);
export const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  ECOMMERCE_URL;

export function api(path) {
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default { API_BASE, api };



