// Move file input listeners inside GenerateWebsite function
import api from '../../../services/bini_services/api.js';
import { getAdminHeaders } from './admin-sites.js';
import { applyTypographyConfig } from '../../../lib/theme/font-loader.js';
import { normalizeBannerGallery } from '../../../lib/banner-gallery.js';
import { clearTemplatePreviewDraft, writeTemplatePreviewDraft } from '../../../lib/template-preview.js';

export default function GenerateWebsite() {
  const section = document.createElement('section');
  section.id = 'generate-website';
  section.className = 'gw-section';
  const GALLERY_IMAGE_LIMIT = 10;
  const BUILTIN_TEMPLATES = [
    { id: 1, key: 'bini', name: 'Bini Template' },
    { id: 2, key: 'modern', name: 'Modern Template' },
  ];

  const defaultPalettes = [
    { id: 'sunrise', name: 'Sunrise Pop', colors: ['#f4d03f', '#5dade2', '#5b6ee1', '#1a237e', '#ffffff'] },
    { id: 'rose', name: 'Rose Stage', colors: ['#ff8fab', '#ffb3c6', '#fb6f92', '#7f1734', '#fff8fb'] },
    { id: 'forest', name: 'Forest Light', colors: ['#95d5b2', '#40916c', '#1b4332', '#081c15', '#f1faee'] },
    { id: 'night', name: 'Night Neon', colors: ['#00f5d4', '#00bbf9', '#9b5de5', '#240046', '#f8f9fa'] },
  ];
  const systemFonts = [
    { family: 'Arial', category: 'sans-serif', preview: "Arial, Helvetica, sans-serif" },
    { family: 'Calibri', category: 'sans-serif', preview: "Calibri, Arial, sans-serif" },
    { family: 'Segoe UI', category: 'sans-serif', preview: "'Segoe UI', Arial, sans-serif" },
    { family: 'Helvetica', category: 'sans-serif', preview: "Helvetica, Arial, sans-serif" },
    { family: 'Verdana', category: 'sans-serif', preview: "Verdana, Geneva, sans-serif" },
    { family: 'Trebuchet MS', category: 'sans-serif', preview: "'Trebuchet MS', sans-serif" },
    { family: 'Georgia', category: 'serif', preview: "Georgia, 'Times New Roman', serif" },
    { family: 'Times New Roman', category: 'serif', preview: "'Times New Roman', Times, serif" },
    { family: 'Garamond', category: 'serif', preview: "Garamond, Georgia, serif" },
    { family: 'Courier New', category: 'monospace', preview: "'Courier New', Courier, monospace" },
  ];
  const fallbackGoogleFonts = [
    { family: 'Inter', category: 'sans-serif', tags: [] },
    { family: 'Poppins', category: 'sans-serif', tags: [] },
    { family: 'Montserrat', category: 'sans-serif', tags: [] },
    { family: 'Playfair Display', category: 'serif', tags: [] },
    { family: 'Oswald', category: 'display', tags: [] },
    { family: 'Lora', category: 'serif', tags: [] },
  ];
  const typographyRoles = ['heading', 'body'];
  const typographyLabels = {
    heading: 'Heading Font',
    body: 'Body Font',
  };
  const googleFontTagCategoryMap = {
    expressive: 'Feeling',
    mood: 'Feeling',
    personality: 'Feeling',
    display: 'Appearance',
    decorative: 'Appearance',
    blackletter: 'Appearance',
    pixel: 'Appearance',
    stencil: 'Appearance',
    distressed: 'Appearance',
    marker: 'Appearance',
    art: 'Appearance',
    inline: 'Appearance',
    blob: 'Appearance',
    wood: 'Appearance',
    medieval: 'Appearance',
    shaded: 'Appearance',
    serif: 'Serif',
    sans: 'Sans Serif',
    monospace: 'Technology',
    text: 'Technology',
    ui: 'Technology',
    code: 'Technology',
    coding: 'Technology',
    screen: 'Technology',
    variable: 'Technology',
    technology: 'Technology',
    script: 'Calligraphy',
    handwriting: 'Calligraphy',
    calligraphy: 'Calligraphy',
    seasonal: 'Seasonal',
    holiday: 'Seasonal',
    festive: 'Seasonal',
  };
  const googleFontFilterGroups = ['Feeling', 'Appearance', 'Calligraphy', 'Serif', 'Sans Serif', 'Technology', 'Seasonal'];

  let templates = [];
  let selectedPaletteId = defaultPalettes[0].id;
  let paletteDraft = [...defaultPalettes[0].colors];
  let paletteEditorTargetId = defaultPalettes[0].id;
  let customFontObjectUrl = '';
  const uploadedFontObjectUrls = {
    heading: '',
    body: '',
  };
  let googleFonts = [...fallbackGoogleFonts];
  let googleFontsLoaded = false;
  const toTemplateKey = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const getCanonicalTemplateKey = (value) => {
    const normalized = toTemplateKey(value);
    if (!normalized) return '';
    if (normalized.includes('minimal')) return 'minimal';
    if (normalized === 'bini' || normalized === 'bini-template') return 'bini';
    if (normalized === 'modern' || normalized === 'modern-template') return 'modern';
    return normalized;
  };
  const getTemplateDisplayName = (template) => {
    const canonicalKey = getCanonicalTemplateKey(template?.key || template?.name);
    if (canonicalKey === 'bini') return 'Bini Template';
    if (canonicalKey === 'modern') return 'Modern Template';
    return String(template?.name || 'Template').trim();
  };
  const normalizeHex = (value, fallback = '#000000') => {
    const raw = String(value || '').trim();
    if (/^#([A-Fa-f0-9]{6})$/.test(raw)) return raw;
    if (/^([A-Fa-f0-9]{6})$/.test(raw)) return `#${raw}`;
    return fallback;
  };

  const getBrightness = (hex) => {
    const safeHex = normalizeHex(hex).replace('#', '');
    const r = parseInt(safeHex.substring(0, 2), 16);
    const g = parseInt(safeHex.substring(2, 4), 16);
    const b = parseInt(safeHex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };
  const getContrastColor = (hex) => getBrightness(hex) > 150 ? '#000000' : '#ffffff';
  const shiftHexColor = (hex, amount = 0) => {
    const safeHex = normalizeHex(hex).replace('#', '');
    const clamp = (value) => Math.max(0, Math.min(255, value));
    const r = clamp(parseInt(safeHex.substring(0, 2), 16) + amount);
    const g = clamp(parseInt(safeHex.substring(2, 4), 16) + amount);
    const b = clamp(parseInt(safeHex.substring(4, 6), 16) + amount);
    return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  };
  const normalizeTypographyValue = (field, value) => {
    const raw = String(value || '').trim();
    if (!raw) {
      if (field === 'fontSizeBase') return '16px';
      if (field === 'lineHeight') return '1.6';
      if (field === 'letterSpacing') return '0.02em';
      return '';
    }

    if (field === 'fontSizeBase') {
      return /^\d+(\.\d+)?(px|rem|em|%)$/i.test(raw) ? raw : '16px';
    }

    if (field === 'lineHeight') {
      return /^\d+(\.\d+)?$/.test(raw) || /^\d+(\.\d+)?(px|rem|em|%)$/i.test(raw) ? raw : '1.6';
    }

    if (field === 'letterSpacing') {
      return /^-?\d+(\.\d+)?(px|rem|em|%)$/i.test(raw) ? raw : '0.02em';
    }

    return raw;
  };
  const getFontOptionsForRole = (role) => {
    const fontType = formData?.typography?.[role]?.type || 'google';
    if (fontType === 'system') return systemFonts;
    if (fontType === 'custom') {
      const customFont = formData?.typography?.[role];
      return customFont?.name ? [{
        family: customFont.name,
        category: customFont.category || 'custom',
        preview: customFont.name,
      }] : [];
    }
    return googleFonts;
  };
  const getPreviewFontFamily = (font) => {
    const family = String(font?.name || '').trim();
    if (!family) return 'inherit';

    if (font?.type === 'system' || font?.type === 'google' || font?.type === 'custom') {
      return `'${family}', sans-serif`;
    }

    return `'${family}', sans-serif`;
  };
  const parseGoogleFontTags = (tags) => (Array.isArray(tags) ? tags : [])
    .map((tag) => {
      const rawName = String(tag?.name || '').trim();
      const segments = rawName.split('/').filter(Boolean);
      if (!segments.length) return null;

      const root = String(segments[0] || '').trim();
      const leaf = String(segments[segments.length - 1] || '').trim();
      const normalizedRoot = root.toLowerCase();
      let group = googleFontTagCategoryMap[normalizedRoot] || null;

      if (!group) {
        const normalizedLeaf = leaf.toLowerCase();
        if (normalizedLeaf.includes('handwritten') || normalizedLeaf.includes('handwriting') || normalizedLeaf.includes('informal') || normalizedLeaf.includes('formal') || normalizedLeaf.includes('upright')) {
          group = 'Calligraphy';
        }
      }
      if (!group || !leaf) return null;

      return {
        category: group,
        value: leaf,
        path: rawName,
        weight: Number(tag?.weight || 0),
      };
    })
    .filter(Boolean);
  const getGoogleFontTagFilters = () => {
    const groups = googleFontFilterGroups.reduce((acc, group) => {
      acc[group] = [];
      return acc;
    }, {});

    googleFonts.forEach((font) => {
      (font.tags || []).forEach((tag) => {
        if (!groups[tag.category]) return;
        const existing = groups[tag.category].find((item) => item.value === tag.value);
        if (existing) {
          existing.weight = Math.max(existing.weight, tag.weight || 0);
          existing.count += 1;
          return;
        }
        groups[tag.category].push({
          value: tag.value,
          weight: tag.weight || 0,
          count: 1,
        });
      });
    });

    googleFontFilterGroups.forEach((group) => {
      groups[group] = groups[group]
        .sort((a, b) => (b.weight - a.weight) || a.value.localeCompare(b.value));
    });

    return groups;
  };
  const clearTypographyFilters = (role, group = null) => {
    const currentFilters = typographyFilters[role] || { search: '', category: 'all', tags: {} };
    if (!group) {
      typographyFilters[role] = {
        ...currentFilters,
        tags: {},
      };
      return;
    }

    typographyFilters[role] = {
      ...currentFilters,
      tags: {
        ...(currentFilters.tags || {}),
        [group]: 'all',
      },
    };
  };

  const getTypographyPayload = () => ({
    heading: { ...(formData.typography?.heading ||   {}) },
    body: { ...(formData.typography?.body || {}) },
    font_heading: { ...(formData.typography?.heading || {}) },
    font_body: { ...(formData.typography?.body || {}) },
    fontSizeBase: normalizeTypographyValue('fontSizeBase', formData.typography?.fontSizeBase),
    lineHeight: normalizeTypographyValue('lineHeight', formData.typography?.lineHeight),
    letterSpacing: normalizeTypographyValue('letterSpacing', formData.typography?.letterSpacing),
    font_size_base: normalizeTypographyValue('fontSizeBase', formData.typography?.fontSizeBase),
    line_height: normalizeTypographyValue('lineHeight', formData.typography?.lineHeight),
    letter_spacing: normalizeTypographyValue('letterSpacing', formData.typography?.letterSpacing),
  });

  const syncLegacyFontFields = () => {
    const bodyFont = formData.typography?.body || {};
    formData.fontType = bodyFont.type || 'system';
    formData.fontName = bodyFont.name || 'Arial';
    formData.fontStyle = bodyFont.name || 'Arial';
    formData.fontUrl = bodyFont.url || '';
    formData.customFontFile = bodyFont.type === 'custom' ? (bodyFont.file || null) : null;
  };

  const fetchGoogleFonts = async () => {
    if (googleFontsLoaded) return googleFonts;

    const apiKey = String(import.meta.env.VITE_GOOGLE_FONTS_API_KEY || '').trim();
    if (!apiKey) {
      googleFontsLoaded = true;
      return googleFonts;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/webfonts/v1/webfonts?capability=FAMILY_TAGS&sort=popularity&key=${apiKey}`,
      );
      if (!response.ok) throw new Error(`Google Fonts request failed (${response.status})`);
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      googleFonts = items.map((font) => ({
        family: font.family,
        category: font.category || 'sans-serif',
        tags: parseGoogleFontTags(font.tags),
      }));
    } catch (error) {
      console.error('Failed to fetch Google Fonts:', error);
    } finally {
      googleFontsLoaded = true;
    }

    return googleFonts;
  };

  // Fetch available templates from backend
  const fetchTemplates = async () => {
    try {
      const res = await api.get('/admin/generate/gettemplate', {
        headers: getAdminHeaders(),
      });
      const data = res.data?.data || [];
      const seenTemplateKeys = new Set();

      templates = Array.isArray(data)
        ? data
          .map((t, idx) => {
            const canonicalKey = getCanonicalTemplateKey(
              t.template_key || t.template_name || t.name || `template-${idx + 1}`,
            );
            return {
              id: t.template_id || t._id || t.id || idx + 1,
              key: canonicalKey,
              name: getTemplateDisplayName({
                key: canonicalKey,
                name: t.template_name || t.name || `Template ${idx + 1}`,
              }),
            };
          })
          .filter((template) => {
            if (!template.key || template.key === 'minimal') return false;
            if (seenTemplateKeys.has(template.key)) return false;
            seenTemplateKeys.add(template.key);
            return true;
          })
        : [];
    } catch (err) {
      console.error('Failed to fetch templates:', err?.response?.data || err.message || err);
      templates = [];
    }

    if (!templates.length) {
      templates = BUILTIN_TEMPLATES.map((template) => ({ ...template }));
    }

    renderTemplates();
  };

  let selectedTemplate = null;
  let members = [];
  let isSubmitting = false;
  let typographyFilters = {
    heading: { search: '', category: 'all', tags: {} },
    body: { search: '', category: 'all', tags: {} },
  };
  let typographyFilterPanels = {
    heading: Object.fromEntries(googleFontFilterGroups.map((group) => [group, false])),
    body: Object.fromEntries(googleFontFilterGroups.map((group) => [group, false])),
  };
  const assignPaletteRoles = (palette) => {
    const normalized = (Array.isArray(palette) ? palette : [])
      .map((color) => normalizeHex(color))
      .filter(Boolean);
    if (!normalized.length) {
      return {
        primary: '#3b82f6',
        accent: '#333333',
        secondary: '#ffffff',
        background: '#ffffff',
        text: '#000000',
      };
    }
    const byBrightness = [...normalized].sort((a, b) => getBrightness(b) - getBrightness(a));
    const background = byBrightness[0];
    const primary = normalized.find((color) => color !== background) || normalized[0];
    const accent = normalized.find((color) => color !== primary && color !== background) || primary;
    const secondary = byBrightness[1] || background;
    return {
      primary,
      accent,
      secondary,
      background,
      text: getContrastColor(background),
    };
  };
  const matchesFontCategoryFilter = (font, category) => {
    if (category === 'all') return true;

    const fontCategory = String(font.category || 'other').toLowerCase();
    if (fontCategory === category) return true;

    if (category === 'calligraphy') {
      return (font.tags || []).some((tag) => {
        const value = String(tag.value || '').toLowerCase();
        return value.includes('calligraphy') || value.includes('script') || value.includes('handwriting');
      });
    }

    return false;
  };
  const getFilteredFontOptions = (role) => {
    const filters = typographyFilters[role] || { search: '', category: 'all', tags: {} };
    const search = String(filters.search || '').trim().toLowerCase();
    const category = String(filters.category || 'all').trim().toLowerCase();
    const selectedTags = filters.tags || {};
    const options = getFontOptionsForRole(role);
    return options.filter((font) => {
      const family = String(font.family || '').toLowerCase();
      const matchesSearch = !search || family.includes(search);
      const matchesCategory = matchesFontCategoryFilter(font, category);
      const matchesTags = Object.entries(selectedTags).every(([group, value]) => {
        if (!value || value === 'all') return true;
        return (font.tags || []).some((tag) => tag.category === group && tag.value === value);
      });
      return matchesSearch && matchesCategory && matchesTags;
    });
  };
  let formData = {
    siteName: '',
    domain: '',
    shortBio: '',
    description: '',
    palette: [...defaultPalettes[0].colors],
    primaryColor: '#3b82f6',
    secondaryColor: '#ffffff',
    accentColor: '#333333',
    buttonStyle: 'rounded',
    typography: {
      heading: {
        type: 'google',
        name: 'Poppins',
        url: '',
        category: 'sans-serif',
      },
      body: {
        type: 'google',
        name: 'Inter',
        url: '',
        category: 'sans-serif',
      },
      fontSizeBase: '16px',
      lineHeight: '1.6',
      letterSpacing: '0.02em',
    },
    fontStyle: 'Inter',
    fontType: 'google',
    fontName: 'Inter',
    fontUrl: '',
    customFontFile: null,
    logo: null,
    leadImageFile: null,
    groupPhoto: null,
    leadImage: '',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
    spotifyUrl: '',
    xUrl: '',
    youtubeUrl: '',
    bannerGallery: [],
    members: []
  };
  const previewMediaUrls = {
    logo: '',
    leadImage: '',
    groupPhoto: '',
    bannerGallery: [],
  };
  let previewSyncTimer = null;
  const normalizeCommunitySlug = (value, fallback = 'preview-community') => {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return normalized || fallback;
  };
  const revokePreviewMediaUrl = (key) => {
    const currentValue = previewMediaUrls[key];
    if (Array.isArray(currentValue)) {
      currentValue.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      previewMediaUrls[key] = [];
      return;
    }
    if (!currentValue) return;
    URL.revokeObjectURL(currentValue);
    previewMediaUrls[key] = '';
  };
  const setPreviewMediaFile = (key, file) => {
    revokePreviewMediaUrl(key);
    if (!file) return '';
    previewMediaUrls[key] = URL.createObjectURL(file);
    return previewMediaUrls[key];
  };
  const setPreviewMediaFiles = (key, files = []) => {
    revokePreviewMediaUrl(key);
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (!safeFiles.length) {
      previewMediaUrls[key] = [];
      return [];
    }
    previewMediaUrls[key] = safeFiles.map((file) => URL.createObjectURL(file));
    return [...previewMediaUrls[key]];
  };
  const getGalleryFileSignature = (file) => {
    if (!file) return '';
    return [file.name, file.size, file.lastModified].join('::');
  };
  const syncBannerGalleryFiles = (files = [], input = null) => {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean).slice(0, GALLERY_IMAGE_LIMIT) : [];
    formData.bannerGallery = safeFiles;
    setPreviewMediaFiles('bannerGallery', safeFiles);

    const bannerGalleryInput = input || section.querySelector('#bannerGallery');
    if (bannerGalleryInput) {
      bannerGalleryInput.value = '';
      updateFileInput(bannerGalleryInput);
    }

    renderBannerGalleryBoard();
    applyTypographyPreview();
  };
  const appendBannerGalleryFiles = (files = [], input = null) => {
    const incomingFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (!incomingFiles.length) return;

    const currentFiles = Array.isArray(formData.bannerGallery) ? [...formData.bannerGallery] : [];
    const existingSignatures = new Set(currentFiles.map((file) => getGalleryFileSignature(file)));
    const nextFiles = [...currentFiles];
    let duplicateCount = 0;

    incomingFiles.forEach((file) => {
      const signature = getGalleryFileSignature(file);
      if (!signature || existingSignatures.has(signature)) {
        duplicateCount += 1;
        return;
      }

      if (nextFiles.length >= GALLERY_IMAGE_LIMIT) {
        return;
      }

      existingSignatures.add(signature);
      nextFiles.push(file);
    });

    if (currentFiles.length >= GALLERY_IMAGE_LIMIT) {
      alert(`You can only upload up to ${GALLERY_IMAGE_LIMIT} gallery images.`);
      syncBannerGalleryFiles(currentFiles, input);
      return;
    }

    if (incomingFiles.length && nextFiles.length === currentFiles.length && duplicateCount === incomingFiles.length) {
      alert('Those gallery images are already selected.');
      syncBannerGalleryFiles(currentFiles, input);
      return;
    }

    if ((currentFiles.length + incomingFiles.length) > GALLERY_IMAGE_LIMIT) {
      const remainingSlots = Math.max(GALLERY_IMAGE_LIMIT - currentFiles.length, 0);
      alert(`Only ${remainingSlots} more gallery image${remainingSlots === 1 ? '' : 's'} can be added. The rest were skipped.`);
    } else if (duplicateCount > 0) {
      alert(`${duplicateCount} duplicate gallery image${duplicateCount === 1 ? ' was' : 's were'} skipped.`);
    }

    syncBannerGalleryFiles(nextFiles, input);
  };
  const removeBannerGalleryFile = (index) => {
    const currentFiles = Array.isArray(formData.bannerGallery) ? [...formData.bannerGallery] : [];
    if (index < 0 || index >= currentFiles.length) return;
    currentFiles.splice(index, 1);
    syncBannerGalleryFiles(currentFiles);
  };
  const renderBannerGalleryBoard = () => {
    const board = section.querySelector('#bannerGalleryBoard');
    const count = section.querySelector('#bannerGalleryCount');
    if (!board) return;

    const previewUrls = Array.isArray(previewMediaUrls.bannerGallery)
      ? previewMediaUrls.bannerGallery
      : [];
    const galleryFiles = Array.isArray(formData.bannerGallery)
      ? formData.bannerGallery
      : [];
    const totalImages = galleryFiles.length;

    if (count) {
      count.textContent = `${totalImages}/${GALLERY_IMAGE_LIMIT} images selected`;
    }

    board.innerHTML = Array.from({ length: GALLERY_IMAGE_LIMIT }, (_, index) => {
      const imageUrl = previewUrls[index] || '';
      const slotNumber = String(index + 1).padStart(2, '0');

      if (imageUrl) {
        return `
          <div class="gw-gallery-slot is-filled">
            <img src="${imageUrl}" alt="Gallery image ${index + 1}" class="gw-gallery-slot-image">
            <span class="gw-gallery-slot-badge">Image ${slotNumber}</span>
            <button type="button" class="gw-gallery-slot-remove" data-gallery-action="remove" data-index="${index}" aria-label="Remove gallery image ${index + 1}">Remove</button>
          </div>
        `;
      }

      return `
        <button type="button" class="gw-gallery-slot gw-gallery-slot-add" data-gallery-action="pick">
          <span class="gw-gallery-slot-badge">Slot ${slotNumber}</span>
          <strong class="gw-gallery-slot-title">Add Image</strong>
          <small class="gw-gallery-slot-copy">Click to upload gallery image</small>
        </button>
      `;
    }).join('');
  };
  const getSelectedTemplateData = () => (
    templates.find((template) => Number(template.id) === Number(selectedTemplate)) || null
  );
  const buildTemplatePreviewDraft = () => {
    const selectedTemplateData = getSelectedTemplateData();
    if (!selectedTemplateData?.key) {
      return null;
    }

    const typographyPayload = getTypographyPayload();
    const bodyFont = typographyPayload.body || {};
    const headingFont = typographyPayload.heading || {};
    const siteSlug = normalizeCommunitySlug(
      formData.domain || formData.siteName || `${selectedTemplateData.key}-preview`,
      `${selectedTemplateData.key}-preview`,
    );
    const siteName = String(formData.siteName || selectedTemplateData.name || 'Preview Community').trim() || 'Preview Community';
    const logoUrl = previewMediaUrls.logo || '';
    const leadImageUrl = previewMediaUrls.leadImage || String(formData.leadImage || '').trim();
    const groupPhotoUrl = previewMediaUrls.groupPhoto || '';
    const bannerGallery = normalizeBannerGallery(previewMediaUrls.bannerGallery).slice(0, GALLERY_IMAGE_LIMIT);
    const safeMembers = members.map((member, index) => ({
      id: member?.id || `preview-member-${index + 1}`,
      name: String(member?.name || '').trim(),
      fullname: String(member?.name || '').trim(),
      role: String(member?.role || '').trim(),
      description: String(member?.description || '').trim(),
      image: member?.image || '',
      image_profile: member?.image || '',
    }));

    return {
      updatedAt: Date.now(),
      templateKey: selectedTemplateData.key,
      templateName: selectedTemplateData.name || 'Template',
      siteSlug,
      siteData: {
        previewMode: true,
        site_name: siteName,
        name: siteName,
        domain: siteSlug,
        community_type: siteSlug,
        site_slug: siteSlug,
        template: selectedTemplateData.key,
        template_key: selectedTemplateData.key,
        template_name: selectedTemplateData.name || selectedTemplateData.key,
        short_bio: String(formData.shortBio || '').trim(),
        description: String(formData.description || '').trim(),
        logo: logoUrl,
        logo_url: logoUrl,
        lead_image: leadImageUrl,
        group_photo: groupPhotoUrl,
        banner: bannerGallery,
        banner_gallery: bannerGallery,
        instagram_url: String(formData.instagramUrl || '').trim(),
        facebook_url: String(formData.facebookUrl || '').trim(),
        tiktok_url: String(formData.tiktokUrl || '').trim(),
        spotify_url: String(formData.spotifyUrl || '').trim(),
        x_url: String(formData.xUrl || '').trim(),
        youtube_url: String(formData.youtubeUrl || '').trim(),
        palette: [...(formData.palette || [])],
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: formData.accentColor,
        buttonStyle: formData.buttonStyle,
        typography: typographyPayload,
        font: {
          type: bodyFont.type || formData.fontType,
          name: bodyFont.name || formData.fontName,
          url: bodyFont.url || formData.fontUrl || '',
        },
        font_heading: headingFont.name || '',
        font_body: bodyFont.name || '',
        members: safeMembers,
        theme: {
          palette: [...(formData.palette || [])],
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          accentColor: formData.accentColor,
          buttonStyle: formData.buttonStyle,
          fontStyle: bodyFont.name || formData.fontStyle,
          font: {
            type: bodyFont.type || formData.fontType,
            name: bodyFont.name || formData.fontName,
            url: bodyFont.url || formData.fontUrl || '',
          },
          typography: typographyPayload,
        },
      },
    };
  };
  const queueTemplatePreviewSync = () => {
    if (previewSyncTimer) {
      window.clearTimeout(previewSyncTimer);
    }

    previewSyncTimer = window.setTimeout(() => {
      const draft = buildTemplatePreviewDraft();
      if (!draft) {
        clearTemplatePreviewDraft();
        return;
      }
      writeTemplatePreviewDraft(draft);
    }, 180);
  };

  // API call to create website
  const createWebsite = async () => {
    try {
      isSubmitting = true;
      const generateBtn = section.querySelector('#generateBtn');
      const originalText = generateBtn.textContent;
      generateBtn.textContent = '⏳ Generating...';
      generateBtn.disabled = true;

      // Prepare form data with file uploads
      const submitData = new FormData();
      const communitySlug = String(formData.siteName || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const resolvedDbName = communitySlug || 'community_site';
      const resolvedDomain = String(formData.domain || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || communitySlug;

      submitData.append('siteName', formData.siteName);
      submitData.append('domain', resolvedDomain);
      submitData.append('communityType', resolvedDomain);
      submitData.append('dbName', resolvedDbName);
      submitData.append('dbUser', 'root');
      submitData.append('dbHost', 'localhost');
      submitData.append('dbPassword', '');
      submitData.append('shortBio', formData.shortBio);
      submitData.append('description', formData.description);
      submitData.append('templateId', selectedTemplate);
      const selectedTemplateData = templates.find((template) => Number(template.id) === Number(selectedTemplate));
      if (selectedTemplateData?.key) submitData.append('template', selectedTemplateData.key);
      if (selectedTemplateData?.key) submitData.append('templateKey', selectedTemplateData.key);
      if (selectedTemplateData?.name) submitData.append('templateName', selectedTemplateData.name);
      submitData.append('palette', JSON.stringify(formData.palette || []));
      submitData.append('primaryColor', formData.primaryColor);
      submitData.append('secondaryColor', formData.secondaryColor);
      submitData.append('accentColor', formData.accentColor);
      submitData.append('buttonStyle', formData.buttonStyle);
      const typographyPayload = getTypographyPayload();
      const bodyFont = typographyPayload.body || {};
      submitData.append('fontStyle', bodyFont.name || formData.fontStyle);
      submitData.append('fontType', bodyFont.type || formData.fontType);
      submitData.append('fontName', bodyFont.name || formData.fontName);
      submitData.append('fontUrl', bodyFont.url || formData.fontUrl || '');
      submitData.append('font_heading', typographyPayload.heading?.name || '');
      submitData.append('font_body', typographyPayload.body?.name || '');
      submitData.append('font_size_base', typographyPayload.font_size_base);
      submitData.append('line_height', typographyPayload.line_height);
      submitData.append('letter_spacing', typographyPayload.letter_spacing);
      submitData.append('typography', JSON.stringify(typographyPayload));
      if (formData.leadImage) {
        submitData.append('lead_image', formData.leadImage);
      }
      submitData.append('instagram_url', formData.instagramUrl);
      submitData.append('facebook_url', formData.facebookUrl);
      submitData.append('tiktok_url', formData.tiktokUrl);
      submitData.append('spotify_url', formData.spotifyUrl);
      submitData.append('x_url', formData.xUrl);
      submitData.append('youtube_url', formData.youtubeUrl);
      submitData.append('theme', JSON.stringify({
        palette: formData.palette || [],
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: formData.accentColor,
        buttonStyle: formData.buttonStyle,
        fontStyle: bodyFont.name || formData.fontStyle,
        font: {
          type: bodyFont.type || formData.fontType,
          name: bodyFont.name || formData.fontName,
          url: bodyFont.url || formData.fontUrl || '',
        },
        typography: typographyPayload,
      }));

      if (formData.logo) submitData.append('logo', formData.logo);
      (formData.bannerGallery || []).forEach((file) => submitData.append('bannerGallery', file));
      if (formData.leadImageFile) submitData.append('leadImage', formData.leadImageFile);
      if (formData.groupPhoto) submitData.append('groupPhoto', formData.groupPhoto);
      if (formData.typography?.heading?.file) submitData.append('headingFontFile', formData.typography.heading.file);
      if (formData.typography?.body?.file) submitData.append('bodyFontFile', formData.typography.body.file);
      if (formData.customFontFile) submitData.append('fontFile', formData.customFontFile);
      
      // Add members data as JSON
      submitData.append('members', JSON.stringify(members));

      // API call - adjust endpoint based on your backend
      const response = await api.post('/admin/generate/generate-website', submitData, {
        headers: getAdminHeaders(),
      });

      console.log('Website created successfully:', response.data);
      alert(`✓ Website "${formData.siteName}" created successfully!`);
      
      const targetCommunity = resolvedDomain;

      // Reset form
      resetForm();

      // Redirect to fanhub/community_type
      setTimeout(() => {
        if (targetCommunity) {
          window.location.href = `${window.location.origin}/fanhub/${encodeURIComponent(targetCommunity)}`;
        } else {
          window.location.href = window.location.origin + '/#/subadmin/community';
        }
      }, 1000);

    } catch (error) {
      console.error('Error creating website:', error.response?.data || error.message);
      // Check for duplicate error from backend
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      if (errMsg && errMsg.toLowerCase().includes('duplicate')) {
        alert('Site already exists. Please use a different site name or community type.');
      } else {
        alert(`✗ Error: ${errMsg || 'Failed to create website'}`);
      }
    } finally {
      isSubmitting = false;
      const generateBtn = section.querySelector('#generateBtn');
      generateBtn.textContent = '🚀 Generate Website';
      generateBtn.disabled = false;
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    if (previewSyncTimer) {
      window.clearTimeout(previewSyncTimer);
      previewSyncTimer = null;
    }
    Object.keys(previewMediaUrls).forEach((key) => revokePreviewMediaUrl(key));
    clearTemplatePreviewDraft();
    if (customFontObjectUrl) {
      URL.revokeObjectURL(customFontObjectUrl);
      customFontObjectUrl = '';
    }
    typographyRoles.forEach((role) => {
      if (uploadedFontObjectUrls[role]) {
        URL.revokeObjectURL(uploadedFontObjectUrls[role]);
        uploadedFontObjectUrls[role] = '';
      }
    });
    selectedTemplate = null;
    selectedPaletteId = defaultPalettes[0].id;
    paletteDraft = [...defaultPalettes[0].colors];
    members = [];
    typographyFilters = {
      heading: { search: '', category: 'all', tags: {} },
      body: { search: '', category: 'all', tags: {} },
    };
    typographyFilterPanels = {
      heading: Object.fromEntries(googleFontFilterGroups.map((group) => [group, false])),
      body: Object.fromEntries(googleFontFilterGroups.map((group) => [group, false])),
    };
    formData = {
      siteName: '',
      domain: '',
      shortBio: '',
      description: '',
      palette: [...defaultPalettes[0].colors],
      primaryColor: '#3b82f6',
      secondaryColor: '#ffffff',
      accentColor: '#333333',
      buttonStyle: 'rounded',
      typography: {
        heading: {
          type: 'google',
          name: 'Poppins',
          url: '',
          category: 'sans-serif',
        },
        body: {
          type: 'google',
          name: 'Inter',
          url: '',
          category: 'sans-serif',
        },
        fontSizeBase: '16px',
        lineHeight: '1.6',
        letterSpacing: '0.02em',
      },
      fontStyle: 'Inter',
      fontType: 'google',
      fontName: 'Inter',
      fontUrl: '',
      customFontFile: null,
      logo: null,
      leadImageFile: null,
      groupPhoto: null,
      leadImage: '',
      instagramUrl: '',
      facebookUrl: '',
      tiktokUrl: '',
      spotifyUrl: '',
      xUrl: '',
      youtubeUrl: '',
      bannerGallery: [],
      members: []
    };
    syncLegacyFontFields();
  };

  section.innerHTML = `
      <div class="gw-container">
        <!-- Header -->
        <div class="gw-header">
          <div class="gw-header-top">
            <button class="gw-btn-back" id="backBtn">← Back</button>
          </div>
          <h1 class="gw-title">Generate New Website</h1>
          <p class="gw-subtitle">Create a new fan community site using customized templates.</p>
        </div>

        <!-- Template Selection -->
        <div class="gw-section-wrapper">
          <h2 class="gw-section-title">Select Template</h2>
          <div class="gw-templates-grid" id="templatesContainer"></div>
        </div>

        <!-- Site Details Form -->
        <div class="gw-section-wrapper">
          <h2 class="gw-section-title">Site Details</h2>
          <form class="gw-form" id="siteForm">
            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="siteName">Site Name</label>
                <input type="text" id="siteName" placeholder="Enter site name" required>
              </div>
            </div>

            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="domain">Domain</label>
                <input type="text" id="domain" placeholder="e.g. bini-website" required>
              </div>
            </div>

            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="shortBio">Short Bio</label>
                <input type="text" id="shortBio" placeholder="Short tagline for the community">
              </div>
              <div class="gw-form-group">
                <label for="description">Description</label>
                <textarea id="description" rows="3" placeholder="Detailed description of the community"></textarea>
              </div>
            </div>

            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="logo">Upload Logo</label>
                <small class="gw-field-hint">Purpose: shown in the site navigation/header as your community brand mark.</small>
                <div class="gw-upload-inline">
                  <input type="file" id="logo" accept="image/*">
                  <button type="button" class="gw-file-action-btn" id="logoBrowseBtn">Choose Logo</button>
                  <span class="gw-upload-file-name" id="logoFileLabel">No file selected</span>
                </div>
              </div>
            </div>

            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="bannerGallery">Gallery Images</label>
                <small class="gw-field-hint">Purpose: shown as resized image cards in the homepage gallery. Upload up to ${GALLERY_IMAGE_LIMIT} polished images for a cleaner, professional layout.</small>
                <div class="gw-upload-inline gw-upload-inline-gallery">
                  <input type="file" id="bannerGallery" accept="image/*" multiple>
                  <button type="button" class="gw-file-action-btn" id="bannerGalleryBrowseBtn">Choose Up To ${GALLERY_IMAGE_LIMIT} Gallery Images</button>
                  <button type="button" class="gw-file-action-btn gw-file-action-btn-secondary" id="bannerGalleryClearBtn">Clear Gallery</button>
                  <span class="gw-upload-file-name" id="bannerGalleryFileLabel">No gallery images selected</span>
                  <span class="gw-gallery-upload-count" id="bannerGalleryCount">0/${GALLERY_IMAGE_LIMIT} images selected</span>
                </div>
                <div class="gw-gallery-board" id="bannerGalleryBoard"></div>
              </div>
            </div>

            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="leadImageFile">Lead Image</label>
                <small class="gw-field-hint">Purpose: used as the homepage lead/hero image behind the top section.</small>
                <div class="gw-upload-inline">
                  <input type="file" id="leadImageFile" accept="image/*">
                  <button type="button" class="gw-file-action-btn" id="leadImageBrowseBtn">Choose Lead Image</button>
                  <span class="gw-upload-file-name" id="leadImageFileLabel">No file selected</span>
                </div>
              </div>
            </div>

            <div class="gw-form-row gw-social-grid">
              <div class="gw-form-group">
                <label for="instagramUrl">Instagram URL</label>
                <input type="url" id="instagramUrl" placeholder="https://www.instagram.com/...">
              </div>
              <div class="gw-form-group">
                <label for="facebookUrl">Facebook URL</label>
                <input type="url" id="facebookUrl" placeholder="https://www.facebook.com/...">
              </div>
              <div class="gw-form-group">
                <label for="tiktokUrl">TikTok URL</label>
                <input type="url" id="tiktokUrl" placeholder="https://www.tiktok.com/@...">
              </div>
              <div class="gw-form-group">
                <label for="spotifyUrl">Spotify URL</label>
                <input type="url" id="spotifyUrl" placeholder="https://open.spotify.com/...">
              </div>
              <div class="gw-form-group">
                <label for="xUrl">X URL</label>
                <input type="url" id="xUrl" placeholder="https://x.com/...">
              </div>
              <div class="gw-form-group">
                <label for="youtubeUrl">YouTube URL</label>
                <input type="url" id="youtubeUrl" placeholder="https://www.youtube.com/...">
              </div>
            </div>
          </form>
        </div>

        <!-- Design & Colors -->
        <div class="gw-section-wrapper">
          <div class="gw-section-header">
            <h2 class="gw-section-title">Design & Colors</h2>
            <button class="gw-btn-secondary" id="editPaletteBtn" type="button">Edit Palette</button>
          </div>
          <div class="gw-palette-toolbar">
            <div>
              <h3 class="gw-palette-title">Choose Color Palette</h3>
              <p class="gw-palette-copy">Pick a preset palette, then fine-tune all 5 colors in the editor.</p>
            </div>
          </div>
          <input type="hidden" id="paletteInput" name="palette">
          <div class="gw-palette-grid" id="paletteGrid"></div>
          <form class="gw-form" id="designForm">
            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="buttonStyle">Button Style</label>
                <select id="buttonStyle" required>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                  <option value="pill">Pill</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div class="gw-section-wrapper">
          <h2 class="gw-section-title">Typography Settings</h2>
          <p class="gw-subtitle">Set separate heading and body fonts, then tune the reading rhythm for the generated site.</p>
          <div class="gw-admin-typography-controls" id="typographyControls"></div>
          <div class="gw-form-row gw-typography-metrics">
            <div class="gw-form-group">
              <label for="fontSizeBase">Base Font Size</label>
              <input type="text" id="fontSizeBase" value="16px" placeholder="16px">
            </div>
            <div class="gw-form-group">
              <label for="lineHeight">Line Height</label>
              <input type="text" id="lineHeight" value="1.6" placeholder="1.6">
            </div>
            <div class="gw-form-group">
              <label for="letterSpacing">Letter Spacing</label>
              <input type="text" id="letterSpacing" value="0.02em" placeholder="0.02em">
            </div>
          </div>
        </div>

        <div class="gw-section-wrapper">
          <h2 class="gw-section-title">Live Preview</h2>
          <div class="gw-admin-live-preview" id="typographyPreview">
            <div class="gw-admin-preview-header">
              <div class="gw-admin-preview-brand">
                <span class="gw-admin-preview-eyebrow">Homepage Preview Pipeline</span>
                <strong class="gw-admin-preview-headline" id="previewTemplateName">Select a template to preview the ecommerce homepage</strong>
                <span class="gw-admin-preview-chip" id="previewStatusChip">Layout preview -> progressive render -> full preview</span>
              </div>
              <a href="/subadmin/generate-website/preview" target="_blank" rel="noopener noreferrer" class="gw-admin-preview-cta">Open Full Preview</a>
            </div>
            <div class="gw-admin-preview-toolbar">
              <article class="gw-admin-preview-summary-card">
                <span>Site</span>
                <strong id="previewSiteMeta">Your homepage sections, members, and uploads will appear here.</strong>
              </article>
              <article class="gw-admin-preview-summary-card">
                <span>Typography</span>
                <strong id="previewTypographyMeta">Poppins / Inter</strong>
              </article>
              <article class="gw-admin-preview-summary-card">
                <span>Preview</span>
                <strong id="previewPaletteMeta">Template layout -> sections -> final homepage preview</strong>
              </article>
            </div>
            <div class="gw-admin-preview-swatches" id="previewPaletteSwatches"></div>
            <div class="gw-admin-preview-frame-wrap">
              <iframe
                id="templateLivePreviewFrame"
                class="gw-admin-preview-frame"
                title="Generated website live preview"
                src="/subadmin/generate-website/preview"
              ></iframe>
            </div>
          </div>
        </div>

        <!-- Members Section -->
        <div class="gw-section-wrapper">
          <div class="gw-section-header">
            <h2 class="gw-section-title">Team Members</h2>
            <button class="gw-btn-add-member" id="addMemberBtn" type="button">+ Add Member</button>
          </div>
          <div class="gw-group-photo-panel">
            <div class="gw-form-group">
              <label for="groupPhoto">Group Photo</label>
              <div class="gw-upload-inline">
                <input type="file" id="groupPhoto" accept="image/*">
                <button type="button" class="gw-file-action-btn" id="groupPhotoBrowseBtn">Choose Group Photo</button>
                <span class="gw-upload-file-name" id="groupPhotoFileLabel">No file selected</span>
              </div>
              <small class="gw-field-hint">This stays mapped to the site-level group photo.</small>
            </div>
          </div>
          <div class="gw-members-list" id="membersList"></div>
        </div>

        <!-- Generate Button -->
        <div class="gw-actions">
          <button class="gw-btn-generate" id="generateBtn">🚀 Generate Website</button>
        </div>

        <div class="gw-palette-modal" id="paletteModal" hidden>
          <div class="gw-palette-modal-card">
            <div class="gw-modal-header">
              <div>
                <h3>Edit Color Palette</h3>
                <p class="gw-modal-subtitle">Adjust all 5 colors and preview the palette live.</p>
              </div>
              <button class="gw-modal-close" id="closePaletteModal" type="button">&times;</button>
            </div>
            <div class="gw-palette-modal-body">
              <div class="gw-palette-live-preview" id="paletteModalPreview"></div>
              <div class="gw-palette-editor" id="paletteEditor"></div>
            </div>
            <div class="gw-modal-footer">
              <button class="gw-btn-close-member" id="cancelPaletteBtn" type="button">Cancel</button>
              <button class="gw-btn-save-member" id="applyPaletteBtn" type="button">Apply Palette</button>
            </div>
          </div>
        </div>
      </div>
    `;

  const renderTemplates = () => {
    const container = section.querySelector('#templatesContainer');
    if (!templates || templates.length === 0) {
      container.innerHTML = '<p class="gw-empty-state">No templates available right now.</p>';
      return;
    }

    if (templates.length === 1) {
      const template = templates[0];
      container.innerHTML = `
        <div class="gw-template-card single-template ${selectedTemplate === template.id ? 'active' : ''}" style="width:40%;margin:auto;" data-template-id="${template.id}">
          <h3 class="gw-template-name">${template.name}</h3>
          <button type="button" class="gw-template-btn" data-template-id="${template.id}">
            ${selectedTemplate === template.id ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    } else {
      container.innerHTML = templates.map(template => `
        <div class="gw-template-card ${selectedTemplate === template.id ? 'active' : ''}" data-template-id="${template.id}">
          <h3 class="gw-template-name">${template.name}</h3>
          <button type="button" class="gw-template-btn" data-template-id="${template.id}">
            ${selectedTemplate === template.id ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `).join('');
    }

    container.querySelectorAll('.gw-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const templateId = parseInt(btn.dataset.templateId);
        selectedTemplate = selectedTemplate === templateId ? null : templateId;
        renderTemplates();
        applyTypographyPreview();
      });
    });
  };

  const syncColorInputs = () => {
    const paletteInput = section.querySelector('#paletteInput');
    if (paletteInput) {
      paletteInput.value = JSON.stringify(formData.palette || []);
    }
  };

  const applyTypographyPreview = () => {
    const preview = section.querySelector('#typographyPreview');
    if (!preview) return;

    const typographyPayload = getTypographyPayload();
    const safePalette = [...(formData.palette || defaultPalettes[0].colors)].slice(0, 5);
    while (safePalette.length < 5) {
      safePalette.push('#ffffff');
    }
    const [primary, accent, support, depth, surface] = safePalette;
    const border = normalizeHex(support, '#dbe2ea');
    const backgroundColor = normalizeHex(surface, '#ffffff');
    const textColor = normalizeHex(depth, '#111827');
    const buttonColor = normalizeHex(primary, '#3b82f6');
    const hoverColor = shiftHexColor(buttonColor, getBrightness(buttonColor) > 150 ? -24 : 24);
    const secondaryButtonColor = normalizeHex(accent, '#111827');
    const selectedTemplateData = getSelectedTemplateData();
    const cardColor = normalizeHex(support, '#dbe2ea');
    const palettePreview = null;

    applyTypographyConfig(typographyPayload, { root: preview });
    preview.style.background = `linear-gradient(180deg, ${backgroundColor} 0%, ${shiftHexColor(backgroundColor, -10)} 100%)`;
    preview.style.color = textColor;
    preview.style.setProperty('--preview-accent', secondaryButtonColor);
    preview.style.setProperty('--preview-primary', textColor);
    preview.style.setProperty('--preview-surface', backgroundColor);
    preview.style.setProperty('--preview-border', border);
    preview.style.setProperty('--preview-muted', buttonColor);
    preview.style.setProperty('--preview-text-on-accent', getContrastColor(secondaryButtonColor));
    preview.style.setProperty('--preview-button', buttonColor);
    preview.style.setProperty('--preview-button-text', getContrastColor(buttonColor));
    preview.style.setProperty('--preview-button-hover', hoverColor);
    preview.style.setProperty('--preview-button-hover-text', getContrastColor(hoverColor));
    preview.style.setProperty('--preview-secondary-button', secondaryButtonColor);
    preview.style.setProperty('--preview-secondary-button-text', getContrastColor(secondaryButtonColor));

    const previewTemplateName = section.querySelector('#previewTemplateName');
    const previewStatusChip = section.querySelector('#previewStatusChip');
    const previewSiteMeta = section.querySelector('#previewSiteMeta');
    const previewTypographyMeta = section.querySelector('#previewTypographyMeta');
    const previewPaletteMeta = section.querySelector('#previewPaletteMeta');
    const previewPaletteSwatches = section.querySelector('#previewPaletteSwatches');
    const siteLabel = String(formData.siteName || '').trim() || 'Preview Community';
    const metaParts = [];

    if (String(formData.domain || '').trim()) {
      metaParts.push(String(formData.domain || '').trim());
    }
    metaParts.push(`${members.length} member${members.length === 1 ? '' : 's'}`);

    if (previewTemplateName) {
      previewTemplateName.textContent = selectedTemplateData
        ? `${selectedTemplateData.name} • Homepage preview pipeline`
        : 'Select a template to preview the ecommerce homepage';
    }
    if (previewStatusChip) {
      previewStatusChip.textContent = selectedTemplateData
        ? 'Layout preview -> progressive render -> full preview'
        : 'Choose a template first';
    }
    if (previewSiteMeta) {
      previewSiteMeta.textContent = `${siteLabel} • ${metaParts.join(' • ')}`;
    }
    if (previewTypographyMeta) {
      previewTypographyMeta.textContent = `${typographyPayload.heading?.name || 'Heading'} / ${typographyPayload.body?.name || 'Body'} • ${typographyPayload.font_size_base}`;
      previewTypographyMeta.style.fontFamily = typographyPayload.heading?.name ? `'${typographyPayload.heading.name}', sans-serif` : 'inherit';
    }
    if (previewPaletteMeta) {
      previewPaletteMeta.textContent = 'Template layout -> sections -> final homepage preview';
    }
    if (previewPaletteSwatches) {
      previewPaletteSwatches.innerHTML = safePalette
        .map((color) => `<span class="gw-admin-preview-swatch" style="background:${normalizeHex(color)}"></span>`)
        .join('');
    }

    queueTemplatePreviewSync();
    return;

    if (palettePreview) {
      palettePreview.innerHTML = `
        <div class="gw-admin-preview-showcase">
          <aside class="gw-admin-preview-sidebar">
            <div class="gw-admin-preview-sidebar-item active" style="background:${buttonColor};color:${getContrastColor(buttonColor)};">Hero</div>
            <div class="gw-admin-preview-sidebar-item">News Feed</div>
            <div class="gw-admin-preview-sidebar-item">Members</div>
            <div class="gw-admin-preview-sidebar-item">Media Vault</div>
          </aside>
          <div class="gw-admin-preview-main">
            <section class="gw-admin-preview-hero-card" style="background:linear-gradient(135deg, ${buttonColor} 0%, ${secondaryButtonColor} 100%);color:${getContrastColor(buttonColor)};border-color:${border};">
              <span class="gw-admin-preview-badge">Live Theme Layout</span>
              <h3 class="gw-admin-preview-section-title" style="color:${getContrastColor(buttonColor)};">Your palette now drives the whole interface.</h3>
              <p class="gw-admin-preview-copy" style="color:${getContrastColor(buttonColor)};">Buttons, hover states, cards, text, and page background all reflect the current palette in real time.</p>
              <div class="gw-admin-preview-actions">
                <button type="button" class="gw-admin-preview-primary-btn">Primary Action</button>
                <button type="button" class="gw-admin-preview-secondary-btn">Hover Sample</button>
              </div>
            </section>
            <div class="gw-admin-preview-content-grid">
              <article class="gw-admin-preview-panel" style="background:${backgroundColor};border-color:${border};">
                <h3>Content Surface</h3>
                <p>Cards and reading areas stay clean while still borrowing from the selected palette.</p>
              </article>
              <article class="gw-admin-preview-panel" style="background:${cardColor};color:${getContrastColor(cardColor)};border-color:${border};">
                <h3 style="color:${getContrastColor(cardColor)};">Feature Block</h3>
                <p style="color:${getContrastColor(cardColor)};">Card surfaces and feature areas use the support color so hierarchy is visible immediately.</p>
              </article>
            </div>
            <div class="gw-admin-preview-meta-grid">
              <article class="gw-admin-preview-meta-card">
                <span class="gw-admin-preview-type-label">Heading</span>
                <strong id="headingPreviewMeta">Poppins • 16px</strong>
                <p>This headline shows the voice of the generated homepage.</p>
              </article>
              <article class="gw-admin-preview-meta-card">
                <span class="gw-admin-preview-type-label">Body</span>
                <strong id="bodyPreviewMeta">Inter • 1.6 line height</strong>
                <p>Readable content settings carry through cards, posts, and long-form sections.</p>
              </article>
              <article class="gw-admin-preview-meta-card">
                <span class="gw-admin-preview-type-label">Theme</span>
                <strong id="palettePreviewMeta">Live palette system</strong>
                <p>Background, cards, nav, and actions all update from the selected palette.</p>
              </article>
            </div>
          </div>
        </div>
      `;
    }
    const headingMeta = section.querySelector('#headingPreviewMeta');
    const bodyMeta = section.querySelector('#bodyPreviewMeta');
    const palettePreviewMeta = section.querySelector('#palettePreviewMeta');
    if (headingMeta) {
      headingMeta.textContent = `${typographyPayload.heading?.name || 'Heading'} • ${typographyPayload.font_size_base}`;
      headingMeta.style.fontFamily = typographyPayload.heading?.name ? `'${typographyPayload.heading.name}', sans-serif` : 'inherit';
    }
    if (bodyMeta) {
      bodyMeta.textContent = `${typographyPayload.body?.name || 'Body'} • ${typographyPayload.line_height} line height`;
      bodyMeta.style.fontFamily = typographyPayload.body?.name ? `'${typographyPayload.body.name}', sans-serif` : 'inherit';
    }
    if (palettePreviewMeta) {
      palettePreviewMeta.textContent = `${buttonColor} • ${secondaryButtonColor} • ${backgroundColor}`;
    }
  };

  const updateTypographyRole = (role, patch) => {
    formData.typography = {
      ...(formData.typography || {}),
      [role]: {
        ...(formData.typography?.[role] || {}),
        ...patch,
      },
    };
    syncLegacyFontFields();
    renderTypographyControls();
    applyTypographyPreview();
  };
  const rerenderTypographyControlsWithFocus = (role, control, selectionStart = null, selectionEnd = null) => {
    renderTypographyControls();

    if (!role || !control) return;
    const target = section.querySelector(`[data-role="${role}"][data-typo-control="${control}"]`);
    if (!target) return;

    target.focus();
    if (
      typeof selectionStart === 'number' &&
      typeof selectionEnd === 'number' &&
      typeof target.setSelectionRange === 'function'
    ) {
      target.setSelectionRange(selectionStart, selectionEnd);
    }
  };
  const syncTypographySelectionWithFilters = (role) => {
    const currentFont = formData.typography?.[role] || {};
    const filteredOptions = getFilteredFontOptions(role);

    if (!filteredOptions.length) {
      renderTypographyControls();
      applyTypographyPreview();
      return;
    }

    const currentStillVisible = filteredOptions.some((option) => option.family === currentFont.name);
    if (currentStillVisible) {
      renderTypographyControls();
      applyTypographyPreview();
      return;
    }

    const nextOption = filteredOptions[0];
    updateTypographyRole(role, {
      name: nextOption.family,
      category: nextOption.category || currentFont.category || 'sans-serif',
      url: currentFont.type === 'custom' ? (currentFont.url || '') : '',
    });
  };

  const renderTypographyControls = () => {
    const container = section.querySelector('#typographyControls');
    if (!container) return;

    container.innerHTML = typographyRoles.map((role) => {
      const font = formData.typography?.[role] || {};
      const filteredOptions = getFilteredFontOptions(role);
      const tagFilters = getGoogleFontTagFilters();
      const activeTagFilters = typographyFilters[role]?.tags || {};
      const panelState = typographyFilterPanels[role] || {};
      const activeTagPills = Object.entries(activeTagFilters)
        .filter(([, value]) => value && value !== 'all')
        .map(([group, value]) => `<span class="gw-active-filter-pill">${group}: ${value}</span>`)
        .join('');
      const sourceLabel = font.type === 'google'
        ? 'Google Fonts'
        : font.type === 'custom'
          ? 'Uploaded font'
          : 'System font';

      // Unified font family + appearance selection
      return `
        <div class="gw-admin-typography-card" data-role="${role}">
          <div class="gw-admin-typography-card-header">
            <div>
              <h3>${typographyLabels[role]}</h3>
              <p>${sourceLabel}</p>
            </div>
          </div>
          <div class="gw-form-row">
            <div class="gw-form-group">
              <label for="${role}FontType">Font Source</label>
              <select id="${role}FontType" data-role="${role}" data-typo-control="type">
                <option value="system" ${font.type === 'system' ? 'selected' : ''}>System Font</option>
                <option value="google" ${font.type === 'google' ? 'selected' : ''}>Google Font</option>
                <option value="custom" ${font.type === 'custom' ? 'selected' : ''}>Uploaded Custom Font</option>
              </select>
            </div>
            <div class="gw-form-group">
              <label for="${role}FontCategory">Category</label>
              <select id="${role}FontCategory" data-role="${role}" data-typo-control="category">
                <option value="all" ${(typographyFilters[role]?.category || 'all') === 'all' ? 'selected' : ''}>All Categories</option>
                <option value="sans-serif" ${typographyFilters[role]?.category === 'sans-serif' ? 'selected' : ''}>Sans Serif</option>
                <option value="serif" ${typographyFilters[role]?.category === 'serif' ? 'selected' : ''}>Serif</option>
                <option value="display" ${typographyFilters[role]?.category === 'display' ? 'selected' : ''}>Display</option>
                <option value="calligraphy" ${typographyFilters[role]?.category === 'calligraphy' ? 'selected' : ''}>Calligraphy</option>
                <option value="monospace" ${typographyFilters[role]?.category === 'monospace' ? 'selected' : ''}>Monospace</option>
              </select>
            </div>
            <div class="gw-form-group">
              <label for="${role}FontSearch">Search Available Fonts</label>
              <input type="text" id="${role}FontSearch" data-role="${role}" data-typo-control="search" value="${typographyFilters[role]?.search || ''}" placeholder="Type to narrow matching fonts">
            </div>
          </div>
          ${font.type === 'google' ? `
            <div class="gw-admin-filter-summary">
              <span>${filteredOptions.length} fonts available after filters</span>
              ${activeTagPills || '<span class="gw-active-filter-pill">No tag filters selected</span>'}
              <button type="button" class="gw-clear-filter-btn" data-role="${role}" data-typo-control="clear-all-filters">Clear Filters</button>
            </div>
          ` : ''}
          ${font.type === 'google' ? `
            <div class="gw-form-row">
              <div class="gw-form-group" style="width:100%;">
                <label>Google Fonts Filters</label>
                <div class="gw-google-font-tag-sidebar">
                  ${googleFontFilterGroups.map((group) => {
                    const options = tagFilters[group] || [];
                    if (!options.length) return '';
                    const selectedValue = activeTagFilters[group] || 'all';
                    const isOpen = panelState[group] !== false;
                    return `
                      <div class="gw-google-font-tag-group">
                        <div class="gw-google-font-tag-group-header">
                          <button type="button" class="gw-google-font-tag-toggle" data-role="${role}" data-typo-control="toggle-tag-group" data-tag-group="${group}">
                            <strong>${group}</strong>
                            <span>${isOpen ? '−' : '+'}</span>
                          </button>
                          <button type="button" class="gw-clear-filter-btn" data-role="${role}" data-typo-control="clear-tag-filter" data-tag-group="${group}">Clear</button>
                        </div>
                        <div class="gw-google-font-tag-options ${isOpen ? '' : 'is-collapsed'}">
                          <button type="button" class="gw-tag-filter-btn ${selectedValue === 'all' ? 'active' : ''}" data-role="${role}" data-typo-control="tag-filter" data-tag-group="${group}" data-tag-value="all">All</button>
                          ${options.map((option) => `
                            <button
                              type="button"
                              class="gw-tag-filter-btn ${selectedValue === option.value ? 'active' : ''}"
                              data-role="${role}"
                              data-typo-control="tag-filter"
                              data-tag-group="${group}"
                              data-tag-value="${option.value}"
                            >${option.value}</button>
                          `).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}
          <div class="gw-form-row">
            <div class="gw-form-group">
              <label for="${role}FontName">Available Fonts</label>
              <select id="${role}FontName" data-role="${role}" data-typo-control="name">
                ${filteredOptions.length > 0
                  ? filteredOptions.map((option) => `<option value="${option.family}" ${option.family === font.name ? 'selected' : ''}>${option.family} (${option.category})</option>`).join('')
                  : `<option value="${font.name || ''}">${font.name || 'No fonts found'}</option>`}
              </select>
              ${filteredOptions.length === 0 ? `
                <p class="gw-font-empty-state">
                  No fonts match the selected filters. Remove or change a filter to see available fonts.
                </p>
              ` : ''}
            </div>
            <div class="gw-form-group gw-admin-font-upload-group ${font.type === 'custom' ? '' : 'is-hidden'}">
              <label for="${role}FontFile">Upload Custom Font</label>
              <label class="gw-file-input">
                <input type="file" id="${role}FontFile" data-role="${role}" data-typo-control="file" accept=".woff2,.woff,.ttf,.otf">
                <span class="gw-file-label">${font.file?.name || 'Choose .woff2, .woff, .ttf, or .otf'}</span>
              </label>
            </div>
          </div>
          <div class="gw-admin-font-preview-card">
            <span class="gw-font-preview-label">${role === 'heading' ? 'Heading Preview' : 'Body Preview'}</span>
            <p class="gw-font-preview-sample" style="font-family:${getPreviewFontFamily(font)}">
              ${role === 'heading'
                ? 'This headline sets the tone for the entire fan website.'
                : 'Readable body copy keeps announcements, posts, and pages comfortable on every template.'}
            </p>
          </div>
        </div>
      `;
    }).join('');
  };

  const applyPaletteToForm = (palette) => {
    const normalizedPalette = (Array.isArray(palette) ? palette : defaultPalettes[0].colors)
      .map((color) => normalizeHex(color))
      .slice(0, 5);
    const paddedPalette = [...normalizedPalette];
    while (paddedPalette.length < 5) {
      paddedPalette.push('#ffffff');
    }

    const roles = assignPaletteRoles(paddedPalette);
    formData.palette = paddedPalette;
    formData.primaryColor = roles.primary;
    formData.secondaryColor = roles.background;
    formData.accentColor = roles.accent;
    syncColorInputs();
    applyTypographyPreview();
  };

  const renderPalettePreviewBars = (palette) => (palette || [])
    .map((color) => `<span style="background:${normalizeHex(color)}"></span>`)
    .join('');

  const openPaletteModal = (palette, paletteId = 'custom') => {
    paletteEditorTargetId = paletteId;
    paletteDraft = [...(Array.isArray(palette) ? palette : formData.palette || defaultPalettes[0].colors)];
    while (paletteDraft.length < 5) {
      paletteDraft.push('#ffffff');
    }
    const modal = section.querySelector('#paletteModal');
    if (modal) {
      modal.hidden = false;
    }
    renderPaletteModal();
  };

  const closePaletteModal = () => {
    const modal = section.querySelector('#paletteModal');
    if (modal) {
      modal.hidden = true;
    }
  };

  const renderPaletteModal = () => {
    const preview = section.querySelector('#paletteModalPreview');
    const editor = section.querySelector('#paletteEditor');
    if (!preview || !editor) return;

    preview.innerHTML = renderPalettePreviewBars(paletteDraft);
    editor.innerHTML = paletteDraft.map((color, index) => `
      <label class="gw-palette-editor-item">
        <span>Color ${index + 1}</span>
        <input type="color" class="gw-palette-input" data-index="${index}" value="${normalizeHex(color)}">
        <input type="text" class="gw-palette-text" data-index="${index}" value="${normalizeHex(color)}">
      </label>
    `).join('');

    editor.querySelectorAll('.gw-palette-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const index = Number(e.target.dataset.index);
        paletteDraft[index] = normalizeHex(e.target.value);
        renderPaletteModal();
        applyPaletteToForm(paletteDraft);
        applyTypographyPreview();
      });
    });

    editor.querySelectorAll('.gw-palette-text').forEach((input) => {
      input.addEventListener('input', (e) => {
        const index = Number(e.target.dataset.index);
        paletteDraft[index] = normalizeHex(e.target.value, paletteDraft[index] || '#ffffff');
        const picker = editor.querySelector(`.gw-palette-input[data-index="${index}"]`);
        if (picker) picker.value = normalizeHex(paletteDraft[index]);
        const previewBars = section.querySelectorAll('#paletteModalPreview span');
        if (previewBars[index]) previewBars[index].style.background = normalizeHex(paletteDraft[index]);
        applyPaletteToForm(paletteDraft);
        applyTypographyPreview();
      });
    });
  };

  const renderPalettes = () => {
    const container = section.querySelector('#paletteGrid');
    if (!container) return;

    const cards = [
      ...defaultPalettes.map((palette) => ({
        ...palette,
        selected: selectedPaletteId === palette.id,
      })),
      {
        id: 'custom',
        name: 'Current Palette',
        colors: formData.palette || defaultPalettes[0].colors,
        selected: selectedPaletteId === 'custom',
      },
    ];

    container.innerHTML = cards.map((palette) => `
      <button type="button" class="gw-palette-card ${palette.selected ? 'active' : ''}" data-palette-id="${palette.id}">
        <div class="gw-palette-preview">
          ${renderPalettePreviewBars(palette.colors)}
        </div>
        <div class="gw-palette-meta">
          <strong>${palette.name}</strong>
          <span>${palette.selected ? 'Selected' : 'Edit palette'}</span>
        </div>
      </button>
    `).join('');

    container.querySelectorAll('.gw-palette-card').forEach((card) => {
      card.addEventListener('click', () => {
        const paletteId = card.dataset.paletteId;
        const paletteData = cards.find((palette) => palette.id === paletteId);
        if (!paletteData) return;
        openPaletteModal(paletteData.colors, paletteData.id);
      });
    });
  };

  const renderMembers = () => {
    const container = section.querySelector('#membersList');
    if (members.length === 0) {
      container.innerHTML = '<p class="gw-empty-state">No members added yet</p>';
      return;
    }

    container.innerHTML = members.map((member, idx) => `
      <div class="gw-member-card">
        <div class="gw-member-preview">
          ${member.image ? `<img src="${member.image}" alt="${member.name}">` : '<div class="gw-member-placeholder">📷</div>'}
        </div>
        <div class="gw-member-info">
          <h4>${member.name || 'Unnamed'}</h4>
          <p class="gw-member-role">${member.role || 'No role'}</p>
          <p class="gw-member-description">${member.description || 'No description'}</p>
        </div>
        <button class="gw-member-remove" type="button" data-idx="${idx}">Remove</button>
      </div>
    `).join('');

    container.querySelectorAll('.gw-member-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        members.splice(parseInt(btn.dataset.idx), 1);
        renderMembers();
        applyTypographyPreview();
      });
    });
  };

  const addMember = () => {
    const member = {
      name: '',
      role: '',
      description: '',
      image: null
    };
    members.push(member);
    openMemberModal(members.length - 1);
  };

  const openMemberModal = (idx) => {
    const member = members[idx];
    const modal = document.createElement('div');
    modal.className = 'gw-modal';
    modal.innerHTML = `
      <div class="gw-modal-content">
        <div class="gw-modal-header">
          <h3>Add/Edit Member</h3>
          <button class="gw-modal-close" type="button">&times;</button>
        </div>
        <div class="gw-modal-body">
          <div class="gw-member-modal-grid">
            <div class="gw-member-modal-preview">
              ${member.image ? `<img src="${member.image}" alt="${member.name || 'Member'} preview" class="gw-member-modal-image">` : '<div class="gw-member-modal-placeholder">No image selected</div>'}
            </div>
            <div class="gw-member-modal-fields">
              <div class="gw-form-group">
                <label>Member Name</label>
                <input type="text" class="gw-member-name" value="${member.name}" placeholder="Enter member name" required>
              </div>
              <div class="gw-form-group">
                <label>Role</label>
                <input type="text" class="gw-member-role" value="${member.role}" placeholder="e.g., Manager, Designer" required>
              </div>
              <div class="gw-form-group">
                <label>Description</label>
                <textarea class="gw-member-description" placeholder="Enter member description" rows="4">${member.description}</textarea>
              </div>
              <div class="gw-form-group">
                <label>Member Image</label>
                <div class="gw-upload-inline gw-upload-inline-member">
                  <input type="file" class="gw-member-image" id="gwMemberImageInput-${idx}" accept="image/*">
                  <label for="gwMemberImageInput-${idx}" class="gw-file-action-btn gw-file-action-label">Upload Photo</label>
                  <span class="gw-upload-file-name gw-member-image-name">${member.image ? 'Image selected' : 'No file selected'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="gw-modal-footer">
          <button class="gw-btn-save-member" type="button">Save Member</button>
          <button class="gw-btn-close-member" type="button">Cancel</button>
        </div>
      </div>
    `;
    section.appendChild(modal);

    const fileInput = modal.querySelector('.gw-member-image');
    const fileNameLabel = modal.querySelector('.gw-member-image-name');
    const previewContainer = modal.querySelector('.gw-member-modal-preview');
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (e.target.files[0].size > maxSize) {
          alert('Member image must be less than 2MB');
          e.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          member.image = event.target.result;
          if (previewContainer) {
            previewContainer.innerHTML = `<img src="${member.image}" alt="${member.name || 'Member'} preview" class="gw-member-modal-image">`;
          }
          if (fileNameLabel) {
            fileNameLabel.textContent = e.target.files[0].name;
          }
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    });

    modal.querySelector('.gw-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.gw-btn-close-member').addEventListener('click', () => modal.remove());

    modal.querySelector('.gw-btn-save-member').addEventListener('click', () => {
      const name = modal.querySelector('.gw-member-name').value?.trim();
      const role = modal.querySelector('.gw-member-role').value?.trim();
      const description = modal.querySelector('.gw-member-description').value?.trim();

      if (!name || !role) {
        alert('Member name and role are required');
        return;
      }

      member.name = name;
      member.role = role;
      member.description = description;
      renderMembers();
      applyTypographyPreview();
      modal.remove();
    });
  };

  const setupFormListeners = () => {
    section.querySelector('#siteName')?.addEventListener('input', (e) => {
      formData.siteName = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#domain')?.addEventListener('input', (e) => {
      formData.domain = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#shortBio')?.addEventListener('input', (e) => {
      formData.shortBio = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#description')?.addEventListener('input', (e) => {
      formData.description = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#buttonStyle')?.addEventListener('change', (e) => {
      formData.buttonStyle = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#typographyControls')?.addEventListener('input', (e) => {
      const control = e.target?.dataset?.typoControl;
      const role = e.target?.dataset?.role;
      if (!control || !role) return;

      if (control === 'search') {
        const selectionStart = e.target.selectionStart;
        const selectionEnd = e.target.selectionEnd;
        typographyFilters[role] = {
          ...(typographyFilters[role] || {}),
          search: e.target.value,
        };
        syncTypographySelectionWithFilters(role);
        rerenderTypographyControlsWithFocus(role, 'search', selectionStart, selectionEnd);
      }
    });

    section.querySelector('#typographyControls')?.addEventListener('change', async (e) => {
      const control = e.target?.dataset?.typoControl;
      const role = e.target?.dataset?.role;
      if (!control || !role) return;

      if (control === 'type') {
        const nextType = e.target.value;
        if (nextType === 'google') {
          await fetchGoogleFonts();
        }
        const nextOptions = nextType === 'google' ? googleFonts : systemFonts;
        const nextOption = nextOptions[0] || { family: 'Arial', category: 'sans-serif' };
        updateTypographyRole(role, {
          type: nextType,
          name: nextType === 'custom' ? (formData.typography?.[role]?.name || `${typographyLabels[role]} Custom`) : nextOption.family,
          category: nextOption.category || 'custom',
          url: nextType === 'custom' ? (formData.typography?.[role]?.url || '') : '',
          file: nextType === 'custom' ? (formData.typography?.[role]?.file || null) : null,
        });
        return;
      }

      if (control === 'category') {
        typographyFilters[role] = {
          ...(typographyFilters[role] || {}),
          category: e.target.value,
        };
        syncTypographySelectionWithFilters(role);
        rerenderTypographyControlsWithFocus(role, 'category');
        return;
      }

      if (control === 'name') {
        const selectedOption = getFontOptionsForRole(role).find((font) => font.family === e.target.value);
        updateTypographyRole(role, {
          name: e.target.value,
          category: selectedOption?.category || formData.typography?.[role]?.category || 'sans-serif',
          url: formData.typography?.[role]?.type === 'custom' ? (formData.typography?.[role]?.url || '') : '',
        });
        return;
      }

      if (control === 'file') {
        const file = e.target.files?.[0];
        if (!file) return;

        const validExtensions = ['.woff2', '.woff', '.ttf', '.otf'];
        const lowerName = file.name.toLowerCase();
        if (!validExtensions.some((ext) => lowerName.endsWith(ext))) {
          alert('Custom font must be .woff2, .woff, .ttf, or .otf');
          e.target.value = '';
          return;
        }

        if (uploadedFontObjectUrls[role]) {
          URL.revokeObjectURL(uploadedFontObjectUrls[role]);
        }
        uploadedFontObjectUrls[role] = URL.createObjectURL(file);

        updateTypographyRole(role, {
          type: 'custom',
          file,
          name: file.name.replace(/\.[^.]+$/, '') || `${typographyLabels[role]} Custom`,
          url: uploadedFontObjectUrls[role],
          category: 'custom',
        });
      }
    });

    section.querySelector('#typographyControls')?.addEventListener('click', (e) => {
      const tagButton = e.target.closest('[data-typo-control="tag-filter"]');
      if (tagButton) {
        const role = tagButton.dataset.role;
        const group = tagButton.dataset.tagGroup;
        const value = tagButton.dataset.tagValue || 'all';
        if (!role || !group) return;

        typographyFilters[role] = {
          ...(typographyFilters[role] || {}),
          tags: {
            ...((typographyFilters[role] || {}).tags || {}),
            [group]: value,
          },
        };
        syncTypographySelectionWithFilters(role);
        renderTypographyControls();
        applyTypographyPreview();
        return;
      }

      const clearAllButton = e.target.closest('[data-typo-control="clear-all-filters"]');
      if (clearAllButton) {
        const role = clearAllButton.dataset.role;
        if (!role) return;
        clearTypographyFilters(role);
        syncTypographySelectionWithFilters(role);
        renderTypographyControls();
        applyTypographyPreview();
        return;
      }

      const clearGroupButton = e.target.closest('[data-typo-control="clear-tag-filter"]');
      if (clearGroupButton) {
        const role = clearGroupButton.dataset.role;
        const group = clearGroupButton.dataset.tagGroup;
        if (!role || !group) return;
        clearTypographyFilters(role, group);
        syncTypographySelectionWithFilters(role);
        renderTypographyControls();
        applyTypographyPreview();
        return;
      }

      const toggleGroupButton = e.target.closest('[data-typo-control="toggle-tag-group"]');
      if (toggleGroupButton) {
        const role = toggleGroupButton.dataset.role;
        const group = toggleGroupButton.dataset.tagGroup;
        if (!role || !group) return;
        typographyFilterPanels[role] = {
          ...(typographyFilterPanels[role] || {}),
          [group]: !((typographyFilterPanels[role] || {})[group] !== false),
        };
        renderTypographyControls();
        return;
      }

      const button = e.target.closest('[data-typo-control="appearance"]');
      if (!button) return;

      const role = button.dataset.role;
      const family = button.dataset.fontFamily;
      const category = button.dataset.fontCategory || 'sans-serif';
      if (!role || !family) return;

      updateTypographyRole(role, {
        name: family,
        category,
      });
    });

    section.querySelector('#fontSizeBase')?.addEventListener('input', (e) => {
      formData.typography.fontSizeBase = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#lineHeight')?.addEventListener('input', (e) => {
      formData.typography.lineHeight = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#letterSpacing')?.addEventListener('input', (e) => {
      formData.typography.letterSpacing = e.target.value;
      applyTypographyPreview();
    });

    section.querySelector('#editPaletteBtn')?.addEventListener('click', () => {
      openPaletteModal(formData.palette, selectedPaletteId || 'custom');
    });

    const triggerLogoPicker = () => {
      const logoInput = section.querySelector('#logo');
      if (logoInput) {
        logoInput.click();
      }
    };
    const triggerLeadImagePicker = () => {
      const leadImageInput = section.querySelector('#leadImageFile');
      if (leadImageInput) {
        leadImageInput.click();
      }
    };
    const triggerBannerGalleryPicker = () => {
      const bannerGalleryInput = section.querySelector('#bannerGallery');
      if (bannerGalleryInput) {
        bannerGalleryInput.click();
      }
    };

    section.querySelector('#logoBrowseBtn')?.addEventListener('click', () => {
      triggerLogoPicker();
    });

    section.querySelector('#leadImageBrowseBtn')?.addEventListener('click', () => {
      triggerLeadImagePicker();
    });

    section.querySelector('#bannerGalleryBrowseBtn')?.addEventListener('click', () => {
      triggerBannerGalleryPicker();
    });
    section.querySelector('#bannerGalleryClearBtn')?.addEventListener('click', () => {
      syncBannerGalleryFiles([]);
    });

    section.querySelector('#groupPhotoBrowseBtn')?.addEventListener('click', () => {
      const groupPhotoInput = section.querySelector('#groupPhoto');
      if (groupPhotoInput) {
        groupPhotoInput.click();
      }
    });

    section.querySelector('#logo')?.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (e.target.files[0].size > maxSize) {
          alert('Logo file must be less than 5MB');
          e.target.value = '';
          return;
        }
        formData.logo = e.target.files[0];
        setPreviewMediaFile('logo', formData.logo);
        updateFileInput(e.target);
        applyTypographyPreview();
      }
    });

    section.querySelector('#leadImageFile')?.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (e.target.files[0].size > maxSize) {
          alert('Lead image file must be less than 5MB');
          e.target.value = '';
          return;
        }
        formData.leadImageFile = e.target.files[0];
        setPreviewMediaFile('leadImage', formData.leadImageFile);
        updateFileInput(e.target);
        applyTypographyPreview();
      }
    });

    section.querySelector('#groupPhoto')?.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (e.target.files[0].size > maxSize) {
          alert('Group photo file must be less than 5MB');
          e.target.value = '';
          return;
        }
        formData.groupPhoto = e.target.files[0];
        setPreviewMediaFile('groupPhoto', formData.groupPhoto);
        updateFileInput(e.target);
        applyTypographyPreview();
      }
    });

    section.querySelector('#bannerGallery')?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) {
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      const nonImageFile = files.find((file) => !String(file.type || '').startsWith('image/'));
      if (nonImageFile) {
        alert('Only image files can be uploaded to the gallery.');
        e.target.value = '';
        return;
      }

      const oversizedFile = files.find((file) => file.size > maxSize);
      if (oversizedFile) {
        alert('Each gallery image must be less than 5MB');
        e.target.value = '';
        return;
      }

      appendBannerGalleryFiles(files, e.target);
    });

    section.querySelector('#bannerGalleryBoard')?.addEventListener('click', (e) => {
      const removeButton = e.target.closest('[data-gallery-action="remove"]');
      if (removeButton) {
        const index = Number(removeButton.dataset.index);
        if (!Number.isNaN(index)) {
          removeBannerGalleryFile(index);
        }
        return;
      }

      const addButton = e.target.closest('[data-gallery-action="pick"]');
      if (addButton) {
        triggerBannerGalleryPicker();
      }
    });

    section.querySelector('#instagramUrl')?.addEventListener('input', (e) => {
      formData.instagramUrl = e.target.value.trim();
      applyTypographyPreview();
    });

    section.querySelector('#facebookUrl')?.addEventListener('input', (e) => {
      formData.facebookUrl = e.target.value.trim();
      applyTypographyPreview();
    });

    section.querySelector('#tiktokUrl')?.addEventListener('input', (e) => {
      formData.tiktokUrl = e.target.value.trim();
      applyTypographyPreview();
    });

    section.querySelector('#spotifyUrl')?.addEventListener('input', (e) => {
      formData.spotifyUrl = e.target.value.trim();
      applyTypographyPreview();
    });

    section.querySelector('#xUrl')?.addEventListener('input', (e) => {
      formData.xUrl = e.target.value.trim();
      applyTypographyPreview();
    });

    section.querySelector('#youtubeUrl')?.addEventListener('input', (e) => {
      formData.youtubeUrl = e.target.value.trim();
      applyTypographyPreview();
    });

    section.querySelector('#addMemberBtn')?.addEventListener('click', () => {
      addMember();
    });
  };

  const updateFileInput = (input) => {
    const inline = input.closest('.gw-upload-inline') || input.parentElement;
    const label = inline?.querySelector('.gw-upload-file-name, .gw-file-label');
    if (!label) return;
    if (input.id === 'bannerGallery') {
      const safeCount = Array.isArray(formData.bannerGallery) ? formData.bannerGallery.length : 0;
      label.textContent = safeCount > 0
        ? `${safeCount} gallery image${safeCount === 1 ? '' : 's'} ready`
        : 'No gallery images selected';
      return;
    }
    if (input.files.length > 0) {
      if (input.multiple && input.files.length > 1) {
        label.textContent = `${input.files.length} images selected`;
        return;
      }
      label.textContent = input.files[0].name;
      return;
    }
    if (input.id === 'logo') {
      label.textContent = 'No file selected';
      return;
    }
    if (input.id === 'leadImageFile') {
      label.textContent = 'No file selected';
      return;
    }
    if (input.id === 'groupPhoto') {
      label.textContent = 'No file selected';
      return;
    }
    label.textContent = 'No file selected';
  };

  const validateForm = () => {
    const errors = [];
    
    if (!selectedTemplate) {
      errors.push('Please select a template');
    }
    if (!formData.siteName?.trim()) {
      errors.push('Site name is required');
    }
    if (!formData.domain?.trim()) {
      errors.push('Domain is required');
    }
    
    return errors;
  };

  const setupGenerateButton = () => {
    section.querySelector('#generateBtn')?.addEventListener('click', async () => {
      if (isSubmitting) return;

      const errors = validateForm();
      if (errors.length > 0) {
        alert(errors.join('\n'));
        return;
      }

      // Call API
      await createWebsite();
    });
  };

  const setupBackButton = () => {
    section.querySelector('#backBtn')?.addEventListener('click', () => {
      window.location.href = window.location.origin + '/subadmin/community';
    });
  };

  const setupPaletteModal = () => {
    section.querySelector('#closePaletteModal')?.addEventListener('click', closePaletteModal);
    section.querySelector('#cancelPaletteBtn')?.addEventListener('click', closePaletteModal);
    section.querySelector('#applyPaletteBtn')?.addEventListener('click', () => {
      const presetMatch = defaultPalettes.find((palette) =>
        JSON.stringify((palette.colors || []).map((color) => normalizeHex(color))) ===
        JSON.stringify((paletteDraft || []).map((color) => normalizeHex(color)))
      );
      selectedPaletteId = presetMatch?.id || (paletteEditorTargetId !== 'custom' ? paletteEditorTargetId : 'custom');
      if (!presetMatch) {
        selectedPaletteId = 'custom';
      }
      applyPaletteToForm(paletteDraft);
      renderPalettes();
      closePaletteModal();
    });

    section.querySelector('#paletteModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'paletteModal') {
        closePaletteModal();
      }
    });
  };

  clearTemplatePreviewDraft();
  renderTemplates();
  // load templates from backend
  fetchTemplates();
  fetchGoogleFonts().then(() => {
    renderTypographyControls();
    applyTypographyPreview();
  });
  applyPaletteToForm(defaultPalettes[0].colors);
  renderPalettes();
  renderTypographyControls();
  renderMembers();
  setupFormListeners();
  setupGenerateButton();
  setupBackButton();
  setupPaletteModal();
  syncLegacyFontFields();
  renderBannerGalleryBoard();
  applyTypographyPreview();

  return section;
}
