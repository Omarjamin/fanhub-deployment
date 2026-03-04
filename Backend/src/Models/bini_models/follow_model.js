import { connect, resolveCommunityContext } from '../../core/database.js';

class Follow {
    constructor() {
        this.activeCommunityId = null;
        this.columnCache = new Map();
        this.connect();
    }
    async connect() {
        this.db = await connect();
        if (!this.db) {
            console.error('Database connection failed');
        }
    }
    async ensureConnection(community_type) {
        try {
            this.db = await connect(community_type);
            const hasUsers = await this.hasTableOnPool(this.db, 'users');
            const hasFollows = await this.hasTableOnPool(this.db, 'follows');
            if (!hasUsers || !hasFollows) {
                console.warn(
                    `[FollowModel] Falling back to default DB because users/follows table is missing for community "${community_type}"`,
                );
                this.db = await connect();
            }
            this.columnCache.clear();
            const ctx = await resolveCommunityContext(community_type);
            this.activeCommunityId = Number(ctx?.community_id || 0) || null;
        } catch (err) {
            console.error('<error> Follow.ensureConnection failed:', err?.message || err);
            this.db = await connect();
            this.columnCache.clear();
            this.activeCommunityId = null;
        }
        return this.db;
    }
    async hasTableOnPool(pool, tableName) {
        try {
            const [rows] = await pool.query(
                `SELECT 1
                 FROM INFORMATION_SCHEMA.TABLES
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = ?
                 LIMIT 1`,
                [tableName],
            );
            return Boolean(rows?.length);
        } catch (_) {
            return false;
        }
    }
    async hasColumn(tableName, columnName) {
        const key = `${tableName}:${columnName}`.toLowerCase();
        if (this.columnCache.has(key)) return this.columnCache.get(key);
        try {
            const [rows] = await this.db.query(`SHOW COLUMNS FROM ${tableName}`);
            const exists = (rows || []).some(
                (row) => String(row?.Field || '').trim().toLowerCase() === String(columnName).trim().toLowerCase(),
            );
            this.columnCache.set(key, exists);
            return exists;
        } catch (_) {
            this.columnCache.set(key, false);
            return false;
        }
    }
    async getScopedCondition(tableName, alias = '') {
        const hasCommunityId = await this.hasColumn(tableName, 'community_id');
        if (!hasCommunityId || !this.activeCommunityId) return { sql: '', params: [] };
        const col = alias ? `${alias}.community_id` : 'community_id';
        return { sql: ` AND ${col} = ?`, params: [this.activeCommunityId] };
    }
    // Get suggested followers: users not yet followed by current user
    async getSuggestedFollowers(currentUserId, limit = 10, offset = 0) {
        if (!this.db) await this.connect();
        const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(Number(limit), 50)) : 10;
        const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;
        const scoped = await this.getScopedCondition('follows', 'f');
        const params = [currentUserId, currentUserId, ...scoped.params];
        const [rows] = await this.db.query(
            `
            SELECT 
                u.user_id, 
                u.fullname, 
                u.profile_picture,
                (
                    SELECT COUNT(*) 
                    FROM follows f 
                    WHERE f.followed_id = u.user_id
                ) AS followers_count
            FROM users u
            WHERE u.user_id != ?
              AND u.user_id NOT IN (
                SELECT followed_id FROM follows f WHERE follower_id = ? ${scoped.sql}
              )
            ORDER BY RAND()
            LIMIT ${safeLimit}
            OFFSET ${safeOffset}
            `,
            params,
        );
        return rows;
    }
    // Get all users that current user is following
    async getFollowing(currentUserId, limit = 10, offset = 0) {
        if (!this.db) await this.connect();
        const scoped = await this.getScopedCondition('follows', 'f');
        const [rows] = await this.db.execute(
            `
            SELECT 
                u.user_id, 
                u.fullname, 
                u.profile_picture,
                (
                    SELECT COUNT(*) 
                    FROM follows f 
                    WHERE f.followed_id = u.user_id
                ) AS followers_count
            FROM users u
            JOIN follows f ON f.followed_id = u.user_id
            WHERE f.follower_id = ?
            ${scoped.sql}
            `,
            [currentUserId, ...scoped.params]
        );
        return rows;
    }
    // Get all users that are following the current user
    async getFollowers(currentUserId) {
        if (!this.db) await this.connect();
        const scoped = await this.getScopedCondition('follows', 'f');
        const [rows] = await this.db.execute(
            `
            SELECT 
                u.user_id, 
                u.fullname, 
                u.profile_picture,
                (
                    SELECT COUNT(*) 
                    FROM follows f 
                    WHERE f.followed_id = u.user_id
                ) AS followers_count
            FROM users u
            JOIN follows f ON f.follower_id = u.user_id
            WHERE f.followed_id = ?
            ${scoped.sql}
            `,
            [currentUserId, ...scoped.params]
        );
        return rows;
    }
    // Get all users that are either followed by or following the current user (for chat)
    async getChatUsers(currentUserId) {
        if (!this.db) await this.connect();
        const scoped = await this.getScopedCondition('follows', 'f');
        const scopedUnion = scoped.sql ? scoped.sql.replace(/f\./g, '') : '';
        const [rows] = await this.db.execute(
            `
            SELECT 
                u.user_id, 
                u.fullname, 
                u.profile_picture
            FROM users u
            WHERE u.user_id IN (
                SELECT followed_id FROM follows WHERE follower_id = ? ${scopedUnion}
                UNION
                SELECT follower_id FROM follows WHERE followed_id = ? ${scopedUnion}
            )
            AND u.user_id != ?
            `,
            [currentUserId, ...scoped.params, currentUserId, ...scoped.params, currentUserId]
        );
        return rows;
    }
}

export default Follow;
