// Centralized frontend API base

const DEFAULT_API_V1 = 'https://fanhub-deployment-production.up.railway.app/v1';
const DEFAULT_ECOMMERCE_API = `${DEFAULT_API_V1}/ecommerce`;

const ECOMMERCE_URL = String(import.meta.env.VITE_ECOMMERCE_API_URL || DEFAULT_ECOMMERCE_API).trim().replace(/\/$/, '');
export const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  ECOMMERCE_URL;

export function api(path) {
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default { API_BASE, api };



