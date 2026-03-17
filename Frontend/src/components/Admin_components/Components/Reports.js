import '../../../styles/Admin_styles/Reports.css';
import { getAdminHeaders } from './admin-sites.js';
import { formatAdminDate, formatAdminTime } from './admin-date.js';
import { showToast } from '../../../utils/toast.js';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1').trim().replace(/\/$/, '');
const API_KEY = (import.meta.env.VITE_API_KEY || 'thread').trim() || 'thread';
const WARNING_CATEGORIES = [
  {
    value: 'spam',
    label: 'Spam / Fake Links',
    template: 'Warning: You were reported for spam or fake links. Please stop this behavior immediately to avoid account suspension.',
  },
  {
    value: 'harassment',
    label: 'Harassment',
    template: 'Warning: You were reported for harassment. Please keep conversations respectful. Further violations may lead to suspension.',
  },
  {
    value: 'misleading',
    label: 'Misleading Information',
    template: 'Warning: You were reported for misleading information. Please avoid sharing unverified or deceptive content.',
  },
  {
    value: 'inappropriate',
    label: 'Inappropriate Content',
    template: 'Warning: You were reported for inappropriate content. Please follow community standards to avoid account sanctions.',
  },
  {
    value: 'general',
    label: 'General Warning',
    template: 'Warning: We received reports about your activity. Please follow community rules. Repeated violations may result in suspension.',
  },
];

export default function ReportsComponent() {
  const section = document.createElement('section');
  section.id = 'reports';
  section.className = 'content-section active';

  section.innerHTML = `
    <div class="dashboard-wrapper">
      <div class="reports-header">
        <h2>Report Management</h2>
      </div>

      <div class="reports-filters">
        <input type="text" class="search-reports" placeholder="Search reported users..." id="searchReports">
        <select class="status-filter" id="statusFilter">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div class="table-container">
        <div id="loadingSpinner" class="loading-spinner">Loading reports...</div>
        <table class="reports-table" id="reportsTable" style="display: none;">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Number of Times Reported</th>
              <th>Reported User</th>
              <th>Reported By</th>
              <th>Email</th>
              <th>Site</th>
              <th>Reason Category</th>
              <th>Status</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="reportsTableBody"></tbody>
        </table>
        <div id="errorMessage" class="error-message" style="display: none;"></div>
      </div>
    </div>
  `;

  initializeReports(section);
  return section;
}

let reportsData = [];
let filteredData = [];
let routeScopedData = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseReportMeta(report = {}) {
  const raw = String(report?.admin_notes || '').trim();
  const marker = 'REPORT_META:';
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) return {};
  const nextLineIndex = raw.indexOf('\n', markerIndex);
  const jsonSlice = raw.slice(markerIndex + marker.length, nextLineIndex === -1 ? raw.length : nextLineIndex).trim();
  try {
    return JSON.parse(jsonSlice);
  } catch (_) {
    return {};
  }
}

function getReportCategory(report = {}) {
  const meta = parseReportMeta(report);
  return String(
    report?.category ||
    report?.report_category ||
    meta?.category ||
    report?.reason ||
    '',
  ).trim();
}

function getReportReasonText(report = {}) {
  const meta = parseReportMeta(report);
  return String(
    report?.report_reason ||
    report?.details ||
    report?.description ||
    meta?.reason ||
    '',
  ).trim();
}

function getReportProofUrl(report = {}) {
  const meta = parseReportMeta(report);
  return String(
    report?.image_url ||
    report?.proof_url ||
    report?.evidence_url ||
    report?.proof_image_url ||
    meta?.image_url ||
    meta?.proof_url ||
    '',
  ).trim();
}

function getReasonLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'N/A';
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildApiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function getAuthHeaders() {
  return {
    ...getAdminHeaders(),
    'Content-Type': 'application/json'
  };
}

