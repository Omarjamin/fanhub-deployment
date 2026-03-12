import { getModernSiteData } from "./context";

type GenericRecord = Record<string, any>;

function resolveApiOrigin() {
  const raw =
    String((window as any).__API_ORIGIN__ || import.meta.env.VITE_API_URL || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin.replace(/\/$/, "");
  } catch {
    return raw.replace(/\/v1$/i, "").replace(/\/$/, "");
  }
}

export function toAbsoluteModernMediaUrl(value: unknown, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const origin = resolveApiOrigin();
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export function getModernResolvedSite() {
  const site = (getModernSiteData() || {}) as GenericRecord;
  return {
    raw: site,
    siteName: String(site.site_name || site.community_name || site.community_type || "Community"),
    shortBio: String(site.short_bio || site.description_short || site.site_tagline || ""),
    description: String(
      site.site_description ||
        site.description ||
        site.about_description ||
        site.community_description ||
        "",
    ),
    logo: toAbsoluteModernMediaUrl(
      site.logo || site.logo_url || site.site_logo || site.siteLogo || "",
      "",
    ),
    leadImage: toAbsoluteModernMediaUrl(
      site.lead_image || site.hero_image || site.banner || site.group_photo || "",
      "",
    ),
    groupPhoto: toAbsoluteModernMediaUrl(site.group_photo || "", ""),
    accentColor: String(site.accent_color || site.primary_color || "#ec4899"),
    secondaryColor: String(site.secondary_color || "#111827"),
  };
}
