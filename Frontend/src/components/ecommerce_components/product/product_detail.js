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
          <span class="product-detail-back-arrow" aria-hidden="true"></span>
          <span class="product-detail-back-label">Back to shop</span>
        </button>
        <div class="product-detail-grid">
          <div class="product-media">
            <img src="${img}" alt="${product.name || ''}" class="product-detail-img" />
          </div>
          <div class="product-meta">
            <h2>${product.name || ''}</h2>
            <p class="product-price">PHP ${product.price || selectedVariant?.price || ''}</p>
            <p class="product-desc">${product.description || ''}</p>

            <h4>Variants</h4>
            <div class="variant-options">
              ${variants
                .map(
                  (v, idx) => `
                <button class="variant-option ${idx === 0 ? 'active' : ''}" data-variant-id="${
                    v.product_variant_id || v.id || idx
                  }">
                  ${v.name || v.variant_values || 'Variant'}<br/>
                  <small>PHP ${v.price || product.price} | Stock: ${v.stock || 0} | ${resolveVariantWeight(v)}g</small>
                </button>
              `
                )
                .join('')}
            </div>

            <div class="cart-controls">
              <label>Quantity:</label>
              <input type="number" id="qty-input" value="1" min="1" max="999" class="qty-input" />
            </div>

            <div class="button-group">
              <button class="btn-primary" id="add-to-cart-btn">Add to Cart</button>
              <button class="btn-secondary" id="buy-now-btn">Buy Now</button>
            </div>
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

    const buyBtn = root.querySelector('#buy-now-btn');
    buyBtn?.addEventListener('click', async () => {
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

      const availableStock = resolveVariantStock(variant);
      if (availableStock > 0 && qty > availableStock) {
        showToast(`Only ${availableStock} item(s) available for this variant`, 'warning');
        return;
      }

      try {
        const result = await addToCart(variantId, qty);
        if (result.success) {
          const price = Number(variant.price || product.price || 0);
          const totalWeightGrams = resolveVariantWeight(variant) * qty;
          const checkoutItems = [
            {
              variant_id: variantId,
              product_variant_id: variantId,
              product_id: product.product_id || product.id || null,
              product_name: product.name || '',
              variant_name: variant.name || variant.variant_values || 'Variant',
              image_url:
                product.img_url ||
                product.image_url ||
                product.image ||
                (Array.isArray(product.images) && product.images[0]) ||
                '',
              price,
              quantity: qty,
              stock: availableStock,
              weight_g: resolveVariantWeight(variant),
            },
          ];

          sessionStorage.removeItem('selectedCartItems');
          sessionStorage.setItem('checkoutStep', '1');
          sessionStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
          sessionStorage.setItem(
            'checkoutSummary',
            JSON.stringify({
              subtotal: price * qty,
              shipping_fee: 0,
              total: price * qty,
              total_weight_grams: totalWeightGrams,
            }),
          );
          sessionStorage.setItem('checkoutWeightGrams', String(totalWeightGrams));
          const checkoutPath = communityType ? `/fanhub/${communityType}/checkout` : '/checkout';
          history.pushState({ page: 'checkout' }, '', checkoutPath);
          window.dispatchEvent(new PopStateEvent('popstate'));
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
