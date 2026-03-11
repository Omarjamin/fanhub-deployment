import fetchProductDetails from '../../../services/ecommerce_services/shop/product_details.js';
import { addToCart } from '../cart/cart.js';
import { showToast } from '../../../utils/toast.js';

function resolveVariantWeight(variant) {
  const explicitWeight = Number(variant?.weight_g ?? variant?.weightG ?? variant?.weight_grams ?? variant?.weight);
  if (Number.isFinite(explicitWeight) && explicitWeight >= 0) return explicitWeight;
  return 0;
}

function resolveVariantStock(variant) {
  const stock = Number(variant?.stock ?? variant?.inventory ?? variant?.quantity);
  return Number.isFinite(stock) && stock >= 0 ? stock : 0;
}

export default async function ProductDetail(root, productId, explicitCommunityType = '') {
  try {
    root.innerHTML = `<div class="loading">Loading product...</div>`;

    const parts = String(window.location.pathname || '').split('/').filter(Boolean);
    const communityType = String(
      explicitCommunityType || (parts[0] === 'fanhub' ? parts[1] : '') || ''
    ).trim().toLowerCase();

    const { product, variants } = await fetchProductDetails(productId, communityType);

    if (!product) {
      root.innerHTML = `<p class="error">Product not found.</p>`;
      return;
    }

    const img =
      product.img_url ||
      product.image_url ||
      product.image ||
      (Array.isArray(product.images) && product.images[0]) ||
      '';

    let selectedVariant = variants.length > 0 ? variants[0] : null;

    root.innerHTML = `
      <section class="product-detail">
        <button id="product-back-to-shop" class="product-detail-back-btn" type="button" aria-label="Back to shop">
          <span class="product-detail-back-label">Back to shop</span>
        </button>
        <div class="product-detail-grid">
          <div class="product-media">
            <img src="${img}" alt="${product.name || ''}" class="product-detail-img" />
          </div>
          <div class="product-meta">
            <h1 class="product-title">${product.name || ''}</h1>
            <p class="product-price">₱${product.price || selectedVariant?.price || ''}.00 PHP</p>
            <p class="product-shipping-note"><span>Shipping</span> calculated at checkout.</p>

            <h4 class="product-option-title">Size</h4>
            <div class="variant-options">
              ${variants
                .map(
                  (v, idx) => `
                <button class="variant-option ${idx === 0 ? 'active' : ''}" data-variant-id="${
                    v.product_variant_id || v.id || idx
                  }">
                  ${v.name || v.variant_values || 'Variant'}
                </button>
              `
                )
                .join('')}
            </div>

            <div class="cart-controls">
              <label class="product-option-title" for="qty-input">Quantity <span>(1 in cart)</span></label>
              <div class="qty-stepper">
                <button type="button" class="qty-step-btn" id="qty-decrease" aria-label="Decrease quantity">−</button>
                <input type="text" id="qty-input" value="1" inputmode="numeric" pattern="[0-9]*" class="qty-input" />
                <button type="button" class="qty-step-btn" id="qty-increase" aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div class="button-group">
              <button class="btn-primary" id="add-to-cart-btn">Add to Cart</button>
            </div>

            <p class="product-desc">${product.description || ''}</p>
          </div>
        </div>
      </section>
    `;

    const variantBtns = root.querySelectorAll('.variant-option');
    variantBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        variantBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedVariant = variants[idx];

        const priceEl = root.querySelector('.product-price');
        if (priceEl) priceEl.textContent = `PHP ${selectedVariant.price || product.price}`;
      });
    });

    const addBtn = root.querySelector('#add-to-cart-btn');
    const qtyInput = root.querySelector('#qty-input');
    const decreaseBtn = root.querySelector('#qty-decrease');
    const increaseBtn = root.querySelector('#qty-increase');

    function clampQty(value) {
      const digitsOnly = String(value || '').replace(/[^\d]/g, '');
      const parsed = parseInt(digitsOnly, 10) || 1;
      return Math.min(999, Math.max(1, parsed));
    }

    decreaseBtn?.addEventListener('click', () => {
      qtyInput.value = String(clampQty((parseInt(qtyInput.value, 10) || 1) - 1));
    });

    increaseBtn?.addEventListener('click', () => {
      qtyInput.value = String(clampQty((parseInt(qtyInput.value, 10) || 1) + 1));
    });

    qtyInput?.addEventListener('change', () => {
      qtyInput.value = String(clampQty(qtyInput.value));
    });

    addBtn?.addEventListener('click', async () => {
      const qty = parseInt(qtyInput.value, 10) || 1;
      const variant = selectedVariant || variants[0];

      if (!variant) {
        showToast('Please select a variant', 'error');
        return;
      }

      const variantId = variant.product_variant_id || variant.id || variant.variant_id;
      if (!variantId) {
        showToast('Invalid variant selected', 'error');
        return;
      }

      try {
        const result = await addToCart(variantId, qty);
        if (result.success) {
          showToast(`Added to cart: ${product.name} x${qty}`, 'success');
        } else {
          showToast(`Failed to add to cart: ${result.message || 'Unknown error'}`, 'error');
        }
      } catch (error) {
        showToast(`Error adding to cart: ${error.message}`, 'error');
      }
    });

    const backBtn = root.querySelector('#product-back-to-shop');
    backBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      history.back();
    });
  } catch (err) {
    console.error('Error loading product detail', err);
    root.innerHTML = `<p class="error">${err.message || 'Error loading product'}</p>`;
  }
}