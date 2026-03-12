import {
  fetchAdminJsonWithFallback,
  fetchAdminSites,
  getAdminHeaders,
  getAdminToken,
  resolveAdminSiteFromPath,
} from './admin-sites.js';
import { formatAdminDate, formatAdminTime } from './admin-date.js';

const DASHBOARD_DEBUG = true;

const STAT_CARDS = [
  {
    title: 'Revenue',
    id: 'totalRevenue',
    accent: 'revenue',
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 18h16" />
        <path d="M7 15V9" />
        <path d="M12 15V6" />
        <path d="M17 15v-4" />
      </svg>
    `,
  },
  {
    title: 'Total Orders',
    id: 'totalOrders',
    accent: 'orders',
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 8h13l-1.5 7H9L7 4H4" />
        <circle cx="10" cy="18" r="1.5" />
        <circle cx="18" cy="18" r="1.5" />
      </svg>
    `,
  },
  {
    title: 'Total Posts',
    id: 'totalPosts',
    accent: 'posts',
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 3V7a2 2 0 0 1 2-2z" />
      </svg>
    `,
  },
  {
    title: 'Low Stock',
    id: 'lowStock',
    accent: 'stock',
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4z" />
        <path d="M12 12v5" />
        <path d="M12 8h.01" />
      </svg>
    `,
  },
  {
    title: 'New Orders Today',
    id: 'newOrdersToday',
    accent: 'today',
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3v3" />
        <path d="M17 3v3" />
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 11h8" />
        <path d="M12 8v6" />
      </svg>
    `,
  },
];

function dashboardDebug(label, payload) {
  if (!DASHBOARD_DEBUG) return;
  if (payload === undefined) {
    console.log(`[DASHBOARD DEBUG] ${label}`);
    return;
  }
  console.log(`[DASHBOARD DEBUG] ${label}`, payload);
}

function formatPeso(value) {
  return `\u20B1${Number(value || 0).toLocaleString()}`;
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
  let activeCommunityRequestId = 0;

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

  function formatRevenueRowDate(value) {
    const raw = String(value || '').trim();
    return formatAdminDate(raw, raw || '-');
  }

  function formatRevenueRowTime(dateValue, timeValue) {
    const rawTime = String(timeValue || '').trim();
    if (!rawTime || rawTime === '-') return '-';

    const combinedValue = dateValue ? `${dateValue} ${rawTime}` : rawTime;
    return formatAdminTime(combinedValue, rawTime);
  }

  // -----------------------------
  // 🔹 Helper Functions
  // -----------------------------
  
  async function fetchCommunityStats(communityKey, siteName = '', communityId = null, requestId = 0) {
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
      if (DASHBOARD_DEBUG) {
        params.debug = '1';
      }
      dashboardDebug('fetchCommunityStats:request', { communityKey, siteName, params });
      const data = await fetchAdminJsonWithFallback(
        'dashboard/stats',
        params,
        getAdminRequestOptions(),
      );
      if (requestId !== activeCommunityRequestId) return;
      communityStats = data;  // { all: {...}, music: {...}, gaming: {...}, ... }
      dashboardDebug('fetchCommunityStats:response', data);
      if (DASHBOARD_DEBUG && data?.__debug) {
        console.log('[DASHBOARD DEBUG] fetchCommunityStats:debug-json', JSON.stringify(data.__debug));
      }
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

  async function fetchRevenueData(communityKey, siteName = '', communityId = null, requestId = 0) {
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
      if (requestId !== activeCommunityRequestId) return;
      revenueData[communityKey] = Array.isArray(data)
        ? data.map((row) => ({
            orderId: row.order_id ? `#${row.order_id}` : '-',
            date: formatRevenueRowDate(row.date),
            time: formatRevenueRowTime(row.date, row.time || '-'),
            revenue: Number(row.revenue ?? row.total_amount ?? 0),
          }))
        : [];
      dashboardDebug('fetchRevenueData:rows', revenueData[communityKey]);
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      revenueData[communityKey] = [];
    }
  }

  function resolveStatsBucket(communityKey, communityId = null, siteName = '') {
    const byKey = communityStats?.[communityKey];
    if (byKey) return byKey;

    const numericId = Number(communityId || 0);
    if (numericId > 0 && communityStats?.[String(numericId)]) {
      return communityStats[String(numericId)];
    }

    const normalizedSiteName = String(siteName || '').trim().toLowerCase();
    if (normalizedSiteName && communityStats?.[normalizedSiteName]) {
      return communityStats[normalizedSiteName];
    }

    return communityStats?.all || {
      revenue: 0, orders: 0, posts: 0, lowStock: 0, newOrdersToday: 0
    };
  }

  function updateStatCards(communityKey, communityId = null, siteName = '') {
    const stats = resolveStatsBucket(communityKey, communityId, siteName);

    const ids = ['totalRevenue','totalOrders','totalPosts','lowStock','newOrdersToday'];
    const keys = ['revenue','orders','posts','lowStock','newOrdersToday'];

    ids.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        const value = Number(stats?.[keys[idx]] || 0);
        if (id === 'totalRevenue') {
          el.textContent = `₱${value.toLocaleString()}`;
        } else {
          el.textContent = String(value);
        }
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
    const requestId = ++activeCommunityRequestId;
    communityStats = {};
    updateStatCards('__clear__');
    // Clear old rows immediately when switching community
    revenueData[communityKey] = [];
    updateTableAndPagination();

    await fetchCommunityStats(communityKey, siteName, communityId, requestId);
    await fetchRevenueData(communityKey, siteName, communityId, requestId);
    if (requestId !== activeCommunityRequestId) return;
    updateStatCards(communityKey, communityId, siteName);
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

  updateStatCards = function updateStatCardsOverride(communityKey, communityId = null, siteName = '') {
    const stats = resolveStatsBucket(communityKey, communityId, siteName);
    const ids = ['totalRevenue', 'totalOrders', 'totalPosts', 'lowStock', 'newOrdersToday'];
    const keys = ['revenue', 'orders', 'posts', 'lowStock', 'newOrdersToday'];

    ids.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return;

      const value = Number(stats?.[keys[idx]] || 0);
      el.textContent = id === 'totalRevenue' ? formatPeso(value) : String(value);
    });
  };

  renderTableRows = function renderTableRowsOverride(page) {
    const currentData = revenueData[selectedCommunity] || [];
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return currentData.slice(start, end).map((row) => `
      <tr>
        <td style="padding:8px; text-align:center;">${row.orderId}</td>
        <td style="padding:8px;">${row.date}</td>
        <td style="padding:8px; text-align:center;">${row.time}</td>
        <td style="padding:8px; text-align:right;">${formatPeso(row.revenue)}</td>
      </tr>
    `).join('');
  };

  renderDashboardHTML = function renderDashboardHTMLOverride() {
    return `
      <div class="dashboard-wrapper">
        <div class="community-filter" style="margin-bottom:24px;">
          <label for="communitySelect" style="display:block; margin-bottom:8px; font-weight:600; color:#333;">Select Site</label>
          <select id="communitySelect" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; cursor:pointer; width:100%; max-width:300px;">
            ${renderCommunityOptionsHTML()}
          </select>
        </div>

        <div class="dashboard-grid" style="flex-wrap: wrap; gap: 18px;">
          ${STAT_CARDS.map((card) => `
            <div class="stat-card stat-card--${card.accent}">
              <div class="stat-icon">${card.icon}</div>
              <div class="stat-info">
                <h3>${card.title}</h3>
                <p class="stat-number" id="${card.id}">0</p>
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
  };

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




