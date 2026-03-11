import { getEcommerceTemplatePage, getTemplatePage } from "./template-registry.js";
import { getSessionToken, setActiveSiteSlug } from "./site-context.js";
import { applyTypographyConfig } from "./theme/font-loader.js";

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

function mixHex(colorA, colorB, ratio = 0.5) {
  const first = normalizeHex(colorA);
  const second = normalizeHex(colorB);
  if (!first) return second || "#000000";
  if (!second) return first;

  const weight = Math.max(0, Math.min(1, Number(ratio)));
  const a = first.replace("#", "");
  const b = second.replace("#", "");
  const mixed = [0, 2, 4].map((index) => {
    const channelA = parseInt(a.substring(index, index + 2), 16);
    const channelB = parseInt(b.substring(index, index + 2), 16);
    const value = Math.round((channelA * (1 - weight)) + (channelB * weight));
    return value.toString(16).padStart(2, "0");
  }).join("");

  return `#${mixed}`;
}

function deriveSurfaceTone(base, reference, amount = 0.12) {
  const baseHex = normalizeHex(base);
  const referenceHex = normalizeHex(reference);
  if (!baseHex) return referenceHex || "#ffffff";
  if (!referenceHex) return baseHex;
  return mixHex(baseHex, referenceHex, amount);
}

function isNearWhite(hex) {
  return getBrightness(hex) >= 238;
}

function isNearBlack(hex) {
  return getBrightness(hex) <= 18;
}

