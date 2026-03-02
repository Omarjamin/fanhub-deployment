import OrderModel from '../../../Models/ecommerce_model/order_model.js';
import UserCommunityModel from '../../../Models/ecommerce_model/UserCommunityModel.js';

class OrderController {
  constructor() {
    this.orderModel = OrderModel;
    this.userCommunity = UserCommunityModel;
  }
  resolveSiteSlug(req = {}) {
    const headerType = String(req.headers?.['x-site-slug'] || req.headers?.['x-community-type'] || '').trim().toLowerCase();
    if (headerType) return headerType;

    const bodyType = String(req.body?.site_slug || req.body?.community_type || '').trim().toLowerCase();
    if (bodyType && bodyType !== 'community-platform') return bodyType;

    const queryType = String(req.query?.site_slug || req.query?.community_type || '').trim().toLowerCase();
    if (queryType && queryType !== 'community-platform') return queryType;

    const pathParts = String(req.path || '').split('/').filter(Boolean);
    if (pathParts[0] === 'fanhub' && pathParts[1] === 'community-platform' && pathParts[2]) {
      return String(pathParts[2]).toLowerCase();
    }
    if (pathParts[0] === 'fanhub' && pathParts[1] && pathParts[1] !== 'community-platform') {
      return String(pathParts[1]).toLowerCase();
    }

    return '';
  }

  // Create a new order
  async createOrder(req, res) {
    try {
      const body = req.body || {};
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req);

      if (!userId) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }

      // payload expected to include items, shipping_address, payment_method, subtotal, shipping_fee, total
      const payload = body;
      // communityId is optional now; pass through if provided
      const communityId = body.community_id ?? body.site_slug ?? body.community_type ?? null;

      const orderId = await this.orderModel.createOrder(userId, communityId, payload, siteSlug);

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
      const communityId = req.query.community_id || null;
      const siteSlug = this.resolveSiteSlug(req);

      if (!userId) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }

      // If communityId is provided, check access
      if (communityId) {
        const allowed = await this.userCommunity.userHasAccess(userId, communityId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });
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
      const siteSlug = this.resolveSiteSlug(req);

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
      }

      // Get order to check if it belongs to user and can be cancelled
      const order = await this.orderModel.getOrderById(orderId, userId, siteSlug);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Check if order can be cancelled (only pending or order placed)
      if (order.status !== 'pending' && order.status !== 'Order Placed') {
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
      const userId = req.query.user_id || req.user?.user_id;
      const siteSlug = this.resolveSiteSlug(req);

      if (!orderId) return res.status(400).json({ success: false, message: 'order id is required' });

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
      const siteSlug = this.resolveSiteSlug(req);

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
      }

      // Check if order belongs to user
      const order = await this.orderModel.getOrderById(orderId, userId, siteSlug);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
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
