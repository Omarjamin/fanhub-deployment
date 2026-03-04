import {
  fetchAdminJsonWithFallback,
  fetchAdminSites,
  getAdminHeaders,
  getAdminToken,
  resolveAdminSiteFromPath,
} from './admin-sites.js';

const DASHBOARD_DEBUG = true;

function dashboardDebug(label, payload) {
  if (!DASHBOARD_DEBUG) return;
  if (payload === undefined) {
    console.log(`[DASHBOARD DEBUG] ${label}`);
    return;
  }
  console.log(`[DASHBOARD DEBUG] ${label}`, payload);
}

export default function Dashboard() {
  const ADMIN_SELECTED_COMMUNITY_KEY = 'admin_selected_site';
  const section = document.createElement('section');
  section.id = 'dashboard';
  section.className = 'content-section active';
  const forcedSiteSlug = resolveAdminSiteFromPath();
  const isForcedSingleSite = Boolean(forcedSiteSlug);

  // Current selected site
  let selectedCommunity = isForcedSingleSite
    ? forcedSiteSlug
    : String(sessionStorage.getItem(ADMIN_SELECTED_COMMUNITY_KEY) || 'all').trim().toLowerCase() || 'all';
  let currentPage = 1;
  const rowsPerPage = 5;
  let communityOptions = [{ key: 'all', label: 'All Sites', siteName: 'all' }];
  let selectedSiteName = 'all';
  let selectedCommunityId = null;

  // Store fetched data
  let communityStats = {};
  let revenueData = {};

  function persistSelectedCommunity(value) {
    try {
      const normalized = String(value || 'all').trim().toLowerCase() || 'all';
      const finalValue = isForcedSingleSite ? forcedSiteSlug : normalized;
      sessionStorage.setItem(ADMIN_SELECTED_COMMUNITY_KEY, finalValue);
    } catch (_) {}
  }

  function getAdminRequestOptions() {
    return { headers: getAdminHeaders() };
  }

  // -----------------------------
  // 🔹 Helper Functions
  // -----------------------------
  
  async function fetchCommunityStats(communityKey, siteName = '', communityId = null) {
    try {
      const finalCommunity = isForcedSingleSite ? forcedSiteSlug : communityKey;
      const params = { community: finalCommunity };
      if (communityId && Number(communityId) > 0) {
        params.community_id = Number(communityId);
      }
      const normalizedSiteName = String(siteName || '').trim();
      // Only pass site_name in "all" mode to avoid over-filtering when
      // community_table.site_name differs from sites.site_name in deployed DBs.
      if (finalCommunity === 'all' && normalizedSiteName && normalizedSiteName.toLowerCase() !== 'all') {
        params.site_name = normalizedSiteName;
      }
      dashboardDebug('fetchCommunityStats:request', { communityKey, siteName, params });
      const data = await fetchAdminJsonWithFallback(
        'dashboard/stats',
        params,
        getAdminRequestOptions(),
      );
      communityStats = data;  // { all: {...}, music: {...}, gaming: {...}, ... }
      dashboardDebug('fetchCommunityStats:response', data);
    } catch (err) {
      console.error('Error fetching community stats:', err);
    }
  }

  async function fetchCommunityOptions() {
    try {
      const sites = await fetchAdminSites();
      dashboardDebug('fetchCommunityOptions:sites', sites);
      const options = isForcedSingleSite
        ? []
        : [{ key: 'all', label: 'All Sites', siteName: 'all' }];
      sites.forEach((site) => {
        const key = String(site.domain || '').trim().toLowerCase();
        if (!key) return;
        if (isForcedSingleSite && key !== forcedSiteSlug) return;
        options.push({
          key,
          label: site.site_name,
          siteName: site.site_name,
          communityId: Number(site.community_id || site.id || 0) || null,
        });
      });

      if (isForcedSingleSite && !options.length) {
        options.push({
          key: forcedSiteSlug,
          label: forcedSiteSlug.toUpperCase(),
          siteName: forcedSiteSlug,
        });
      }

      communityOptions = options.length
        ? options
        : [{ key: 'all', label: 'All Sites', siteName: 'all' }];
      dashboardDebug('fetchCommunityOptions:options', communityOptions);
    } catch (err) {
      console.error('Error fetching communities from admin database:', err);
      communityOptions = isForcedSingleSite
        ? [{ key: forcedSiteSlug, label: forcedSiteSlug.toUpperCase(), siteName: forcedSiteSlug }]
        : [{ key: 'all', label: 'All Sites', siteName: 'all' }];
    }
  }

  async function fetchRevenueData(communityKey, siteName = '', communityId = null) {
    try {
      const finalCommunity = isForcedSingleSite ? forcedSiteSlug : communityKey;
      const params = { community: finalCommunity };
      if (communityId && Number(communityId) > 0) {
        params.community_id = Number(communityId);
      }
      const normalizedSiteName = String(siteName || '').trim();
      if (finalCommunity === 'all' && normalizedSiteName && normalizedSiteName.toLowerCase() !== 'all') {
        params.site_name = normalizedSiteName;
      }
      dashboardDebug('fetchRevenueData:request', { communityKey, siteName, params });
      const data = await fetchAdminJsonWithFallback(
        'dashboard/community',
        params,
        getAdminRequestOptions(),
      );
      revenueData[communityKey] = Array.isArray(data)
        ? data.map((row) => ({
            orderId: row.order_id ? `#${row.order_id}` : '-',
            date: row.date,
            time: row.time || '-',
            revenue: Number(row.revenue ?? row.total_amount ?? 0),
          }))
        : [];
      dashboardDebug('fetchRevenueData:rows', revenueData[communityKey]);
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

  async function initCommunityData(communityKey, siteName = '', communityId = null) {
    dashboardDebug('initCommunityData:start', { communityKey, siteName, communityId });
    // Clear old rows immediately when switching community
    revenueData[communityKey] = [];
    updateTableAndPagination();

    await fetchCommunityStats(communityKey, siteName, communityId);
    await fetchRevenueData(communityKey, siteName, communityId);
    updateStatCards(communityKey);
    updateTableAndPagination();
    dashboardDebug('initCommunityData:done', {
      selectedCommunity: communityKey,
      selectedSiteName: siteName,
      stats: communityStats?.[communityKey] || communityStats?.all || {},
      revenueCount: (revenueData?.[communityKey] || []).length,
    });
  }

  function renderCommunityOptionsHTML() {
    return communityOptions
      .map((community) => `<option value="${community.key}" data-site-name="${community.siteName || ''}" data-community-id="${community.communityId || ''}">${community.label}</option>`)
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
        selectedCommunity = isForcedSingleSite ? forcedSiteSlug : e.target.value;
        persistSelectedCommunity(selectedCommunity);
        const option = e.target.options?.[e.target.selectedIndex];
        selectedSiteName = option?.dataset?.siteName || '';
        selectedCommunityId = Number(option?.dataset?.communityId || 0) || null;
        dashboardDebug('communitySelect:change', {
          selectedCommunity,
          selectedSiteName,
          selectedCommunityId,
          optionValue: option?.value,
          optionLabel: option?.textContent,
        });
        currentPage = 1;
        initCommunityData(selectedCommunity, selectedSiteName, selectedCommunityId);
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
    dashboardDebug('bootstrap:start', {
      forcedSiteSlug,
      isForcedSingleSite,
      selectedCommunity,
    });
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
      if (isForcedSingleSite) selectedCommunity = forcedSiteSlug;
      const exists = Array.from(select.options || []).some((opt) => opt.value === selectedCommunity);
      if (!exists) {
        selectedCommunity = select.options?.[0]?.value || (isForcedSingleSite ? forcedSiteSlug : 'all');
      }
      select.value = selectedCommunity;
      persistSelectedCommunity(selectedCommunity);
      const option = select.options?.[select.selectedIndex];
      selectedSiteName = option?.dataset?.siteName || '';
      selectedCommunityId = Number(option?.dataset?.communityId || 0) || null;
    }
    await initCommunityData(selectedCommunity, selectedSiteName, selectedCommunityId);
    dashboardDebug('bootstrap:done', {
      selectedCommunity,
      selectedSiteName,
      selectedCommunityId,
    });
  })();

  return section;
}