async function requestJson(path, options = {}) {
  const requestOptions = {
    method: options.method || 'GET',
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    },
    body: options.body
  };

  const url = buildApiUrl(path); // e.g. https://fanhub-deployment-production.up.railway.app/v1/admin/...
  const response = await fetch(url, requestOptions);

  const contentType = response.headers.get('content-type') || '';
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || payload.message || `HTTP error! status: ${response.status}`);
  }

  // Guard against accidental HTML/non-API responses (usually wrong base URL/proxy).
  if (!contentType.includes('application/json')) {
    throw new Error(`Invalid API response content-type "${contentType}" from ${url}`);
  }

  if (payload.success === false) {
    throw new Error(payload.error || payload.message || 'Request failed');
  }

  return payload;
}

async function initializeReports(section) {
  try {
    await fetchReports();
    setupEventListeners(section);
  } catch (error) {
    console.error('Error initializing reports:', error);
    showError('Failed to initialize reports');
  }
}

async function fetchReports() {
  try {
    showLoading(true);

    // Use existing admin routes and keep partial data when one call fails.
    const [userResult, postResult] = await Promise.allSettled([
      requestJson('/admin/reports/users/reported'),
      requestJson('/admin/reports/posts/reported')
    ]);

    let userPayload = userResult.status === 'fulfilled' ? userResult.value : {};
    let postPayload = postResult.status === 'fulfilled' ? postResult.value : {};

    if (userResult.status === 'rejected') {
      console.warn('[Reports] users/reported request failed:', userResult.reason?.message || userResult.reason);
    }
    if (postResult.status === 'rejected') {
      console.warn('[Reports] posts/reported request failed:', postResult.reason?.message || postResult.reason);
    }
    if (userResult.status === 'rejected' && postResult.status === 'rejected') {
      throw new Error(
        `Reports API failed. users: ${userResult.reason?.message || 'unknown'} | posts: ${postResult.reason?.message || 'unknown'}`
      );
    }

    // Debug: log raw payloads for easier troubleshooting
    console.debug('[Reports] userPayload:', userPayload);
    console.debug('[Reports] postPayload:', postPayload);

    let userRows = extractRows(userPayload);
    let postRows = extractRows(postPayload);

    // Fallback to existing bini routes only when both admin payloads are empty.
    if (userRows.length === 0 && postRows.length === 0) {
      console.warn('[Reports] Admin report endpoints returned empty. Trying bini fallback routes...');
      const [userFallbackResult, postFallbackResult] = await Promise.allSettled([
        requestJson('/bini/message/reports/all'),
        requestJson('/bini/posts/reports/all')
      ]);

      userPayload = userFallbackResult.status === 'fulfilled' ? userFallbackResult.value : userPayload;
      postPayload = postFallbackResult.status === 'fulfilled' ? postFallbackResult.value : postPayload;

      if (userFallbackResult.status === 'rejected') {
        console.warn('[Reports] bini user fallback failed:', userFallbackResult.reason?.message || userFallbackResult.reason);
      }
      if (postFallbackResult.status === 'rejected') {
        console.warn('[Reports] bini post fallback failed:', postFallbackResult.reason?.message || postFallbackResult.reason);
      }

      userRows = extractRows(userPayload);
      postRows = extractRows(postPayload);
    }

    if (userRows.length === 0 && postRows.length === 0) {
      console.warn('[Reports] No reports returned from backend (both users and posts empty) after fallback');
    }
    console.debug('[Reports] extracted rows -> users:', userRows.length, 'posts:', postRows.length);

    const userReports = userRows.map((report) => ({
      ...report,
      reasons: report.reason || '',
      status: normalizeReportStatus(report.status),
      report_source: 'message'
    }));

    const postReports = postRows.map((report) => ({
      ...report,
      reasons: report.reason || '',
      status: normalizeReportStatus(report.status),
      report_source: 'post'
    }));

    reportsData = sortByLatestReportDesc(
      annotateReportAttempts(
        dedupeReportsById([...userReports, ...postReports])
      )
    );
    routeScopedData = applyRouteFilter([...reportsData]);
    filteredData = [...routeScopedData];
    applyFilters();
    renderReportsTable();
  } catch (error) {
    console.error('Error fetching reports:', error);
    showError('Failed to fetch reports: ' + error.message);
  } finally {
    showLoading(false);
  }
}

