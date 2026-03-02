import '../../../styles/Admin_styles/Settings.css';
import { fetchAdminSites } from './admin-sites.js';

const BASE_V1 = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';
const API_KEY = import.meta.env.VITE_API_KEY || 'thread';

const defaultEventPosters = [];

function getAuthHeaders() {
  const token =
    localStorage.getItem('adminAuthToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('adminAuthToken') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    '';

  return {
    apikey: API_KEY,
    Authorization: `Bearer ${token}`,
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
  if (!res.ok || !payload?.url) {
    throw new Error(payload?.message || 'Image upload failed');
  }
  return payload.url;
}

async function fetchShippingRegionOverrides() {
  const res = await fetch(
    `${BASE_V1}/admin/settings/shipping-regions?community=global`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
  }
  return payload?.data || {};
}

async function saveShippingRegionOverrides(provinceRegions, shippingRates) {
  const res = await fetch(`${BASE_V1}/admin/settings/shipping-regions`, {
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
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
  }
  return payload;
}

async function fetchEventPosters(siteSlug = '') {
  const community = String(siteSlug || '').trim().toLowerCase();
  if (!community) return [...defaultEventPosters];

  const res = await fetch(
    `${BASE_V1}/admin/settings/event-posters?community=${encodeURIComponent(community)}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
  }

  const saved = Array.isArray(payload?.data) ? payload.data : [];
  if (!saved.length) return [...defaultEventPosters];
  if (!defaultEventPosters.length) return saved;

  return defaultEventPosters.map((event) => {
    const found = saved.find((x) => String(x?.id || '').toLowerCase() === String(event.id).toLowerCase());
    return found ? { ...event, ...found } : event;
  });
}

async function saveEventPosters(siteSlug = '', posters = []) {
  const community = String(siteSlug || '').trim().toLowerCase();
  if (!community) throw new Error('Please select a site first.');

  const res = await fetch(`${BASE_V1}/admin/settings/event-posters`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      community,
      posters,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
  }
  return payload;
}

export default function createSettings() {
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
  let selectedSite = String(sessionStorage.getItem('admin_selected_site') || '').trim().toLowerCase();
  let eventPosters = [...defaultEventPosters];

  function eventRowsTemplate() {
    return eventPosters
      .map((event) => `
        <div class="event-poster-row" data-event-id="${event.id}">
          <img class="event-poster-preview" src="${event.image}" alt="${event.title}">
          <div class="event-poster-meta">
            <strong>${event.title}</strong>
            <small>Poster and ticket link are saved per site in DB.</small>
            <div class="event-poster-actions">
              <input class="event-file-input" type="file" accept="image/*" data-event-id="${event.id}">
              <button type="button" class="btn btn-secondary event-replace-btn" data-event-id="${event.id}">Replace Poster</button>
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
      const select = section.querySelector('#settingsSiteSelect');
      if (!select) return;
      const persisted = String(sessionStorage.getItem('admin_selected_site') || '').trim().toLowerCase();
      select.innerHTML = `
        <option value="">All Sites</option>
        ${sites.map((site) => `<option value="${site.domain}">${site.site_name}</option>`).join('')}
      `;
      if (persisted) select.value = persisted;
      selectedSite = String(select.value || '').trim().toLowerCase();
      eventPosters = await fetchEventPosters(selectedSite);
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

    eventPosters = [...defaultEventPosters];
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
      await saveEventPosters(selectedSite, eventPosters);
      console.log('[Settings] Saved:', { selectedSite, shippingRates, provinceShipping, eventPosters });
      alert('Settings saved successfully.');
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
          if (status) status.textContent = 'Uploading...';
          const url = await uploadImage(file);
          const idx = eventPosters.findIndex((x) => x.id === eventId);
          if (idx >= 0) {
            eventPosters[idx] = { ...eventPosters[idx], image: url };
          }
          if (preview) preview.src = url;
          if (status) status.textContent = 'Poster replaced successfully.';
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
    selectedSite = String(event.target.value || '').trim().toLowerCase();
    Object.keys(provinceShippingCategory).forEach((province) => delete provinceShippingCategory[province]);
    if (!selectedSite) {
      section.querySelector('#shippingProvinceWrapper').innerHTML = `<p class="shipping-empty">Select a region to show provinces.</p>`;
      eventPosters = [...defaultEventPosters];
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

      eventPosters = await fetchEventPosters(selectedSite);
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
