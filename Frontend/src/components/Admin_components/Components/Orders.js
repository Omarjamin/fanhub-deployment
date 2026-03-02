import '../../../styles/Admin_styles/Orders.css';
import { fetchAdminSites } from './admin-sites.js';
// import { adminApi } from '../../../services/admin_services/auth.js';

export default function createOrders() {
  const ADMIN_API_BASE =
    import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4000/v1/admin';

  const section = document.createElement('section');
  section.id = 'orders';
  section.className = 'conten t-section active';

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
          <h3 id="deleteOrderTitle">Delete Order</h3>
          <button type="button" class="orders-modal-close" id="closeDeleteOrderModal" aria-label="Close">x</button>
        </div>
        <div class="orders-modal-body">
          <p id="deleteOrderLabel">Delete this order?</p>
        </div>
        <div class="orders-modal-actions">
          <button type="button" class="orders-btn cancel" id="cancelDeleteOrder">Cancel</button>
          <button type="button" class="orders-btn danger" id="confirmDeleteOrder">Yes</button>
        </div>
      </div>
    </div>
  `;

  let orders = [];
  let siteOptions = [];
  let selectedCommunity = 'all';
  let editingOrderId = null;
  let deletingOrderId = null;

  function findOrder(orderId) {
    return orders.find(order => String(order.orderId) === String(orderId));
  }

  function loadOrders() {
    const tbody = section.querySelector('#ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => `
      <tr data-order-id="${order.orderId}">
        <td>${order.orderId}</td>
        <td>${order.customerName}</td>
        <td>${order.itemsCount} items</td>
        <td>${order.totalDisplay}</td>
        <td><span class="badge badge-${order.status}">${order.status}</span></td>
        <td>${order.date}</td>
        <td>
          <button class="btn-icon" title="View" type="button" data-action="view">&#128065;</button>
          <button class="btn-icon" title="Edit" type="button" data-action="edit">&#9998;</button>
          <button class="btn-icon btn-danger" title="Delete" type="button" data-action="delete">&#128465;</button>
        </td>
      </tr>
    `).join('');
  }

  function filterOrders() {
    const status = section.querySelector('#orderStatusFilter').value.toLowerCase();
    const date = section.querySelector('#orderDateFilter').value;

    section.querySelectorAll('#ordersTableBody tr').forEach(row => {
      const rowStatus = row.cells[3].textContent.toLowerCase();
      const rowDate = row.cells[4].textContent;

      const matchStatus = !status || rowStatus.includes(status);
      const matchDate = !date || rowDate === date;

      row.style.display = matchStatus && matchDate ? '' : 'none';
    });
  }

  function setupOrderFilters() {
    section
      .querySelector('#orderCommunityFilter')
      .addEventListener('change', async event => {
        selectedCommunity = event.target.value || 'all';
        await fetchOrders(selectedCommunity);
        filterOrders();
      });
    section.querySelector('#orderStatusFilter').addEventListener('change', filterOrders);
    section.querySelector('#orderDateFilter').addEventListener('change', filterOrders);
  }

  async function fetchOrders(communityKey = 'all') {
    try {
      const params = new URLSearchParams();
      if (communityKey && communityKey !== 'all') {
        params.append('community', communityKey);
      }

      const url = `${ADMIN_API_BASE}/orders/with-items${
        params.toString() ? `?${params.toString()}` : ''
      }`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const payload = await res.json();
      const rows = Array.isArray(payload.data) ? payload.data : [];

      orders = rows.map(row => {
        const statusRaw = (row.status || 'pending').toLowerCase();
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
          date: row.created_at ? String(row.created_at).split(' ')[0] : '',
          shippingAddress: row.shipping_address ? JSON.parse(row.shipping_address) : {},
        };
      });

      loadOrders();
      filterOrders();
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }

  async function updateOrderStatusOnServer(order, nextStatus) {
    try {
      const url = `${ADMIN_API_BASE}/orders/${order.orderId}/status`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          db_name: order.db_name,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const payload = await res.json();
      const updated = payload.data || {};

      const statusRaw = (updated.status || nextStatus).toLowerCase();

      order.status = statusRaw;
      if (typeof updated.total !== 'undefined') {
        order.total = Number(updated.total || 0);
        order.totalDisplay = `PHP ${order.total.toLocaleString()}`;
      }
      order.date = updated.created_at
        ? String(updated.created_at).split(' ')[0]
        : order.date;
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
      section.querySelector('#viewStatus').innerHTML = `<span class="badge badge-${order.status}">${order.status}</span>`;
      section.querySelector('#viewDate').textContent = order.date;

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
    const orderLabel = section.querySelector('#editOrderLabel');

    function closeModal() {
      editingOrderId = null;
      modal.classList.add('hidden');
    }

    function openModal(orderId) {
      const order = findOrder(orderId);
      if (!order) return;

      editingOrderId = orderId;
      orderLabel.textContent = `Order: #ORD-${order.orderId}`;
      statusSelect.value = order.status;
      modal.classList.remove('hidden');
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!editingOrderId) return;

      const order = findOrder(editingOrderId);
      if (!order) return;

      const selectedStatus = statusSelect.value;

      try {
        await updateOrderStatusOnServer(order, selectedStatus);
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

      deletingOrderId = orderId;
      orderLabel.textContent = `Cancel order #ORD-${order.orderId}?`;
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
    const token =
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
      siteOptions = sites;
      const select = section.querySelector('#orderCommunityFilter');
      if (!select) return;
      select.innerHTML = `
        <option value="all">All Sites</option>
        ${sites.map((site) => `<option value="${site.domain}">${site.site_name}</option>`).join('')}
      `;
      if (selectedCommunity && selectedCommunity !== 'all') {
        select.value = selectedCommunity;
      }
    } catch (error) {
      console.error('Failed to load site options for orders:', error);
    }
  }

  initOrders();
  return section;
}
