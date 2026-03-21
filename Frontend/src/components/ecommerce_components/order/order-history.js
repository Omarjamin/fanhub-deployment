import Navigation from '../navigation.js';
import Footer from '../footer.js';
import { api } from '../../../services/ecommerce_services/config.js';
import { authHeaders } from '../../../services/ecommerce_services/auth/auth.js';
import { formatPHP, toSafeNumber } from '../../../lib/number-format.js';
import { formatPackageDimensions } from '../../../utils/package-dimensions.js';
import '../../../styles/ecommerce_styles/order_history.css';

function resolveItemWeightGrams(item) {
  const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
  if (Number.isFinite(explicitWeight) && explicitWeight > 0) return explicitWeight;
  return 0;
}

function resolveVariantLabel(item) {
  return String(
    item?.variant_values ||
    item?.size ||
    item?.variant_name ||
    item?.variant ||
    ''
  ).trim();
}

function resolveItemDimensions(item) {
  const length = toSafeNumber(
    item?.length_cm ??
    item?.lengthCm ??
    item?.length_cm_snapshot ??
    item?.package_length_cm ??
    item?.packageLengthCm ??
    item?.length,
    0,
  );
  const width = toSafeNumber(
    item?.width_cm ??
    item?.widthCm ??
    item?.width_cm_snapshot ??
    item?.package_width_cm ??
    item?.packageWidthCm ??
    item?.width,
    0,
  );
  const height = toSafeNumber(
    item?.height_cm ??
    item?.heightCm ??
    item?.height_cm_snapshot ??
    item?.package_height_cm ??
    item?.packageHeightCm ??
    item?.height,
    0,
  );
  return {
    length: Number.isFinite(length) && length > 0 ? length : 0,
    width: Number.isFinite(width) && width > 0 ? width : 0,
    height: Number.isFinite(height) && height > 0 ? height : 0,
  };
}

function getItemShippingMeta(item) {
  const weight = resolveItemWeightGrams(item);
  const dimensions = resolveItemDimensions(item);
  const parts = [];

  if (weight > 0) {
    parts.push(`Weight: ${weight.toLocaleString()}g each`);
  }
  if (dimensions.length > 0 || dimensions.width > 0 || dimensions.height > 0) {
    parts.push(`Package Size: ${formatPackageDimensions(dimensions.length, dimensions.width, dimensions.height)}`);
  }

  return parts.join('<br>');
}

function formatPackageSize(length = 0, width = 0, height = 0) {
  return formatPackageDimensions(length, width, height, { emptyLabel: '' });
}

function calculateOrderPackageMetrics(items = []) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const quantity = Number(item?.quantity || item?.qty || 0);
    const dimensions = resolveItemDimensions(item);
    acc.length = Math.max(acc.length, dimensions.length);
    acc.width = Math.max(acc.width, dimensions.width);
    acc.height += dimensions.height * quantity;
    return acc;
  }, { length: 0, width: 0, height: 0 });
}

function getOrderPackageLabel(order = {}) {
  const metrics = calculateOrderPackageMetrics(order?.items || []);
  return formatPackageSize(metrics.length, metrics.width, metrics.height);
}

function getDisplayOrderNumber(order = {}) {
  const sequence = Number(order?.userSequence || 0);
  return sequence > 0 ? String(sequence) : String(order?.order_id || order?.id || '');
}

function getOrderSequenceValue(order = {}) {
  const numericId = Number(order?.order_id ?? order?.id ?? 0);
  if (Number.isFinite(numericId) && numericId > 0) return numericId;

  const createdAtValue = new Date(
    order?.created_at ??
    order?.createdAt ??
    order?.updated_at ??
    order?.updatedAt ??
    0,
  ).getTime();
  return Number.isFinite(createdAtValue) ? createdAtValue : 0;
}

