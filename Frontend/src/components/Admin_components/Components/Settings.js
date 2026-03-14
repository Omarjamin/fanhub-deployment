import '../../../styles/Admin_styles/Settings.css';
import {
  fetchAdminJsonWithFallback,
  fetchAdminSites,
  getAdminApiBase,
  getAdminHeaders,
  resolveAdminEndpointUrls,
  resolveAdminSiteFromPath,
} from './admin-sites.js';
import { getActiveSiteSlug, getSessionToken } from '../../../lib/site-context.js';

const BASE_V1 = import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1';
const ADMIN_API_BASE = getAdminApiBase();
const API_KEY = import.meta.env.VITE_API_KEY || 'thread';

const DEFAULT_EVENT_POSTER_SLOTS = 3;
const BINI_EVENT_POSTER_SLOTS = 1;
const EVENT_POSTER_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" rx="18" fill="#f3f4f6"/><rect x="24" y="24" width="272" height="132" rx="14" fill="#e5e7eb"/><circle cx="110" cy="78" r="18" fill="#cbd5e1"/><path d="M54 138l48-42 30 24 38-36 60 54H54z" fill="#94a3b8"/><text x="160" y="90" fill="#6b7280" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">No poster yet</text></svg>',
)}`;

function createDefaultEventPoster(index) {
  const slotId = index + 1;
  return {
    id: String(slotId),
    event_id: null,
    title: `Event ${slotId}`,
    href: '',
    image: '',
  };
}

function getEventPosterSlotLimit(siteSlug = '') {
  return String(siteSlug || '').trim().toLowerCase() === 'bini'
    ? BINI_EVENT_POSTER_SLOTS
    : DEFAULT_EVENT_POSTER_SLOTS;
}

function getDefaultEventPosters(siteSlug = '') {
  return Array.from(
    { length: getEventPosterSlotLimit(siteSlug) },
    (_, index) => createDefaultEventPoster(index),
  );
}

function normalizeEventPoster(rawPoster = {}, index = 0) {
  const slotId = index + 1;
  const actualEventId = Number(rawPoster?.event_id || 0);
  const safeEventId = Number.isFinite(actualEventId) && actualEventId > 0
    ? actualEventId
    : null;

  return {
    id: String(slotId),
    event_id: safeEventId,
    title: String(rawPoster?.title || `Event ${slotId}`).trim() || `Event ${slotId}`,
    href: String(rawPoster?.href || rawPoster?.ticket_link || '').trim(),
    image: String(rawPoster?.image || rawPoster?.image_url || '').trim(),
  };
}

function buildEventPosterRows(savedRows = [], siteSlug = '') {
  const slotLimit = getEventPosterSlotLimit(siteSlug);
  const normalizedSavedRows = Array.isArray(savedRows) ? savedRows : [];
  const mergedRows = getDefaultEventPosters(siteSlug).map((row) => ({ ...row }));

  for (let index = 0; index < slotLimit; index += 1) {
    const savedRow = normalizedSavedRows[index];
    if (!savedRow) continue;
    mergedRows[index] = {
      ...mergedRows[index],
      ...normalizeEventPoster(savedRow, index),
    };
  }

  return mergedRows;
}

function getAuthHeaders() {
  const siteScopedToken = getSessionToken(getActiveSiteSlug());
  const token =
    siteScopedToken ||
    localStorage.getItem('adminAuthToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('adminAuthToken') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    '';

  const headers = {
    apikey: API_KEY,
    ...getAdminHeaders(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getUploadedImageUrl(payload = {}) {
  return (
    payload?.url ||
    payload?.data?.url ||
    payload?.secure_url ||
    payload?.data?.secure_url ||
    payload?.image_url ||
    payload?.data?.image_url ||
    null
  );
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file'));
    };
    image.src = objectUrl;
  });
}

function canvasToFile(canvas, type, quality, originalName) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to process image'));
          return;
        }

        const safeName = String(originalName || 'event-poster.jpg').replace(/\.[^.]+$/, '');
        resolve(
          new File([blob], `${safeName}.jpg`, {
            type,
            lastModified: Date.now(),
          }),
        );
      },
      type,
      quality,
    );
  });
}

async function prepareEventPosterImage(file) {
  if (!file) return null;
  if (!String(file.type || '').toLowerCase().startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const maxWidth = 1600;
  const maxHeight = 2000;
  const outputType = 'image/jpeg';
  const outputQuality = 0.88;
  const image = await loadImageElement(file);
  const widthRatio = maxWidth / image.width;
  const heightRatio = maxHeight / image.height;
  const resizeRatio = Math.min(1, widthRatio, heightRatio);
  const targetWidth = Math.max(1, Math.round(image.width * resizeRatio));
  const targetHeight = Math.max(1, Math.round(image.height * resizeRatio));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('Image processing is not supported in this browser.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const resizedFile = await canvasToFile(canvas, outputType, outputQuality, file.name);
  return {
    file: resizedFile,
    width: targetWidth,
    height: targetHeight,
    originalWidth: image.width,
    originalHeight: image.height,
  };
}

async function uploadImage(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('image_file', file);

  const res = await fetch(`${BASE_V1}/bini/cloudinary/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  const payload = await res.json().catch(() => ({}));
  const uploadedUrl = getUploadedImageUrl(payload);
  if (!res.ok || !uploadedUrl) {
    throw new Error(payload?.error || payload?.message || 'Image upload failed');
  }
  return uploadedUrl;
}

