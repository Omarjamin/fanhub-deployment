
import { getCart, updateCartItem, removeFromCart } from '../cart/cart.js';
import '../../../styles/ecommerce_styles/cart.css';

const DEFAULT_API_V1 = 'https://fanhub-deployment-production.up.railway.app/v1';
const RESOLVED_API_V1 = String(import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim();
const API_ORIGIN = RESOLVED_API_V1 ? new URL(RESOLVED_API_V1).origin : '';

function resolveItemWeightGrams(item) {
    const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
    if (Number.isFinite(explicitWeight) && explicitWeight >= 0) return explicitWeight;
    return 0;
}

export default async function CustomerCart() {
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'customer-cart-modal';
    modal.innerHTML = `
        <div class="cart-header">
            <h2>Your Cart</h2>
            <button class="close-btn">&times;</button>
        </div>
        <div class="cart-items">
            <div class="cart-loading">Loading cart...</div>
        </div>
        <div class="cart-summary">
            <div class="cart-total">
                <div>
                    <p>Selected Total: <strong class="selected-total">PHP 0.00</strong></p>
                </div>
            </div>
        </div>
        <button class="checkout-button">Checkout Selected Items</button>
    `;

    // Append to body
    document.body.appendChild(modal);

    // Add close functionality
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300); // Remove after animation
    });

    // Load and display cart items
    await loadCartItems(modal);

    // Trigger slide-in animation
    setTimeout(() => modal.classList.add('open'), 10);

    return modal;
}

