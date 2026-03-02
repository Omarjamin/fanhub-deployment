import { placeOrder } from '../../../services/ecommerce_services/order/place_order.js';

function resolveItemWeightGrams(item) {
    const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
    if (Number.isFinite(explicitWeight) && explicitWeight > 0) return explicitWeight;
    return 0;
}

export default function OrderReview(root) {
    try {
        const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
        const communityType = pathParts[0] === 'fanhub' && pathParts[1] ? pathParts[1] : '';

        /* =========================
           1. READ SESSION DATA
        ========================= */
        const readJSON = (key, fallback = null) =>
            JSON.parse(sessionStorage.getItem(key) || JSON.stringify(fallback));

        const selectedAddress = readJSON('selectedAddress');
        const selectedPayment = readJSON('selectedPayment');
        const checkoutItems = readJSON('checkoutItems', []);
        const cartItems = readJSON('cartItems', []);

        const legacyShipping = readJSON('shippingData');
        const legacyPayment = readJSON('paymentData');

        const checkoutSummary = readJSON('checkoutSummary');
        const computedTotals = readJSON('computedTotals');
        const orderData = readJSON('orderData');

        const shippingFeeStored = sessionStorage.getItem('shippingFee');

        /* =========================
           2. RESOLVE FINAL DATA
        ========================= */
        const address = selectedAddress || legacyShipping;
        const payment = selectedPayment || legacyPayment;
        const items = checkoutItems.length ? checkoutItems : cartItems;

        const rawTotals = checkoutSummary || computedTotals || orderData;

        // Prefer real-time shippingFee from sessionStorage over checkoutSummary
        const shippingFeeVal = shippingFeeStored 
            ? Number(shippingFeeStored) 
            : (rawTotals?.shippingFee ?? rawTotals?.shipping_fee ?? 0);

        const totals = rawTotals
            ? {
                  ...rawTotals,
                  shippingFee: shippingFeeVal,
              }
            : null;

        const hasAddress = Boolean(address);
        const hasPayment = Boolean(payment);
        const hasItems = items.length > 0;

        const disablePlaceOrder = !(hasAddress && hasPayment && hasItems);

        /* =========================
           3. RENDER UI
        ========================= */
        root.className = 'form-container';
        root.innerHTML = `
            <div class="order-review-card">
                <div class="order-review-header">
                    <h3 class="order-review-title">Order Review</h3>
                    <p class="order-review-subtitle">Please review your order details before placing</p>
                </div>

                <div class="review-sections">
                    ${renderAddress(address)}
                    ${renderPayment(payment)}
                    ${renderItems(items)}
                    ${renderTotals(totals)}
                </div>

                <div class="order-actions">
                    <button id="placeOrderBtn" class="btn-confirm-order" ${disablePlaceOrder ? 'disabled' : ''}>
                        <span class="btn-icon">✓</span>
                        <span>Place Order</span>
                    </button>
                </div>
            </div>
        `;

        createHiddenForms(root, address || {}, payment || {});
        bindEditLinks(root);

        // Setup Place Order button functionality
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', async () => {
                if (disablePlaceOrder) {
                    alert('Please complete all required information before placing order.');
                    return;
                }

                // Disable button while placing order
                placeOrderBtn.disabled = true;
                const origText = placeOrderBtn.textContent;
                placeOrderBtn.textContent = 'Placing order...';

                try {
                    const result = await placeOrder();
                    if (result && result.success) {
                        // Redirect to confirmation with order id if available
                        const id = result.orderId || sessionStorage.getItem('lastOrderId');
                        const confirmationPath = communityType
                            ? `/fanhub/${communityType}/order-confirmation`
                            : '/order-confirmation';
                        window.location.href = id
                            ? `${confirmationPath}?orderId=${id}`
                            : confirmationPath;
                    } else {
                        alert('Order placed (no confirmation).');
                    }
                } catch (err) {
                    console.error('Place order failed:', err);
                    alert('Failed to place order: ' + (err.message || 'Server error'));
                } finally {
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.textContent = origText;
                }
            });
        }

    } catch (err) {
        console.error('OrderReview error:', err);
        root.innerHTML = '<p>Error loading order review.</p>';
    }
}

/* =========================
   RENDER HELPERS
========================= */
function renderAddress(address) {
    const fullAddress = address
        ? (address.fullAddress ||
           [address.street, address.barangayText, address.cityText, address.province]
               .filter(Boolean)
               .join(', '))
        : null;
    
    return `
        <div class="review-section shipping-section">
            <div class="section-header">
                <div class="section-title">
                    <span class="section-icon">📦</span>
                    <span>Shipping Address</span>
                </div>
                <a href="#" class="edit-link" data-step="1">
                    <span>Edit</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </a>
            </div>
            <div class="section-content">
                ${
                    fullAddress
                        ? `
                            <div class="info-item">
                                <span class="info-label">Delivery Address</span>
                                <span class="info-value">${fullAddress}</span>
                            </div>
                            ${address.recipient_name ? `
                                <div class="info-item">
                                    <span class="info-label">Recipient</span>
                                    <span class="info-value">${address.recipient_name}</span>
                                </div>
                            ` : ''}
                            ${address.phone ? `
                                <div class="info-item">
                                    <span class="info-label">Contact</span>
                                    <span class="info-value">${address.phone}</span>
                                </div>
                            ` : ''}
                          `
                        : `<div class="info-empty">No shipping address selected.</div>`
                }
            </div>
        </div>
    `;
}

