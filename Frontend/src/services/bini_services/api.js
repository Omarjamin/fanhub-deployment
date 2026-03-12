import axios from "axios";
import { getActiveSiteSlug, getSiteHeaders, getSessionToken } from "../../lib/site-context.js";
import { handleSuspensionNotice } from "../../lib/suspension-notice.js";

const API_URL = import.meta.env.VITE_API_URL || "https://fanhub-deployment-production.up.railway.app/v1";
const API_KEY = import.meta.env.VITE_API_KEY || "thread";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    apikey: API_KEY,
  },
});

api.interceptors.request.use((config) => {
  const siteSlug = getActiveSiteSlug();
  const token = getSessionToken(siteSlug);
  console.log("API Request - scoped token:", Boolean(token), "site:", siteSlug);
  const scopedHeaders = getSiteHeaders(siteSlug);
  const existingSiteSlug = String(
    config.headers?.["x-site-slug"] || config.headers?.["X-Site-Slug"] || "",
  ).trim();
  const existingCommunityType = String(
    config.headers?.["x-community-type"] || config.headers?.["X-Community-Type"] || "",
  ).trim();
  const existingAuthorization = String(
    config.headers?.Authorization || config.headers?.authorization || "",
  ).trim();

  if (!existingSiteSlug && scopedHeaders["x-site-slug"]) {
    config.headers["x-site-slug"] = scopedHeaders["x-site-slug"];
  }
  if (!existingCommunityType && scopedHeaders["x-community-type"]) {
    config.headers["x-community-type"] = scopedHeaders["x-community-type"];
  }

  if (token && !existingAuthorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  } else if (config.headers && !config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    const data = error?.response?.data || {};
    if (status === 403 && String(data?.code || '').trim() === 'ACCOUNT_SUSPENDED') {
      handleSuspensionNotice(data, { platform: 'bini', siteSlug: getActiveSiteSlug() });
    }
    return Promise.reject(error);
  },
);

export default api;