function applyRouteFilter(rows) {
  const params = new URLSearchParams(window.location.search || '');
  const source = (params.get('source') || '').toLowerCase();
  const userId = params.get('userId');
  const postId = params.get('postId');

  let scoped = [...rows];
  if (source === 'post' || source === 'message') {
    scoped = scoped.filter((row) => String(row.report_source || '').toLowerCase() === source);
  }
  if (userId) {
    scoped = scoped.filter((row) => String(row.user_id ?? row.reported_user_id ?? '') === String(userId));
  }
  if (postId) {
    scoped = scoped.filter((row) => String(row.post_id ?? '') === String(postId));
  }
  return sortByLatestReportDesc(scoped);
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.data)) {
    return payload.data.data;
  }
  if (Array.isArray(payload.rows)) return payload.rows;
  if (payload.result && Array.isArray(payload.result.data)) return payload.result.data;
  return [];
}

function dedupeReportsById(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    const source = String(row?.report_source || '').trim().toLowerCase();
    const reportId = String(row?.report_id || '').trim();
    const fallbackEntity = source === 'post'
      ? String(row?.post_id || '')
      : String(row?.message_id || row?.user_id || row?.reported_user_id || '');
    const key = reportId
      ? `${source}::${reportId}`
      : `${source}::${fallbackEntity}::${String(row?.created_at || '')}`;
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, row);
      continue;
    }
    const prevTime = new Date(prev?.created_at || prev?.latest_report || 0).getTime() || 0;
    const nextTime = new Date(row?.created_at || row?.latest_report || 0).getTime() || 0;
    if (nextTime >= prevTime) byId.set(key, row);
  }
  return Array.from(byId.values());
}

function normalizeReportStatus(rawStatus) {
  const status = String(rawStatus || 'pending').toLowerCase();
  if (status === 'pending') return 'pending';
  if (status === 'dismissed') return 'closed';
  if (['reviewed', 'resolved'].includes(status)) return 'resolved';
  return 'pending';
}

function isDeletedPostReport(report = {}) {
  const rawContent = String(report?.post_content ?? report?.content ?? '').trim();
  return !rawContent || rawContent === '[Post already deleted]';
}

function getDisplayStatus(report = {}) {
  const normalized = normalizeReportStatus(report?.status);
  if (String(report?.report_source || '').toLowerCase() === 'post' && isDeletedPostReport(report)) {
    return 'closed';
  }
  return normalized;
}

function getStatusLabel(report = {}) {
  const status = getDisplayStatus(report);
  return String(status || 'pending').replace(/^\w/, (match) => match.toUpperCase());
}

function getStatusBadgeClass(report = {}) {
  return getDisplayStatus(report) === 'pending' ? 'badge-pending' : 'badge-resolved';
}

function getReportCommunityKey(report = {}) {
  const numeric = Number(report?.community_id || 0);
  if (Number.isFinite(numeric) && numeric > 0) return String(numeric);
  return String(
    report?.community_type ||
    report?.domain ||
    report?.site_name ||
    report?.community_name ||
    '',
  ).trim().toLowerCase();
}

function getReasonTokens(report) {
  const raw =
    report?.reasons ??
    report?.reason ??
    report?.report_reasons ??
    report?.report_reason ??
    report?.latest_reason ??
    '';

  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }

  return String(raw).split(',').map((x) => x.trim()).filter(Boolean);
}

function sortByLatestReportDesc(rows) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a?.created_at || a?.latest_report || 0).getTime() || 0;
    const bTime = new Date(b?.created_at || b?.latest_report || 0).getTime() || 0;
    return bTime - aTime;
  });
}

