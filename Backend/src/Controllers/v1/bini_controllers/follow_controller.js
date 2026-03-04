import Follow from '../../../Models/bini_models/follow_model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';
    
class FollowController {
    constructor() {
        this.followModel = new Follow();
    }
    async ensureDbForRequest(req, res) {
        const communityType = resolveSiteSlug(req, res);
        if (!communityType) {
            const err = new Error('community_type is required');
            err.statusCode = 400;
            throw err;
        }
        await this.followModel.ensureConnection(communityType);
    }
    // Get suggested followers
    async getSuggestedFollowers(req, res) {
        const currentUserId = res.locals.userId;
        const parsedLimit = Number.parseInt(req.query.limit, 10);
        const parsedOffset = Number.parseInt(req.query.offset, 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 10;
        const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

        if (!currentUserId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        try {
            await this.ensureDbForRequest(req, res);
            const suggestions = await this.followModel.getSuggestedFollowers(currentUserId, limit, offset);
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
            await this.ensureDbForRequest(req, res);
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
            await this.ensureDbForRequest(req, res);
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
            await this.ensureDbForRequest(req, res);
            const users = await this.followModel.getChatUsers(currentUserId);
            return res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching chat users:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
export default FollowController;
