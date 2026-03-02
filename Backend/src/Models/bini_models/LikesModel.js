import { connect } from '../../core/database.js';

class LikesModel {
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
      console.error('<error> LikesModel.ensureConnection failed:', err?.message || err);
      this.db = await connect();
    }
    return this.db;
  }

  // create a like for a post or comment
  async createLike(likeType, postId, commentId, userId) {
    try {
      console.log(likeType);
      
      let query;
      if (likeType === 'post') {
        query = `INSERT INTO likes (like_type, post_id, user_id) VALUES (?, ?, ?)`;
        const [result] = await this.db.query(query, [likeType, postId, userId]);
        return result;
      } else if (likeType === 'comment') {
        query = `INSERT INTO likes (like_type, comment_id, user_id) VALUES (?, ?, ?)`;
        const [result] = await this.db.query(query, [likeType, commentId, userId]);
        return result;
      } else {
        throw new Error('Invalid like type');
      }
    } catch (err) {
      throw err;
    }
  }

  // delete a like for a post or comment
  async deleteLike(likeType, postId, commentId, userId) {
    try {
      let query;
      if (likeType === 'post') {
        query = `DELETE FROM likes WHERE like_type = 'post' AND post_id = ? AND user_id = ?`;
        const [result] = await this.db.query(query, [postId, userId]);
        return result;
      } else if (likeType === 'comment') {
        query = `DELETE FROM likes WHERE like_type = 'comment' AND comment_id = ? AND user_id = ?`;
        const [result] = await this.db.query(query, [commentId, userId]);
        return result;
      } else {
        throw new Error('Invalid like type');
      }
    } catch (err) {
      throw err;
    }
  }
  // count likes on a post
  async countLikesOnPost(postId) {
    try {
      const query = `SELECT COUNT(*) AS like_count FROM likes WHERE like_type = 'post' AND post_id = ?`;
      const [result] = await this.db.query(query, [postId]);
      return result[0].like_count;
    } catch (err) {
      throw err;
    }
  }
  // count likes on a comment
  async countLikesOnComment(commentId) {
    try {
      const query = `SELECT COUNT(*) AS like_count FROM likes WHERE like_type = 'comment' AND comment_id = ?`;
      const [result] = await this.db.query(query, [commentId]);
      return result[0].like_count;
    } catch (err) {
      throw err;
    }
  }
  // check if a user has liked a post
  async isLikedByUserOnPost(postId, userId) {
    try {
      const query = `SELECT * FROM likes WHERE like_type = 'post' AND post_id = ? AND user_id = ?`;
      const [result] = await this.db.query(query, [postId, userId]);
      return result.length > 0;
    } catch (err) {
      throw err;
    }
  }
  // check if a user has liked a comment
  async isLikedByUserOnComment(commentId, userId) {
    try {
      console.log(commentId);
      const query = `SELECT * FROM likes WHERE like_type = 'comment' AND comment_id = ? AND user_id = ?`;
      const [result] = await this.db.query(query, [commentId, userId]);
      return result.length > 0;
    } catch (err) {
      throw err;
    }
  }
  // get all users who liked a post
  async getUsersWhoLikedPost(postId) {
    try {
      const query = `
        SELECT users.username FROM likes
        JOIN users ON likes.user_id = users.user_id
        WHERE like_type = 'post' AND post_id = ?`;
      const [result] = await this.db.query(query, [postId]);
      return result;
    } catch (err) {
      throw err;
    }
  }
  // get all users who liked a comment
  async getUsersWhoLikedComment(commentId) {
    try {
      const query = `
        SELECT users.username FROM likes
        JOIN users ON likes.user_id = users.user_id
        WHERE like_type = 'comment' AND comment_id = ?`;
      const [result] = await this.db.query(query, [commentId]);
      return result;
    } catch (err) {
      throw err;
    }
  }
  // create a like notification for post or comment owner
  async createLikeNotification(sourceUserId, postId, commentId) {
    try {
      
      let queryPostOwner;
      if (postId) {
        queryPostOwner = `SELECT user_id FROM posts WHERE post_id = ?`;
        console.log(queryPostOwner);
        const [postOwner] = await this.db.query(queryPostOwner, [postId]);
        
        console.log(postOwner);
        if (postOwner.length === 0) {
          throw new Error('Post not found');
        }

        const postOwnerId = postOwner[0].user_id;

      
        if (sourceUserId !== postOwnerId) {
          const query = `
            INSERT INTO notifications (user_id, activity_type, source_user_id, post_id)
            VALUES (?, 'like', ?, ?)`;
          const [result] = await this.db.query(query, [postOwnerId, sourceUserId, postId]);
          return result;
        }
      } else if (commentId) {
        queryPostOwner = `SELECT user_id FROM comments WHERE comment_id = ?`;
        const [commentOwner] = await this.db.query(queryPostOwner, [commentId]);
        if (commentOwner.length === 0) {
          throw new Error('Comment not found');
        }

        const commentOwnerId = commentOwner[0].user_id;

        
        if (sourceUserId !== commentOwnerId) {
          const query = `
            INSERT INTO notifications (user_id, activity_type, source_user_id, comment_id)
            VALUES (?, 'like', ?, ?)`;
          const [result] = await this.db.query(query, [commentOwnerId, sourceUserId, commentId]);
          return result;
        }
      }
    } catch (err) {
      throw err;
    }
  }
  // delete a like notification for post or comment owner
  async deleteLikeNotification(userId, postId, commentId) {
    try {
      let query;
      if (postId) {
        query = `
          DELETE FROM notifications
          WHERE source_user_id = ? AND post_id = ? AND activity_type = 'like'`;
        const [result] = await this.db.query(query, [userId, postId]);
        return result;
      } else if (commentId) {
        query = `
          DELETE FROM notifications
          WHERE source_user_id = ? AND comment_id = ? AND activity_type = 'like'`;
        const [result] = await this.db.query(query, [userId, commentId]);
        return result;
      }
    } catch (err) {
      throw err;
    }
  }
}

export default LikesModel;
