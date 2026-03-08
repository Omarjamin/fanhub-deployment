function sanitizeFontName(value, fallback = "Arial") {
  const name = String(value || "").trim();
  return name || fallback;
}

function buildGoogleFontHref(name) {
  const family = sanitizeFontName(name)
    .split(/\s+/)
    .join("+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
}

function getGoogleLinkId(name) {
  return `theme-google-font-${sanitizeFontName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getCustomStyleId(name) {
  return `theme-custom-font-${sanitizeFontName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function applyFontConfig(font, options = {}) {
  if (typeof document === "undefined" || !font) return;

  const root = options.root || document.documentElement;
  const fallback = options.fallback || "sans-serif";
  const type = String(font?.type || "system").trim().toLowerCase();
  const name = sanitizeFontName(font?.name, "Arial");
  const url = String(font?.url || "").trim();

  if (type === "google") {
    const linkId = getGoogleLinkId(name);
    const href = buildGoogleFontHref(name);
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
    root.style.setProperty("--theme-font-family", `'${name}', ${fallback}`);
    return;
  }

  if (type === "custom" && url) {
    const styleId = getCustomStyleId(name);
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      @font-face {
        font-family: '${name}';
        src: url('${url}');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `;
    root.style.setProperty("--theme-font-family", `'${name}', ${fallback}`);
    return;
  }

  root.style.setProperty("--theme-font-family", `'${name}', ${fallback}`);
}
