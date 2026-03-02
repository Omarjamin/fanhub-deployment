import { api } from '../api.js';
import { authHeaders } from '../auth/auth.js';

export async function loadProductsByCollection(collectionId) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...authHeaders(),
    };

    const resp = await api(`/shop/getProductCollection/${encodeURIComponent(collectionId)}`, {
      method: 'GET',
      headers,
    });

    const data = await resp.json().catch(() => ({ message: 'unknown' }));

    if (!resp.ok) {
      console.error('Failed to load products:', data);
      return [];
    }

    const products = data?.data || [];
    console.log('Products for collection', collectionId, products);

    // Minimal render: if a #product-list element exists, populate it
    const productList = document.getElementById('product-list') || document.getElementById('product');
    if (productList) {
      productList.innerHTML = '';
      products.forEach(p => {
        const el = document.createElement('div');
        el.className = 'product-item';
        el.innerHTML = `<h4>${p.name || 'Unnamed'}</h4><p>${p.description || ''}</p>`;
        productList.appendChild(el);
      });
    }

    return products;
  } catch (error) {
    console.error('Error loading products by collection:', error);
    return [];
  }
}
