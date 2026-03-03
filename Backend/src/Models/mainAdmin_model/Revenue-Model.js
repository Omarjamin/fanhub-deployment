


import { connect } from '../../core/database.js';
import { getDBNamesByCommunityType } from './site-model.js';
import { resolveCommunityContext } from '../../core/database.js';


class RevenueModel {
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

                    // Primary source of truth: completed orders.
                    const hasOrders = await this.tableExists(siteDB, 'orders');
                    if (hasOrders) {
                        const hasCommunityId = await this.tableHasColumn(siteDB, 'orders', 'community_id');
                        const whereParts = [`LOWER(TRIM(COALESCE(o.status, ''))) = 'completed'`];
                        const params = [];
                        if (scopedCommunityId && hasCommunityId) {
                            whereParts.push('COALESCE(o.community_id, 0) = ?');
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