function annotateReportAttempts(rows) {
  const sortedAsc = [...rows].sort((a, b) => {
    const aTime = new Date(a?.created_at || a?.latest_report || 0).getTime() || 0;
    const bTime = new Date(b?.created_at || b?.latest_report || 0).getTime() || 0;
    if (aTime !== bTime) return aTime - bTime;
    return Number(a?.report_id || 0) - Number(b?.report_id || 0);
  });

  const counts = new Map();
  return sortedAsc.map((row) => {
    const communityKey = getReportCommunityKey(row);
    const source = String(row?.report_source || '').toLowerCase();
    const entityId = source === 'post'
      ? String(row?.post_id || '')
      : String(row?.user_id ?? row?.reported_user_id ?? '');
    const key = `${source}::${entityId}::${communityKey}`;
    const nextAttempt = (counts.get(key) || 0) + 1;
    counts.set(key, nextAttempt);
    return {
      ...row,
      attempt_number: nextAttempt,
    };
  });
}

function formatAttemptLabel(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return 'N/A';
  return num === 1 ? '1 time' : `${num} times`;
}

function renderReportsTable() {
  const tableBody = document.getElementById('reportsTableBody');
  const table = document.getElementById('reportsTable');

  if (!tableBody || !table) return;

  if (filteredData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 20px;">
          No reports found
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = filteredData.map((report) => {
      const communityKey = getReportCommunityKey(report);
      return `
      <tr>
        <td>#${report.report_id ?? 'N/A'}</td>
        <td><span class="badge badge-secondary">${formatAttemptLabel(report.attempt_number)}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${report.profile_picture
              ? `<img src="${report.profile_picture}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
              : '<div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center;">U</div>'
            }
            <div>
              <div>${report.fullname || 'Unknown User'}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="reporter-meta">
            <div>${escapeHtml(report.reporter_name || 'Unknown Reporter')}</div>
            <div class="reporter-meta-sub">${escapeHtml(report.reporter_email || 'N/A')}</div>
          </div>
        </td>
        <td>${report.email || 'N/A'}</td>
        <td>${report.site_name || report.domain || report.community_type || report.community_name || 'N/A'}</td>
        <td><span class="badge badge-reason">${escapeHtml(getReasonLabel(getReportCategory(report)))}</span></td>
        <td>
          <span class="badge ${getStatusBadgeClass(report)}">
            ${escapeHtml(getStatusLabel(report))}
          </span>
        </td>
        <td class="report-date-td">${formatDateTime(report.created_at || report.latest_report)}</td>
        <td class="report-actions-cell">
          ${report.report_source === 'post'
            ? `<div class="report-actions-row">
                <button class="btn-icon btn-view" onclick="viewPostReport('${report.report_id}')" title="View post report details">&#128065;</button>
                <button class="btn-icon btn-warning" onclick="handleWarning('${report.user_id}', '${communityKey}')" title="Send Warning">&#9888;</button>
                <button class="btn-icon btn-danger" onclick="handleSuspend('${report.user_id}', '${communityKey}')" title="Suspend User">&#9940;</button>
              </div>`
            : `<div class="report-actions-row">
                <button class="btn-icon btn-view" onclick="viewUserReport('${report.report_id}')" title="View user report details">&#128065;</button>
                <button class="btn-icon btn-warning" onclick="handleWarning('${report.user_id}', '${communityKey}')" title="Send Warning">&#9888;</button>
                <button class="btn-icon btn-danger" onclick="handleSuspend('${report.user_id}', '${communityKey}')" title="Suspend User">&#9940;</button>
              </div>`
          }
        </td>
      </tr>
    `;
    }).join('');
  }

  table.style.display = 'table';
}

function setupEventListeners(section) {
  const searchInput = section.querySelector('#searchReports');
  const statusFilter = section.querySelector('#statusFilter');

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', applyFilters);
  }
}

function applyFilters() {
  const searchTerm = String(document.getElementById('searchReports')?.value || '').toLowerCase();
  const selectedStatus = String(document.getElementById('statusFilter')?.value || 'all').toLowerCase();

  filteredData = routeScopedData.filter((report) => {
    const fullname = (report.fullname || '').toLowerCase();
    const email = (report.email || '').toLowerCase();
    const reasons = `${getReasonTokens(report).join(' ')} ${getReportCategory(report)}`.toLowerCase();
    const source = (report.report_source || '').toLowerCase();
    const status = String(getDisplayStatus(report) || '').toLowerCase();
    const statusMatch = selectedStatus === 'all' || status === selectedStatus;

    return statusMatch && (
      fullname.includes(searchTerm)
      || email.includes(searchTerm)
      || reasons.includes(searchTerm)
      || source.includes(searchTerm)
    );
  });

  filteredData = sortByLatestReportDesc(filteredData);

  renderReportsTable();
}

function viewUserReport(reportId) {
  const report = reportsData.find((item) => String(item.report_id) === String(reportId) && String(item.report_source) === 'message');
  if (!report) {
    showToast('Report details not found.', 'error');
    return;
  }
  showUserReportsModal(report.user_id, [report]);
}

function viewPostReport(reportId) {
  const report = reportsData.find((item) => String(item.report_id) === String(reportId) && String(item.report_source) === 'post');
  if (!report) {
    showToast('Report details not found.', 'error');
    return;
  }
  showPostReportsModal(report.post_id, [report]);
}

function showUserReportsModal(userId, reports) {
  const report = reports[0] || {};
  const modal = document.createElement('div');
  modal.className = 'reports-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeReportsModal()"></div>
    <div class="modal-content report-detail-modal">
      <div class="modal-header">
        <h3>Message Report #${report.report_id || 'N/A'}</h3>
        <button class="modal-close" onclick="closeReportsModal()">x</button>
      </div>
      <div class="modal-body">
        ${reports.length === 0
          ? '<p>No detailed reports found for this user.</p>'
          : reports.map((report) => `
            <div class="report-item">
              <div class="report-header">
                <strong>Reporter:</strong> ${report.reporter_name} (${report.reporter_email})
              </div>
              <div class="report-details">
                <strong>Category:</strong> <span class="badge badge-reason">${escapeHtml(getReasonLabel(getReportCategory(report)))}</span>
              </div>
              ${getReportReasonText(report)
                ? `<div class="report-details"><strong>User Reason:</strong> ${escapeHtml(getReportReasonText(report))}</div>`
                : ''
              }
              ${report.message_content
                ? `<div class="report-details"><strong>Message:</strong> "${escapeHtml(report.message_content)}"</div>`
                : ''
              }
              ${getReportProofUrl(report)
                ? `<div class="report-details">
                    <strong>Proof:</strong>
                    <div class="report-proof-block">
                      <a href="${escapeHtml(getReportProofUrl(report))}" target="_blank" rel="noopener noreferrer">Open proof image</a>
                      <img class="report-proof-media" src="${escapeHtml(getReportProofUrl(report))}" alt="Report proof">
                    </div>
                  </div>`
                : ''
              }
              <div class="report-details">
                <strong>Date:</strong> ${formatDate(report.created_at)}
              </div>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  window.currentReportsModal = modal;
}

function showPostReportsModal(postId, reports) {
  const community = reports[0]?.community_type || reports[0]?.domain || reports[0]?.site_name || '';
  const isDeletedPost = reports.some((report) => isDeletedPostReport(report));
  const report = reports[0] || {};
  const displayStatus = getDisplayStatus(report);
  const modal = document.createElement('div');
  modal.className = 'reports-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeReportsModal()"></div>
    <div class="modal-content report-detail-modal">
      <div class="modal-header">
        <h3>Post Report #${report.report_id || 'N/A'}</h3>
        <button class="modal-close" onclick="closeReportsModal()">x</button>
      </div>
      <div class="modal-body">
        ${isDeletedPost
          ? `<div class="report-summary-note report-summary-note-warning">This post was already deleted. Report history is still available for admin review.</div>`
          : ''
        }
        ${reports.length === 0
          ? '<p>No detailed reports found for this post.</p>'
          : reports.map((report) => `
            <div class="report-item">
              <div class="report-header">
                <strong>Reporter:</strong> ${report.reporter_name} (${report.reporter_email})
              </div>
              <div class="report-details">
                <strong>Category:</strong> <span class="badge badge-reason">${escapeHtml(getReasonLabel(getReportCategory(report)))}</span>
              </div>
              ${getReportReasonText(report)
                ? `<div class="report-details"><strong>User Reason:</strong> ${escapeHtml(getReportReasonText(report))}</div>`
                : ''
              }
              ${String(report.post_content ?? report.content ?? '').trim()
                ? `<div class="report-details"><strong>Post:</strong> "${escapeHtml(String(report.post_content ?? report.content ?? '').trim())}"</div>`
                : `<div class="report-details"><strong>Post:</strong> <span class="report-muted">Post already deleted</span></div>`
              }
              ${getReportProofUrl(report)
                ? `<div class="report-details">
                    <strong>Proof:</strong>
                    <div class="report-proof-block">
                      <a href="${escapeHtml(getReportProofUrl(report))}" target="_blank" rel="noopener noreferrer">Open proof image</a>
                      <img class="report-proof-media" src="${escapeHtml(getReportProofUrl(report))}" alt="Report proof">
                    </div>
                  </div>`
                : ''
              }
              <div class="report-details">
                <strong>Site:</strong> ${escapeHtml(report.site_name || report.domain || report.community_type || 'N/A')}
              </div>
              <div class="report-details">
                <strong>Status:</strong> <span class="badge ${getStatusBadgeClass(report)}">${escapeHtml(getStatusLabel(report))}</span>
              </div>
              <div class="report-details">
                <strong>Date:</strong> ${formatDate(report.created_at)}
              </div>
            </div>
          `).join('')
        }
        ${reports.length && displayStatus !== 'closed'
          ? `<div class="warning-form-actions report-modal-actions" style="margin-top:16px;">
              <button type="button" class="btn-primary" onclick="handlePostDelete('${postId}', '${escapeHtml(community)}')">Delete Post</button>
            </div>`
          : reports.length
            ? `<div class="report-summary-note report-summary-note-warning" style="margin-top:16px;">This report is already closed.</div>`
            : ''
        }
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  window.currentReportsModal = modal;
}

function closeReportsModal() {
  if (window.currentReportsModal) {
    document.body.removeChild(window.currentReportsModal);
    window.currentReportsModal = null;
  }
}

async function handleWarning(userId, community = '') {
  const warningPayload = await openWarningModal(userId);
  if (!warningPayload) return;

  try {
    const result = await requestJson(`/admin/reports/users/${userId}/action`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'warning',
        reason: warningPayload.content,
        warning_category: warningPayload.category,
        community,
      })
    });

    showToast(result.message || `Warning sent to user ${userId}`, 'success');
    await fetchReports();
  } catch (error) {
    console.error('Error sending warning:', error);
    showToast('Failed to send warning: ' + error.message, 'error');
  }
}

