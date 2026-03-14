import "../../styles/Admin_styles/GenerateWebsitePreview.css";
import ecommerceGlobalCss from "../../styles/ecommerce_styles/global.css?inline";
import ecommerceHomeCss from "../../styles/ecommerce_styles/home_page.css?inline";
import ecommerceLeadCss from "../../styles/ecommerce_styles/lead_image.css?inline";
import ecommerceBannerCss from "../../styles/ecommerce_styles/banner.css?inline";
import ecommerceAboutCss from "../../styles/ecommerce_styles/about.css?inline";
import ecommerceDiscographyCss from "../../styles/ecommerce_styles/discography.css?inline";
import ecommerceEventsCss from "../../styles/ecommerce_styles/event.css?inline";
import ecommerceAnnouncementsCss from "../../styles/ecommerce_styles/announcement.css?inline";
import ecommerceFooterCss from "../../styles/ecommerce_styles/footer.css?inline";
import modernReactCss from "../../styles/modern-react.css?inline";
import { resolveTemplateKey } from "../../lib/template-registry.js";
import { normalizeBannerGallery } from "../../lib/banner-gallery.js";
import { applyThemeColors } from "../../lib/site-runtime.js";
import {
  TEMPLATE_PREVIEW_STORAGE_KEY,
  readTemplatePreviewDraft,
} from "../../lib/template-preview.js";

const DEFAULT_MEMBERS = [
  { name: "Member One", birthdate: "2000-01-15" },
  { name: "Member Two", birthdate: "2001-03-22" },
  { name: "Member Three", birthdate: "2002-06-09" },
  { name: "Member Four", birthdate: "2003-11-30" },
];

const DEFAULT_ALBUMS = [
  { title: "Sample Album One", year: "2024", songs: 6, description: "Mini album" },
  { title: "Sample Album Two", year: "2025", songs: 4, description: "Single release" },
  { title: "Sample Album Three", year: "2026", songs: 10, description: "Studio album" },
];

const DEFAULT_ANNOUNCEMENTS = [
  { date: "April 2", title: "Homepage launch preview using the selected template" },
  { date: "April 10", title: "Theme tokens now drive cards, text, and sections" },
  { date: "April 18", title: "Progressive rendering shows the homepage building live" },
];
const GALLERY_PREVIEW_COUNT = 10;
const SOCIAL_ICONS = {
  instagram: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980429/instagram_zwwjvb.png",
  facebook: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980422/facebook_otf7ub.png",
  tiktok: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980419/tiktok_i3uoas.png",
  spotify: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980414/spotify_n9ygps.png",
  x: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980413/twitter_jzfvjn.png",
  youtube: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980408/youtube_mrubg2.png",
};

