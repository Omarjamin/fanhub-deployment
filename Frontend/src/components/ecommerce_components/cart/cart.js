// Cart management integrated with backend API
import { api } from '../../../services/ecommerce_services/api.js';
import { authHeaders } from '../../../services/ecommerce_services/auth/auth.js';
import { getActiveSiteSlug } from '../../../lib/site-context.js';

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    ...authHeaders()
  };
}

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function getSigninPath() {
  const siteSlug = String(getActiveSiteSlug() || '').trim().toLowerCase();
  return siteSlug ? `/fanhub/${siteSlug}/signin` : '/signin';
}

function handleAuthFailure(status) {
  if (Number(status) !== 401) return;
  try {
    sessionStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search);
  } catch (_) {}
  window.location.href = getSigninPath();
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

// Get cart items
export async function getCart() {
  try {
    const response = await api('/cart/items', { method: 'GET', headers: buildHeaders() });
    const data = await readJson(response);
    if (!response.ok) {
      handleAuthFailure(response.status);
      console.error('Error loading cart:', data.message || `HTTP ${response.status}`);
      return [];
    }
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error loading cart:', error);
    return [];
  }
}

// Add item to cart
export async function addToCart(variantId, quantity = 1) {
  try {
    const parsedVariantId = toInt(variantId);
    const parsedQuantity = Math.max(1, toInt(quantity, 1));
    if (!parsedVariantId || parsedVariantId <= 0) {
      return { success: false, message: 'Invalid variant selected' };
    }

    const cartItems = await getCart();
    const existingItem = cartItems.find((item) => toInt(item.variant_id) === parsedVariantId);

    if (existingItem) {
      const newQuantity = toInt(existingItem.quantity, 0) + parsedQuantity;
      return updateCartItem(parsedVariantId, newQuantity);
    }

    const response = await api('/cart/add', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        variantId: parsedVariantId,
        quantity: parsedQuantity
      })
    });

    const resData = await readJson(response);
    if (!response.ok) {
      handleAuthFailure(response.status);
      return {
        success: false,
        message: resData.message || `Failed to add to cart (HTTP ${response.status})`
      };
    }
    return {
      success: resData.success ?? false,
      message: resData.message ?? 'Failed to add to cart'
    };
  } catch (error) {
    console.error('Error adding to cart:', error);
    return { success: false, message: error.message };
  }
}

// Update cart item quantity
export async function updateCartItem(variantId, quantity) {
  try {
    const response = await api('/cart/update', {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify({
        variantId: toInt(variantId),
        quantity: Math.max(1, toInt(quantity, 1))
      })
    });

    const resData = await readJson(response);
    if (!response.ok) {
      handleAuthFailure(response.status);
      return {
        success: false,
        message: resData.message || `Failed to update cart item (HTTP ${response.status})`
      };
    }
    return { success: resData.success ?? false, message: resData.message ?? '' };
  } catch (error) {
    console.error('Error updating cart item:', error);
    return { success: false, message: error.message };
  }
}

// Remove item from cart
export async function removeFromCart(variantId) {
  try {
    const response = await api('/cart/remove', {
      method: 'DELETE',
      headers: buildHeaders(),
      body: JSON.stringify({ variantId: toInt(variantId) })
    });

    const resData = await readJson(response);
    if (!response.ok) {
      handleAuthFailure(response.status);
      return {
        success: false,
        message: resData.message || `Failed to remove cart item (HTTP ${response.status})`
      };
    }
    return { success: resData.success ?? false, message: resData.message ?? '' };
  } catch (error) {
    console.error('Error removing from cart:', error);
    return { success: false, message: error.message };
  }
}

// Clear all items in cart
export async function clearCart() {
  try {
    const cartItems = await getCart();
    const results = await Promise.all(cartItems.map((item) => removeFromCart(item.variant_id)));
    const success = results.every((result) => result.success);
    return { success, message: success ? 'Cart cleared' : 'Some items could not be removed' };
  } catch (error) {
    console.error('Error clearing cart:', error);
    return { success: false, message: error.message };
  }
}

// Legacy localStorage fallback
export function getCartLocal() {
  try {
    const cart = localStorage.getItem('cart_items');
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    console.error('Error loading local cart:', e);
    return [];
  }
}

export function saveCartLocal(items) {
  try {
    localStorage.setItem('cart_items', JSON.stringify(items));
    return true;
  } catch (e) {
    console.error('Error saving local cart:', e);
    return false;
  }
}

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartLocal,
  saveCartLocal
};
