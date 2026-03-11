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

export function setModernTemplateContext(value: ModernTemplateContextValue) {
  if (typeof window === "undefined") return;
  window.__MODERN_TEMPLATE_CONTEXT__ = {
    ...DEFAULT_CONTEXT,
    ...value,
  };
}

export function getModernTemplateContext(): ModernTemplateContextValue {
  if (typeof window === "undefined") return DEFAULT_CONTEXT;
  return {
    ...DEFAULT_CONTEXT,
    ...(window.__MODERN_TEMPLATE_CONTEXT__ || {}),
  };
}

export function getModernSiteSlug() {
  return String(getModernTemplateContext().siteSlug || "").trim().toLowerCase();
}

export function getModernSiteData() {
  return getModernTemplateContext().siteData || null;
}
