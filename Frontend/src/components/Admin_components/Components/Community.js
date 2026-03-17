import api from '../../../services/bini_services/api.js';
import '../../../styles/Admin_styles/Community.css';
import { fetchAdminSites, getAdminHeaders } from './admin-sites.js';
import { normalizeBannerGallery } from '../../../lib/banner-gallery.js';
import { showToast } from '../../../utils/toast.js';

export default function Community() {
  const section = document.createElement('section');
  section.id = 'community';
  section.className = 'content-section active';

  section.innerHTML = `
    <div class="cm-section">
      <div class="cm-header">
        <h2>Sites</h2>
        <button class="cm-btn-create" id="addSiteBtn">+ Add Site</button>
      </div>

      <div class="cm-filters">
        <select class="cm-select" id="siteStatusFilter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div class="cm-sites-grid" id="sitesContainer"></div>

      <div class="cm-pagination">
        <button class="cm-btn-page" id="prevBtn">Previous</button>
        <span class="cm-page-info"><span id="currentPage">1</span> / <span id="totalPages">1</span></span>
        <button class="cm-btn-page" id="nextBtn">Next</button>
      </div>
    </div>

    <div class="cm-modal" id="editModal" style="display:none;">
      <div class="cm-modal-content">
        <div class="cm-modal-header">
          <h3>Edit Site</h3>
          <button class="cm-modal-close" id="closeModal">&times;</button>
        </div>
        <form class="cm-modal-form cm-edit-form" id="editForm">
          <section class="cm-form-section">
            <div class="cm-form-section-header">
              <div>
                <p class="cm-form-eyebrow">Site Details</p>
                <h4 class="cm-form-section-title">Core community information</h4>
              </div>
            </div>
            <div class="cm-modal-grid cm-modal-grid-2">
              <div class="form-group">
                <label>Site Name</label>
                <input type="text" id="siteName" required>
              </div>
              <div class="form-group">
                <label>Domain</label>
                <input type="text" id="siteDomain" required>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select id="status" required>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div class="form-group">
                <label>Navigation Position</label>
                <select id="navPosition">
                  <option value="">Default</option>
                  <option value="top">Top</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
              <div class="form-group cm-span-2">
                <label>Short Description</label>
                <input type="text" id="shortBio">
              </div>
              <div class="form-group cm-span-2">
                <label>Description</label>
                <textarea id="siteDescription" rows="3"></textarea>
              </div>
            </div>
          </section>

          <section class="cm-form-section">
            <div class="cm-form-section-header">
              <div>
                <p class="cm-form-eyebrow">Media & Links</p>
                <h4 class="cm-form-section-title">Match the generated website assets</h4>
              </div>
            </div>
            <div class="cm-modal-grid cm-modal-grid-2">
              <div class="form-group">
                <label>Logo URL</label>
                <input type="url" id="siteLogo" placeholder="https://...">
                <input type="file" id="siteLogoFile" accept="image/*">
                <div class="cm-group-photo-preview-wrap">
                  <img id="siteLogoPreview" class="cm-group-photo-preview" alt="Logo preview" style="display:none;">
                  <p id="siteLogoPreviewEmpty" class="cm-group-photo-empty">No logo set.</p>
                </div>
              </div>
              <div class="form-group">
                <label>Group Photo URL</label>
                <input type="url" id="groupPhoto" placeholder="https://...">
                <input type="file" id="groupPhotoFile" accept="image/*">
                <div class="cm-group-photo-preview-wrap">
                  <img id="groupPhotoPreview" class="cm-group-photo-preview" alt="Group photo preview" style="display:none;">
                  <p id="groupPhotoPreviewEmpty" class="cm-group-photo-empty">No group photo set.</p>
                </div>
              </div>
              <div class="form-group">
                <label>Lead Image URL</label>
                <input type="url" id="leadImage" placeholder="https://...">
                <input type="file" id="leadImageFile" accept="image/*">
              </div>
              <div class="form-group cm-span-2">
                <label>Gallery Images</label>
                <small class="cm-field-hint">Shown as homepage gallery cards. Upload up to 10 images or paste URLs below.</small>
                <div class="cm-gallery-actions">
                  <input type="file" id="bannerGalleryFiles" accept="image/*" multiple>
                  <button type="button" class="cm-gallery-action-btn" id="bannerGalleryBrowseBtn">Choose Up To 10 Images</button>
                  <button type="button" class="cm-gallery-action-btn cm-gallery-action-btn-secondary" id="bannerGalleryClearBtn">Clear Gallery</button>
                  <span class="cm-gallery-count" id="bannerGalleryCount">0/10 images selected</span>
                </div>
                <textarea id="bannerGalleryUrls" rows="4" placeholder="Paste one image URL per line. You can add up to 10 images."></textarea>
                <div class="cm-gallery-board" id="bannerGalleryBoard"></div>
              </div>
            </div>
            <div class="cm-social-grid">
              <div class="form-group">
                <label>Instagram URL</label>
                <input type="url" id="instagramUrl" placeholder="https://www.instagram.com/...">
              </div>
              <div class="form-group">
                <label>Facebook URL</label>
                <input type="url" id="facebookUrl" placeholder="https://www.facebook.com/...">
              </div>
              <div class="form-group">
                <label>TikTok URL</label>
                <input type="url" id="tiktokUrl" placeholder="https://www.tiktok.com/@...">
              </div>
              <div class="form-group">
                <label>Spotify URL</label>
                <input type="url" id="spotifyUrl" placeholder="https://open.spotify.com/...">
              </div>
              <div class="form-group">
                <label>X URL</label>
                <input type="url" id="xUrl" placeholder="https://x.com/...">
              </div>
              <div class="form-group">
                <label>YouTube URL</label>
                <input type="url" id="youtubeUrl" placeholder="https://www.youtube.com/...">
              </div>
            </div>
          </section>

          <section class="cm-form-section">
            <div class="cm-form-section-header">
              <div>
                <p class="cm-form-eyebrow">Design & Colors</p>
                <h4 class="cm-form-section-title">Edit the saved theme system</h4>
              </div>
            </div>
            <div class="cm-modal-grid cm-modal-grid-3">
              <div class="form-group">
                <label>Primary Color</label>
                <input type="text" id="primaryColor" placeholder="#3b82f6">
              </div>
              <div class="form-group">
                <label>Secondary Color</label>
                <input type="text" id="secondaryColor" placeholder="#ffffff">
              </div>
              <div class="form-group">
                <label>Accent Color</label>
                <input type="text" id="accentColor" placeholder="#333333">
              </div>
              <div class="form-group">
                <label>Button Style</label>
                <select id="buttonStyle">
                  <option value="">Default</option>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                  <option value="pill">Pill</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              <div class="form-group">
                <label>Saved Font Style</label>
                <input type="text" id="fontStyle" placeholder="Auto-synced from body font" readonly>
              </div>
            </div>
            <div class="cm-palette-grid" id="paletteEditor">
              <label class="cm-color-field"><span>Palette 1</span><input type="color" id="paletteColor0"></label>
              <label class="cm-color-field"><span>Palette 2</span><input type="color" id="paletteColor1"></label>
              <label class="cm-color-field"><span>Palette 3</span><input type="color" id="paletteColor2"></label>
              <label class="cm-color-field"><span>Palette 4</span><input type="color" id="paletteColor3"></label>
              <label class="cm-color-field"><span>Palette 5</span><input type="color" id="paletteColor4"></label>
            </div>
            <div class="cm-theme-preview" id="themePreview">
              <span class="cm-theme-preview-kicker">Live Theme Preview</span>
              <h4 class="cm-theme-preview-title">Community card sample</h4>
              <p class="cm-theme-preview-copy">This preview reflects the colors and button style saved for the generated site.</p>
              <div class="cm-theme-preview-actions">
                <button type="button" class="cm-theme-preview-btn cm-theme-preview-btn-primary">Primary Action</button>
                <button type="button" class="cm-theme-preview-btn cm-theme-preview-btn-secondary">Secondary</button>
              </div>
            </div>
          </section>

          <section class="cm-form-section">
            <div class="cm-form-section-header">
              <div>
                <p class="cm-form-eyebrow">Typography</p>
                <h4 class="cm-form-section-title">Reuse the generated website font settings</h4>
              </div>
            </div>
            <div class="cm-modal-grid cm-modal-grid-2">
              <div class="form-group">
                <label>Heading Font</label>
                <input type="text" id="headingFont" placeholder="Playfair Display">
              </div>
              <div class="form-group">
                <label>Body Font</label>
                <input type="text" id="bodyFont" placeholder="Arial">
              </div>
              <div class="form-group">
                <label>Base Font Size</label>
                <input type="text" id="fontSizeBase" placeholder="16px">
              </div>
              <div class="form-group">
                <label>Line Height</label>
                <input type="text" id="lineHeight" placeholder="1.6">
              </div>
              <div class="form-group">
                <label>Letter Spacing</label>
                <input type="text" id="letterSpacing" placeholder="0.02em">
              </div>
            </div>
          </section>

          <section class="cm-form-section">
            <div class="cm-form-section-header">
              <div>
                <p class="cm-form-eyebrow">Team Members</p>
                <h4 class="cm-form-section-title">Optional member list</h4>
              </div>
            </div>
            <div class="form-group">
              <div id="membersEditor"></div>
              <button type="button" class="cm-btn cm-btn-edit" id="addMemberBtn">+ Add Member</button>
            </div>
          </section>

          <div class="cm-modal-actions">
            <button type="submit" class="cm-btn cm-btn-save">Save Changes</button>
            <button type="button" class="cm-btn cm-btn-cancel" id="cancelBtn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let allSites = [];
  let filteredSites = [];
  let editingId = null;
  let editingMembers = [];
  let removedMembers = [];
  let activeMemberUploads = 0;
  let currentPage = 1;
  const itemsPerPage = 6;
  const DEFAULT_PALETTE = ['#ec4899', '#f9a8d4', '#ffffff', '#1f2937', '#831843'];
  const GALLERY_IMAGE_LIMIT = 10;

  function normalizeSites(rows) {
    return (rows || []).map((row, index) => {
      const siteName = String(row.site_name || row.name || '').trim();
      const domain = String(row.domain || row.community_type || '').trim().toLowerCase();
      const parsedId = Number(row.generated_website_id ?? row.id ?? row.site_id ?? 0);
      return {
        id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : index + 1,
        generated_website_id: Number(row.generated_website_id ?? parsedId ?? 0) || null,
        site_name: siteName || domain,
        domain,
        status: String(row.status || 'active').trim().toLowerCase(),
        short_bio: String(row.short_bio || '').trim(),
        description: String(row.description || '').trim(),
        group_photo: String(row.group_photo || '').trim(),
        lead_image: String(row.lead_image || '').trim(),
        banner: String(row.banner || row.banner_link || '').trim(),
        banner_link: String(row.banner_link || '').trim(),
        instagram_url: String(row.instagram_url || '').trim(),
        facebook_url: String(row.facebook_url || '').trim(),
        tiktok_url: String(row.tiktok_url || '').trim(),
        spotify_url: String(row.spotify_url || '').trim(),
        x_url: String(row.x_url || '').trim(),
        youtube_url: String(row.youtube_url || '').trim(),
        logo: String(row.logo || '').trim(),
        primary_color: String(row.primary_color || '').trim(),
        secondary_color: String(row.secondary_color || '').trim(),
        accent_color: String(row.accent_color || '').trim(),
        button_style: String(row.button_style || '').trim(),
        font_style: String(row.font_style || '').trim(),
        font_type: String(row.font_type || '').trim(),
        font_name: String(row.font_name || '').trim(),
        font_heading: String(row.font_heading || '').trim(),
        font_body: String(row.font_body || '').trim(),
        font_size_base: String(row.font_size_base || '').trim(),
        line_height: String(row.line_height || '').trim(),
        letter_spacing: String(row.letter_spacing || '').trim(),
        nav_position: String(row.nav_position || '').trim(),
        banner_gallery: row.banner_gallery ?? row.bannerGallery ?? '',
        palette: row.palette ?? [],
        typography: row.typography ?? {},
        theme: row.theme ?? {},
        members: Array.isArray(row.members) ? row.members : [],
      };
    }).filter((row) => row.domain);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function getSiteInitials(value) {
    return String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'SI';
  }

  function resolveSiteCardImage(site) {
    return String(site?.group_photo || '').trim();
  }

  function parseJsonValue(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;

    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeHexColor(value, fallback = '#ffffff') {
    const raw = String(value || '').trim();
    const expanded = raw.startsWith('#') ? raw : `#${raw}`;
    return /^#[0-9a-f]{6}$/i.test(expanded)
      ? expanded.toLowerCase()
      : fallback;
  }

  function getSitePalette(site) {
    const theme = parseJsonValue(site?.theme, {});
    const paletteSource = parseJsonValue(site?.palette, theme?.palette || []);
    const palette = Array.isArray(paletteSource) ? paletteSource : [];
    const normalized = palette
      .map((color) => normalizeHexColor(color, ''))
      .filter(Boolean);

    const fallbackPalette = [
      site?.primary_color || '#ec4899',
      site?.accent_color || '#831843',
      site?.secondary_color || '#ffffff',
      '#1f2937',
      '#fbcfe8',
    ].map((color, index) => normalizeHexColor(color, DEFAULT_PALETTE[index]));

    const result = normalized.length ? normalized.slice(0, 5) : fallbackPalette;
    while (result.length < 5) {
      result.push(DEFAULT_PALETTE[result.length]);
    }
    return result;
  }

  function getSiteTypography(site) {
    const theme = parseJsonValue(site?.theme, {});
    const parsedTypography = parseJsonValue(site?.typography, theme?.typography || {});

    return {
      heading: String(
        parsedTypography?.heading?.name ||
        parsedTypography?.font_heading?.name ||
        parsedTypography?.font_heading ||
        site?.font_heading ||
        site?.font_style ||
        'Arial',
      ).trim(),
      body: String(
        parsedTypography?.body?.name ||
        parsedTypography?.font_body?.name ||
        parsedTypography?.font_body ||
        site?.font_body ||
        site?.font_name ||
        site?.font_style ||
        'Arial',
      ).trim(),
      fontSizeBase: String(
        parsedTypography?.fontSizeBase ||
        parsedTypography?.font_size_base ||
        site?.font_size_base ||
        '16px',
      ).trim(),
      lineHeight: String(
        parsedTypography?.lineHeight ||
        parsedTypography?.line_height ||
        site?.line_height ||
        '1.6',
      ).trim(),
      letterSpacing: String(
        parsedTypography?.letterSpacing ||
        parsedTypography?.letter_spacing ||
        site?.letter_spacing ||
        '0.02em',
      ).trim(),
      type: String(
        parsedTypography?.body?.type ||
        parsedTypography?.font_body?.type ||
        site?.font_type ||
        'system',
      ).trim(),
      bodyUrl: String(
        parsedTypography?.body?.url ||
        parsedTypography?.font_body?.url ||
        site?.font_url ||
        '',
      ).trim(),
      headingUrl: String(
        parsedTypography?.heading?.url ||
        parsedTypography?.font_heading?.url ||
        '',
      ).trim(),
    };
  }

  function setPaletteInputs(palette = []) {
    palette.slice(0, 5).forEach((color, index) => {
      const input = section.querySelector(`#paletteColor${index}`);
      if (input) {
        input.value = normalizeHexColor(color, DEFAULT_PALETTE[index]);
      }
    });
  }

  function getPaletteValues() {
    return Array.from({ length: 5 }, (_, index) => {
      const input = section.querySelector(`#paletteColor${index}`);
      return normalizeHexColor(input?.value, DEFAULT_PALETTE[index]);
    });
  }

  function updateThemePreview() {
    const preview = section.querySelector('#themePreview');
    if (!preview) return;

    const primary = normalizeHexColor(section.querySelector('#primaryColor')?.value, '#ec4899');
    const secondary = normalizeHexColor(section.querySelector('#secondaryColor')?.value, '#ffffff');
    const accent = normalizeHexColor(section.querySelector('#accentColor')?.value, '#831843');
    const buttonStyle = String(section.querySelector('#buttonStyle')?.value || 'rounded').trim().toLowerCase();
    const bodyFont = String(section.querySelector('#bodyFont')?.value || section.querySelector('#fontStyle')?.value || 'Arial').trim();
    const headingFont = String(section.querySelector('#headingFont')?.value || bodyFont || 'Arial').trim();
    const fontStyleInput = section.querySelector('#fontStyle');
    if (fontStyleInput) {
      fontStyleInput.value = bodyFont;
    }
    const radiusMap = {
      rounded: '18px',
      square: '0px',
      pill: '999px',
      flat: '10px',
    };

    preview.style.setProperty('--cm-preview-primary', primary);
    preview.style.setProperty('--cm-preview-surface', secondary);
    preview.style.setProperty('--cm-preview-accent', accent);
    preview.style.setProperty('--cm-preview-radius', radiusMap[buttonStyle] || '18px');
    preview.style.setProperty('--cm-preview-heading-font', `'${headingFont}', serif`);
    preview.style.setProperty('--cm-preview-body-font', `'${bodyFont}', sans-serif`);
  }

  function renderMembersEditor() {
    const container = section.querySelector('#membersEditor');
    if (!container) return;

    if (!editingMembers.length) {
      container.innerHTML = '<p class="cm-empty-state">No members set.</p>';
      return;
    }

    container.innerHTML = editingMembers.map((member, index) => `
      <div class="cm-member-row" data-member-index="${index}">
        <input type="text" class="cm-member-name" placeholder="Name" value="${String(member?.name || '').replace(/"/g, '&quot;')}">
        <input type="date" class="cm-member-birthdate" value="${String(member?.birthdate || '').replace(/"/g, '&quot;')}">
        <input type="file" class="cm-member-image-file" accept="image/*">
        <small class="cm-member-image-hint">${member?.image_profile || member?.image ? 'Image selected' : 'No image selected'}</small>
        ${member?.image_profile || member?.image ? `<img src="${String(member?.image_profile || member?.image).replace(/"/g, '&quot;')}" alt="member preview" class="cm-member-image-preview">` : ''}
        <button type="button" class="cm-action-btn cm-btn-deactivate cm-remove-member" data-remove-member="${index}">Remove Member</button>
      </div>
    `).join('');
  }

  function syncMembersFromEditor() {
    const memberRows = section.querySelectorAll('.cm-member-row');
    if (!memberRows.length) return;

    editingMembers = Array.from(memberRows).map((row, idx) => ({
      ...editingMembers[idx],
      name: String(row.querySelector('.cm-member-name')?.value || '').trim(),
      birthdate: String(row.querySelector('.cm-member-birthdate')?.value || '').trim(),
      image_profile: String(editingMembers[idx]?.image_profile || editingMembers[idx]?.image || '').trim(),
    }));
  }

  function sanitizeMemberImage(imageValue) {
    const normalized = String(imageValue || '').trim();
    // Never send base64 blobs in JSON update payload; it can exceed body parser limits.
    return normalized.startsWith('data:') ? '' : normalized;
  }

  function normalizeBirthdateInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString().slice(0, 10);
  }

  function memberKey(member = {}) {
    const name = String(member?.name || '').trim().toLowerCase();
    const birthdate = normalizeBirthdateInput(member?.birthdate);
    if (!name || !birthdate) return '';
    return `${name}::${birthdate}`;
  }

  async function fetchSiteMembers(siteId) {
    try {
      const res = await api.get(`/admin/generate/generated-websites/${siteId}`, {
        headers: getAdminHeaders(),
      });
      const members = res?.data?.data?.members;
      return Array.isArray(members) ? members : [];
    } catch (_) {
      return [];
    }
  }

  async function buildMembersPayload(siteId, currentMembers, removedList) {
    const removedKeys = new Set(
      (removedList || [])
        .map((member) => memberKey(member))
        .filter(Boolean)
    );
    const existing = await fetchSiteMembers(siteId);
    const merged = new Map();

    existing.forEach((member) => {
      const key = memberKey(member);
      if (!key || removedKeys.has(key)) return;
      merged.set(key, {
        name: String(member?.name || '').trim(),
        birthdate: normalizeBirthdateInput(member?.birthdate),
        image_profile: sanitizeMemberImage(member?.image_profile || member?.image || ''),
      });
    });

    (currentMembers || []).forEach((member) => {
      const key = memberKey(member);
      if (!key) return;
      merged.set(key, {
        name: String(member?.name || '').trim(),
        birthdate: normalizeBirthdateInput(member?.birthdate),
        image_profile: sanitizeMemberImage(member?.image_profile || member?.image || ''),
      });
    });

    return Array.from(merged.values()).filter((member) => member.name && member.birthdate);
  }

  async function uploadMemberImage(file) {
    const imageData = new FormData();
    imageData.append('file', file);
    const response = await api.post('/bini/cloudinary/upload', imageData, {
      headers: getAdminHeaders(),
    });
    return String(response?.data?.url || '').trim();
  }

  async function uploadSiteImage(file) {
    const imageData = new FormData();
    imageData.append('file', file);
    const response = await api.post('/bini/cloudinary/upload', imageData, {
      headers: getAdminHeaders(),
    });
    return String(response?.data?.url || '').trim();
  }

  async function fetchSites() {
    try {
      const rows = await fetchAdminSites();
      allSites = normalizeSites(rows);
      applyFilters();
    } catch (err) {
      console.error('Failed to fetch communities:', err?.response?.data || err.message || err);
      allSites = [];
      applyFilters();
    }
  }

  function renderSites() {
    const container = section.querySelector('#sitesContainer');
    if (!container) return;

    if (filteredSites.length === 0) {
      container.innerHTML = '<p class="cm-empty-state">No sites found.</p>';
      updatePagination(0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredSites.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const pageRows = filteredSites.slice(start, start + itemsPerPage);

    container.innerHTML = pageRows.map((site) => {
      const siteName = escapeHtml(site.site_name);
      const siteDomain = escapeHtml(site.domain);
      const siteImage = resolveSiteCardImage(site);
      const safeSiteImage = escapeHtml(siteImage);
      const shortText = escapeHtml(site.short_bio || site.description || 'No description added yet.');

      return `
        <div class="cm-site-card" data-site-id="${site.id}">
          <button
            type="button"
            class="cm-card-media-button"
            data-edit="${site.id}"
            aria-label="Edit ${siteName}"
          >
            ${siteImage
              ? `<img src="${safeSiteImage}" alt="${siteName} site preview" class="cm-card-media-image">`
              : `<div class="cm-card-media-placeholder">${escapeHtml(getSiteInitials(site.site_name))}</div>`
            }
            <span class="cm-card-media-chip">Edit Site</span>
          </button>
          <div class="cm-card-header">
            <span class="cm-badge cm-badge-${site.status}">${site.status.toUpperCase()}</span>
          </div>
          <div class="cm-card-body">
            <h3 class="cm-card-title">${siteName}</h3>
            <p class="cm-card-domain">${siteDomain}</p>
            <p class="cm-card-description">${shortText}</p>
          </div>

          <div class="cm-card-actions">
            <a href="/fanhub/${encodeURIComponent(site.domain)}" class="cm-action-btn cm-btn-visit">Visit</a>
            <button class="cm-action-btn cm-btn-edit" data-edit="${site.id}">Edit</button>
            ${site.status === 'active'
              ? `<button class="cm-action-btn cm-btn-deactivate" data-deactivate="${site.id}">Deactivate</button>`
              : `<button class="cm-action-btn cm-btn-reactivate" data-reactivate="${site.id}">Activate</button>`
            }
          </div>
        </div>
      `;
    }).join('');

    updatePagination(totalPages);
  }

  function updatePagination(totalPages) {
    const currentPageEl = section.querySelector('#currentPage');
    const totalPagesEl = section.querySelector('#totalPages');
    const prevBtn = section.querySelector('#prevBtn');
    const nextBtn = section.querySelector('#nextBtn');

    if (currentPageEl) currentPageEl.textContent = String(totalPages === 0 ? 0 : currentPage);
    if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  function applyFilters() {
    const status = String(section.querySelector('#siteStatusFilter')?.value || '').trim().toLowerCase();
    filteredSites = allSites.filter((site) => !status || site.status === status);
    currentPage = 1;
    renderSites();
  }

  function updateGroupPhotoPreview(value) {
    const preview = section.querySelector('#groupPhotoPreview');
    const empty = section.querySelector('#groupPhotoPreviewEmpty');
    const imageUrl = String(value || '').trim();
    if (!preview || !empty) return;

    if (imageUrl) {
      preview.src = imageUrl;
      preview.style.display = 'block';
      empty.style.display = 'none';
      return;
    }

    preview.removeAttribute('src');
    preview.style.display = 'none';
    empty.style.display = 'block';
  }

  function updateLogoPreview(value) {
    const preview = section.querySelector('#siteLogoPreview');
    const empty = section.querySelector('#siteLogoPreviewEmpty');
    const imageUrl = String(value || '').trim();
    if (!preview || !empty) return;

    if (imageUrl) {
      preview.src = imageUrl;
      preview.style.display = 'block';
      empty.style.display = 'none';
      return;
    }

    preview.removeAttribute('src');
    preview.style.display = 'none';
    empty.style.display = 'block';
  }

  function getBannerGalleryInput() {
    return section.querySelector('#bannerGalleryUrls');
  }

  function getBannerGalleryUrls() {
    const input = getBannerGalleryInput();
    const raw = String(input?.value || '');
    const lines = raw
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    return normalizeBannerGallery(lines);
  }

  function setBannerGalleryUrls(urls = []) {
    const input = getBannerGalleryInput();
    if (!input) return;
    input.value = (urls || []).join('\n');
  }

  function coerceBannerGalleryUrls(urls = [], { notifyLimit = false } = {}) {
    const normalized = normalizeBannerGallery(urls);
    const limited = normalized.slice(0, GALLERY_IMAGE_LIMIT);
    if (notifyLimit && normalized.length > GALLERY_IMAGE_LIMIT) {
      showToast(`Only ${GALLERY_IMAGE_LIMIT} gallery images are allowed. Extra items were skipped.`, 'warning');
    }
    return limited;
  }

  function syncBannerGalleryCount(count) {
    const countEl = section.querySelector('#bannerGalleryCount');
    if (countEl) {
      countEl.textContent = `${count}/${GALLERY_IMAGE_LIMIT} images selected`;
    }
  }

  function renderBannerGalleryBoard({ notifyLimit = false } = {}) {
    const board = section.querySelector('#bannerGalleryBoard');
    if (!board) return;
    const urls = coerceBannerGalleryUrls(getBannerGalleryUrls(), { notifyLimit });
    setBannerGalleryUrls(urls);
    syncBannerGalleryCount(urls.length);

    board.innerHTML = Array.from({ length: GALLERY_IMAGE_LIMIT }, (_, index) => {
      const imageUrl = urls[index];
      const slotNumber = String(index + 1).padStart(2, '0');

      if (imageUrl) {
        return `
          <div class="cm-gallery-slot is-filled">
            <img src="${escapeHtml(imageUrl)}" alt="Gallery image ${index + 1}" class="cm-gallery-slot-image" loading="lazy">
            <span class="cm-gallery-slot-badge">Image ${slotNumber}</span>
            <button type="button" class="cm-gallery-slot-remove" data-gallery-action="remove" data-index="${index}">Remove</button>
          </div>
        `;
      }

      return `
        <button type="button" class="cm-gallery-slot cm-gallery-slot-add" data-gallery-action="pick">
          <span class="cm-gallery-slot-badge">Slot ${slotNumber}</span>
          <strong>Add Image</strong>
          <small>Click to upload</small>
        </button>
      `;
    }).join('');
  }

  function clearBannerGallery() {
    setBannerGalleryUrls([]);
    renderBannerGalleryBoard();
  }

  function openEditModal(siteId) {
    const site = allSites.find((s) => s.id === Number(siteId));
    if (!site) return;
    const typography = getSiteTypography(site);

    editingId = site.id;
    section.querySelector('#siteName').value = site.site_name;
    section.querySelector('#siteDomain').value = site.domain;
    section.querySelector('#status').value = site.status;
    section.querySelector('#navPosition').value = site.nav_position || '';
    section.querySelector('#shortBio').value = site.short_bio || '';
    section.querySelector('#siteDescription').value = site.description || '';
    section.querySelector('#siteLogo').value = site.logo || '';
    updateLogoPreview(site.logo || '');
    section.querySelector('#groupPhoto').value = site.group_photo || '';
    updateGroupPhotoPreview(site.group_photo || '');
    section.querySelector('#leadImage').value = site.lead_image || '';
    section.querySelector('#bannerGalleryUrls').value = normalizeBannerGallery(
      site.banner,
      site.banner_gallery,
      site.banner_link,
    ).join('\n');
    renderBannerGalleryBoard();
    section.querySelector('#instagramUrl').value = site.instagram_url || '';
    section.querySelector('#facebookUrl').value = site.facebook_url || '';
    section.querySelector('#tiktokUrl').value = site.tiktok_url || '';
    section.querySelector('#spotifyUrl').value = site.spotify_url || '';
    section.querySelector('#xUrl').value = site.x_url || '';
    section.querySelector('#youtubeUrl').value = site.youtube_url || '';
    section.querySelector('#primaryColor').value = site.primary_color || '';
    section.querySelector('#secondaryColor').value = site.secondary_color || '';
    section.querySelector('#accentColor').value = site.accent_color || '';
    section.querySelector('#buttonStyle').value = site.button_style || '';
    section.querySelector('#fontStyle').value = typography.body || site.font_style || '';
    section.querySelector('#headingFont').value = typography.heading || '';
    section.querySelector('#bodyFont').value = typography.body || '';
    section.querySelector('#fontSizeBase').value = typography.fontSizeBase || '16px';
    section.querySelector('#lineHeight').value = typography.lineHeight || '1.6';
    section.querySelector('#letterSpacing').value = typography.letterSpacing || '0.02em';
    setPaletteInputs(getSitePalette(site));
    editingMembers = Array.isArray(site.members) ? [...site.members] : [];
    removedMembers = [];
    renderMembersEditor();
    updateThemePreview();
    section.querySelector('#editModal').style.display = 'flex';
  }

  function closeEditModal() {
    editingId = null;
    section.querySelector('#editModal').style.display = 'none';
  }

  async function updateSite(siteId, payload) {
    await api.put(`/admin/generate/generated-websites/${siteId}`, payload, {
      headers: getAdminHeaders(),
    });
  }

  async function saveSiteEdit() {
    if (!editingId) return;
    if (activeMemberUploads > 0) {
      showToast('Please wait for member image upload to finish.', 'warning');
      return;
    }

    const site_name = String(section.querySelector('#siteName').value || '').trim();
    const domain = String(section.querySelector('#siteDomain').value || '').trim().toLowerCase();
    const status = String(section.querySelector('#status').value || '').trim().toLowerCase();
    const short_bio = String(section.querySelector('#shortBio').value || '').trim();
    const description = String(section.querySelector('#siteDescription').value || '').trim();
    const logo = String(section.querySelector('#siteLogo').value || '').trim();
    const group_photo = String(section.querySelector('#groupPhoto').value || '').trim();
    const lead_image = String(section.querySelector('#leadImage').value || '').trim();
    const banner_gallery = coerceBannerGalleryUrls(getBannerGalleryUrls(), { notifyLimit: true });
    setBannerGalleryUrls(banner_gallery);
    const instagram_url = String(section.querySelector('#instagramUrl').value || '').trim();
    const facebook_url = String(section.querySelector('#facebookUrl').value || '').trim();
    const tiktok_url = String(section.querySelector('#tiktokUrl').value || '').trim();
    const spotify_url = String(section.querySelector('#spotifyUrl').value || '').trim();
    const x_url = String(section.querySelector('#xUrl').value || '').trim();
    const youtube_url = String(section.querySelector('#youtubeUrl').value || '').trim();
    const primary_color = String(section.querySelector('#primaryColor').value || '').trim();
    const secondary_color = String(section.querySelector('#secondaryColor').value || '').trim();
    const accent_color = String(section.querySelector('#accentColor').value || '').trim();
    const button_style = String(section.querySelector('#buttonStyle').value || '').trim();
    const font_style = String(section.querySelector('#fontStyle').value || '').trim();
    const nav_position = String(section.querySelector('#navPosition').value || '').trim();
    const heading_font = String(section.querySelector('#headingFont').value || '').trim();
    const body_font = String(section.querySelector('#bodyFont').value || '').trim() || font_style;
    const font_size_base = String(section.querySelector('#fontSizeBase').value || '').trim();
    const line_height = String(section.querySelector('#lineHeight').value || '').trim();
    const letter_spacing = String(section.querySelector('#letterSpacing').value || '').trim();
    const palette = getPaletteValues();
    const typography = {
      heading: {
        name: heading_font || body_font || font_style || 'Arial',
        type: 'system',
      },
      body: {
        name: body_font || font_style || 'Arial',
        type: 'system',
      },
      fontSizeBase: font_size_base || '16px',
      lineHeight: line_height || '1.6',
      letterSpacing: letter_spacing || '0.02em',
      font_heading: heading_font || body_font || font_style || 'Arial',
      font_body: body_font || font_style || 'Arial',
      font_size_base: font_size_base || '16px',
      line_height: line_height || '1.6',
      letter_spacing: letter_spacing || '0.02em',
    };
    const theme = {
      palette,
      primaryColor: primary_color,
      secondaryColor: secondary_color,
      accentColor: accent_color,
      buttonStyle: button_style,
      fontStyle: body_font || font_style,
      typography,
    };

    if (!site_name || !domain) return;

    // Sync members from editor controls
    const memberRows = section.querySelectorAll('.cm-member-row');
    editingMembers = Array.from(memberRows).map((row, idx) => ({
      name: String(row.querySelector('.cm-member-name')?.value || '').trim(),
      birthdate: String(row.querySelector('.cm-member-birthdate')?.value || '').trim(),
      image_profile: sanitizeMemberImage(
        String(editingMembers[idx]?.image_profile || editingMembers[idx]?.image || '').trim(),
      ),
    })).filter((m) => m.name && m.birthdate);

    try {
      const mergedMembers = await buildMembersPayload(editingId, editingMembers, removedMembers);
      await updateSite(editingId, {
        site_name,
        community_type: domain,
        status,
        short_bio,
        description,
        logo,
        banner_gallery,
        group_photo,
        lead_image,
        instagram_url,
        facebook_url,
        tiktok_url,
        spotify_url,
        x_url,
        youtube_url,
        primary_color,
        secondary_color,
        accent_color,
        button_style,
        font_style: body_font || font_style,
        nav_position,
        palette,
        typography,
        theme,
        font_heading: heading_font || body_font || font_style,
        font_body: body_font || font_style,
        font_size_base,
        line_height,
        letter_spacing,
        members: mergedMembers,
      });
      await fetchSites();
      try {
        const refreshKey = `members_refresh:${domain}`;
        localStorage.setItem(refreshKey, String(Date.now()));
      } catch (_) {}
      closeEditModal();
      showToast('Site updated successfully.', 'success');
    } catch (err) {
      const backendMessage = String(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update site.',
      ).trim();
      console.error('Failed to update site:', err?.response?.data || err.message || err);
      showToast(backendMessage, 'error');
    }
  }

  async function toggleStatus(siteId, nextStatus) {
    try {
      await updateSite(siteId, { status: nextStatus });
      await fetchSites();
      showToast(
        nextStatus === 'active' ? 'Site activated successfully.' : 'Site deactivated successfully.',
        'success',
      );
    } catch (err) {
      console.error('Failed to update status:', err?.response?.data || err.message || err);
      showToast('Failed to update status.', 'error');
    }
  }

  function setupEventListeners() {
    section.querySelector('#siteStatusFilter')?.addEventListener('change', applyFilters);
    section.querySelector('#siteLogo')?.addEventListener('input', (e) => {
      updateLogoPreview(e.target.value);
    });
    section.querySelector('#groupPhoto')?.addEventListener('input', (e) => {
      updateGroupPhotoPreview(e.target.value);
    });
    section.querySelector('#bannerGalleryBrowseBtn')?.addEventListener('click', () => {
      section.querySelector('#bannerGalleryFiles')?.click();
    });
    section.querySelector('#bannerGalleryClearBtn')?.addEventListener('click', () => {
      clearBannerGallery();
    });
    section.querySelector('#bannerGalleryUrls')?.addEventListener('input', () => {
      renderBannerGalleryBoard();
    });
    section.querySelector('#bannerGalleryUrls')?.addEventListener('change', () => {
      renderBannerGalleryBoard({ notifyLimit: true });
    });
    section.querySelector('#bannerGalleryBoard')?.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const removeButton = target.closest('[data-gallery-action="remove"]');
      if (removeButton) {
        const idx = Number(removeButton.getAttribute('data-index'));
        if (!Number.isFinite(idx)) return;
        const urls = getBannerGalleryUrls();
        if (idx >= 0 && idx < urls.length) {
          urls.splice(idx, 1);
          setBannerGalleryUrls(urls);
          renderBannerGalleryBoard();
        }
        return;
      }

      const addButton = target.closest('[data-gallery-action="pick"]');
      if (addButton) {
        section.querySelector('#bannerGalleryFiles')?.click();
      }
    });
    [
      '#primaryColor',
      '#secondaryColor',
      '#accentColor',
      '#buttonStyle',
      '#fontStyle',
      '#headingFont',
      '#bodyFont',
      '#fontSizeBase',
      '#lineHeight',
      '#letterSpacing',
      '#paletteColor0',
      '#paletteColor1',
      '#paletteColor2',
      '#paletteColor3',
      '#paletteColor4',
    ].forEach((selector) => {
      section.querySelector(selector)?.addEventListener('input', updateThemePreview);
      section.querySelector(selector)?.addEventListener('change', updateThemePreview);
    });

    section.querySelector('#addSiteBtn')?.addEventListener('click', () => {
      window.location.href = `${window.location.origin}/subadmin/generate-website`;
    });

    section.querySelector('#editForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSiteEdit();
    });

    section.querySelector('#closeModal')?.addEventListener('click', closeEditModal);
    section.querySelector('#cancelBtn')?.addEventListener('click', closeEditModal);
    section.querySelector('#editModal')?.addEventListener('click', (e) => {
      if (e.target?.id === 'editModal') closeEditModal();
    });

    section.querySelector('#prevBtn')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderSites();
      }
    });

    section.querySelector('#nextBtn')?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(filteredSites.length / itemsPerPage));
      if (currentPage < totalPages) {
        currentPage += 1;
        renderSites();
      }
    });

    section.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === 'addMemberBtn') {
        syncMembersFromEditor();
        editingMembers.push({ name: '', birthdate: '', image_profile: '' });
        renderMembersEditor();
        return;
      }

      const removeMemberIndex = target.getAttribute('data-remove-member');
      if (removeMemberIndex !== null) {
        syncMembersFromEditor();
        const idx = Number(removeMemberIndex);
        if (Number.isFinite(idx) && idx >= 0) {
          const removed = editingMembers[idx];
          if (removed?.name && removed?.birthdate) {
            removedMembers.push({ ...removed });
          }
          editingMembers.splice(idx, 1);
          renderMembersEditor();
        }
        return;
      }

      const editTrigger = target.closest('[data-edit]');
      const editId = editTrigger?.getAttribute('data-edit');
      if (editId) {
        openEditModal(Number(editId));
        return;
      }

      const deactivateTrigger = target.closest('[data-deactivate]');
      const deactId = deactivateTrigger?.getAttribute('data-deactivate');
      if (deactId) {
        toggleStatus(Number(deactId), 'inactive');
        return;
      }

      const reactivateTrigger = target.closest('[data-reactivate]');
      const reactId = reactivateTrigger?.getAttribute('data-reactivate');
      if (reactId) {
        toggleStatus(Number(reactId), 'active');
      }
    });

    section.addEventListener('change', async (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.id === 'siteLogoFile') {
        const file = target.files?.[0];
        if (!file) return;

        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
          showToast('Logo image must be less than 2MB.', 'error');
          target.value = '';
          return;
        }

        try {
          const imageUrl = await uploadSiteImage(file);
          if (!imageUrl) {
            showToast('Failed to upload logo image.', 'error');
            return;
          }
          const logoInput = section.querySelector('#siteLogo');
          if (logoInput) {
            logoInput.value = imageUrl;
          }
          updateLogoPreview(imageUrl);
          showToast('Logo uploaded successfully.', 'success');
        } catch (err) {
          console.error('Logo upload failed:', err?.response?.data || err.message || err);
          showToast('Failed to upload logo image.', 'error');
        } finally {
          target.value = '';
        }
        return;
      }

      if (target.id === 'groupPhotoFile') {
        const file = target.files?.[0];
        if (!file) return;

        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
          showToast('Group photo must be less than 2MB.', 'error');
          target.value = '';
          return;
        }

        try {
          const imageUrl = await uploadSiteImage(file);
          if (!imageUrl) {
            showToast('Failed to upload group photo.', 'error');
            return;
          }
          const groupPhotoInput = section.querySelector('#groupPhoto');
          if (groupPhotoInput) {
            groupPhotoInput.value = imageUrl;
          }
          updateGroupPhotoPreview(imageUrl);
          showToast('Group photo uploaded successfully.', 'success');
        } catch (err) {
          console.error('Group photo upload failed:', err?.response?.data || err.message || err);
          showToast('Failed to upload group photo.', 'error');
        } finally {
          target.value = '';
        }
        return;
      }

      if (target.id === 'leadImageFile') {
        const file = target.files?.[0];
        if (!file) return;

        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
          showToast('Lead image must be less than 2MB.', 'error');
          target.value = '';
          return;
        }

        try {
          const imageUrl = await uploadSiteImage(file);
          if (!imageUrl) {
            showToast('Failed to upload lead image.', 'error');
            return;
          }
          const leadInput = section.querySelector('#leadImage');
          if (leadInput) {
            leadInput.value = imageUrl;
          }
          showToast('Lead image uploaded successfully.', 'success');
        } catch (err) {
          console.error('Lead image upload failed:', err?.response?.data || err.message || err);
          showToast('Failed to upload lead image.', 'error');
        } finally {
          target.value = '';
        }
        return;
      }

      if (target.id === 'bannerGalleryFiles') {
        const files = Array.from(target.files || []);
        if (!files.length) return;

        const existingUrls = getBannerGalleryUrls();
        const remainingSlots = Math.max(GALLERY_IMAGE_LIMIT - existingUrls.length, 0);
        if (remainingSlots <= 0) {
          showToast(`Gallery already has ${GALLERY_IMAGE_LIMIT} images. Remove one to add more.`, 'warning');
          target.value = '';
          return;
        }

        const filesToUpload = files.slice(0, remainingSlots);
        if (files.length > remainingSlots) {
          showToast(`Only ${remainingSlots} more gallery image${remainingSlots === 1 ? '' : 's'} can be added.`, 'warning');
        }

        const maxSize = 2 * 1024 * 1024;
        const oversizedFile = filesToUpload.find((file) => file.size > maxSize);
        if (oversizedFile) {
          showToast('Each gallery image must be less than 2MB.', 'error');
          target.value = '';
          return;
        }

        try {
          const uploadedUrls = [];
          for (const file of filesToUpload) {
            const imageUrl = await uploadSiteImage(file);
            if (imageUrl) {
              uploadedUrls.push(imageUrl);
            }
          }

          if (!uploadedUrls.length) {
            showToast('Failed to upload gallery images.', 'error');
            return;
          }

          const merged = coerceBannerGalleryUrls(
            normalizeBannerGallery(existingUrls, uploadedUrls),
            { notifyLimit: true },
          );
          setBannerGalleryUrls(merged);
          renderBannerGalleryBoard();

          showToast(`${uploadedUrls.length} gallery image${uploadedUrls.length === 1 ? '' : 's'} uploaded successfully.`, 'success');
        } catch (err) {
          console.error('Gallery upload failed:', err?.response?.data || err.message || err);
          showToast('Failed to upload gallery images.', 'error');
        } finally {
          target.value = '';
        }
        return;
      }

      if (!target.classList.contains('cm-member-image-file')) return;

      const row = target.closest('.cm-member-row');
      if (!row) return;
      const idx = Number(row.getAttribute('data-member-index'));
      if (!Number.isFinite(idx) || idx < 0 || idx >= editingMembers.length) return;

      const file = target.files?.[0];
      if (!file) return;

      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        showToast('Member image must be less than 2MB.', 'error');
        target.value = '';
        return;
      }

      syncMembersFromEditor();
      activeMemberUploads += 1;

      try {
        const imageUrl = await uploadMemberImage(file);
        if (!imageUrl) {
          showToast('Failed to upload member image.', 'error');
          return;
        }
        editingMembers[idx].image_profile = imageUrl;
        renderMembersEditor();
        showToast('Member image uploaded successfully.', 'success');
      } catch (err) {
        console.error('Member image upload failed:', err?.response?.data || err.message || err);
        showToast('Failed to upload member image.', 'error');
      } finally {
        activeMemberUploads = Math.max(0, activeMemberUploads - 1);
      }
    });
  }

  setupEventListeners();
  fetchSites();

  return section;
}