function getOrderDisplaySortValue(order = {}) {
  const createdAtValue = new Date(
    order?.created_at ??
    order?.createdAt ??
    order?.updated_at ??
    order?.updatedAt ??
    0,
  ).getTime();
  if (Number.isFinite(createdAtValue) && createdAtValue > 0) return createdAtValue;
  return getOrderSequenceValue(order);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function OrderHistory(payload = null) {
  const root = document.getElementById("app");
  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const communityType =
    pathParts[0] === 'fanhub' && pathParts[1] === 'community-platform' && pathParts[2]
      ? pathParts[2]
      : (pathParts[0] === 'fanhub' ? pathParts[1] : '');
  const communityData = payload?.communityData || {};
  const homePath = communityType ? `/fanhub/${communityType}` : '/';
  const shopPath = communityType ? `/fanhub/${communityType}/shop` : '/shop';
  const communityCartPath = communityType ? `/fanhub/${communityType}/shop` : '/shop';
  
  document.body.classList.remove(
    'ec-order-confirmation-page',
    'ec-checkout-page',
    'ec-product-page',
    'ec-shop-page',
    'ec-auth-page',
  );
  document.body.classList.add('ec-order-history-page');
  root.innerHTML = `
    <div id="navigation-container"></div>
    <main class="order-history-page-shell">
      <div class="order-history-container order-history-page">
        <div class="container">
        <!-- Header with Stats -->
        <div class="order-history-header">
          <div class="header-title">
            <button class="btn-link" id="back-to-shop" type="button">
              <span class="order-history-back-arrow" aria-hidden="true">←</span>
              <span class="order-history-back-label">Back to home</span>
            </button>
            <h1>Order History</h1>
          </div>
          
          <!-- Order Stats -->
          <div class="order-stats" id="orderStats">
            <div class="stat-card">
              <div class="stat-row">
                <div class="stat-item">
                  <span class="stat-label">Total Orders</span>
                  <span class="stat-value" id="totalOrders">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Completed</span>
                  <span class="stat-value" id="completedOrders">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Processing</span>
                  <span class="stat-value" id="processingOrders">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Total Spent</span>
                  <span class="stat-value" id="totalSpent">PHP 0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Enhanced Filter Bar -->
        <div class="filter-bar">
          <div class="filter-section">
            <input type="text" class="search-input" id="searchInput" placeholder="Search orders..." onkeyup="handleSearch(event)">
            <select class="date-range-select" id="dateRangeSelect" onchange="handleDateRangeChange()">
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 3 Months</option>
              <option value="custom">Custom Range</option>
            </select>
            <div class="custom-date-range" id="customDateRange" style="display: none;">
              <input type="date" id="dateFrom" class="date-input">
              <span>to</span>
              <input type="date" id="dateTo" class="date-input">
            </div>
            <select id="statusFilter" class="status-select" onchange="applyFilters()">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button type="button" class="filter-clear-btn" onclick="clearFilters()">Clear Filters</button>
          </div>
        </div>

        <!-- Table View -->
        <div class="table-view active" id="tableView">
          <div class="orders-table-container">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="orders-table-body">
                <tr>
                  <td colspan="6" class="loading-row">
                    <div class="loading">
                      <div class="spinner"></div>
                      <span>Loading your orders...</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cards View (mobile) -->
        <div class="cards-view" id="cardsView">
          <div id="ordersGrid"></div>
        </div>
      </div>
    </main>
    <div id="footer-container"></div>
  `;

  const navContainer = document.getElementById('navigation-container');
  Navigation(navContainer, { ...communityData, community_type: communityType });
  const footerContainer = document.getElementById('footer-container');
  Footer(footerContainer, { community_type: communityType });
  document.getElementById('back-to-shop')?.addEventListener('click', () => {
    window.location.href = homePath;
  });

  let allOrders = [];
  let currentView = 'table';
  let filteredOrders = [];

  function normalizeStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'pending';
    if (['order placed', 'placed', 'confirmed'].includes(raw)) return 'pending';
    if (raw === 'canceled') return 'cancelled';
    if (raw === 'delivered') return 'completed';
    return raw;
  }

  function formatStatus(value) {
    const normalized = normalizeStatus(value);
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'processing') return 'Processing';
    if (normalized === 'shipped') return 'Shipped';
    if (normalized === 'completed') return 'Completed';
    if (normalized === 'cancelled') return 'Cancelled';
    return String(value || 'Pending');
  }

  function getTrackingNumber(order) {
    const trackingNumber = String(order?.tracking_number ?? order?.trackingNumber ?? '').trim();
    return trackingNumber || '';
  }

  function getCourierName(order) {
    const courier = String(
      order?.courier ??
      order?.courier_name ??
      order?.courierName ??
      order?.shipping_courier ??
      '',
    ).trim();
    return courier || '';
  }

  function getTrackingLabel(order) {
    const trackingNumber = getTrackingNumber(order);
    if (trackingNumber) return trackingNumber;
    const normalizedStatus = normalizeStatus(order?.status);
    if (normalizedStatus === 'shipped' || normalizedStatus === 'completed') {
      return 'Not assigned yet';
    }
    return '';
  }

  function getCourierLabel(order) {
    const courier = getCourierName(order);
    if (courier) return courier;
    const normalizedStatus = normalizeStatus(order?.status);
    if (normalizedStatus === 'shipped' || normalizedStatus === 'completed') {
      return 'Not assigned yet';
    }
    return '';
  }

  function formatMoney(value) {
    return formatPHP(value);
  }

  // Fetch order history
  async function fetchOrderHistory() {
    try {
      // Always call API to get all orders
      const response = await fetch(api('/orders/user'), {
        method: 'GET',
        headers: authHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();
      console.log('Orders fetched:', result);
      
      // Handle different response formats
      const orders = result.orders || result.data || result;
      allOrders = (Array.isArray(orders) ? orders : []).map(order => ({
        ...order,
        status: normalizeStatus(order.status),
        tracking_number: getTrackingNumber(order),
        courier: getCourierName(order),
      }));
      
      // Add user sequence numbers to orders
      allOrders = addUserSequenceNumbers(allOrders);
      filteredOrders = [...allOrders];
      
      updateStats();
      displayOrders();
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Show no orders when API fails
      allOrders = [];
      filteredOrders = [];
      updateStats();
      displayOrders();
    }
  }

  // Add user sequence numbers to orders (1st, 2nd, 3rd, etc.)
  function addUserSequenceNumbers(orders) {
    const ascendingOrders = [...orders].sort((a, b) => getOrderSequenceValue(a) - getOrderSequenceValue(b));
    const ordersWithSequence = ascendingOrders.map((order, index) => ({
      ...order,
      userSequence: index + 1
    }));
    return ordersWithSequence.sort((a, b) => getOrderDisplaySortValue(b) - getOrderDisplaySortValue(a));
  }

  function updateStats() {
    const totalOrders = allOrders.length;
    const completedOrders = allOrders.filter(order => normalizeStatus(order.status) === 'completed').length;
    const processingOrders = allOrders.filter(order => normalizeStatus(order.status) === 'processing').length;
    
    // Fix totalSpent calculation - ensure numbers are properly summed
    const totalSpent = allOrders.reduce((sum, order) => {
      const orderTotal = toSafeNumber(order.total || order.total_amount, 0);
      return sum + orderTotal;
    }, 0);

    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('completedOrders').textContent = completedOrders;
    document.getElementById('processingOrders').textContent = processingOrders;
    document.getElementById('totalSpent').textContent = formatMoney(totalSpent);
  }

  function displayOrders() {
    displayTableView();
    displayCardsView();
  }

  function displayTableView() {
    const container = document.getElementById('orders-table-body');
    
    if (!filteredOrders || filteredOrders.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="6" class="no-orders-row">
            <div class="no-orders">
              <i class="fas fa-search"></i>
              <p>No items found</p>
              <a href="${shopPath}" class="btn btn-primary">Start Shopping</a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const MAX_PREVIEW_ITEMS = 10;

    container.innerHTML = filteredOrders.map(order => {
      const items = order.items || [];
      const displayItems = items.slice(0, MAX_PREVIEW_ITEMS);
      const remainingItems = Math.max(items.length - MAX_PREVIEW_ITEMS, 0);
      
      return `
        <tr class="order-row">
          <td>
            <a href="#" class="order-link">${order.userSequence}</a>
          </td>
          <td>
            <div class="order-date">
              ${new Date(order.created_at).toLocaleDateString()}
              <small>${new Date(order.created_at).toLocaleTimeString()}</small>
            </div>
          </td>
          <td>
            <div class="item-preview">
              <div class="item-thumbnails">
                ${displayItems.map(item => `
                  <img src="${item.product_image || '/square.png'}" 
                       alt="${item.product_name || 'Product'}" 
                       class="thumbnail-img"
                       onerror="this.src='/square.png'">
                `).join('')}
                ${remainingItems > 0 ? `<div class="more-items">+${remainingItems}</div>` : ''}
              </div>
              <div class="item-count">${items.length} item${items.length !== 1 ? 's' : ''}</div>
            </div>
          </td>
          <td>
            <span class="status-badge status-${normalizeStatus(order.status)}">${formatStatus(order.status)}</span>
            ${getCourierLabel(order) ? `<div class="order-item-meta">Courier: ${escapeHtml(getCourierLabel(order))}</div>` : ''}
            ${getTrackingLabel(order) ? `<div class="order-item-meta">Tracking: ${escapeHtml(getTrackingLabel(order))}</div>` : ''}
          </td>
          <td class="order-total">${formatMoney(order.total || order.total_amount || 0)}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="toggleOrderDetails('${order.order_id || order.id}')">
              View Details
            </button>
          </td>
        </tr>
        <tr class="order-details-row" id="details-${order.order_id || order.id}" style="display: none;">
          <td colspan="6">
            <div class="order-details-card">
              <div class="details-header">
                <h4>(Order Details) Your Order #${order.userSequence}</h4>
                <button class="btn btn-sm btn-outline details-close" onclick="toggleOrderDetails('${order.order_id || order.id}')" aria-label="Close order details">
                  &times;
                </button>
              </div>
              <div class="details-content">
                <div class="items-list">
                  <h5>Items:</h5>
                  ${(order.items || []).map(item => `
                    <div class="detail-item">
                      <img src="${item.product_image || '/square.png'}" 
                           alt="${item.product_name || 'Product'}"
                           onerror="this.src='/square.png'">
                      <div class="item-info">
                        <strong>${item.product_name || 'Undefined Product'}</strong>
                        <p>Size: ${escapeHtml(resolveVariantLabel(item) || 'N/A')} | Qty: ${item.quantity}</p>
                        ${getItemShippingMeta(item) ? `<p>${getItemShippingMeta(item)}</p>` : ''}
                        <p>Price: ${formatMoney(item.price)}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="order-summary">
                  <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>${formatMoney(order.subtotal || 0)}</span>
                  </div>
                    ${getCourierLabel(order) ? `
                    <div class="summary-row">
                      <span>Courier:</span>
                      <span>${escapeHtml(getCourierLabel(order))}</span>
                    </div>
                    ` : ''}
                    ${getTrackingLabel(order) ? `
                    <div class="summary-row">
                      <span>Tracking Number:</span>
                      <span>${escapeHtml(getTrackingLabel(order))}</span>
                    </div>
                    ` : ''}
                    <div class="summary-row">
                      <span>Shipping:</span>
                      <span>${formatMoney(order.shipping_fee || 0)}</span>
                    </div>
                    <div class="summary-row">
                      <span>Total Weight:</span>
                      <span>${(order.items || []).reduce((sum, item) => sum + (resolveItemWeightGrams(item) * Number(item.quantity || 0)), 0).toLocaleString()}g</span>
                    </div>
                    ${getOrderPackageLabel(order) ? `
                    <div class="summary-row">
                      <span>Package Size:</span>
                      <span>${escapeHtml(getOrderPackageLabel(order))}</span>
                    </div>
                    ` : ''}
                    <div class="summary-row total">
                    <span>Total:</span>
                    <span>${formatMoney(order.total || order.total_amount || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function displayCardsView() {
    const container = document.getElementById('ordersGrid');
    if (!container) return;
    
    if (!filteredOrders || filteredOrders.length === 0) {
      container.innerHTML = `
        <div class="no-orders-card">
          <i class="fas fa-search"></i>
          <p>No items found</p>
          <a href="${shopPath}" class="btn btn-primary">Start Shopping</a>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredOrders.map(order => {
      const items = order.items || [];
      const displayItems = items.slice(0, 2);
      const remainingItems = items.length - 2;
      const orderDate = new Date(order.created_at);
      
      return `
        <div class="order-card">
          <div class="order-card-header">
            <div class="order-card-title">
              <div>
                <div class="order-number">Order #${escapeHtml(getDisplayOrderNumber(order))}</div>
                <div class="order-date">${orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
            <div class="order-status">
              <span class="status-badge status-${normalizeStatus(order.status)}">${formatStatus(order.status)}</span>
            </div>
          </div>
          
          <div class="order-card-body">
            <div class="order-items-preview">
              ${displayItems.map(item => `
                <div class="order-item-preview">
                  <img src="${item.product_image || '/square.png'}" 
                       alt="${item.product_name || 'Product'}" 
                       class="order-item-image"
                       onerror="this.src='/square.png'">
                <div class="order-item-details">
                  <div class="order-item-name">${item.product_name || 'Product'}</div>
                  <div class="order-item-meta">
                    Size: ${escapeHtml(resolveVariantLabel(item) || 'N/A')} | Qty: ${item.quantity}
                  </div>
                  ${getItemShippingMeta(item) ? `<div class="order-item-meta">${getItemShippingMeta(item)}</div>` : ''}
                  <div class="order-item-price">${formatMoney(item.price)}</div>
                </div>
              </div>
            `).join('')}
              ${remainingItems > 0 ? `
                <div class="more-items-text">+${remainingItems} more item${remainingItems > 1 ? 's' : ''}</div>
              ` : ''}
            </div>
          </div>
          
          <div class="order-card-footer">
            <div>
              <div class="order-total">Total: ${formatMoney(order.total || order.total_amount || 0)}</div>
              ${getCourierLabel(order) ? `<div class="order-item-meta">Courier: ${escapeHtml(getCourierLabel(order))}</div>` : ''}
              ${getTrackingLabel(order) ? `<div class="order-item-meta">Tracking: ${escapeHtml(getTrackingLabel(order))}</div>` : ''}
            </div>
            <div class="order-actions">
              <button class="btn btn-primary" onclick="viewOrderDetails('${order.order_id || order.id}')">View Details</button>
              <button class="btn btn-outline" onclick="reorderOrder('${order.order_id || order.id}')">Reorder</button>
              <button class="btn btn-outline" onclick="trackOrder('${order.order_id || order.id}')">Track Order</button>
              ${normalizeStatus(order.status) === 'pending' ? 
                `<button class="btn btn-danger" onclick="cancelOrder('${order.order_id || order.id}')">Cancel Order</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Make functions available globally
  window.applyFilters = () => {
    console.log('Applying filters...');
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredOrders = allOrders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && normalizeStatus(order.status) !== normalizeStatus(statusFilter)) {
        return false;
      }
      
      // Date filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (new Date(order.created_at) < fromDate) {
          return false;
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (new Date(order.created_at) > toDate) {
          return false;
        }
      }
      
      // Search filter
      if (searchTerm) {
        const orderId = (order.order_id || order.id || '').toString().toLowerCase();
        const orderSequence = String(order.userSequence || '').toLowerCase();
        const hasMatchingItem = (order.items || []).some(item => {
          const itemName = (item.name || item.product_name || '').toString().toLowerCase();
          return itemName.includes(searchTerm);
        });
        
        if (!orderId.includes(searchTerm) && !orderSequence.includes(searchTerm) && !hasMatchingItem) {
          return false;
        }
      }
      
      return true;
    });
    
    displayOrders();
  };

  window.clearFilters = () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('dateRangeSelect').value = 'all';
    document.getElementById('customDateRange').style.display = 'none';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    filteredOrders = [...allOrders];
    displayOrders();
  };

  window.handleSearch = (event) => {
    if (event.key === 'Enter' || event.type === 'keyup') {
      applyFilters();
    }
  };

  window.handleDateRangeChange = () => {
    const dateRangeSelect = document.getElementById('dateRangeSelect');
    const customDateRange = document.getElementById('customDateRange');
    
    if (dateRangeSelect.value === 'custom') {
      customDateRange.style.display = 'flex';
    } else {
      customDateRange.style.display = 'none';
      
      // Apply preset date ranges
      const days = parseInt(dateRangeSelect.value);
      if (days && !isNaN(days)) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        document.getElementById('dateFrom').value = startDate.toISOString().split('T')[0];
        document.getElementById('dateTo').value = endDate.toISOString().split('T')[0];
        
        applyFilters();
      } else if (dateRangeSelect.value === 'all') {
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        applyFilters();
      }
    }
  };

  window.toggleView = (view) => {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Toggle views
    document.getElementById('tableView').classList.toggle('active', view === 'table');
    document.getElementById('cardsView').classList.toggle('active', view === 'cards');
    
    displayOrders();
  };

  window.toggleDropdown = (event, orderId) => {
    event.stopPropagation();
    console.log('toggleDropdown called for orderId:', orderId);
    const button = event.currentTarget;
    console.log('Button element:', button);
    
    // Check if this dropdown is already open
    const existingDropdown = document.getElementById(`dropdown-${orderId}`);
    if (existingDropdown) {
      // Close this dropdown with animation if it's already open
      closeDropdown(existingDropdown);
      return;
    }
    
    // Remove any other existing dropdowns with animation
    const existingDropdowns = document.querySelectorAll('.dropdown-menu.show');
    existingDropdowns.forEach(dropdown => closeDropdown(dropdown));
    
    // Get the order data
    const order = allOrders.find(o => (o.order_id || o.id) === orderId);
    if (!order) {
      console.log('Order not found for orderId:', orderId);
      return;
    }
    console.log('Order found:', order);
    
    // Create dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'dropdown-menu';
    dropdownMenu.id = `dropdown-${orderId}`;
    dropdownMenu.setAttribute('role', 'menu');
    dropdownMenu.setAttribute('aria-labelledby', `dropdown-toggle-${orderId}`);
    
    // Add menu items with proper accessibility attributes
    const menuItems = [
      {
        icon: 'fas fa-eye',
        text: 'View Details',
        action: `viewOrderDetails('${orderId}')`,
        role: 'menuitem'
      },
      {
        icon: 'fas fa-redo',
        text: 'Reorder',
        action: `reorderOrder('${orderId}')`,
        role: 'menuitem'
      },
      ...(normalizeStatus(order.status) === 'pending' ? [{
        icon: 'fas fa-times',
        text: 'Cancel Order',
        action: `cancelOrder('${orderId}')`,
        role: 'menuitem',
        className: 'danger-item'
      }] : []),
      {
        icon: 'fas fa-share-alt',
        text: 'Share Order',
        action: `shareOrder('${orderId}')`,
        role: 'menuitem'
      },
      {
        icon: 'fas fa-truck',
        text: getTrackingNumber(order) ? 'View Tracking' : 'Track Order',
        action: `trackOrder('${orderId}')`,
        role: 'menuitem'
      },
      {
        icon: 'fas fa-download',
        text: 'Download Invoice',
        action: `downloadInvoice('${orderId}')`,
        role: 'menuitem'
      }
    ];
    
    dropdownMenu.innerHTML = menuItems.map(item => `
      <a href="#" 
         onclick="event.stopPropagation(); event.preventDefault(); ${item.action}"
         role="${item.role}"
         class="dropdown-item ${item.className || ''}"
         tabindex="-1">
        <i class="${item.icon}"></i>
        <span>${item.text}</span>
      </a>
    `).join('');
    
    // Append dropdown to body to escape overflow containers
    document.body.appendChild(dropdownMenu);
    console.log('Dropdown appended to body:', dropdownMenu);
    
    // Position the dropdown with enhanced logic
    positionDropdown(dropdownMenu, button);
    
    // Add button ID for accessibility
    button.id = `dropdown-toggle-${orderId}`;
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'true');
    
    // Show dropdown with animation
    requestAnimationFrame(() => {
      dropdownMenu.classList.add('show');
    });
    
    // Focus first menu item for keyboard navigation
    const firstMenuItem = dropdownMenu.querySelector('.dropdown-item');
    if (firstMenuItem) {
      firstMenuItem.focus();
    }
    
    console.log('Dropdown created and positioned:', { orderId });
  };

  // Enhanced dropdown positioning function
  function positionDropdown(dropdown, button) {
    const buttonRect = button.getBoundingClientRect();
    const dropdownWidth = 200; // Increased width for better spacing
    const dropdownHeight = dropdown.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    const scrollLeft = window.scrollX;
    
    // Calculate initial position
    let left = buttonRect.right + scrollLeft - dropdownWidth;
    let top = buttonRect.bottom + scrollTop + 5;
    
    // Check if dropdown would go off the right side of viewport
    if (left + dropdownWidth > viewportWidth + scrollLeft - 10) {
      left = buttonRect.left + scrollLeft - dropdownWidth + buttonRect.width;
    }
    
    // Check if dropdown would go off the left side of viewport
    if (left < scrollLeft + 10) {
      left = scrollLeft + 10;
    }
    
    // Check if dropdown would go off the bottom of viewport
    if (top + dropdownHeight > viewportHeight + scrollTop - 10) {
      // Position above the button instead
      top = buttonRect.top + scrollTop - dropdownHeight - 5;
    }
    
    // Ensure minimum distance from edges
    left = Math.max(scrollLeft + 10, Math.min(left, viewportWidth + scrollLeft - dropdownWidth - 10));
    top = Math.max(scrollTop + 10, Math.min(top, viewportHeight + scrollTop - dropdownHeight - 10));
    
    // Apply positioning
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.zIndex = '10000';
    dropdown.style.minWidth = `${dropdownWidth}px`;
    dropdown.style.maxWidth = `${dropdownWidth}px`;
  }
  
  // Enhanced dropdown closing function with animation
  function closeDropdown(dropdown) {
    if (!dropdown) return;
    
    // Update button aria attributes
    const buttonId = dropdown.id.replace('dropdown-', 'dropdown-toggle-');
    const button = document.getElementById(buttonId);
    if (button) {
      button.setAttribute('aria-expanded', 'false');
    }
    
    // Add closing animation
    dropdown.classList.add('closing');
    
    // Remove after animation completes
    setTimeout(() => {
      if (dropdown.parentNode) {
        dropdown.remove();
      }
    }, 150); // Match CSS animation duration
  }
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown-toggle') && !event.target.closest('.dropdown-menu')) {
      const dropdowns = document.querySelectorAll('.dropdown-menu.show');
      dropdowns.forEach(dropdown => closeDropdown(dropdown));
    }
  });
  
  // Enhanced keyboard navigation for dropdowns
  document.addEventListener('keydown', (event) => {
    const activeDropdown = document.querySelector('.dropdown-menu.show');
    if (!activeDropdown) {
      if (event.key === 'Escape') {
        const dropdowns = document.querySelectorAll('.dropdown-menu.show');
        dropdowns.forEach(dropdown => closeDropdown(dropdown));
      }
      return;
    }
    
    const menuItems = Array.from(activeDropdown.querySelectorAll('.dropdown-item'));
    const currentIndex = menuItems.findIndex(item => item === document.activeElement);
    
    switch (event.key) {
      case 'Escape':
        closeDropdown(activeDropdown);
        // Return focus to the toggle button
        const buttonId = activeDropdown.id.replace('dropdown-', 'dropdown-toggle-');
        const button = document.getElementById(buttonId);
        if (button) {
          button.focus();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems[nextIndex].focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = currentIndex === -1 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length;
        menuItems[prevIndex].focus();
        break;
      case 'Home':
        event.preventDefault();
        if (menuItems.length > 0) {
          menuItems[0].focus();
        }
        break;
      case 'End':
        event.preventDefault();
        if (menuItems.length > 0) {
          menuItems[menuItems.length - 1].focus();
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (document.activeElement.classList.contains('dropdown-item')) {
          document.activeElement.click();
        }
        break;
    }
  });
  
  // Handle window resize to reposition dropdowns
  window.addEventListener('resize', () => {
    const dropdowns = document.querySelectorAll('.dropdown-menu.show');
    dropdowns.forEach(dropdown => {
      const orderId = dropdown.id.replace('dropdown-', '');
      const button = document.getElementById(`dropdown-toggle-${orderId}`);
      if (button) {
        positionDropdown(dropdown, button);
      }
    });
  });

  window.toggleMobileOrderDetails = (orderId) => {
    const detailsRow = document.getElementById(`mobile-details-${orderId}`);
    if (detailsRow) {
      detailsRow.style.display = detailsRow.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.toggleOrderDetails = (orderId) => {
    const detailsRow = document.getElementById(`details-${orderId}`);
    if (detailsRow) {
      detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
    }
  };

  window.deleteOrder = async (orderId) => {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        const response = await fetch(api(`/orders/${orderId}`), {
          method: 'DELETE',
          headers: authHeaders()
        });
        
        if (response.ok) {
          // Remove order from both arrays
          allOrders = allOrders.filter(order => (order.order_id || order.id) !== orderId);
          filteredOrders = filteredOrders.filter(order => (order.order_id || order.id) !== orderId);
          
          // Update display
          updateStats();
          displayOrders();
          
          // Show success message
          alert('Order deleted successfully!');
        } else {
          alert('Failed to delete order. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order. Please try again.');
      }
    }
  };

  window.viewOrderDetails = (orderId) => {
    console.log('Viewing order details for:', orderId);
    // TODO: Implement order details view
  };

  window.reorderOrder = async (orderId) => {
    console.log('Reordering order:', orderId);
    try {
      // Get the specific order details
      const response = await fetch(api(`/orders/${orderId}`), {
        method: 'GET',
        headers: authHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        const order = result.order || result;
        const existingOrder = allOrders.find(entry => String(entry.order_id || entry.id) === String(orderId));
        const displayOrderNumber = getDisplayOrderNumber(existingOrder || order);
        
        if (order.items && order.items.length > 0) {
          // Add items to cart
          for (const item of order.items) {
            try {
              const cartResponse = await fetch(api('/cart/add'), {
                method: 'POST',
                headers: {
                  ...authHeaders(),
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  variantId: item.variant_id,
                  quantity: item.quantity
                })
              });
              
              if (cartResponse.ok) {
                console.log(`Added ${item.product_name} to cart`);
              }
            } catch (error) {
              console.error('Error adding item to cart:', error);
            }
          }
          
          sessionStorage.setItem('openCartOnLoad', '1');
          alert(`All items from Order #${displayOrderNumber} have been added to your cart. Redirecting to shop...`);
          // Redirect to cart page
          window.location.href = communityCartPath;
        } else {
          alert('No items found in this order to reorder.');
        }
      } else {
        const error = await response.json();
        alert(`Failed to get order details: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Reorder error:', error);
      alert('Failed to reorder. Please try again.');
    }
  };

  window.trackOrder = (orderId) => {
    console.log('Tracking order:', orderId);
    const order = allOrders.find(entry => String(entry.order_id || entry.id) === String(orderId));
    const trackingNumber = getTrackingNumber(order);
    const displayOrderNumber = getDisplayOrderNumber(order);

    if (!trackingNumber) {
      alert('Tracking number is not available yet for this order.');
      return;
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(trackingNumber).catch(() => {});
    }

    alert(`Tracking number for Order #${displayOrderNumber}: ${trackingNumber}`);
  };

  window.cancelOrder = async (orderId) => {
    console.log('Cancelling order:', orderId);
    const order = allOrders.find(entry => String(entry.order_id || entry.id) === String(orderId));
    const displayOrderNumber = getDisplayOrderNumber(order);
    if (confirm(`Are you sure you want to cancel Order #${displayOrderNumber}?`)) {
      try {
        const response = await fetch(api(`/orders/${orderId}/cancel`), {
          method: 'PUT',
          headers: authHeaders()
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Order cancelled:', result);
          // Refresh the order list to show updated status
          await fetchOrderHistory();
          // Show success message
          alert(`Order #${displayOrderNumber} has been cancelled successfully.`);
        } else {
          const error = await response.json();
          console.error('Cancel order error:', error);
          alert(`Failed to cancel order: ${error.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Cancel order error:', error);
        alert('Failed to cancel order. Please try again.');
      }
    }
  };

  window.downloadInvoice = (orderId) => {
    console.log('Downloading invoice for order:', orderId);
    // TODO: Implement invoice download
  };

  // Initialize the page
  fetchOrderHistory();
}
