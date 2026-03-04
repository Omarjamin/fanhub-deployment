import { api } from '../../../services/ecommerce_services/api.js';
import { fetchAdminSites, getAdminHeaders, getAdminToken } from './admin-sites.js';

export default function Dashboard() {
  const ADMIN_SELECTED_COMMUNITY_KEY = 'admin_selected_site';
  const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1/admin';
  const section = document.createElement('section');
  section.id = 'dashboard';
  section.className = 'content-section active';

  // Current selected site
  let selectedCommunity = 'all';
  let currentPage = 1;
  const rowsPerPage = 5;
  let communityOptions = [{ key: 'all', label: 'All Sites', siteName: 'all' }];
  let selectedSiteName = 'all';

  // Store fetched data
  let communityStats = {};
  let revenueData = {};

  function persistSelectedCommunity(value) {
    try {
      const normalized = String(value || 'all').trim().toLowerCase() || 'all';
      sessionStorage.setItem(ADMIN_SELECTED_COMMUNITY_KEY, normalized);
    } catch (_) {}
  }

  function getAdminRequestOptions() {
    return { headers: getAdminHeaders() };
  }

  function buildQuery(params = {}) {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
    return new URLSearchParams(
      entries.map(([key, value]) => [key, String(value)])
    ).toString();
  }

  function resolveAdminEndpointUrls(rawBase, endpointPath, params = {}) {
    const urls = [];
    const push = (value) => {
      const url = String(value || '').trim().replace(/\/+$/, '');
      if (!url) return;
      if (!urls.includes(url)) urls.push(url);
    };

    const cleanEndpointPath = String(endpointPath || '').trim().replace(/^\/+/, '');
    const query = buildQuery(params);
    const endpointWithQuery = query ? `${cleanEndpointPath}?${query}` : cleanEndpointPath;

    const trimmed = String(rawBase || '').trim().replace(/\/+$/, '');
    if (trimmed) {
      if (/\/v1\/admin$/i.test(trimmed)) {
        push(`${trimmed}/${endpointWithQuery}`);
      } else if (/\/admin$/i.test(trimmed)) {
        push(`${trimmed}/${endpointWithQuery}`);
        push(`${trimmed.replace(/\/admin$/i, '/v1/admin')}/${endpointWithQuery}`);
      } else if (/\/v1$/i.test(trimmed)) {
        push(`${trimmed}/admin/${endpointWithQuery}`);
      } else {
        push(`${trimmed}/admin/${endpointWithQuery}`);
        push(`${trimmed}/v1/admin/${endpointWithQuery}`);
      }
    }

    const apiOrigin = String(window.__API_ORIGIN__ || '').trim().replace(/\/+$/, '');
    if (apiOrigin) {
      push(`${apiOrigin}/v1/admin/${endpointWithQuery}`);
      push(`${apiOrigin}/admin/${endpointWithQuery}`);
    }

    push(`https://fanhub-deployment-production.up.railway.app/v1/admin/${endpointWithQuery}`);
    return urls;
  }

  async function fetchAdminJsonWithFallback(endpointPath, params = {}) {
    const requestOptions = getAdminRequestOptions();
    const candidateUrls = resolveAdminEndpointUrls(ADMIN_API_BASE, endpointPath, params);
    let response = null;
    let payload = {};
    let lastError = null;

    for (const candidateUrl of candidateUrls) {
      try {
        response = await api(candidateUrl, requestOptions);
        const rawText = await response.text().catch(() => '');
        payload = rawText ? JSON.parse(rawText) : {};
        if (response.status !== 404) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!response) {
      throw (lastError || new Error('Unable to reach admin dashboard endpoint.'));
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return payload;
  }

  // -----------------------------
  // 🔹 Helper Functions
  // -----------------------------
  
  async function fetchCommunityStats(communityKey, siteName = '') {
    try {
      const data = await fetchAdminJsonWithFallback('dashboard/stats', {
        community: communityKey,
        site_name: siteName || '',
      });
      communityStats = data;  // { all: {...}, music: {...}, gaming: {...}, ... }
    } catch (err) {
      console.error('Error fetching community stats:', err);
    }
  }

  async function fetchCommunityOptions() {
    try {
      const sites = await fetchAdminSites();
      const options = [{ key: 'all', label: 'All Sites', siteName: 'all' }];
      sites.forEach((site) => {
        options.push({
          key: site.domain,
          label: site.site_name,
          siteName: site.site_name,
        });
      });

      communityOptions = options.length
        ? options
        : [{ key: 'all', label: 'All Sites', siteName: 'all' }];
    } catch (err) {
      console.error('Error fetching communities from admin database:', err);
      communityOptions = [{ key: 'all', label: 'All Sites', siteName: 'all' }];
    }
  }

  async function fetchRevenueData(communityKey, siteName = '') {
    try {
      const data = await fetchAdminJsonWithFallback('dashboard/community', {
        community: communityKey,
        site_name: siteName || '',
      });
      revenueData[communityKey] = Array.isArray(data)
        ? data.map((row) => ({
            orderId: row.order_id ? `#${row.order_id}` : '-',
            date: row.date,
            time: row.time || '-',
            revenue: Number(row.revenue ?? row.total_amount ?? 0),
          }))
        : [];
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      revenueData[communityKey] = [];
    }
  }

  function updateStatCards(communityKey) {
    const stats = communityStats[communityKey] || {
      revenue: 0, orders: 0, posts: 0, lowStock: 0, newOrdersToday: 0
    };

    const ids = ['totalRevenue','totalOrders','totalPosts','lowStock','newOrdersToday'];
    const keys = ['revenue','orders','posts','lowStock','newOrdersToday'];

    ids.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = id === 'totalRevenue' ? `₱${stats[keys[idx]].toLocaleString()}` : stats[keys[idx]];
      }
    });
  }

  function renderTableRows(page) {
    const currentData = revenueData[selectedCommunity] || [];
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return currentData.slice(start, end).map(row =>
      `<tr>
        <td style="padding:8px; text-align:center;">${row.orderId}</td>
        <td style="padding:8px;">${row.date}</td>
        <td style="padding:8px; text-align:center;">${row.time}</td>
        <td style="padding:8px; text-align:right;">₱${row.revenue.toLocaleString()}</td>
      </tr>`
    ).join('');
  }

  function renderPagination(pageCount, currentPage) {
    let buttons = '';
    for (let i = 1; i <= pageCount; i++) {
      buttons += `<button class="revenue-pagination-btn" data-page="${i}" style="
        margin:0 4px; padding:4px 10px; border-radius:4px; border:1px solid #e5e7eb;
        background:${i===currentPage?'#ec4899':'#fff'}; color:${i===currentPage?'#fff':'#333'}; cursor:pointer;">
        ${i}</button>`;
    }
    return `<div style="text-align:center; margin-top:12px;">${buttons}</div>`;
  }

  function updateTableAndPagination() {
    const currentData = revenueData[selectedCommunity] || [];
    const pageCount = Math.ceil(currentData.length / rowsPerPage);
    const tbody = section.querySelector('tbody');
    const paginationDiv = section.querySelector('.pagination-container');

    if (tbody) tbody.innerHTML = renderTableRows(currentPage);
    if (paginationDiv) paginationDiv.innerHTML = renderPagination(pageCount, currentPage);
  }

  async function initCommunityData(communityKey, siteName = '') {
    // Clear old rows immediately when switching community
    revenueData[communityKey] = [];
    updateTableAndPagination();

    await fetchCommunityStats(communityKey, siteName);
    await fetchRevenueData(communityKey, siteName);
    updateStatCards(communityKey);
    updateTableAndPagination();
  }

  function renderCommunityOptionsHTML() {
    return communityOptions
      .map((community) => `<option value="${community.key}" data-site-name="${community.siteName || ''}">${community.label}</option>`)
      .join('');
  }

  // -----------------------------
  // 🔹 Render Dashboard HTML
  // -----------------------------
  function renderDashboardHTML() {
    return `
      <div class="dashboard-wrapper">
        <div class="community-filter" style="margin-bottom:24px;">
          <label for="communitySelect" style="display:block; margin-bottom:8px; font-weight:600; color:#333;">Select Site</label>
          <select id="communitySelect" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; cursor:pointer; width:100%; max-width:300px;">
            ${renderCommunityOptionsHTML()}
          </select>
        </div>

        <div class="dashboard-grid" style="flex-wrap: wrap; gap: 18px;">
          ${['Revenue','Total Orders','Total Posts','Low Stock','New Orders Today'].map((title, idx) => `
            <div class="stat-card">
              <div class="stat-icon"></div>
              <div class="stat-info">
                <h3>${title}</h3>
                <p class="stat-number" id="${['totalRevenue','totalOrders','totalPosts','lowStock','newOrdersToday'][idx]}">0</p>
                ${title==='Revenue'?'<span class="stat-change positive">+0% this month</span>':''}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="dashboard-middle" style="margin:40px 0 0 0;">
          <div class="table-container" style="background:#fff; border-radius:12px; box-shadow:0 2px 8px #0001; padding:24px; margin:0 auto;">
            <h3 style="color:#333; margin-bottom:18px;">Revenue Table (Daily)</h3>
            <table style="width:100%; border-collapse: collapse;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:8px; border-bottom:1px solid #e5e7eb; text-align:center;">Order ID</th>
                  <th style="padding:8px; border-bottom:1px solid #e5e7eb; text-align:left;">Date</th>
                  <th style="padding:8px; border-bottom:1px solid #e5e7eb; text-align:center;">Time</th>
                  <th style="padding:8px; border-bottom:1px solid #e5e7eb; text-align:right;">Revenue</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
            <div class="pagination-container"></div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    section.addEventListener('change', function(e) {
      if (e.target.id === 'communitySelect') {
        selectedCommunity = e.target.value;
        persistSelectedCommunity(selectedCommunity);
        const option = e.target.options?.[e.target.selectedIndex];
        selectedSiteName = option?.dataset?.siteName || '';
        currentPage = 1;
        initCommunityData(selectedCommunity, selectedSiteName);
      }
    });

    section.addEventListener('click', function(e) {
      if (e.target.classList.contains('revenue-pagination-btn')) {
        const page = parseInt(e.target.getAttribute('data-page'));
        if (!isNaN(page)) {
          currentPage = page;
          updateTableAndPagination();
        }
      }
    });
  }

  // -----------------------------
  // 🔹 Initialize Dashboard
  // -----------------------------
  (async () => {
    if (!getAdminToken()) {
      section.innerHTML = `
        <div class="dashboard-wrapper">
          <div class="table-container" style="background:#fff; border-radius:12px; box-shadow:0 2px 8px #0001; padding:24px; margin:0 auto;">
            <h3 style="color:#333; margin-bottom:8px;">Authentication Required</h3>
            <p style="color:#4b5563; margin:0;">Please login as admin to view dashboard site data.</p>
          </div>
        </div>
      `;
      return;
    }

    await fetchCommunityOptions();
    section.innerHTML = renderDashboardHTML();
    bindEvents();
    const select = section.querySelector('#communitySelect');
    if (select) {
      select.value = selectedCommunity;
      persistSelectedCommunity(selectedCommunity);
      const option = select.options?.[select.selectedIndex];
      selectedSiteName = option?.dataset?.siteName || '';
    }
    await initCommunityData(selectedCommunity, selectedSiteName);
  })();

  return section;
}