function openWarningModal(userId) {
  return new Promise((resolve) => {
    const defaultCategory = WARNING_CATEGORIES[0];
    const modal = document.createElement('div');
    modal.className = 'reports-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Send Warning to User #${userId}</h3>
          <button type="button" class="modal-close" aria-label="Close">x</button>
        </div>
        <div class="modal-body">
          <div class="warning-form">
            <label class="warning-form-label" for="warningCategorySelect">Category</label>
            <select id="warningCategorySelect" class="warning-form-select">
              ${WARNING_CATEGORIES.map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}
            </select>

            <label class="warning-form-label" for="warningContentInput">Warning Content</label>
            <textarea
              id="warningContentInput"
              class="warning-form-textarea"
              rows="5"
              placeholder="Type warning content..."
            >${defaultCategory.template}</textarea>
          </div>
          <div class="warning-form-actions">
            <button type="button" class="btn-secondary warning-cancel-btn">Cancel</button>
            <button type="button" class="btn-primary warning-send-btn">Send Warning</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.warning-cancel-btn');
    const sendBtn = modal.querySelector('.warning-send-btn');
    const categorySelect = modal.querySelector('#warningCategorySelect');
    const contentInput = modal.querySelector('#warningContentInput');

    let closed = false;
    const close = (payload = null) => {
      if (closed) return;
      closed = true;
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      resolve(payload);
    };

    categorySelect?.addEventListener('change', () => {
      const selected = WARNING_CATEGORIES.find((x) => x.value === String(categorySelect.value));
      if (!selected || !contentInput) return;
      if (!String(contentInput.value || '').trim() || WARNING_CATEGORIES.some((x) => x.template === String(contentInput.value || '').trim())) {
        contentInput.value = selected.template;
      }
    });

    sendBtn?.addEventListener('click', () => {
      const category = String(categorySelect?.value || defaultCategory.value).trim();
      const content = String(contentInput?.value || '').trim();
      if (!content) {
        showToast('Warning content is required.', 'error');
        return;
      }
      close({ category, content });
    });

    overlay?.addEventListener('click', () => close(null));
    closeBtn?.addEventListener('click', () => close(null));
    cancelBtn?.addEventListener('click', () => close(null));
  });
}

