


import { connect } from '../../core/database.js';
import { connectAdmin } from '../../core/database.js';
import { getDBNamesByCommunityType } from './site-model.js';
import { resolveCommunityContext } from '../../core/database.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
    if (!ADMIN_DEBUG) return;
    console.log(`[ADMIN DEBUG][RevenueModel][${scope}]`, payload);
};

class RevenueModel {
    async hasAdminTable(db, tableName) {
        const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
        return Array.isArray(rows) && rows.length > 0;
    }

    async getAdminTableColumns(db, tableName) {
        if (!await this.hasAdminTable(db, tableName)) return new Set();
        const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
        return new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
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

    async resolveCommunityId(communityType = '') {
        const scoped = String(communityType || '').trim().toLowerCase();
        if (!scoped || scoped === 'all') return null;
        const numeric = Number(scoped);
        if (Number.isFinite(numeric) && numeric > 0) return numeric;

        // Priority: resolve from community_table (source of truth for selections).
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
                let query = `
                    SELECT ct.community_id
                    FROM community_table ct
                `;
                const params = [];

                if (hasCommunities && communityPk) {
                    query += `
                        LEFT JOIN communities c ON c.${communityPk} = ct.community_id
                    `;
                }

                query += `
                    WHERE LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
                       OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
                `;
                params.push(scoped, scoped);

                if (scoped.endsWith('-website')) {
                    const trimmed = scoped.replace(/-website$/, '');
                    query += `
                       OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
                       OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
                    `;
                    params.push(trimmed, trimmed);
                } else {
                    const websiteForm = `${scoped}-website`;
                    query += ` OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?)) `;
                    params.push(websiteForm);
                }

                if (hasCommunities && hasCommunityName && communityPk) {
                    query += ` OR LOWER(TRIM(c.name)) = LOWER(TRIM(?)) `;
                    params.push(scoped);
                }

                query += ` LIMIT 1 `;

                const [rows] = await adminDB.query(query, params);
                const communityId = Number(rows?.[0]?.community_id || 0);
                if (communityId > 0) return communityId;
            }
        } catch (_) {}