const PREVIEW_UI_CSS = `
  :host{display:block;min-height:100%}*{box-sizing:border-box}a,button,input,textarea,select{pointer-events:none!important}
  .runtime{min-height:calc(100vh - 40px);background:var(--color-background,#f8fafc);color:var(--theme-section-text,#1f2937)}
  .meta{position:sticky;top:0;z-index:30;padding:18px;border-bottom:1px solid color-mix(in srgb,var(--border,#cbd5e1) 58%,transparent);background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.9));backdrop-filter:blur(16px)}
  .meta-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.meta-copy{display:grid;gap:6px}
  .meta-kicker{display:inline-flex;width:fit-content;padding:.4rem .8rem;border-radius:999px;background:color-mix(in srgb,var(--theme-button-bg,#1d4ed8) 12%,white 88%);font:800 .72rem/1 var(--theme-font-body,var(--theme-font-family,Arial,sans-serif));letter-spacing:.16em;text-transform:uppercase}
  .meta-title{margin:0;font:700 clamp(1.45rem,2.8vw,2.1rem)/1 var(--theme-font-heading,var(--theme-font-family,Arial,sans-serif));color:var(--theme-section-heading,#0f172a)}
  .meta-subtitle{margin:0;font:400 .95rem/1.55 var(--theme-font-body,var(--theme-font-family,Arial,sans-serif));color:var(--theme-section-text,#475569)}
  .stage-chip{display:inline-flex;padding:.72rem 1rem;border-radius:999px;background:var(--theme-button-bg,#1d4ed8);color:var(--theme-button-text,#fff);font:700 .82rem/1 var(--theme-font-body,var(--theme-font-family,Arial,sans-serif))}
  .status-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px}.status{display:grid;gap:4px;padding:12px 14px;border-radius:18px;border:1px solid color-mix(in srgb,var(--border,#cbd5e1) 58%,transparent);background:color-mix(in srgb,var(--color-surface,#fff) 92%,transparent)}
  .status span{font:700 .72rem/1 var(--theme-font-body,var(--theme-font-family,Arial,sans-serif));letter-spacing:.14em;text-transform:uppercase;color:var(--theme-section-muted,#64748b)}.status strong{font:700 .94rem/1.2 var(--theme-font-heading,var(--theme-font-family,Arial,sans-serif));color:var(--theme-section-heading,#0f172a)}.status em{font-style:normal;font:400 .84rem/1.4 var(--theme-font-body,var(--theme-font-family,Arial,sans-serif));color:var(--theme-section-text,#475569)}
  .status[data-state="ready"]{border-color:color-mix(in srgb,var(--accent-color,#22c55e) 44%,transparent);background:color-mix(in srgb,var(--accent-color,#22c55e) 10%,white 90%)}.status[data-state="rendering"]{border-color:color-mix(in srgb,var(--theme-button-bg,#1d4ed8) 45%,transparent);background:color-mix(in srgb,var(--theme-button-bg,#1d4ed8) 9%,white 91%)}
  .page{padding:18px}.skeleton{margin-bottom:16px;padding:20px;border-radius:24px;border:1px dashed color-mix(in srgb,var(--border,#cbd5e1) 64%,transparent);background:linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.6))}
  .skeleton-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.skeleton-head span{font:700 clamp(1.1rem,2vw,1.4rem)/1 var(--theme-font-heading,var(--theme-font-family,Arial,sans-serif));color:var(--theme-section-heading,#0f172a)}.skeleton-head strong{padding:.38rem .68rem;border-radius:999px;background:color-mix(in srgb,var(--theme-button-bg,#1d4ed8) 10%,white 90%);font:700 .75rem/1 var(--theme-font-body,var(--theme-font-family,Arial,sans-serif));letter-spacing:.12em;text-transform:uppercase}
  .skeleton-surface{position:relative;min-height:180px;overflow:hidden;border-radius:22px;background:color-mix(in srgb,var(--color-surface,#fff) 88%,transparent);border:1px solid color-mix(in srgb,var(--border,#cbd5e1) 50%,transparent)}.skeleton-surface[data-kind="hero"]{min-height:52vh}.skeleton-surface[data-kind="nav"]{min-height:84px}.skeleton-surface[data-kind="footer"]{min-height:170px}
  .skeleton-surface::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.78),transparent);transform:translateX(-100%);animation:shimmer 1.5s linear infinite}.lines{position:absolute;inset:20px;display:grid;gap:12px;align-content:start}.line{height:14px;border-radius:999px;background:color-mix(in srgb,var(--color-primary,#94a3b8) 18%,white 82%)}.line:nth-child(1){width:38%}.line:nth-child(2){width:72%}.line:nth-child(3){width:56%}.line:nth-child(4){width:64%}
  @keyframes shimmer{100%{transform:translateX(100%)}}@media (max-width:768px){.meta{padding:16px}.meta-top{flex-direction:column;align-items:flex-start}.page{padding:12px}.skeleton{padding:16px}.skeleton-surface[data-kind="hero"]{min-height:38vh}}
`;

const BINI_CSS = `
  ${ecommerceGlobalCss}${ecommerceHomeCss}${ecommerceLeadCss}${ecommerceBannerCss}${ecommerceAboutCss}${ecommerceDiscographyCss}${ecommerceEventsCss}${ecommerceAnnouncementsCss}${ecommerceFooterCss}
  .preview-bini{background:var(--secondary-background,#fff);color:var(--theme-section-text,#334155);overflow:hidden}
  .preview-bini .navbar{position:sticky!important;top:0!important}.preview-bini .ec-lead-image{min-height:68vh;height:68vh;margin-left:0;margin-right:0;width:100%;max-width:none}.preview-bini .banner{margin:0}.preview-bini .member-info-container{display:flex!important}
  .preview-bini .banner-card-media{min-height:280px}.preview-bini .banner-card-featured .banner-card-media{min-height:360px}
`;

