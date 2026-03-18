import {
    calculateCheckoutSummary,
    fetchCheckoutDraft,
    getCachedCheckoutDraft,
    getCheckoutDraftEventName,
    resolveItemHeightCm,
    resolveItemLengthCm,
    resolveItemWeightGrams,
    resolveItemWidthCm,
} from '../../../services/ecommerce_services/checkout/checkout_draft.js';
import { formatPeso, toSafeNumber } from '../../../lib/number-format.js';
const emDash = '\u2014';

function formatPackageSize(length = 0, width = 0, height = 0) {
    const resolvedLength = Number(length || 0);
    const resolvedWidth = Number(width || 0);
    const resolvedHeight = Number(height || 0);
    if (resolvedLength <= 0 && resolvedWidth <= 0 && resolvedHeight <= 0) return emDash;
    return `${resolvedLength} x ${resolvedWidth} x ${resolvedHeight} cm`;
}

function resolveVariantLabel(item) {
    return String(
        item?.variant_values ||
        item?.variant_name ||
        item?.variant ||
        item?.variant_label ||
        ''
    ).trim();
}

function renderSummary(root) {
    const draft = getCachedCheckoutDraft();
    const items = Array.isArray(draft.checkout_items) ? draft.checkout_items : [];
    const summary = calculateCheckoutSummary(
        items,
        draft.shipping_fee ?? draft.summary_data?.shipping_fee ?? 0,
    );
    const shippingFee = draft.shipping_fee;
    const total = toSafeNumber(summary.subtotal, 0) + toSafeNumber(shippingFee, 0);
    const summaryData = draft.summary_data || {};
    const shippingCourier = String(summaryData.shipping_courier || '').trim();
    const shippingRegion = String(draft.shipping_region || '').trim();
    const packageSize = formatPackageSize(
        summaryData.package_length_cm ?? summary.package_length_cm,
        summaryData.package_width_cm ?? summary.package_width_cm,
        summaryData.package_height_cm ?? summary.package_height_cm,
    );

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
                                        <span class="summary-product-name">${item.product_name}</span>
                                        ${resolveVariantLabel(item) ? `<small class="summary-product-meta">Size: ${resolveVariantLabel(item)}</small>` : ''}
                                        <small class="summary-product-meta">Weight: ${(resolveItemWeightGrams(item) * Number(item.quantity || 0)).toLocaleString()}g total</small>
                                        <small class="summary-product-meta">Package: ${formatPackageSize(
                                            resolveItemLengthCm(item),
                                            resolveItemWidthCm(item),
                                            resolveItemHeightCm(item),
                                        )}</small>
                                    </td>
                                    <td class="summary-price-cell">${formatPeso(item.price)}</td>
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
                    <div class="total-row">
                        <span>Package Size:</span>
                        <span>${packageSize}</span>
                    </div>
                    <div class="total-row">
                        <span>Courier:</span>
                        <span>${shippingCourier || emDash}</span>
                    </div>
                    <div class="total-row">
                        <span>Destination:</span>
                        <span>${shippingRegion || emDash}</span>
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
