import { loadProductsByCollection } from "../../../services/ecommerce_services/shop/product.js";
import ProductDetail from '../product/product_detail.js';
import fetchProductDetails from '../../../services/ecommerce_services/shop/product_details.js';
import { api } from '../../../services/ecommerce_services/api.js';
import { authHeaders } from '../../../services/ecommerce_services/auth/auth.js';
import '../../../styles/ecommerce_styles/Collection.css';

export default function Collection(root, data = {}) {
  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const communityType = pathParts[0] === 'fanhub' ? pathParts[1] : '';

  root.innerHTML += `
    <section id="collection" class="collection-bini">
      <h2 class="section-title">Collections</h2>
      <div class="collection-list" id="collection-list"></div>
    </section>

    <section id="product" class="product-section is-hidden" aria-hidden="true">
      <div class="product-section-head">
        <button type="button" class="collection-back-link" id="collection-back-link">Collections</button>
        <h2 class="section-title" id="product-section-title">Products</h2>
      </div>

      <div class="category-nav">
        <button class="category-btn active" data-category="all">All</button>
        <button class="category-btn" data-category="apparel">Apparel</button>
        <button class="category-btn" data-category="accessories">Accessories</button>
        <button class="category-btn" data-category="collectibles">Collectibles</button>
        <button class="category-btn" data-category="music">Music</button>
      </div>

      <div class="product-toolbar">
        <div class="sort-group">
          <label for="sort-select">Sort by:</label>
          <select id="sort-select" class="sort-select">
            <option value="">Default</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
        <div class="product-count" id="product-count">0 products</div>
      </div>

      <div class="product-list" id="product-list"></div>
    </section>
  `;

  let currentProducts = [];
  let collectionModeProducts = null;
  let selectedCategory = 'all';

  init();

  async function init() {
    try {
      await fetchCollectionsLocal();
      attachCollectionClickHandlers();
      attachFilterSortHandlers();
      attachCategoryHandlers();
      attachBackHandler();
    } catch (err) {
      console.error('Error loading collections:', err);
    }
  }

  async function fetchCollectionsLocal() {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...authHeaders(),
      };
      const response = await api(`/shop/getCollections`, { method: 'GET', headers });
      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch collections:', result);
        return;
      }

      renderCollections(result.data || []);
    } catch (err) {
      console.error('Error in fetchCollectionsLocal:', err);
    }
  }

  function renderCollections(collections) {
    const collectionList = document.getElementById('collection-list');
    if (!collectionList) return;

    collectionList.innerHTML = '';

    collections.forEach((collection) => {
      const item = document.createElement('div');
      item.className = 'collection-item';
      item.dataset.id = collection.collection_id || collection.id || '';
      item.dataset.name = collection.name || 'Collection';

      item.innerHTML = `
        <img src="${collection.img_url}" alt="${collection.name}" class="collection-image">
        <h3>${collection.name} <span class="collection-arrow" aria-hidden="true">→</span></h3>
      `;

      collectionList.appendChild(item);
    });
  }

  function getProductCategory(product) {
    if (!product) return '';
    const candidates = [product.category, product.cat, product.category_name, product.product_category, product.type];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string') return candidate.trim().toLowerCase();
    }
    return '';
  }

  function getProductImage(product) {
    if (!product) return '';
    if (product.image_url) return product.image_url;
    if (product.img_url) return product.img_url;
    if (product.image) return product.image;
    if (Array.isArray(product.images) && product.images.length) return product.images[0];
    return '';
  }

  function resolveProductPrice(product) {
    if (!product) return 0;

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const variantPrices = product.variants
        .map((variant) => parseFloat(variant?.price))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (variantPrices.length) return Math.min(...variantPrices);
    }

    const directPrice = parseFloat(
      product.display_price ||
      product.price ||
      product.product_price ||
      product.unit_price ||
      product.amount ||
      product.cost ||
      product.retail_price ||
      product.sale_price ||
      0
    );
    return Number.isFinite(directPrice) ? directPrice : 0;
  }

  function attachCollectionClickHandlers() {
    document.querySelectorAll('.collection-item').forEach((item) => {
      if (item._bound) return;
      item._bound = true;
      item.style.cursor = 'pointer';

      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const collectionName = item.dataset.name || 'Collection';
        await onCollectionClick(id, collectionName);
      });
    });
  }

  function attachFilterSortHandlers() {
    const sortSelect = document.getElementById('sort-select');
    sortSelect?.addEventListener('change', applyFilterSort);
  }

  function attachCategoryHandlers() {
    document.querySelectorAll('.category-btn').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        selectedCategory = button.dataset.category || 'all';

        document.querySelectorAll('.category-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');

        const source = Array.isArray(collectionModeProducts) ? collectionModeProducts : [];
        const target = selectedCategory.toLowerCase();

        if (target === 'all') {
          currentProducts = [...source];
        } else {
          currentProducts = source.filter((product) => getProductCategory(product) === target);
        }

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) sortSelect.value = '';
        await applyFilterSort();
      });
    });
  }

  function attachBackHandler() {
    const backLink = document.getElementById('collection-back-link');
    backLink?.addEventListener('click', () => {
      showCollectionsView();
    });
  }

  async function applyFilterSort() {
    const sort = document.getElementById('sort-select')?.value || '';
    const filtered = [...currentProducts];

    if (sort === 'low-high') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'high-low') filtered.sort((a, b) => b.price - a.price);
    if (sort === 'name-asc') filtered.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    if (sort === 'name-desc') filtered.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
    if (sort === 'newest') filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === 'oldest') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    renderProducts(filtered);
  }

  function renderProducts(products) {
    const container = document.getElementById('product-list');
    const count = document.getElementById('product-count');
    if (!container) return;

    container.innerHTML = '';
    if (count) {
      count.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
    }

    if (!products.length) {
      container.innerHTML = `<p class="no-products">No products found.</p>`;
      return;
    }

    for (const product of products) {
      const img = getProductImage(product) || '';
      const productId = product.product_id || product.id || product.productId;
      const price = resolveProductPrice(product);

      const box = document.createElement('div');
      box.className = 'product-item';
      box.dataset.productId = productId;
      box.innerHTML = `
        <img src="${img}" class="product-img" alt="${product.name || ''}">
        <h4>${product.name || ''}</h4>
        <p class="product-price">PHP ${price.toFixed(2)}</p>
      `;

      box.addEventListener('click', async () => {
        try {
          const productPath = communityType
            ? `/fanhub/${communityType}/product/${productId}`
            : `/product/${productId}`;
          history.pushState({ page: 'product', id: productId, communityType }, '', productPath);
          await ProductDetail(root, productId, communityType);
        } catch (err) {
          console.error('Failed to open product detail', err);
        }
      });

      container.appendChild(box);
    }
  }

  async function onCollectionClick(collectionId, collectionName) {
    const basicProducts = await loadProductsByCollection(collectionId);
    const products = [];

    for (const product of basicProducts) {
      const productId = product.product_id || product.id;
      if (!productId) continue;

      try {
        const detailsRes = await fetchProductDetails(productId, communityType);
        const fullProduct = detailsRes?.product;
        const variants = Array.isArray(detailsRes?.variants) ? detailsRes.variants : [];

        if (fullProduct) {
          const merged = {
            ...product,
            ...fullProduct,
            variants,
          };
          merged.price = resolveProductPrice(merged);
          products.push(merged);
        }
      } catch (err) {
        console.warn(`Failed to fetch details for product ${productId}:`, err);
        products.push({
          ...product,
          price: resolveProductPrice(product),
        });
      }
    }

    currentProducts = [...products];
    collectionModeProducts = [...products];
    selectedCategory = 'all';

    document.querySelectorAll('.category-btn').forEach((btn) => btn.classList.remove('active'));
    const allBtn = document.querySelector('.category-btn[data-category="all"]');
    if (allBtn) allBtn.classList.add('active');
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = '';

    showProductView(collectionName);
    renderProducts(products);
  }

  function showProductView(collectionName) {
    const collectionSection = document.getElementById('collection');
    const productSection = document.getElementById('product');
    const title = document.getElementById('product-section-title');

    if (title) title.textContent = collectionName || 'Collection';
    collectionSection?.classList.add('is-hidden');
    productSection?.classList.remove('is-hidden');
    productSection?.setAttribute('aria-hidden', 'false');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showCollectionsView() {
    const collectionSection = document.getElementById('collection');
    const productSection = document.getElementById('product');
    const productList = document.getElementById('product-list');
    const count = document.getElementById('product-count');
    const sortSelect = document.getElementById('sort-select');

    currentProducts = [];
    collectionModeProducts = null;
    selectedCategory = 'all';

    if (sortSelect) sortSelect.value = '';
    if (count) count.textContent = '0 products';
    if (productList) productList.innerHTML = '';

    document.querySelectorAll('.category-btn').forEach((btn) => btn.classList.remove('active'));
    const allBtn = document.querySelector('.category-btn[data-category="all"]');
    if (allBtn) allBtn.classList.add('active');

    productSection?.classList.add('is-hidden');
    productSection?.setAttribute('aria-hidden', 'true');
    collectionSection?.classList.remove('is-hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}