        // Fallback: old site-context resolver.
        const ctx = await resolveCommunityContext(scoped);
        return Number(ctx?.community_id || 0) || null;
    }

    async getRevenueForCommunity(communityType, siteName = '') {
        try {
            const dbNames = await getDBNamesByCommunityType(communityType, siteName);
            const uniqueDbNames = Array.from(
                new Set((dbNames || []).map((name) => String(name || '').trim()).filter(Boolean)),
            );
            const scopedCommunityId = await this.resolveCommunityId(communityType);
            debugLog('getRevenueForCommunity:start', {
                communityType,
                siteName,
                dbNames,
                uniqueDbNames,
                scopedCommunityId,
            });

            if (uniqueDbNames.length === 0) return [];

            const result = [];
            const processedPhysicalDbs = new Set();

            for (const dbName of uniqueDbNames) {
                let siteDB;
                try {
                    siteDB = await connect(dbName);
                    const [dbRows] = await siteDB.query('SELECT DATABASE() AS current_db');
                    const physicalDb = String(dbRows?.[0]?.current_db || '').trim().toLowerCase();
                    if (physicalDb && processedPhysicalDbs.has(physicalDb)) {
                        continue;
                    }
                    if (physicalDb) processedPhysicalDbs.add(physicalDb);
                    let dailyRevenue = [];

                    // Primary source of truth: daily_revenue.
                    if (await this.tableExists(siteDB, 'daily_revenue')) {
                        const hasDailyRevenueCommunityId = await this.tableHasColumn(
                            siteDB,
                            'daily_revenue',
                            'community_id',
                        );
                        const hasOrders = await this.tableExists(siteDB, 'orders');
                        if (hasOrders) {
                            const hasCommunityId = await this.tableHasColumn(siteDB, 'orders', 'community_id');
                            const params = [];
                            let communityWhere = '';
                            if (scopedCommunityId) {
                                if (hasDailyRevenueCommunityId && hasCommunityId) {
                                    communityWhere = `
                                      WHERE (
                                        COALESCE(dr.community_id, 0) = ?
                                        OR COALESCE(dr.community_id, 0) = 0
                                        OR COALESCE(o.community_id, 0) = ?
                                        OR COALESCE(o.community_id, 0) = 0
                                      )
                                    `;
                                    params.push(scopedCommunityId, scopedCommunityId);
                                } else if (hasDailyRevenueCommunityId) {
                                    communityWhere = `
                                      WHERE (
                                        COALESCE(dr.community_id, 0) = ?
                                        OR COALESCE(dr.community_id, 0) = 0
                                      )
                                    `;
                                    params.push(scopedCommunityId);
                                } else if (hasCommunityId) {
                                    communityWhere = `
                                      WHERE (
                                        COALESCE(o.community_id, 0) = ?
                                        OR COALESCE(o.community_id, 0) = 0
                                      )
                                    `;
                                    params.push(scopedCommunityId);
                                }
                            }

                            const [legacyRows] = await siteDB.query(
                                `
                                  SELECT
                                    dr.order_id,
                                    dr.date,
                                    TIME_FORMAT(dr.time, '%H:%i:%s') AS time,
                                    dr.total_amount,
                                    dr.created_at
                                  FROM daily_revenue dr
                                  LEFT JOIN orders o ON o.order_id = dr.order_id
                                  ${communityWhere}
                                  ORDER BY dr.created_at DESC
                                  LIMIT 30
                                `,
                                params,
                            );
                            dailyRevenue = legacyRows || [];

                            if ((!dailyRevenue || dailyRevenue.length === 0) && scopedCommunityId) {
                                const relaxedWhere =
                                    hasDailyRevenueCommunityId
                                        ? `
                                          WHERE (
                                            COALESCE(dr.community_id, 0) = ?
                                            OR COALESCE(dr.community_id, 0) = 0
                                          )
                                        `
                                        : '';
                                const [relaxedRows] = await siteDB.query(
                                    `
                                      SELECT
                                        dr.order_id,
                                        dr.date,
                                        TIME_FORMAT(dr.time, '%H:%i:%s') AS time,
                                        dr.total_amount,
                                        dr.created_at
                                      FROM daily_revenue dr
                                      ${relaxedWhere}
                                      ORDER BY dr.created_at DESC
                                      LIMIT 30
                                    `,
                                    relaxedWhere ? [scopedCommunityId] : [],
                                );
                                dailyRevenue = relaxedRows || [];
                                debugLog('getRevenueForCommunity:relaxed-daily-revenue-fallback', {
                                    dbName,
                                    scopedCommunityId,
                                    count: dailyRevenue.length,
                                });
                            }
                        } else {
                            const params = [];
                            const where =
                                scopedCommunityId && hasDailyRevenueCommunityId
                                    ? 'WHERE COALESCE(dr.community_id, 0) = ?'
                                    : '';
                            if (where) params.push(scopedCommunityId);
                            const [legacyRows] = await siteDB.query(
                                `
                                  SELECT
                                    dr.order_id,
                                    dr.date,
                                    TIME_FORMAT(dr.time, '%H:%i:%s') AS time,
                                    dr.total_amount,
                                    dr.created_at
                                  FROM daily_revenue dr
                                  ${where}
                                  ORDER BY dr.created_at DESC
                                  LIMIT 30
                                `,
                                params,
                            );
                            dailyRevenue = legacyRows || [];
                        }
                    }

                    // Fallback: derive from completed orders when daily_revenue is empty.
                    if ((!dailyRevenue || dailyRevenue.length === 0) && await this.tableExists(siteDB, 'orders')) {
                        const hasCommunityId = await this.tableHasColumn(siteDB, 'orders', 'community_id');
                        const whereParts = [`LOWER(TRIM(COALESCE(o.status, ''))) = 'completed'`];
                        const params = [];
                        if (scopedCommunityId && hasCommunityId) {
                            whereParts.push('(COALESCE(o.community_id, 0) = ? OR COALESCE(o.community_id, 0) = 0)');
                            params.push(scopedCommunityId);
                        }
                        const [orderRows] = await siteDB.query(
                            `
                              SELECT
                                o.order_id,
                                DATE(o.created_at) AS date,
                                TIME_FORMAT(o.created_at, '%H:%i:%s') AS time,
                                o.total AS total_amount,
                                o.created_at
                              FROM orders o
                              WHERE ${whereParts.join(' AND ')}
                              ORDER BY o.created_at DESC
                              LIMIT 30
                            `,
                            params,
                        );
                        dailyRevenue = orderRows || [];
                    }

                    if ((!dailyRevenue || dailyRevenue.length === 0) && await this.tableExists(siteDB, 'orders')) {
                        const [anyOrderRows] = await siteDB.query(
                            `
                              SELECT
                                o.order_id,
                                DATE(o.created_at) AS date,
                                TIME_FORMAT(o.created_at, '%H:%i:%s') AS time,
                                o.total AS total_amount,
                                o.created_at
                              FROM orders o
                              ORDER BY o.created_at DESC
                              LIMIT 30
                            `,
                        );
                        dailyRevenue = anyOrderRows || [];
                        debugLog('getRevenueForCommunity:last-resort-orders-fallback', {
                            dbName,
                            scopedCommunityId,
                            count: dailyRevenue.length,
                        });
                    }

                    debugLog('getRevenueForCommunity:db-result', {
                        dbName,
                        scopedCommunityId,
                        count: Array.isArray(dailyRevenue) ? dailyRevenue.length : 0,
                        sample: Array.isArray(dailyRevenue) && dailyRevenue.length ? dailyRevenue[0] : null,
                    });

                    result.push({
                        db_name: dbName,
                        daily_revenue: dailyRevenue
                    });
                } catch (dbError) {
                    console.error(`Error fetching completed-order revenue for site DB "${dbName}":`, dbError);
                } 
            }

            return result;

        } catch (error) {
            console.error('Error fetching revenue for community:', error);
            throw error;
        }
    }
}

export default RevenueModel;
