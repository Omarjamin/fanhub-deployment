import Follow from '../../../Models/ecommerce_model/follow_model.js';

class FollowController {
    constructor() {
        this.followModel = new Follow();
    }
    // Get suggested followers
    async getSuggestedFollowers(req, res) {
        const currentUserId = res.locals.userId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;

        if (!currentUserId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        try {
            const suggestions = await this.followModel.getSuggestedFollowers(currentUserId, limit);
            return res.status(200).json(suggestions);
        } catch (error) {
            console.error('Error fetching suggested followers:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    // Get users current user is following
    async getFollowing(req, res) {
        const currentUserId = res.locals.userId;

        if (!currentUserId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        try {
            const following = await this.followModel.getFollowing(currentUserId);
            return res.status(200).json(following);
        } catch (error) {
            console.error('Error fetching following:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    // Get followers of current user
    async getFollowers(req, res) {
        const currentUserId = res.locals.userId;

        if (!currentUserId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        try {
            const followers = await this.followModel.getFollowers(currentUserId);
            return res.status(200).json(followers);
        } catch (error) {
            console.error('Error fetching followers:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    // Get users connected for chat (either following or followers)
    async getChatUsers(req, res) {
        const currentUserId = res.locals.userId;

        if (!currentUserId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        try {
            const users = await this.followModel.getChatUsers(currentUserId);
            return res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching chat users:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
export default FollowController;
