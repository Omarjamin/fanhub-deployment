import { getModernSiteData } from "./context";

type GenericRecord = Record<string, any>;

function normalizeModernBannerImage(value: unknown) {
  const append = (images: string[], entry: unknown): string[] => {
    if (!entry) return images;

    if (Array.isArray(entry)) {
      return entry.reduce((acc, item) => append(acc, item), images);
    }

    if (typeof entry === "object") {
      const record = entry as GenericRecord;
      return append(images, record.url || record.src || record.image || record.image_url || "");
    }

    if (typeof entry !== "string") return images;
    const raw = String(entry || "").trim();
    if (!raw) return images;

    if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
      try {
        return append(images, JSON.parse(raw));
      } catch {
        return images;
      }
    }

    const lowered = raw.toLowerCase();
    if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) {
      return images;
    }

    if (!images.includes(raw)) {
      images.push(raw);
    }
    return images;
  };

  return append([], value)[0] || "";
}

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
      site.lead_image || site.hero_image || normalizeModernBannerImage(site.banner) || site.group_photo || "",
      "",
    ),
    groupPhoto: toAbsoluteModernMediaUrl(site.group_photo || "", ""),
    accentColor: String(site.accent_color || site.primary_color || "#ec4899"),
    secondaryColor: String(site.secondary_color || "#111827"),
  };
}
