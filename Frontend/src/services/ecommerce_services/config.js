// Centralized frontend API base


const ECOMMERCE_URL = String(import.meta.env.VITE_ECOMMERCE_API_URL || '').trim().replace(/\/$/, '');
export const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  ECOMMERCE_URL;

export function api(path) {
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default { API_BASE, api };



