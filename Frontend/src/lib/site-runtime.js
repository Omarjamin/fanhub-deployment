import { getEcommerceTemplatePage, getTemplatePage } from "./template-registry.js";
import { getSessionToken, setActiveSiteSlug } from "./site-context.js";

const DEFAULT_API_V1 = "https://fanhub-deployment-production.up.railway.app/v1";
const DEFAULT_API_KEY = "thread";

export function setupRuntimeApiConfig() {
  if (typeof window === "undefined") return;

  const apiV1 = String(import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim().replace(/\/$/, "");
  const apiOrigin = apiV1 ? new URL(apiV1).origin : "";

  if (apiV1) {
    window.__API_BASE__ = `${apiV1}/ecommerce`;
    window.__API_ORIGIN__ = apiOrigin;
  }
}

function getAdminApiBase() {
  return String(import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim().replace(/\/$/, "");
}

function getApiKey() {
  return import.meta.env.VITE_API_KEY || DEFAULT_API_KEY;
}

function isHexColor(value) {
  return /^#?[A-Fa-f0-9]{6}$/.test(String(value || "").trim());
}

function normalizeHex(value) {
  const trimmed = String(value || "").trim();
  if (!isHexColor(trimmed)) return null;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function applyButtonStyle(style, root = document.documentElement) {
  const buttonStyles = {
    rounded: { radius: "12px", border: "none", shadow: "0 6px 16px rgba(0, 0, 0, 0.18)" },
    square: { radius: "0px", border: "none", shadow: "0 4px 12px rgba(0, 0, 0, 0.15)" },
    pill: { radius: "999px", border: "none", shadow: "0 6px 16px rgba(0, 0, 0, 0.18)" },
    flat: { radius: "6px", border: "1px solid rgba(0, 0, 0, 0.15)", shadow: "none" },
  };

  const normalizedStyle = String(style || "rounded").trim().toLowerCase();
  const activeButtonStyle = buttonStyles[normalizedStyle] || buttonStyles.rounded;

  root.style.setProperty("--theme-button-radius", activeButtonStyle.radius);
  root.style.setProperty("--theme-button-border", activeButtonStyle.border);
  root.style.setProperty("--theme-button-shadow", activeButtonStyle.shadow);
}

function hexToHSL(hex) {
  const safeHex = String(hex || "").replace("#", "");
  if (!/^[A-Fa-f0-9]{6}$/.test(safeHex)) return null;

  let r = parseInt(safeHex.substring(0, 2), 16) / 255;
  let g = parseInt(safeHex.substring(2, 4), 16) / 255;
  let b = parseInt(safeHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function HSLToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function adjustLightness(hex, amount) {
  const hsl = hexToHSL(hex);
  if (!hsl) return "#000000";
  hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
  return HSLToHex(hsl.h, hsl.s, hsl.l);
}

function getContrastColor(hex) {
  const safeHex = String(hex || "").replace("#", "");
  if (!/^[A-Fa-f0-9]{6}$/.test(safeHex)) return "#000000";
  const r = parseInt(safeHex.substring(0, 2), 16);
  const g = parseInt(safeHex.substring(2, 4), 16);
  const b = parseInt(safeHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#000000" : "#ffffff";
}

function getBrightness(hex) {
  const safeHex = normalizeHex(hex);
  if (!safeHex) return 0;
  const normalized = safeHex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getVibranceScore(hex) {
  const hsl = hexToHSL(normalizeHex(hex));
  if (!hsl) return 0;
  return (hsl.s * 2) + (100 - Math.abs(hsl.l - 50));
}

function parsePaletteSource(source) {
  if (Array.isArray(source)) return source;
  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return source.split(",").map((value) => value.trim()).filter(Boolean);
  }
  return [];
}

export function assignColorRoles(palette) {
  const normalizedPalette = parsePaletteSource(palette)
    .map((color) => normalizeHex(color))
    .filter(Boolean);

  if (!normalizedPalette.length) {
    return {};
  }

  const uniquePalette = Array.from(new Set(normalizedPalette));
  const byBrightness = [...uniquePalette].sort((a, b) => getBrightness(b) - getBrightness(a));
  const byVibrance = [...uniquePalette].sort((a, b) => getVibranceScore(b) - getVibranceScore(a));

  const background = byBrightness[0];
  const primary = byVibrance.find((color) => color !== background) || byVibrance[0] || background;
  const accent =
    byVibrance.find((color) => color !== primary && color !== background) ||
    byBrightness.find((color) => color !== primary && color !== background) ||
    primary;
  const secondary =
    uniquePalette.find((color) => color !== primary && color !== accent && color !== background) ||
    accent;
  const text = getContrastColor(background);

  return {
    primary,
    accent,
    background,
    secondary,
    text,
  };
}

function getThemeSource(data) {
  if (data?.theme && typeof data.theme === "object") {
    return data.theme;
  }
  return data || {};
}

function normalizeThemeData(data) {
  const source = getThemeSource(data);
  const palette =
    source?.palette ??
    source?.colorPalette ??
    source?.color_palette ??
    source?.colors ??
    data?.palette ??
    data?.colorPalette ??
    data?.color_palette ??
    data?.colors;

  const assignedRoles = assignColorRoles(palette);

  return {
    primary: normalizeHex(
      source?.primary_color ??
      source?.primaryColor ??
      data?.primary_color ??
      data?.primaryColor ??
      assignedRoles.primary
    ) || "#3b82f6",
    secondary: normalizeHex(
      source?.secondary_color ??
      source?.secondaryColor ??
      data?.secondary_color ??
      data?.secondaryColor ??
      assignedRoles.secondary ??
      assignedRoles.background
    ) || "#ffffff",
    accent: normalizeHex(
      source?.accent_color ??
      source?.accentColor ??
      data?.accent_color ??
      data?.accentColor ??
      assignedRoles.accent
    ),
    background: normalizeHex(
      source?.background_color ??
      source?.backgroundColor ??
      data?.background_color ??
      data?.backgroundColor ??
      assignedRoles.background
    ),
    text: normalizeHex(
      source?.text_color ??
      source?.textColor ??
      data?.text_color ??
      data?.textColor
    ) || assignedRoles.text,
    buttonStyle:
      source?.button_style ??
      source?.buttonStyle ??
      data?.button_style ??
      data?.buttonStyle,
    fontStyle:
      source?.font_style ??
      source?.fontStyle ??
      data?.font_style ??
      data?.fontStyle,
    customFontUrl:
      source?.custom_font_url ??
      source?.customFontUrl ??
      source?.font_file_path ??
      source?.fontFilePath ??
      data?.custom_font_url ??
      data?.customFontUrl ??
      data?.font_file_path ??
      data?.fontFilePath,
    customFontFamily:
      source?.custom_font_family ??
      source?.customFontFamily ??
      source?.font_family ??
      source?.fontFamily ??
      data?.custom_font_family ??
      data?.customFontFamily ??
      data?.font_family ??
      data?.fontFamily,
    palette: parsePaletteSource(palette),
  };
}

export function applyCustomFont(fontFilePath, fontFamilyName) {
  const src = String(fontFilePath || "").trim();
  const family = String(fontFamilyName || "").trim();

  if (!src || !family || typeof document === "undefined") {
    return;
  }

  const styleId = `theme-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @font-face {
        font-family: '${family}';
        src: url('${src}');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
  }

  document.documentElement.style.setProperty("--theme-font-family", `'${family}'`);
}

export function applyThemeColors(data) {
  if (!data) return;

  const root = document.documentElement;
  const theme = normalizeThemeData(data);
  const primary = theme.primary;
  const secondary = theme.secondary;
  const accent = theme.accent || primary;
  const background = theme.background || secondary;
  const text = theme.text || getContrastColor(background);

  root.style.setProperty("--primary-color", primary);
  root.style.setProperty("--secondary-color", secondary);
  root.style.setProperty("--accent-color", accent);
  root.style.setProperty("--background-color", background);
  root.style.setProperty("--text-color", text);

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-light", adjustLightness(primary, 15));
  root.style.setProperty("--primary-dark", adjustLightness(primary, -15));
  root.style.setProperty("--primary-soft-bg", adjustLightness(primary, 40));

  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-light", adjustLightness(accent, 15));
  root.style.setProperty("--accent-dark", adjustLightness(accent, -15));

  root.style.setProperty("--text-on-primary", getContrastColor(primary));
  root.style.setProperty("--text-on-accent", getContrastColor(accent));
  root.style.setProperty("--border", adjustLightness(primary, 35));
  root.style.setProperty("--hover-background", adjustLightness(accent, -8));
  root.style.setProperty("--hover-text-color", getContrastColor(adjustLightness(accent, -8)));
  root.style.setProperty("--secondary-background", background);

  const fontMap = {
    arial: "Arial, Helvetica, sans-serif",
    calibri: "Calibri, Arial, sans-serif",
    "segoe ui": "\"Segoe UI\", Arial, sans-serif",
    "century gothic": "\"Century Gothic\", sans-serif",
    verdana: "Verdana, Geneva, sans-serif",
    helvetica: "Helvetica, Arial, sans-serif",
    tahoma: "Tahoma, Geneva, sans-serif",
    "trebuchet ms": "\"Trebuchet MS\", sans-serif",
    georgia: "Georgia, \"Times New Roman\", serif",
    "times new roman": "\"Times New Roman\", Times, serif",
    "sans-serif": "Arial, Helvetica, sans-serif",
    serif: "Georgia, \"Times New Roman\", serif",
    cursive: "\"Brush Script MT\", \"Comic Sans MS\", cursive",
    monospace: "\"Courier New\", Courier, monospace",
  };
  const fontStyleRaw = String(theme.fontStyle || "Arial").trim();
  const fontStyle = fontStyleRaw.toLowerCase();
  root.style.setProperty("--theme-font-family", fontMap[fontStyle] || fontStyleRaw || fontMap.arial);

  if (theme.customFontUrl && theme.customFontFamily) {
    applyCustomFont(theme.customFontUrl, theme.customFontFamily);
  }

  applyButtonStyle(theme.buttonStyle, root);
}

export async function fetchSiteBySlug(siteSlug) {
  const slug = String(siteSlug || "").trim().toLowerCase();
  if (!slug) {
    throw new Error("Invalid site slug");
  }

  try {
    const cached = sessionStorage.getItem(`site_data:${slug}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === "object") {
        parsed.theme = {
          ...(parsed.theme && typeof parsed.theme === "object" ? parsed.theme : {}),
          ...normalizeThemeData(parsed),
        };
        const resolvedCachedSlug = String(
          parsed?.community_type ||
          parsed?.site_slug ||
          parsed?.domain ||
          slug
        ).trim().toLowerCase() || slug;
        setActiveSiteSlug(resolvedCachedSlug);
        applyThemeColors(parsed);
        return parsed;
      }
    }
  } catch (_) {}

  setActiveSiteSlug(slug);
  const token = getSessionToken(slug);
  const slugVariants = Array.from(new Set([
    slug,
    slug.replace(/-website$/i, ""),
    slug.endsWith("-website") ? slug : `${slug}-website`,
  ].filter(Boolean)));
  const adminApiBase = getAdminApiBase();
  const baseVariants = Array.from(new Set([
    adminApiBase,
    `${adminApiBase}/admin`,
  ]));

  let payload = null;
  let lastError = null;

  for (const base of baseVariants) {
    for (const candidate of slugVariants) {
      try {
        const res = await fetch(`${base}/generate/generated-websites/type/${encodeURIComponent(candidate)}`, {
          headers: {
            apikey: getApiKey(),
            "x-site-slug": candidate,
            "x-community-type": candidate,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success && json?.data) {
          payload = json.data;
          break;
        }
        lastError = new Error(json?.message || `Failed to fetch website (${res.status})`);
      } catch (err) {
        lastError = err;
      }
    }
    if (payload) break;
  }

  if (!payload) {
    throw lastError || new Error("Failed to fetch website");
  }

  const resolvedSlug = String(
    payload?.community_type ||
    payload?.site_slug ||
    payload?.domain ||
    slug
  ).trim().toLowerCase() || slug;
  payload.theme = {
    ...(payload.theme && typeof payload.theme === "object" ? payload.theme : {}),
    ...normalizeThemeData(payload),
  };
  setActiveSiteSlug(resolvedSlug);

  try {
    sessionStorage.setItem(`site_data:${slug}`, JSON.stringify(payload));
    sessionStorage.setItem("active_site_data", JSON.stringify(payload));
    sessionStorage.setItem("active_site_slug", resolvedSlug);
    localStorage.setItem("active_site_data", JSON.stringify(payload));
    localStorage.setItem("active_site_slug", resolvedSlug);
  } catch (_) {}

  applyThemeColors(payload);
  return payload;
}

export async function renderCommunityTemplatePage({ root, siteSlug, page }) {
  const siteData = await fetchSiteBySlug(siteSlug);
  const templateValue = String(
    siteData?.template ||
    siteData?.template_name ||
    siteData?.template_key ||
    siteData?.templateKey ||
    "bini"
  ).trim().toLowerCase();
  const Page = await getTemplatePage(templateValue, page);

  if (typeof Page !== "function") {
    throw new Error(`Missing template page: ${page}`);
  }

  Page.call({ root }, { siteSlug, siteData });
}

export async function renderCommunityTemplateRoute({
  root,
  siteSlug,
  page,
  payload,
}) {
  const siteData = await fetchSiteBySlug(siteSlug);
  const templateValue = String(
    siteData?.template ||
    siteData?.template_name ||
    siteData?.template_key ||
    siteData?.templateKey ||
    "bini"
  ).trim().toLowerCase();
  const Page = await getTemplatePage(templateValue, page);

  if (typeof Page !== "function") {
    throw new Error(`Missing template page: ${page}`);
  }

  const resolvedPayload =
    payload !== undefined ? payload : { siteSlug, siteData };

  Page.call({ root }, resolvedPayload);
}

export async function renderEcommerceTemplatePage({ root, siteSlug, page, passMode = "object" }) {
  const siteData = await fetchSiteBySlug(siteSlug);
  const templateValue = String(
    siteData?.template ||
    siteData?.template_name ||
    siteData?.template_key ||
    siteData?.templateKey ||
    "bini"
  ).trim().toLowerCase();
  const Page = await getEcommerceTemplatePage(templateValue, page);

  if (typeof Page !== "function") {
    throw new Error(`Missing ecommerce template page: ${page}`);
  }

  const payload = passMode === "raw" ? siteData : { siteSlug, siteData };
  Page.call({ root }, payload);
}
