import api from '../../../services/bini_services/api.js';
import '../../../styles/Admin_styles/Community.css';
import { fetchAdminSites, getAdminHeaders } from './admin-sites.js';

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
        <form class="cm-modal-form" id="editForm">
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
            <label>Short Description</label>
            <input type="text" id="shortBio">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="siteDescription" rows="3"></textarea>
          </div>
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
            <div class="cm-group-photo-preview-wrap">
              <img id="groupPhotoPreview" class="cm-group-photo-preview" alt="Group photo preview" style="display:none;">
              <p id="groupPhotoPreviewEmpty" class="cm-group-photo-empty">No group photo set.</p>
            </div>
          </div>
          <div class="form-group">
            <label>Lead Image URL</label>
            <input type="url" id="leadImage" placeholder="https://...">
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
            <label>Font Style</label>
            <select id="fontStyle">
              <option value="">Default</option>
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Segoe UI">Segoe UI</option>
              <option value="Century Gothic">Century Gothic</option>
              <option value="Verdana">Verdana</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
          </div>
          <div class="form-group">
            <label>Members</label>
            <div id="membersEditor"></div>
            <button type="button" class="cm-btn cm-btn-edit" id="addMemberBtn">+ Add Member</button>
          </div>
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
  let activeMemberUploads = 0;
  let currentPage = 1;
  const itemsPerPage = 6;

  function normalizeSites(rows) {
    return (rows || []).map((row, index) => {
      const siteName = String(row.site_name || row.name || '').trim();
      const domain = String(row.domain || row.community_type || '').trim().toLowerCase();
      const parsedId = Number(row.site_id ?? row.id ?? 0);
      return {
        id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : index + 1,
        site_name: siteName || domain,
        domain,
        status: String(row.status || 'active').trim().toLowerCase(),
        short_bio: String(row.short_bio || '').trim(),
        description: String(row.description || '').trim(),
        group_photo: String(row.group_photo || '').trim(),
        lead_image: String(row.lead_image || '').trim(),
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
        members: Array.isArray(row.members) ? row.members : [],
      };
    }).filter((row) => row.domain);
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
        <input type="text" class="cm-member-role" placeholder="Role" value="${String(member?.role || '').replace(/"/g, '&quot;')}">
        <input type="file" class="cm-member-image-file" accept="image/*">
        <small class="cm-member-image-hint">${member?.image_profile || member?.image ? 'Image selected' : 'No image selected'}</small>
        ${member?.image_profile || member?.image ? `<img src="${String(member?.image_profile || member?.image).replace(/"/g, '&quot;')}" alt="member preview" class="cm-member-image-preview">` : ''}
        <textarea class="cm-member-description" placeholder="Description" rows="2">${String(member?.description || '')}</textarea>
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
      role: String(row.querySelector('.cm-member-role')?.value || '').trim(),
      description: String(row.querySelector('.cm-member-description')?.value || '').trim(),
      image_profile: String(editingMembers[idx]?.image_profile || editingMembers[idx]?.image || '').trim(),
    }));
  }

  function sanitizeMemberImage(imageValue) {
    const normalized = String(imageValue || '').trim();
    // Never send base64 blobs in JSON update payload; it can exceed body parser limits.
    return normalized.startsWith('data:') ? '' : normalized;
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

    container.innerHTML = pageRows.map((site) => `
      <div class="cm-site-card" data-site-id="${site.id}">
        <div class="cm-card-header">
          <span class="cm-badge cm-badge-${site.status}">${site.status.toUpperCase()}</span>
        </div>
        <div class="cm-card-body">
          <h3 class="cm-card-title">${site.site_name}</h3>
          <p class="cm-card-domain">${site.domain}</p>
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
    `).join('');

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

  function openEditModal(siteId) {
    const site = allSites.find((s) => s.id === Number(siteId));
    if (!site) return;
    editingId = site.id;
    section.querySelector('#siteName').value = site.site_name;
    section.querySelector('#siteDomain').value = site.domain;
    section.querySelector('#status').value = site.status;
    section.querySelector('#shortBio').value = site.short_bio || '';
    section.querySelector('#siteDescription').value = site.description || '';
    section.querySelector('#siteLogo').value = site.logo || '';
    updateLogoPreview(site.logo || '');
    section.querySelector('#groupPhoto').value = site.group_photo || '';
    updateGroupPhotoPreview(site.group_photo || '');
    section.querySelector('#leadImage').value = site.lead_image || '';
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
    section.querySelector('#fontStyle').value = site.font_style || '';
    editingMembers = Array.isArray(site.members) ? [...site.members] : [];
    renderMembersEditor();
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
      alert('Please wait for member image upload to finish.');
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

    if (!site_name || !domain) return;

    // Sync members from editor controls
    const memberRows = section.querySelectorAll('.cm-member-row');
    editingMembers = Array.from(memberRows).map((row, idx) => ({
      name: String(row.querySelector('.cm-member-name')?.value || '').trim(),
      role: String(row.querySelector('.cm-member-role')?.value || '').trim(),
      description: String(row.querySelector('.cm-member-description')?.value || '').trim(),
      image_profile: sanitizeMemberImage(
        String(editingMembers[idx]?.image_profile || editingMembers[idx]?.image || '').trim(),
      ),
    })).filter((m) => m.name && m.role);

    try {
      await updateSite(editingId, {
        site_name,
        community_type: domain,
        status,
        short_bio,
        description,
        logo,
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
        font_style,
        members: editingMembers,
      });
      await fetchSites();
      closeEditModal();
    } catch (err) {
      const backendMessage = String(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update site.',
      ).trim();
      console.error('Failed to update site:', err?.response?.data || err.message || err);
      alert(backendMessage);
    }
  }

  async function toggleStatus(siteId, nextStatus) {
    try {
      await updateSite(siteId, { status: nextStatus });
      await fetchSites();
    } catch (err) {
      console.error('Failed to update status:', err?.response?.data || err.message || err);
      alert('Failed to update status.');
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
        editingMembers.push({ name: '', role: '', description: '', image_profile: '' });
        renderMembersEditor();
        return;
      }

      const removeMemberIndex = target.getAttribute('data-remove-member');
      if (removeMemberIndex !== null) {
        syncMembersFromEditor();
        const idx = Number(removeMemberIndex);
        if (Number.isFinite(idx) && idx >= 0) {
          editingMembers.splice(idx, 1);
          renderMembersEditor();
        }
        return;
      }

      const editId = target.getAttribute('data-edit');
      if (editId) {
        openEditModal(Number(editId));
        return;
      }

      const deactId = target.getAttribute('data-deactivate');
      if (deactId) {
        toggleStatus(Number(deactId), 'inactive');
        return;
      }

      const reactId = target.getAttribute('data-reactivate');
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
          alert('Logo image must be less than 2MB');
          target.value = '';
          return;
        }

        try {
          const imageUrl = await uploadSiteImage(file);
          if (!imageUrl) {
            alert('Failed to upload logo image.');
            return;
          }
          const logoInput = section.querySelector('#siteLogo');
          if (logoInput) {
            logoInput.value = imageUrl;
          }
          updateLogoPreview(imageUrl);
        } catch (err) {
          console.error('Logo upload failed:', err?.response?.data || err.message || err);
          alert('Failed to upload logo image.');
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
        alert('Member image must be less than 2MB');
        target.value = '';
        return;
      }

      syncMembersFromEditor();
      activeMemberUploads += 1;

      try {
        const imageUrl = await uploadMemberImage(file);
        if (!imageUrl) {
          alert('Failed to upload member image.');
          return;
        }
        editingMembers[idx].image_profile = imageUrl;
        renderMembersEditor();
      } catch (err) {
        console.error('Member image upload failed:', err?.response?.data || err.message || err);
        alert('Failed to upload member image.');
      } finally {
        activeMemberUploads = Math.max(0, activeMemberUploads - 1);
      }
    });
  }

  setupEventListeners();
  fetchSites();

  return section;
}
