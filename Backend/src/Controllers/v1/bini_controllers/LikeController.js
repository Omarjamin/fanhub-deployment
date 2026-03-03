import LikesModel from '../../../Models/bini_models/LikesModel.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

class LikeController {
    constructor() {
        this.likeModel = new LikesModel(); 
    }
    async ensureDbForRequest(req, res) {
        const communityType = resolveSiteSlug(req, res);
        if (!communityType) {
            const err = new Error('community_type is required');
            err.statusCode = 400;
            throw err;
        }
        await this.likeModel.ensureConnection(communityType);
    }
    // Toggle like on a post or comment
    async toggleLike(req, res) {
        // Support multiple route param styles:
        // 1) /posts/:postId/likes/toggle  -> req.params.postId
        // 2) /likes/toggle/:likeType/:Id -> req.params.likeType, req.params.Id
        const userId_wholike = res.locals.userId;
        let likeType = req.params.likeType;
        let Id = req.params.Id;
        if (!likeType) {
            if (req.params.postId) {
                likeType = 'post';
                Id = req.params.postId;
            } else if (req.params.commentId) {
                likeType = 'comment';
                Id = req.params.commentId;
            }
        }
        console.log('toggleLike params', { likeType, Id });
        try {
            await this.ensureDbForRequest(req, res);
            if (likeType === 'post') {
                const postId = Id;
                const isLiked = await this.likeModel.isLikedByUserOnPost(postId, userId_wholike); 

                if (isLiked) {
                    
                    await this.likeModel.deleteLike('post', postId, null, userId_wholike); 
                    await this.likeModel.deleteLikeNotification(userId_wholike, postId, null); 
                    return res.status(200).json({ message: 'Like removed and notification deleted' });
                } else {
                    
                    await this.likeModel.createLike('post', postId, null, userId_wholike); 
                    await this.likeModel.createLikeNotification(userId_wholike, postId, null); 
                    return res.status(201).json({ message: 'Like added and notification created' });
                }
            } else if (likeType === 'comment') {
                const commentId = Id;
                const isLiked = await this.likeModel.isLikedByUserOnComment(commentId, userId_wholike);

                if (isLiked) {
                    
                    await this.likeModel.deleteLike('comment', null, commentId, userId_wholike);
                    await this.likeModel.deleteLikeNotification(userId_wholike, null, commentId); 
                    return res.status(200).json({ message: 'Like removed and notification deleted' });
                } else {
                    
                    await this.likeModel.createLike('comment', null, commentId, userId_wholike);
                    await this.likeModel.createLikeNotification(userId_wholike, null, commentId);
                    return res.status(201).json({ message: 'Like added and notification created' });
                }
            } else {
                return res.status(400).json({ message: 'Invalid like type' });
            }
        } catch (error) {
            console.error(error);
            if (error?.statusCode === 400) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Failed to toggle like', error: error.message || error });
        }
    }
    // Get like count for a post or comment
    async getLikeCount(req, res) {
        // Support route styles: /posts/:postId/likes/count and /likes/count/:likeType/:Id
        let likeType = req.params.likeType;
        let Id = req.params.Id;
        if (!likeType) {
            if (req.params.postId) {
                likeType = 'post';
                Id = req.params.postId;
            } else if (req.params.commentId) {
                likeType = 'comment';
                Id = req.params.commentId;
            }
        }
        try {
            await this.ensureDbForRequest(req, res);
            let likeCount;
            if (likeType === 'post') {
                const postId = Id;
                likeCount = await this.likeModel.countLikesOnPost(postId); 
            } else if (likeType === 'comment') {
                const commentId = Id;
                likeCount = await this.likeModel.countLikesOnComment(commentId);
            } else {
                return res.status(400).json({ message: 'Invalid like type' });
            }
            return res.status(200).json({ likeCount });
        } catch (error) {
            console.error(error);
            if (error?.statusCode === 400) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Failed to get like count', error });
        }
    }
    // Check if current user has liked a post or comment
    async isLiked(req, res) {
        // Support route styles: /posts/:postId/likes/check and /likes/check/:likeType/:Id
        let likeType = req.params.likeType;
        let Id = req.params.Id;
        if (!likeType) {
            if (req.params.postId) {
                likeType = 'post';
                Id = req.params.postId;
            } else if (req.params.commentId) {
                likeType = 'comment';
                Id = req.params.commentId;
            }
        }
        const userId = res.locals.userId;
        console.log('isLiked params', { likeType, Id });

        try {
            await this.ensureDbForRequest(req, res);
            let isLiked;
            if (likeType === 'post') {
                const postId = Id;
                isLiked = await this.likeModel.isLikedByUserOnPost(postId, userId); 
            } else if (likeType === 'comment') {
                const commentId = Id;
                isLiked = await this.likeModel.isLikedByUserOnComment(commentId, userId);
            } else {
                return res.status(400).json({ message: 'Invalid like type' });
            }

            return res.status(200).json({ isLiked });
        } catch (error) {
            console.error(error);
            if (error?.statusCode === 400) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Failed to check like status', error });
        }
    }
    // Get users who liked a post or comment
    async getUsersWhoLiked(req, res) {
        // Support route styles for users who liked: /posts/:postId/likes/users or /likes/users/:likeType/:postId
        let likeType = req.params.likeType;
        let postId = req.params.postId;
        let commentId = req.params.commentId || req.params.Id;
        if (!likeType) {
            if (postId) likeType = 'post';
            if (commentId) likeType = 'comment';
        }
        try {
            await this.ensureDbForRequest(req, res);
            let users;
            if (likeType === 'post') {
                users = await this.likeModel.getUsersWhoLikedPost(postId); 
            } else if (likeType === 'comment') {
                users = await this.likeModel.getUsersWhoLikedComment(commentId);
            } else {
                return res.status(400).json({ message: 'Invalid like type' });
            }
            return res.status(200).json(users);
        } catch (error) {
            console.error(error);
            if (error?.statusCode === 400) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Failed to get users who liked', error });
        }
    }
}
export default LikeController;