function keepPaletteCharacter(color, background, palette = []) {
  const normalized = normalizeHex(color);
  const bg = normalizeHex(background);
  const options = palette.map((entry) => normalizeHex(entry)).filter(Boolean);
  if (!normalized || !bg) {
    return normalized || bg || "#000000";
  }

  const paletteSeed =
    options.find((entry) => entry !== bg && entry !== normalized) ||
    options.find((entry) => entry !== bg) ||
    normalized;

  if (isNearWhite(normalized)) {
    return pickReadableColor(bg, mixHex(paletteSeed, normalized, 0.18), [
      adjustLightness(paletteSeed, -10),
      adjustLightness(paletteSeed, 8),
      mixHex(bg, paletteSeed, 0.7),
      normalized,
    ]);
  }

  if (isNearBlack(normalized)) {
    return pickReadableColor(bg, mixHex(paletteSeed, normalized, 0.14), [
      adjustLightness(paletteSeed, 14),
      adjustLightness(paletteSeed, -8),
      normalized,
    ]);
  }

  return normalized;
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

function getRelativeLuminance(hex) {
  const safeHex = normalizeHex(hex);
  if (!safeHex) return 0;
  const normalized = safeHex.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const value = parseInt(normalized.substring(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function getContrastRatio(foreground, background) {
  const fg = normalizeHex(foreground);
  const bg = normalizeHex(background);
  if (!fg || !bg) return 1;
  const lighter = Math.max(getRelativeLuminance(fg), getRelativeLuminance(bg));
  const darker = Math.min(getRelativeLuminance(fg), getRelativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function pickReadableColor(background, preferred, fallbacks = []) {
  const bg = normalizeHex(background);
  const candidates = [preferred, ...fallbacks]
    .map((value) => normalizeHex(value))
    .filter(Boolean);

  if (!bg) {
    return candidates[0] || "#000000";
  }

  let best = candidates[0] || getContrastColor(bg);
  let bestScore = getContrastRatio(best, bg);

  candidates.forEach((candidate) => {
    const score = getContrastRatio(candidate, bg);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  });

  if (bestScore >= 4.5) {
    return best;
  }

  const fallbackContrast = getContrastColor(bg);
  return getContrastRatio(fallbackContrast, bg) >= bestScore ? fallbackContrast : best;
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

  const primary = normalizedPalette[0];
  const secondary = normalizedPalette[1] || primary;
  const accent = normalizedPalette[2] || primary;
  const background = normalizedPalette[3] || secondary || primary;
  const textSeed = normalizedPalette[4] || null;
  const text = textSeed
    ? pickReadableColor(background, textSeed, [primary, accent, getContrastColor(background)])
    : getContrastColor(background);

  return {
    primary,
    accent,
    background,
    secondary,
    text,
  };
}

function getThemeSource(data) {
  if (typeof data?.theme === "string") {
    try {
      const parsed = JSON.parse(data.theme);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (_) {}
  }
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
  const fontConfig =
    (source?.font && typeof source.font === "object" ? source.font : null) ||
    (typeof source?.font === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(source.font);
            return parsed && typeof parsed === "object" ? parsed : null;
          } catch (_) {
            return null;
          }
        })()
      : null) ||
    (typeof data?.font === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(data.font);
            return parsed && typeof parsed === "object" ? parsed : null;
          } catch (_) {
            return null;
          }
        })()
      : data?.font && typeof data.font === "object" ? data.font : null) ||
    {
      type:
        source?.font_type ??
        source?.fontType ??
        data?.font_type ??
        data?.fontType ??
        "system",
      name:
        source?.font_name ??
        source?.fontName ??
        data?.font_name ??
        data?.fontName ??
        source?.font_style ??
        source?.fontStyle ??
        data?.font_style ??
        data?.fontStyle ??
        "Arial",
      url:
        source?.font_url ??
        source?.fontUrl ??
        data?.font_url ??
        data?.fontUrl ??
        "",
    };
  const typographySource =
    (source?.typography && typeof source.typography === "object" ? source.typography : null) ||
    (typeof source?.typography === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(source.typography);
            return parsed && typeof parsed === "object" ? parsed : null;
          } catch (_) {
            return null;
          }
        })()
      : null) ||
    (typeof data?.typography === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(data.typography);
            return parsed && typeof parsed === "object" ? parsed : null;
          } catch (_) {
            return null;
          }
        })()
      : data?.typography && typeof data.typography === "object" ? data.typography : null) ||
    {};

  const headingFont = typographySource?.heading || typographySource?.font_heading || {
    type:
      typographySource?.heading_type ??
      typographySource?.headingType ??
      source?.heading_font_type ??
      source?.headingFontType ??
      data?.heading_font_type ??
      data?.headingFontType ??
      fontConfig?.type ??
      "system",
    name:
      typographySource?.heading_name ??
      typographySource?.headingName ??
      source?.font_heading ??
      source?.heading_font ??
      source?.headingFont ??
      data?.font_heading ??
      data?.heading_font ??
      data?.headingFont ??
      fontConfig?.name ??
      "Arial",
    url:
      typographySource?.heading_url ??
      typographySource?.headingUrl ??
      source?.heading_font_url ??
      source?.headingFontUrl ??
      data?.heading_font_url ??
      data?.headingFontUrl ??
      "",
  };
  const bodyFont = typographySource?.body || typographySource?.font_body || {
    type:
      typographySource?.body_type ??
      typographySource?.bodyType ??
      source?.body_font_type ??
      source?.bodyFontType ??
      data?.body_font_type ??
      data?.bodyFontType ??
      fontConfig?.type ??
      "system",
    name:
      typographySource?.body_name ??
      typographySource?.bodyName ??
      source?.font_body ??
      source?.body_font ??
      source?.bodyFont ??
      data?.font_body ??
      data?.body_font ??
      data?.bodyFont ??
      fontConfig?.name ??
      "Arial",
    url:
      typographySource?.body_url ??
      typographySource?.bodyUrl ??
      source?.body_font_url ??
      source?.bodyFontUrl ??
      data?.body_font_url ??
      data?.bodyFontUrl ??
      fontConfig?.url ??
      "",
  };

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
    font: fontConfig,
    typography: {
      heading: headingFont,
      body: bodyFont,
      font_heading: headingFont,
      font_body: bodyFont,
      fontSizeBase:
        typographySource?.fontSizeBase ??
        typographySource?.font_size_base ??
        source?.font_size_base ??
        source?.fontSizeBase ??
        data?.font_size_base ??
        data?.fontSizeBase ??
        "16px",
      lineHeight:
        typographySource?.lineHeight ??
        typographySource?.line_height ??
        source?.line_height ??
        source?.lineHeight ??
        data?.line_height ??
        data?.lineHeight ??
        "1.6",
      letterSpacing:
        typographySource?.letterSpacing ??
        typographySource?.letter_spacing ??
        source?.letter_spacing ??
        source?.letterSpacing ??
        data?.letter_spacing ??
        data?.letterSpacing ??
        "0.02em",
      font_size_base:
        typographySource?.fontSizeBase ??
        typographySource?.font_size_base ??
        source?.font_size_base ??
        source?.fontSizeBase ??
        data?.font_size_base ??
        data?.fontSizeBase ??
        "16px",
      line_height:
        typographySource?.lineHeight ??
        typographySource?.line_height ??
        source?.line_height ??
        source?.lineHeight ??
        data?.line_height ??
        data?.lineHeight ??
        "1.6",
      letter_spacing:
        typographySource?.letterSpacing ??
        typographySource?.letter_spacing ??
        source?.letter_spacing ??
        source?.letterSpacing ??
        data?.letter_spacing ??
        data?.letterSpacing ??
        "0.02em",
    },
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

