import { connect } from '../../core/database.js';

class OrderModel {
  normalizeOrderStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized) return 'pending';
    if (['order placed', 'placed', 'confirmed'].includes(normalized)) return 'pending';
    if (normalized === 'canceled') return 'cancelled';
    if (normalized === 'delivered') return 'completed';
    return normalized;
  }

  normalizeTrackingNumber(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  normalizeCourier(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  async tableHasColumn(db, tableName, columnName) {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
    return Array.isArray(rows) && rows.length > 0;
  }

  async ensureOrderItemSnapshotColumns(db) {
    const columns = [
      ['product_name_snapshot', 'ALTER TABLE order_items ADD COLUMN product_name_snapshot VARCHAR(255) NULL AFTER total'],
      ['product_image_snapshot', 'ALTER TABLE order_items ADD COLUMN product_image_snapshot TEXT NULL AFTER product_name_snapshot'],
      ['variant_name_snapshot', 'ALTER TABLE order_items ADD COLUMN variant_name_snapshot VARCHAR(255) NULL AFTER product_image_snapshot'],
      ['variant_values_snapshot', 'ALTER TABLE order_items ADD COLUMN variant_values_snapshot VARCHAR(255) NULL AFTER variant_name_snapshot'],
      ['weight_g_snapshot', 'ALTER TABLE order_items ADD COLUMN weight_g_snapshot INT(11) NULL AFTER variant_values_snapshot'],
      ['length_cm_snapshot', 'ALTER TABLE order_items ADD COLUMN length_cm_snapshot DECIMAL(10,2) NULL AFTER weight_g_snapshot'],
      ['width_cm_snapshot', 'ALTER TABLE order_items ADD COLUMN width_cm_snapshot DECIMAL(10,2) NULL AFTER length_cm_snapshot'],
      ['height_cm_snapshot', 'ALTER TABLE order_items ADD COLUMN height_cm_snapshot DECIMAL(10,2) NULL AFTER width_cm_snapshot'],
    ];

    for (const [columnName, statement] of columns) {
      if (await this.tableHasColumn(db, 'order_items', columnName)) continue;
      await db.query(statement);
    }
  }

  async ensureOrderTrackingColumns(db) {
    const columns = [
      ['tracking_number', 'ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(120) NULL AFTER status'],
      ['courier', 'ALTER TABLE orders ADD COLUMN courier VARCHAR(120) NULL AFTER tracking_number'],
      ['tracking_updated_at', 'ALTER TABLE orders ADD COLUMN tracking_updated_at DATETIME NULL AFTER courier'],
    ];

    for (const [columnName, statement] of columns) {
      if (await this.tableHasColumn(db, 'orders', columnName)) continue;
      await db.query(statement);
    }
  }

  async backfillOrderItemSnapshots(db, orderId = null) {
    await this.ensureOrderItemSnapshotColumns(db);

    const hasProductImage = await this.tableHasColumn(db, 'products', 'image_url');
    const hasVariantWeight = await this.tableHasColumn(db, 'product_variants', 'weight_g');
    const hasVariantLength = await this.tableHasColumn(db, 'product_variants', 'length_cm');
    const hasVariantWidth = await this.tableHasColumn(db, 'product_variants', 'width_cm');
    const hasVariantHeight = await this.tableHasColumn(db, 'product_variants', 'height_cm');
    const params = [];
    const whereParts = [
      '(',
      'oi.product_name_snapshot IS NULL',
      'OR oi.product_image_snapshot IS NULL',
      'OR oi.variant_name_snapshot IS NULL',
      'OR oi.variant_values_snapshot IS NULL',
      'OR oi.weight_g_snapshot IS NULL',
      'OR oi.length_cm_snapshot IS NULL',
      'OR oi.width_cm_snapshot IS NULL',
      'OR oi.height_cm_snapshot IS NULL',
      ')',
    ];

    if (orderId) {
      whereParts.push('AND oi.order_id = ?');
      params.push(orderId);
    }

    const productImageExpr = hasProductImage ? 'p.image_url' : 'NULL';
    const weightExpr = hasVariantWeight ? 'pv.weight_g' : '0';
    const lengthExpr = hasVariantLength ? 'pv.length_cm' : '0';
    const widthExpr = hasVariantWidth ? 'pv.width_cm' : '0';
    const heightExpr = hasVariantHeight ? 'pv.height_cm' : '0';

    await db.query(
      `
        UPDATE order_items oi
        LEFT JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
        SET
          oi.product_name_snapshot = COALESCE(oi.product_name_snapshot, p.name),
          oi.product_image_snapshot = COALESCE(oi.product_image_snapshot, ${productImageExpr}),
          oi.variant_name_snapshot = COALESCE(oi.variant_name_snapshot, pv.variant_name),
          oi.variant_values_snapshot = COALESCE(oi.variant_values_snapshot, pv.variant_values),
          oi.weight_g_snapshot = COALESCE(oi.weight_g_snapshot, ${weightExpr}, 0),
          oi.length_cm_snapshot = COALESCE(oi.length_cm_snapshot, ${lengthExpr}, 0),
          oi.width_cm_snapshot = COALESCE(oi.width_cm_snapshot, ${widthExpr}, 0),
          oi.height_cm_snapshot = COALESCE(oi.height_cm_snapshot, ${heightExpr}, 0)
        WHERE ${whereParts.join(' ')}
      `,
      params,
    );
  }

  normalizeOrderItems(items = []) {
    const grouped = new Map();

    for (const item of Array.isArray(items) ? items : []) {
      const productId = Number(item?.product_id || 0);
      const variantId = Number(item?.variant_id || 0);
      const quantity = Math.floor(Number(item?.quantity || 0));

      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product in order payload');
      }
      if (!Number.isFinite(variantId) || variantId <= 0) {
        throw new Error('Invalid variant in order payload');
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Invalid quantity in order payload');
      }

      const key = `${productId}:${variantId}`;
      const current = grouped.get(key) || {
        product_id: productId,
        variant_id: variantId,
        quantity: 0,
      };

      current.quantity += quantity;
      grouped.set(key, current);
    }

    return Array.from(grouped.values());
  }

  async fetchVariantSnapshot(db, productId, variantId) {
    const hasProductImage = await this.tableHasColumn(db, 'products', 'image_url');
    const hasVariantWeight = await this.tableHasColumn(db, 'product_variants', 'weight_g');
    const hasVariantLength = await this.tableHasColumn(db, 'product_variants', 'length_cm');
    const hasVariantWidth = await this.tableHasColumn(db, 'product_variants', 'width_cm');
    const hasVariantHeight = await this.tableHasColumn(db, 'product_variants', 'height_cm');
    const productImageSelect = hasProductImage ? ', p.image_url AS product_image' : ', NULL AS product_image';
    const weightSelect = hasVariantWeight ? ', pv.weight_g AS weight_g' : ', 0 AS weight_g';
    const lengthSelect = hasVariantLength ? ', pv.length_cm AS length_cm' : ', 0 AS length_cm';
    const widthSelect = hasVariantWidth ? ', pv.width_cm AS width_cm' : ', 0 AS width_cm';
    const heightSelect = hasVariantHeight ? ', pv.height_cm AS height_cm' : ', 0 AS height_cm';

    const [rows] = await db.execute(
      `
        SELECT
          pv.variant_id,
          pv.product_id,
          pv.stock,
          pv.price,
          pv.variant_name,
          pv.variant_values
          ${weightSelect}
          ${lengthSelect}
          ${widthSelect}
          ${heightSelect}
          ,
          p.name AS product_name
          ${productImageSelect}
        FROM product_variants pv
        LEFT JOIN products p ON pv.product_id = p.product_id
        WHERE pv.variant_id = ? AND pv.product_id = ?
        FOR UPDATE
      `,
      [variantId, productId],
    );

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  async fetchOrderItems(pool, orderId) {
    await this.backfillOrderItemSnapshots(pool, orderId);

    const hasProductImage = await this.tableHasColumn(pool, 'products', 'image_url');
    const hasVariantWeight = await this.tableHasColumn(pool, 'product_variants', 'weight_g');
    const hasVariantLength = await this.tableHasColumn(pool, 'product_variants', 'length_cm');
    const hasVariantWidth = await this.tableHasColumn(pool, 'product_variants', 'width_cm');
    const hasVariantHeight = await this.tableHasColumn(pool, 'product_variants', 'height_cm');
    const productImageSelect = hasProductImage
      ? 'COALESCE(oi.product_image_snapshot, p.image_url) AS product_image,'
      : 'oi.product_image_snapshot AS product_image,';
    const weightSelect = hasVariantWeight
      ? 'COALESCE(oi.weight_g_snapshot, pv.weight_g, 0) AS weight_g,'
      : 'COALESCE(oi.weight_g_snapshot, 0) AS weight_g,';
    const lengthSelect = hasVariantLength
      ? 'COALESCE(oi.length_cm_snapshot, pv.length_cm, 0) AS length_cm,'
      : 'COALESCE(oi.length_cm_snapshot, 0) AS length_cm,';
    const widthSelect = hasVariantWidth
      ? 'COALESCE(oi.width_cm_snapshot, pv.width_cm, 0) AS width_cm,'
      : 'COALESCE(oi.width_cm_snapshot, 0) AS width_cm,';
    const heightSelect = hasVariantHeight
      ? 'COALESCE(oi.height_cm_snapshot, pv.height_cm, 0) AS height_cm'
      : 'COALESCE(oi.height_cm_snapshot, 0) AS height_cm';

    const [items] = await pool.execute(
      `
        SELECT
          oi.*,
          COALESCE(oi.product_name_snapshot, p.name) AS product_name,
          ${productImageSelect}
          COALESCE(oi.variant_name_snapshot, pv.variant_name) AS variant_name,
          COALESCE(oi.variant_values_snapshot, pv.variant_values) AS size,
          ${weightSelect}
          ${lengthSelect}
          ${widthSelect}
          ${heightSelect}
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
        WHERE oi.order_id = ?
      `,
      [orderId],
    );

    return items;
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
      await this.ensureOrderItemSnapshotColumns(pool);
      await this.ensureOrderTrackingColumns(pool);

      // Get a single connection from the pool for transactions
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const normalizedItems = this.normalizeOrderItems(payload.items);
      if (!normalizedItems.length) {
        throw new Error('No order items provided');
      }

      const preparedItems = [];
      let computedSubtotal = 0;

      for (const item of normalizedItems) {
        const variant = await this.fetchVariantSnapshot(conn, item.product_id, item.variant_id);
        if (!variant) {
          throw new Error(`Variant not found for product ${item.product_id}`);
        }

        const stock = Number(variant.stock || 0);
        if (stock < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variant_id}. Available: ${stock}`);
        }

        const unitPrice = Number(variant.price || 0);
        const lineTotal = unitPrice * item.quantity;
        const weightG = Number(variant.weight_g || 0);
        const lengthCm = Number(variant.length_cm || 0);
        const widthCm = Number(variant.width_cm || 0);
        const heightCm = Number(variant.height_cm || 0);

        preparedItems.push({
          ...item,
          price: unitPrice,
          total: lineTotal,
          product_name_snapshot: String(variant.product_name || '').trim() || null,
          product_image_snapshot: String(variant.product_image || '').trim() || null,
          variant_name_snapshot: String(variant.variant_name || '').trim() || null,
          variant_values_snapshot: String(variant.variant_values || '').trim() || null,
          weight_g_snapshot: Number.isFinite(weightG) ? weightG : 0,
          length_cm_snapshot: Number.isFinite(lengthCm) ? lengthCm : 0,
          width_cm_snapshot: Number.isFinite(widthCm) ? widthCm : 0,
          height_cm_snapshot: Number.isFinite(heightCm) ? heightCm : 0,
        });

        computedSubtotal += lineTotal;
      }

      const shippingFee = Math.max(0, Number(payload.shipping_fee || 0) || 0);
      const computedTotal = computedSubtotal + shippingFee;
      const shippingAddress = JSON.stringify(payload.shipping_address || {});
      const initialStatus = 'pending';
      const courier = this.normalizeCourier(payload.courier);

      let orderRes;
      if (communityId === null || typeof communityId === 'undefined') {
        // Insert without community_id column
        [orderRes] = await conn.execute(
          `INSERT INTO orders (user_id, subtotal, shipping_fee, total, payment_method, shipping_address, status, courier)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, computedSubtotal, shippingFee, computedTotal, payload.payment_method || null, shippingAddress, initialStatus, courier]
        );
      } else {
        [orderRes] = await conn.execute(
          `INSERT INTO orders (user_id, community_id, subtotal, shipping_fee, total, payment_method, shipping_address, status, courier)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, communityId, computedSubtotal, shippingFee, computedTotal, payload.payment_method || null, shippingAddress, initialStatus, courier]
        );
      }

      const orderId = orderRes.insertId;

      // Insert order items and decrement stock
      for (const item of preparedItems) {
        await conn.execute(
          `
            INSERT INTO order_items (
              order_id,
              product_id,
              variant_id,
              quantity,
              price,
              total,
              product_name_snapshot,
              product_image_snapshot,
              variant_name_snapshot,
              variant_values_snapshot,
              weight_g_snapshot,
              length_cm_snapshot,
              width_cm_snapshot,
              height_cm_snapshot
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            orderId,
            item.product_id,
            item.variant_id,
            item.quantity,
            item.price,
            item.total,
            item.product_name_snapshot,
            item.product_image_snapshot,
            item.variant_name_snapshot,
            item.variant_values_snapshot,
            item.weight_g_snapshot,
            item.length_cm_snapshot,
            item.width_cm_snapshot,
            item.height_cm_snapshot,
          ]
        );

        await conn.execute(`UPDATE product_variants SET stock = stock - ? WHERE variant_id = ?`, [item.quantity, item.variant_id]);
      }

      // Remove ordered variants from user's cart(s).
      // If communityId is present, scope to that cart. Otherwise remove from all user carts.
      const variantIds = preparedItems.map(i => i.variant_id).filter(Boolean);
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
    await this.ensureOrderTrackingColumns(pool);
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
      order.status = this.normalizeOrderStatus(order.status);
      order.tracking_number = this.normalizeTrackingNumber(order.tracking_number);
      order.courier = this.normalizeCourier(order.courier);
      order.items = await this.fetchOrderItems(pool, order.order_id);
    }
    
    return rows;
  }

  async getOrderById(orderId, userId = null, communityType = '') {
    const pool = await this.ensureConnection(communityType);
    await this.ensureOrderTrackingColumns(pool);
    const params = [orderId];
    let q = `SELECT * FROM orders WHERE order_id = ?`;
    if (userId) {
      q += ` AND user_id = ?`;
      params.push(userId);
    }
    const [orders] = await pool.execute(q, params);
    if (!orders || orders.length === 0) return null;
    const order = orders[0];
    order.status = this.normalizeOrderStatus(order.status);
    order.tracking_number = this.normalizeTrackingNumber(order.tracking_number);
    order.courier = this.normalizeCourier(order.courier);

    order.items = await this.fetchOrderItems(pool, orderId);
    return order;
  }

  async cancelOrderById(orderId, userId, communityType = '') {
    const pool = await this.ensureConnection(communityType);
    await this.ensureOrderTrackingColumns(pool);
    const [result] = await pool.execute(
      'UPDATE orders SET status = ?, tracking_number = NULL, courier = NULL, tracking_updated_at = NULL WHERE order_id = ? AND user_id = ?',
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