const MODERN_CSS = `
  ${modernReactCss}
  .preview-modern{min-height:100vh;background:radial-gradient(circle at top,color-mix(in srgb,var(--color-accent,#d946ef) 12%,transparent),transparent 28%),linear-gradient(180deg,color-mix(in srgb,var(--color-background,#fff) 92%,#050816 8%),var(--color-background,#fff));color:var(--color-text-primary,#0f172a)}
  .preview-modern .modern-nav{position:sticky;top:0;z-index:25;border-bottom:1px solid color-mix(in srgb,var(--color-primary,#7c3aed) 22%,white 78%);background:linear-gradient(180deg,rgba(15,23,42,.2),rgba(15,23,42,.08));backdrop-filter:blur(14px)}
  .preview-modern .brand-shell{display:inline-flex;align-items:center;justify-content:center;min-height:3.4rem;padding:.72rem 1rem;border-radius:1.25rem;border:1px solid rgba(255,255,255,.22);background:linear-gradient(180deg,rgba(255,255,255,.84),rgba(255,255,255,.66));box-shadow:0 16px 34px rgba(0,0,0,.16)}.preview-modern .brand-shell img{max-height:3rem;width:auto;object-fit:contain}
  .preview-modern .preview-panel{background:color-mix(in srgb,var(--color-surface,#fff) 84%,rgba(15,23,42,.16) 16%);border:1px solid color-mix(in srgb,var(--color-primary,#7c3aed) 16%,white 84%);box-shadow:0 24px 60px rgba(15,23,42,.16)}
`;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clearPreviewTimers(root) {
  const timers = Array.isArray(root.__previewTimers) ? root.__previewTimers : [];
  timers.forEach((timerId) => window.clearTimeout(timerId));
  root.__previewTimers = [];
}

function queuePreviewTimer(root, timerId) {
  if (!Array.isArray(root.__previewTimers)) root.__previewTimers = [];
  root.__previewTimers.push(timerId);
}

function renderPlaceholder(root, title, description) {
  root.innerHTML = `
    <div class="gw-template-preview-shell">
      <div class="gw-template-preview-empty">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </div>
    </div>
  `;
}

function getPreviewPayload() {
  const draft = readTemplatePreviewDraft();
  if (!draft || typeof draft !== "object") return null;
  const templateKey = resolveTemplateKey(draft.templateKey || draft.siteData?.template_key || draft.siteData?.template || "bini");
  const siteSlug = String(draft.siteSlug || draft.siteData?.community_type || draft.siteData?.site_slug || draft.siteData?.domain || "preview-community").trim().toLowerCase();
  const siteData = draft.siteData && typeof draft.siteData === "object" ? draft.siteData : {};
  return {
    ...draft,
    templateKey,
    siteSlug,
    siteData: {
      ...siteData,
      previewMode: true,
      template: templateKey,
      template_key: templateKey,
      community_type: siteSlug,
      site_slug: siteSlug,
      domain: siteData.domain || siteSlug,
      banner: normalizeBannerGallery(siteData.banner_gallery, siteData.banner, siteData.bannerLink),
      banner_gallery: normalizeBannerGallery(siteData.banner_gallery, siteData.banner, siteData.bannerLink),
    },
  };
}

function resolvePalette(payload) {
  const source = payload?.siteData?.theme?.palette || payload?.siteData?.palette || [];
  const colors = Array.isArray(source) ? source.filter(Boolean).slice(0, 5) : [];
  while (colors.length < 5) colors.push(colors.length % 2 === 0 ? "#ffffff" : "#dbe4ef");
  return colors;
}

function siteName(payload) {
  return String(payload?.siteData?.site_name || payload?.siteData?.name || payload?.templateName || "Preview Shop").trim() || "Preview Shop";
}

