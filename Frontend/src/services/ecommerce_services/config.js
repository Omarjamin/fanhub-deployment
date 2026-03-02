// Centralized frontend API base


const ECOMMERCE_URL = import.meta.env.VITE_ECOMMERCE_API_URL;
export const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || "http://localhost:4000/v1/ecommerce";

export function api(path) {
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default { API_BASE, api };
