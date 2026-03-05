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

    async resolveCommunityScope(db, tableName, communityType, scopedCommunityId = null) {
        if (!communityType || communityType === 'all') {
            return { sql: '', params: [] };
        }

        const hasCommunityId = await this.tableHasColumn(db, tableName, 'community_id');
        if (hasCommunityId && scopedCommunityId) {
            return {
                sql: 'COALESCE(community_id, 0) = ?',
                params: [Number(scopedCommunityId)],
            };
        }

        const hasGroupCommunityId = await this.tableHasColumn(db, tableName, 'group_community_id');
        if (hasGroupCommunityId && scopedCommunityId) {
            return {
                sql: 'COALESCE(group_community_id, 0) = ?',
                params: [Number(scopedCommunityId)],
            };
        }

        const hasCommunity = await this.tableHasColumn(db, tableName, 'community');
        if (hasCommunity) {
            return {
                sql: 'LOWER(TRIM(COALESCE(community, \'\'))) = LOWER(TRIM(?))',
                params: [String(communityType || '').trim().toLowerCase()],
            };
        }

        return { sql: '', params: [] };
    }

    async getLowStockCount(db, communityType = 'all', scopedCommunityId = null, debugMeta = null) {
        const threshold = this.lowStockThreshold;

        // Prefer variant-level stock if available to avoid double-counting
        // the same inventory from both products and product_variants tables.
        if (await this.tableExists(db, 'product_variants')) {
            const scope = await this.resolveCommunityScope(
                db,
                'product_variants',
                communityType,
                scopedCommunityId,
            );
            const whereParts = ['COALESCE(stock, 0) <= ?'];
            const params = [threshold, ...scope.params];
            if (scope.sql) whereParts.push(scope.sql);
            const [[{ count = 0 }]] = await db.query(
                `SELECT COUNT(*) AS count FROM product_variants WHERE ${whereParts.join(' AND ')}`,
                params,
            );
            if (debugMeta && typeof debugMeta === 'object') {
                debugMeta.sourceTable = 'product_variants';
                debugMeta.where = whereParts.join(' AND ');
                debugMeta.params = [...params];
                debugMeta.threshold = threshold;
            }
            return Number(count || 0);
        }

        if (await this.tableExists(db, 'products')) {
            const [[{ has_stock = 0 }]] = await db.query(
                "SELECT COUNT(*) AS has_stock FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'stock'",
            );

            if (Number(has_stock) > 0) {
                const scope = await this.resolveCommunityScope(
                    db,
                    'products',
                    communityType,
                    scopedCommunityId,
                );
                const whereParts = ['COALESCE(stock, 0) <= ?'];
                const params = [threshold, ...scope.params];
                if (scope.sql) whereParts.push(scope.sql);
                const [[{ count = 0 }]] = await db.query(
                    `SELECT COUNT(*) AS count FROM products WHERE ${whereParts.join(' AND ')}`,
                    params,
                );
                if (debugMeta && typeof debugMeta === 'object') {
                    debugMeta.sourceTable = 'products';
                    debugMeta.where = whereParts.join(' AND ');
                    debugMeta.params = [...params];
                    debugMeta.threshold = threshold;
                }
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
            const includeDebug = String(req.query?.debug || '').trim() === '1';
            const perDbDebug = [];
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
            const resolvedDbNames = uniqueDbNames.length ? uniqueDbNames : ['__default__'];
            const processedPhysicalDbs = new Set();
            const duplicates = normalizedDbNames.filter((v, i, a) => a.indexOf(v) !== i);
            console.log('getCommunityStats: dbNames', {
                communityType,
                inputCount: normalizedDbNames.length,
                uniqueCount: uniqueDbNames.length,
                resolvedCount: resolvedDbNames.length,
                usedDefaultFallback: uniqueDbNames.length === 0,
                duplicates: [...new Set(duplicates)],
            });

            const stats = {
                all: { revenue: 0, orders: 0, posts: 0, pendingModeration: 0, lowStock: 0, newOrdersToday: 0 },
            };

            if (communityType !== 'all') {
                stats[communityType] = { revenue: 0, orders: 0, posts: 0, pendingModeration: 0, lowStock: 0, newOrdersToday: 0 };
            }

            for (const dbName of resolvedDbNames) {
                let siteDB;
                try {
                    siteDB = await connect(dbName === '__default__' ? '' : dbName);
                    console.log(`Connected to site DB: ${dbName} for community: ${communityType}`);
                    const [dbRows] = await siteDB.query('SELECT DATABASE() AS current_db');
                    const physicalDb = String(dbRows?.[0]?.current_db || '').trim().toLowerCase();
                    if (physicalDb && processedPhysicalDbs.has(physicalDb)) {
                        if (includeDebug) {
                            perDbDebug.push({
                                inputDbName: dbName,
                                physicalDb,
                                skipped: true,
                                reason: 'duplicate-physical-db',
                            });
                        }
                        continue;
                    }
                    if (physicalDb) processedPhysicalDbs.add(physicalDb);

                    const statDebug = {
                        inputDbName: dbName,
                        physicalDb,
                        communityType,
                        scopedCommunityId,
                    };

                    let total_revenue = 0;
                    if (await this.tableExists(siteDB, 'daily_revenue')) {
                        const hasTotalAmount = await this.tableHasColumn(siteDB, 'daily_revenue', 'total_amount');
                        const hasRevenue = await this.tableHasColumn(siteDB, 'daily_revenue', 'revenue');
                        const hasAmount = await this.tableHasColumn(siteDB, 'daily_revenue', 'amount');
                        const hasTotal = await this.tableHasColumn(siteDB, 'daily_revenue', 'total');
                        const amountColumn = hasTotalAmount
                            ? 'total_amount'
                            : (hasRevenue ? 'revenue' : (hasAmount ? 'amount' : (hasTotal ? 'total' : 'total_amount')));
                        const revenueScope = await this.resolveCommunityScope(
                            siteDB,
                            'daily_revenue',
                            communityType,
                            scopedCommunityId,
                        );
                        const revenueWhereParts = ['DATE(date) = CURDATE()'];
                        const revenueParams = [];
                        if (revenueScope.sql) {
                            revenueWhereParts.push(revenueScope.sql);
                            revenueParams.push(...revenueScope.params);
                        }
                        const [revenueRows] = await siteDB.query(
                            `
                              SELECT IFNULL(SUM(COALESCE(${amountColumn}, 0)), 0) AS total_revenue
                              FROM daily_revenue
                              WHERE ${revenueWhereParts.join(' AND ')}
                            `,
                            revenueParams,
                        );
                        total_revenue = Number(revenueRows?.[0]?.total_revenue || 0);
                        statDebug.revenue = {
                            sourceTable: 'daily_revenue',
                            amountColumn,
                            where: revenueWhereParts.join(' AND '),
                            params: revenueParams,
                            value: total_revenue,
                        };
                    } else {
                        statDebug.revenue = {
                            sourceTable: 'daily_revenue',
                            missingTable: true,
                            value: total_revenue,
                        };
                    }

                    let total_orders = 0;
                    if (await this.tableExists(siteDB, 'orders')) {
                        const orderScope = await this.resolveCommunityScope(
                            siteDB,
                            'orders',
                            communityType,
                            scopedCommunityId,
                        );
                        const orderWhereSql = orderScope.sql ? `WHERE ${orderScope.sql}` : '';
                        const [orderCountRows] = await siteDB.query(
                            `SELECT COUNT(*) AS total_orders FROM orders ${orderWhereSql}`,
                            orderScope.params,
                        );
                        total_orders = Number(orderCountRows?.[0]?.total_orders || 0);
                        statDebug.orders = {
                            sourceTable: 'orders',
                            where: orderScope.sql || '',
                            params: orderScope.params,
                            value: total_orders,
                        };
                    } else {
                        statDebug.orders = {
                            sourceTable: 'orders',
                            missingTable: true,
                            value: total_orders,
                        };
                    }

                    let total_posts = 0;
                    if (await this.tableExists(siteDB, 'posts')) {
                        const postScope = await this.resolveCommunityScope(
                            siteDB,
                            'posts',
                            communityType,
                            scopedCommunityId,
                        );
                        const whereSql = postScope.sql ? `WHERE ${postScope.sql}` : '';
                        const [postRows] = await siteDB.query(
                            `SELECT COUNT(*) AS total_posts FROM posts ${whereSql}`,
                            postScope.params,
                        );
                        total_posts = Number(postRows?.[0]?.total_posts || 0);
                        statDebug.posts = {
                            sourceTable: 'posts',
                            where: postScope.sql || '',
                            params: postScope.params,
                            value: total_posts,
                        };
                    } else {
                        statDebug.posts = {
                            sourceTable: 'posts',
                            missingTable: true,
                            value: total_posts,
                        };
                    }
                    const pending_moderation = 0;
                    const lowStockDebug = {};
                    const low_stock = await this.getLowStockCount(
                        siteDB,
                        communityType,
                        scopedCommunityId,
                        lowStockDebug,
                    );
                    statDebug.lowStock = {
                        ...lowStockDebug,
                        value: low_stock,
                    };
                    let new_orders_today = 0;
                    if (await this.tableExists(siteDB, 'orders')) {
                        const todayScope = await this.resolveCommunityScope(
                            siteDB,
                            'orders',
                            communityType,
                            scopedCommunityId,
                        );
                        const whereParts = ['DATE(created_at) = CURDATE()'];
                        const params = [];
                        if (todayScope.sql) {
                            whereParts.push(todayScope.sql);
                            params.push(...todayScope.params);
                        }
                        const [todayRows] = await siteDB.query(
                            `
                                SELECT COUNT(*) AS new_orders_today
                                FROM orders
                                WHERE ${whereParts.join(' AND ')}
                            `,
                            params,
                        );
                        new_orders_today = Number(todayRows?.[0]?.new_orders_today || 0);
                        statDebug.newOrdersToday = {
                            sourceTable: 'orders',
                            where: whereParts.join(' AND '),
                            params,
                            value: new_orders_today,
                        };
                    } else {
                        statDebug.newOrdersToday = {
                            sourceTable: 'orders',
                            missingTable: true,
                            value: new_orders_today,
                        };
                    }

                    debugLog('getCommunityStats:per-db-stat', statDebug);
                    if (includeDebug) perDbDebug.push(statDebug);

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
            if (includeDebug) {
                        return res.json({
                    ...stats,
                    __debug: {
                        communityType,
                        siteName,
                        scopedCommunityId,
                        dbNames: uniqueDbNames,
                        resolvedDbNames,
                        perDb: perDbDebug,
                    },
                });
            }
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