function previewImage(label, payload, width = 1200, height = 800, subtitle = "") {
  const [primary = "#8b5cf6", accent = "#06b6d4", support = "#1f2937", , surface = "#ffffff"] = resolvePalette(payload);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${surface}"/><stop offset="48%" stop-color="${primary}"/><stop offset="100%" stop-color="${accent}"/></linearGradient></defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.22)}" r="${Math.round(Math.min(width, height) * 0.11)}" fill="${support}" opacity="0.16"/><circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.76)}" r="${Math.round(Math.min(width, height) * 0.15)}" fill="${accent}" opacity="0.22"/>
      <text x="50%" y="${subtitle ? "46%" : "53%"}" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.085)}" font-weight="700">${escapeHtml(label)}</text>
      ${subtitle ? `<text x="50%" y="60%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.034)}" opacity="0.9">${escapeHtml(subtitle)}</text>` : ""}
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function formatBirthdate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00Z`)
    : new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function resolveMembers(payload) {
  const rows = Array.isArray(payload?.siteData?.members) && payload.siteData.members.length ? payload.siteData.members : DEFAULT_MEMBERS;
  return rows.slice(0, 4).map((member, index) => ({
    name: String(member?.name || `Member ${index + 1}`).trim() || `Member ${index + 1}`,
    birthdate: formatBirthdate(member?.birthdate) || `January ${index + 10}, 200${index}`,
    image: String(member?.image || member?.image_profile || "").trim() || previewImage(String(member?.name || `Member ${index + 1}`), payload, 860, 1080, "Member Card"),
  }));
}

function resolveAlbums(payload) {
  return DEFAULT_ALBUMS.map((album, index) => ({
    ...album,
    cover: previewImage(`Album ${index + 1}`, payload, 920, 920, album.title),
  }));
}

function resolvePreviewBannerImages(payload) {
  const providedImages = normalizeBannerGallery(
    payload?.siteData?.banner_gallery,
    payload?.siteData?.banner,
  ).slice(0, GALLERY_PREVIEW_COUNT);
  if (providedImages.length) {
    return providedImages;
  }

  const fallbackImages = normalizeBannerGallery(
    payload?.siteData?.group_photo,
    payload?.siteData?.lead_image,
    payload?.siteData?.logo,
  ).slice(0, GALLERY_PREVIEW_COUNT);
  if (fallbackImages.length) {
    return fallbackImages;
  }

  return [
    ...Array.from({ length: GALLERY_PREVIEW_COUNT }, (_, index) => (
      previewImage(`Gallery ${String(index + 1).padStart(2, "0")}`, payload, 900, 1200, "Gallery Card")
    )),
  ];
}

function renderSkeleton(section) {
  return `<section class="skeleton"><div class="skeleton-head"><span>${escapeHtml(section.label)}</span><strong>${escapeHtml(section.badge)}</strong></div><div class="skeleton-surface" data-kind="${escapeHtml(section.kind)}"><div class="lines"><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span></div></div></section>`;
}

function renderHeader(payload, blueprint, readyCount, stage) {
  const stageLabel = stage === "layout" ? "Generating layout preview" : stage === "progress" ? "Rendering homepage sections" : "Live homepage preview";
  return `<section class="meta"><div class="meta-top"><div class="meta-copy"><span class="meta-kicker">Homepage Preview Pipeline</span><h1 class="meta-title">${escapeHtml(siteName(payload))} - ${escapeHtml(payload.templateKey.toUpperCase())} Template</h1><p class="meta-subtitle">Layout preview first, then progressive section render, then full homepage preview using the selected ecommerce template.</p></div><div class="stage-chip">${escapeHtml(stageLabel)}</div></div><div class="status-grid">${blueprint.map((section, index) => {
    const state = readyCount > index ? "ready" : readyCount === index && stage !== "layout" ? "rendering" : "pending";
    const label = state === "ready" ? "Ready" : state === "rendering" ? "Rendering" : "Waiting";
    return `<article class="status" data-state="${state}"><span>${escapeHtml(section.label)}</span><strong>${escapeHtml(section.summary)}</strong><em>${label}</em></article>`;
  }).join("")}</div></section>`;
}

function buildSocials(payload) {
  const keys = ["instagram", "facebook", "tiktok", "youtube"];
  return keys.map((key) => ({ key, href: String(payload?.siteData?.[`${key}_url`] || "#").trim() || "#" }));
}

function renderBiniNavbar(payload) {
  const logo = String(payload?.siteData?.logo || payload?.siteData?.logo_url || "").trim() || previewImage(siteName(payload), payload, 300, 110, "Logo");
  return `<header class="navbar ec-hero-nav scrolled"><button class="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">&#9776;</button><a href="#" class="logo"><img src="${logo}" alt="${escapeHtml(siteName(payload))} logo" class="logo-img"></a><nav id="navMenu" role="navigation" aria-label="Main navigation"><a href="#home" class="nav-link active">Home</a><a href="#about" class="nav-link">About</a><a href="#music" class="nav-link">Music</a><a href="#events" class="nav-link">Events</a><a href="#announcements" class="nav-link">Announcements</a><a href="#shop" class="nav-link">Shop</a></nav><div class="nav-right" role="navigation" aria-label="User actions"><a href="#" class="nav-icon" aria-label="Orders">Orders</a><a href="#" class="nav-icon" aria-label="Cart">Cart</a><a href="#" class="nav-icon" aria-label="Account">User</a></div></header>`;
}

function renderBiniHero(payload) {
  const hero = String(payload?.siteData?.lead_image || payload?.siteData?.group_photo || "").trim() || previewImage(siteName(payload), payload, 1600, 920, "Lead Image");
  return `<section class="ec-lead-image" aria-label="${escapeHtml(siteName(payload))} lead image section"><img class="ec-lead-image__img" src="${hero}" alt="${escapeHtml(siteName(payload))} lead visual"><div class="ec-lead-image__socials">${buildSocials(payload).map((item) => `<a href="${escapeHtml(item.href)}" class="ec-lead-image__social" data-platform="${item.key}"><img src="${SOCIAL_ICONS[item.key] || SOCIAL_ICONS.instagram}" alt="${escapeHtml(item.key)}"></a>`).join("")}</div></section>`;
}

