import OrdersModel from '../../../Models/mainAdmin_model/Orders-Model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
  if (!ADMIN_DEBUG) return;
  console.log(`[ADMIN DEBUG][Orders][${scope}]`, payload);
};

class OrdersController {
  constructor() {
    this.ordersModel = new OrdersModel();
  }

  resolveCommunity(req, res, { fallbackAll = true } = {}) {
    const numericCommunityId = Number(
      req.query?.community_id ?? req.body?.community_id ?? 0,
    );
    if (Number.isFinite(numericCommunityId) && numericCommunityId > 0) {
      return String(numericCommunityId);
    }
    const scoped = String(
      req.query?.community ||
      req.body?.community ||
      resolveSiteSlug(req, res) ||
      '',
    )
      .trim()
      .toLowerCase();
    if (!scoped && fallbackAll) return 'all';
    return scoped;
  }

  /**
   * GET /v1/admin/orders
   * Optional query:
   *  - community: community key or 'all'
   *  - status: filter by order status
   */
  async listOrders(req, res) {
    try {
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true });
      const status = req.query.status || null;
      debugLog('listOrders:start', { communityType, status });

      const orders = await this.ordersModel.getOrdersForCommunity(
        communityType,
        status,
      );
      debugLog('listOrders:done', { communityType, count: orders.length });

      return res.status(200).json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch orders',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }

  /**
   * GET /v1/admin/orders/with-items
   * Get orders with detailed items for admin dashboard
   * Optional query:
   *  - community: community key or 'all'
   *  - status: filter by order status
   */
  async listOrdersWithItems(req, res) {
    try {
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true });
      const status = req.query.status || null;
      debugLog('listOrdersWithItems:start', { communityType, status });

      const orders = await this.ordersModel.getOrdersWithItems(
        communityType,
        status,
      );
      debugLog('listOrdersWithItems:done', { communityType, count: orders.length });

      return res.status(200).json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error('Error fetching orders with items:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch orders with items',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }

  /**
   * PATCH /v1/admin/orders/:orderId/status
   * Body:
   *  - db_name: target site database name
   *  - status: new status string (e.g. 'pending', 'processing', 'shipped', 'completed')
   *  - tracking_number: required when marking an order as shipped
   *  - courier: required when marking an order as shipped
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { db_name, status, tracking_number, courier } = req.body || {};
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true });
      debugLog('updateOrderStatus:start', {
        orderId,
        db_name,
        status,
        hasTrackingNumber: Boolean(String(tracking_number || '').trim()),
        courier: String(courier || '').trim() || null,
        communityType,
      });

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'orderId is required',
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'status is required',
        });
      }

      const updatedOrder = await this.ordersModel.updateOrderStatus(
        db_name,
        orderId,
        status,
        communityType,
        tracking_number,
        courier,
      );
      debugLog('updateOrderStatus:done', { orderId, db_name: updatedOrder?.db_name, status: updatedOrder?.status });

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder,
      });
    } catch (error) {
      console.error('Error updating order status:', error);

      const message = String(error?.message || '');
      const lowered = message.toLowerCase();
      const statusCode = lowered.includes('not found')
        ? 404
        : lowered.includes('required')
          ? 400
        : (lowered.includes('locked') || lowered.includes('cannot change'))
          ? 409
          : 500;

      return res.status(statusCode).json({
        success: false,
        error: message || 'Failed to update order status',
        details:
          process.env.NODE_ENV === 'development'
            ? error.stack
            : undefined,
      });
    }
  }
}

export default OrdersController;
