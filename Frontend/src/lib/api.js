import axios from "axios";
import { getActiveSiteSlug, getSiteHeaders, getSessionToken } from "./site-context.js";
import { handleSuspensionNotice } from "./suspension-notice.js";

const runtimeApiUrl = (typeof window !== "undefined" && window.__API_ORIGIN__)
  ? `${String(window.__API_ORIGIN__).replace(/\/$/, "")}/v1`
  : "";
const API_URL = runtimeApiUrl || import.meta.env.VITE_API_URL || "https://fanhub-deployment-production.up.railway.app/v1";
const API_KEY = import.meta.env.VITE_API_KEY || "thread";
const API_V1_BASE = API_URL.replace(/\/$/, "");

function isCommunityPlatformRoute(pathname = "") {
  const path = String(pathname || "").toLowerCase();
  return path.includes("/fanhub/community-platform/") || path.startsWith("/bini");
}

function resolveBaseUrl() {
  return API_V1_BASE;
}

function shouldPrefixEcommerce(url = "") {
  const path = String(url || "").trim();
  if (!path || /^https?:\/\//i.test(path)) return false;
  if (!path.startsWith("/")) return false;
  if (
    path.startsWith("/ecommerce/") ||
    path.startsWith("/bini/") ||
    path.startsWith("/admin/") ||
    path.startsWith("/generate/") ||
    path.startsWith("/youtube/")
  ) {
    return false;
  }
  return /^\/(users|shop|community|cart|shipping|orders|discography|events)(\/|$)/i.test(path);
}

const API_BASE_URL = resolveBaseUrl();

console.log("API Config:", { API_BASE_URL, API_KEY });

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    apikey: API_KEY,
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  config.baseURL = resolveBaseUrl();

  if (shouldPrefixEcommerce(config.url)) {
    config.url = `/ecommerce${config.url}`;
  }

  const siteSlug = getActiveSiteSlug();
  const token = getSessionToken(siteSlug);
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

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    const data = error?.response?.data || {};
    if (status === 403 && String(data?.code || '').trim() === 'ACCOUNT_SUSPENDED') {
      const platform = isCommunityPlatformRoute(typeof window !== "undefined" ? window.location?.pathname || "" : "")
        ? "bini"
        : "ecommerce";
      handleSuspensionNotice(data, { platform, siteSlug: getActiveSiteSlug() });
    }
    return Promise.reject(error);
  },
);

export default api;



