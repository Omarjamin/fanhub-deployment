import '../../../styles/Admin_styles/Discography.css';
import { getAdminHeaders } from './admin-sites.js';

const BASE_V1 = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';

function authHeaders() {
  const headers = { ...getAdminHeaders() };
  headers['Content-Type'] = 'application/json';
  return headers;
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch (_) {
    return {};
  }
}

async function uploadImage(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('image_file', file);

  const headers = { ...getAdminHeaders() };

  const response = await fetch(`${BASE_V1}/bini/cloudinary/upload`, {
    method: 'POST',
    headers,
    body: formData
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) {
    throw new Error(result.message || 'Image upload failed');
  }
  return result.url;
}

export default function Discography() {
  const section = document.createElement('section');
  section.id = 'discography';
  section.className = 'content-section active discography';

  section.innerHTML = `
    <div class="dg-header">
      <h2>Discography Management</h2>
      <button type="button" class="dg-btn-primary" id="addAlbumBtn">+ Add Album</button>
    </div>

    <div class="dg-filters">
      <select class="dg-select" id="communityFilter">
        <option value="">All Sites</option>
      </select>
    </div>

    <div class="dg-table-wrap">
      <table class="dg-table">
        <thead>
          <tr>
            <th>Album</th>
            <th>Community</th>
            <th>Songs</th>
            <th>Year</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="albumTableBody"></tbody>
      </table>
    </div>

    <div class="dg-modal hidden" id="albumModal" role="dialog" aria-modal="true" aria-labelledby="albumModalTitle">
      <div class="dg-modal-card">
        <div class="dg-modal-header">
          <h3 id="albumModalTitle">Add Album</h3>
          <button type="button" class="dg-close-btn" id="closeAlbumModal" aria-label="Close">x</button>
        </div>
        <form id="albumForm" class="dg-form">
          <label class="dg-form-group">
            <span>Site</span>
            <select id="albumCommunity" required>
              <option value="">Select Site</option>
            </select>
          </label>
          <label class="dg-form-group">
            <span>Album Name</span>
            <input id="albumName" type="text" placeholder="Enter album name" required>
          </label>
          <label class="dg-form-group">
            <span>Number of Songs</span>
            <input id="albumSongs" type="number" min="1" placeholder="Ex: 12" required>
          </label>
          <label class="dg-form-group">
            <span>Year</span>
            <input id="albumYear" type="number" min="1900" max="2100" placeholder="Ex: 2024" required>
          </label>
          <label class="dg-form-group">
            <span>Album Link</span>
            <input id="albumExternalLink" type="url" placeholder="https://open.spotify.com/album/...">
          </label>
          <label class="dg-form-group">
            <span>Description</span>
            <textarea id="albumDescription" placeholder="Album description"></textarea>
          </label>
          <label class="dg-form-group">
            <span>Album Image</span>
            <input id="albumImage" type="file" accept="image/*">
          </label>
          <div class="dg-form-actions">
            <button type="button" class="dg-btn-secondary" id="cancelAlbumModal">Cancel</button>
            <button type="submit" class="dg-btn-primary" id="saveAlbumBtn">Save Album</button>
          </div>
        </form>
      </div>
    </div>

    <div class="dg-modal hidden" id="deleteAlbumModal" role="dialog" aria-modal="true" aria-labelledby="deleteAlbumTitle">
      <div class="dg-modal-card dg-modal-card-sm">
        <div class="dg-modal-header">
          <h3 id="deleteAlbumTitle">Delete Album</h3>
          <button type="button" class="dg-close-btn" id="closeDeleteAlbumModal" aria-label="Close">x</button>
        </div>
        <div class="dg-delete-body">
          <p id="deleteAlbumLabel">Delete this album?</p>
        </div>
        <div class="dg-form-actions">
          <button type="button" class="dg-btn-secondary" id="cancelDeleteAlbum">Cancel</button>
          <button type="button" class="dg-btn-danger" id="confirmDeleteAlbum">Delete</button>
        </div>
      </div>
    </div>
  `;

  // albums will be loaded from backend
  let albums = [];
  let communities = [];

  let editingAlbumId = null;
  let deletingAlbumId = null;

  function getCommunities() {
    return communities.map(c => ({ id: c.community_id, name: c.name }));
  }

function loadCommunityFilter() {
    const filter = section.querySelector('#communityFilter');
    const communities = getCommunities();
    filter.innerHTML = `
      <option value="">All Sites</option>
      ${communities.map((community) => `<option value="${community.id}">${community.name}</option>`).join('')}
    `;
  }

  function loadCommunityOptions() {
    const select = section.querySelector('#albumCommunity');
    const communities = getCommunities();
    select.innerHTML = `
      <option value="">Select Site</option>
      ${communities.map(community => `<option value="${community.id}">${community.name}</option>`).join('')}
    `;
  }

  function findAlbumById(albumId, siteId = null) {
    return albums.find(album => {
      const matchId = String(album.album_id) === String(albumId);
      if (!matchId) return false;
      if (!siteId) return true;
      return String(album.site_id || album.community_id) === String(siteId);
    });
  }

  function renderRows() {
    const tbody = section.querySelector('#albumTableBody');
    const selectedCommunity = section.querySelector('#communityFilter').value;

    const filtered = selectedCommunity
      ? albums.filter(album => String(album.site_id || album.community_id) === String(selectedCommunity))
      : albums;

    tbody.innerHTML = filtered.map(album => `
      <tr data-album-id="${album.album_id}" data-site-id="${album.site_id || album.community_id || ''}">
        <td>
          <div class="dg-album-cell">
            <img src="${album.img_url || album.album_link || '/placeholder.svg?height=80&width=80'}" alt="${album.name}" class="dg-album-image">
            <div>
              <p class="dg-album-name">${album.name}</p>
              <span class="dg-album-id">#${album.album_id}</span>
            </div>
          </div>
        </td>
            <td>${album.community_name || album.community || ''}</td>
        <td>${album.songs}</td>
        <td>${album.year}</td>
        <td>
          <div class="dg-actions">
            <button type="button" class="dg-action-btn edit" data-action="edit">Edit</button>
            <button type="button" class="dg-action-btn delete" data-action="delete">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ------------------ API helpers ------------------
  async function fetchAlbums(communityId = null) {
    try {
      const q = communityId ? `?site_id=${encodeURIComponent(communityId)}` : '';
      const res = await fetch(`${BASE_V1}/admin/discography${q}`, { headers: authHeaders() });
      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to fetch');
      albums = json.data || [];
      renderRows();
    } catch (err) {
      console.error('fetchAlbums error', err);
    }
  }

  async function fetchCommunities() {
    try {
      const res = await fetch(`${BASE_V1}/admin/discography/communities/list`, { headers: authHeaders() });
      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to fetch communities');
      communities = json.data || [];
      // populate both filter and select
      const filter = section.querySelector('#communityFilter');
      filter.innerHTML = `\n        <option value="">All Sites</option>\n        ${communities.map(c => `<option value="${c.community_id}">${c.name}</option>`).join('')}\n      `;
      loadCommunityOptions();
    } catch (err) {
      console.error('fetchCommunities error', err);
    }
  }

  async function createAlbum(payload) {
    try {
      const res = await fetch(`${BASE_V1}/admin/discography`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json.error || json.message || 'Create failed');
      await fetchAlbums();
      return json.data;
    } catch (err) {
      console.error('createAlbum error', err);
      throw err;
    }
  }

  async function updateAlbum(id, payload) {
    try {
      const res = await fetch(`${BASE_V1}/admin/discography/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json.error || json.message || 'Update failed');
      await fetchAlbums();
      return json.data;
    } catch (err) {
      console.error('updateAlbum error', err);
      throw err;
    }
  }

  async function deleteAlbum(id, siteId) {
    try {
      const q = siteId ? `?site_id=${encodeURIComponent(siteId)}` : '';
      const res = await fetch(`${BASE_V1}/admin/discography/${id}${q}`, { method: 'DELETE', headers: authHeaders() });
      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json.error || json.message || 'Delete failed');
      await fetchAlbums();
      return true;
    } catch (err) {
      console.error('deleteAlbum error', err);
      throw err;
    }
  }

  function setupAddEditModal() {
    const modal = section.querySelector('#albumModal');
    const title = section.querySelector('#albumModalTitle');
    const form = section.querySelector('#albumForm');
    const saveBtn = section.querySelector('#saveAlbumBtn');
    const closeBtn = section.querySelector('#closeAlbumModal');
    const cancelBtn = section.querySelector('#cancelAlbumModal');
    const addBtn = section.querySelector('#addAlbumBtn');

    const communityInput = section.querySelector('#albumCommunity');
    const nameInput = section.querySelector('#albumName');
    const songsInput = section.querySelector('#albumSongs');
    const yearInput = section.querySelector('#albumYear');
    const albumLinkInput = section.querySelector('#albumExternalLink');
    const descriptionInput = section.querySelector('#albumDescription');
    const imageInput = section.querySelector('#albumImage');

    function closeModal() {
      modal.classList.add('hidden');
      editingAlbumId = null;
    }

    function openAddModal() {
      editingAlbumId = null;
      form.reset();
      loadCommunityOptions();
      title.textContent = 'Add Album';
      saveBtn.textContent = 'Save Album';
      modal.classList.remove('hidden');
    }

    function openEditModal(albumId, siteId = null) {
      // albumId here is the backend album_id
      const album = findAlbumById(albumId, siteId);
      if (!album) return;

      editingAlbumId = albumId;
      form.reset();
      loadCommunityOptions();
      communityInput.value = album.group_community_id || '';
      if (!communityInput.value) {
        communityInput.value = album.site_id || album.community_id || '';
      }
      nameInput.value = album.name || '';
      songsInput.value = album.songs || '';
      yearInput.value = album.year || '';
      albumLinkInput.value = album.album_link || '';
      descriptionInput.value = album.description || '';
      imageInput.value = '';
      title.textContent = 'Edit Album';
      saveBtn.textContent = 'Update Album';
      modal.classList.remove('hidden');
    }

    addBtn.addEventListener('click', openAddModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const imageFile = imageInput.files?.[0];

      // Build payload expected by backend
      // For your DB schema we send numeric year, count_songs, and album_link
      const body = {
        site_id: Number(communityInput.value) || null,
        title: nameInput.value.trim(),
        count_songs: songsInput.value ? Number(songsInput.value) : null,
        year: yearInput.value ? Number(yearInput.value) : null,
        album_link: albumLinkInput.value.trim() || null,
        album_lnk: albumLinkInput.value.trim() || null,
        description: descriptionInput.value.trim() || null,
        img_url: null
      };
      if (imageFile) {
        try {
          body.img_url = await uploadImage(imageFile);
        } catch (error) {
          console.error('Failed to upload album image:', error);
          alert(error.message || 'Failed to upload image.');
          return;
        }
      } else if (editingAlbumId) {
        const currentAlbum = albums.find(a => String(a.album_id) === String(editingAlbumId));
        if (currentAlbum?.img_url) {
          body.img_url = currentAlbum.img_url;
        }
      }

      try {
        if (editingAlbumId) {
          // editingAlbumId should correspond to album_id from backend; when opening edit modal, we will store that
          await updateAlbum(editingAlbumId, body);
        } else {
          await createAlbum(body);
        }
        await fetchCommunities();
        await fetchAlbums();
        closeModal();
      } catch (err) {
        console.error('Error saving album', err);
        alert('Failed to save album');
      }
    });

    return { openEditModal, closeModal };
  }

  function setupDeleteModal() {
    const modal = section.querySelector('#deleteAlbumModal');
    const label = section.querySelector('#deleteAlbumLabel');
    const closeBtn = section.querySelector('#closeDeleteAlbumModal');
    const cancelBtn = section.querySelector('#cancelDeleteAlbum');
    const confirmBtn = section.querySelector('#confirmDeleteAlbum');

    function closeModal() {
      deletingAlbumId = null;
      modal.classList.add('hidden');
    }

    function openModal(albumId, siteId = null) {
      const album = findAlbumById(albumId, siteId);
      if (!album) return;

      deletingAlbumId = albumId;
      label.textContent = `Delete "${album.name}" album?`;
      modal.classList.remove('hidden');
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    confirmBtn.addEventListener('click', async () => {
      if (!deletingAlbumId) return;
      try {
        const album = findAlbumById(deletingAlbumId);
        const siteId = album?.site_id || album?.community_id || null;
        await deleteAlbum(deletingAlbumId, siteId);
        await fetchCommunities();
        await fetchAlbums();
      } catch (err) {
        console.error('Error deleting album', err);
        alert('Failed to delete album');
      }
      closeModal();
    });

    return { openModal, closeModal };
  }

  function setupTableActions(editModalApi, deleteModalApi) {
    section.addEventListener('click', event => {
      const actionBtn = event.target.closest('[data-action]');
      const row = event.target.closest('tr[data-album-id]');
      if (!actionBtn || !row) return;

      const albumId = row.dataset.albumId;
      const siteId = row.dataset.siteId || null;
      const action = actionBtn.dataset.action;

      if (action === 'edit') {
        editModalApi.openEditModal(albumId, siteId);
      } else if (action === 'delete') {
        deleteModalApi.openModal(albumId, siteId);
      }
    });
  }

  function setupFilters() {
    section.querySelector('#communityFilter').addEventListener('change', async (e) => {
      const val = e.target.value;
      await fetchAlbums(val || null);
    });
  }

  function init() {
    // load data from backend
    fetchCommunities();
    fetchAlbums();
    setupFilters();

    const editModalApi = setupAddEditModal();
    const deleteModalApi = setupDeleteModal();
    setupTableActions(editModalApi, deleteModalApi);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      section.querySelector('#albumModal').classList.add('hidden');
      section.querySelector('#deleteAlbumModal').classList.add('hidden');
    });
  }

  init();
  return section;
}
