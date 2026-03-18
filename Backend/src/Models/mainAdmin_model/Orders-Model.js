import { connect, connectAdmin, resolveCommunityContext } from '../../core/database.js';
import { getDBNamesByCommunityType } from './site-model.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
  if (!ADMIN_DEBUG) return;
  console.log(`[ADMIN DEBUG][OrdersModel][${scope}]`, payload);
};

class OrdersModel {
  normalizeStatus(status) {
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

  isLockedStatus(status) {
    const normalized = this.normalizeStatus(status);
    return normalized === 'completed' || normalized === 'cancelled';
  }

  getAllowedStatusTransitions(status) {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'pending' || normalized === 'order placed') {
      return new Set(['pending', 'processing', 'shipped', 'completed', 'cancelled']);
    }
    if (normalized === 'processing') {
      return new Set(['processing', 'shipped', 'completed', 'cancelled']);
    }
    if (normalized === 'shipped') {
      return new Set(['shipped', 'completed']);
    }
    if (normalized === 'completed') {
      return new Set(['completed']);
    }
    if (normalized === 'cancelled') {
      return new Set(['cancelled']);
    }
    return new Set([normalized || 'pending', 'processing', 'shipped', 'completed', 'cancelled']);
  }

  normalizeCommunityType(communityType = 'all') {
    return String(communityType || 'all').trim().toLowerCase() || 'all';
  }

  async hasAdminTable(db, tableName) {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    return Array.isArray(rows) && rows.length > 0;
  }

  async getAdminTableColumns(db, tableName) {
    if (!await this.hasAdminTable(db, tableName)) return new Set();
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    return new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
  }

  hasDisplayValue(value) {
    return String(value ?? '').trim().length > 0;
  }

