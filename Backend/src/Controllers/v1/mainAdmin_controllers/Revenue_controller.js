import RevenueModel from '../../../Models/mainAdmin_model/Revenue-Model.js';
import OrdersModel from '../../../Models/mainAdmin_model/Orders-Model.js';
import { getDBNamesByCommunityType } from '../../../Models/mainAdmin_model/site-model.js';
import { connect, resolveCommunityContext } from '../../../core/database.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
    if (!ADMIN_DEBUG) return;
    console.log(`[ADMIN DEBUG][Revenue][${scope}]`, payload);
};

class DashboardController {
    constructor() {
        this.revenueModel = new RevenueModel();
        this.ordersModel = new OrdersModel();
        this.lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD || 5);
    }

    async tableExists(db, tableName) {
        const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
        return Array.isArray(rows) && rows.length > 0;
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

    resolveCommunity(req, res, { fallbackAll = true } = {}) {
        const scoped = String(
            req.query?.community ||
            req.body?.community ||
            resolveSiteSlug(req, res) ||
            '',
        ).trim().toLowerCase();
        if (scoped) return scoped;

        const numericCommunityId = Number(
            req.query?.community_id ?? req.body?.community_id ?? 0,
        );
        if (Number.isFinite(numericCommunityId) && numericCommunityId > 0) {
            return String(numericCommunityId);
        }
        if (!scoped && fallbackAll) return 'all';
        return scoped;
    }

    async getLowStockCount(db, scopedCommunityId = null) {
        const threshold = this.lowStockThreshold;

        // Prefer variant-level stock if available to avoid double-counting
        // the same inventory from both products and product_variants tables.
        if (await this.tableExists(db, 'product_variants')) {
            const hasCommunityId = await this.tableHasColumn(db, 'product_variants', 'community_id');
            const params = [threshold];
            let whereSql = 'WHERE COALESCE(stock, 0) <= ?';
            if (scopedCommunityId && hasCommunityId) {
                whereSql += ' AND COALESCE(community_id, 0) = ?';
                params.push(scopedCommunityId);
            }
            const [[{ count = 0 }]] = await db.query(
                `SELECT COUNT(*) AS count FROM product_variants ${whereSql}`,
                params,
            );
            return Number(count || 0);
        }

        if (await this.tableExists(db, 'products')) {
            const [[{ has_stock = 0 }]] = await db.query(
                "SELECT COUNT(*) AS has_stock FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'stock'",
            );

            if (Number(has_stock) > 0) {
                const hasCommunityId = await this.tableHasColumn(db, 'products', 'community_id');
                const params = [threshold];
                let whereSql = 'WHERE COALESCE(stock, 0) <= ?';
                if (scopedCommunityId && hasCommunityId) {
                    whereSql += ' AND COALESCE(community_id, 0) = ?';
                    params.push(scopedCommunityId);
                }
                const [[{ count = 0 }]] = await db.query(
                    `SELECT COUNT(*) AS count FROM products ${whereSql}`,
                    params,
                );
                return Number(count || 0);
            }
        }

        return 0;
    }

    // GET /api/dashboard/stats
    async getCommunityStats(req, res) {
        try {
            const communityType = this.resolveCommunity(req, res, { fallbackAll: true });
            const siteName = String(req.query.site_name || '').trim();
            debugLog('getCommunityStats:start', { communityType, siteName });
            const scopedCommunityCtx =
                communityType && communityType !== 'all'
                    ? await resolveCommunityContext(communityType)
                    : null;
            const scopedCommunityId = Number(scopedCommunityCtx?.community_id || 0) || null;

            const dbNames = await getDBNamesByCommunityType(communityType, siteName);
            console.log('getCommunityStats: getDBNamesByCommunityType', { communityType, dbNames });
            debugLog('getCommunityStats:dbNames', { communityType, siteName, dbNames });

            // Normalize + de-duplicate DB list to prevent double-counting in "all" mode.
            const normalizedDbNames = dbNames
                .map((name) => String(name || '').trim())
                .filter(Boolean);
            const uniqueDbNames = [...new Set(normalizedDbNames)];
            const processedPhysicalDbs = new Set();
            const duplicates = normalizedDbNames.filter((v, i, a) => a.indexOf(v) !== i);
            console.log('getCommunityStats: dbNames', {
                communityType,
                inputCount: normalizedDbNames.length,
                uniqueCount: uniqueDbNames.length,
                duplicates: [...new Set(duplicates)],
            });

            const stats = {
                all: { revenue: 0, orders: 0, posts: 0, pendingModeration: 0, lowStock: 0, newOrdersToday: 0 },
            };

            if (communityType !== 'all') {
                stats[communityType] = { revenue: 0, orders: 0, posts: 0, pendingModeration: 0, lowStock: 0, newOrdersToday: 0 };
            }

            for (const dbName of uniqueDbNames) {
                let siteDB;
                try {
                    siteDB = await connect(dbName);
                    console.log(`Connected to site DB: ${dbName} for community: ${communityType}`);
                    const [dbRows] = await siteDB.query('SELECT DATABASE() AS current_db');
                    const physicalDb = String(dbRows?.[0]?.current_db || '').trim().toLowerCase();
                    if (physicalDb && processedPhysicalDbs.has(physicalDb)) {
                        continue;
                    }
                    if (physicalDb) processedPhysicalDbs.add(physicalDb);

                    let total_revenue = 0;
                    let total_orders = 0;
                    const hasOrders = await this.tableExists(siteDB, 'orders');
                    if (hasOrders) {
                        const hasCommunityId = await this.tableHasColumn(siteDB, 'orders', 'community_id');
                        const whereParts = [];
                        const whereParams = [];
                        if (scopedCommunityId && hasCommunityId) {
                            whereParts.push('COALESCE(community_id, 0) = ?');
                            whereParams.push(scopedCommunityId);
                        }
                        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

                        const [orderCountRows] = await siteDB.query(
                            `SELECT COUNT(*) AS total_orders FROM orders ${whereSql}`,
                            whereParams,
                        );
                        total_orders = Number(orderCountRows?.[0]?.total_orders || 0);
                        if (total_orders === 0 && scopedCommunityId && hasCommunityId) {
                            const [legacyOrderRows] = await siteDB.query(
                                `
                                  SELECT COUNT(*) AS total_orders
                                  FROM orders
                                  WHERE COALESCE(community_id, 0) = ?
                                     OR COALESCE(community_id, 0) = 0
                                `,
                                [scopedCommunityId],
                            );
                            total_orders = Number(legacyOrderRows?.[0]?.total_orders || 0);
                        }

                        const completedParams = [...whereParams];
                        const completedWhere = [
                            `LOWER(TRIM(COALESCE(status, ''))) = 'completed'`,
                        ];
                        if (scopedCommunityId && hasCommunityId) {
                            completedWhere.push('COALESCE(community_id, 0) = ?');
                        }
                        const [revenueRows] = await siteDB.query(
                            `
                              SELECT IFNULL(SUM(total), 0) AS total_revenue
                              FROM orders
                              WHERE ${completedWhere.join(' AND ')}
                            `,
                            completedParams,
                        );
                        total_revenue = Number(revenueRows?.[0]?.total_revenue || 0);
                        if (total_revenue === 0 && scopedCommunityId && hasCommunityId) {
                            const [legacyRevenueRows] = await siteDB.query(
                                `
                                  SELECT IFNULL(SUM(total), 0) AS total_revenue
                                  FROM orders
                                  WHERE LOWER(TRIM(COALESCE(status, ''))) = 'completed'
                                    AND (
                                      COALESCE(community_id, 0) = ?
                                      OR COALESCE(community_id, 0) = 0
                                    )
                                `,
                                [scopedCommunityId],
                            );
                            total_revenue = Number(legacyRevenueRows?.[0]?.total_revenue || 0);
                        }
                    }

                    let total_posts = 0;
                    if (await this.tableExists(siteDB, 'posts')) {
                        const hasCommunityId = await this.tableHasColumn(siteDB, 'posts', 'community_id');
                        const params = [];
                        let whereSql = '';
                        if (scopedCommunityId && hasCommunityId) {
                            whereSql = 'WHERE COALESCE(community_id, 0) = ?';
                            params.push(scopedCommunityId);
                        }
                        const [postRows] = await siteDB.query(
                            `SELECT COUNT(*) AS total_posts FROM posts ${whereSql}`,
                            params,
                        );
                        total_posts = Number(postRows?.[0]?.total_posts || 0);
                    }
                    const pending_moderation = 0;
                    const low_stock = await this.getLowStockCount(siteDB, scopedCommunityId);
                    let new_orders_today = 0;
                    if (await this.tableExists(siteDB, 'orders')) {
                        const hasCommunityId = await this.tableHasColumn(siteDB, 'orders', 'community_id');
                        const params = [];
                        let extraScope = '';
                        if (scopedCommunityId && hasCommunityId) {
                            extraScope = ' AND COALESCE(community_id, 0) = ?';
                            params.push(scopedCommunityId);
                        }
                        const [todayRows] = await siteDB.query(
                            `
                                SELECT COUNT(*) AS new_orders_today
                                FROM orders
                                WHERE DATE(created_at) = CURDATE()
                                ${extraScope}
                            `,
                            params,
                        );
                        new_orders_today = Number(todayRows?.[0]?.new_orders_today || 0);
                        if (new_orders_today === 0 && scopedCommunityId && hasCommunityId) {
                            const [legacyTodayRows] = await siteDB.query(
                                `
                                  SELECT COUNT(*) AS new_orders_today
                                  FROM orders
                                  WHERE DATE(created_at) = CURDATE()
                                    AND (
                                      COALESCE(community_id, 0) = ?
                                      OR COALESCE(community_id, 0) = 0
                                    )
                                `,
                                [scopedCommunityId],
                            );
                            new_orders_today = Number(legacyTodayRows?.[0]?.new_orders_today || 0);
                        }
                    }

                    // Only aggregate into a per-community bucket when a specific community is requested.
                    // For "all", we aggregate exclusively via stats.all below to avoid double counting.
                    if (communityType !== 'all' && stats[communityType]) {
                        stats[communityType].revenue += total_revenue;
                        stats[communityType].orders += total_orders;
                        stats[communityType].posts += total_posts;
                        stats[communityType].pendingModeration += pending_moderation;
                        stats[communityType].lowStock += low_stock;
                        stats[communityType].newOrdersToday += new_orders_today;
                    }

                    stats.all.revenue += total_revenue;
                    stats.all.orders += total_orders;

                    stats.all.posts += total_posts;
                    stats.all.pendingModeration += pending_moderation;
                    stats.all.lowStock += low_stock;
                    stats.all.newOrdersToday += new_orders_today;

                } catch (err) {
                    console.error(`Error fetching stats for site ${dbName}:`, err);
                } 
                
            }

            debugLog('getCommunityStats:done', {
                communityType,
                siteName,
                keys: Object.keys(stats || {}),
                scoped: stats?.[communityType] || null,
                all: stats?.all || null,
            });
            res.json(stats);
        } catch (error) {
            console.error('Error fetching community stats:', error);
            res.status(500).json({ error: 'Failed to fetch community stats' });
        }
    }

    // GET /api/revenue?community=bini
    async getRevenueByCommunity(req, res) {
        try {
            const communityType = this.resolveCommunity(req, res, { fallbackAll: true });
            const siteName = String(req.query.site_name || '').trim();
            console.log(`Fetching revenue data for site key: ${communityType} (site_name: ${siteName || '-'})`);
            debugLog('getRevenueByCommunity:start', { communityType, siteName });

            const revenueData = await this.revenueModel.getRevenueForCommunity(communityType, siteName);
            debugLog('getRevenueByCommunity:raw', {
                communityType,
                siteName,
                siteBuckets: Array.isArray(revenueData) ? revenueData.length : 0,
                bucketCounts: Array.isArray(revenueData)
                    ? revenueData.map((row) => ({
                        db_name: row?.db_name,
                        count: Array.isArray(row?.daily_revenue) ? row.daily_revenue.length : 0,
                    }))
                    : [],
            });
            const mergedRevenue = [];

            revenueData.forEach(site => {
                mergedRevenue.push(...site.daily_revenue);
            });

            mergedRevenue.sort((a, b) => {
                const ta = new Date(a.created_at || `${a.date || ''} ${a.time || ''}`).getTime() || 0;
                const tb = new Date(b.created_at || `${b.date || ''} ${b.time || ''}`).getTime() || 0;
                return tb - ta;
            });

            // Hard fallback for defense/demo stability:
            // if daily_revenue stream is empty, derive rows from completed orders.
            if (!mergedRevenue.length) {
                const completedOrders = await this.ordersModel.getOrdersForCommunity(
                    communityType,
                    'completed',
                );
                debugLog('getRevenueByCommunity:orders-fallback-source', {
                    communityType,
                    siteName,
                    count: Array.isArray(completedOrders) ? completedOrders.length : 0,
                });

                const fallbackRows = (completedOrders || []).map((order) => {
                    const createdAt = order?.created_at || null;
                    const createdDate = createdAt ? new Date(createdAt) : null;
                    const isoDate = createdDate && !Number.isNaN(createdDate.getTime())
                        ? createdDate.toISOString().slice(0, 10)
                        : '';
                    const isoTime = createdDate && !Number.isNaN(createdDate.getTime())
                        ? createdDate.toTimeString().slice(0, 8)
                        : '';

                    return {
                        order_id: order?.order_id || null,
                        date: isoDate,
                        time: isoTime,
                        total_amount: Number(order?.total || 0),
                        created_at: createdAt,
                    };
                });

                mergedRevenue.push(...fallbackRows);
                mergedRevenue.sort((a, b) => {
                    const ta = new Date(a.created_at || `${a.date || ''} ${a.time || ''}`).getTime() || 0;
                    const tb = new Date(b.created_at || `${b.date || ''} ${b.time || ''}`).getTime() || 0;
                    return tb - ta;
                });
            }
            debugLog('getRevenueByCommunity:done', {
                communityType,
                siteName,
                mergedCount: mergedRevenue.length,
                sample: mergedRevenue[0] || null,
            });
            res.json(mergedRevenue);
        } catch (err) {
            console.error('Error fetching revenue data:', err);
            res.status(500).json({ error: 'Failed to fetch revenue data' });
        }
    }
}

export default new DashboardController();
