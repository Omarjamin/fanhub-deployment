import OrderModel from '../../../Models/ecommerce_model/order_model.js';
import CheckoutDraftModel from '../../../Models/ecommerce_model/checkout_draft_model.js';
import UserCommunityModel from '../../../Models/ecommerce_model/UserCommunityModel.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';
import { resolveCommunityContext } from '../../../core/database.js';
import { validateShippingAddress } from '../../../utils/shipping-address.js';

class OrderController {
  constructor() {
    this.orderModel = OrderModel;
    this.checkoutDraftModel = CheckoutDraftModel;
    this.userCommunity = UserCommunityModel;
  }

  normalizeOrderStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'pending';
    if (['order placed', 'placed', 'confirmed'].includes(raw)) return 'pending';
    if (raw === 'canceled') return 'cancelled';
    if (raw === 'delivered') return 'completed';
    return raw;
  }

  resolveSiteSlug(req = {}, res = {}) {
    return resolveSiteSlug(req, res);
  }

  async resolveCommunityId(siteSlug = '', fallback = null) {
    const parsedFallback = Number(fallback);
    if (Number.isFinite(parsedFallback) && parsedFallback > 0) return parsedFallback;

    const scoped = String(siteSlug || '').trim().toLowerCase();
    if (!scoped) return null;

    const context = await resolveCommunityContext(scoped);
    const id = Number(context?.community_id || 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // Create a new order
  async createOrder(req, res) {
    try {
      const body = req.body || {};
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);

      if (!userId) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }

      // payload expected to include items, shipping_address, payment_method, subtotal, shipping_fee, total
      const payload = body;
      const communityId = await this.resolveCommunityId(siteSlug, body.community_id);
      if (!siteSlug || !communityId) {
        return res.status(400).json({
          success: false,
          message: 'site/community scope is required',
        });
      }

      const shippingValidation = validateShippingAddress(payload.shipping_address || {});
      if (!shippingValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: shippingValidation.errors[0]?.message || 'Shipping address is invalid',
        });
      }
      payload.shipping_address = shippingValidation.sanitized;

      const orderId = await this.orderModel.createOrder(userId, communityId, payload, siteSlug);

      try {
        await this.checkoutDraftModel.clearDraft(userId, communityId, siteSlug);
      } catch (draftError) {
        console.error('Checkout draft clear error:', draftError);
      }

      return res.status(201).json({ success: true, order_id: orderId });
    } catch (err) {
      console.error('Create order error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
  }

  // Get orders for user
  async getOrders(req, res) {
    try {
      // Get userId from authentication (JWT token)
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);
      const communityId = await this.resolveCommunityId(siteSlug, req.query.community_id);

      if (!userId) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }
      if (!siteSlug || !communityId) {
        return res.status(400).json({ success: false, message: 'site/community scope is required' });
      }

      const orders = await this.orderModel.getOrdersByUser(userId, communityId, siteSlug);
      return res.status(200).json({ success: true, orders });
    } catch (err) {
      console.error('Get orders error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Cancel order
  async cancelOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
      }

      // Get order to check if it belongs to user and can be cancelled
      const order = await this.orderModel.getOrderById(orderId, userId, siteSlug);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Check if order can be cancelled (only pending or order placed)
      const normalizedStatus = this.normalizeOrderStatus(order.status);
      if (normalizedStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled. Only pending orders can be cancelled.'
        });
      }

      // Update order status to cancelled
      const result = await this.orderModel.cancelOrderById(orderId, userId, siteSlug);

      if (result.affectedRows === 0) {
        return res.status(400).json({ success: false, message: 'Failed to cancel order' });
      }

      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        order_id: orderId
      });
    } catch (err) {
      console.error('Cancel order error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get single order by id
  async getOrderById(req, res) {
    try {
      const orderId = req.params.id;
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);

      if (!orderId) return res.status(400).json({ success: false, message: 'order id is required' });
      if (!userId) return res.status(400).json({ success: false, message: 'user_id is required' });

      const order = await this.orderModel.getOrderById(orderId, userId, siteSlug);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      return res.status(200).json({ success: true, order });
    } catch (err) {
      console.error('Get order error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Delete order
  async deleteOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
      }

      // Check if order belongs to user
      const order = await this.orderModel.getOrderById(orderId, userId, siteSlug);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const normalizedStatus = this.normalizeOrderStatus(order.status);
      if (normalizedStatus !== 'cancelled') {
        return res.status(409).json({
          success: false,
          message: 'Only cancelled orders can be deleted. Placed and completed orders are locked.',
        });
      }

      // Delete order (cascade delete will handle order_items)
      const result = await this.orderModel.deleteOrderById(orderId, userId, siteSlug);

      if (result.affectedRows === 0) {
        return res.status(400).json({ success: false, message: 'Failed to delete order' });
      }

      return res.status(200).json({
        success: true,
        message: 'Order deleted successfully',
        order_id: orderId
      });
    } catch (err) {
      console.error('Delete order error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

export default new OrderController();
