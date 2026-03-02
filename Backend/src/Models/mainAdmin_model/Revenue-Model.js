


import { connect } from '../../core/database.js';
import { getDBNamesByCommunityType } from './site-model.js';


class RevenueModel {
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

    async getRevenueForCommunity(communityType, siteName = '') {
        try {
            const dbNames = await getDBNamesByCommunityType(communityType, siteName);

            if (dbNames.length === 0) return [];

            const result = [];

            for (const dbName of dbNames) {
                let siteDB;
                try {
                    siteDB = await connect(dbName);

                    const hasOrderId = await this.tableHasColumn(siteDB, 'daily_revenue', 'order_id');
                    const hasTime = await this.tableHasColumn(siteDB, 'daily_revenue', 'time');
                    const hasCreatedAt = await this.tableHasColumn(siteDB, 'daily_revenue', 'created_at');
                    const hasId = await this.tableHasColumn(siteDB, 'daily_revenue', 'id');

                    const orderBy = hasCreatedAt
                        ? 'ORDER BY created_at DESC'
                        : (hasId ? 'ORDER BY id DESC' : 'ORDER BY date DESC');

                    const [dailyRevenue] = await siteDB.query(`
                        SELECT
                          ${hasOrderId ? 'order_id' : 'NULL AS order_id'},
                          date,
                          ${hasTime
                            ? "TIME_FORMAT(time, '%H:%i:%s')"
                            : (hasCreatedAt
                                ? "TIME_FORMAT(created_at, '%H:%i:%s')"
                                : "'-'")
                          } AS time,
                          total_amount,
                          ${hasCreatedAt ? 'created_at' : 'NULL AS created_at'}
                        FROM daily_revenue
                        ${orderBy}
                        LIMIT 30
                    `);

                    result.push({
                        db_name: dbName,
                        daily_revenue: dailyRevenue
                    });
                } catch (dbError) {
                    console.error(`Error fetching daily_revenue for site DB "${dbName}":`, dbError);
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
