import { placeOrder } from '../../../services/ecommerce_services/order/place_order.js';
import {
    calculateCheckoutSummary,
    fetchCheckoutDraft,
    getCachedCheckoutDraft,
    getCheckoutDraftEventName,
    resolveItemWeightGrams,
    setCheckoutDraftStep,
} from '../../../services/ecommerce_services/checkout/checkout_draft.js';

const peso = '\u20B1';

function formatPeso(value) {
    return `${peso}${Number(value || 0).toFixed(2)}`;
}

function getCommunityTypeFromPath() {
    const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
    return pathParts[0] === 'fanhub'
        ? (pathParts[1] === 'community-platform' ? (pathParts[2] || '') : (pathParts[1] || ''))
        : '';
}

function getReviewState() {
    const draft = getCachedCheckoutDraft();
    const address = draft.shipping_address;
    const payment = draft.payment_data;
    const items = Array.isArray(draft.checkout_items) ? draft.checkout_items : [];
    const shippingFee = draft.shipping_fee ?? draft.summary_data?.shipping_fee ?? 0;
    const summary = {
        ...calculateCheckoutSummary(items, shippingFee),
        ...(draft.summary_data || {}),
        shipping_fee: shippingFee,
        total_weight_grams: Number(
            draft.checkout_weight_grams
            ?? draft.summary_data?.total_weight_grams
            ?? calculateCheckoutSummary(items, shippingFee).total_weight_grams,
        ) || 0,
    };
    summary.total = Number(summary.subtotal || 0) + Number(summary.shipping_fee || 0);

    return {
        draft,
        address,
        payment,
        items,
        summary,
        disablePlaceOrder: !(address && payment && items.length > 0),
    };
}

function renderAddress(address) {
    const fullAddress = address
        ? (address.fullAddress
            || [
                address.street,
                address.barangayText || address.barangay,
                address.cityText || address.city,
                address.provinceText || address.province,
                address.regionText || address.region,
                address.zip,
            ].filter(Boolean).join(', '))
        : null;

    return `
        <div class="review-section shipping-section">
            <div class="section-header">
                <div class="section-title">
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
                ${fullAddress
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
                    : '<div class="info-empty">No shipping address selected.</div>'}
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
                ${paymentMethod
                    ? `
                        <div class="info-item">
                            <span class="info-label">Payment Method</span>
                            <span class="info-value payment-method">${paymentMethod}</span>
                        </div>
                        <div class="payment-note">
                            <span class="note-icon">Info</span>
                            <span>Payment will be collected upon delivery</span>
                        </div>
                    `
                    : '<div class="info-empty">No payment method selected.</div>'}
            </div>
        </div>
    `;
}

function renderItems(items) {
    return `
        <div class="review-section items-section">
            <div class="section-header">
                <div class="section-title">
                    <span>Order Items</span>
                </div>
                <span class="item-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div class="section-content">
                ${items.length === 0
                    ? '<div class="info-empty">No items in cart.</div>'
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
                                    ${items.map((item) => {
                                        const productName = item.product_name || item.name || 'Unknown Product';
                                        const quantity = Number(item.quantity || item.qty || 1);
                                        const price = parseFloat(item.display_price || item.price || 0);
                                        const subtotal = price * quantity;
                                        return `
                                            <tr>
                                                <td class="product-name">${productName}<br><small>${(resolveItemWeightGrams(item) * quantity).toLocaleString()}g total</small></td>
                                                <td class="quantity">${quantity}</td>
                                                <td class="price">${formatPeso(price)}</td>
                                                <td class="subtotal">${formatPeso(subtotal)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
            </div>
        </div>
    `;
}

function renderTotals(summary, disablePlaceOrder = false) {
    if (!summary) {
        return `
            <div class="review-section totals-section">
                <div class="info-empty">Order totals are not available.</div>
            </div>
        `;
    }

    return `
        <div class="review-section totals-section">
            <div class="section-header">
                <div class="section-title">
                    <span>Price Summary</span>
                </div>
            </div>
            <div class="section-content">
                <div class="totals-list">
                    <div class="total-row">
                        <span class="total-label">Subtotal</span>
                        <span class="total-value">${formatPeso(summary.subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Shipping Fee</span>
                        <span class="total-value">${formatPeso(summary.shipping_fee)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Total Weight</span>
                        <span class="total-value">${Number(summary.total_weight_grams || 0).toLocaleString()}g</span>
                    </div>
                    <div class="total-divider"></div>
                    <div class="total-row total-final">
                        <span class="total-label">Total Amount</span>
                        <span class="total-value final-amount">${formatPeso(summary.total)}</span>
                    </div>
                </div>
                <div class="order-actions">
                    <button id="placeOrderBtn" class="btn-confirm-order" ${disablePlaceOrder ? 'disabled' : ''}>
                        <span>Place Order</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function bindEditLinks(root) {
    root.querySelectorAll('.edit-link').forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                await setCheckoutDraftStep(link.dataset.step);
            } catch (error) {
                console.error('Failed to switch checkout step:', error);
            }
        });
    });
}