async function fetchShippingRegionOverrides() {
  const payload = await fetchAdminJsonWithFallback(
    'settings/shipping-regions',
    { community: 'global' },
    { headers: getAuthHeaders() },
  );
  return payload?.data || {};
}

async function saveShippingRegionOverrides(provinceRegions, shippingRates) {
  const candidateUrls = resolveAdminEndpointUrls(
    'settings/shipping-regions',
    {},
    ADMIN_API_BASE,
  );
  let response = null;
  let payload = {};
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          community: 'global',
          province_regions: provinceRegions,
          shipping_rates: shippingRates,
        }),
      });
      payload = await response.json().catch(() => ({}));
      if (response.status !== 404) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!response) throw (lastError || new Error('Failed to reach shipping settings endpoint.'));
  if (!response.ok) throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
  return payload;
}

async function fetchEventPosters(siteSlug = '', communityId = null) {
  const community = String(siteSlug || '').trim().toLowerCase();
  if (!community) return buildEventPosterRows([], community);

  const payload = await fetchAdminJsonWithFallback(
    'settings/event-posters',
    {
      community,
      ...(communityId && Number(communityId) > 0 ? { community_id: Number(communityId) } : {}),
    },
    { headers: getAuthHeaders() },
  );

  const saved = Array.isArray(payload?.data) ? payload.data : [];
  return buildEventPosterRows(saved, community);
}

async function saveEventPosters(siteSlug = '', posters = [], communityId = null) {
  const community = String(siteSlug || '').trim().toLowerCase();
  if (!community) throw new Error('Please select a site first.');

  const candidateUrls = resolveAdminEndpointUrls(
    'settings/event-posters',
    {},
    ADMIN_API_BASE,
  );
  let response = null;
  let payload = {};
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          community,
          ...(communityId && Number(communityId) > 0 ? { community_id: Number(communityId) } : {}),
          posters,
        }),
      });
      payload = await response.json().catch(() => ({}));
      if (response.status !== 404) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!response) throw (lastError || new Error('Failed to reach event poster endpoint.'));
  if (!response.ok) {
    throw new Error(payload?.details || payload?.error || payload?.message || `HTTP ${response.status}`);
  }
  return payload;
}

