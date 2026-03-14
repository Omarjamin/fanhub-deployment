export const TEMPLATE_PREVIEW_STORAGE_KEY = "fanhub:generate-website:preview";

function safeJsonParse(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function readTemplatePreviewDraft() {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(TEMPLATE_PREVIEW_STORAGE_KEY);
    return safeJsonParse(stored);
  } catch (_) {
    return null;
  }
}

export function writeTemplatePreviewDraft(draft) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(TEMPLATE_PREVIEW_STORAGE_KEY, JSON.stringify(draft || null));
  } catch (_) {}
}

export function clearTemplatePreviewDraft() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(TEMPLATE_PREVIEW_STORAGE_KEY);
  } catch (_) {}
}

export function isTemplatePreviewMode(payload = null) {
  if (payload?.previewMode || payload?.siteData?.previewMode) {
    return true;
  }

  if (typeof window === "undefined") return false;
  return Boolean(window.__FANHUB_TEMPLATE_PREVIEW__);
}