function renderPayment(payment) {
    const paymentMethod = payment
        ? (payment.methodText || payment.name || payment.method)
        : null;
    
    return `
        <div class="review-section payment-section">
            <div class="section-header">
                <div class="section-title">
                    <span class="section-icon">💳</span>
                    <span>Payment Method</span>
                </div>
                <a href="#" class="edit-link" data-step="2">
                    <span>Change</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </a>
            </div>
            <div class="section-content">
                ${
                    paymentMethod
                        ? `
                            <div class="info-item">
                                <span class="info-label">Payment Method</span>
                                <span class="info-value payment-method">${paymentMethod}</span>
                            </div>
                            <div class="payment-note">
                                <span class="note-icon">ℹ️</span>
                                <span>Payment will be collected upon delivery</span>
                            </div>
                          `
                        : `<div class="info-empty">No payment method selected.</div>`
                }
            </div>
        </div>
    `;
}

function renderItems(items) {
    return `
        <div class="review-section items-section">
            <div class="section-header">
                <div class="section-title">
                    <span class="section-icon">🛒</span>
                    <span>Order Items</span>
                </div>
                <span class="item-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div class="section-content">
                ${
                    items.length === 0
                        ? `<div class="info-empty">No items in cart.</div>`
                        : `
                            <div class="items-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items
                                            .map(it => {
                                                const productName = it.product_name || it.name || 'Unknown Product';
                                                const quantity = it.quantity || it.qty || 1;
                                                const price = parseFloat(it.display_price || it.price || 0);
                                                const subtotal = price * quantity;
                                                return `
                                                    <tr>
                                                        <td class="product-name">${productName}<br><small>${(resolveItemWeightGrams(it) * Number(quantity || 0)).toLocaleString()}g total</small></td>
                                                        <td class="quantity">${quantity}</td>
                                                        <td class="price">₱${price.toFixed(2)}</td>
                                                        <td class="subtotal">₱${subtotal.toFixed(2)}</td>
                                                    </tr>
                                                `;
                                            })
                                            .join('')}
                                    </tbody>
                                </table>
                            </div>
                          `
                }
            </div>
        </div>
    `;
}

function renderTotals(totals) {
    if (!totals) {
        return `
            <div class="review-section totals-section">
                <div class="info-empty">Order totals are not available.</div>
            </div>
        `;
    }

    const subtotalVal = Number(totals.subtotal ?? totals.sub_total ?? 0);
    const shippingFeeVal = Number(totals.shippingFee ?? totals.shipping_fee ?? totals.shipping ?? 0);
    const codFeeVal = Number(totals.codFee ?? totals.cod_fee ?? 0) || 0;
    const checkoutItems = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]');
    const totalWeightGrams = Array.isArray(checkoutItems) && checkoutItems.length > 0
        ? checkoutItems.reduce((sum, item) => sum + (resolveItemWeightGrams(item) * Number(item?.quantity || 0)), 0)
        : Number(totals.total_weight_grams ?? sessionStorage.getItem('checkoutWeightGrams') ?? 0);
    // Always recalculate total from components to ensure shipping fee update is reflected
    const totalVal = subtotalVal + shippingFeeVal + codFeeVal;

    return `
        <div class="review-section totals-section">
            <div class="section-header">
                <div class="section-title">
                    <span class="section-icon">🧾</span>
                    <span>Price Summary</span>
                </div>
            </div>
            <div class="section-content">
                <div class="totals-list">
                    <div class="total-row">
                        <span class="total-label">Subtotal</span>
                        <span class="total-value">₱${subtotalVal.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Shipping Fee</span>
                        <span class="total-value">₱${shippingFeeVal.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Total Weight</span>
                        <span class="total-value">${Number(totalWeightGrams || 0).toLocaleString()}g</span>
                    </div>
                    ${
                        (codFeeVal > 0)
                            ? `
                                <div class="total-row">
                                    <span class="total-label">COD Fee</span>
                                    <span class="total-value">₱${codFeeVal.toFixed(2)}</span>
                                </div>
                              `
                            : ''
                    }
                    <div class="total-divider"></div>
                    <div class="total-row total-final">
                        <span class="total-label">Total Amount</span>
                        <span class="total-value final-amount">₱${totalVal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* =========================
   EVENTS
========================= */
function bindEditLinks(root) {
    root.querySelectorAll('.edit-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            sessionStorage.setItem('checkoutStep', link.dataset.step);
            window.dispatchEvent(new Event('stepChanged'));
        });
    });
}

// Place order is handled by the checkout buttons component; no inline handler here.

/* =========================
   HIDDEN FORMS
========================= */
function createHiddenForms(root, address = {}, payment = {}) {
    const holder = document.createElement('div');
    holder.style.display = 'none';

    holder.innerHTML = `
        <form id="shippingForm">
            <input type="hidden" id="street" value="${address.street || ''}">
            <input type="hidden" id="region" value="${address.region || ''}">
            <input type="hidden" id="province" value="${address.province || ''}">
            <input type="hidden" id="city" value="${address.city || ''}">
            <input type="hidden" id="barangay" value="${address.barangay || ''}">
            <input type="hidden" id="zip" value="${address.zip || ''}">
        </form>

        <form id="paymentForm">
            <input type="hidden" id="paymentMethod" value="${payment.method || ''}">
        </form>
    `;

    root.appendChild(holder);
}
