// Move file input listeners inside GenerateWebsite function
import api from '../../../services/bini_services/api.js';
import { getAdminHeaders } from './admin-sites.js';
import { applyFontConfig } from '../../../lib/theme/font-loader.js';

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
    'Arial',
    'Calibri',
    'Segoe UI',
    'Century Gothic',
    'Verdana',
    'Helvetica',
    'Tahoma',
    'Trebuchet MS',
    'Georgia',
    'Times New Roman',
  ];
  const googleFonts = ['Inter', 'Poppins', 'Montserrat', 'Nunito', 'Oswald'];

  let templates = [];
  let selectedPaletteId = defaultPalettes[0].id;
  let paletteDraft = [...defaultPalettes[0].colors];
  let paletteEditorTargetId = defaultPalettes[0].id;
  let customFontObjectUrl = '';
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
    fontStyle: 'Arial',
    fontType: 'system',
    fontName: 'Arial',
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
      submitData.append('fontStyle', formData.fontStyle);
      submitData.append('fontType', formData.fontType);
      submitData.append('fontName', formData.fontName);
      submitData.append('fontUrl', formData.fontUrl || '');
      submitData.append('bannerLink', formData.bannerLink);
      submitData.append('theme', JSON.stringify({
        palette: formData.palette || [],
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: formData.accentColor,
        buttonStyle: formData.buttonStyle,
        fontStyle: formData.fontStyle,
        font: {
          type: formData.fontType,
          name: formData.fontName,
          url: formData.fontUrl || '',
        },
      }));
      
      if (formData.logo) submitData.append('logo', formData.logo);
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
    selectedTemplate = null;
    selectedPaletteId = defaultPalettes[0].id;
    paletteDraft = [...defaultPalettes[0].colors];
    members = [];
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
      fontStyle: 'Arial',
      fontType: 'system',
      fontName: 'Arial',
      fontUrl: '',
      customFontFile: null,
      logo: null,
      bannerLink: '',
      members: []
    };
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
           

              <div class="gw-form-group">
                <label for="fontType">Font Source</label>
                <select id="fontType" required>
                  <option value="system">System Font</option>
                  <option value="google">Google Font</option>
                  <option value="custom">Custom Uploaded Font</option>
                </select>
              </div>
            </div>

            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="fontName">Font Family</label>
                <select id="fontName" required></select>
              </div>
              <div class="gw-form-group gw-font-upload-group" id="fontUploadGroup" hidden>
                <label for="fontFile">Upload Custom Font</label>
                <div class="gw-file-input">
                  <input type="file" id="fontFile" accept=".woff2,.woff,.ttf,.otf">
                  <span class="gw-file-label" id="fontFileLabel">Choose .woff2, .woff, .ttf, or .otf</span>
                </div>
              </div>
            </div>

            <div class="gw-font-preview" id="fontPreviewCard">
              <span class="gw-font-preview-label">Live Font Preview</span>
              <p class="gw-font-preview-sample" id="fontPreviewSample">FanHub lets every community feel like its own brand.</p>
            </div>
          </form>
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

  // Add file input listeners after rendering
  setTimeout(() => {
    // Logo
    const logoInput = section.querySelector('#logo');
    if (logoInput) {
      logoInput.style.display = 'block';
      logoInput.style.position = 'relative';
      logoInput.style.zIndex = '1000';
      logoInput.addEventListener('click', (e) => {
        alert('Logo input clicked');
        logoInput.focus();
      });
      logoInput.addEventListener('focus', () => {
        console.log('Logo input focused');
      });
      logoInput.addEventListener('change', (e) => {
        console.log('Logo input changed', e.target.files);
        if (e.target.files && e.target.files[0]) {
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (e.target.files[0].size > maxSize) {
            alert('Logo file must be less than 5MB');
            e.target.value = '';
            return;
          }
          formData.logo = e.target.files[0];
          updateFileInput(e.target);
          console.log('Logo file set:', formData.logo);
        }
      });
    }
    // Banner link
    const bannerLinkInput = section.querySelector('#bannerLink');
    if (bannerLinkInput) {
      bannerLinkInput.addEventListener('input', (e) => {
        formData.bannerLink = e.target.value.trim();
      });
    }
    // Member images
    section.querySelectorAll('.gw-member-image').forEach((input, idx) => {
      input.style.display = 'block';
      input.style.position = 'relative';
      input.style.zIndex = '1000';
      input.addEventListener('click', (e) => {
        alert('Member image input clicked');
        input.focus();
      });
      input.addEventListener('focus', () => {
        console.log('Member image input focused');
      });
      input.addEventListener('change', (e) => {
        console.log('Member image input changed', e.target.files);
        if (e.target.files && e.target.files[0]) {
          const maxSize = 2 * 1024 * 1024; // 2MB
          if (e.target.files[0].size > maxSize) {
            alert('Member image must be less than 2MB');
            e.target.value = '';
            return;
          }
          // Use FileReader for preview
          const reader = new FileReader();
          reader.onload = (event) => {
            members[idx].image = event.target.result;
            console.log('Member image set:', members[idx].image);
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      });
    });
  }, 0);

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

  const applyPreviewFont = () => {
    const preview = section.querySelector('#fontPreviewSample');
    if (!preview) return;

    applyFontConfig({
      type: formData.fontType,
      name: formData.fontName,
      url: formData.fontUrl || '',
    }, { root: preview });
    preview.style.fontFamily = `var(--theme-font-family)`;
  };

  const renderFontOptions = () => {
    const fontNameSelect = section.querySelector('#fontName');
    const fontUploadGroup = section.querySelector('#fontUploadGroup');
    const fontFileLabel = section.querySelector('#fontFileLabel');
    if (!fontNameSelect) return;

    const options = formData.fontType === 'google' ? googleFonts : systemFonts;
    if (formData.fontType === 'custom') {
      const customName = formData.fontName || 'Custom Brand Font';
      fontNameSelect.innerHTML = `<option value="${customName}">${customName}</option>`;
      fontNameSelect.value = customName;
      fontNameSelect.disabled = false;
      if (fontUploadGroup) fontUploadGroup.hidden = false;
      if (fontFileLabel) {
        fontFileLabel.textContent = formData.customFontFile?.name || 'Choose .woff2, .woff, .ttf, or .otf';
      }
    } else {
      fontNameSelect.innerHTML = options.map((font) => `
        <option value="${font}" ${formData.fontName === font ? 'selected' : ''}>${font}</option>
      `).join('');
      if (!options.includes(formData.fontName)) {
        formData.fontName = options[0];
        formData.fontStyle = options[0];
      }
      if (fontUploadGroup) fontUploadGroup.hidden = true;
    }

    applyPreviewFont();
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
    });

    section.querySelector('#fontType')?.addEventListener('change', (e) => {
      formData.fontType = e.target.value;
      formData.fontName = e.target.value === 'google' ? googleFonts[0] : systemFonts[0];
      formData.fontStyle = formData.fontName;
      if (formData.fontType !== 'custom') {
        formData.fontUrl = '';
        formData.customFontFile = null;
      }
      renderFontOptions();
    });

    section.querySelector('#fontName')?.addEventListener('change', (e) => {
      formData.fontName = e.target.value;
      formData.fontStyle = e.target.value;
      applyPreviewFont();
    });

    section.querySelector('#fontFile')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validExtensions = ['.woff2', '.woff', '.ttf', '.otf'];
      const lowerName = file.name.toLowerCase();
      if (!validExtensions.some((ext) => lowerName.endsWith(ext))) {
        alert('Custom font must be .woff2, .woff, .ttf, or .otf');
        e.target.value = '';
        return;
      }

      formData.customFontFile = file;
      formData.fontType = 'custom';
      formData.fontName = file.name.replace(/\.[^.]+$/, '') || 'Custom Brand Font';
      formData.fontStyle = formData.fontName;
      if (customFontObjectUrl) {
        URL.revokeObjectURL(customFontObjectUrl);
      }
      customFontObjectUrl = URL.createObjectURL(file);
      formData.fontUrl = customFontObjectUrl;
      renderFontOptions();
      applyPreviewFont();
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
  applyPaletteToForm(defaultPalettes[0].colors);
  renderPalettes();
  renderFontOptions();
  renderMembers();
  setupFormListeners();
  setupGenerateButton();
  setupBackButton();
  setupPaletteModal();

  return section;
}
