import { loadProductsByCollection } from "../../../services/ecommerce_services/shop/product.js";
import { api } from '../../../services/ecommerce_services/api.js';
import ProductDetail from '../product/product_detail.js';
import fetchProductDetails from '../../../services/ecommerce_services/shop/product_details.js';
import { authHeaders } from '../../../services/ecommerce_services/auth/auth.js';
import '../../../styles/ecommerce_styles/Collection.css';


export default function Collection(root, data = {}) {
    const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
    const communityType = pathParts[0] === 'fanhub' ? pathParts[1] : '';

    // Render Section UI
    root.innerHTML += `
        <section id="collection" class="collection-bini">
            <h2 class="section-title">Collections</h2>
            <div class="collection-list" id="collection-list"></div>
        </section>

        <section id="product" class="product-section">
            <h2 class="section-title">Products</h2>

            <!-- 🔥 CATEGORY NAVIGATION -->
            <div class="category-nav">
                <button class="category-btn active" data-category="all">All</button>
                <button class="category-btn" data-category="apparel">Apparel</button>
                <button class="category-btn" data-category="accessories">Accessories</button>
                <button class="category-btn" data-category="collectibles">Collectibles</button>
                <button class="category-btn" data-category="music">Music</button>
            </div>

            <!-- 🔥 FILTER + SORT UI -->
            <div class="product-toolbar">
                <div class="sort-group">
                    <label>Sort by:</label>
                    <select id="sort-select" class="sort-select">
                        <option value="">Default</option>
                        <option value="low-high">Price: Low → High</option>
                        <option value="high-low">Price: High → Low</option>
                        <option value="name-asc">Name: A → Z</option>
                        <option value="name-desc">Name: Z → A</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            <div class="product-list" id="product-list"></div>
        </section>
    `;

    // Store products globally (for filtering/sorting)
    let currentProducts = [];
    let allProducts = []; // Store all products
    let selectedCategory = 'all'; // Track selected category
    let collectionModeProducts = null; // when a collection is clicked, hold its products

    init();

    async function init() {
        try {
            await fetchCollectionsLocal();
            await loadAllProducts(); 
            attachCollectionClickHandlers();
            attachFilterSortHandlers();
            await attachCategoryHandlers(); // Attach category filter handlers
        } catch (err) {
            console.error('Error loading collections:', err);
        }
    }

    // Load all products from all collections
    async function loadAllProducts() {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...authHeaders(),
            };

            
            // Fetch collections first
            const collRes = await api(`/shop/getCollections/`, { method: 'GET', headers });
            
            const collData = await collRes.json();
            const collections = collData.data || [];

            // Fetch products from all collections
            let products = [];
            for (const coll of collections) {
                const collId = coll.collection_id || coll.id;
                const prodRes = await api(`/shop/getProductCollection/${collId}`, { method: 'GET', headers });
                const prodData = await prodRes.json();
                const prods = prodData.data || [];
                
                // Fetch complete product details for each product to get pricing
                for (const product of prods) {
                    const productId = product.product_id || product.id;
                    if (productId) {
                        try {
                            const detailsRes = await fetchProductDetails(productId, communityType);
                            const fullProduct = detailsRes?.product;
                            const variants = Array.isArray(detailsRes?.variants) ? detailsRes.variants : [];
                            if (fullProduct) {
                                const merged = {
                                    ...product,
                                    ...fullProduct,
                                    variants
                                };
                                merged.price = resolveProductPrice(merged);
                                products.push(merged);
                            }
                        } catch (err) {
                            console.warn(`Failed to fetch details for product ${productId}:`, err);
                            // Still add basic product info even if details fail
                            products.push({
                                ...product,
                                price: resolveProductPrice(product)
                            });
                        }
                    }
                }
            }

            allProducts = products;
            currentProducts = products;
            renderProducts(currentProducts);
            console.log('Loaded all products:', allProducts);

        } catch (err) {
            console.error('Error loading all products:', err);
        }
    }

    // Attach category button handlers
    async function attachCategoryHandlers() {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const category = btn.dataset.category;
                selectedCategory = category;

                // Update active button
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter and render (support multiple possible category field names)
                const target = category.toLowerCase();
                const source = collectionModeProducts || allProducts;

                if (target === 'all') {
                    // show all in current mode (collection or global)
                    currentProducts = Array.isArray(source) ? [...source] : [...allProducts];
                } else {
                    currentProducts = (Array.isArray(source) ? source : allProducts).filter(p => {
                        const cat = getProductCategory(p);
                        return cat === target;
                    });
                }

                // Reset filters/sort and render
                document.getElementById('sort-select').value = '';
                await applyFilterSort();
            });
        });
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

        collections.forEach(collection => {
            const item = document.createElement('div');
            item.className = 'collection-item';
            item.dataset.id = collection.collection_id || collection.id || '';

            item.innerHTML = `
                <img src="${collection.img_url}" alt="${collection.name}" class="collection-image">
                <h3>${collection.name}</h3>
            `;

            collectionList.appendChild(item);
        });
    }

    // Helper: normalize product category into a lowercase string
    function getProductCategory(p) {
        if (!p) return '';
        const candidates = [p.category, p.cat, p.category_name, p.product_category, p.type];
        for (const c of candidates) {
            if (c && typeof c === 'string') return c.trim().toLowerCase();
        }
        return '';
    }

    // Helper: choose an image URL from various possible fields
    function getProductImage(p) {
        if (!p) return '';
        if (p.image_url) return p.image_url;
        if (p.img_url) return p.img_url;
        if (p.image) return p.image;
        if (Array.isArray(p.images) && p.images.length) return p.images[0];
        return '';
    }

    function resolveProductPrice(p) {
        if (!p) return 0;

        if (Array.isArray(p.variants) && p.variants.length > 0) {
            const variantPrices = p.variants
                .map((v) => parseFloat(v?.price))
                .filter((n) => Number.isFinite(n) && n > 0);
            if (variantPrices.length) return Math.min(...variantPrices);
        }

        const directPrice = parseFloat(
            p.display_price ||
            p.price ||
            p.product_price ||
            p.unit_price ||
            p.amount ||
            p.cost ||
            p.retail_price ||
            p.sale_price ||
            0
        );
        return Number.isFinite(directPrice) ? directPrice : 0;
    }

    function attachCollectionClickHandlers() {
        document.querySelectorAll('.collection-item').forEach(item => {
            if (item._bound) return;
            item._bound = true;

            item.style.cursor = "pointer";

            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                await onCollectionClick(id);
            });
        });
    }

    /** -----------------------------
     * FILTER + SORT FUNCTIONALITY
     ---------------------------------*/
    function attachFilterSortHandlers() {
        const sortSelect = document.getElementById('sort-select');

        sortSelect.addEventListener('change', applyFilterSort);
    }

    async function applyFilterSort() {
        let filtered = [...currentProducts];

        // Sorting
        const sort = document.getElementById("sort-select").value;
        if (sort === "low-high") filtered.sort((a,b)=>a.price-b.price);
        if (sort === "high-low") filtered.sort((a,b)=>b.price-a.price);
        if (sort === "name-asc") filtered.sort((a,b)=>a.name.localeCompare(b.name));
        if (sort === "name-desc") filtered.sort((a,b)=>b.name.localeCompare(a.name));
        if (sort === "newest") filtered.sort((a,b)=>new Date(b.created_at) - new Date(a.created_at));
        if (sort === "oldest") filtered.sort((a,b)=>new Date(a.created_at) - new Date(b.created_at));

        await renderProducts(filtered);
    }

    /** -----------------------------
     * Render Products Display
     ---------------------------------*/
    async function renderProducts(products) {
        const container = document.getElementById("product-list");
        container.innerHTML = "";

        if (!products.length) {
            container.innerHTML = `<p class="no-products">No products found.</p>`;
            return;
        }

        for (const p of products) {
            const img = getProductImage(p) || '';
            const pid = p.product_id || p.id || p.productId || p.productId || p.product_id;

            const box = document.createElement("div");
            box.className = "product-item";
            box.dataset.productId = pid;
            const price = resolveProductPrice(p);

            box.innerHTML = `
                <img src="${img}" class="product-img" alt="${p.name || ''}">
                <h4>${p.name || ''}</h4>
                <p class="product-price">₱${price.toFixed(2)}</p>
            `;

            // click -> open product detail in this same root
            box.addEventListener('click', async () => {
                const id = box.dataset.productId;
                try {
                    const productPath = communityType
                        ? `/fanhub/${communityType}/product/${id}`
                        : `/product/${id}`;
                    history.pushState({ page: 'product', id, communityType }, '', productPath);
                    await ProductDetail(root, id, communityType);
                } catch (err) {
                    console.error('Failed to open product detail', err);
                }
            });

            container.appendChild(box);
        }
    }

    /** =============================
     * Exported Handler Function
    ============================= */
    async function onCollectionClick(collectionId) {
        // fetch products for this collection and enter collection mode
        const basicProducts = await loadProductsByCollection(collectionId);
        
        // Fetch complete product details for each product to get pricing
        let products = [];
        for (const product of basicProducts) {
            const productId = product.product_id || product.id;
            if (productId) {
                try {
                    const detailsRes = await fetchProductDetails(productId, communityType);
                    const fullProduct = detailsRes?.product;
                    const variants = Array.isArray(detailsRes?.variants) ? detailsRes.variants : [];
                    if (fullProduct) {
                        const merged = {
                            ...product,
                            ...fullProduct,
                            variants
                        };
                        merged.price = resolveProductPrice(merged);
                        products.push(merged);
                    }
                } catch (err) {
                    console.warn(`Failed to fetch details for product ${productId}:`, err);
                    // Still add basic product info even if details fail
                    products.push({
                        ...product,
                        price: resolveProductPrice(product)
                    });
                }
            }
        }
        
        currentProducts = products;
        collectionModeProducts = Array.isArray(currentProducts) ? [...currentProducts] : null;
        // reset category selection to 'all' when a collection is explicitly chosen
        selectedCategory = 'all';
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        const allBtn = document.querySelector('.category-btn[data-category="all"]');
        if (allBtn) allBtn.classList.add('active');
        await applyFilterSort();
    }
}