export function applyThemeColors(data) {
  if (!data) return;

  const root = document.documentElement;
  const theme = normalizeThemeData(data);
  const paletteColors = Array.isArray(theme.palette) ? theme.palette : [];
  const primary = theme.primary;
  const secondary = theme.secondary;
  const accent = theme.accent || primary;
  const background = theme.background || secondary;
  const text = theme.text || getContrastColor(background);
  const surface = pickReadableColor(background, secondary, [adjustLightness(background, 4), adjustLightness(background, -4)]);
  const surfaceTextBase = pickReadableColor(surface, primary, [text, accent, "#111111", "#ffffff"]);
  const surfaceText = keepPaletteCharacter(surfaceTextBase, surface, [primary, secondary, accent, ...paletteColors]);
  const mutedTextBase = pickReadableColor(background, adjustLightness(surfaceText, getBrightness(surfaceText) > 150 ? -28 : 28), [surfaceText, primary, text]);
  const mutedText = keepPaletteCharacter(mutedTextBase, background, [primary, secondary, accent, ...paletteColors]);
  const buttonBg = pickReadableColor(background, accent, [primary, adjustLightness(accent, -12), adjustLightness(accent, 12)]);
  const buttonText = pickReadableColor(buttonBg, getContrastColor(buttonBg), [surfaceText, text, "#ffffff", "#000000"]);
  const buttonHoverBg = pickReadableColor(background, adjustLightness(buttonBg, getBrightness(buttonBg) > 150 ? -12 : 12), [primary, accent]);
  const buttonHoverText = pickReadableColor(buttonHoverBg, getContrastColor(buttonHoverBg), [buttonText, surfaceText, "#ffffff", "#000000"]);
  const accentSoft = pickReadableColor(background, adjustLightness(accent, getBrightness(background) > 150 ? -18 : 20), [accent, primary]);
  const borderColor = pickReadableColor(background, adjustLightness(primary, getBrightness(background) > 150 ? 28 : -28), [primary, accent, surfaceText]);
  const navSurface = secondary || surface || background;
  const finalNavHeroText = primary;
  const finalNavScrolledText = primary;
  const sectionHeading = keepPaletteCharacter(
    pickReadableColor(background, primary, [surfaceText, accent, text, "#111111", "#ffffff"]),
    background,
    [primary, secondary, accent, ...paletteColors],
  );
  const sectionBody = keepPaletteCharacter(
    pickReadableColor(background, mixHex(sectionHeading, background, 0.2), [surfaceText, text, primary]),
    background,
    [primary, secondary, accent, ...paletteColors],
  );
  const sectionMuted = keepPaletteCharacter(
    pickReadableColor(background, mixHex(sectionBody, background, 0.28), [mutedText, sectionBody, text]),
    background,
    [primary, secondary, accent, ...paletteColors],
  );
  const lightSurface = getBrightness(background) > 150
    ? deriveSurfaceTone(background, "#ffffff", 0.45)
    : deriveSurfaceTone(secondary, "#ffffff", 0.72);

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
  root.style.setProperty("--border", borderColor);
  root.style.setProperty("--hover-background", buttonHoverBg);
  root.style.setProperty("--hover-text-color", buttonHoverText);
  root.style.setProperty("--secondary-background", background);
  root.style.setProperty("--surface-color", surface);
  root.style.setProperty("--surface-text-color", surfaceText);
  root.style.setProperty("--muted-text-color", mutedText);
  root.style.setProperty("--theme-button-bg", buttonBg);
  root.style.setProperty("--theme-button-text", buttonText);
  root.style.setProperty("--theme-button-hover-bg", buttonHoverBg);
  root.style.setProperty("--theme-button-hover-text", buttonHoverText);
  root.style.setProperty("--theme-nav-text", finalNavScrolledText);
  root.style.setProperty("--theme-nav-hero-text", finalNavHeroText);
  root.style.setProperty("--theme-nav-bg", navSurface);
  root.style.setProperty("--theme-accent-soft", accentSoft);
  root.style.setProperty("--theme-section-heading", sectionHeading);
  root.style.setProperty("--theme-section-text", sectionBody);
  root.style.setProperty("--theme-section-muted", sectionMuted);
  root.style.setProperty("--theme-light-surface", lightSurface);
  applyTypographyConfig({
    ...(theme.typography || {}),
    heading: {
      ...(theme.typography?.heading || {}),
      url:
        theme.typography?.heading?.url ||
        theme.customFontUrl ||
        theme.font?.url ||
        "",
      name:
        theme.typography?.heading?.name ||
        theme.customFontFamily ||
        theme.fontStyle ||
        theme.font?.name ||
        "Arial",
      type:
        theme.typography?.heading?.type ||
        theme.font?.type ||
        "system",
    },
    body: {
      ...(theme.typography?.body || {}),
      url:
        theme.typography?.body?.url ||
        theme.customFontUrl ||
        theme.font?.url ||
        "",
      name:
        theme.typography?.body?.name ||
        theme.customFontFamily ||
        theme.fontStyle ||
        theme.font?.name ||
        "Arial",
      type:
        theme.typography?.body?.type ||
        theme.font?.type ||
        "system",
    },
  }, { root });

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
      const cachedMembers = Array.isArray(parsed?.members) ? parsed.members : null;
      const shouldUseCachedPayload =
        parsed &&
        typeof parsed === "object" &&
        (
          cachedMembers === null ||
          cachedMembers.length > 0
        );

      if (shouldUseCachedPayload) {
        parsed.theme = {
          ...(parsed.theme && typeof parsed.theme === "object" ? parsed.theme : {}),
          ...normalizeThemeData(parsed),
        };
        console.info("[Runtime Debug] using cached site payload", {
          requestSlug: slug,
          resolvedSlug: parsed?.community_type || parsed?.domain || slug,
          siteId: parsed?.site_id,
          membersCount: Array.isArray(parsed?.members) ? parsed.members.length : 0,
        });
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
          console.info("[Runtime Debug] fetched site payload", {
            requestSlug: candidate,
            siteId: payload?.site_id,
            domain: payload?.domain,
            communityType: payload?.community_type,
            membersCount: Array.isArray(payload?.members) ? payload.members.length : 0,
          });
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
