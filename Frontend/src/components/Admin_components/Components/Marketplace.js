import '../../../styles/Admin_styles/Marketplace.css';
import { fetchAdminSites } from './admin-sites.js';
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
  const BASE_V1 = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';

  function getSelectedCommunity() {
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
      sessionStorage.setItem(ADMIN_SELECTED_COMMUNITY_KEY, normalized);
      sessionStorage.setItem('site_slug', normalized === 'all' ? '' : normalized);
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
        <option value="">All Sites</option>
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
              <span>Product Variants</span>
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
  let communityOptions = [{ key: 'all', label: 'All Sites' }];
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

  function getBackendOrigin() {
    try {
      return new URL(BASE_V1).origin;
    } catch (_) {
      return 'http://localhost:4000';
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
      return `${base}${value}`;
    }
    return `${base}/${value}`;
  }

  function findProductById(productId) {
    return products.find(product => product.id === productId);
  }

  function normalizeVariantForForm(variant) {
    const weightG = Number(
      variant.weight_g ?? variant.weightG ?? variant.weight ?? 0,
    );
    if (variant.variantName || variant.variantValue) {
      return {
        variantName: variant.variantName || 'Variant',
        variantValue: variant.variantValue || '',
        stock: Number(variant.stock) || 0,
        price: Number(variant.price) || 0,
        weight_g: Number.isFinite(weightG) && weightG >= 0 ? weightG : 0,
      };
    }

    return {
      variantName: 'Variant',
      variantValue: variant.label || '',
      stock: Number(variant.stock) || 0,
      price: Number(variant.price) || 0,
      weight_g: Number.isFinite(weightG) && weightG >= 0 ? weightG : 0,
    };
  }

  function loadCommunityFilter() {
    const communityFilter = section.querySelector('#communityFilter');
    const selected = getSelectedCommunity();

    communityFilter.innerHTML = `
      <option value="">All Sites</option>
      ${communityOptions
        .filter(option => option.key !== 'all')
        .map(option => (
        `<option value="${option.key}">${option.label}</option>`
      )).join('')}
    `;

    if (selected && selected !== 'all') {
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
        `<option value="${option.key}">${option.label}</option>`
      )).join('')}
    `;
  }

  async function loadCollectionOptions(communityOverride) {
    const community = String(
      communityOverride ?? section.querySelector('#newProductCommunity').value
    )
      .trim()
      .toLowerCase();
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
      const rows = await fetchMarketplaceCollections(community);
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
        <input type="text" class="variant-name" placeholder="Variant Name (ex. Size)" value="${values.variantName || ''}" required>
        <input type="text" class="variant-value" placeholder="Variant Value (ex. Small)" value="${values.variantValue || ''}" required>
        <input type="number" class="variant-stock" placeholder="Stocks" min="0" value="${values.stock ?? ''}" required>
        <input type="number" class="variant-price" placeholder="Price" min="0" step="0.01" value="${values.price ?? ''}" required>
        <input type="number" class="variant-weight" placeholder="Weight (g)" min="0" step="0.01" value="${values.weight_g ?? ''}" required>
        <button type="button" class="remove-variant-btn" aria-label="Remove variant">Remove</button>
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
        <span class="variant-meta">${formatPrice(variant.price)} | Stocks ${variant.stock} | ${Number(variant.weight_g ?? variant.weightG ?? variant.weight ?? 0).toLocaleString()}g</span>
      </li>
    `).join('');
  }

  function loadProducts() {
    const grid = section.querySelector('#productsGrid');
    grid.innerHTML = products.map(product => `
      <div class="product-card" data-product-id="${product.id}" data-community="${product.communityKey}">
        <img src="${product.image}" alt="${product.name || 'Untitled Product'}" class="product-image" onerror="this.onerror=null;this.src='/placeholder.svg?height=200&width=200'">
        <div class="product-info">
          <h4 class="product-name">${product.name || 'Untitled Product'}</h4>
          <p class="product-meta">Collection: ${product.collectionName || 'General'}</p>
          <p class="product-meta">Category: ${product.productCategory || 'Apparel'}</p>
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
        .map(option => `<option value="${option.key}">${option.label}</option>`)
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
      const name = String(collectionModalName.value || '').trim();
      if (!community || !name) return;

      let imgUrl = null;
      const imageFile = collectionModalImage.files?.[0];
      if (imageFile) {
        imgUrl = await uploadMarketplaceImage(imageFile);
      }

      try {
        await createMarketplaceCollection({ community, name, img_url: imgUrl });
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
        await deleteMarketplaceProduct(dbProductId, deleteCommunity);
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
        weight_g: Number(row.querySelector('.variant-weight').value)
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
        collection,
        product_category: productCategory,
        image_url: null,
        variants: variants.map(v => ({
          variantName: v.variantName,
          variantValue: v.variantValue,
          stock: v.stock,
          price: v.price,
          weight_g: v.weight_g
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
          await updateMarketplaceProduct(dbProductId, payload, community);
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

      const seen = new Set();
      const options = [{ key: 'all', label: 'All Sites' }];
      rows.forEach(row => {
        const key = String(row?.domain || '').trim().toLowerCase();
        const normalized = String(row?.site_name || row?.domain || '').trim();
        if (!key || !normalized || seen.has(key)) return;
        seen.add(key);
        options.push({ key, label: normalized });
      });

      communityOptions = options.length
        ? options
        : [{ key: 'all', label: 'All Sites' }];
    } catch (error) {
      console.error('Error fetching communities from admin database:', error);
      communityOptions = [{ key: 'all', label: 'All Sites' }];
    }
  }

  async function fetchProducts(communityKey = 'all') {
    try {
      const normalizedCommunity =
        String(communityKey || 'all').trim().toLowerCase() || 'all';
      let rows = [];

      if (normalizedCommunity === 'all') {
        const communityKeys = communityOptions
          .map(option => option.key)
          .filter(key => key && key !== 'all');
        const responses = await Promise.allSettled(
          communityKeys.map(async key => {
            const list = await fetchMarketplaceProducts(key);
            return list.map(item => ({ ...item, __community_key: key }));
          })
        );
        rows = responses
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value);
      } else {
        let list = [];
        try {
          list = await fetchMarketplaceProducts(normalizedCommunity);
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
        rows = list.map(item => ({ ...item, __community_key: normalizedCommunity }));
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
          const allCollections = await fetchMarketplaceCollections(normalizedCommunity);
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
