import fetchProductDetails from '../../../services/ecommerce_services/shop/product_details.js';
import { addToCart } from '../cart/cart.js';
import { formatPHP, toSafeNumber } from '../../../lib/number-format.js';
import { getActiveSiteSlug } from '../../../lib/site-context.js';
import { formatPackageDimensions } from '../../../utils/package-dimensions.js';
import { showToast } from '../../../utils/toast.js';

function resolveVariantWeight(variant) {
  const explicitWeight = toSafeNumber(variant?.weight_g ?? variant?.weightG ?? variant?.weight_grams ?? variant?.weight);
  if (Number.isFinite(explicitWeight) && explicitWeight >= 0) return explicitWeight;
  return 0;
}

function resolveVariantLength(variant) {
  return toSafeNumber(variant?.length_cm ?? variant?.lengthCm ?? variant?.package_length_cm ?? variant?.length, 0);
}

function resolveVariantWidth(variant) {
  return toSafeNumber(variant?.width_cm ?? variant?.widthCm ?? variant?.package_width_cm ?? variant?.width, 0);
}

function resolveVariantHeight(variant) {
  return toSafeNumber(variant?.height_cm ?? variant?.heightCm ?? variant?.package_height_cm ?? variant?.height, 0);
}

function getVariantLabel(variant, index = 0) {
  return String(
    variant?.variant_values ??
    variant?.value ??
    variant?.variant_name ??
    variant?.name ??
    `Variant ${index + 1}`
  ).trim();
}

function formatVariantPackage(variant) {
  const length = resolveVariantLength(variant);
  const width = resolveVariantWidth(variant);
  const height = resolveVariantHeight(variant);
  return formatPackageDimensions(length, width, height, { emptyLabel: 'Not set' });
}

function renderVariantSpecs(variant, index = 0) {
  if (!variant) {
    return `
      <div class="product-variant-specs-grid">
        <div class="product-variant-spec-card product-variant-spec-card--wide">
          <span class="product-variant-spec-label">Package details</span>
          <strong class="product-variant-spec-value">Variant details are not available yet.</strong>
        </div>
      </div>
    `;
  }

  const variantLabel = getVariantLabel(variant, index) || 'Standard';
  const weight = resolveVariantWeight(variant);
  const packageSize = formatVariantPackage(variant);
  const stock = resolveVariantStock(variant);

  return `
    <div class="product-variant-specs-grid">
      <div class="product-variant-spec-card">
        <span class="product-variant-spec-label">Selected size</span>
        <strong class="product-variant-spec-value">${variantLabel}</strong>
      </div>
      <div class="product-variant-spec-card">
        <span class="product-variant-spec-label">Weight</span>
        <strong class="product-variant-spec-value">${weight > 0 ? `${weight} g` : 'Not set'}</strong>
      </div>
      <div class="product-variant-spec-card product-variant-spec-card--wide">
        <span class="product-variant-spec-label">Package size</span>
        <strong class="product-variant-spec-value">${packageSize}</strong>
      </div>
      <div class="product-variant-spec-card product-variant-spec-card--wide">
        <span class="product-variant-spec-label">Stock</span>
        <strong class="product-variant-spec-value">${stock.toLocaleString()}</strong>
      </div>
    </div>
  `;
}

function resolveVariantStock(variant) {
  const stock = toSafeNumber(variant?.stock ?? variant?.inventory ?? variant?.quantity);
  return Number.isFinite(stock) && stock >= 0 ? stock : 0;
}

function resolveDisplayPrice(product, variant) {
  return toSafeNumber(variant?.price ?? product?.price, 0);
}

function resolveProductImage(product, variants = [], productId = '') {
  const direct =
    product?.img_url ||
    product?.image_url ||
    product?.image ||
    product?.imageUrl ||
    (Array.isArray(product?.images) && product.images[0]) ||
    '';
  if (direct) return direct;

  const fromVariant = Array.isArray(variants)
    ? variants
        .map((variant) =>
          variant?.img_url ||
          variant?.image_url ||
          variant?.image ||
          variant?.imageUrl ||
          (Array.isArray(variant?.images) && variant.images[0]) ||
          ''
        )
        .find((value) => String(value || '').trim())
    : '';
  if (fromVariant) return fromVariant;

  try {
    const related = JSON.parse(sessionStorage.getItem('collectionProducts') || '[]');
    if (Array.isArray(related)) {
      const match = related.find(
        (item) => String(item?.product_id || item?.id || '') === String(productId || '')
      );
      const fromSession =
        match?.image_url ||
        match?.img_url ||
        match?.image ||
        (Array.isArray(match?.images) && match.images[0]) ||
        '';
      if (fromSession) return fromSession;
    }
  } catch (_) {
    // ignore storage errors
  }

  return '';
}

