import { connect, resolveCommunityContext } from '../../core/database.js';
import { getDBNamesByCommunityType } from './site-model.js';

class OrdersModel {
  normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
  }

  normalizeCommunityType(communityType = 'all') {
    return String(communityType || 'all').trim().toLowerCase() || 'all';
  }

  async resolveScopedCommunityId(communityType = 'all') {
    const normalized = this.normalizeCommunityType(communityType);
    if (!normalized || normalized === 'all') return null;
    const ctx = await resolveCommunityContext(normalized);
    return Number(ctx?.community_id || 0) || null;
  }

  async tableHasColumn(db, tableName, columnName) {
    const [rows] = await db.query(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
      `,
      [tableName, columnName],
    );
    return Number(rows?.[0]?.count || 0) > 0;
  }

  async ensureDailyRevenueSchema(siteDB) {
    await siteDB.query(`
      CREATE TABLE IF NOT EXISTS daily_revenue (
        id INT(11) NOT NULL AUTO_INCREMENT,
        order_id INT(11) NULL,
        date DATE NOT NULL,
        time TIME NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_daily_revenue_order_id (order_id),
        KEY idx_daily_revenue_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    const hasOrderId = await this.tableHasColumn(siteDB, 'daily_revenue', 'order_id');
    if (!hasOrderId) {
      await siteDB.query('ALTER TABLE daily_revenue ADD COLUMN order_id INT(11) NULL AFTER id');
    }

    const hasTime = await this.tableHasColumn(siteDB, 'daily_revenue', 'time');
    if (!hasTime) {
      await siteDB.query('ALTER TABLE daily_revenue ADD COLUMN time TIME NULL AFTER date');
    }

    // Old schema had unique_date, which blocks multiple completed orders on the same day.
    const [uniqueDateIdx] = await siteDB.query(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'daily_revenue'
          AND INDEX_NAME = 'unique_date'
      `,
    );
    if (Number(uniqueDateIdx?.[0]?.count || 0) > 0) {
      await siteDB.query('ALTER TABLE daily_revenue DROP INDEX unique_date');
    }

    const [orderIdIdx] = await siteDB.query(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'daily_revenue'
          AND INDEX_NAME = 'uq_daily_revenue_order_id'
      `,
    );
    if (Number(orderIdIdx?.[0]?.count || 0) === 0) {
      await siteDB.query(
        'ALTER TABLE daily_revenue ADD UNIQUE KEY uq_daily_revenue_order_id (order_id)',
      );
    }
  }

  async upsertCompletedOrderRevenue(siteDB, order) {
    if (!order?.order_id) return;
    await this.ensureDailyRevenueSchema(siteDB);

    const totalAmount = Number(order.total || 0);
    const [existing] = await siteDB.query(
      'SELECT id FROM daily_revenue WHERE order_id = ? LIMIT 1',
      [order.order_id],
    );

    if (Array.isArray(existing) && existing.length > 0) {
      await siteDB.query(
        `
          UPDATE daily_revenue
          SET date = CURDATE(),
              time = CURTIME(),
              total_amount = ?,
              created_at = NOW()
          WHERE order_id = ?
        `,
        [totalAmount, order.order_id],
      );
      return;
    }

    await siteDB.query(
      `
        INSERT INTO daily_revenue (order_id, date, time, total_amount, created_at)
        VALUES (?, CURDATE(), CURTIME(), ?, NOW())
      `,
      [order.order_id, totalAmount],
    );
  }

  async removeCompletedOrderRevenue(siteDB, orderId) {
    if (!orderId) return;
    const hasOrderId = await this.tableHasColumn(siteDB, 'daily_revenue', 'order_id');
    if (!hasOrderId) return;
    await siteDB.query('DELETE FROM daily_revenue WHERE order_id = ?', [orderId]);
  }

  /**
   * Get orders across communities/sites for monitoring.
   * @param {string} communityType - community key or 'all'
   * @param {string|null} status - optional status filter
   * @returns {Promise<Array>}
   */
  async getOrdersForCommunity(communityType = 'all', status = null) {
    try {
      const normalizedCommunity = this.normalizeCommunityType(communityType);
      const scopedCommunityId = await this.resolveScopedCommunityId(normalizedCommunity);
      const dbNames = await getDBNamesByCommunityType(
        normalizedCommunity,
      );

      if (!dbNames || dbNames.length === 0) return [];

      // Ensure we only query each physical DB once
      const uniqueDbNames = Array.from(new Set(dbNames));

      const allOrders = [];

      for (const dbName of uniqueDbNames) {
        let siteDB;
        try {
          siteDB = await connect(dbName);
          const hasCommunityId = await this.tableHasColumn(
            siteDB,
            'orders',
            'community_id',
          );

          const params = [];
          const whereParts = [];

          if (status) {
            whereParts.push('status = ?');
            params.push(status);
          }
          if (scopedCommunityId && hasCommunityId) {
            whereParts.push('COALESCE(o.community_id, 0) = ?');
            params.push(scopedCommunityId);
          }
          const whereClause = whereParts.length
            ? `WHERE ${whereParts.join(' AND ')}`
            : '';

          const [rows] = await siteDB.query(
            `
              SELECT 
                o.order_id,
                o.user_id,
                u.fullname AS customer_name,
                o.subtotal,
                o.shipping_fee,
                o.total,
                o.payment_method,
                o.shipping_address,
                o.status,
                o.created_at
              FROM orders o
              LEFT JOIN users u ON u.user_id = o.user_id
              ${whereClause}
              ORDER BY o.created_at DESC
            `,
            params,
          );

          for (const row of rows) {
            allOrders.push({
              db_name: dbName,
              ...row,
            });
          }
        } catch (err) {
          console.error(`Error fetching orders for site DB "${dbName}":`, err);
        }
      }

      // De-duplicate by global order_id so the same order
      // from multiple site contexts is only shown once.
      const seenOrderIds = new Set();
      const dedupedOrders = [];

      for (const order of allOrders) {
        const key = String(order.order_id);
        if (seenOrderIds.has(key)) continue;
        seenOrderIds.add(key);
        dedupedOrders.push(order);
      }

      // Sort by created_at (newest first)
      dedupedOrders.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      return dedupedOrders;
    } catch (error) {
      console.error('Error fetching orders for community:', error);
      throw error;
    }
  }

  /**
   * Get orders with detailed items for admin dashboard
   * @param {string} communityType - community key or 'all'
   * @param {string|null} status - optional status filter
   * @returns {Promise<Array>}
   */
  async getOrdersWithItems(communityType = 'all', status = null) {
    try {
      const normalizedCommunity = this.normalizeCommunityType(communityType);
      const scopedCommunityId = await this.resolveScopedCommunityId(normalizedCommunity);
      const dbNames = await getDBNamesByCommunityType(
        normalizedCommunity,
      );

      if (!dbNames || dbNames.length === 0) return [];

      const uniqueDbNames = Array.from(new Set(dbNames));
      const allOrders = [];

      for (const dbName of uniqueDbNames) {
        let siteDB;
        try {
          siteDB = await connect(dbName);
          const hasCommunityId = await this.tableHasColumn(
            siteDB,
            'orders',
            'community_id',
          );

          const params = [];
          const whereParts = [];

          if (status) {
            whereParts.push('o.status = ?');
            params.push(status);
          }
          if (scopedCommunityId && hasCommunityId) {
            whereParts.push('COALESCE(o.community_id, 0) = ?');
            params.push(scopedCommunityId);
          }
          const whereClause = whereParts.length
            ? `WHERE ${whereParts.join(' AND ')}`
            : '';

          const [rows] = await siteDB.query(
            `
              SELECT 
                o.order_id,
                o.user_id,
                u.fullname AS customer_name,
                u.email AS customer_email,
                o.subtotal,
                o.shipping_fee,
                o.total,
                o.payment_method,
                o.shipping_address,
                o.status,
                o.created_at
              FROM orders o
              LEFT JOIN users u ON u.user_id = o.user_id
              ${whereClause}
              ORDER BY o.created_at DESC
            `,
            params,
          );

          for (const order of rows) {
            // Get order items for each order
            const [items] = await siteDB.query(`
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
            `, [order.order_id]);

            allOrders.push({
              db_name: dbName,
              ...order,
              items: items
            });
          }
        } catch (err) {
          console.error(`Error fetching orders with items for site DB "${dbName}":`, err);
        }
      }

      // De-duplicate by global order_id
      const seenOrderIds = new Set();
      const dedupedOrders = [];

      for (const order of allOrders) {
        const key = String(order.order_id);
        if (seenOrderIds.has(key)) continue;
        seenOrderIds.add(key);
        dedupedOrders.push(order);
      }

      dedupedOrders.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      return dedupedOrders;
    } catch (error) {
      console.error('Error fetching orders with items:', error);
      throw error;
    }
  }

  /**
   * Update the status of a specific order in a specific site DB.
   * @param {string} dbName - target site database name
   * @param {number|string} orderId - order primary key
   * @param {string} status - new status value
   * @returns {Promise<Object>} - updated order record
   */
  async resolveOrderDbName(dbName, communityType, orderId) {
    const provided = String(dbName || '').trim();
    if (provided) return provided;

    const scope = String(communityType || 'all').trim().toLowerCase() || 'all';
    const scopedCommunityId = await this.resolveScopedCommunityId(scope);
    const dbNames = await getDBNamesByCommunityType(scope);
    const uniqueDbNames = Array.from(new Set((dbNames || []).map((x) => String(x || '').trim()).filter(Boolean)));

    for (const name of uniqueDbNames) {
      try {
        const siteDB = await connect(name);
        const hasCommunityId = await this.tableHasColumn(
          siteDB,
          'orders',
          'community_id',
        );
        const params = [orderId];
        let extraScope = '';
        if (scopedCommunityId && hasCommunityId) {
          extraScope = ' AND COALESCE(community_id, 0) = ?';
          params.push(scopedCommunityId);
        }
        const [rows] = await siteDB.query(
          `SELECT order_id FROM orders WHERE order_id = ?${extraScope} LIMIT 1`,
          params,
        );
        if (Array.isArray(rows) && rows.length > 0) return name;
      } catch (_) {}
    }

    throw new Error(
      scope && scope !== 'all'
        ? `Order not found in community "${scope}"`
        : 'Order not found',
    );
  }

  async updateOrderStatus(dbName, orderId, status, communityType = 'all') {
    if (!orderId) {
      throw new Error('orderId is required to update order status');
    }
    if (!status) {
      throw new Error('status is required to update order status');
    }

    const resolvedDbName = await this.resolveOrderDbName(dbName, communityType, orderId);
    const siteDB = await connect(resolvedDbName);
    const normalizedNextStatus = this.normalizeStatus(status);

    const [beforeRows] = await siteDB.query(
      `
        SELECT order_id, total, status
        FROM orders
        WHERE order_id = ?
        LIMIT 1
      `,
      [orderId],
    );
    const beforeOrder = beforeRows?.[0] || null;
    if (!beforeOrder) {
      throw new Error('Order not found');
    }
    const previousStatus = this.normalizeStatus(beforeOrder.status);

    const [result] = await siteDB.query(
      `
        UPDATE orders 
        SET status = ?
        WHERE order_id = ?
      `,
      [normalizedNextStatus, orderId],
    );

    if (!result.affectedRows) {
      throw new Error('Order not found or status unchanged');
    }

    const [rows] = await siteDB.query(
      `
        SELECT 
          order_id,
          user_id,
          subtotal,
          shipping_fee,
          total,
          payment_method,
          shipping_address,
          status,
          created_at
        FROM orders
        WHERE order_id = ?
        LIMIT 1
      `,
      [orderId],
    );

    const updated = rows[0] || null;

    if (normalizedNextStatus === 'completed') {
      await this.upsertCompletedOrderRevenue(siteDB, updated);
    } else if (previousStatus === 'completed' && normalizedNextStatus !== 'completed') {
      await this.removeCompletedOrderRevenue(siteDB, orderId);
    }

    return {
      db_name: resolvedDbName,
      ...updated,
    };
  }
}

export default OrdersModel;
