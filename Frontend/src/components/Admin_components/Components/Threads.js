import { getAdminHeaders } from './admin-sites.js';
import { fetchAdminSites, resolveAdminSiteFromPath } from './admin-sites.js';

export default function Threads() {
  const BASE_V1 = import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1';
  const ADMIN_SELECTED_THREAD_SITE_ID_KEY = 'admin_selected_thread_site_id';
  const ADMIN_SELECTED_SITE_KEY = 'admin_selected_site';
  const forcedSiteSlug = resolveAdminSiteFromPath();
  const isForcedSingleSite = Boolean(forcedSiteSlug);
  const section = document.createElement('section');
  section.id = 'threads';
  section.className = 'content-section active threads-section';

  const state = {
    threads: [],
    localThreads: [],
    sites: [],
    currentThread: null,
    isEditMode: false,
    selectedSite: 'all',
    isLoading: false
  };

  function authHeaders(withJson = false) {
    const headers = { ...getAdminHeaders() };
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function getSelectedSiteId() {
    try {
      if (isForcedSingleSite) return forcedSiteSlug;
      const globalSelected = String(
        sessionStorage.getItem(ADMIN_SELECTED_SITE_KEY) || '',
      ).trim().toLowerCase();
      if (globalSelected && globalSelected !== 'all') return globalSelected;
      return String(
        sessionStorage.getItem(ADMIN_SELECTED_THREAD_SITE_ID_KEY) ||
        globalSelected ||
        'all'
      ).trim().toLowerCase() || 'all';
    } catch (_) {
      return 'all';
    }
  }

  function persistSelectedSiteId(value) {
    try {
      const normalized = String(value || 'all').trim().toLowerCase() || 'all';
      sessionStorage.setItem(ADMIN_SELECTED_THREAD_SITE_ID_KEY, normalized);

      const selectedSite = state.sites.find((site) => String(site.site_id) === String(normalized));
      const slug = String(selectedSite?.domain || selectedSite?.community || '').trim().toLowerCase();
      if (slug) {
        sessionStorage.setItem(ADMIN_SELECTED_SITE_KEY, slug);
      } else if (normalized === 'all' && !isForcedSingleSite) {
        sessionStorage.setItem(ADMIN_SELECTED_SITE_KEY, 'all');
      }
    } catch (_) {}
  }

  section.innerHTML = `
    <div class="threads-main-container">
      <div class="threads-toolbar">
        <div>
          <h2 class="threads-title">Threads Management</h2>
        </div>
        <div class="header-actions">
          <label class="site-filter" for="siteFilter">
            <select id="siteFilter" class="site-select">
              <option value="all">All Sites</option>
            </select>
          </label>
          <button class="btn-primary" type="button" data-action="create-thread">+ New Thread</button>
        </div>
      </div>

      <div class="threads-table-container">
        <div class="threads-list" aria-label="Admin threads list"></div>
        <div class="threads-state" hidden></div>
      </div>

      <div class="thread-modal" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="threadModalTitle">
          <form class="thread-form" novalidate>
            <button type="button" class="thread-form-close" data-action="close-modal" aria-label="Close">×</button>
            <div class="form-group">
              <label for="threadTitle">Title *</label>
              <input type="text" id="threadTitle" name="title" maxlength="160" required>
            </div>
            <div class="form-group">
              <label for="threadVenue">Venue *</label>
              <textarea id="threadVenue" name="venue" rows="3" maxlength="500" required></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="threadDate">Date *</label>
                <input type="date" id="threadDate" name="date" required>
              </div>
              <div class="form-group">
                <label for="threadSite">Site *</label>
                <select id="threadSite" name="site_id" required>
                  <option value="">Select Site</option>
                </select>
              </div>
            </div>
            <label class="checkbox-label" for="threadPinned">
              <input type="checkbox" id="threadPinned" name="is_pinned">
              Pin this thread
            </label>
            <div class="form-actions">
              <button type="button" class="btn-cancel" data-action="close-modal">Cancel</button>
              <button type="submit" class="btn-submit">Save Thread</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const threadsList = section.querySelector('.threads-list');
  const tableState = section.querySelector('.threads-state');
  const siteFilter = section.querySelector('#siteFilter');
  const modal = section.querySelector('.thread-modal');
  const form = section.querySelector('.thread-form');
  const submitBtn = section.querySelector('.btn-submit');

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatRelativeTime(dateString) {
    if (!dateString) return 'just now';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'just now';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  function getInitials(name) {
    const parts = String(name || 'Admin').trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'A';
  }

  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 2600);
  }

  function setTableState(message, visible = true) {
    tableState.textContent = message;
    tableState.hidden = !visible;
  }

  function renderSiteOptions() {
    const rows = isForcedSingleSite
      ? state.sites.filter((site) => String(site.domain || site.community || '').trim().toLowerCase() === forcedSiteSlug)
      : state.sites;
    const options = rows
      .map((site) => {
        const sid = site.id ?? site.site_id ?? site.siteId ?? '';
        return `<option value="${sid}">${escapeHtml(site.site_name)}</option>`;
      })
      .join('');

    siteFilter.innerHTML = `${isForcedSingleSite ? '' : '<option value="all">All Sites</option>'}${options}`;
    if (isForcedSingleSite) {
      const forcedSite = rows[0];
      if (forcedSite) state.selectedSite = String(forcedSite.site_id);
      if (!forcedSite) {
        siteFilter.innerHTML = `<option value="all">${escapeHtml(forcedSiteSlug.toUpperCase())}</option>`;
        state.selectedSite = 'all';
      }
      siteFilter.value = state.selectedSite;
      siteFilter.disabled = true;
    } else if (state.selectedSite && state.selectedSite !== 'all') {
      siteFilter.value = state.selectedSite;
    }

    const formSite = section.querySelector('#threadSite');
    formSite.innerHTML = `<option value="">Select Site</option>${options}`;
    if (isForcedSingleSite && state.selectedSite && state.selectedSite !== 'all') {
      formSite.value = state.selectedSite;
    }
  }

  function renderThreadsList() {
    if (state.isLoading) {
      threadsList.innerHTML = '';
      setTableState('Loading threads...');
      return;
    }

    if (!state.threads.length) {
      threadsList.innerHTML = '';
      setTableState('No threads found. Click "New Thread" to create one.');
      return;
    }

    setTableState('', false);
    threadsList.innerHTML = state.threads
      .map((thread) => {
        const id = Number(thread.id);
        const title = escapeHtml(thread.title || 'Untitled');
        const content = escapeHtml(thread.venue || '-');
        const author = escapeHtml(thread.author || 'Admin');
        const isPinned = Boolean(thread.is_pinned ?? thread.isPinned);
        const status = isPinned ? 'Pinned' : 'Published';

        return `
          <article class="thread-card">
            <div class="thread-card-header">
              <div class="thread-user-wrap">
                <div class="thread-avatar">${getInitials(author)}</div>
                <div class="thread-user-meta">
                  <strong class="thread-author">${author}</strong>
                  <span class="thread-time">${formatRelativeTime(thread.created_at)}</span>
                </div>
              </div>
              <span class="status-badge ${isPinned ? 'pinned' : 'normal'}">${status}</span>
            </div>

            <h4 class="thread-card-title">${title}</h4>
            <p class="thread-card-content">${content}</p>
            <div class="thread-card-date">${formatDate(thread.date)} • ${formatDateTime(thread.created_at)}</div>

            <div class="thread-card-actions">
              <button class="btn-edit" type="button" data-action="edit" data-id="${id}" data-site-id="${thread.site_id || ''}" data-community="${thread.community_type || thread.domain || ''}">Edit</button>
              <button class="btn-delete" type="button" data-action="delete" data-id="${id}" data-site-id="${thread.site_id || ''}" data-community="${thread.community_type || thread.domain || ''}">Delete</button>
            </div>
          </article>
        `;
      })
      .join('');

  }

  function openThreadModal(thread = null) {
    state.currentThread = thread;
    state.isEditMode = Boolean(thread);
    submitBtn.textContent = state.isEditMode ? 'Update Thread' : 'Create Thread';

    form.reset();

    const formSite = section.querySelector('#threadSite');
    if (thread) {
      section.querySelector('#threadTitle').value = thread.title || '';
      section.querySelector('#threadVenue').value = thread.venue || '';
      section.querySelector('#threadDate').value = formatDateInput(thread.date);
      section.querySelector('#threadPinned').checked = Boolean(thread.is_pinned ?? thread.isPinned);
      formSite.value = thread.site_id ? String(thread.site_id) : '';
    } else {
      formSite.value = state.selectedSite !== 'all' ? state.selectedSite : '';
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    section.querySelector('#threadTitle').focus();
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    state.currentThread = null;
    state.isEditMode = false;
    form.reset();
  }

  async function fetchSites() {
    try {
      const rows = await fetchAdminSites();
      const normalized = rows
        .map((row) => ({
          site_id: row.id ?? row.site_id,
          site_name: row.site_name,
          community: row.domain || row.community_type || row.site_name || '',
          domain: row.domain,
          status: row.status,
        }))
        .filter((row) => Number(row.site_id) > 0);
      state.sites = normalized;

      const storedSlug = String(sessionStorage.getItem(ADMIN_SELECTED_SITE_KEY) || '').trim().toLowerCase();
      if (isForcedSingleSite) {
        const forcedSite = state.sites.find((row) => String(row.domain || row.community || '').trim().toLowerCase() === forcedSiteSlug);
        if (forcedSite) state.selectedSite = String(forcedSite.site_id);
      } else if (!state.selectedSite || state.selectedSite === 'all' || Number.isNaN(Number(state.selectedSite))) {
        if (storedSlug && storedSlug !== 'all') {
          const bySlug = state.sites.find((row) => String(row.domain || row.community || '').trim().toLowerCase() === storedSlug);
          if (bySlug) state.selectedSite = String(bySlug.site_id);
        }
      }

      renderSiteOptions();
    } catch (error) {
      console.error('Error fetching sites:', error);
      showNotification('Failed to load sites', 'error');
    }
  }

  async function fetchThreads() {
    state.isLoading = true;
    renderThreadsList();

    try {
      let url = `${BASE_V1}/admin/threads`;
      const selectedSiteIdNum = Number.parseInt(state.selectedSite, 10);
      if (state.selectedSite !== 'all' && Number.isFinite(selectedSiteIdNum) && selectedSiteIdNum > 0) {
        const site = state.sites.find((item) => String(item.site_id) === String(state.selectedSite));
        const params = new URLSearchParams();
        params.set('site_id', String(selectedSiteIdNum));
        if (site?.community) params.set('community', String(site.community).toLowerCase());
        url = `${BASE_V1}/admin/threads?${params.toString()}`;
      }

      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fetched = Array.isArray(data.data) ? data.data : [];
      const sorted = [...fetched].sort((a, b) => {
        const pinA = Number(Boolean(a.is_pinned ?? a.isPinned));
        const pinB = Number(Boolean(b.is_pinned ?? b.isPinned));
        if (pinA !== pinB) return pinB - pinA;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      state.threads = sorted;
      state.localThreads = [...sorted];

    } catch (error) {
      console.error('Error fetching threads:', error);
      state.threads = [];
      state.localThreads = [];
      showNotification('Failed to load threads from server', 'error');
    } finally {
      state.isLoading = false;
      renderThreadsList();
    }
  }

  async function createThread(payload) {
    try {
      const res = await fetch(`${BASE_V1}/admin/threads`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      if (!data.success) {
        showNotification(data.message || 'Failed to create thread', 'error');
        return;
      }

      showNotification('Thread created successfully', 'success');
      closeModal();
      await fetchThreads();
    } catch (error) {
      console.error('Error creating thread:', error);
      showNotification('Failed to create thread on server', 'error');
    }
  }

  async function updateThread(id, payload) {
    try {
      const res = await fetch(`${BASE_V1}/admin/threads/${id}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      if (!data.success) {
        showNotification(data.message || 'Failed to update thread', 'error');
        return;
      }

      showNotification('Thread updated successfully', 'success');
      closeModal();
      await fetchThreads();
    } catch (error) {
      console.error('Error updating thread:', error);
      showNotification('Failed to update thread on server', 'error');
    }
  }

  function resolveCommunityForSiteId(siteId) {
    const site = state.sites.find((item) => String(item.site_id) === String(siteId));
    return String(site?.community || site?.domain || '').trim().toLowerCase();
  }

  async function removeThread(id, siteId) {
    const confirmed = window.confirm('Delete this thread permanently?');
    if (!confirmed) return;

    try {
      const params = new URLSearchParams();
      params.set('site_id', String(siteId));
      const community = resolveCommunityForSiteId(siteId);
      if (community) params.set('community', community);
      const res = await fetch(`${BASE_V1}/admin/threads/${id}?${params.toString()}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      if (!data.success) {
        showNotification(data.message || 'Failed to delete thread', 'error');
        return;
      }

      showNotification('Thread deleted', 'success');
      await fetchThreads();
    } catch (error) {
      console.error('Error deleting thread:', error);
      showNotification('Failed to delete thread on server', 'error');
    }
  }

  function validatePayload(payload) {
    if (!payload.title || !payload.venue || !payload.date || !payload.site_id) {
      showNotification('Please complete all required fields', 'error');
      return false;
    }

    if (Number.isNaN(payload.site_id)) {
      showNotification('Please select a valid site', 'error');
      return false;
    }

    return true;
  }

  section.addEventListener('click', async (event) => {
    const target = event.target;

    const actionButton = target.closest('[data-action]');
    if (!actionButton) return;

    const action = actionButton.dataset.action;

    if (action === 'create-thread') {
      openThreadModal();
      return;
    }

    if (action === 'close-modal') {
      closeModal();
      return;
    }

    if (action === 'edit') {
      const id = Number(actionButton.dataset.id);
      const siteId = Number(actionButton.dataset.siteId);
      const thread = state.threads.find((item) => Number(item.id) === id);
      if (thread) {
        if (!thread.site_id && !Number.isNaN(siteId)) thread.site_id = siteId;
        openThreadModal(thread);
      }
      return;
    }

    if (action === 'delete') {
      const id = Number(actionButton.dataset.id);
      const siteId = Number(actionButton.dataset.siteId);
      if (!Number.isNaN(id) && !Number.isNaN(siteId)) await removeThread(id, siteId);
      return;
    }
  });

  section.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  siteFilter.addEventListener('change', async (event) => {
    state.selectedSite = event.target.value;
    persistSelectedSiteId(state.selectedSite);
    await fetchThreads();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedSiteId = Number.parseInt(section.querySelector('#threadSite').value, 10);

    const payload = {
      title: section.querySelector('#threadTitle').value.trim(),
      venue: section.querySelector('#threadVenue').value.trim(),
      date: section.querySelector('#threadDate').value,
      site_id: selectedSiteId,
      community: resolveCommunityForSiteId(selectedSiteId),
      is_pinned: section.querySelector('#threadPinned').checked
    };

    if (!validatePayload(payload)) return;

    if (state.isEditMode && state.currentThread?.id) {
      await updateThread(state.currentThread.id, payload);
      return;
    }

    await createThread(payload);
  });

  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  state.selectedSite = getSelectedSiteId();
  (async () => {
    await fetchSites();
    await fetchThreads();
  })();

  return section;
}











