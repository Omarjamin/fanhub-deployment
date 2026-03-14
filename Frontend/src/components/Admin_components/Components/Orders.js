import '../../../styles/Admin_styles/Orders.css';
import {
  fetchAdminJsonWithFallback,
  fetchAdminSites,
  getAdminApiBase,
  resolveAdminEndpointUrls,
  resolveAdminSiteFromPath,
} from './admin-sites.js';
import { formatAdminDate, formatAdminDateInput, formatAdminDateTime } from './admin-date.js';
import { getActiveSiteSlug, getSessionToken } from '../../../lib/site-context.js';
// import { adminApi } from '../../../services/admin_services/auth.js';

export default function createOrders() {
  const ADMIN_API_BASE = getAdminApiBase();
  const forcedSiteSlug = resolveAdminSiteFromPath();
  const isForcedSingleSite = Boolean(forcedSiteSlug);

  const section = document.createElement('section');
  section.id = 'orders';
  section.className = 'content-section active';

  section.innerHTML = `
    <div class="section-header">
      <h2>Order Management</h2>
    </div>

    <div class="filters">
      <select class="filter-select" id="orderCommunityFilter">
        <option value="all">All Sites</option>
      </select>
      <select class="filter-select" id="orderStatusFilter">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input type="date" class="filter-date" id="orderDateFilter">
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="ordersTableBody"></tbody>
      </table>
    </div>

    <div class="orders-modal hidden" id="viewOrderModal" role="dialog" aria-modal="true" aria-labelledby="viewOrderTitle">
      <div class="orders-modal-card orders-modal-card-lg">
        <div class="orders-modal-header">
          <h3 id="viewOrderTitle">Order Details</h3>
          <button type="button" class="orders-modal-close" id="closeViewOrderModal" aria-label="Close">x</button>
        </div>
        <div class="orders-modal-body">
          <div class="order-details">
            <div class="order-info">
              <h4>Order Information</h4>
              <p><strong>Order ID:</strong> <span id="viewOrderId"></span></p>
              <p><strong>Customer:</strong> <span id="viewCustomer"></span></p>
              <p><strong>Email:</strong> <span id="viewEmail"></span></p>
              <p><strong>Payment Method:</strong> <span id="viewPayment"></span></p>
              <p><strong>Status:</strong> <span id="viewStatus"></span></p>
              <p><strong>Tracking Number:</strong> <span id="viewTracking"></span></p>
              <p><strong>Date:</strong> <span id="viewDate"></span></p>
            </div>
            <div class="order-items">
              <h4>Order Items</h4>
              <div id="viewOrderItems"></div>
            </div>
            <div class="order-totals">
              <h4>Order Totals</h4>
              <p><strong>Subtotal:</strong> <span id="viewSubtotal"></span></p>
              <p><strong>Shipping Fee:</strong> <span id="viewShipping"></span></p>
              <p><strong>Total:</strong> <span id="viewTotal"></span></p>
            </div>
            <div class="order-address">
              <h4>Shipping Address</h4>
              <div id="viewAddress"></div>
            </div>
          </div>
        </div>
        <div class="orders-modal-actions">
          <button type="button" class="orders-btn cancel" id="closeViewOrderBtn">Close</button>
        </div>
      </div>
    </div>

    <div class="orders-modal hidden" id="editOrderModal" role="dialog" aria-modal="true" aria-labelledby="editOrderTitle">
      <div class="orders-modal-card">
        <div class="orders-modal-header">
          <h3 id="editOrderTitle">Edit Order Status</h3>
          <button type="button" class="orders-modal-close" id="closeEditOrderModal" aria-label="Close">x</button>
        </div>
        <form id="editOrderForm" class="orders-modal-form">
          <p class="orders-modal-order" id="editOrderLabel"></p>
          <label class="orders-modal-group">
            <span>Status</span>
            <select id="editOrderStatus" required>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label class="orders-modal-group">
            <span>Tracking Number</span>
            <input id="editTrackingNumber" type="text" maxlength="120" placeholder="Required when order is shipped">
            <small id="editTrackingHint">Required before an order can be marked as shipped.</small>
          </label>
          <div class="orders-modal-actions">
            <button type="button" class="orders-btn cancel" id="cancelEditOrder">Cancel</button>
            <button type="submit" class="orders-btn save">Save</button>
          </div>
        </form>
      </div>
    </div>

    <div class="orders-modal hidden" id="deleteOrderModal" role="dialog" aria-modal="true" aria-labelledby="deleteOrderTitle">
      <div class="orders-modal-card orders-modal-card-sm">
        <div class="orders-modal-header">
          <h3 id="deleteOrderTitle">Cancel Order</h3>
          <button type="button" class="orders-modal-close" id="closeDeleteOrderModal" aria-label="Close">x</button>
        </div>
        <div class="orders-modal-body">
          <p id="deleteOrderLabel">Cancel this order?</p>
        </div>
        <div class="orders-modal-actions">
          <button type="button" class="orders-btn cancel" id="cancelDeleteOrder">Cancel</button>
          <button type="button" class="orders-btn danger" id="confirmDeleteOrder">Yes, Cancel</button>
        </div>
      </div>
    </div>
  `;

  let orders = [];
  let siteOptions = [];
  let selectedCommunityId = null;
  let selectedCommunity = isForcedSingleSite
    ? forcedSiteSlug
    : String(sessionStorage.getItem('admin_selected_site') || 'all').trim().toLowerCase() || 'all';
  let editingOrderId = null;
  let deletingOrderId = null;

  function normalizeStatusValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'pending';
    if (['order placed', 'placed', 'confirmed'].includes(normalized)) return 'pending';
    if (normalized === 'canceled') return 'cancelled';
    if (normalized === 'delivered') return 'completed';
    return normalized;
  }

  function normalizeTrackingNumber(value) {
    const normalized = String(value ?? '').trim();
    return normalized || '';
  }

  function safeParseShippingAddress(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;

    try {
      return JSON.parse(value);
    } catch (_) {
      return {};
    }
  }

  function findOrder(orderId) {
    return orders.find(order => String(order.orderId) === String(orderId));
  }

  function isOrderLocked(status) {
    const normalized = normalizeStatusValue(status);
    return normalized === 'completed' || normalized === 'cancelled';
  }

  function getAllowedStatusTransitions(status) {
    const normalized = normalizeStatusValue(status);
    if (normalized === 'pending') {
      return ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    }
    if (normalized === 'processing') {
      return ['processing', 'shipped', 'completed', 'cancelled'];
    }
    if (normalized === 'shipped') {
      return ['shipped', 'completed'];
    }
    if (normalized === 'completed') {
      return ['completed'];
    }
    if (normalized === 'cancelled') {
      return ['cancelled'];
    }
    return [normalized];
  }

  function formatStatusLabel(status) {
    return normalizeStatusValue(status)
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function loadOrders() {
    const tbody = section.querySelector('#ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => `
      <tr data-order-id="${order.orderId}" data-status="${order.status}" data-date-key="${order.dateKey}">
        <td>${order.orderId}</td>
        <td>${order.customerName}</td>
        <td>${order.itemsCount} items</td>
        <td>${order.totalDisplay}</td>
        <td><span class="badge badge-${order.status}">${formatStatusLabel(order.status)}</span></td>
        <td>${order.dateDisplay}</td>
        <td>
          <button class="btn-icon" title="View" type="button" data-action="view">&#128065;</button>
          <button class="btn-icon" title="${isOrderLocked(order.status) ? 'Finalized orders are locked' : 'Edit'}" type="button" data-action="edit"${isOrderLocked(order.status) ? ' disabled aria-disabled="true"' : ''}>&#9998;</button>
          <button class="btn-icon btn-danger" title="${getAllowedStatusTransitions(order.status).includes('cancelled') && !isOrderLocked(order.status) ? 'Cancel' : 'This order can no longer be cancelled'}" type="button" data-action="delete"${getAllowedStatusTransitions(order.status).includes('cancelled') && !isOrderLocked(order.status) ? '' : ' disabled aria-disabled="true"'}>&#128465;</button>
        </td>
      </tr>
    `).join('');
  }

  function filterOrders() {
    const status = section.querySelector('#orderStatusFilter').value.toLowerCase();
    const date = section.querySelector('#orderDateFilter').value;

    section.querySelectorAll('#ordersTableBody tr').forEach(row => {
      const rowStatus = String(row.dataset.status || '').toLowerCase();
      const rowDate = String(row.dataset.dateKey || '');

      const matchStatus = !status || rowStatus === status;
      const matchDate = !date || rowDate === date;

      row.style.display = matchStatus && matchDate ? '' : 'none';
    });
  }

  function setupOrderFilters() {
    section
      .querySelector('#orderCommunityFilter')
      .addEventListener('change', async event => {
        selectedCommunity = isForcedSingleSite ? forcedSiteSlug : (event.target.value || 'all');
        const selectedOption = event.target.options?.[event.target.selectedIndex];
        selectedCommunityId = Number(selectedOption?.dataset?.communityId || 0) || null;
        try {
          sessionStorage.setItem('admin_selected_site', selectedCommunity);
        } catch (_) {}
        await fetchOrders(selectedCommunity);
        filterOrders();
      });
    section.querySelector('#orderStatusFilter').addEventListener('change', filterOrders);
    section.querySelector('#orderDateFilter').addEventListener('change', filterOrders);
  }

  async function fetchOrders(communityKey = 'all') {
    try {
      const effectiveCommunity = isForcedSingleSite ? forcedSiteSlug : communityKey;
      const payload = await fetchAdminJsonWithFallback(
        'orders/with-items',
        effectiveCommunity && effectiveCommunity !== 'all'
          ? {
              community: effectiveCommunity,
              ...(selectedCommunityId ? { community_id: selectedCommunityId } : {}),
            }
          : {},
        { headers: getAuthHeaders() },
      );
      const rows = Array.isArray(payload.data) ? payload.data : [];

      orders = rows.map(row => {
        const statusRaw = normalizeStatusValue(row.status);
        const totalNum = Number(row.total || 0);

        return {
          orderId: row.order_id,
          db_name: row.db_name,
          customerId: row.user_id,
          customerName: row.customer_name || row.fullname || `User #${row.user_id}`,
          customerEmail: row.customer_email || '',
          paymentMethod: row.payment_method || 'N/A',
          items: row.items || [],
          itemsCount: (row.items || []).length,
          subtotal: Number(row.subtotal || 0),
          shippingFee: Number(row.shipping_fee || 0),
          total: totalNum,
          totalDisplay: `PHP ${totalNum.toLocaleString()}`,
          status: statusRaw,
          trackingNumber: normalizeTrackingNumber(row.tracking_number),
          trackingUpdatedAt: row.tracking_updated_at || '',
          createdAt: row.created_at || '',
          dateKey: formatAdminDateInput(row.created_at),
          dateDisplay: formatAdminDate(row.created_at, 'N/A'),
          dateDisplayLong: formatAdminDateTime(row.created_at, 'N/A'),
          shippingAddress: safeParseShippingAddress(row.shipping_address),
        };
      });

      loadOrders();
      filterOrders();
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }

  async function updateOrderStatusOnServer(order, nextStatus, trackingNumber = '') {
    try {
      const candidateUrls = resolveAdminEndpointUrls(
        `orders/${order.orderId}/status`,
        {},
        ADMIN_API_BASE,
      );
      let response = null;
      let payload = {};
      let lastError = null;

      for (const url of candidateUrls) {
        try {
          response = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              db_name: order.db_name,
              status: nextStatus,
              tracking_number: normalizeTrackingNumber(trackingNumber),
            }),
          });
          payload = await response.json().catch(() => ({}));
          if (response.status !== 404) break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw (lastError || new Error('Failed to reach order update endpoint.'));
      }
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
      }
      const updated = payload.data || {};

      const statusRaw = normalizeStatusValue(updated.status || nextStatus);

      order.status = statusRaw;
      order.trackingNumber = normalizeTrackingNumber(
        typeof updated.tracking_number !== 'undefined'
          ? updated.tracking_number
          : trackingNumber,
      );
      order.trackingUpdatedAt = updated.tracking_updated_at || order.trackingUpdatedAt || '';
      if (typeof updated.total !== 'undefined') {
        order.total = Number(updated.total || 0);
        order.totalDisplay = `PHP ${order.total.toLocaleString()}`;
      }
      if (updated.created_at) {
        order.createdAt = updated.created_at;
        order.dateKey = formatAdminDateInput(updated.created_at);
        order.dateDisplay = formatAdminDate(updated.created_at, order.dateDisplay);
        order.dateDisplayLong = formatAdminDateTime(updated.created_at, order.dateDisplayLong);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  function setupViewModal() {
    const modal = section.querySelector('#viewOrderModal');
    const closeBtn = section.querySelector('#closeViewOrderModal');
    const closeBtn2 = section.querySelector('#closeViewOrderBtn');

    function closeModal() {
      modal.classList.add('hidden');
    }

    function openModal(orderId) {
      const order = findOrder(orderId);
      if (!order) return;

      // Populate order information
      section.querySelector('#viewOrderId').textContent = `#ORD-${order.orderId}`;
      section.querySelector('#viewCustomer').textContent = order.customerName;
      section.querySelector('#viewEmail').textContent = order.customerEmail || 'N/A';
      section.querySelector('#viewPayment').textContent = order.paymentMethod;
      section.querySelector('#viewStatus').innerHTML = `<span class="badge badge-${order.status}">${formatStatusLabel(order.status)}</span>`;
      section.querySelector('#viewTracking').textContent = order.trackingNumber || 'Not assigned';
      section.querySelector('#viewDate').textContent = order.dateDisplayLong;

      // Populate order items
      const itemsContainer = section.querySelector('#viewOrderItems');
      if (order.items && order.items.length > 0) {
        itemsContainer.innerHTML = order.items.map(item => `
          <div class="order-item">
            <div class="item-info">
              <strong>${item.product_name || 'Unknown Product'}</strong>
              ${item.variant_name ? `<br><small>${item.variant_name}</small>` : ''}
              ${item.size ? `<br><small>Size: ${item.size}</small>` : ''}
            </div>
            <div class="item-details">
              <span>Qty: ${item.quantity}</span>
              <span>Price: PHP ${Number(item.price || 0).toLocaleString()}</span>
              <span>Total: PHP ${Number(item.total || 0).toLocaleString()}</span>
            </div>
          </div>
        `).join('');
      } else {
        itemsContainer.innerHTML = '<p>No items found</p>';
      }

      // Populate totals
      section.querySelector('#viewSubtotal').textContent = `PHP ${order.subtotal.toLocaleString()}`;
      section.querySelector('#viewShipping').textContent = `PHP ${order.shippingFee.toLocaleString()}`;
      section.querySelector('#viewTotal').textContent = `PHP ${order.total.toLocaleString()}`;

      // Populate shipping address
      const addressContainer = section.querySelector('#viewAddress');
      if (order.shippingAddress && Object.keys(order.shippingAddress).length > 0) {
        const addr = order.shippingAddress;
        addressContainer.innerHTML = `
          <p>${addr.street || ''}</p>
          <p>${addr.barangay || ''} ${addr.city || ''}</p>
          <p>${addr.province || ''} ${addr.region || ''}</p>
          <p>${addr.zip || ''}</p>
        `.replace(/<p>\s*<\/p>/g, '');
      } else {
        addressContainer.innerHTML = '<p>No shipping address provided</p>';
      }

      modal.classList.remove('hidden');
    }

    closeBtn.addEventListener('click', closeModal);
    closeBtn2.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    return { openModal, closeModal };
  }

  function setupEditModal() {
    const modal = section.querySelector('#editOrderModal');
    const closeBtn = section.querySelector('#closeEditOrderModal');
    const cancelBtn = section.querySelector('#cancelEditOrder');
    const form = section.querySelector('#editOrderForm');
    const statusSelect = section.querySelector('#editOrderStatus');
    const trackingInput = section.querySelector('#editTrackingNumber');
    const trackingHint = section.querySelector('#editTrackingHint');
    const orderLabel = section.querySelector('#editOrderLabel');

    function closeModal() {
      editingOrderId = null;
      modal.classList.add('hidden');
    }

    function syncTrackingRequirement() {
      const normalizedStatus = normalizeStatusValue(statusSelect.value);
      const requiresTracking = normalizedStatus === 'shipped';
      trackingInput.required = requiresTracking;
      trackingInput.placeholder = requiresTracking
        ? 'Enter tracking number'
        : 'Optional unless the order is shipped';
      trackingHint.textContent = requiresTracking
        ? 'Required before an order can be marked as shipped.'
        : 'This will be shown to the user in their order history once provided.';
    }

    function openModal(orderId) {
      const order = findOrder(orderId);
      if (!order) return;
      if (isOrderLocked(order.status)) return;

      editingOrderId = orderId;
      orderLabel.textContent = `Order: #ORD-${order.orderId}`;
      const allowedStatuses = getAllowedStatusTransitions(order.status);
      statusSelect.innerHTML = allowedStatuses
        .filter(status => status !== 'cancelled')
        .map(status => `<option value="${status}">${formatStatusLabel(status)}</option>`)
        .join('');
      statusSelect.value = allowedStatuses.includes(order.status) ? order.status : allowedStatuses[0];
      trackingInput.value = order.trackingNumber || '';
      syncTrackingRequirement();
      modal.classList.remove('hidden');
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
    statusSelect.addEventListener('change', syncTrackingRequirement);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!editingOrderId) return;

      const order = findOrder(editingOrderId);
      if (!order) return;

      const selectedStatus = statusSelect.value;
      const trackingNumber = normalizeTrackingNumber(trackingInput.value);

      if (normalizeStatusValue(selectedStatus) === 'shipped' && !trackingNumber) {
        alert('Tracking number is required before marking an order as shipped.');
        trackingInput.focus();
        return;
      }

      try {
        await updateOrderStatusOnServer(order, selectedStatus, trackingNumber);
        loadOrders();
        filterOrders();
        closeModal();
      } catch {
        // keep modal open if update fails
      }
    });

    return { openModal, closeModal };
  }

  function setupDeleteModal() {
    const modal = section.querySelector('#deleteOrderModal');
    const closeBtn = section.querySelector('#closeDeleteOrderModal');
    const cancelBtn = section.querySelector('#cancelDeleteOrder');
    const confirmBtn = section.querySelector('#confirmDeleteOrder');
    const orderLabel = section.querySelector('#deleteOrderLabel');

    function closeModal() {
      deletingOrderId = null;
      modal.classList.add('hidden');
    }

    function openModal(orderId) {
      const order = findOrder(orderId);
      if (!order) return;
      if (isOrderLocked(order.status) || !getAllowedStatusTransitions(order.status).includes('cancelled')) return;

      deletingOrderId = orderId;
      orderLabel.textContent = `Cancel order #ORD-${order.orderId}? This will keep the record but lock further changes.`;
      modal.classList.remove('hidden');
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    confirmBtn.addEventListener('click', async () => {
      if (!deletingOrderId) return;

      const order = findOrder(deletingOrderId);
      if (!order) return;

      try {
        await updateOrderStatusOnServer(order, 'cancelled');
        loadOrders();
        filterOrders();
        closeModal();
      } catch {
        // keep modal open if update fails
      }
    });

    return { openModal, closeModal };
  }

  function setupOrderActions(viewModalApi, editModalApi, deleteModalApi) {
    section.addEventListener('click', event => {
      const actionBtn = event.target.closest('[data-action]');
      const row = event.target.closest('tr[data-order-id]');
      if (!actionBtn || !row) return;

      const orderId = row.dataset.orderId;
      const action = actionBtn.dataset.action;

      if (action === 'view') {
        viewModalApi.openModal(orderId);
      } else if (action === 'edit') {
        editModalApi.openModal(orderId);
      } else if (action === 'delete') {
        deleteModalApi.openModal(orderId);
      }
    });
  }

  async function initOrders() {
    await loadSiteOptions();
    setupOrderFilters();

    const viewModalApi = setupViewModal();
    const editModalApi = setupEditModal();
    const deleteModalApi = setupDeleteModal();
    setupOrderActions(viewModalApi, editModalApi, deleteModalApi);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      section.querySelector('#viewOrderModal').classList.add('hidden');
      section.querySelector('#editOrderModal').classList.add('hidden');
      section.querySelector('#deleteOrderModal').classList.add('hidden');
    });

    await fetchOrders(selectedCommunity);
  }

  function getAuthHeaders() {
    const scopedSite =
      (selectedCommunity && selectedCommunity !== 'all')
        ? String(selectedCommunity).trim().toLowerCase()
        : getActiveSiteSlug();
    const siteScopedToken = getSessionToken(scopedSite);
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
      apikey: (import.meta.env.VITE_API_KEY || 'thread').trim() || 'thread',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function loadSiteOptions() {
    try {
      const sites = await fetchAdminSites();
      const normalizedSites = isForcedSingleSite
        ? sites.filter((site) => String(site.domain || '').trim().toLowerCase() === forcedSiteSlug)
        : sites;
      siteOptions = normalizedSites;
      const select = section.querySelector('#orderCommunityFilter');
      if (!select) return;
      select.innerHTML = `
        ${isForcedSingleSite ? '' : '<option value="all">All Sites</option>'}
        ${normalizedSites.map((site) => `<option value="${site.domain}" data-community-id="${site.community_id || site.id || ''}">${site.site_name}</option>`).join('')}
      `;
      if (isForcedSingleSite) {
        if (!normalizedSites.length) {
          select.innerHTML = `<option value="${forcedSiteSlug}">${forcedSiteSlug.toUpperCase()}</option>`;
        }
        select.value = forcedSiteSlug;
        select.disabled = true;
      } else if (selectedCommunity && selectedCommunity !== 'all') {
        select.value = selectedCommunity;
      }
      const selectedOption = select.options?.[select.selectedIndex];
      selectedCommunityId = Number(selectedOption?.dataset?.communityId || 0) || null;
    } catch (error) {
      console.error('Failed to load site options for orders:', error);
    }
  }

  initOrders();
  return section;
}



