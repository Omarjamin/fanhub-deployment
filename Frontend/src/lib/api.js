import axios from "axios";
import { getActiveSiteSlug, getSiteHeaders, getSessionToken } from "./site-context.js";
import { handleSuspensionNotice } from "./suspension-notice.js";

const API_URL = import.meta.env.VITE_API_URL || "https://fanhub-deployment-production.up.railway.app/v1";
const API_KEY = import.meta.env.VITE_API_KEY || "thread";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/ecommerce`;

console.log("API Config:", { API_BASE_URL, API_KEY });

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    apikey: API_KEY,
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const siteSlug = getActiveSiteSlug();
  const token = getSessionToken(siteSlug);
  Object.assign(config.headers, getSiteHeaders(siteSlug));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    const data = error?.response?.data || {};
    if (status === 403 && String(data?.code || '').trim() === 'ACCOUNT_SUSPENDED') {
      handleSuspensionNotice(data, { platform: 'ecommerce', siteSlug: getActiveSiteSlug() });
    }
    return Promise.reject(error);
  },
);

export default api;