function renderBiniBanner(payload) {
  const images = resolvePreviewBannerImages(payload);
  return `<section id="home" class="banner"><div class="banner-shell"><div class="banner-header"><div class="banner-copy-block"><span class="banner-kicker">Gallery</span><h2 class="banner-title">Gallery</h2><p class="banner-description">${escapeHtml(images.length ? "The selected homepage gallery now renders as resized image cards based on the admin uploads. This layout is ready to show 10 images or more." : "This section previews how the homepage gallery cards will look once gallery images are provided.")}</p></div></div><div class="banner-gallery-grid">${images.map((image, index) => {
    const isFeatured = index === 0 && images.length > 2;
    const label = isFeatured ? "Gallery Highlight" : `Gallery Card ${String(index + 1).padStart(2, "0")}`;
    return `<article class="banner-card ${isFeatured ? "banner-card-featured" : ""}"><div class="banner-card-media"><img src="${escapeHtml(image)}" alt="Banner gallery preview ${index + 1}"></div><div class="banner-card-copy"><span class="banner-card-index">${escapeHtml(label)}</span><strong class="banner-card-label">${escapeHtml(siteName(payload))}</strong></div></article>`;
  }).join("")}</div></div></section>`;
}

function renderBiniAbout(payload) {
  const members = resolveMembers(payload);
  const groupPhoto = String(payload?.siteData?.group_photo || payload?.siteData?.lead_image || "").trim() || previewImage(siteName(payload), payload, 980, 1180, "Group Photo");
  const description = String(payload?.siteData?.description || payload?.siteData?.short_bio || "").trim() || "This generated preview shows how the About section, stacked gallery, member details, and navigation list will look after the site is generated.";
  return `<section id="about" class="about-section"><div class="about-container"><div class="about-column about-image-column"><div class="carousel-container"><div class="image-stack"><img src="${members[1]?.image || groupPhoto}" alt="Member photo" class="carousel-image back-2"><img src="${members[0]?.image || groupPhoto}" alt="Member photo" class="carousel-image back-1"><img src="${groupPhoto}" alt="Group photo" class="carousel-image main"></div><div class="carousel-controls"><button class="carousel-arrow" type="button">&#8249;</button><div class="pagination-indicator">1 / ${members.length + 1}</div><button class="carousel-arrow" type="button">&#8250;</button></div></div></div><div class="about-column about-text-column"><div class="info-container"><div class="group-info"><h2 class="about-title">About ${escapeHtml(siteName(payload))}</h2><div class="about-content"><p class="about-description">${escapeHtml(description)}</p></div></div><div class="member-info-container"><div class="member-title"><span class="bini-label">Featured Member</span><span class="member-name-display">${escapeHtml(members[0].name)}</span></div><div class="member-details"><div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">${escapeHtml(members[0].name)}</span></div><div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">${escapeHtml(members[0].birthdate)}</span></div></div></div></div></div><div class="about-column about-members-column"><div class="members-list"><button class="member-name active" type="button">ALL</button>${members.map((member) => `<button class="member-name" type="button">${escapeHtml(member.name)}</button>`).join("")}</div></div></div></section>`;
}

function renderBiniMusic(payload) {
  const albums = resolveAlbums(payload);
  const positions = ["translate(-50%, -50%) translateX(0) scale(1)", "translate(-50%, -50%) translateX(58%) scale(0.82)", "translate(-50%, -50%) translateX(-58%) scale(0.82)"];
  return `<section id="music" class="discography-section"><h2 class="discography-title">Discography</h2><div class="album-carousel"><button class="carousel-btn prev" type="button">&#8249;</button><div class="album-container">${albums.map((album, index) => `<article class="album-card ${index === 0 ? "active" : ""}" style="transform:${positions[index] || positions[0]};opacity:${index === 0 ? 1 : 0.72};z-index:${index === 0 ? 3 : 2};pointer-events:auto;"><a href="#"><img src="${album.cover}" alt="${escapeHtml(album.title)} cover"></a></article>`).join("")}</div><button class="carousel-btn next" type="button">&#8250;</button></div><div class="discography-details"><h3 class="discography-active-title">${escapeHtml(albums[0].title)}</h3><p class="discography-active-meta">${escapeHtml(`${albums[0].description} - ${albums[0].year} - ${albums[0].songs} tracks`)}</p><a class="discography-cta" href="#">More Music</a></div></section>`;
}

function renderBiniEvents(payload) {
  const eventImage = previewImage(siteName(payload), payload, 1400, 900, "Event Poster");
  return `<section id="events"><h2 class="section-title">Events</h2><div class="event-list"><div class="event-feature"><div class="event-copy"><p class="event-feature-text">Featured event section preview for your ecommerce homepage.</p><p class="event-feature-text">Poster cards, CTA buttons, and text hierarchy use the active template theme and typography.</p></div><a class="event-feature-card" href="#"><img src="${eventImage}" alt="Event poster preview"></a><div class="event-action"><a class="event-feature-link" href="#">See more</a></div></div></div></section>`;
}

