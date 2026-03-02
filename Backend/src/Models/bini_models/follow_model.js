import { connect } from '../../core/database.js';

class Follow {
    constructor() {
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
        } catch (err) {
            console.error('<error> Follow.ensureConnection failed:', err?.message || err);
            this.db = await connect();
        }
        return this.db;
    }
    // Get suggested followers: users not yet followed by current user
    async getSuggestedFollowers(currentUserId, limit = 10, offset = 0) {
        if (!this.db) await this.connect();
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
            WHERE u.user_id != ?
              AND u.user_id NOT IN (
                SELECT followed_id FROM follows WHERE follower_id = ?
              )
            ORDER BY RAND()
            LIMIT ?
            OFFSET ?
            `,
            [currentUserId, currentUserId, limit, offset]
        );
        return rows;
    }
    // Get all users that current user is following
    async getFollowing(currentUserId, limit = 10, offset = 0) {
        if (!this.db) await this.connect();
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
            `,
            [currentUserId]
        );
        return rows;
    }
    // Get all users that are following the current user
    async getFollowers(currentUserId) {
        if (!this.db) await this.connect();
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
            `,
            [currentUserId]
        );
        return rows;
    }
    // Get all users that are either followed by or following the current user (for chat)
    async getChatUsers(currentUserId) {
        if (!this.db) await this.connect();
        const [rows] = await this.db.execute(
            `
            SELECT 
                u.user_id, 
                u.fullname, 
                u.profile_picture
            FROM users u
            WHERE u.user_id IN (
                SELECT followed_id FROM follows WHERE follower_id = ?
                UNION
                SELECT follower_id FROM follows WHERE followed_id = ?
            )
            AND u.user_id != ?
            `,
            [currentUserId, currentUserId, currentUserId]
        );
        return rows;
    }
}

export default Follow;
