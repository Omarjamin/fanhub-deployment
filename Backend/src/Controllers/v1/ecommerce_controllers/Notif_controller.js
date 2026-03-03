// controllers/notificationController.js
import NotificationModel from '../../../Models/ecommerce_model/Notif.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

class NotificationController {
    constructor() {
        this.notificationModel = new NotificationModel();
    }
    async ensureDbForRequest(req, res) {
        const communityType = resolveSiteSlug(req, res);
        if (!communityType) {
            const err = new Error('community_type is required');
            err.statusCode = 400;
            throw err;
        }
        if (typeof this.notificationModel.ensureConnection === 'function') {
            await this.notificationModel.ensureConnection(communityType);
        }
    }
    // Notify post owner on specific activities
    async notifyPostOwner(req, res, activity_type, source_user_id, post_id) {
        try {
            await this.ensureDbForRequest(req, res);
            // Get the user ID of the post owner
            const postOwnerId = await this.notificationModel.getPostOwner(post_id);
            if (postOwnerId && postOwnerId !== source_user_id) {
                // Create a notification for the post owner
                await this.notificationModel.createNotification(postOwnerId, activity_type, source_user_id, post_id);
            }
        } catch (error) {
            console.error('Error notifying post owner:', error.message);
        }
    }
    // Notify on like activity
    async notifyOnComment(req, res) {
        const { source_user_id, post_id } = req.body;
        const actorId = source_user_id || req.user?.user_id || res.locals.userId;
        await this.notifyPostOwner(req, res, 'comment', actorId, post_id);
        return res.status(200).json({ message: 'Notification sent to post owner for comment' });
    }
    // Notify on like activity
    async notifyOnRepost(req, res) {
        const { source_user_id, post_id } = req.body;
        const actorId = source_user_id || req.user?.user_id || res.locals.userId;
        await this.notifyPostOwner(req, res, 'repost', actorId, post_id);
        return res.status(200).json({ message: 'Notification sent to post owner for repost' });
    }
    // Get notifications for the current user
    async getUserNotifications(req, res) {
        const userId = res.locals.userId; // Assuming userId is set in res.locals by authentication middleware

        try {
            await this.ensureDbForRequest(req, res);
            const notifications = await this.notificationModel.getUserNotifications(userId);
            return res.status(200).json(notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error.message);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }
}

export default NotificationController;