function renderBiniAnnouncements() {
  return `<section id="announcements" class="ec-announcement"><div class="ec-announcement-shell"><h2 class="ec-announcement-title">Announcements</h2><div class="ec-announcement-list">${DEFAULT_ANNOUNCEMENTS.map((item) => `<article class="ec-announcement-row"><div class="ec-announcement-date">${escapeHtml(item.date)}</div><h3 class="ec-announcement-item-title">${escapeHtml(item.title)}</h3><div class="ec-announcement-link-wrap"><a href="#" class="ec-announcement-link">See Details</a></div></article>`).join("")}</div><div class="ec-announcement-pagination"><button type="button" class="ec-announcement-page-btn" disabled>&lsaquo;</button><span class="ec-announcement-page-label">Page 1 of 1</span><button type="button" class="ec-announcement-page-btn" disabled>&rsaquo;</button></div></div></section>`;
}

function renderBiniFooter(payload) {
  return `<footer class="ec-footer"><div class="ec-footer-grid"><section class="ec-footer-brand"><h4>${escapeHtml(siteName(payload))}</h4><p class="ec-footer-brand-note">Community-powered fan space.</p></section></div><p class="ec-footer-copy">&copy; 2026 ${escapeHtml(siteName(payload))}. Educational purposes only.</p></footer>`;
}

function renderModernNavbar(payload) {
  const logo = String(payload?.siteData?.logo || payload?.siteData?.logo_url || "").trim() || previewImage(siteName(payload), payload, 300, 110, "Logo");
  return `<header class="modern-nav"><nav class="container mx-auto px-4 min-h-[5rem] md:min-h-[5.5rem] flex items-center justify-between gap-6"><div class="brand-shell"><img src="${logo}" alt="${escapeHtml(siteName(payload))} logo"></div><div class="hidden md:flex items-center gap-10">${["Home", "About", "Members", "Music", "Events", "Shop"].map((label) => `<span class="font-body text-sm font-bold uppercase tracking-[0.28em] text-white/90">${label}</span>`).join("")}</div><div class="md:hidden text-white/90 font-body text-sm uppercase tracking-[0.2em]">Menu</div></nav></header>`;
}

function renderModernHero(payload) {
  const hero = String(payload?.siteData?.lead_image || payload?.siteData?.group_photo || "").trim() || previewImage(siteName(payload), payload, 1600, 920, "Lead Image");
  return `<section id="home" class="relative min-h-screen flex items-center justify-center overflow-hidden"><div class="absolute inset-0 bg-cover bg-center" style="background-image:url('${hero}')"></div><div class="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/55"></div><div class="container mx-auto px-4 z-10"><div class="mx-auto flex w-fit max-w-full flex-col items-center gap-4 rounded-[28px] border border-white/15 bg-black/20 px-5 py-4 text-center backdrop-blur-md md:px-7"><p class="text-[0.65rem] font-body uppercase tracking-[0.34em] text-white/72 md:text-xs">Follow ${escapeHtml(siteName(payload))}</p></div></div></section>`;
}

function renderModernAbout(payload) {
  const shortBio = String(payload?.siteData?.short_bio || "").trim();
  const description = String(payload?.siteData?.description || "").trim() || `Preview of the About section for ${siteName(payload)}. This area shows the body copy, typography rhythm, and content surface of the Modern ecommerce homepage.`;
  return `<section id="about" class="py-24 px-4"><div class="container mx-auto"><h2 class="mb-4 text-4xl font-display text-gradient md:text-5xl lg:text-6xl">ABOUT</h2><div class="rounded-2xl border border-border/60 bg-card/70 p-6 md:p-8 preview-panel">${shortBio ? `<p class="text-primary font-body uppercase tracking-widest text-xs md:text-sm mb-4">${escapeHtml(shortBio)}</p>` : ""}<p class="text-foreground/90 font-body text-base md:text-lg leading-relaxed max-w-4xl">${escapeHtml(description)}</p></div></div></section>`;
}

function renderModernMembers(payload) {
  return `<section id="members" class="py-24 px-4 bg-card/40"><div class="container mx-auto"><h2 class="mb-4 text-4xl font-display text-gradient md:text-5xl lg:text-6xl">MEMBERS</h2><p class="text-muted-foreground font-body mb-12 max-w-2xl">Meet the members</p><div class="grid grid-cols-2 md:grid-cols-4 gap-6">${resolveMembers(payload).map((member) => `<div class="group cursor-pointer"><div class="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/50 bg-accent/25 p-3 md:p-4 preview-panel"><img src="${member.image}" alt="${escapeHtml(member.name)}" class="h-full w-full object-contain object-top"><div class="absolute bottom-0 left-0 right-0 p-4"><p class="text-sm text-primary font-body">Date of Birth</p><p class="text-xs text-muted-foreground font-body mt-1 line-clamp-2">${escapeHtml(member.birthdate)}</p></div></div><h3 class="mt-3 font-display text-xl text-foreground text-center">${escapeHtml(member.name)}</h3></div>`).join("")}</div></div></section>`;
}

