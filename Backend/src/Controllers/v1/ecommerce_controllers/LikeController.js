import LikesModel from '../../../Models/ecommerce_model/LikesModel.js';

class LikeController {
    constructor() {
        this.likeModel = new LikesModel(); 
    }
    // Toggle like on a post or comment
    async toggleLike(req, res) {
        const { likeType, Id} = req.params; 
        const userId_wholike = res.locals.userId;
        console.log(likeType);
        try {
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
            return res.status(500).json({ message: 'Failed to toggle like', error: error.message || error });
        }
    }
    // Get like count for a post or comment
    async getLikeCount(req, res) {
        const { likeType, Id } = req.params;

        try {
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
            return res.status(500).json({ message: 'Failed to get like count', error });
        }
    }
    // Check if current user has liked a post or comment
    async isLiked(req, res) {
        const { likeType, Id } = req.params;
        const userId = res.locals.userId;
        console.log(likeType);

        try {
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
            return res.status(500).json({ message: 'Failed to check like status', error });
        }
    }
    // Get users who liked a post or comment
    async getUsersWhoLiked(req, res) {
        const { likeType, postId, commentId } = req.params;

        try {
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
            return res.status(500).json({ message: 'Failed to get users who liked', error });
        }
    }
}
export default LikeController;

