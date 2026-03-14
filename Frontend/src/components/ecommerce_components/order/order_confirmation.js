import Navigation from '../navigation.js';
import Footer from '../footer.js';
import { api } from '../../../services/ecommerce_services/config.js';
import { authHeaders } from '../../../services/ecommerce_services/auth/auth.js';
import '../../../styles/ecommerce_styles/order_confirmation.css';

const moneyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function resolveItemWeightGrams(item) {
  const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
  if (Number.isFinite(explicitWeight) && explicitWeight > 0) return explicitWeight;
  return 0;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPeso(value) {
  const amount = Number(value);
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatPaymentMethod(value) {
  const method = String(value || '').trim().toLowerCase();
  if (!method) return 'Not specified';
  if (method === 'cod') return 'Cash on Delivery';
  return method
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStatusTitle(value) {
  const status = String(value || '').trim().toLowerCase();
  if (!status) return 'Pending';
  if (['pending', 'order placed', 'placed', 'confirmed'].includes(status)) return 'Pending';
  if (['processing', 'preparing', 'in process'].includes(status)) return 'Processing';
  if (['shipped', 'in transit', 'out for delivery'].includes(status)) return 'Shipped';
  if (['delivered', 'completed'].includes(status)) return 'Completed';
  return value;
}

function getStatusIndex(value) {
  const normalized = formatStatusTitle(value);
  const statuses = ['Pending', 'Processing', 'Shipped', 'Completed'];
  const index = statuses.indexOf(normalized);
  return index >= 0 ? index : 0;
}

function buildAddressLines(address) {
  if (!address) return [];
  if (typeof address === 'string') return [address];

  const street = address.street || address.streetAddress || address.address_line1 || '';
  const barangay = address.barangayText || address.barangay || '';
  const city = address.cityText || address.city_municipality || address.cityMunicipality || address.city || '';
  const province = address.provinceText || address.province || '';
  const region = address.regionText || address.region_name || address.region || '';
  const zip = address.zipCode || address.zip_code || address.zip || '';

  const locality = [barangay, city, province].filter(Boolean).join(', ');
  const finalLine = [region, zip].filter(Boolean).join(' ');

  return [street, locality, finalLine].filter(Boolean);
}

function createCheckIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

function createActionMarkup(label, id, variant) {
  return `<button id="${id}" class="btn ${variant}">${escapeHtml(label)}</button>`;
}

export default function OrderConfirmation(payload = null) {
  const root = document.getElementById('app');
  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const urlCommunityType =
    pathParts[0] === 'fanhub' && pathParts[1] === 'community-platform' && pathParts[2]
      ? pathParts[2]
      : (pathParts[0] === 'fanhub' ? pathParts[1] : '');
  const communityType = String(
    payload?.communityType || payload?.communityData?.community_type || urlCommunityType || '',
  ).trim().toLowerCase();
  const communityData = payload?.communityData || {};
  const orderData = (payload && (payload.communityData || payload.communityType))
    ? (payload.orderData || null)
    : payload;
  const orderHistoryPath = communityType ? `/fanhub/${communityType}/order-history` : '/order-history';
  const shopPath = communityType ? `/fanhub/${communityType}/shop` : '/shop';

  document.body.classList.add('ec-order-confirmation-page');

  root.innerHTML = `
    <div id="navigation-container"></div>
    <main class="order-confirmation-page-shell">
      <section class="order-confirm-section order-confirmation-page">
        <div class="container confirmation-container">
          <div class="confirmation-hero">
            <div class="confirmation-mark">${createCheckIconMarkup()}</div>
            <p class="order-number-wrap">
              <span class="order-number-label">Order Number</span>
              <span id="orderNumber" class="order-number-pill">Preparing your order reference</span>
            </p>
            <h2 class="section-title">Order Successful</h2>
            <p class="order-message">Your order is now pending. We will process it and update the tracking steps below.</p>
          </div>

          <div id="orderSummary" class="order-summary">
            <div class="loading">Loading order details...</div>
          </div>

          <section class="order-status-info">
            <div class="confirmation-section-heading">
              <div>
                <p class="section-eyebrow">Order progress</p>
                <h3>What happens next</h3>
              </div>
            </div>
            <div class="status-timeline" id="statusTimelineContainer"></div>
          </section>

          <div class="action-buttons">
            ${createActionMarkup('View Order History', 'viewOrderHistoryBtn', 'btn-primary')}
            ${createActionMarkup('Continue Shopping', 'continueShoppingBtn', 'btn-secondary')}
          </div>
        </div>
      </section>
    </main>
    <div id="footer-container"></div>
  `;

  const navContainer = document.getElementById('navigation-container');
  Navigation(navContainer, communityData);
  const footerContainer = document.getElementById('footer-container');
  Footer(footerContainer, { community_type: communityType });

  const historyButton = document.getElementById('viewOrderHistoryBtn');
  const shopButton = document.getElementById('continueShoppingBtn');

  historyButton?.addEventListener('click', () => {
    window.location.href = orderHistoryPath;
  });

  shopButton?.addEventListener('click', () => {
    window.location.href = shopPath;
  });

  async function fetchCanonicalOrder(orderId) {
    const numericOrderId = Number(orderId || 0);
    if (!Number.isFinite(numericOrderId) || numericOrderId <= 0) return null;

    try {
      const response = await fetch(api(`/orders/${numericOrderId}`), {
        method: 'GET',
        headers: authHeaders(),
      });
      if (!response.ok) return null;
      const result = await response.json().catch(() => ({}));
      return result.order || result.data || result || null;
    } catch (_) {
      return null;
    }
  }

  function generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
  }

  async function loadOrderData() {
    try {
      let order = orderData;
      const storedOrderId = Number(
        orderData?.order_id ||
        orderData?.id ||
        sessionStorage.getItem('lastOrderId') ||
        0,
      );
      const canonicalOrder = await fetchCanonicalOrder(storedOrderId);
      if (canonicalOrder) {
        order = canonicalOrder;
      }

      const sessionOrderData = sessionStorage.getItem('lastOrderData');
      const localOrderData = localStorage.getItem('lastOrder');

      if (!order && sessionOrderData) {
        order = JSON.parse(sessionOrderData);
      } else if (!order && localOrderData) {
        order = JSON.parse(localOrderData);
      } else if (!order) {
        try {
          const response = await fetch(api('/orders/user'), {
            method: 'GET',
            headers: authHeaders(),
          });

          if (response.ok) {
            const result = await response.json();
            const orders = result.orders || result.data || result;
            if (Array.isArray(orders) && orders.length > 0) {
              order = orders[0];
            }
          }
        } catch (_) {}
      }

      if (order) {
        const orderNumberElement = document.getElementById('orderNumber');
        if (orderNumberElement) {
          if (order.order_id) {
            const userOrderSequence = await getUserOrderSequence(order.order_id);
            orderNumberElement.textContent = `#BINI-${order.order_id} / Order ${userOrderSequence}`;
          } else if (order.id) {
            orderNumberElement.textContent = `#${order.id}`;
          } else {
            orderNumberElement.textContent = `#BINI-${generateOrderNumber()}`;
          }
        }

        displayOrderSummary(order);
        displayStatusTimeline(order.status || 'Pending');
      } else {
        displayDemoOrder();
      }
    } catch (error) {
      console.error('Error loading order data:', error);
      displayDemoOrder();
    }
  }

  async function getUserOrderSequence(currentOrderId) {
    try {
      const response = await fetch(api('/orders/user'), {
        method: 'GET',
        headers: authHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        const orders = result.orders || result.data || result;

        if (Array.isArray(orders)) {
          const sortedOrders = orders.sort((a, b) => (a.order_id || a.id) - (b.order_id || b.id));
          const sequence = sortedOrders.findIndex(order => (order.order_id || order.id) === currentOrderId) + 1;
          return sequence > 0 ? sequence : 1;
        }
      }
    } catch (error) {
      console.error('Error getting user order sequence:', error);
    }
    return 1;
  }

  function displayOrderSummary(order) {
    const summaryContainer = document.getElementById('orderSummary');
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = Number(
      order.subtotal || items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0),
    );
    const shipping = Number(order.shipping_fee || order.shipping || 0);
    const totalWeightGrams = items.reduce(
      (sum, item) => sum + (resolveItemWeightGrams(item) * Number(item.quantity || 0)),
      0,
    );
    const total = Number(order.total || order.total_amount || (subtotal + shipping));
    const shippingAddress = order.shipping_address || order.shippingAddress || {};
    const paymentMethod = formatPaymentMethod(order.payment_method || order.paymentMethod);
    const recipientName = shippingAddress.recipient_name || shippingAddress.recipientName || order.customer_name || '';
    const contactNumber = shippingAddress.phone || shippingAddress.contact_number || order.phone || '';
    const trackingNumber = String(order.tracking_number || '').trim();
    const addressLines = buildAddressLines(shippingAddress);

    const itemMarkup = items.length
      ? items.map(item => {
        const quantity = Number(item.quantity || item.qty || 0);
        const unitPrice = Number(item.display_price || item.price || 0);
        const itemTotal = unitPrice * quantity;
        const variant = item.size || item.variant_name || item.product_variant || '';
        const weight = resolveItemWeightGrams(item) * quantity;
        return `
          <article class="confirm-item">
            <img src="${escapeHtml(item.image_url || item.image || item.product_image || '/placeholder.jpg')}" alt="${escapeHtml(item.name || item.product_name || 'Product')}">
            <div class="confirm-item-content">
              <div class="confirm-item-copy">
                <p class="confirm-item-title">${escapeHtml(item.name || item.product_name || 'Undefined Product')}</p>
                <p class="confirm-item-variant">${escapeHtml(variant || 'Standard selection')}</p>
                <div class="confirm-item-meta">
                  <span>Qty ${escapeHtml(quantity)}</span>
                  <span>Weight ${escapeHtml(weight.toLocaleString())}g</span>
                </div>
              </div>
              <p class="confirm-item-price">${escapeHtml(formatPeso(itemTotal))}</p>
            </div>
          </article>
        `;
      }).join('')
      : `
        <div class="confirmation-empty">
          <p>No item details were attached to this order.</p>
        </div>
      `;

    const addressMarkup = addressLines.length
      ? addressLines.map(line => `<p>${escapeHtml(line)}</p>`).join('')
      : '<p>Address not provided.</p>';

    summaryContainer.innerHTML = `
      <div class="confirmation-grid">
        <section class="confirmation-panel order-details">
          <div class="confirmation-section-heading">
            <div>
              <p class="section-eyebrow">Order details</p>
              <h3>Items in this order</h3>
            </div>
            <span class="section-chip">${escapeHtml(items.length)} ${items.length === 1 ? 'item' : 'items'}</span>
          </div>

          <div class="confirm-item-list">
            ${itemMarkup}
          </div>

          <div class="order-totals">
            <div class="total-card">
              <span class="total-card-label">Subtotal</span>
              <strong>${escapeHtml(formatPeso(subtotal))}</strong>
            </div>
            <div class="total-card">
              <span class="total-card-label">Shipping</span>
              <strong>${escapeHtml(formatPeso(shipping))}</strong>
            </div>
            <div class="total-card">
              <span class="total-card-label">Total Weight</span>
              <strong>${escapeHtml(totalWeightGrams.toLocaleString())}g</strong>
            </div>
            <div class="total-card total-card--accent">
              <span class="total-card-label">Total</span>
              <strong>${escapeHtml(formatPeso(total))}</strong>
            </div>
          </div>
        </section>

        <aside class="confirmation-side">
          <section class="info-card shipping-info">
            <div class="confirmation-section-heading">
              <div>
                <p class="section-eyebrow">Delivery details</p>
                <h3>Shipping address</h3>
              </div>
            </div>
            <div class="info-stack">
              ${recipientName ? `<div class="info-row"><span class="info-label">Recipient</span><p>${escapeHtml(recipientName)}</p></div>` : ''}
              ${contactNumber ? `<div class="info-row"><span class="info-label">Contact</span><p>${escapeHtml(contactNumber)}</p></div>` : ''}
              <div class="info-row">
                <span class="info-label">Address</span>
                <div class="address-lines">
                  ${addressMarkup}
                </div>
              </div>
            </div>
          </section>

          <section class="info-card payment-card">
            <div class="confirmation-section-heading">
              <div>
                <p class="section-eyebrow">Payment</p>
                <h3>Payment method</h3>
              </div>
            </div>
            <div class="payment-pill">${escapeHtml(paymentMethod)}</div>
            ${trackingNumber ? `<p class="payment-note">Tracking number: <strong>${escapeHtml(trackingNumber)}</strong></p>` : ''}
            <p class="payment-note">Payment is collected according to your selected checkout method.</p>
          </section>
        </aside>
      </div>
    `;
  }

  function displayStatusTimeline(currentStatus) {
    const statusContainer = document.getElementById('statusTimelineContainer');
    const activeIndex = getStatusIndex(currentStatus);
    const steps = [
      { badge: '01', title: 'Pending', desc: 'We received your order.' },
      { badge: '02', title: 'Processing', desc: 'We are preparing your items.' },
      { badge: '03', title: 'Shipped', desc: 'Your parcel is on the way.' },
      { badge: '04', title: 'Completed', desc: 'Your order has been delivered successfully.' },
    ];

    statusContainer.innerHTML = steps.map((step, index) => {
      let stepClass = 'status-step';
      if (index === activeIndex) stepClass += ' active';
      if (index < activeIndex) stepClass += ' completed';

      return `
        <div class="${stepClass}">
          <div class="step-badge">${step.badge}</div>
          <div class="step-text">
            <strong>${escapeHtml(step.title)}</strong>
            <p>${escapeHtml(step.desc)}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  function displayDemoOrder() {
    const orderNumberElement = document.getElementById('orderNumber');
    if (orderNumberElement) {
      orderNumberElement.textContent = `#BINI-${generateOrderNumber()}`;
    }

    const demoOrder = {
      id: 'BINI-230417',
      status: 'Pending',
      items: [
        {
          name: 'BINI logo hoodie',
          size: 'Medium',
          quantity: 1,
          price: 1850,
          image_url: 'https://placekitten.com/80/80?image=1',
        },
        {
          name: 'Lightstick mini',
          size: 'One size',
          quantity: 2,
          price: 450,
          image_url: 'https://placekitten.com/80/80?image=4',
        },
      ],
      shipping: 150,
      total_amount: 2900,
      payment_method: 'cod',
      shipping_address: {
        street: '15 Eastwood Ave',
        city: 'Quezon City',
        region: 'Metro Manila',
        zip: '1110',
      },
    };

    displayOrderSummary(demoOrder);
    displayStatusTimeline(demoOrder.status);
  }

  loadOrderData();
}
