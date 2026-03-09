// Move file input listeners inside GenerateWebsite function
import api from '../../../services/bini_services/api.js';
import { getAdminHeaders } from './admin-sites.js';
import { applyTypographyConfig } from '../../../lib/theme/font-loader.js';

export default function GenerateWebsite() {
  const section = document.createElement('section');
  section.id = 'generate-website';
  section.className = 'gw-section';

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
    sans: 'Appearance',
    serif: 'Appearance',
    display: 'Appearance',
    monospace: 'Appearance',
    handwriting: 'Appearance',
    script: 'Appearance',
    blackletter: 'Appearance',
    decorative: 'Appearance',
    text: 'Technology',
    ui: 'Technology',
    code: 'Technology',
    coding: 'Technology',
    screen: 'Technology',
    variable: 'Technology',
    technology: 'Technology',
    seasonal: 'Seasonal',
    holiday: 'Seasonal',
    festive: 'Seasonal',
  };
  const googleFontFilterGroups = ['Feeling', 'Appearance', 'Technology', 'Seasonal'];

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
      const group = googleFontTagCategoryMap[root.toLowerCase()] || null;
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
      // Map backend template shape to what this component expects
        templates = Array.isArray(data) ? data.map((t, idx) => ({
          id: t._id || t.id || idx + 1,
          name: t.template_name || `Template ${idx + 1}`,
          key: toTemplateKey(t.template_key || t.template_name || t.name || `template-${idx + 1}`),
        })) : [];
    } catch (err) {
      console.error('Failed to fetch templates:', err?.response?.data || err.message || err);
      templates = [];
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
  const getFilteredFontOptions = (role) => {
    const filters = typographyFilters[role] || { search: '', category: 'all', tags: {} };
    const search = String(filters.search || '').trim().toLowerCase();
    const category = String(filters.category || 'all').trim().toLowerCase();
    const selectedTags = filters.tags || {};
    const options = getFontOptionsForRole(role);
    return options.filter((font) => {
      const family = String(font.family || '').toLowerCase();
      const fontCategory = String(font.category || 'other').toLowerCase();
      const matchesSearch = !search || family.includes(search);
      const matchesCategory = category === 'all' || fontCategory === category;
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
    bannerLink: '',
    members: []
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
      submitData.append('bannerLink', formData.bannerLink);
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
      bannerLink: '',
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
                <div class="gw-file-input">
                  <input type="file" id="logo" accept="image/*">
                  <span class="gw-file-label">Choose file or drag here</span>
                </div>
              </div>
              <div class="gw-form-group">
                <label for="bannerLink">YouTube Banner Link</label>
                <input type="url" id="bannerLink" placeholder="https://www.youtube.com/watch?v=...">
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
              <span class="gw-admin-preview-eyebrow">Template preview</span>
              <button type="button" class="gw-admin-preview-cta">Join Community</button>
            </div>
            <div class="gw-admin-preview-palette" id="combinedPalettePreview"></div>
            <h1 class="gw-admin-preview-heading">Fan websites should feel unmistakably theirs.</h1>
            <p class="gw-admin-preview-body">
              Preview how your heading font, body font, base size, line height, and letter spacing will read
              together across the generated website before you publish it.
            </p>
            <div class="gw-admin-preview-grid">
              <article class="gw-admin-preview-card">
                <h3>Heading Preview</h3>
                <p id="headingPreviewMeta">Poppins</p>
              </article>
              <article class="gw-admin-preview-card">
                <h3>Body Preview</h3>
                <p id="bodyPreviewMeta">Inter</p>
              </article>
              <article class="gw-admin-preview-card">
                <h3>Palette Preview</h3>
                <p id="palettePreviewMeta">5 live colors ready for your site</p>
              </article>
            </div>
          </div>
        </div>

        <!-- Members Section -->
        <div class="gw-section-wrapper">
          <div class="gw-section-header">
            <h2 class="gw-section-title">Team Members</h2>
            <button class="gw-btn-add-member" id="addMemberBtn" type="button">+ Add Member</button>
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
      container.innerHTML = '<p class="gw-empty-state">No templates available. Loading or none found.</p>';
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
    const palettePreview = section.querySelector('#combinedPalettePreview');
    const palettePreviewMeta = section.querySelector('#palettePreviewMeta');
    const safePalette = (formData.palette || defaultPalettes[0].colors).slice(0, 5);

    applyTypographyConfig(typographyPayload, { root: preview });
    preview.style.background = `linear-gradient(135deg, ${formData.secondaryColor} 0%, ${formData.palette?.[4] || '#f8fafc'} 100%)`;
    preview.style.color = formData.primaryColor;
    preview.style.setProperty('--preview-accent', formData.accentColor);

    const headingMeta = section.querySelector('#headingPreviewMeta');
    const bodyMeta = section.querySelector('#bodyPreviewMeta');
    if (headingMeta) {
      headingMeta.textContent = `${typographyPayload.heading?.name || 'Heading'} • ${typographyPayload.font_size_base}`;
      headingMeta.style.fontFamily = typographyPayload.heading?.name ? `'${typographyPayload.heading.name}', sans-serif` : 'inherit';
    }
    if (bodyMeta) {
      bodyMeta.textContent = `${typographyPayload.body?.name || 'Body'} • ${typographyPayload.line_height} line height`;
      bodyMeta.style.fontFamily = typographyPayload.body?.name ? `'${typographyPayload.body.name}', sans-serif` : 'inherit';
    }
    if (palettePreview) {
      palettePreview.innerHTML = safePalette.map((color, index) => `
        <div class="gw-admin-preview-palette-swatch" style="background:${normalizeHex(color)};color:${getContrastColor(color)};">
          <span>${index === 0 ? 'Primary' : index === 1 ? 'Accent' : index === 2 ? 'Support' : index === 3 ? 'Depth' : 'Surface'}</span>
          <strong>${normalizeHex(color)}</strong>
        </div>
      `).join('');
    }
    if (palettePreviewMeta) {
      palettePreviewMeta.textContent = safePalette.map((color) => normalizeHex(color)).join(' • ');
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

  const renderTypographyControls = () => {
    const container = section.querySelector('#typographyControls');
    if (!container) return;

    container.innerHTML = typographyRoles.map((role) => {
      const font = formData.typography?.[role] || {};
      const filteredOptions = getFilteredFontOptions(role);
      const tagFilters = getGoogleFontTagFilters();
      const activeTagFilters = typographyFilters[role]?.tags || {};
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
              <label for="${role}FontSearch">Font Search</label>
              <input type="text" id="${role}FontSearch" data-role="${role}" data-typo-control="search" value="${typographyFilters[role]?.search || ''}" placeholder="Search fonts">
            </div>
            <div class="gw-form-group">
              <label for="${role}FontCategory">Category</label>
              <select id="${role}FontCategory" data-role="${role}" data-typo-control="category">
                <option value="all" ${(typographyFilters[role]?.category || 'all') === 'all' ? 'selected' : ''}>All Categories</option>
                <option value="sans-serif" ${typographyFilters[role]?.category === 'sans-serif' ? 'selected' : ''}>Sans Serif</option>
                <option value="serif" ${typographyFilters[role]?.category === 'serif' ? 'selected' : ''}>Serif</option>
                <option value="display" ${typographyFilters[role]?.category === 'display' ? 'selected' : ''}>Display</option>
                <option value="monospace" ${typographyFilters[role]?.category === 'monospace' ? 'selected' : ''}>Monospace</option>
              </select>
            </div>
          </div>
          <div class="gw-form-row">
            ${font.type === 'google' ? `
              <div class="gw-form-group" style="min-width:220px;max-width:260px;">
                <label>Tag Filters</label>
                <div class="gw-google-font-tag-sidebar">
                  ${googleFontFilterGroups.map((group) => {
                    const options = tagFilters[group] || [];
                    if (!options.length) return '';
                    const selectedValue = activeTagFilters[group] || 'all';
                    return `
                      <div class="gw-google-font-tag-group">
                        <strong>${group}</strong>
                        <div class="gw-google-font-tag-options">
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
            ` : ''}
            <div class="gw-form-group">
              <label for="${role}FontName">Font Family & Appearance</label>
              <select id="${role}FontName" data-role="${role}" data-typo-control="name">
                ${filteredOptions.length > 0
                  ? filteredOptions.map((option) => `<option value="${option.family}" ${option.family === font.name ? 'selected' : ''}>${option.family} (${option.category})</option>`).join('')
                  : `<option value="${font.name || ''}">${font.name || 'No fonts found'}</option>`}
              </select>
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
            <textarea class="gw-member-description" placeholder="Enter member description" rows="3">${member.description}</textarea>
          </div>
          <div class="gw-form-group">
            <label>Member Image</label>
            <div class="gw-file-input">
              <input type="file" class="gw-member-image" accept="image/*">
              <span class="gw-file-label">Choose file or drag here</span>
            </div>
          </div>
        </div>
        <div class="gw-modal-footer">
          <button class="gw-btn-save-member" type="button">Save Member</button>
          <button class="gw-btn-close-member" type="button">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const fileInput = modal.querySelector('.gw-member-image');
    fileInput.style.display = 'block';
    fileInput.style.position = 'relative';
    fileInput.style.zIndex = '1000';
    fileInput.addEventListener('click', (e) => {
      fileInput.focus();
    });
    fileInput.addEventListener('focus', () => {
    });
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
      modal.remove();
    });
  };

  const setupFormListeners = () => {
    section.querySelector('#siteName')?.addEventListener('input', (e) => {
      formData.siteName = e.target.value;
    });

    section.querySelector('#domain')?.addEventListener('input', (e) => {
      formData.domain = e.target.value;
    });

    section.querySelector('#shortBio')?.addEventListener('change', (e) => {
      formData.shortBio = e.target.value;
    });

    section.querySelector('#description')?.addEventListener('change', (e) => {
      formData.description = e.target.value;
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
        rerenderTypographyControlsWithFocus(role, 'search');
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

    section.querySelector('#logo')?.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (e.target.files[0].size > maxSize) {
          alert('Logo file must be less than 5MB');
          e.target.value = '';
          return;
        }
        formData.logo = e.target.files[0];
        updateFileInput(e.target);
      }
    });

    section.querySelector('#bannerLink')?.addEventListener('input', (e) => {
      formData.bannerLink = e.target.value.trim();
    });

    section.querySelector('#addMemberBtn')?.addEventListener('click', () => {
      addMember();
    });
  };

  const updateFileInput = (input) => {
    const label = input.parentElement.querySelector('.gw-file-label');
    if (input.files.length > 0) {
      label.textContent = input.files[0].name;
    }
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
    if (formData.bannerLink && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(formData.bannerLink)) {
      errors.push('Banner link must be a valid YouTube URL');
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
  applyTypographyPreview();

  return section;
}
