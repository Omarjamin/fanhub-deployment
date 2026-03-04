import { connect, resolveCommunityContext } from '../../core/database.js';

class NotificationModel {
    constructor() {
        this.activeCommunityId = null;
        this.columnCache = new Map();
        this.connect();
    }
    async connect() {
        this.db = await connect();
    }
    async ensureConnection(community_type = "") {
        try {
            this.db = await connect(community_type);
            const hasNotifications = await this.hasTableOnPool(this.db, 'notifications');
            if (!hasNotifications) {
                console.warn(
                    `[NotificationModel] Falling back to default DB because notifications table is missing for community "${community_type}"`,
                );
                this.db = await connect();
            }
            this.columnCache.clear();
            const ctx = await resolveCommunityContext(community_type);
            this.activeCommunityId = Number(ctx?.community_id || 0) || null;
        } catch (err) {
            console.error("<error> NotificationModel.ensureConnection failed:", err?.message || err);
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
    // create a new notification
    async createNotification(user_id, activity_type, source_user_id, post_id) {
        const hasCommunityId = await this.hasColumn('notifications', 'community_id');
        const query = hasCommunityId
            ? `INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, community_id) VALUES (?, ?, ?, ?, ?)`
            : `INSERT INTO notifications (user_id, activity_type, source_user_id, post_id) VALUES (?, ?, ?, ?)`;
        const params = hasCommunityId
            ? [user_id, activity_type, source_user_id, post_id, this.activeCommunityId]
            : [user_id, activity_type, source_user_id, post_id];
        const [result] = await this.db.query(query, params);
        return result.insertId; // Return the newly created notification ID
    }
    // get all notifications for a user
    async getUserNotifications(user_id) {
        const scoped = await this.getScopedCondition('notifications');
        const query = `SELECT * FROM notifications WHERE user_id = ?${scoped.sql} ORDER BY created_at DESC`;
        const [notifications] = await this.db.query(query, [user_id, ...scoped.params]);
        return notifications; // Return the list of notifications
    }
    // get the owner of a post
    async getPostOwner(post_id) {
        const scoped = await this.getScopedCondition('posts');
        const query = `SELECT user_id FROM posts WHERE post_id = ?${scoped.sql}`;
        const [result] = await this.db.query(query, [post_id, ...scoped.params]);
        return result[0]?.user_id; // Return the user_id of the post owner
    }
}

export default NotificationModel;
