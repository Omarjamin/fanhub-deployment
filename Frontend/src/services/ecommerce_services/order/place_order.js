import { api } from '../api.js';
import { authHeaders } from '../auth/auth.js';


export async function placeOrder() {
  try {
    const toNumber = (value, fallback = 0) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    // Get order data from sessionStorage
    const checkoutItems = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]');
    const shippingData = JSON.parse(sessionStorage.getItem('shippingData') || 'null');
    const paymentData = JSON.parse(sessionStorage.getItem('paymentData') || 'null');
    const checkoutSummary = JSON.parse(sessionStorage.getItem('checkoutSummary') || 'null');
    const shippingFee = sessionStorage.getItem('shippingFee');

    // Validate required data
    if (!checkoutItems || checkoutItems.length === 0) {
      throw new Error('No items in checkout');
    }
    if (!shippingData) {
      throw new Error('Shipping address is required');
    }
    if (!paymentData) {
      throw new Error('Payment method is required');
    }
   

    // Prepare order payload
    const orderPayload = {
      items: checkoutItems.map(item => ({
        product_id: toNumber(item.product_id, 0),
        variant_id: toNumber(item.variant_id ?? item.variantId, 0),
        quantity: toNumber(item.quantity, 1),
        price: toNumber(item.price, 0)
      })),
      shipping_address: {
        street: shippingData.street || '',
        region: shippingData.region || '',
        province: shippingData.province || '',
        city: shippingData.city || '',
        barangay: shippingData.barangay || '',
        zip: shippingData.zip || ''
      },
      payment_method: paymentData.method || 'cod',
      subtotal: toNumber(checkoutSummary?.subtotal, 0),
      shipping_fee: toNumber(shippingFee, 0),
      total: toNumber(checkoutSummary?.total, 0),
      status: 'pending'
    };

    if (orderPayload.items.some(item => !item.product_id || !item.variant_id || item.quantity <= 0)) {
      throw new Error('Invalid checkout items. Please refresh cart and try again.');
    }

    // Calculate final total with shipping fee
    orderPayload.total = orderPayload.subtotal + orderPayload.shipping_fee;

    // Send order to backend (include auth headers)
    const response = await api('/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create order');
    }

    const orderResult = await response.json();
    const orderId = orderResult.order_id;

    // Store complete order data for confirmation page
    const completeOrderData = {
      order_id: orderId,
      items: checkoutItems, // Store complete checkout items with all properties
      shipping_address: shippingData,
      payment_method: paymentData.method || 'cod',
      subtotal: checkoutSummary?.subtotal || 0,
      shipping_fee: parseFloat(shippingFee) || 0,
      total: (checkoutSummary?.subtotal || 0) + (parseFloat(shippingFee) || 0),
      status: 'Order Placed',
      created_at: new Date().toISOString()
    };
    
    sessionStorage.setItem('lastOrderData', JSON.stringify(completeOrderData));
    localStorage.setItem('lastOrder', JSON.stringify(completeOrderData)); // Also store in localStorage for persistence

    // Store order ID for confirmation
    sessionStorage.setItem('lastOrderId', orderId);

    // Keep legacy local cart fallback in sync (if present).
    try {
      const orderedVariantIds = new Set(
        checkoutItems.map((item) => Number(item.variant_id ?? item.variantId)).filter(Number.isFinite),
      );
      const localCart = JSON.parse(localStorage.getItem('cart_items') || '[]');
      if (Array.isArray(localCart) && orderedVariantIds.size > 0) {
        const nextCart = localCart.filter((item) => {
          const variantId = Number(item?.variant_id ?? item?.variantId);
          return !orderedVariantIds.has(variantId);
        });
        localStorage.setItem('cart_items', JSON.stringify(nextCart));
      }
    } catch (_) {}

    // Clear checkout-related session storage (but keep the order data)
    clearCheckoutStorage();

    // Redirect to order confirmation or success page
    console.log('Order placed successfully:', orderId);
    return {
      success: true,
      orderId: orderId,
      message: 'Order placed successfully'
    };

  } catch (error) {
    console.error('Error placing order:', error);
    throw error;
  }
}

/**
 * Clear all checkout-related session storage
 */
export function clearCheckoutStorage() {
  const checkoutKeys = [
    'checkoutStep',
    'checkoutItems',
    'checkoutSummary',
    'selectedAddress',
    'shippingData',
    'shippingInfo',
    'shippingFee',
    'selectedPayment',
    'paymentData',
    'paymentMethod',
    'selectedCartItems',
    'orderData',
    'computedTotals'
  ];

  checkoutKeys.forEach(key => {
    sessionStorage.removeItem(key);
  });

  console.log('Checkout storage cleared (order data preserved)');
}


export async function removeCartItems(cartItemIds = []) {
  try {
    if (cartItemIds.length === 0) {
      console.log('No cart items to remove');
      return;
    }

    const response = await api('/cart/remove-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        item_ids: cartItemIds
      })
    });

    if (!response.ok) {
      throw new Error('Failed to remove cart items');
    }

    console.log('Cart items removed successfully');
  } catch (error) {
    console.error('Error removing cart items:', error);
    // Don't throw - order was already placed
  }
}


export async function decreaseProductQuantity(items = []) {
  try {
    if (items.length === 0) {
      console.log('No items to update quantity');
      return;
    }

    const response = await api('/products/decrease-quantity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        items: items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        }))
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update product quantity');
    }

    console.log('Product quantities updated successfully');
  } catch (error) {
    console.error('Error updating product quantities:', error);
    // Don't throw - order was already placed
  }
}

export default {
  placeOrder,
  clearCheckoutStorage,
  removeCartItems,
  decreaseProductQuantity
};
