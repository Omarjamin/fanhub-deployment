import Navigation from '../navigation.js';
import { api } from '../../../services/ecommerce_services/config.js';
import { authHeaders } from '../../../services/ecommerce_services/auth/auth.js';
import '../../../styles/ecommerce_styles/order_confirmation.css';

function resolveItemWeightGrams(item) {
  const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
  if (Number.isFinite(explicitWeight) && explicitWeight > 0) return explicitWeight;
  return 0;
}

export default function OrderConfirmation(payload = null) {
  const root = document.getElementById("app");
  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const urlCommunityType =
    pathParts[0] === 'fanhub' && pathParts[1] === 'community-platform' && pathParts[2]
      ? pathParts[2]
      : (pathParts[0] === 'fanhub' ? pathParts[1] : '');
  const communityType = String(payload?.communityType || payload?.communityData?.community_type || urlCommunityType || '').trim().toLowerCase();
  const communityData = payload?.communityData || {};
  const orderData = (payload && (payload.communityData || payload.communityType))
    ? (payload.orderData || null)
    : payload;
  const orderHistoryPath = communityType ? `/fanhub/${communityType}/order-history` : '/order-history';
  const shopPath = communityType ? `/fanhub/${communityType}/shop` : '/shop';
  
  root.innerHTML = `
    <div id="navigation-container"></div>
    <main class="order-confirm-section">
      <div class="container">
        <div class="order-check">✔️</div>
        <h2 class="section-title">Order Successful! 🎉</h2>
        <p class="order-message">Your order has been placed.</p>

        <div id="orderSummary" class="order-summary">
          <div class="loading">Loading order details...</div>
        </div>

        <div class="order-status-info">
          <h3>✨ What's Next?</h3>
          <div class="status-timeline" id="statusTimelineContainer">
            <!-- Timeline will be populated by JavaScript -->
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn btn-primary" onclick="navigateToOrderHistory()">📦 View Order History</button>
          <button class="btn btn-secondary" onclick="navigateToShop()">🛍️ Continue Shopping</button>
        </div>
      </div>
    </main>
  `;

  // Initialize navigation
  const navContainer = document.getElementById("navigation-container");
  Navigation(navContainer, communityData);

  // Generate order number
  function generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
  }

  // Load order data
  async function loadOrderData() {
    try {
      let order = orderData;
      
      // First try to get the actual order data from the checkout process
      const sessionOrderData = sessionStorage.getItem('lastOrderData');
      const localOrderData = localStorage.getItem('lastOrder');
      
      if (sessionOrderData) {
        order = JSON.parse(sessionOrderData);
        console.log('Using session order data:', order);
      } else if (localOrderData) {
        order = JSON.parse(localOrderData);
        console.log('Using localStorage order data:', order);
      } else if (order) {
        // Use passed order data
        console.log('Using passed order data:', order);
      } else {
        // Try to fetch latest order from API as fallback
        try {
          const response = await fetch(api('/orders/latest'), {
            method: 'GET',
            headers: authHeaders()
          });
          
          if (response.ok) {
            order = await response.json();
            console.log('Using API order data:', order);
          }
        } catch (apiError) {
          console.log('API fetch failed, using demo data');
        }
      }

      if (order) {
        // Update order number with actual order ID and user sequence
        const orderNumberElement = document.getElementById('orderNumber');
        if (orderNumberElement) {
          if (order.order_id) {
            // Get user's order sequence to show more meaningful order number
            const userOrderSequence = await getUserOrderSequence(order.order_id);
            orderNumberElement.textContent = `#BINI-${order.order_id} (Your Order #${userOrderSequence})`;
          } else if (order.id) {
            orderNumberElement.textContent = order.id;
          } else {
            orderNumberElement.textContent = `#BINI-${generateOrderNumber()}`;
          }
        }
        
        displayOrderSummary(order);
        displayStatusTimeline(order.status || 'Order Placed');
      } else {
        // Fallback to demo data
        displayDemoOrder();
      }
    } catch (error) {
      console.error('Error loading order data:', error);
      displayDemoOrder();
    }
  }

  // Get the user's order sequence number (1st, 2nd, 3rd order, etc.)
  async function getUserOrderSequence(currentOrderId) {
    try {
      const response = await fetch(api('/orders/user'), {
        method: 'GET',
        headers: authHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        const orders = result.orders || result.data || result;
        
        if (Array.isArray(orders)) {
          // Sort orders by ID to find the sequence
          const sortedOrders = orders.sort((a, b) => (a.order_id || a.id) - (b.order_id || b.id));
          const sequence = sortedOrders.findIndex(order => (order.order_id || order.id) === currentOrderId) + 1;
          return sequence > 0 ? sequence : 1;
        }
      }
    } catch (error) {
      console.error('Error getting user order sequence:', error);
    }
    return 1; // Default to 1 if we can't determine the sequence
  }

  function displayOrderSummary(order) {
    const summaryContainer = document.getElementById('orderSummary');
    
    const items = order.items || [];
    const subtotal = order.subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = order.shipping_fee || order.shipping || 0;
    const totalWeightGrams = items.reduce((sum, item) => {
      return sum + (resolveItemWeightGrams(item) * Number(item.quantity || 0));
    }, 0);
    const total = order.total || order.total_amount || subtotal + shipping;

    // Format shipping address
    const formatShippingAddress = (address) => {
      if (!address) return 'Address not provided';
      if (typeof address === 'string') return address;
      
      const { street, barangay, city, province, region, zip } = address;
      return [street, barangay, city, province, region, zip]
        .filter(Boolean)
        .join(', ') || 'Address not provided';
    };

    summaryContainer.innerHTML = `
      <div class="order-details">
        <h4>📋 Order details</h4>
        ${items.map(item => `
          <div class="confirm-item">
            <img src="${item.image_url || item.image || item.product_image || '/placeholder.jpg'}" alt="${item.name || item.product_name || 'Product'}">
            <div class="confirm-item-info">
              <p><strong>${item.name || item.product_name || 'Undefined Product'}</strong></p>
              <p>Size: ${item.size || item.variant_name || item.product_variant || 'N/A'} | Qty: ${item.quantity} | Weight: ${(resolveItemWeightGrams(item) * Number(item.quantity || 0)).toLocaleString()}g</p>
              <p>₱${(item.price * item.quantity).toLocaleString()}</p>
            </div>
          </div>
        `).join('')}
        <div class="order-totals">
          <p><strong>Subtotal:</strong> ₱${subtotal.toLocaleString()}</p>
          <p><strong>Shipping:</strong> ₱${shipping.toLocaleString()}</p>
          <p><strong>Total Weight:</strong> ${totalWeightGrams.toLocaleString()}g</p>
          <p><strong>Total:</strong> ₱${total.toLocaleString()}</p>
        </div>
        <div class="shipping-info">
          <p><strong>📮 Shipping address:</strong></p>
          <p>${formatShippingAddress(order.shipping_address)}</p>
          <p><strong>💳 Payment method:</strong> ${order.payment_method || 'Not specified'}</p>
        </div>
      </div>
    `;
  }

  function displayStatusTimeline(currentStatus) {
    const statusContainer = document.getElementById('statusTimelineContainer');
    const steps = [
      { icon: '📝', title: 'Order Placed', desc: 'Order received' },
      { icon: '⚙️', title: 'Processing', desc: 'Preparing items' },
      { icon: '🚚', title: 'Shipped', desc: 'On its way' },
      { icon: '🎉', title: 'Delivered', desc: 'Enjoy your BINI merch!' }
    ];

    const statusMap = { 
      'Order Placed': 0, 
      'Processing': 1, 
      'Shipped': 2, 
      'Delivered': 3 
    };
    
    let activeIdx = statusMap[currentStatus] !== undefined ? statusMap[currentStatus] : 0;

    let timelineHtml = '';
    steps.forEach((step, idx) => {
      let stepClass = 'status-step';
      if (idx === activeIdx) stepClass += ' active';
      if (idx < activeIdx) stepClass += ' completed';
      
      timelineHtml += `
        <div class="${stepClass}">
          <div class="step-icon">${step.icon}</div>
          <div class="step-text">
            <strong>${step.title}</strong>
            <p>${step.desc}</p>
          </div>
        </div>
      `;
    });
    
    statusContainer.innerHTML = timelineHtml;
  }

  function displayDemoOrder() {
    const demoOrder = {
      id: '#BINI-230417',
      status: 'Order Placed',
      items: [
        { 
          name: 'BINI logo hoodie', 
          size: 'M', 
          quantity: 1, 
          price: 1850, 
          image_url: 'https://placekitten.com/52/52?image=1' 
        },
        { 
          name: 'Lightstick mini', 
          size: 'one', 
          quantity: 2, 
          price: 450, 
          image_url: 'https://placekitten.com/52/52?image=4' 
        }
      ],
      shipping: 150,
      total_amount: 2900,
      shipping_address: '15 Eastwood Ave, Quezon City',
      phone: '+63 917 123 4567'
    };

    displayOrderSummary(demoOrder);
    displayStatusTimeline(demoOrder.status);
  }

  // Make navigation functions available globally
  window.navigateToOrderHistory = () => {
    window.location.href = orderHistoryPath;
  };

  window.navigateToShop = () => {
    window.location.href = shopPath;
  };

  // Initialize the page
  loadOrderData();
}
