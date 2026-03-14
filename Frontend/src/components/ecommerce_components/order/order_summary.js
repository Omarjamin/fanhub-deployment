import {
    calculateCheckoutSummary,
    fetchCheckoutDraft,
    getCachedCheckoutDraft,
    getCheckoutDraftEventName,
    resolveItemWeightGrams,
} from '../../../services/ecommerce_services/checkout/checkout_draft.js';

const peso = '\u20B1';
const emDash = '\u2014';

function formatPeso(value) {
    return `${peso}${Number(value || 0).toFixed(2)}`;
}

function renderSummary(root) {
    const draft = getCachedCheckoutDraft();
    const items = Array.isArray(draft.checkout_items) ? draft.checkout_items : [];
    const summary = calculateCheckoutSummary(
        items,
        draft.shipping_fee ?? draft.summary_data?.shipping_fee ?? 0,
    );
    const shippingFee = draft.shipping_fee;
    const total = summary.subtotal + (shippingFee ?? 0);

    root.innerHTML = `
        <section class="order-summary">
            <div class="summary-container">
                <h3 class="summary-title">Order Summary</h3>
                ${items.length === 0 ? '<p class="summary-empty">No items selected for checkout.</p>' : `
                <div class="order-table-wrap">
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th class="summary-col-image">Image</th>
                                <th class="summary-col-product">Product</th>
                                <th class="summary-col-price">Price</th>
                                <th class="summary-col-qty">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td><img src="${item.image_url}" alt="${item.product_name}" class="product-image"></td>
                                    <td class="summary-product-cell">
                                        <span class="summary-product-name">${item.product_name} ${item.variant_name || ''}</span>
                                        <small class="summary-product-meta">Weight: ${(resolveItemWeightGrams(item) * Number(item.quantity || 0)).toLocaleString()}g total</small>
                                    </td>
                                    <td class="summary-price-cell">${formatPeso(parseFloat(item.price) || 0)}</td>
                                    <td class="summary-qty-cell">${item.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}
                <div class="summary-totals">
                    <div class="total-row">
                        <span>Sub Total:</span>
                        <span>${formatPeso(summary.subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping Fee:</span>
                        <span>${shippingFee === null ? emDash : formatPeso(shippingFee)}</span>
                    </div>
                    <div class="total-row">
                        <span>Total Weight:</span>
                        <span>${summary.total_weight_grams.toLocaleString()}g</span>
                    </div>
                    <div class="total-row total">
                        <span>Total:</span>
                        <span>${formatPeso(total)}</span>
                    </div>
                </div>
            </div>
        </section>
    `;
}

export default async function OrderSummary(root) {
    try {
        await fetchCheckoutDraft();
    } catch (error) {
        console.error('Failed to fetch checkout draft for summary:', error);
    }

    renderSummary(root);

    const rerender = () => {
        if (!document.body.contains(root)) {
            window.removeEventListener(getCheckoutDraftEventName(), rerender);
            return;
        }
        renderSummary(root);
    };

    window.addEventListener(getCheckoutDraftEventName(), rerender);
}
