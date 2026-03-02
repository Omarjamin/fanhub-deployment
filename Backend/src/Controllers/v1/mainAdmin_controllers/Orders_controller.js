import OrdersModel from '../../../Models/mainAdmin_model/Orders-Model.js';

class OrdersController {
  constructor() {
    this.ordersModel = new OrdersModel();
  }

  /**
   * GET /v1/admin/orders
   * Optional query:
   *  - community: community key or 'all'
   *  - status: filter by order status
   */
  async listOrders(req, res) {
    try {
      const communityType = String(
        req.query.community || 'all',
      ).toLowerCase();
      const status = req.query.status || null;

      const orders = await this.ordersModel.getOrdersForCommunity(
        communityType,
        status,
      );

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
      const communityType = String(
        req.query.community || 'all',
      ).toLowerCase();
      const status = req.query.status || null;

      const orders = await this.ordersModel.getOrdersWithItems(
        communityType,
        status,
      );

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
   *  - status: new status string (e.g. 'pending', 'to_be_shipped', 'delivered')
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { db_name, status } = req.body || {};

      if (!db_name) {
        return res.status(400).json({
          success: false,
          error: 'db_name is required',
        });
      }

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
      );

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder,
      });
    } catch (error) {
      console.error('Error updating order status:', error);

      const statusCode = error.message?.includes('not found')
        ? 404
        : 500;

      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to update order status',
        details:
          process.env.NODE_ENV === 'development'
            ? error.stack
            : undefined,
      });
    }
  }
}

export default OrdersController;