export default function createSettings() {
  const forcedSiteSlug = resolveAdminSiteFromPath();
  const isForcedSingleSite = Boolean(forcedSiteSlug);
  const section = document.createElement('section');
  section.id = 'settings';
  section.className = 'content-section active settings-page';

  const regionProvinceMap = {
    NCR: [
      'Caloocan', 'Las Pinas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila', 'Marikina', 'Muntinlupa',
      'Navotas', 'Paranaque', 'Pasay', 'Pasig', 'Quezon City', 'San Juan', 'Taguig', 'Valenzuela',
    ],
    CAR: ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'],
    'Region I': ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
    'Region II': ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
    'Region III': ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
    'Region IV-A': ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'],
    'Region IV-B': ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon'],
    'Region V': ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
    'Region VI': ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental'],
    'Region VII': ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor'],
    'Region VIII': ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'],
    'Region IX': ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'],
    'Region X': ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'],
    'Region XI': ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental'],
    'Region XII': ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'],
    'Region XIII': ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'],
    BARMM: ['Basilan', 'Lanao del Sur', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Sulu', 'Tawi-Tawi'],
  };

  const shippingCategoryDefaults = { Luzon: 95, VisMin: 120 };
  const provinceShippingCategory = {};
  const regionOptions = Object.keys(regionProvinceMap);
  let selectedSite = String(
    sessionStorage.getItem('admin_selected_site') || getActiveSiteSlug() || '',
  ).trim().toLowerCase();
  let selectedCommunityId = null;
  let eventPosters = buildEventPosterRows([], selectedSite);

  function eventRowsTemplate() {
    return eventPosters
      .map((event) => `
        <div class="event-poster-row" data-event-id="${event.id}">
          <button
            type="button"
            class="event-poster-preview-button event-replace-btn"
            data-event-id="${event.id}"
            aria-label="${event.image ? 'Change event poster' : 'Upload event poster'}"
          >
            <img class="event-poster-preview" src="${event.image || EVENT_POSTER_PLACEHOLDER}" alt="${event.title}">
            <span class="event-poster-preview-badge">${event.image ? 'Change Poster' : 'Upload Poster'}</span>
          </button>
          <div class="event-poster-meta">
            <strong>${event.title}</strong>
            <small>${event.image ? 'Poster and ticket link are saved per site in DB.' : 'This event slot is ready for poster upload and ticket link.'}</small>
            <div class="event-poster-actions">
              <input class="event-file-input" type="file" accept="image/*" data-event-id="${event.id}">
              <button type="button" class="btn btn-secondary event-replace-btn" data-event-id="${event.id}">${event.image ? 'Choose New Poster' : 'Choose Poster'}</button>
              <span class="event-poster-hint">Click the image or button to select a file.</span>
            </div>
            <label class="event-link-label">
              <span>Ticket Link</span>
              <input
                type="url"
                class="event-link-input"
                data-event-id="${event.id}"
                placeholder="https://..."
                value="${String(event.href || '').replace(/"/g, '&quot;')}"
              >
            </label>
            <p class="event-upload-status" data-status-id="${event.id}"></p>
          </div>
        </div>
      `)
      .join('');
  }

  section.innerHTML = `
    <div class="customizer-section others-section">
      <h3>Site Context</h3>
      <div class="customizer-item">
        <label for="settingsSiteSelect">Site</label>
        <select id="settingsSiteSelect">
          <option value="">All Sites</option>
        </select>
      </div>
    </div>

    <div class="customizer-grid">
      <div class="customizer-section others-section">
        <h3>Event Posters</h3>
        <p class="shipping-subtitle">Replace ecommerce event poster and ticket link (per selected site).</p>
        <div id="eventPosterManager" class="event-poster-manager">
          ${eventRowsTemplate()}
        </div>
      </div>

      <div class="customizer-section shipping-section">
        <h3>Shipping Configuration</h3>
        <p class="shipping-subtitle">Set Luzon and VisMin rates, then assign each province category.</p>
        <div class="customizer-item">
          <label for="shippingRegionSelect">Region</label>
          <select id="shippingRegionSelect">
            <option value="">Select Region</option>
            ${regionOptions.map((region) => `<option value="${region}">${region}</option>`).join('')}
          </select>
        </div>

        <div class="shipping-rate-inputs">
          <label class="shipping-rate-item">
            <span>Luzon Rate (PHP)</span>
            <input type="number" id="shippingRateLuzon" min="0" value="${shippingCategoryDefaults.Luzon}">
          </label>
          <label class="shipping-rate-item">
            <span>Visayas/Mindanao Rate (PHP)</span>
            <input type="number" id="shippingRateVisMin" min="0" value="${shippingCategoryDefaults.VisMin}">
          </label>
        </div>

        <div id="shippingProvinceWrapper" class="shipping-province-wrapper">
          <p class="shipping-empty">Select a region to show provinces.</p>
        </div>
      </div>
    </div>

    <div class="customizer-actions">
      <button class="btn btn-secondary" id="resetSettingsBtn">Reset to Default</button>
      <button class="btn btn-primary" id="saveSettingsBtn">Save Settings</button>
    </div>
  `;

  function setupButtons() {
    const resetBtn = section.querySelector('#resetSettingsBtn');
    const saveBtn = section.querySelector('#saveSettingsBtn');

    resetBtn.addEventListener('click', resetSettings);
    saveBtn.addEventListener('click', async () => {
      await saveSettings();
    });
  }

  async function refreshEventPosterManager() {
    const manager = section.querySelector('#eventPosterManager');
    if (!manager) return;
    manager.innerHTML = eventRowsTemplate();
    setupEventPosterManager();
  }

  async function loadSiteOptions() {
    try {
      const sites = await fetchAdminSites();
      const scopedSites = isForcedSingleSite
        ? sites.filter((site) => String(site.domain || '').trim().toLowerCase() === forcedSiteSlug)
        : sites;
      const select = section.querySelector('#settingsSiteSelect');
      if (!select) return;
      const persisted = String(sessionStorage.getItem('admin_selected_site') || '').trim().toLowerCase();
      const activeSite = String(getActiveSiteSlug() || '').trim().toLowerCase();
      select.innerHTML = `
        ${isForcedSingleSite ? '' : '<option value="">All Sites</option>'}
        ${scopedSites.map((site) => `<option value="${site.domain}" data-community-id="${site.community_id || site.id || ''}">${site.site_name}</option>`).join('')}
      `;
      if (isForcedSingleSite) {
        select.value = forcedSiteSlug;
        select.disabled = true;
      } else if (persisted) {
        select.value = persisted;
      } else if (activeSite) {
        select.value = activeSite;
      }
      selectedSite = String(select.value || '').trim().toLowerCase();
      const selectedOption = select.options?.[select.selectedIndex];
      selectedCommunityId = Number(selectedOption?.dataset?.communityId || 0) || null;
      eventPosters = await fetchEventPosters(selectedSite, selectedCommunityId);
      await refreshEventPosterManager();
    } catch (error) {
      console.error('[Settings] Failed to load site options:', error);
    }
  }

  function resetSettings() {
    section.querySelector('#shippingRateLuzon').value = shippingCategoryDefaults.Luzon;
    section.querySelector('#shippingRateVisMin').value = shippingCategoryDefaults.VisMin;
    section.querySelector('#shippingRegionSelect').value = '';
    section.querySelector('#shippingProvinceWrapper').innerHTML = `<p class="shipping-empty">Select a region to show provinces.</p>`;
    Object.keys(provinceShippingCategory).forEach((province) => delete provinceShippingCategory[province]);

    eventPosters = buildEventPosterRows([], selectedSite);
    refreshEventPosterManager();
  }

  async function saveSettings() {
    const saveBtn = section.querySelector('#saveSettingsBtn');
    if (saveBtn) saveBtn.disabled = true;
    const shippingRates = {
      Luzon: Number(section.querySelector('#shippingRateLuzon').value),
      VisMin: Number(section.querySelector('#shippingRateVisMin').value),
    };

    const provinceShipping = Object.entries(provinceShippingCategory).reduce((acc, [province, category]) => {
      acc[province] = { category, rate: shippingRates[category] };
      return acc;
    }, {});

    try {
      await saveShippingRegionOverrides(provinceShippingCategory, shippingRates);
      if (selectedSite) {
        await saveEventPosters(
          selectedSite,
          eventPosters.slice(0, getEventPosterSlotLimit(selectedSite)),
          selectedCommunityId,
        );
      }
      console.log('[Settings] Saved:', { selectedSite, shippingRates, provinceShipping, eventPosters });
      if (selectedSite) {
        alert('Settings saved successfully.');
      } else {
        alert('Shipping settings saved. Select a site to save event posters.');
      }
    } catch (error) {
      console.error('[Settings] Save failed:', error);
      alert(error?.message || 'Failed to save settings.');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function setupEventPosterManager() {
    const manager = section.querySelector('#eventPosterManager');
    if (!manager) return;

    manager.querySelectorAll('.event-replace-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eventId = btn.dataset.eventId;
        const fileInput = manager.querySelector(`.event-file-input[data-event-id="${eventId}"]`);
        fileInput?.click();
      });
    });

    manager.querySelectorAll('.event-file-input').forEach((input) => {
      input.addEventListener('change', async () => {
        const eventId = input.dataset.eventId;
        const status = manager.querySelector(`.event-upload-status[data-status-id="${eventId}"]`);
        const preview = manager.querySelector(`.event-poster-row[data-event-id="${eventId}"] .event-poster-preview`);
        const file = input.files?.[0];
        if (!file || !eventId) return;

        try {
          if (status) status.textContent = 'Resizing image...';
          const prepared = await prepareEventPosterImage(file);
          if (status) {
            status.textContent =
              prepared.originalWidth !== prepared.width || prepared.originalHeight !== prepared.height
                ? `Uploading resized image (${prepared.width}x${prepared.height})...`
                : 'Uploading image...';
          }
          const url = await uploadImage(prepared.file);
          const idx = eventPosters.findIndex((x) => x.id === eventId);
          if (idx >= 0) {
            eventPosters[idx] = { ...eventPosters[idx], image: url };
          }
          if (preview) preview.src = url;
          if (status) status.textContent = 'Poster uploaded successfully.';
        } catch (error) {
          if (status) status.textContent = `Upload failed: ${error.message || 'Unknown error'}`;
        } finally {
          input.value = '';
        }
      });
    });

    manager.querySelectorAll('.event-link-input').forEach((input) => {
      input.addEventListener('input', () => {
        const eventId = input.dataset.eventId;
        if (!eventId) return;
        const idx = eventPosters.findIndex((x) => x.id === eventId);
        if (idx >= 0) {
          eventPosters[idx] = { ...eventPosters[idx], href: String(input.value || '').trim() };
        }
      });
    });
  }

  function setupShippingManager() {
    const regionSelect = section.querySelector('#shippingRegionSelect');
    const provinceWrapper = section.querySelector('#shippingProvinceWrapper');
    const getDefaultCategory = (region) => {
      const luzonRegions = new Set(['NCR', 'CAR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region IV-B', 'Region V']);
      return luzonRegions.has(region) ? 'Luzon' : 'VisMin';
    };

    const renderProvinceList = (region) => {
      const provinces = regionProvinceMap[region] || [];
      if (!provinces.length) {
        provinceWrapper.innerHTML = `<p class="shipping-empty">Select a region to show provinces.</p>`;
        return;
      }

      provinceWrapper.innerHTML = `
        <div class="shipping-province-header"><strong>Provinces in ${region}</strong></div>
        <div class="shipping-province-list">
          ${provinces
            .map((province) => {
              const currentCategory = provinceShippingCategory[province] || getDefaultCategory(region);
              provinceShippingCategory[province] = currentCategory;
              return `
                <div class="shipping-province-row" data-province="${province}">
                  <span class="shipping-province-name">${province}</span>
                  <div class="shipping-category-buttons">
                    <button type="button" data-category="Luzon" class="shipping-category-btn ${currentCategory === 'Luzon' ? 'active' : ''}">Luzon</button>
                    <button type="button" data-category="VisMin" class="shipping-category-btn ${currentCategory === 'VisMin' ? 'active' : ''}">VisMin</button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    };

    regionSelect.addEventListener('change', () => renderProvinceList(regionSelect.value));

    provinceWrapper.addEventListener('click', (event) => {
      const categoryBtn = event.target.closest('.shipping-category-btn');
      if (!categoryBtn) return;
      const row = categoryBtn.closest('.shipping-province-row');
      if (!row) return;

      const province = row.dataset.province;
      const nextCategory = categoryBtn.dataset.category;
      provinceShippingCategory[province] = nextCategory;

      row.querySelectorAll('.shipping-category-btn').forEach((button) => {
        button.classList.toggle('active', button === categoryBtn);
      });
    });

    return { renderProvinceList };
  }

  setupButtons();
  setupEventPosterManager();
  const shippingManager = setupShippingManager();

  section.querySelector('#settingsSiteSelect')?.addEventListener('change', async (event) => {
    selectedSite = isForcedSingleSite
      ? forcedSiteSlug
      : String(event.target.value || '').trim().toLowerCase();
    const selectedOption = event.target.options?.[event.target.selectedIndex];
    selectedCommunityId = Number(selectedOption?.dataset?.communityId || 0) || null;
    try {
      sessionStorage.setItem('admin_selected_site', selectedSite || 'all');
    } catch (_) {}
    Object.keys(provinceShippingCategory).forEach((province) => delete provinceShippingCategory[province]);
    if (!selectedSite) {
      section.querySelector('#shippingProvinceWrapper').innerHTML = `<p class="shipping-empty">Select a region to show provinces.</p>`;
      eventPosters = buildEventPosterRows([], selectedSite);
      await refreshEventPosterManager();
      return;
    }

    try {
      const settingsPayload = await fetchShippingRegionOverrides();
      const savedMap = settingsPayload?.province_regions || {};
      const savedRates = settingsPayload?.shipping_rates || {};
      Object.entries(savedMap || {}).forEach(([province, category]) => {
        provinceShippingCategory[String(province).trim()] = String(category).trim();
      });
      const luzonRate = Number(savedRates?.Luzon);
      const visMinRate = Number(savedRates?.VisMin);
      if (Number.isFinite(luzonRate) && luzonRate >= 0) {
        section.querySelector('#shippingRateLuzon').value = String(luzonRate);
      }
      if (Number.isFinite(visMinRate) && visMinRate >= 0) {
        section.querySelector('#shippingRateVisMin').value = String(visMinRate);
      }

      eventPosters = await fetchEventPosters(selectedSite, selectedCommunityId);
      await refreshEventPosterManager();

      const activeRegion = section.querySelector('#shippingRegionSelect')?.value;
      if (activeRegion) {
        shippingManager.renderProvinceList(activeRegion);
      }
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
    }
  });

  loadSiteOptions().then(async () => {
    try {
      const settingsPayload = await fetchShippingRegionOverrides();
      const savedMap = settingsPayload?.province_regions || {};
      const savedRates = settingsPayload?.shipping_rates || {};
      Object.entries(savedMap || {}).forEach(([province, category]) => {
        provinceShippingCategory[String(province).trim()] = String(category).trim();
      });
      const luzonRate = Number(savedRates?.Luzon);
      const visMinRate = Number(savedRates?.VisMin);
      if (Number.isFinite(luzonRate) && luzonRate >= 0) {
        section.querySelector('#shippingRateLuzon').value = String(luzonRate);
      }
      if (Number.isFinite(visMinRate) && visMinRate >= 0) {
        section.querySelector('#shippingRateVisMin').value = String(visMinRate);
      }
    } catch (error) {
      console.error('[Settings] Failed to load initial shipping overrides:', error);
    }
  });

  return section;
}