  async fetchUserDirectory(db, userIds = []) {
    const uniqueUserIds = Array.from(
      new Set(
        (Array.isArray(userIds) ? userIds : [])
          .map((value) => Number(value || 0))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    );
    if (!uniqueUserIds.length) return new Map();
    if (!await this.hasAdminTable(db, 'users')) return new Map();

    const userColumns = await this.getAdminTableColumns(db, 'users');
    if (!userColumns.has('user_id')) return new Map();

    const nameCandidates = [];
    if (userColumns.has('fullname')) nameCandidates.push(`NULLIF(TRIM(fullname), '')`);
    if (userColumns.has('name')) nameCandidates.push(`NULLIF(TRIM(name), '')`);
    if (userColumns.has('username')) nameCandidates.push(`NULLIF(TRIM(username), '')`);
    if (userColumns.has('email')) nameCandidates.push(`NULLIF(TRIM(email), '')`);

    const emailExpr = userColumns.has('email')
      ? `NULLIF(TRIM(email), '') AS email`
      : `NULL AS email`;
    const displayNameExpr = nameCandidates.length
      ? `COALESCE(${nameCandidates.join(', ')}) AS customer_name`
      : `NULL AS customer_name`;

    const placeholders = uniqueUserIds.map(() => '?').join(', ');
    const [rows] = await db.query(
      `
        SELECT
          user_id,
          ${displayNameExpr},
          ${emailExpr}
        FROM users
        WHERE user_id IN (${placeholders})
      `,
      uniqueUserIds,
    );

    return new Map(
      (rows || []).map((row) => [
        String(row?.user_id || ''),
        {
          customer_name: String(row?.customer_name || '').trim(),
          customer_email: String(row?.email || '').trim(),
        },
      ]),
    );
  }

  async hydrateOrderCustomerDetails(siteDB, orders = []) {
    const rows = Array.isArray(orders) ? orders : [];
    const unresolvedUserIds = rows
      .filter((order) => (
        !this.hasDisplayValue(order?.customer_name) ||
        !this.hasDisplayValue(order?.customer_email)
      ))
      .map((order) => Number(order?.user_id || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!unresolvedUserIds.length) {
      rows.forEach((order) => {
        if (!this.hasDisplayValue(order?.customer_name)) {
          order.customer_name = `User #${order?.user_id}`;
        }
      });
      return rows;
    }

    const lookupPools = [];
    const pushPool = (pool) => {
      if (!pool || lookupPools.includes(pool)) return;
      lookupPools.push(pool);
    };

    pushPool(siteDB);
    try {
      pushPool(await connect(''));
    } catch (_) {}
    try {
      pushPool(await connectAdmin());
    } catch (_) {}

    for (const pool of lookupPools) {
      let directory = new Map();
      try {
        directory = await this.fetchUserDirectory(pool, unresolvedUserIds);
      } catch (_) {
        directory = new Map();
      }
      if (!directory.size) continue;

      rows.forEach((order) => {
        const entry = directory.get(String(order?.user_id || ''));
        if (!entry) return;
        if (!this.hasDisplayValue(order?.customer_name) && this.hasDisplayValue(entry.customer_name)) {
          order.customer_name = entry.customer_name;
        }
        if (!this.hasDisplayValue(order?.customer_email) && this.hasDisplayValue(entry.customer_email)) {
          order.customer_email = entry.customer_email;
        }
      });
    }

    rows.forEach((order) => {
      if (!this.hasDisplayValue(order?.customer_name) && this.hasDisplayValue(order?.customer_email)) {
        order.customer_name = order.customer_email;
      }
      if (!this.hasDisplayValue(order?.customer_name)) {
        order.customer_name = `User #${order?.user_id}`;
      }
    });

    return rows;
  }

  async resolveScopedCommunityId(communityType = 'all') {
    const normalized = this.normalizeCommunityType(communityType);
    if (!normalized || normalized === 'all') return null;
    const numeric = Number(normalized);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;

    // Priority: community_table-based resolution (same pattern as revenue).
    try {
      const adminDB = await connectAdmin();
      const hasCommunityTable = await this.hasAdminTable(adminDB, 'community_table');
      const communityCols = await this.getAdminTableColumns(adminDB, 'communities');
      const hasCommunities = communityCols.size > 0;
      const communityPk = communityCols.has('community_id')
        ? 'community_id'
        : (communityCols.has('id') ? 'id' : null);
      const hasCommunityName = communityCols.has('name');

      if (hasCommunityTable) {
        let query = `SELECT ct.community_id FROM community_table ct `;
        const params = [];
        if (hasCommunities && communityPk) {
          query += `LEFT JOIN communities c ON c.${communityPk} = ct.community_id `;
        }

        query += `
          WHERE LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
             OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
        `;
        params.push(normalized, normalized);

        if (!normalized.endsWith('-website')) {
          query += ` OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?)) `;
          params.push(`${normalized}-website`);
        } else {
          const trimmed = normalized.replace(/-website$/, '');
          query += `
             OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
             OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
          `;
          params.push(trimmed, trimmed);
        }

        if (hasCommunities && hasCommunityName && communityPk) {
          query += ` OR LOWER(TRIM(c.name)) = LOWER(TRIM(?)) `;
          params.push(normalized);
        }

        query += ` LIMIT 1 `;
        const [rows] = await adminDB.query(query, params);
        const communityId = Number(rows?.[0]?.community_id || 0);
        if (communityId > 0) return communityId;
      }
    } catch (_) {}

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

  async backfillOrderItemSnapshots(db) {
    await this.ensureOrderItemSnapshotColumns(db);

    const hasProductImage = await this.tableHasColumn(db, 'products', 'image_url');
    const hasVariantWeight = await this.tableHasColumn(db, 'product_variants', 'weight_g');
    const hasVariantLength = await this.tableHasColumn(db, 'product_variants', 'length_cm');
    const hasVariantWidth = await this.tableHasColumn(db, 'product_variants', 'width_cm');
    const hasVariantHeight = await this.tableHasColumn(db, 'product_variants', 'height_cm');
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
        WHERE
          oi.product_name_snapshot IS NULL
          OR oi.product_image_snapshot IS NULL
          OR oi.variant_name_snapshot IS NULL
          OR oi.variant_values_snapshot IS NULL
          OR oi.weight_g_snapshot IS NULL
          OR oi.length_cm_snapshot IS NULL
          OR oi.width_cm_snapshot IS NULL
          OR oi.height_cm_snapshot IS NULL
      `,
    );
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

    const hasCommunityId = await this.tableHasColumn(siteDB, 'daily_revenue', 'community_id');
    if (!hasCommunityId) {
      await siteDB.query('ALTER TABLE daily_revenue ADD COLUMN community_id INT(11) NULL AFTER order_id');
    }

    // Repair legacy schemas where "id" exists but is not AUTO_INCREMENT / PRIMARY KEY.
    const hasId = await this.tableHasColumn(siteDB, 'daily_revenue', 'id');
    if (hasId) {
      const [idColRows] = await siteDB.query('SHOW COLUMNS FROM daily_revenue LIKE "id"');
      const idExtra = String(idColRows?.[0]?.Extra || '').toLowerCase();
      const isAutoIncrement = idExtra.includes('auto_increment');

      const [pkRows] = await siteDB.query(
        `
          SELECT COUNT(*) AS count
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'daily_revenue'
            AND INDEX_NAME = 'PRIMARY'
        `,
      );
      const hasPrimaryKey = Number(pkRows?.[0]?.count || 0) > 0;

      if (!hasPrimaryKey) {
        // Make existing ids unique first (old dumps often have id=0 in all rows).
        await siteDB.query('SET @rownum := 0');
        await siteDB.query(
          `
            UPDATE daily_revenue
            SET id = (@rownum := @rownum + 1)
            ORDER BY created_at, order_id
          `,
        );
        await siteDB.query('ALTER TABLE daily_revenue MODIFY id INT(11) NOT NULL');
        await siteDB.query('ALTER TABLE daily_revenue ADD PRIMARY KEY (id)');
      }

      if (!isAutoIncrement) {
        await siteDB.query(
          'ALTER TABLE daily_revenue MODIFY id INT(11) NOT NULL AUTO_INCREMENT',
        );
      }
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

    const [communityIdx] = await siteDB.query(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'daily_revenue'
          AND INDEX_NAME = 'idx_daily_revenue_community_id'
      `,
    );
    if (Number(communityIdx?.[0]?.count || 0) === 0) {
      await siteDB.query(
        'ALTER TABLE daily_revenue ADD INDEX idx_daily_revenue_community_id (community_id)',
      );
    }
  }

  async upsertCompletedOrderRevenue(siteDB, order) {
    if (!order?.order_id) return;
    await this.ensureDailyRevenueSchema(siteDB);

    const totalAmount = Number(order.total || 0);
    let communityId = Number(order.community_id || 0) || null;
    if (!communityId && await this.tableHasColumn(siteDB, 'orders', 'community_id')) {
      const [scopeRows] = await siteDB.query(
        'SELECT community_id FROM orders WHERE order_id = ? LIMIT 1',
        [order.order_id],
      );
      communityId = Number(scopeRows?.[0]?.community_id || 0) || null;
    }
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
              community_id = ?,
              total_amount = ?,
              created_at = NOW()
          WHERE order_id = ?
        `,
        [communityId, totalAmount, order.order_id],
      );
      return;
    }

    await siteDB.query(
      `
        INSERT INTO daily_revenue (order_id, community_id, date, time, total_amount, created_at)
        VALUES (?, ?, CURDATE(), CURTIME(), ?, NOW())
      `,
      [order.order_id, communityId, totalAmount],
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
      const resolvedDbNames = (dbNames && dbNames.length > 0)
        ? dbNames
        : ['__default__'];
      debugLog('getOrdersForCommunity:start', {
        communityType: normalizedCommunity,
        scopedCommunityId,
        dbNames,
        resolvedDbNames,
      });

      // Ensure we only query each physical DB once
      const uniqueDbNames = Array.from(new Set(resolvedDbNames));

      const allOrders = [];

      for (const dbName of uniqueDbNames) {
        let siteDB;
        try {
          siteDB = await connect(dbName === '__default__' ? '' : dbName);
          await this.backfillOrderItemSnapshots(siteDB);
          await this.ensureOrderTrackingColumns(siteDB);
          const hasCommunityId = await this.tableHasColumn(
            siteDB,
            'orders',
            'community_id',
          );
          const hasProductImage = await this.tableHasColumn(siteDB, 'products', 'image_url');
          const hasVariantWeight = await this.tableHasColumn(siteDB, 'product_variants', 'weight_g');
          const productImageSelect = hasProductImage
            ? 'COALESCE(oi.product_image_snapshot, p.image_url) AS product_image,'
            : 'oi.product_image_snapshot AS product_image,';
          const weightSelect = hasVariantWeight
            ? 'COALESCE(oi.weight_g_snapshot, pv.weight_g, 0) AS weight_g,'
            : 'COALESCE(oi.weight_g_snapshot, 0) AS weight_g,';

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

          let [rows] = await siteDB.query(
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
                o.tracking_number,
                o.courier,
                o.tracking_updated_at,
                o.created_at
              FROM orders o
              LEFT JOIN users u ON u.user_id = o.user_id
              ${whereClause}
              ORDER BY o.created_at DESC
            `,
            params,
          );

          // Legacy fallback: include rows with missing community_id (NULL/0)
          // when strict scoped filter returns empty.
          if (
            (!rows || rows.length === 0) &&
            scopedCommunityId &&
            hasCommunityId
          ) {
            const fallbackParams = [];
            const fallbackWhereParts = [];
            if (status) {
              fallbackWhereParts.push('status = ?');
              fallbackParams.push(status);
            }
            fallbackWhereParts.push('(COALESCE(o.community_id, 0) = ? OR COALESCE(o.community_id, 0) = 0)');
            fallbackParams.push(scopedCommunityId);

            [rows] = await siteDB.query(
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
                  o.tracking_number,
                  o.courier,
                  o.tracking_updated_at,
                  o.created_at
                FROM orders o
                LEFT JOIN users u ON u.user_id = o.user_id
                WHERE ${fallbackWhereParts.join(' AND ')}
                ORDER BY o.created_at DESC
              `,
              fallbackParams,
            );
          }

          await this.hydrateOrderCustomerDetails(siteDB, rows);

          for (const row of rows) {
            allOrders.push({
              db_name: dbName,
              ...row,
              status: this.normalizeStatus(row.status),
              tracking_number: this.normalizeTrackingNumber(row.tracking_number),
              courier: this.normalizeCourier(row.courier),
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
      debugLog('getOrdersForCommunity:done', {
        communityType: normalizedCommunity,
        scopedCommunityId,
        count: dedupedOrders.length,
      });

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
      const resolvedDbNames = (dbNames && dbNames.length > 0)
        ? dbNames
        : ['__default__'];
      debugLog('getOrdersWithItems:start', {
        communityType: normalizedCommunity,
        scopedCommunityId,
        dbNames,
        resolvedDbNames,
      });

      const uniqueDbNames = Array.from(new Set(resolvedDbNames));
      const allOrders = [];

      for (const dbName of uniqueDbNames) {
        let siteDB;
        try {
          siteDB = await connect(dbName === '__default__' ? '' : dbName);
          await this.backfillOrderItemSnapshots(siteDB);
          await this.ensureOrderTrackingColumns(siteDB);
          const hasCommunityId = await this.tableHasColumn(
            siteDB,
            'orders',
            'community_id',
          );
          const hasProductImage = await this.tableHasColumn(siteDB, 'products', 'image_url');
          const hasVariantWeight = await this.tableHasColumn(siteDB, 'product_variants', 'weight_g');
          const hasVariantLength = await this.tableHasColumn(siteDB, 'product_variants', 'length_cm');
          const hasVariantWidth = await this.tableHasColumn(siteDB, 'product_variants', 'width_cm');
          const hasVariantHeight = await this.tableHasColumn(siteDB, 'product_variants', 'height_cm');
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

          let [rows] = await siteDB.query(
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
                o.tracking_number,
                o.courier,
                o.tracking_updated_at,
                o.created_at
              FROM orders o
              LEFT JOIN users u ON u.user_id = o.user_id
              ${whereClause}
              ORDER BY o.created_at DESC
            `,
            params,
          );

          // Legacy fallback: include rows with missing community_id (NULL/0)
          // when strict scoped filter returns empty.
          if (
            (!rows || rows.length === 0) &&
            scopedCommunityId &&
            hasCommunityId
          ) {
            const fallbackParams = [];
            const fallbackWhereParts = [];
            if (status) {
              fallbackWhereParts.push('o.status = ?');
              fallbackParams.push(status);
            }
            fallbackWhereParts.push('(COALESCE(o.community_id, 0) = ? OR COALESCE(o.community_id, 0) = 0)');
            fallbackParams.push(scopedCommunityId);

            [rows] = await siteDB.query(
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
                  o.tracking_number,
                  o.courier,
                  o.tracking_updated_at,
                  o.created_at
                FROM orders o
                LEFT JOIN users u ON u.user_id = o.user_id
                WHERE ${fallbackWhereParts.join(' AND ')}
                ORDER BY o.created_at DESC
              `,
              fallbackParams,
            );
          }

          await this.hydrateOrderCustomerDetails(siteDB, rows);

          for (const order of rows) {
            // Get order items for each order
            const [items] = await siteDB.query(`
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
            `, [order.order_id]);

            allOrders.push({
              db_name: dbName,
              ...order,
              status: this.normalizeStatus(order.status),
              tracking_number: this.normalizeTrackingNumber(order.tracking_number),
              courier: this.normalizeCourier(order.courier),
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
      debugLog('getOrdersWithItems:done', {
        communityType: normalizedCommunity,
        scopedCommunityId,
        count: dedupedOrders.length,
      });

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

  async updateOrderStatus(
    dbName,
    orderId,
    status,
    communityType = 'all',
    trackingNumber = null,
    courier = null,
  ) {
    if (!orderId) {
      throw new Error('orderId is required to update order status');
    }
    if (!status) {
      throw new Error('status is required to update order status');
    }

    const resolvedDbName = await this.resolveOrderDbName(dbName, communityType, orderId);
    const siteDB = await connect(resolvedDbName);
    await this.ensureOrderTrackingColumns(siteDB);
    const normalizedNextStatus = this.normalizeStatus(status);
    const normalizedTrackingNumber = this.normalizeTrackingNumber(trackingNumber);
    const normalizedCourier = this.normalizeCourier(courier);

    const [beforeRows] = await siteDB.query(
      `
        SELECT order_id, total, status, tracking_number, courier, tracking_updated_at
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
    const currentTrackingNumber = this.normalizeTrackingNumber(beforeOrder.tracking_number);
    const currentCourier = this.normalizeCourier(beforeOrder.courier);
    const trackingChangeRequested =
      normalizedTrackingNumber !== null && normalizedTrackingNumber !== currentTrackingNumber;
    const courierChangeRequested =
      normalizedCourier !== null && normalizedCourier !== currentCourier;

    if (previousStatus === 'shipped' && (trackingChangeRequested || courierChangeRequested)) {
      throw new Error('Tracking number and courier are locked once an order is shipped');
    }

    let nextTrackingNumber = currentTrackingNumber;
    let nextCourier = currentCourier;
    if (normalizedNextStatus === 'shipped') {
      nextTrackingNumber = normalizedTrackingNumber || currentTrackingNumber;
      nextCourier = normalizedCourier || currentCourier;
    } else if (normalizedNextStatus === 'completed') {
      nextTrackingNumber = normalizedTrackingNumber || currentTrackingNumber;
      nextCourier = normalizedCourier || currentCourier;
    } else if (['pending', 'processing', 'cancelled'].includes(normalizedNextStatus)) {
      nextTrackingNumber = null;
      nextCourier = null;
    }

    if (normalizedNextStatus === 'shipped' && !nextTrackingNumber) {
      throw new Error('Tracking number is required before marking an order as shipped');
    }
    if (normalizedNextStatus === 'shipped' && !nextCourier) {
      throw new Error('Courier is required before marking an order as shipped');
    }

    if (
      previousStatus === normalizedNextStatus &&
      nextTrackingNumber === currentTrackingNumber &&
      nextCourier === currentCourier
    ) {
      const [currentRows] = await siteDB.query(
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
            tracking_number,
            courier,
            tracking_updated_at,
            created_at
          FROM orders
          WHERE order_id = ?
          LIMIT 1
        `,
        [orderId],
      );

      return {
        db_name: resolvedDbName,
        ...(currentRows?.[0] || beforeOrder),
        status: this.normalizeStatus(currentRows?.[0]?.status || beforeOrder.status),
        tracking_number: this.normalizeTrackingNumber(currentRows?.[0]?.tracking_number || beforeOrder.tracking_number),
        courier: this.normalizeCourier(currentRows?.[0]?.courier ?? beforeOrder.courier),
      };
    }

    if (this.isLockedStatus(previousStatus)) {
      throw new Error(`Order with status "${previousStatus}" is locked and can no longer be modified`);
    }

    const allowedTransitions = this.getAllowedStatusTransitions(previousStatus);
    if (!allowedTransitions.has(normalizedNextStatus)) {
      throw new Error(`Cannot change order status from "${previousStatus}" to "${normalizedNextStatus}"`);
    }

    const updateFields = ['status = ?'];
    const updateParams = [normalizedNextStatus];
    const shouldPersistTracking =
      normalizedNextStatus === 'shipped' ||
      normalizedNextStatus === 'completed' ||
      previousStatus === 'shipped' ||
      currentTrackingNumber !== null ||
      normalizedTrackingNumber !== null ||
      currentCourier !== null ||
      normalizedCourier !== null;

    if (shouldPersistTracking) {
      updateFields.push('tracking_number = ?');
      updateParams.push(nextTrackingNumber);
      updateFields.push('courier = ?');
      updateParams.push(nextCourier);

      if (!nextTrackingNumber) {
        updateFields.push('tracking_updated_at = NULL');
      } else if (nextTrackingNumber !== currentTrackingNumber) {
        updateFields.push('tracking_updated_at = NOW()');
      }
    }

    updateParams.push(orderId);
    const [result] = await siteDB.query(
      `
        UPDATE orders 
        SET ${updateFields.join(', ')}
        WHERE order_id = ?
      `,
      updateParams,
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
          tracking_number,
          courier,
          tracking_updated_at,
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
      status: this.normalizeStatus(updated?.status),
      tracking_number: this.normalizeTrackingNumber(updated?.tracking_number),
      courier: this.normalizeCourier(updated?.courier),
    };
  }
}

export default OrdersModel;
