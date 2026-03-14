import { getActiveSiteSlug, setActiveSiteSlug } from "../site-context.js";

export type ModernTemplateContextValue = {
  siteSlug: string;
  siteData: Record<string, any> | null;
  page?: string;
};

const DEFAULT_CONTEXT: ModernTemplateContextValue = {
  siteSlug: "",
  siteData: null,
  page: "home",
};

declare global {
  interface Window {
    __MODERN_TEMPLATE_CONTEXT__?: ModernTemplateContextValue;
  }
}

type GenericRecord = Record<string, any>;

function normalizeSlug(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function asRecord(value: unknown): GenericRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GenericRecord)
    : null;
}

function parseStoredSiteData(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

function resolveSlugFromPath() {
  if (typeof window === "undefined") return "";

  const parts = String(window.location.pathname || "").split("/").filter(Boolean);
  if (parts[0] === "fanhub" && parts[1] === "community-platform" && parts[2]) {
    return normalizeSlug(parts[2]);
  }
  if (parts[0] === "fanhub" && parts[1] && parts[1] !== "community-platform") {
    return normalizeSlug(parts[1]);
  }
  if (parts[0] === "bini") {
    return "bini";
  }

  return "";
}

function resolveSlugFromSiteData(siteData: unknown) {
  const record = asRecord(siteData);
  if (!record) return "";

  return normalizeSlug(
    record.community_type ||
      record.site_slug ||
      record.domain ||
      record.slug ||
      record.communityType,
  );
}

function readStoredSiteData(siteSlug = "") {
  if (typeof window === "undefined") return null;

  try {
    const candidates = [
      siteSlug ? sessionStorage.getItem(`site_data:${siteSlug}`) : "",
      sessionStorage.getItem("active_site_data"),
      localStorage.getItem("active_site_data"),
    ];

    for (const candidate of candidates) {
      const parsed = parseStoredSiteData(candidate);
      if (parsed) return parsed;
    }
  } catch (_) {}

  return null;
}

function normalizeSiteData(siteData: unknown, siteSlug = "") {
  const record = asRecord(siteData);
  if (!record) return null;

  const resolvedSlug =
    normalizeSlug(record.community_type || record.site_slug || record.domain) ||
    normalizeSlug(siteSlug);

  return {
    ...record,
    ...(resolvedSlug
      ? {
          community_type: record.community_type || resolvedSlug,
          site_slug: record.site_slug || resolvedSlug,
          domain: record.domain || resolvedSlug,
        }
      : {}),
  };
}

export function resolveModernSiteSlug(preferred: unknown = "", siteData: unknown = null) {
  const context = typeof window !== "undefined" ? window.__MODERN_TEMPLATE_CONTEXT__ || {} : {};
  const fromPreferred = normalizeSlug(preferred);
  const fromSiteData = resolveSlugFromSiteData(siteData);
  const fromContext = normalizeSlug(context.siteSlug) || resolveSlugFromSiteData(context.siteData);
  const fromSharedContext = normalizeSlug(getActiveSiteSlug());

  let fromStorage = "";
  if (typeof window !== "undefined") {
    try {
      fromStorage = normalizeSlug(
        sessionStorage.getItem("site_slug") ||
          sessionStorage.getItem("community_type") ||
          sessionStorage.getItem("active_site_slug") ||
          localStorage.getItem("active_site_slug") ||
          localStorage.getItem("community_type") ||
          "",
      );
    } catch (_) {}
  }

  const fromPath = resolveSlugFromPath();

  return (
    fromPreferred ||
    fromSiteData ||
    fromContext ||
    fromSharedContext ||
    fromStorage ||
    fromPath
  );
}

export function setModernTemplateContext(value: ModernTemplateContextValue) {
  if (typeof window === "undefined") return;

  const siteSlug = resolveModernSiteSlug(value?.siteSlug, value?.siteData);
  const siteData =
    normalizeSiteData(value?.siteData, siteSlug) ||
    normalizeSiteData(readStoredSiteData(siteSlug), siteSlug);

  const nextValue = {
    ...DEFAULT_CONTEXT,
    ...value,
    siteSlug,
    siteData,
  };

  window.__MODERN_TEMPLATE_CONTEXT__ = nextValue;

  if (siteSlug) {
    setActiveSiteSlug(siteSlug);
  }

  try {
    if (siteSlug) {
      sessionStorage.setItem("site_slug", siteSlug);
      sessionStorage.setItem("community_type", siteSlug);
      sessionStorage.setItem("active_site_slug", siteSlug);
      localStorage.setItem("active_site_slug", siteSlug);
      localStorage.setItem("community_type", siteSlug);
    }

    if (siteData) {
      sessionStorage.setItem("active_site_data", JSON.stringify(siteData));
      localStorage.setItem("active_site_data", JSON.stringify(siteData));
      if (siteSlug) {
        sessionStorage.setItem(`site_data:${siteSlug}`, JSON.stringify(siteData));
      }
    }
  } catch (_) {}
}

export function getModernTemplateContext(): ModernTemplateContextValue {
  if (typeof window === "undefined") return DEFAULT_CONTEXT;

  const existing = window.__MODERN_TEMPLATE_CONTEXT__ || {};
  const siteSlug = resolveModernSiteSlug(existing.siteSlug, existing.siteData);
  const siteData =
    normalizeSiteData(existing.siteData, siteSlug) ||
    normalizeSiteData(readStoredSiteData(siteSlug), siteSlug);

  return {
    ...DEFAULT_CONTEXT,
    ...existing,
    siteSlug,
    siteData,
  };
}

export function getModernSiteSlug() {
  return resolveModernSiteSlug(getModernTemplateContext().siteSlug, getModernTemplateContext().siteData);
}

export function getModernSiteData() {
  const context = getModernTemplateContext();
  return normalizeSiteData(context.siteData, context.siteSlug);
}
