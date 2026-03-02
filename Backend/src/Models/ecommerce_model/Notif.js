import { connect } from '../../core/database.js';

class NotificationModel {
    constructor() {
        this.connect();
    }
    async connect() {
        this.db = await connect();
    }
    // create a new notification
    async createNotification(user_id, activity_type, source_user_id, post_id) {
        const query = `
            INSERT INTO notifications (user_id, activity_type, source_user_id, post_id)
            VALUES (?, ?, ?, ?)`;
        const [result] = await this.db.query(query, [user_id, activity_type, source_user_id, post_id]);
        return result.insertId; // Return the newly created notification ID
    }
    // get all notifications for a user
    async getUserNotifications(user_id) {
        const query = `
            SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
        const [notifications] = await this.db.query(query, [user_id]);
        return notifications; // Return the list of notifications
    }
    // get the owner of a post
    async getPostOwner(post_id) {
        const query = `
            SELECT user_id FROM posts WHERE post_id = ?`;
        const [result] = await this.db.query(query, [post_id]);
        return result[0]?.user_id; // Return the user_id of the post owner
    }
}

export default NotificationModel;