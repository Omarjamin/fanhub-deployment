import { getCart } from '../cart/cart.js';

const peso = '\u20B1';
const emDash = '\u2014';

function resolveItemWeightGrams(item) {
    const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
    if (Number.isFinite(explicitWeight) && explicitWeight > 0) return explicitWeight;
    return 0;
}

function formatPeso(value) {
    return `${peso}${Number(value || 0).toFixed(2)}`;
}

export default async function OrderSummary(root) {
    const cartItems = await getCart();
    const selectedItems = JSON.parse(sessionStorage.getItem('selectedCartItems') || '{}');
    const checkoutItems = cartItems.filter(item => selectedItems[item.variant_id]);

    const buyNowItems = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]');
    const displayItems = checkoutItems.length > 0 ? checkoutItems : buyNowItems;

    const subTotal = displayItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
    const totalWeightGrams = displayItems.reduce((sum, item) => {
        const qty = Number(item.quantity || 0);
        return sum + (resolveItemWeightGrams(item) * qty);
    }, 0);

    const shippingFeeStored = sessionStorage.getItem('shippingFee');
    const shippingFee = shippingFeeStored ? parseFloat(shippingFeeStored) : null;
    const total = subTotal + (shippingFee || 0);

    root.innerHTML = `
    <section class="order-summary">
        <div class="summary-container">
            <h3 class="summary-title">Order Summary</h3>
            ${displayItems.length === 0 ? '<p class="summary-empty">No items selected for checkout.</p>' : `
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
                        ${displayItems.map(item => `
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
                    <span>${formatPeso(subTotal)}</span>
                </div>
                <div class="total-row">
                    <span>Shipping Fee:</span>
                    <span id="shippingFeeValue">${shippingFee === null ? emDash : formatPeso(shippingFee)}</span>
                </div>
                <div class="total-row">
                    <span>Total Weight:</span>
                    <span>${totalWeightGrams.toLocaleString()}g</span>
                </div>
                <div class="total-row total">
                    <span>Total:</span>
                    <span id="totalValue">${formatPeso(total)}</span>
                </div>
            </div>
        </div>
    </section>
    `;

    function updateFeeDisplay() {
        const sfStored = sessionStorage.getItem('shippingFee');
        const sf = sfStored ? parseFloat(sfStored) : null;
        const shippingElem = document.getElementById('shippingFeeValue');
        const totalElem = document.getElementById('totalValue');
        if (shippingElem) {
            shippingElem.textContent = sf === null ? emDash : formatPeso(sf);
        }
        if (totalElem) {
            totalElem.textContent = formatPeso(subTotal + (sf || 0));
        }
    }

    window.addEventListener('shippingFeeUpdated', updateFeeDisplay);
}