export default async function ProductDetail(root, productId, explicitCommunityType = '') {
  try {
    root.innerHTML = `<div class="loading">Loading product...</div>`;

    const parts = String(window.location.pathname || '').split('/').filter(Boolean);
    const communityType = String(
      explicitCommunityType ||
      (parts[0] === 'fanhub' ? parts[1] : '') ||
      getActiveSiteSlug() ||
      ''
    ).trim().toLowerCase();
    const shopPath = communityType ? `/fanhub/${communityType}/shop` : '/shop';

    const { product, variants } = await fetchProductDetails(productId, communityType);

    if (!product) {
      root.innerHTML = `<p class="error">Product not found.</p>`;
      return;
    }

    const img = resolveProductImage(product, variants, productId);

    let selectedVariant = variants.length > 0 ? variants[0] : null;

    root.innerHTML = `
      <section class="product-detail">
        <button id="product-back-to-shop" class="product-detail-back-btn" type="button" aria-label="Back to shop">
          <span class="product-detail-back-label">Back to shop</span>
        </button>
        <div class="product-detail-grid">
          <div class="product-media">
            <img src="${img}" alt="${product.name || ''}" class="product-detail-img" data-full-image="${img}" />
          </div>
          <div class="product-meta">
            <h1 class="product-title">${product.name || ''}</h1>
            <p class="product-price">${formatPHP(resolveDisplayPrice(product, selectedVariant))}</p>
            <p class="product-shipping-note"><span>Shipping</span> calculated at checkout.</p>

            <h4 class="product-option-title">Size</h4>
            <div class="variant-options">
              ${variants
                .map(
                  (v, idx) => `
                <button class="variant-option ${idx === 0 ? 'active' : ''}" data-variant-id="${
                    v.product_variant_id || v.id || idx
                  }">
                  ${getVariantLabel(v, idx)}
                </button>
              `
                )
                .join('')}
            </div>
            <div class="product-variant-specs" id="product-variant-specs">
              ${renderVariantSpecs(selectedVariant, 0)}
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
              <button class="btn-primary add-to-cart-btn" id="add-to-cart-btn">Add to Cart</button>
            </div>

            <p class="product-desc">${product.description || ''}</p>
          </div>
        </div>
      </section>
      <div class="lightbox" id="product-lightbox" aria-hidden="true">
        <div class="lightbox-backdrop" data-lightbox-close="true"></div>
        <div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="Product image">
          <button class="lightbox-close" type="button" aria-label="Close image" data-lightbox-close="true">×</button>
          <img class="lightbox-image" alt="${product.name || ''}" />
        </div>
      </div>
    `;

    const detailImage = root.querySelector('.product-detail-img');
    const lightbox = root.querySelector('#product-lightbox');
    const lightboxImg = root.querySelector('.lightbox-image');
    const closeTargets = root.querySelectorAll('[data-lightbox-close="true"]');

    const closeLightbox = () => {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
    };

    const openLightbox = () => {
      if (!lightbox || !lightboxImg || !img) return;
      lightboxImg.src = img;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
    };

    if (detailImage && img) {
      detailImage.addEventListener('click', openLightbox);
    }

    closeTargets.forEach((target) => {
      target.addEventListener('click', closeLightbox);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeLightbox();
    });

    // Render related products from current collection (stored in session)
    try {
      const rawRelated = JSON.parse(sessionStorage.getItem('collectionProducts') || '[]');
      const related = Array.isArray(rawRelated)
        ? rawRelated.filter((p) => String(p.product_id || '') !== String(productId)).slice(0, 6)
        : [];

      if (related.length) {
        const relatedHtml = `
          <section class="related-products">
            <h3>You may also like</h3>
            <div class="related-grid">
              ${related
                .map((p) => {
                  const id = p.product_id;
                  const name = p.name || '';
                  const imgUrl = p.image_url || '';
                  const priceVal = toSafeNumber(p.price, 0);
                  return `
                    <button class="related-card" data-product-id="${id}">
                      <img src="${imgUrl}" alt="${name}" />
                      <div class="related-card-copy">
                        <div class="related-name">${name}</div>
                        <div class="related-price">${formatPHP(priceVal)}</div>
                      </div>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </section>
        `;
        root.insertAdjacentHTML('beforeend', relatedHtml);

        root.querySelectorAll('.related-card').forEach((card) => {
          card.addEventListener('click', async () => {
            const id = card.dataset.productId;
            if (!id) return;
            const productPath = communityType
              ? `/fanhub/${communityType}/product/${id}`
              : `/product/${id}`;
            history.pushState({ page: 'product', id, communityType }, '', productPath);
            await ProductDetail(root, id, communityType);
          });
        });
      }
    } catch (err) {
      console.warn('Failed to render related products', err);
    }

    const variantBtns = root.querySelectorAll('.variant-option');
    variantBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        variantBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedVariant = variants[idx];

        const priceEl = root.querySelector('.product-price');
        if (priceEl) priceEl.textContent = formatPHP(resolveDisplayPrice(product, selectedVariant));
        const specsEl = root.querySelector('#product-variant-specs');
        if (specsEl) specsEl.innerHTML = renderVariantSpecs(selectedVariant, idx);
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
      window.location.href = shopPath;
    });
  } catch (err) {
    console.error('Error loading product detail', err);
    root.innerHTML = `<p class="error">${err.message || 'Error loading product'}</p>`;
  }
}