function renderModernMusic(payload) {
  return `<section id="music" class="py-24 px-4"><div class="container mx-auto"><h2 class="mb-12 text-4xl font-display text-gradient md:text-5xl lg:text-6xl">DISCOGRAPHY</h2><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">${resolveAlbums(payload).map((album) => `<article class="group relative"><div class="relative overflow-hidden rounded-lg border border-border/50 bg-card/70 p-3 preview-panel"><img src="${album.cover}" alt="${escapeHtml(album.title)}" class="aspect-square w-full object-contain"></div><div class="mt-3"><h3 class="font-display text-lg text-foreground">${escapeHtml(album.title)}</h3><p class="text-muted-foreground font-body text-sm">${escapeHtml(`${album.year} - ${album.songs} songs`)}</p></div></article>`).join("")}</div></div></section>`;
}

function renderModernEvents(payload) {
  const poster = previewImage(siteName(payload), payload, 1200, 1500, "Event Poster");
  return `<section id="events" class="py-24 px-4 bg-card/40"><div class="container mx-auto"><h2 class="mb-4 text-4xl font-display text-gradient md:text-5xl lg:text-6xl">EVENTS</h2><p class="text-muted-foreground font-body mb-12 max-w-2xl">Browse the latest event posters and ticket links for this community.</p><div class="grid md:grid-cols-2 gap-8">${[1,2].map((index) => `<article class="group block"><div class="overflow-hidden rounded-2xl border border-border/50 bg-accent/20 p-4 md:p-5 preview-panel"><div class="flex min-h-[22rem] items-center justify-center overflow-hidden rounded-xl bg-background/35 p-3 md:min-h-[28rem] md:p-4"><img src="${poster}" alt="Event ${index}" class="max-h-[20rem] w-full object-contain md:max-h-[26rem]"></div><div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><h3 class="font-display text-xl text-foreground md:text-2xl">Featured Event ${index}</h3><div class="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border/60 bg-card/80 px-3 py-2 text-foreground"><span class="font-body text-sm">Get Tickets</span></div></div></div></article>`).join("")}</div></div></section>`;
}

function renderModernFooter(payload) {
  return `<footer class="px-4 pb-8 pt-16 border-t" style="border-color: color-mix(in srgb, var(--color-primary) 18%, white 82%); background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 72%, white 28%), color-mix(in srgb, var(--color-primary-soft) 38%, var(--color-background) 62%) 34%, var(--color-background) 100%);"><div class="container mx-auto"><div class="grid lg:grid-cols-[1fr_1.2fr] gap-8 md:gap-10 items-start"><div class="rounded-2xl border p-6 md:p-8 preview-panel"><h3 class="font-display text-3xl md:text-4xl text-gradient">Contact Admin</h3><p class="mt-4 text-muted-foreground font-body leading-relaxed">Send your concern, feedback, or report directly to the admin team for this community site.</p></div><div class="rounded-2xl border p-6 md:p-8 preview-panel"><div class="grid md:grid-cols-2 gap-4"><div class="h-11 rounded-xl border border-border bg-card"></div><div class="h-11 rounded-xl border border-border bg-card"></div></div><div class="mt-4 h-36 rounded-xl border border-border bg-card"></div><div class="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground font-body text-sm font-semibold">Send Message</div></div></div><div class="mt-8 pt-6 border-t border-border/60 text-center space-y-1"><p class="text-sm text-muted-foreground font-body">&copy; 2026 ${escapeHtml(siteName(payload))} Fanhub. Educational Purposes Only.</p><p class="text-xs text-muted-foreground/70 font-body">This is an unofficial fan-made site.</p></div></div></footer>`;
}