async function handleSuspend(userId, community = '') {
  const confirmed = confirm(`Are you sure you want to suspend user ${userId}?`);
  if (!confirmed) return;

  const reason = window.prompt(`Reason for suspending user ${userId}:`);
  if (!reason) return;

  try {
    const result = await requestJson(`/admin/reports/users/${userId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action: 'suspend', reason, community })
    });

    showToast(result.message || `User ${userId} has been suspended`, 'success');
    await fetchReports();
  } catch (error) {
    console.error('Error suspending user:', error);
    showToast('Failed to suspend user: ' + error.message, 'error');
  }
}

async function takePostAction(postId, action, community = '') {
  const actionLabel = action === 'delete' ? 'delete this reported post' : 'dismiss this post report';
  const confirmed = confirm(`Are you sure you want to ${actionLabel}?`);
  if (!confirmed) return;

  try {
    const result = await requestJson(`/admin/reports/posts/${postId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason: '', community })
    });

    const resultMessage = String(result.message || result?.data?.message || `Post action "${action}" completed.`);
    showToast(
      /already deleted/i.test(resultMessage) ? 'Post already deleted.' : resultMessage,
      /already deleted/i.test(resultMessage) ? 'warning' : 'success',
    );
    closeReportsModal();
    await fetchReports();
  } catch (error) {
    console.error(`Error taking post action (${action}):`, error);
    showToast(
      /already deleted/i.test(String(error?.message || ''))
        ? 'Post already deleted.'
        : `Failed to ${action} post: ${error.message}`,
      /already deleted/i.test(String(error?.message || '')) ? 'warning' : 'error',
    );
    if (/already deleted/i.test(String(error?.message || ''))) {
      closeReportsModal();
      await fetchReports();
    }
  }
}

