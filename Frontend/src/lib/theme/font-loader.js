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

function buildFontFamilyValue(name, fallback = "sans-serif") {
  return `'${sanitizeFontName(name)}', ${fallback}`;
}

export function applyFontConfig(font, options = {}) {
  if (typeof document === "undefined" || !font) return;

  const root = options.root || document.documentElement;
  const cssVariable = options.cssVariable || "--theme-font-family";
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
    root.style.setProperty(cssVariable, buildFontFamilyValue(name, fallback));
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
    root.style.setProperty(cssVariable, buildFontFamilyValue(name, fallback));
    return;
  }

  root.style.setProperty(cssVariable, buildFontFamilyValue(name, fallback));
}

export function applyTypographyConfig(typography = {}, options = {}) {
  if (typeof document === "undefined") return;

  const root = options.root || document.documentElement;
  const headingFallback = options.headingFallback || "sans-serif";
  const bodyFallback = options.bodyFallback || "sans-serif";

  const heading = typography?.heading || typography?.font_heading || {
    type: "system",
    name: "Arial",
  };
  const body = typography?.body || typography?.font_body || heading || {
    type: "system",
    name: "Arial",
  };

  applyFontConfig(heading, {
    root,
    cssVariable: "--theme-font-heading",
    fallback: headingFallback,
  });
  applyFontConfig(body, {
    root,
    cssVariable: "--theme-font-body",
    fallback: bodyFallback,
  });

  root.style.setProperty(
    "--theme-font-family",
    root.style.getPropertyValue("--theme-font-body") || buildFontFamilyValue(body?.name || "Arial", bodyFallback),
  );
  root.style.setProperty(
    "--theme-font-size-base",
    String(typography?.fontSizeBase || typography?.font_size_base || "16px").trim() || "16px",
  );
  root.style.setProperty(
    "--theme-line-height",
    String(typography?.lineHeight || typography?.line_height || "1.6").trim() || "1.6",
  );
  root.style.setProperty(
    "--theme-letter-spacing",
    String(typography?.letterSpacing || typography?.letter_spacing || "0.02em").trim() || "0.02em",
  );
}
