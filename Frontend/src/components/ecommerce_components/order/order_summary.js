import { getCart } from '../cart/cart.js';

function resolveItemWeightGrams(item) {
    const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
    if (Number.isFinite(explicitWeight) && explicitWeight > 0) return explicitWeight;
    return 0;
}

export default async function OrderSummary(root) {
    const cartItems = await getCart();
    const selectedItems = JSON.parse(sessionStorage.getItem('selectedCartItems') || '{}');
    const checkoutItems = cartItems.filter(item => selectedItems[item.variant_id]);
    
    // Check for Buy Now items if no cart items selected
    const buyNowItems = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]');
    const displayItems = checkoutItems.length > 0 ? checkoutItems : buyNowItems;

    const subTotal = displayItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
    const totalWeightGrams = displayItems.reduce((sum, item) => {
        const qty = Number(item.quantity || 0);
        return sum + (resolveItemWeightGrams(item) * qty);
    }, 0);

    // Read shipping fee from sessionStorage. If not present, show as not calculated (—)
    const shippingFeeStored = sessionStorage.getItem('shippingFee');
    const shippingFee = shippingFeeStored ? parseFloat(shippingFeeStored) : null;
    const total = subTotal + (shippingFee || 0);

    root.innerHTML += `
    <section class="order-summary">
        <div class="summary-container">
            <h3>Order Summary</h3>
            ${displayItems.length === 0 ? '<p style="color: #000000; font-weight: 500;">No items selected for checkout.</p>' : `
            <div style="width: 100%; overflow-x: visible;">
                <table class="order-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th style="width: 15%;">Image</th>
                            <th style="width: 45%;">Product</th>
                            <th style="width: 20%;">Price</th>
                            <th style="width: 20%;">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayItems.map(item => `
                            <tr>
                                <td><img src="${item.image_url}" alt="${item.product_name}" class="product-image"></td>
                                <td style="color: #000000; font-weight: 500; white-space: normal;">
                                  ${item.product_name} ${item.variant_name || ''}
                                  <br><small>Weight: ${(resolveItemWeightGrams(item) * Number(item.quantity || 0)).toLocaleString()}g total</small>
                                </td>
                                <td style="color: #000000; font-weight: 600;">₱${(parseFloat(item.price) || 0).toFixed(2)}</td>
                                <td style="color: #000000; font-weight: 600;">${item.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            `}
            <div class="summary-totals">
                <div class="total-row">
                    <span style="color: #000000;">Sub Total:</span>
                    <span style="color: #000000;">₱${subTotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span style="color: #000000;">Shipping Fee:</span>
                    <span id="shippingFeeValue" style="color: #000000;">${shippingFee === null ? '—' : `₱${shippingFee.toFixed(2)}`}</span>
                </div>
                <div class="total-row">
                    <span style="color: #000000;">Total Weight:</span>
                    <span style="color: #000000;">${totalWeightGrams.toLocaleString()}g</span>
                </div>
                <div class="total-row total">
                    <span>Total:</span>
                    <span id="totalValue">₱${total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    </section>
    `;

    // Update display when shipping fee is updated elsewhere
    function updateFeeDisplay() {
        const sfStored = sessionStorage.getItem('shippingFee');
        const sf = sfStored ? parseFloat(sfStored) : null;
        const shippingElem = document.getElementById('shippingFeeValue');
        const totalElem = document.getElementById('totalValue');
        if (shippingElem) {
            shippingElem.textContent = sf === null ? '—' : `₱${sf.toFixed(2)}`;
            shippingElem.style.color = '#000000';
        }
        if (totalElem) {
            totalElem.textContent = `₱${(subTotal + (sf || 0)).toFixed(2)}`;
        }
    }

    window.addEventListener('shippingFeeUpdated', updateFeeDisplay);
}