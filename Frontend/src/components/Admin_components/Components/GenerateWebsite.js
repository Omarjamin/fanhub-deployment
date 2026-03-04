// Move file input listeners inside GenerateWebsite function
import api from '../../../services/bini_services/api.js';
import { getAdminHeaders } from './admin-sites.js';

export default function GenerateWebsite() {
  const section = document.createElement('section');
  section.id = 'generate-website';
  section.className = 'gw-section';

  let templates = [];

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
    primaryColor: '#3b82f6',
    secondaryColor: '#ffffff',
    accentColor: '#333333',
    buttonStyle: 'rounded',
    fontStyle: 'sans-serif',
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
      submitData.append('primaryColor', formData.primaryColor);
      submitData.append('secondaryColor', formData.secondaryColor);
      submitData.append('accentColor', formData.accentColor);
      submitData.append('buttonStyle', formData.buttonStyle);
      submitData.append('fontStyle', formData.fontStyle);
      submitData.append('bannerLink', formData.bannerLink);
      
      if (formData.logo) submitData.append('logo', formData.logo);
      
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
    selectedTemplate = null;
    members = [];
    formData = {
      siteName: '',
      domain: '',
      shortBio: '',
      description: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#ffffff',
      accentColor: '#333333',
      buttonStyle: 'rounded',
      fontStyle: 'sans-serif',
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
          <h2 class="gw-section-title">Design & Colors</h2>
          <form class="gw-form" id="designForm">
            <div class="gw-form-row">
              <div class="gw-form-group">
                <label for="primaryColor">Primary Color / Gradient</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="color" id="primaryColorPicker" value="#3b82f6" title="Primary color">
                  <input type="text" id="primaryColor" value="#3b82f6" placeholder="#3b82f6">
                  <div id="primaryColorPreview" style="width:28px; height:28px; border-radius:4px; border:1px solid #d1d5db; background:#3b82f6;"></div>
                </div>
              </div>
              <div class="gw-form-group">
                <label for="secondaryColor">Secondary Color / Gradient</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="color" id="secondaryColorPicker" value="#ffffff" title="Secondary color">
                  <input type="text" id="secondaryColor" value="#ffffff" placeholder="#ffffff">
                  <div id="secondaryColorPreview" style="width:28px; height:28px; border-radius:4px; border:1px solid #d1d5db; background:#ffffff;"></div>
                </div>
              </div>
              <div class="gw-form-group">
                <label for="accentColor">Accent Color / Gradient</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="color" id="accentColorPicker" value="#333333" title="Accent color">
                  <input type="text" id="accentColor" value="#333333" placeholder="#333333">
                  <div id="accentColorPreview" style="width:28px; height:28px; border-radius:4px; border:1px solid #d1d5db; background:#333333;"></div>
                </div>
              </div>
            </div>

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
                <label for="fontStyle">Font Style</label>
                <select id="fontStyle" required>
                  <option value="Arial" style="font-family: Arial, sans-serif;">Aa Arial</option>
                  <option value="Calibri" style="font-family: Calibri, sans-serif;">Aa Calibri</option>
                  <option value="Segoe UI" style="font-family: 'Segoe UI', sans-serif;">Aa Segoe UI</option>
                  <option value="Century Gothic" style="font-family: 'Century Gothic', sans-serif;">Aa Century Gothic</option>
                  <option value="Verdana" style="font-family: Verdana, sans-serif;">Aa Verdana</option>
                  <option value="Helvetica" style="font-family: Helvetica, sans-serif;">Aa Helvetica</option>
                  <option value="Tahoma" style="font-family: Tahoma, sans-serif;">Aa Tahoma</option>
                  <option value="Trebuchet MS" style="font-family: 'Trebuchet MS', sans-serif;">Aa Trebuchet MS</option>
                  <option value="Georgia" style="font-family: Georgia, serif;">Aa Georgia</option>
                  <option value="Times New Roman" style="font-family: 'Times New Roman', serif;">Aa Times New Roman</option>
                </select>
              </div>
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

    section.querySelector('#primaryColor')?.addEventListener('input', (e) => {
      formData.primaryColor = e.target.value.trim();
      const preview = section.querySelector('#primaryColorPreview');
      if (preview) preview.style.background = formData.primaryColor || '#3b82f6';
      const picker = section.querySelector('#primaryColorPicker');
      if (picker && /^#([A-Fa-f0-9]{6})$/.test(formData.primaryColor)) picker.value = formData.primaryColor;
    });
    section.querySelector('#primaryColorPicker')?.addEventListener('input', (e) => {
      formData.primaryColor = e.target.value;
      const text = section.querySelector('#primaryColor');
      if (text) text.value = formData.primaryColor;
      const preview = section.querySelector('#primaryColorPreview');
      if (preview) preview.style.background = formData.primaryColor;
    });

    section.querySelector('#secondaryColor')?.addEventListener('input', (e) => {
      formData.secondaryColor = e.target.value.trim();
      const preview = section.querySelector('#secondaryColorPreview');
      if (preview) preview.style.background = formData.secondaryColor || '#ffffff';
      const picker = section.querySelector('#secondaryColorPicker');
      if (picker && /^#([A-Fa-f0-9]{6})$/.test(formData.secondaryColor)) picker.value = formData.secondaryColor;
    });
    section.querySelector('#secondaryColorPicker')?.addEventListener('input', (e) => {
      formData.secondaryColor = e.target.value;
      const text = section.querySelector('#secondaryColor');
      if (text) text.value = formData.secondaryColor;
      const preview = section.querySelector('#secondaryColorPreview');
      if (preview) preview.style.background = formData.secondaryColor;
    });

    section.querySelector('#accentColor')?.addEventListener('input', (e) => {
      formData.accentColor = e.target.value.trim();
      const preview = section.querySelector('#accentColorPreview');
      if (preview) preview.style.background = formData.accentColor || '#333333';
      const picker = section.querySelector('#accentColorPicker');
      if (picker && /^#([A-Fa-f0-9]{6})$/.test(formData.accentColor)) picker.value = formData.accentColor;
    });
    section.querySelector('#accentColorPicker')?.addEventListener('input', (e) => {
      formData.accentColor = e.target.value;
      const text = section.querySelector('#accentColor');
      if (text) text.value = formData.accentColor;
      const preview = section.querySelector('#accentColorPreview');
      if (preview) preview.style.background = formData.accentColor;
    });

    section.querySelector('#buttonStyle')?.addEventListener('change', (e) => {
      formData.buttonStyle = e.target.value;
    });

    section.querySelector('#fontStyle')?.addEventListener('change', (e) => {
      formData.fontStyle = e.target.value;
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

  renderTemplates();
  // load templates from backend
  fetchTemplates();
  renderMembers();
  setupFormListeners();
  setupGenerateButton();
  setupBackButton();

  return section;
}