function bindPlaceOrderButtons(root, communityType, disablePlaceOrder) {
    const placeOrderBtn = root.querySelector('#placeOrderBtn');
    const mobilePlaceOrderBtn = root.querySelector('#mobilePlaceOrderBtn');

    const handlePlaceOrder = async () => {
        if (disablePlaceOrder) {
            alert('Please complete all required information before placing order.');
            return;
        }

        if (placeOrderBtn) {
            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = 'Placing order...';
        }
        if (mobilePlaceOrderBtn) {
            mobilePlaceOrderBtn.disabled = true;
            mobilePlaceOrderBtn.textContent = 'Placing...';
        }

        try {
            const result = await placeOrder();
            if (result && result.success) {
                const confirmationPath = communityType
                    ? `/fanhub/${communityType}/order-confirmation`
                    : '/order-confirmation';
                window.location.href = result.orderId
                    ? `${confirmationPath}?orderId=${result.orderId}`
                    : confirmationPath;
                return;
            }

            alert('Order placed (no confirmation).');
        } catch (error) {
            console.error('Place order failed:', error);
            alert(`Failed to place order: ${error.message || 'Server error'}`);
        } finally {
            if (placeOrderBtn) {
                placeOrderBtn.disabled = disablePlaceOrder;
                placeOrderBtn.innerHTML = '<span>Place Order</span>';
            }
            if (mobilePlaceOrderBtn) {
                mobilePlaceOrderBtn.disabled = disablePlaceOrder;
                mobilePlaceOrderBtn.textContent = 'Place Order';
            }
        }
    };

    placeOrderBtn?.addEventListener('click', handlePlaceOrder);
    mobilePlaceOrderBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        handlePlaceOrder();
    });
}

async function renderReview(root) {
    const communityType = getCommunityTypeFromPath();
    const { address, payment, items, summary, disablePlaceOrder } = getReviewState();

    root.className = 'form-container form-container--review';
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
                ${renderTotals(summary, disablePlaceOrder)}
            </div>
            <div class="review-mobile-bar">
                <div class="review-mobile-total">
                    <span>Total</span>
                    <strong>${formatPeso(summary?.total || 0)}</strong>
                </div>
                <button id="mobilePlaceOrderBtn" class="review-mobile-button" ${disablePlaceOrder ? 'disabled' : ''}>
                    Place Order
                </button>
            </div>
        </div>
    `;

    await bindEditLinks(root);
    bindPlaceOrderButtons(root, communityType, disablePlaceOrder);
}

export default async function OrderReview(root) {
    try {
        await fetchCheckoutDraft();
        await renderReview(root);

        const rerender = async () => {
            if (!document.body.contains(root)) {
                window.removeEventListener(getCheckoutDraftEventName(), rerender);
                return;
            }
            await renderReview(root);
        };

        window.addEventListener(getCheckoutDraftEventName(), rerender);
    } catch (error) {
        console.error('OrderReview error:', error);
        root.innerHTML = '<p>Error loading order review.</p>';
    }
}
