import { connect } from '../../core/database.js';

class OrderModel {
  async fetchOrderItems(pool, orderId) {
    try {
      const [items] = await pool.execute(
        `
        SELECT 
          oi.*,
          p.name as product_name,
          p.image_url as product_image,
          pv.variant_name,
          pv.variant_values as size,
          pv.weight_g
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
        WHERE oi.order_id = ?
      `,
        [orderId],
      );
      return items;
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
      const [items] = await pool.execute(
        `
        SELECT 
          oi.*,
          p.name as product_name,
          p.image_url as product_image,
          pv.variant_name,
          pv.variant_values as size
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
        WHERE oi.order_id = ?
      `,
        [orderId],
      );
      return (items || []).map((item) => ({ ...item, weight_g: 0 }));
    }
  }

  async ensureConnection(community_type) {
    return connect(community_type);
  }
  /**
   * Create order and order items in a transaction.
   * Decreases variant stock and removes corresponding cart items.
   * Returns created order id.
   */
  async createOrder(userId, communityId, payload, communityType = '') {
    const pool = await this.ensureConnection(communityType);
    let conn;
    try {
      // Get a single connection from the pool for transactions
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const shippingAddress = JSON.stringify(payload.shipping_address || {});

      let orderRes;
      if (communityId === null || typeof communityId === 'undefined') {
        // Insert without community_id column
        [orderRes] = await conn.execute(
          `INSERT INTO orders (user_id, subtotal, shipping_fee, total, payment_method, shipping_address, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, payload.subtotal || 0, payload.shipping_fee || 0, payload.total || 0, payload.payment_method || null, shippingAddress, payload.status || 'pending']
        );
      } else {
        [orderRes] = await conn.execute(
          `INSERT INTO orders (user_id, community_id, subtotal, shipping_fee, total, payment_method, shipping_address, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, communityId, payload.subtotal || 0, payload.shipping_fee || 0, payload.total || 0, payload.payment_method || null, shippingAddress, payload.status || 'pending']
        );
      }

      const orderId = orderRes.insertId;

      // Insert order items and decrement stock
      for (const item of payload.items) {
        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);

        // Insert order item
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.product_id, item.variant_id, qty, price, qty * price]
        );

        // Check stock
        const [variantRows] = await conn.execute(`SELECT stock FROM product_variants WHERE variant_id = ? FOR UPDATE`, [item.variant_id]);
        if (!variantRows || variantRows.length === 0) {
          throw new Error(`Variant not found: ${item.variant_id}`);
        }
        const stock = Number(variantRows[0].stock || 0);
        if (stock < qty) {
          throw new Error(`Insufficient stock for variant ${item.variant_id}. Available: ${stock}`);
        }

        // Decrement stock
        await conn.execute(`UPDATE product_variants SET stock = stock - ? WHERE variant_id = ?`, [qty, item.variant_id]);
      }

      // Remove ordered variants from user's cart(s).
      // If communityId is present, scope to that cart. Otherwise remove from all user carts.
      const variantIds = payload.items.map(i => i.variant_id).filter(Boolean);
      if (variantIds.length > 0) {
        const placeholders = variantIds.map(() => '?').join(',');
        if (communityId === null || typeof communityId === 'undefined') {
          const [cartRows] = await conn.execute(`SELECT cart_id FROM carts WHERE user_id = ?`, [userId]);
          const cartIds = (cartRows || []).map((row) => row.cart_id).filter(Boolean);
          if (cartIds.length > 0) {
            const cartPlaceholders = cartIds.map(() => '?').join(',');
            await conn.execute(
              `DELETE FROM cart_items WHERE cart_id IN (${cartPlaceholders}) AND variant_id IN (${placeholders})`,
              [...cartIds, ...variantIds],
            );
          }
        } else {
          const [cartRows] = await conn.execute(
            `SELECT cart_id FROM carts WHERE user_id = ? AND community_id = ?`,
            [userId, communityId],
          );
          const cartIds = (cartRows || []).map((row) => row.cart_id).filter(Boolean);
          if (cartIds.length > 0) {
            const cartPlaceholders = cartIds.map(() => '?').join(',');
            await conn.execute(
              `DELETE FROM cart_items WHERE cart_id IN (${cartPlaceholders}) AND variant_id IN (${placeholders})`,
              [...cartIds, ...variantIds],
            );
          }
        }
      }

      await conn.commit();
      return orderId;
    } catch (err) {
      if (conn) {
        await conn.rollback();
      }
      throw err;
    } finally {
      if (conn) {
        conn.release();
      }
    }
  }

  async getOrdersByUser(userId, communityId = null, communityType = '') {
    const pool = await this.ensureConnection(communityType);
    let query, params;
    
    if (communityId) {
      // Get orders for specific community
      query = `SELECT * FROM orders WHERE user_id = ? AND community_id = ? ORDER BY created_at DESC`;
      params = [userId, communityId];
    } else {
      // Get all orders for user across all communities
      query = `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`;
      params = [userId];
    }
    
    const [rows] = await pool.execute(query, params);
    
    // Get order items for each order with product and variant details
    for (const order of rows) {
      order.items = await this.fetchOrderItems(pool, order.order_id);
    }
    
    return rows;
  }

  async getOrderById(orderId, userId = null, communityType = '') {
    const pool = await this.ensureConnection(communityType);
    const params = [orderId];
    let q = `SELECT * FROM orders WHERE order_id = ?`;
    if (userId) {
      q += ` AND user_id = ?`;
      params.push(userId);
    }
    const [orders] = await pool.execute(q, params);
    if (!orders || orders.length === 0) return null;
    const order = orders[0];

    order.items = await this.fetchOrderItems(pool, orderId);
    return order;
  }

  async cancelOrderById(orderId, userId, communityType = '') {
    const pool = await this.ensureConnection(communityType);
    const [result] = await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ? AND user_id = ?',
      ['cancelled', orderId, userId],
    );
    return result;
  }

  async deleteOrderById(orderId, userId, communityType = '') {
    const pool = await this.ensureConnection(communityType);
    const [result] = await pool.execute(
      'DELETE FROM orders WHERE order_id = ? AND user_id = ?',
      [orderId, userId],
    );
    return result;
  }
}

export default new OrderModel();
