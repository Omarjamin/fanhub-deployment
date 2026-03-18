import '../../../styles/Admin_styles/Marketplace.css';
import { fetchAdminSites, resolveAdminSiteFromPath } from './admin-sites.js';
import {
  fetchMarketplaceProducts,
  fetchMarketplaceCollections,
  fetchMarketplaceCategories,
  createMarketplaceCollection,
  createMarketplaceProduct,
  updateMarketplaceProduct,
  deleteMarketplaceProduct,
  uploadMarketplaceImage,
} from '../../../services/admin_services/marketplace/marketplace-service.js';

export default function createMarketplace() {
  const ADMIN_SELECTED_COMMUNITY_KEY = 'admin_selected_site';
  const forcedSiteSlug = resolveAdminSiteFromPath();
  const isForcedSingleSite = Boolean(forcedSiteSlug);
  const BASE_V1 = import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1';

  function getSelectedCommunity() {
    if (isForcedSingleSite) return forcedSiteSlug;
    try {
      return String(
        sessionStorage.getItem(ADMIN_SELECTED_COMMUNITY_KEY) ||
        'all'
      ).trim().toLowerCase() || 'all';
    } catch (_) {
      return 'all';
    }
  }

  function persistSelectedCommunity(value) {
    try {
      const normalized = String(value || 'all').trim().toLowerCase() || 'all';
      const finalValue = isForcedSingleSite ? forcedSiteSlug : normalized;
      sessionStorage.setItem(ADMIN_SELECTED_COMMUNITY_KEY, finalValue);
      sessionStorage.setItem('site_slug', finalValue === 'all' ? '' : finalValue);
    } catch (_) {}
  }

  const section = document.createElement('section');
  section.id = 'marketplace';
  section.className = 'content-section active marketplace';

  section.innerHTML = `
    <div class="section-header">
      <h2>Marketplace Management</h2>
      <button class="add-product-btn" id="addProductBtn">+ Add Product</button>
    </div>

    <div class="marketplace-filters">
      <select class="category-filter" id="communityFilter">
        ${isForcedSingleSite ? '' : '<option value="">All Sites</option>'}
      </select>
      <select class="category-filter" id="collectionFilter" disabled>
        <option value="">All Collections</option>
      </select>
      <select class="category-filter" id="categoryFilter" disabled>
        <option value="">All Categories</option>
      </select>
      <button type="button" class="add-product-btn" id="globalAddCollectionBtn">+ Add Collection</button>
    </div>

    <div class="products-grid" id="productsGrid"></div>

    <div class="marketplace-modal hidden" id="addCollectionModal" role="dialog" aria-modal="true" aria-labelledby="addCollectionModalTitle">
      <div class="marketplace-modal-card">
        <div class="marketplace-modal-header">
          <h3 id="addCollectionModalTitle">Add Collection</h3>
          <button type="button" class="modal-close-btn" id="closeAddCollectionModal" aria-label="Close modal">x</button>
        </div>
        <form id="addCollectionForm" class="marketplace-form">
          <label class="marketplace-form-group">
            <span>Site</span>
            <select id="collectionModalCommunity" required>
              <option value="">Select Site</option>
            </select>
          </label>
          <label class="marketplace-form-group">
            <span>Collection Name</span>
            <input id="collectionModalName" type="text" placeholder="Enter collection name" required>
          </label>
          <label class="marketplace-form-group">
            <span>Collection Image</span>
            <input id="collectionModalImage" type="file" accept="image/*">
          </label>
          <div class="marketplace-form-actions">
            <button type="button" class="modal-btn cancel" id="cancelAddCollection">Cancel</button>
            <button type="submit" class="modal-btn save">Save Collection</button>
          </div>
        </form>
      </div>
    </div>

    <div class="marketplace-modal hidden" id="addProductModal" role="dialog" aria-modal="true" aria-labelledby="addProductModalTitle">
      <div class="marketplace-modal-card">
        <div class="marketplace-modal-header">
          <h3 id="addProductModalTitle">Add Product</h3>
          <button type="button" class="modal-close-btn" id="closeAddProductModal" aria-label="Close modal">x</button>
        </div>
        <form id="addProductForm" class="marketplace-form">
          <label class="marketplace-form-group">
            <span>Site</span>
            <select id="newProductCommunity" required>
              <option value="">Select Site</option>
            </select>
          </label>
          <label class="marketplace-form-group">
            <span>Collection Type</span>
            <select id="newProductCollection" required disabled>
              <option value="">Select Collection</option>
            </select>
          </label>
          <label class="marketplace-form-group">
            <span>Product Category</span>
            <select id="newProductCategory" required disabled>
              <option value="">Select Category</option>
            </select>
          </label>
          <label class="marketplace-form-group">
            <span>Product Name</span>
            <input id="newProductName" type="text" placeholder="Enter product name" required>
          </label>
          <label class="marketplace-form-group">
            <span>Product Image</span>
            <input id="newProductImage" type="file" accept="image/*">
          </label>
          <div class="marketplace-form-group">
            <div class="variant-header">
              <div>
                <span>Product Variants</span>
                <p class="variant-helper-text">Set the shipping package details per variant: weight, length, width, and height.</p>
              </div>
              <button type="button" class="modal-btn add-variant" id="addVariantBtn">+ Add Variant</button>
            </div>
            <div id="variantRows" class="variant-rows"></div>
          </div>
          <div class="marketplace-form-actions">
            <button type="button" class="modal-btn cancel" id="cancelAddProduct">Cancel</button>
            <button type="submit" class="modal-btn save" id="saveProductBtn">Save Product</button>
          </div>
        </form>
      </div>
    </div>

    <div class="marketplace-modal hidden" id="deleteProductModal" role="dialog" aria-modal="true" aria-labelledby="deleteProductModalTitle">
      <div class="marketplace-modal-card delete-modal-card">
        <div class="marketplace-modal-header">
          <h3 id="deleteProductModalTitle">Delete Product</h3>
          <button type="button" class="modal-close-btn" id="closeDeleteProductModal" aria-label="Close modal">x</button>
        </div>
        <div class="delete-modal-body">
          <p id="deleteProductMessage">Deleting the product. Are you sure?</p>
        </div>
        <div class="delete-modal-actions">
          <button type="button" class="modal-btn cancel" id="cancelDeleteProduct">Cancel</button>
          <button type="button" class="modal-btn danger" id="confirmDeleteProduct">Yes, Delete</button>
        </div>
      </div>
    </div>
  `;

  // Local state for products (initialized empty; will be populated from API)
  let products = [];
  let communityOptions = [{ key: 'all', label: 'All Sites', community_id: null }];
  const collectionOptionsByCommunity = new Map();
  const collectionIdByCommunityAndName = new Map();
  const filterCollectionsByCommunity = new Map();
  const categoryOptionsByCommunityCollection = new Map();
  const defaultCategoryOptions = ['Apparel', 'Accessories', 'Collectibles', 'Music'];

  let editingProductId = null;
  let deleteProductId = null;

  function formatPrice(value) {
    return `PHP ${Number(value).toLocaleString()}`;
  }

  function toPositiveNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
  }

  function formatVariantDimensionSummary(variant) {
    const length = toPositiveNumber(variant.length_cm ?? variant.lengthCm ?? variant.length);
    const width = toPositiveNumber(variant.width_cm ?? variant.widthCm ?? variant.width);
    const height = toPositiveNumber(variant.height_cm ?? variant.heightCm ?? variant.height);

    if (length <= 0 && width <= 0 && height <= 0) {
      return 'Size not set';
    }

    return `${length.toLocaleString()} x ${width.toLocaleString()} x ${height.toLocaleString()} cm`;
  }

  function renderVariantMetaChips(variant) {
    const price = formatPrice(variant.price);
    const stock = `Stocks ${toPositiveNumber(variant.stock).toLocaleString()}`;
    const weight = `${toPositiveNumber(variant.weight_g ?? variant.weightG ?? variant.weight).toLocaleString()}g`;
    const dimensions = formatVariantDimensionSummary(variant);

    return `
      <div class="variant-meta-list">
        <span class="variant-meta-chip">${price}</span>
        <span class="variant-meta-chip">${stock}</span>
        <span class="variant-meta-chip">${weight}</span>
        <span class="variant-meta-chip">${dimensions}</span>
      </div>
    `;
  }

  function getBackendOrigin() {
    try {
      return new URL(BASE_V1).origin;
    } catch (_) {
      return '';
    }
  }

  function resolveProductImage(rawUrl) {
    const fallback = '/placeholder.svg?height=200&width=200';
    const value = String(rawUrl || '').trim();
    if (!value) return fallback;

    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value;
    }

    const base = getBackendOrigin();
    if (value.startsWith('/')) {
      return base ? `${base}${value}` : value;
    }
    return base ? `${base}/${value}` : value;
  }

  function findProductById(productId) {
    return products.find(product => product.id === productId);
  }

  function getCommunityIdByKey(key = '') {
    const normalized = String(key || '').trim().toLowerCase();
    const found = communityOptions.find((option) => String(option.key || '').trim().toLowerCase() === normalized);
    return Number(found?.community_id || 0) || null;
  }

  function normalizeVariantForForm(variant) {
    const variantName = String(
      variant.variant_name ?? variant.variantName ?? 'Variant'
    ).trim() || 'Variant';
    const variantValue = String(
      variant.variant_values ?? variant.variantValue ?? variant.label ?? ''
    ).trim();
    const weightG = Number(
      variant.weight_g ?? variant.weightG ?? variant.weight ?? 0,
    );
    const lengthCm = Number(
      variant.length_cm ?? variant.lengthCm ?? variant.length ?? 0,
    );
    const widthCm = Number(
      variant.width_cm ?? variant.widthCm ?? variant.width ?? 0,
    );
    const heightCm = Number(
      variant.height_cm ?? variant.heightCm ?? variant.height ?? 0,
    );
    return {
      variantName,
      variantValue,
      stock: Number(variant.stock) || 0,
      price: Number(variant.price) || 0,
      weight_g: Number.isFinite(weightG) && weightG >= 0 ? weightG : 0,
      length_cm: Number.isFinite(lengthCm) && lengthCm >= 0 ? lengthCm : 0,
      width_cm: Number.isFinite(widthCm) && widthCm >= 0 ? widthCm : 0,
      height_cm: Number.isFinite(heightCm) && heightCm >= 0 ? heightCm : 0,
    };
  }

  function loadCommunityFilter() {
    const communityFilter = section.querySelector('#communityFilter');
    const selected = getSelectedCommunity();

    communityFilter.innerHTML = `
      ${isForcedSingleSite ? '' : '<option value="">All Sites</option>'}
      ${communityOptions
        .filter(option => option.key !== 'all')
        .map(option => (
        `<option value="${option.key}" data-community-id="${option.community_id || ''}">${option.label}</option>`
      )).join('')}
    `;

    if (isForcedSingleSite) {
      communityFilter.value = forcedSiteSlug;
      communityFilter.disabled = true;
    } else if (selected && selected !== 'all') {
      communityFilter.value = selected;
    }
  }

  function loadCollectionFilterOptions() {
    const collectionFilter = section.querySelector('#collectionFilter');
    const prevValue = String(collectionFilter.value || '').trim();
    const selectedCommunity = String(
      section.querySelector('#communityFilter').value || ''
    )
      .trim()
      .toLowerCase();

    let collections = [];
    if (selectedCommunity) {
      collections = [...(filterCollectionsByCommunity.get(selectedCommunity) || [])];
    } else {
      const allSets = [...filterCollectionsByCommunity.values()];
      collections = [...new Set(allSets.flat())];
    }

    collectionFilter.innerHTML = `
      <option value="">All Collections</option>
      ${collections.map(name => `<option value="${name}">${name}</option>`).join('')}
    `;
    collectionFilter.disabled = collections.length === 0;
    if (prevValue && collections.includes(prevValue)) {
      collectionFilter.value = prevValue;
    } else {
      collectionFilter.value = '';
    }
  }

  function loadCategoryFilterOptions() {
    const categoryFilter = section.querySelector('#categoryFilter');
    const selectedCategory = String(categoryFilter.value || '').trim();
    const categories = [...defaultCategoryOptions];

    categoryFilter.innerHTML = `
      <option value="">All Categories</option>
      ${categories.map(name => `<option value="${name}">${name}</option>`).join('')}
    `;
    categoryFilter.disabled = false;
    if (selectedCategory && categories.includes(selectedCategory)) {
      categoryFilter.value = selectedCategory;
    } else {
      categoryFilter.value = '';
    }
  }

  async function applyMarketplaceSelection({
    communityChanged = false,
    forceCommunity,
  } = {}) {
    const communityFilter = section.querySelector('#communityFilter');
    const normalizedCommunity = String(
      forceCommunity ?? communityFilter.value ?? 'all'
    )
      .trim()
      .toLowerCase() || 'all';

    if (communityChanged) {
      section.querySelector('#collectionFilter').value = '';
      section.querySelector('#categoryFilter').value = '';
      persistSelectedCommunity(normalizedCommunity);
      await fetchProducts(normalizedCommunity);
      loadCommunityFilter();
      if (normalizedCommunity !== 'all') {
        communityFilter.value = normalizedCommunity;
      } else {
        communityFilter.value = '';
      }
    }

    loadCollectionFilterOptions();
    loadCategoryFilterOptions();
    filterProducts();
  }

  function loadAddProductCommunities() {
    const communitySelect = section.querySelector('#newProductCommunity');

    communitySelect.innerHTML = `
      <option value="">Select Site</option>
      ${communityOptions
        .filter(option => option.key !== 'all')
        .map(option => (
        `<option value="${option.key}" data-community-id="${option.community_id || ''}">${option.label}</option>`
      )).join('')}
    `;
  }

  async function loadCollectionOptions(communityOverride) {
    const community = String(
      communityOverride ?? section.querySelector('#newProductCommunity').value
    )
      .trim()
      .toLowerCase();
    const community_id = getCommunityIdByKey(community);
    const collectionSelect = section.querySelector('#newProductCollection');
    const cachedCollections = collectionOptionsByCommunity.get(community);
    const collections = cachedCollections || [];

    collectionSelect.innerHTML = `
      <option value="">Select Collection</option>
      ${collections.map(collection => (
        `<option value="${collection}">${collection}</option>`
      )).join('')}
    `;
    collectionSelect.disabled = !community || !collections.length;

    if (!community || cachedCollections) return;

    try {
      const rows = await fetchMarketplaceCollections(community, community_id);
      let names = rows
        .map(row => String(row?.name || '').trim())
        .filter(Boolean);
      rows.forEach(row => {
        const cname = String(row?.name || '').trim();
        const cid = Number(row?.collection_id);
        if (!cname || Number.isNaN(cid) || cid <= 0) return;
        collectionIdByCommunityAndName.set(`${community}::${cname.toLowerCase()}`, cid);
      });
      if (!names.length) {
        names = ['General'];
      }
      collectionOptionsByCommunity.set(community, names);

      const isSameSelection =
        section.querySelector('#newProductCommunity').value === community;
      if (isSameSelection) {
        collectionSelect.innerHTML = `
          <option value="">Select Collection</option>
          ${names.map(name => `<option value="${name}">${name}</option>`).join('')}
        `;
        collectionSelect.disabled = names.length === 0;
      }
    } catch (error) {
      console.error('Failed to load collection options:', error);
      collectionOptionsByCommunity.set(community, ['General']);
    }
  }

  async function loadCategoryOptions(categoryOverride) {
    const community = String(
      section.querySelector('#newProductCommunity').value || ''
    )
      .trim()
      .toLowerCase();
    const community_id = getCommunityIdByKey(community);
    const collection = String(
      section.querySelector('#newProductCollection').value || ''
    ).trim();
    const categorySelect = section.querySelector('#newProductCategory');
    const cacheKey = `${community}::${collection.toLowerCase()}`;
    let categories = categoryOptionsByCommunityCollection.get(cacheKey) || [];

    if (community && collection && !categories.length) {
      try {
        const collectionId = collectionIdByCommunityAndName.get(cacheKey);
        const rows = await fetchMarketplaceCategories({
          community,
          community_id,
          collectionId,
        });
        categories = rows
          .map(row => String(row?.category_name || '').trim())
          .filter(Boolean);
        categoryOptionsByCommunityCollection.set(cacheKey, categories);
      } catch (error) {
        console.warn('Failed to load categories for collection:', error);
      }
    }

    if (!categories.length) {
      categories = [...defaultCategoryOptions];
    }

    categorySelect.innerHTML = `
      <option value="">Select Category</option>
      ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
    `;
    categorySelect.disabled = !community || !collection;

    const selected = String(categoryOverride || '').trim();
    if (selected && categories.includes(selected)) {
      categorySelect.value = selected;
    }
  }

  function createVariantRow(values = {}) {
    return `
      <div class="variant-input-row">
        <label class="variant-field variant-field-wide">
          <span>Variant Name</span>
          <input type="text" class="variant-name" placeholder="ex. Size" value="${values.variantName || ''}" required>
        </label>
        <label class="variant-field variant-field-wide">
          <span>Variant Value</span>
          <input type="text" class="variant-value" placeholder="ex. Small" value="${values.variantValue || ''}" required>
        </label>
        <label class="variant-field">
          <span>Stocks</span>
          <input type="number" class="variant-stock" placeholder="0" min="0" value="${values.stock ?? ''}" required>
        </label>
        <label class="variant-field">
          <span>Price</span>
          <input type="number" class="variant-price" placeholder="0.00" min="0" step="0.01" value="${values.price ?? ''}" required>
        </label>
        <label class="variant-field">
          <span>Weight (g)</span>
          <input type="number" class="variant-weight" placeholder="0" min="0" step="0.01" value="${values.weight_g ?? ''}" required>
        </label>
        <label class="variant-field">
          <span>Length (cm)</span>
          <input type="number" class="variant-length" placeholder="0" min="0" step="0.01" value="${values.length_cm ?? ''}">
        </label>
        <label class="variant-field">
          <span>Width (cm)</span>
          <input type="number" class="variant-width" placeholder="0" min="0" step="0.01" value="${values.width_cm ?? ''}">
        </label>
        <label class="variant-field">
          <span>Height (cm)</span>
          <input type="number" class="variant-height" placeholder="0" min="0" step="0.01" value="${values.height_cm ?? ''}">
        </label>
        <div class="variant-row-actions">
          <button type="button" class="remove-variant-btn" aria-label="Remove variant">Remove</button>
        </div>
      </div>
    `;
  }

  function addVariantRow(defaultValues) {
    const container = section.querySelector('#variantRows');
    container.insertAdjacentHTML('beforeend', createVariantRow(defaultValues));
  }

  function resetVariantRows() {
    const container = section.querySelector('#variantRows');
    container.innerHTML = '';
    addVariantRow();
  }

  function getVariantLabel(variant) {
    if (variant.label) return variant.label;
    if (variant.variant_name || variant.variant_values) {
      return `${variant.variant_name || 'Variant'}: ${
        variant.variant_values || ''
      }`;
    }
    return `${variant.variantName || 'Variant'}: ${
      variant.variantValue || ''
    }`;
  }

  function renderVariantRows(variants = []) {
    if (!variants.length) {
      return '<li class="product-variant-row"><span class="variant-meta">No variants</span></li>';
    }

    return variants.map(variant => `
      <li class="product-variant-row">
        <span class="variant-label">${getVariantLabel(variant)}</span>
        ${renderVariantMetaChips(variant)}
      </li>
    `).join('');
  }

  function loadProducts() {
    const grid = section.querySelector('#productsGrid');
    grid.innerHTML = products.map(product => `
      <div class="product-card" data-product-id="${product.id}" data-community="${product.communityKey}">
        <div class="product-image-frame">
          <img src="${product.image}" alt="${product.name || 'Untitled Product'}" class="product-image" onerror="this.onerror=null;this.src='/placeholder.svg?height=200&width=200'">
        </div>
        <div class="product-info">
          <div class="product-copy">
            <h4 class="product-name">${product.name || 'Untitled Product'}</h4>
            <div class="product-meta-row">
              <span class="product-chip">Collection: ${product.collectionName || 'General'}</span>
              <span class="product-chip">Category: ${product.productCategory || 'Apparel'}</span>
            </div>
          </div>
          <ul class="product-variants">
            ${renderVariantRows(product.variants)}
          </ul>
          <div class="product-actions">
            <button type="button" class="action-btn-marketplace edit" data-action="edit">Edit</button>
            <button type="button" class="action-btn-marketplace delete" data-action="delete">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function filterProducts() {
    const community = section.querySelector('#communityFilter').value.toLowerCase();
    const collection = String(
      section.querySelector('#collectionFilter').value || ''
    )
      .trim()
      .toLowerCase();
    const category = String(
      section.querySelector('#categoryFilter').value || ''
    )
      .trim()
      .toLowerCase();

    section.querySelectorAll('.product-card').forEach(card => {
      const cardCommunity = card.dataset.community || '';
      const product = findProductById(card.dataset.productId);
      const matchCommunity = !community || cardCommunity === community;
      const productCollection = String(product?.collectionName || '')
        .trim()
        .toLowerCase();
      const productCategory = String(product?.productCategory || '')
        .trim()
        .toLowerCase();
      const matchCollection = !collection || productCollection === collection;
      const matchCategory = !category || productCategory === category;
      card.style.display = matchCommunity && matchCollection && matchCategory ? '' : 'none';
    });
  }

  function setupProductFilters() {
    section.querySelector('#communityFilter').addEventListener('change', async event => {
      const selected = String(event.target.value || 'all').trim().toLowerCase() || 'all';
      await applyMarketplaceSelection({ communityChanged: true, forceCommunity: selected });
    });
    section.querySelector('#collectionFilter').addEventListener('change', () => {
      applyMarketplaceSelection();
    });
    section.querySelector('#categoryFilter').addEventListener('change', () => {
      applyMarketplaceSelection();
    });
  }

  function setupManagementActions() {
    const addCollectionBtn = section.querySelector('#globalAddCollectionBtn');
    const communityFilter = section.querySelector('#communityFilter');
    const collectionFilter = section.querySelector('#collectionFilter');
    const addCollectionModal = section.querySelector('#addCollectionModal');
    const addCollectionForm = section.querySelector('#addCollectionForm');
    const closeAddCollectionModal = section.querySelector('#closeAddCollectionModal');
    const cancelAddCollection = section.querySelector('#cancelAddCollection');
    const collectionModalCommunity = section.querySelector('#collectionModalCommunity');
    const collectionModalName = section.querySelector('#collectionModalName');
    const collectionModalImage = section.querySelector('#collectionModalImage');

    function renderCommunityOptions(excludeAll = true) {
      const rows = communityOptions.filter(option =>
        excludeAll ? option.key !== 'all' : true
      );
      return rows
        .map(option => `<option value="${option.key}" data-community-id="${option.community_id || ''}">${option.label}</option>`)
        .join('');
    }

    function closeCollectionModal() {
      addCollectionModal.classList.add('hidden');
      addCollectionForm.reset();
    }

    addCollectionBtn.addEventListener('click', () => {
      collectionModalCommunity.innerHTML = `
        <option value="">Select Site</option>
        ${renderCommunityOptions(true)}
      `;
      const selectedCommunity = String(communityFilter.value || '').trim().toLowerCase();
      if (selectedCommunity && selectedCommunity !== 'all') {
        collectionModalCommunity.value = selectedCommunity;
      }
      addCollectionModal.classList.remove('hidden');
    });

    closeAddCollectionModal.addEventListener('click', closeCollectionModal);
    cancelAddCollection.addEventListener('click', closeCollectionModal);
    addCollectionModal.addEventListener('click', event => {
      if (event.target === addCollectionModal) closeCollectionModal();
    });

    addCollectionForm.addEventListener('submit', async event => {
      event.preventDefault();
      const community = String(collectionModalCommunity.value || '').trim().toLowerCase();
      const selectedOption = collectionModalCommunity.options?.[collectionModalCommunity.selectedIndex];
      const community_id = Number(selectedOption?.dataset?.communityId || 0) || getCommunityIdByKey(community) || null;
      const name = String(collectionModalName.value || '').trim();
      if (!community || !name) return;

      let imgUrl = null;
      const imageFile = collectionModalImage.files?.[0];
      if (imageFile) {
        imgUrl = await uploadMarketplaceImage(imageFile);
      }

      try {
        await createMarketplaceCollection({ community, community_id, name, img_url: imgUrl });
        collectionOptionsByCommunity.delete(community);
        await fetchProducts(community);
        await applyMarketplaceSelection({ forceCommunity: community });
        collectionFilter.value = name;
        await applyMarketplaceSelection();
        closeCollectionModal();
      } catch (error) {
        console.error('Failed to create collection:', error);
        alert(error.message || 'Failed to add collection.');
      }
    });
  }

  function setupDeleteModal() {
    const modal = section.querySelector('#deleteProductModal');
    const closeBtn = section.querySelector('#closeDeleteProductModal');
    const cancelBtn = section.querySelector('#cancelDeleteProduct');
    const confirmBtn = section.querySelector('#confirmDeleteProduct');
    const message = section.querySelector('#deleteProductMessage');

    function closeDeleteModal() {
      deleteProductId = null;
      modal.classList.add('hidden');
    }

    function openDeleteModal(productId) {
      deleteProductId = productId;
      const product = findProductById(productId);
      message.textContent = `Deleting "${product?.name || 'this product'}". Continue?`;
      modal.classList.remove('hidden');
    }

    closeBtn.addEventListener('click', closeDeleteModal);
    cancelBtn.addEventListener('click', closeDeleteModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeDeleteModal();
    });

    confirmBtn.addEventListener('click', async () => {
      if (!deleteProductId) return;
      const product = findProductById(deleteProductId);
      const dbProductId =
        product?.productId ??
        Number(String(deleteProductId || '').match(/(\d+)$/)?.[1] || 0);
      if (!dbProductId) {
        closeDeleteModal();
        return;
      }

      try {
        const selectedCommunity = getSelectedCommunity();
        const deleteCommunity =
          selectedCommunity && selectedCommunity !== 'all'
            ? selectedCommunity
            : product?.communityKey || '';
        const deleteCommunityId = getCommunityIdByKey(deleteCommunity) || Number(product?.community_id || 0) || null;
        await deleteMarketplaceProduct(dbProductId, deleteCommunity, deleteCommunityId);
        await fetchProducts(selectedCommunity);
      } catch (error) {
        console.error('Failed to delete product:', error);
        alert(error.message || 'Failed to delete product. Please try again.');
      }
      closeDeleteModal();
    });

    return { openDeleteModal, closeDeleteModal };
  }

  function setupProductModal() {
    const modal = section.querySelector('#addProductModal');
    const openBtn = section.querySelector('#addProductBtn');
    const closeBtn = section.querySelector('#closeAddProductModal');
    const cancelBtn = section.querySelector('#cancelAddProduct');
    const form = section.querySelector('#addProductForm');
    const title = section.querySelector('#addProductModalTitle');
    const submitBtn = section.querySelector('#saveProductBtn');
    const communitySelect = section.querySelector('#newProductCommunity');
    const collectionSelect = section.querySelector('#newProductCollection');
    const productCategorySelect = section.querySelector('#newProductCategory');
    const productNameInput = section.querySelector('#newProductName');
    const imageInput = section.querySelector('#newProductImage');
    const addVariantBtn = section.querySelector('#addVariantBtn');
    const variantRows = section.querySelector('#variantRows');

    function closeModal() {
      modal.classList.add('hidden');
    }

    async function openAddModal() {
      editingProductId = null;
      form.reset();
      loadAddProductCommunities();
      const selectedCommunity = getSelectedCommunity();
      if (selectedCommunity && selectedCommunity !== 'all') {
        communitySelect.value = selectedCommunity;
      }
      await loadCollectionOptions();
      await loadCategoryOptions();
      resetVariantRows();
      title.textContent = 'Add Product';
      submitBtn.textContent = 'Save Product';
      modal.classList.remove('hidden');
    }

    async function openEditModal(productId) {
      const product = findProductById(productId);
      if (!product) return;

      editingProductId = productId;
      form.reset();
      loadAddProductCommunities();
      communitySelect.value = product.communityKey;
      await loadCollectionOptions(product.communityKey);
      collectionSelect.value = product.collectionName || '';
      await loadCategoryOptions(product.productCategory || '');
      productNameInput.value = product.name;
      imageInput.value = '';
      variantRows.innerHTML = '';
      (product.variants || []).forEach(variant => {
        addVariantRow(normalizeVariantForForm(variant));
      });
      if (!variantRows.children.length) {
        addVariantRow();
      }
      title.textContent = 'Edit Product';
      submitBtn.textContent = 'Update Product';
      modal.classList.remove('hidden');
    }

    function collectVariants() {
      return [...variantRows.querySelectorAll('.variant-input-row')].map(row => ({
        variantName: row.querySelector('.variant-name').value.trim(),
        variantValue: row.querySelector('.variant-value').value.trim(),
        stock: Number(row.querySelector('.variant-stock').value),
        price: Number(row.querySelector('.variant-price').value),
        weight_g: Number(row.querySelector('.variant-weight').value),
        length_cm: Number(row.querySelector('.variant-length').value),
        width_cm: Number(row.querySelector('.variant-width').value),
        height_cm: Number(row.querySelector('.variant-height').value)
      }));
    }

    openBtn.addEventListener('click', () => {
      openAddModal();
    });
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    communitySelect.addEventListener('change', async () => {
      await loadCollectionOptions();
      await loadCategoryOptions();
    });
    collectionSelect.addEventListener('change', async () => {
      await loadCategoryOptions();
    });
    addVariantBtn.addEventListener('click', () => addVariantRow());

    variantRows.addEventListener('click', event => {
      const removeBtn = event.target.closest('.remove-variant-btn');
      if (!removeBtn) return;
      if (variantRows.children.length === 1) return;
      removeBtn.closest('.variant-input-row')?.remove();
    });

    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const community = communitySelect.value;
      const selectedCommunityOption = communitySelect.options?.[communitySelect.selectedIndex];
      const community_id = Number(selectedCommunityOption?.dataset?.communityId || 0) || null;
      const collection = collectionSelect.value;
      const productCategory = productCategorySelect.value.trim();
      const productName = productNameInput.value.trim();
      const imageFile = imageInput.files?.[0];
      const variants = collectVariants();

      if (!productName) {
        alert('Product name is required.');
        return;
      }
      if (!productCategory) {
        alert('Please select a product category.');
        return;
      }

      const payload = {
        name: productName,
        community,
        community_id,
        collection,
        product_category: productCategory,
        image_url: null,
        variants: variants.map(v => ({
          variantName: v.variantName,
          variantValue: v.variantValue,
          stock: v.stock,
          price: v.price,
          weight_g: v.weight_g,
          length_cm: v.length_cm,
          width_cm: v.width_cm,
          height_cm: v.height_cm
        }))
      };

      if (editingProductId) {
        const product = findProductById(editingProductId);
        if (!product) return;
        if (imageFile) {
          payload.image_url = await uploadMarketplaceImage(imageFile);
        } else if (typeof product.image === 'string' && product.image.startsWith('http')) {
          payload.image_url = product.image;
        }
        const dbProductId =
          product.productId ??
          Number(String(editingProductId || '').match(/(\d+)$/)?.[1] || 0);
        try {
          await updateMarketplaceProduct(dbProductId, payload, community, community_id);
          persistSelectedCommunity(community || getSelectedCommunity());
          await fetchProducts(getSelectedCommunity());
          closeModal();
        } catch (error) {
          console.error('Failed to update product:', error);
          alert(error.message || 'Failed to update product. Please try again.');
        }
      } else {
        if (imageFile) {
          payload.image_url = await uploadMarketplaceImage(imageFile);
        }
        try {
          await createMarketplaceProduct(payload);
          persistSelectedCommunity(community || getSelectedCommunity());
          await fetchProducts(getSelectedCommunity());
          closeModal();
        } catch (error) {
          console.error('Failed to create product:', error);
          alert(error.message || 'Failed to create product. Please try again.');
        }
      }
    });

    return { openEditModal, closeModal };
  }

  function setupProductActions(productModalApi, deleteModalApi) {
    section.addEventListener('click', event => {
      const actionBtn = event.target.closest('[data-action]');
      const card = event.target.closest('.product-card');
      if (!actionBtn || !card) return;

      const productId = card.dataset.productId;
      const action = actionBtn.dataset.action;

      if (action === 'edit') {
        productModalApi.openEditModal(productId);
      } else if (action === 'delete') {
        deleteModalApi.openDeleteModal(productId);
      }
    });
  }

  async function fetchCommunityOptions() {
    try {
      const rows = await fetchAdminSites();
      const scopedRows = isForcedSingleSite
        ? rows.filter((row) => String(row?.domain || '').trim().toLowerCase() === forcedSiteSlug)
        : rows;

      const seen = new Set();
      const options = isForcedSingleSite ? [] : [{ key: 'all', label: 'All Sites' }];
      scopedRows.forEach(row => {
        const key = String(row?.domain || '').trim().toLowerCase();
        const normalized = String(row?.site_name || row?.domain || '').trim();
        if (!key || !normalized || seen.has(key)) return;
        seen.add(key);
        const community_id = Number(row?.community_id || row?.id || row?.site_id || 0) || null;
        options.push({ key, label: normalized, community_id });
      });

      communityOptions = options.length
        ? options
        : (isForcedSingleSite
          ? [{ key: forcedSiteSlug, label: forcedSiteSlug.toUpperCase() }]
          : [{ key: 'all', label: 'All Sites', community_id: null }]);
    } catch (error) {
      console.error('Error fetching communities from admin database:', error);
      communityOptions = [{ key: 'all', label: 'All Sites', community_id: null }];
    }
  }

  async function fetchProducts(communityKey = 'all') {
    try {
      const normalizedCommunity =
        String(communityKey || 'all').trim().toLowerCase() || 'all';
      let rows = [];

      if (normalizedCommunity === 'all') {
        const communityPairs = communityOptions
          .filter(option => option.key && option.key !== 'all')
          .map(option => ({ key: option.key, community_id: option.community_id }));
        const responses = await Promise.allSettled(
          communityPairs.map(async ({ key, community_id }) => {
            const list = await fetchMarketplaceProducts(key, community_id);
            return list.map(item => ({ ...item, __community_key: key, __community_id: community_id }));
          })
        );
        rows = responses
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value);
      } else {
        let list = [];
        try {
          list = await fetchMarketplaceProducts(normalizedCommunity, getCommunityIdByKey(normalizedCommunity));
        } catch (error) {
          console.warn(
            `[Marketplace] Community "${normalizedCommunity}" fetch failed:`,
            error,
          );
          products = [];
          loadProducts();
          await applyMarketplaceSelection();
          return;
        }
        rows = list.map(item => ({ ...item, __community_key: normalizedCommunity, __community_id: getCommunityIdByKey(normalizedCommunity) }));
      }

      products = rows.map(row => {
        const variants = Array.isArray(row.variants) ? row.variants : [];
        const communityKeyValue = String(
          row.__community_key || row.community_key || normalizedCommunity || 'all'
        )
          .trim()
          .toLowerCase();
        const matchedOption = communityOptions.find(
          option => option.key === communityKeyValue
        );
        const communityLabel = matchedOption?.label || row.community_label || communityKeyValue.toUpperCase();

        return {
          id: `#${communityKeyValue}-PRD${row.product_id}`,
          productId: row.product_id,
          name: String(row.name || row.product_name || '').trim() || 'Untitled Product',
          db_name: row.db_name || null,
          communityKey: communityKeyValue,
          community_id: Number(row.__community_id || row.community_id || getCommunityIdByKey(communityKeyValue) || 0) || null,
          community: communityLabel,
          collectionId: row.collection_id || null,
          collectionName: String(row.collection_name || '').trim(),
          productCategory: String(row.product_category || 'Apparel').trim(),
          sold: 0,
          image:
            resolveProductImage(row.image_url),
          variants,
        };
      });

      // Build filter collection options from the current fetched dataset.
      filterCollectionsByCommunity.clear();
      products.forEach(product => {
        const key = String(product.communityKey || '').trim().toLowerCase();
        const name = String(product.collectionName || '').trim();
        if (!key || !name) return;
        const list = filterCollectionsByCommunity.get(key) || [];
        if (!list.includes(name)) list.push(name);
        filterCollectionsByCommunity.set(key, list);
        const colId = Number(product.collectionId);
        if (!Number.isNaN(colId) && colId > 0) {
          collectionIdByCommunityAndName.set(`${key}::${name.toLowerCase()}`, colId);
        }
      });

      if (normalizedCommunity !== 'all') {
        try {
          const allCollections = await fetchMarketplaceCollections(
            normalizedCommunity,
            getCommunityIdByKey(normalizedCommunity),
          );
          const list = allCollections
            .map(row => String(row?.name || '').trim())
            .filter(Boolean);
          filterCollectionsByCommunity.set(normalizedCommunity, [...new Set(list)]);
          allCollections.forEach(row => {
            const name = String(row?.name || '').trim();
            const colId = Number(row?.collection_id);
            if (!name || Number.isNaN(colId) || colId <= 0) return;
            collectionIdByCommunityAndName.set(
              `${normalizedCommunity}::${name.toLowerCase()}`,
              colId,
            );
          });
        } catch (error) {
          console.warn('Failed loading full collection list for filter:', error);
        }
      }

      loadCommunityFilter();
      loadAddProductCommunities();
      loadProducts();
      await applyMarketplaceSelection();
    } catch (error) {
      console.error('Error fetching marketplace products:', error);
      // Leave products as-is (could be empty) on failure
    }
  }

  async function initMarketplace() {
    const selectedCommunity = getSelectedCommunity();
    await fetchCommunityOptions();
    persistSelectedCommunity(selectedCommunity);
    loadCommunityFilter();
    loadAddProductCommunities();
    await fetchProducts(selectedCommunity);
    await applyMarketplaceSelection({ forceCommunity: selectedCommunity });
    setupProductFilters();
    setupManagementActions();

    const productModalApi = setupProductModal();
    const deleteModalApi = setupDeleteModal();
    setupProductActions(productModalApi, deleteModalApi);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      section.querySelector('#addProductModal').classList.add('hidden');
      section.querySelector('#deleteProductModal').classList.add('hidden');
      section.querySelector('#addCollectionModal').classList.add('hidden');
    });
  }

  initMarketplace();
  return section;
}