async function handlePostDelete(postId, community = '') {
  await takePostAction(postId, 'delete', community);
}

function formatDate(dateString) {
  return formatAdminDate(dateString, 'N/A');
}

function formatDateTime(dateString) {
  const dateLabel = formatAdminDate(dateString, 'N/A');
  const timeLabel = formatAdminTime(dateString, '');
  const safeDate = escapeHtml(dateLabel);
  const safeTime = timeLabel ? `at ${escapeHtml(timeLabel)}` : '';
  return `
    <div class="report-date-cell">
      <span class="report-date">${safeDate}</span>
      ${safeTime ? `<span class="report-time">${safeTime}</span>` : ''}
    </div>
  `;
}

function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');
  const table = document.getElementById('reportsTable');
  const error = document.getElementById('errorMessage');

  if (spinner) spinner.style.display = show ? 'block' : 'none';
  if (table) table.style.display = show ? 'none' : 'table';
  if (error) error.style.display = 'none';
}

function showError(message) {
  const spinner = document.getElementById('loadingSpinner');
  const table = document.getElementById('reportsTable');
  const error = document.getElementById('errorMessage');

  if (spinner) spinner.style.display = 'none';
  if (table) table.style.display = 'none';
  if (error) {
    error.textContent = message;
    error.style.display = 'block';
  }
}

window.viewUserReport = viewUserReport;
window.viewPostReport = viewPostReport;
window.handleWarning = handleWarning;
window.handleSuspend = handleSuspend;
window.handlePostDelete = handlePostDelete;
window.closeReportsModal = closeReportsModal;



