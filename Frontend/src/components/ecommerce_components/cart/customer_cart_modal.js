
import { getCart, updateCartItem, removeFromCart } from '../cart/cart.js';
import { calculateCheckoutSummary, saveCheckoutDraft } from '../../../services/ecommerce_services/checkout/checkout_draft.js';
import { formatPHP, toSafeInteger, toSafeNumber } from '../../../lib/number-format.js';
import '../../../styles/ecommerce_styles/cart.css';

const DEFAULT_API_V1 = 'https://fanhub-deployment-production.up.railway.app/v1';
const RESOLVED_API_V1 = String(import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim();
const API_ORIGIN = RESOLVED_API_V1 ? new URL(RESOLVED_API_V1).origin : '';

function resolveItemWeightGrams(item) {
    const explicitWeight = toSafeNumber(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
    if (Number.isFinite(explicitWeight) && explicitWeight >= 0) return explicitWeight;
    return 0;
}

function resolveItemLengthCm(item) {
    const explicitLength = toSafeNumber(item?.length_cm ?? item?.lengthCm ?? item?.package_length_cm ?? item?.length);
    return Number.isFinite(explicitLength) && explicitLength >= 0 ? explicitLength : 0;
}

function resolveItemWidthCm(item) {
    const explicitWidth = toSafeNumber(item?.width_cm ?? item?.widthCm ?? item?.package_width_cm ?? item?.width);
    return Number.isFinite(explicitWidth) && explicitWidth >= 0 ? explicitWidth : 0;
}

function resolveItemHeightCm(item) {
    const explicitHeight = toSafeNumber(item?.height_cm ?? item?.heightCm ?? item?.package_height_cm ?? item?.height);
    return Number.isFinite(explicitHeight) && explicitHeight >= 0 ? explicitHeight : 0;
}

function resolveVariantLabel(item) {
    return String(
        item?.variant_values ||
        item?.variant_name ||
        item?.variant ||
        item?.size ||
        'Default'
    ).trim();
}

function formatPackageSize(item) {
    const length = resolveItemLengthCm(item);
    const width = resolveItemWidthCm(item);
    const height = resolveItemHeightCm(item);
    if (length <= 0 && width <= 0 && height <= 0) return '';
    return `${length} x ${width} x ${height} cm`;
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
            selectedTotalElement.textContent = formatPHP(0);
            return;
        }

        cartItemsContainer.innerHTML = '';

        // Get stored selections from sessionStorage
        const selectedItems = JSON.parse(sessionStorage.getItem('selectedCartItems') || '{}');

        cartItems.forEach(item => {
            const price = toSafeNumber(item.price, 0);
            const productName =
                item.product_name ||
                item.name ||
                item.title ||
                `Product #${item.product_id || item.variant_id || ''}`;
            const variantLabel = resolveVariantLabel(item);
            const qty = Math.max(1, toSafeInteger(item.quantity, 1));
            const itemTotal = price * qty;
            const itemWeight = resolveItemWeightGrams(item);
            const packageSize = formatPackageSize(item);
            const showSubtotal = qty > 1;
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
                           data-price="${price}" data-quantity="${qty}" 
                           ${isSelected ? 'checked' : ''}>
                </div>
                <div class="item-info">
                    <div class="item-media">
                        <img src="${imageSrc}" alt="${productName}" class="item-image" onerror="this.src='/placeholder.png'">
                    </div>
                    <div class="item-body">
                        <div class="item-topline">
                            <div class="item-details">
                                <h4 class="item-name">${productName}</h4>
                                <p class="item-variant"><strong>${variantLabel}</strong></p>
                                <p class="item-weight">${itemWeight.toLocaleString()}g each</p>
                                ${packageSize ? `<p class="item-package">${packageSize}</p>` : ''}
                            </div>
                            <div class="item-pricing">
                                <p class="item-price">${formatPHP(price)}</p>
                                ${showSubtotal ? `<div class="item-subtotal">${formatPHP(itemTotal)}</div>` : ''}
                            </div>
                        </div>
                        <div class="item-controls">
                            <div class="quantity-controls">
                                <button class="qty-btn minus" data-variant-id="${item.variant_id}">-</button>
                                <span class="quantity">${qty}</span>
                                <button class="qty-btn plus" data-variant-id="${item.variant_id}">+</button>
                            </div>
                            <button class="remove-btn" data-variant-id="${item.variant_id}">Remove</button>
                        </div>
                    </div>
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
                const currentQty = toSafeInteger(quantityElement.textContent, 1);

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
                const currentQty = toSafeInteger(quantityElement.textContent, 1);
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

            const summary = calculateCheckoutSummary(checkoutItems, 0);

            try {
                await saveCheckoutDraft({
                    current_step: 1,
                    checkout_items: checkoutItems,
                    summary_data: summary,
                    shipping_address: null,
                    payment_data: null,
                    shipping_fee: null,
                    shipping_region: '',
                    checkout_weight_grams: summary.total_weight_grams
                });
            } catch (error) {
                console.error('Failed to initialize checkout draft:', error);
                alert(error.message || 'Unable to start checkout right now. Please try again.');
                return;
            }

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
        const price = toSafeNumber(checkbox.dataset.price, 0);
        const quantity = Math.max(0, toSafeInteger(checkbox.dataset.quantity, 0));
        selectedTotal += price * quantity;
    });
    
    const selectedTotalElement = modal.querySelector('.selected-total');
    selectedTotalElement.textContent = formatPHP(selectedTotal);
}