function getBlueprint(payload) {
  if (payload?.templateKey === "modern") {
    return [
      { key: "navbar", label: "Navbar", summary: "Modern nav shell", badge: "Layout", kind: "nav", render: () => renderModernNavbar(payload) },
      { key: "hero", label: "Hero", summary: "Lead image hero", badge: "Hero", kind: "hero", render: () => renderModernHero(payload) },
      { key: "about", label: "About", summary: "Intro copy block", badge: "Content", kind: "section", render: () => renderModernAbout(payload) },
      { key: "members", label: "Members", summary: "Profile card grid", badge: "Cards", kind: "section", render: () => renderModernMembers(payload) },
      { key: "music", label: "Music", summary: "Album grid", badge: "Media", kind: "section", render: () => renderModernMusic(payload) },
      { key: "events", label: "Events", summary: "Poster spotlight", badge: "CTA", kind: "section", render: () => renderModernEvents(payload) },
      { key: "footer", label: "Footer", summary: "Contact and footer", badge: "Footer", kind: "footer", render: () => renderModernFooter(payload) },
    ];
  }
  return [
    { key: "navbar", label: "Navbar", summary: "Hero navigation", badge: "Layout", kind: "nav", render: () => renderBiniNavbar(payload) },
    { key: "hero", label: "Lead Image", summary: "Full-width visual", badge: "Hero", kind: "hero", render: () => renderBiniHero(payload) },
    { key: "banner", label: "Gallery", summary: "Gallery card section", badge: "Media", kind: "section", render: () => renderBiniBanner(payload) },
    { key: "about", label: "About", summary: "Story and member focus", badge: "Content", kind: "section", render: () => renderBiniAbout(payload) },
    { key: "music", label: "Discography", summary: "Album carousel", badge: "Music", kind: "section", render: () => renderBiniMusic(payload) },
    { key: "events", label: "Events", summary: "Poster CTA block", badge: "CTA", kind: "section", render: () => renderBiniEvents(payload) },
    { key: "announcements", label: "Announcements", summary: "Notice list", badge: "Feed", kind: "section", render: () => renderBiniAnnouncements() },
    { key: "footer", label: "Footer", summary: "Compact site footer", badge: "Footer", kind: "footer", render: () => renderBiniFooter(payload) },
  ];
}

function renderSectionSafely(section) {
  try {
    return section.render();
  } catch (error) {
    console.error(`GenerateWebsitePreview: failed to render ${section.key}`, error);
    return renderSkeleton(section);
  }
}

function renderMarkup(payload, blueprint, readyCount) {
  const wrapperClass = payload?.templateKey === "modern" ? "preview-modern" : "preview-bini";
  return `<div class="${wrapperClass}">${blueprint.map((section, index) => (index < readyCount ? renderSectionSafely(section) : renderSkeleton(section))).join("")}</div>`;
}

function renderShadow(host, payload, blueprint, readyCount, stage) {
  const shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
  const css = payload?.templateKey === "modern" ? `${PREVIEW_UI_CSS}${MODERN_CSS}` : `${PREVIEW_UI_CSS}${BINI_CSS}`;
  shadowRoot.innerHTML = `<style>${css}</style><div class="runtime">${renderHeader(payload, blueprint, readyCount, stage)}<div class="page">${renderMarkup(payload, blueprint, readyCount)}</div></div>`;
}

export default function GenerateWebsitePreview() {
  const root = this.root;

  const renderPreview = () => {
    clearPreviewTimers(root);
    const payload = getPreviewPayload();
    if (!payload?.templateKey || !payload?.siteData) {
      renderPlaceholder(root, "Homepage preview is waiting for your draft", "Select a template and start filling out the form to see the ecommerce homepage preview pipeline.");
      return;
    }

    const blueprint = getBlueprint(payload);
    root.innerHTML = `<div class="gw-template-preview-shell"><div class="gw-template-preview-stage"><div class="gw-template-preview-canvas" id="gwTemplatePreviewCanvas"></div></div></div>`;
    const canvas = root.querySelector("#gwTemplatePreviewCanvas");
    if (!canvas) return;

    const token = Number(root.__previewRenderToken || 0) + 1;
    root.__previewRenderToken = token;
    window.__FANHUB_TEMPLATE_PREVIEW__ = payload;
    document.body.classList.add("gw-template-preview-body");
    document.documentElement.classList.add("gw-template-preview-html");
    applyThemeColors(payload.siteData);

    if (root.__previewHasRenderedOnce) {
      renderShadow(canvas, payload, blueprint, blueprint.length, "full");
      return;
    }

    renderShadow(canvas, payload, blueprint, 0, "layout");
    blueprint.forEach((_, index) => {
      const timerId = window.setTimeout(() => {
        if (root.__previewRenderToken !== token) return;
        const readyCount = index + 1;
        renderShadow(canvas, payload, blueprint, readyCount, readyCount >= blueprint.length ? "full" : "progress");
        if (readyCount >= blueprint.length) {
          root.__previewHasRenderedOnce = true;
        }
      }, 120 * (index + 1));
      queuePreviewTimer(root, timerId);
    });
  };

  renderPreview();

  if (typeof window !== "undefined" && !window.__gwTemplatePreviewBound) {
    window.addEventListener("storage", (event) => {
      if (event.key !== TEMPLATE_PREVIEW_STORAGE_KEY) return;
      renderPreview();
    });
    window.__gwTemplatePreviewBound = true;
  }
}