async function loadCartItems(modal) {
    const cartItemsContainer = modal.querySelector('.cart-items');
    const selectedTotalElement = modal.querySelector('.selected-total');

    try {
        const cartItems = await getCart();

        if (!cartItems || cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            selectedTotalElement.textContent = 'PHP 0.00';
            return;
        }

        cartItemsContainer.innerHTML = '';

        // Get stored selections from sessionStorage
        const selectedItems = JSON.parse(sessionStorage.getItem('selectedCartItems') || '{}');

        cartItems.forEach(item => {
            const price = parseFloat(item.price) || 0;
            const itemTotal = price * item.quantity;
            const productName =
                item.product_name ||
                item.name ||
                item.title ||
                `Product #${item.product_id || item.variant_id || ''}`;
            const variantLabel = item.variant_values || item.variant_name || item.size || 'Default';
            const qty = parseInt(item.quantity, 10) || 1;
            const itemWeight = resolveItemWeightGrams(item);
            const itemTotalWeight = itemWeight * qty;

            // Handle image URL
            let imageSrc = item.image_url || '/placeholder.png';
            if (imageSrc.startsWith('/') && API_ORIGIN) {
                imageSrc = API_ORIGIN + imageSrc;
            }

            const isSelected = selectedItems[item.variant_id] || false;

            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="item-checkbox">
                    <input type="checkbox" class="item-select" data-variant-id="${item.variant_id}" 
                           data-price="${price}" data-quantity="${item.quantity}" 
                           ${isSelected ? 'checked' : ''}>
                </div>
                <div class="item-info">
                    <div class="item-media">
                        <img src="${imageSrc}" alt="${productName}" class="item-image" onerror="this.src='/placeholder.png'">
                        <h4 class="item-name">${productName}</h4>
                    </div>
                    <div class="item-details">
                        <p class="item-variant">Size/Variant: <strong>${variantLabel}</strong></p>
                        <p class="item-price">Unit: PHP ${price.toFixed(2)}</p>
                        <p class="item-price">Weight: ${itemWeight.toLocaleString()}g each</p>
                        <p class="item-price">Total Weight: ${itemTotalWeight.toLocaleString()}g</p>
                        <p class="item-subtotal">Subtotal: PHP ${itemTotal.toFixed(2)}</p>
                    </div>
                </div>
                <div class="item-controls">
                    <div class="quantity-controls">
                        <button class="qty-btn minus" data-variant-id="${item.variant_id}">-</button>
                        <span class="quantity">${qty}</span>
                        <button class="qty-btn plus" data-variant-id="${item.variant_id}">+</button>
                    </div>
                    <div class="item-total">PHP ${itemTotal.toFixed(2)}</div>
                    <button class="remove-btn" data-variant-id="${item.variant_id}">Remove</button>
                </div>
            `;

            cartItemsContainer.appendChild(itemElement);
        });

        updateSelectedTotal(modal);

        // Add checkbox listeners
        modal.querySelectorAll('.item-select').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateSelections(modal);
            });
        });

        // Add event listeners for quantity controls
        modal.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const variantId = e.target.dataset.variantId;
                const quantityElement = e.target.nextElementSibling;
                const currentQty = parseInt(quantityElement.textContent);

                if (currentQty > 1) {
                    const newQty = currentQty - 1;
                    const result = await updateCartItem(variantId, newQty);
                    if (result.success) {
                        quantityElement.textContent = newQty;
                        await loadCartItems(modal); // Reload to update totals
                    } else {
                        alert('Failed to update quantity: ' + result.message);
                    }
                }
            });
        });

        modal.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const variantId = e.target.dataset.variantId;
                const quantityElement = e.target.previousElementSibling;
                const currentQty = parseInt(quantityElement.textContent);
                const newQty = currentQty + 1;

                const result = await updateCartItem(variantId, newQty);
                if (result.success) {
                    quantityElement.textContent = newQty;
                    await loadCartItems(modal); // Reload to update totals
                } else {
                    alert('Failed to update quantity: ' + result.message);
                }
            });
        });

        // Add event listeners for remove buttons
        modal.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const variantId = btn.dataset.variantId;
                if (confirm('Remove this item from cart?')) {
                    const result = await removeFromCart(variantId);
                    if (result.success) {
                        await loadCartItems(modal); // Reload cart
                    } else {
                        alert('Failed to remove item: ' + result.message);
                    }
                }
            });
        });




        const checkoutBtn = modal.querySelector('.checkout-button');

        checkoutBtn.addEventListener('click', async () => {
            const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
            let communityType = '';
            if (pathParts[0] === 'fanhub' && pathParts[1] === 'community-platform' && pathParts[2]) {
                communityType = pathParts[2];
            } else if (pathParts[0] === 'fanhub' && pathParts[1]) {
                communityType = pathParts[1];
            }
            const checkoutPath = communityType ? `/fanhub/${communityType}/checkout` : '/checkout';
            const selectedCheckboxes = modal.querySelectorAll('.item-select:checked');

            if (selectedCheckboxes.length === 0) {
                alert('Please select at least one item to checkout.');
                return;
            }

            // Get full cart again (source of truth)
            const cartItems = await getCart();

            // Build checkout items
            const checkoutItems = cartItems.filter(item =>
                [...selectedCheckboxes].some(cb => cb.dataset.variantId === String(item.variant_id))
            );

            // Compute totals
            let subtotal = 0;
            let totalWeightGrams = 0;
            checkoutItems.forEach(item => {
                subtotal += (parseFloat(item.price) || 0) * item.quantity;
                totalWeightGrams += resolveItemWeightGrams(item) * (Number(item.quantity) || 0);
            });

            // Save checkout state (for thesis step flow)
            const shippingFeeStored = sessionStorage.getItem('shippingFee');
            const shippingFee = shippingFeeStored ? parseFloat(shippingFeeStored) : 0;

            sessionStorage.setItem('checkoutStep', '1'); // Shipping step
            sessionStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
            sessionStorage.setItem('checkoutSummary', JSON.stringify({
                subtotal: subtotal,
                shipping_fee: shippingFee,
                total: subtotal + shippingFee,
                total_weight_grams: totalWeightGrams
            }));
            sessionStorage.setItem('checkoutWeightGrams', String(totalWeightGrams));

            // Close cart modal
            modal.classList.remove('open');

            // Redirect to checkout page
            setTimeout(() => {
                window.location.href = checkoutPath;
            }, 300);
        });



    } catch (error) {
        console.error('Error loading cart:', error);
        cartItemsContainer.innerHTML = '<p>Error loading cart. Please try again.</p>';
    }
}

function updateSelections(modal) {
    const selectedItems = {};
    modal.querySelectorAll('.item-select').forEach(checkbox => {
        if (checkbox.checked) {
            selectedItems[checkbox.dataset.variantId] = true;
        }
    });
    sessionStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
    updateSelectedTotal(modal);
}

function updateSelectedTotal(modal) {
    let selectedTotal = 0;
    modal.querySelectorAll('.item-select:checked').forEach(checkbox => {
        const price = parseFloat(checkbox.dataset.price);
        const quantity = parseInt(checkbox.dataset.quantity);
        selectedTotal += price * quantity;
    });
    
    const selectedTotalElement = modal.querySelector('.selected-total');
    selectedTotalElement.textContent = `PHP ${selectedTotal.toFixed(2)}`;
}



