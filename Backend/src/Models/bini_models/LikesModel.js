import { connect, resolveCommunityContext } from '../../core/database.js';

class LikesModel {
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
      const hasLikes = await this.hasTableOnPool(this.db, 'likes');
      if (!hasLikes) {
        console.warn(
          `[LikesModel] Falling back to default DB because likes table is missing for community "${community_type}"`,
        );
        this.db = await connect();
      }
      this.columnCache.clear();
      const ctx = await resolveCommunityContext(community_type);
      this.activeCommunityId = Number(ctx?.community_id || 0) || null;
    } catch (err) {
      console.error('<error> LikesModel.ensureConnection failed:', err?.message || err);
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

  // create a like for a post or comment
  async createLike(likeType, postId, commentId, userId) {
    try {
      console.log(likeType);
      
      let query;
      const likesHasCommunity = await this.hasColumn('likes', 'community_id');
      if (likeType === 'post') {
        query = likesHasCommunity
          ? `INSERT INTO likes (like_type, post_id, user_id, community_id) VALUES (?, ?, ?, ?)`
          : `INSERT INTO likes (like_type, post_id, user_id) VALUES (?, ?, ?)`;
        const [result] = await this.db.query(
          query,
          likesHasCommunity
            ? [likeType, postId, userId, this.activeCommunityId]
            : [likeType, postId, userId],
        );
        return result;
      } else if (likeType === 'comment') {
        query = likesHasCommunity
          ? `INSERT INTO likes (like_type, comment_id, user_id, community_id) VALUES (?, ?, ?, ?)`
          : `INSERT INTO likes (like_type, comment_id, user_id) VALUES (?, ?, ?)`;
        const [result] = await this.db.query(
          query,
          likesHasCommunity
            ? [likeType, commentId, userId, this.activeCommunityId]
            : [likeType, commentId, userId],
        );
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
      const scoped = await this.getScopedCondition('likes');
      if (likeType === 'post') {
        query = `DELETE FROM likes WHERE like_type = 'post' AND post_id = ? AND user_id = ?${scoped.sql}`;
        const [result] = await this.db.query(query, [postId, userId, ...scoped.params]);
        return result;
      } else if (likeType === 'comment') {
        query = `DELETE FROM likes WHERE like_type = 'comment' AND comment_id = ? AND user_id = ?${scoped.sql}`;
        const [result] = await this.db.query(query, [commentId, userId, ...scoped.params]);
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
      const scoped = await this.getScopedCondition('likes');
      const query = `SELECT COUNT(*) AS like_count FROM likes WHERE like_type = 'post' AND post_id = ?${scoped.sql}`;
      const [result] = await this.db.query(query, [postId, ...scoped.params]);
      return result[0].like_count;
    } catch (err) {
      throw err;
    }
  }
  // count likes on a comment
  async countLikesOnComment(commentId) {
    try {
      const scoped = await this.getScopedCondition('likes');
      const query = `SELECT COUNT(*) AS like_count FROM likes WHERE like_type = 'comment' AND comment_id = ?${scoped.sql}`;
      const [result] = await this.db.query(query, [commentId, ...scoped.params]);
      return result[0].like_count;
    } catch (err) {
      throw err;
    }
  }
  // check if a user has liked a post
  async isLikedByUserOnPost(postId, userId) {
    try {
      const scoped = await this.getScopedCondition('likes');
      const query = `SELECT * FROM likes WHERE like_type = 'post' AND post_id = ? AND user_id = ?${scoped.sql}`;
      const [result] = await this.db.query(query, [postId, userId, ...scoped.params]);
      return result.length > 0;
    } catch (err) {
      throw err;
    }
  }
  // check if a user has liked a comment
  async isLikedByUserOnComment(commentId, userId) {
    try {
      console.log(commentId);
      const scoped = await this.getScopedCondition('likes');
      const query = `SELECT * FROM likes WHERE like_type = 'comment' AND comment_id = ? AND user_id = ?${scoped.sql}`;
      const [result] = await this.db.query(query, [commentId, userId, ...scoped.params]);
      return result.length > 0;
    } catch (err) {
      throw err;
    }
  }
  // get all users who liked a post
  async getUsersWhoLikedPost(postId) {
    try {
      const scoped = await this.getScopedCondition('likes', 'likes');
      const query = `
        SELECT users.username FROM likes
        JOIN users ON likes.user_id = users.user_id
        WHERE like_type = 'post' AND post_id = ?${scoped.sql}`;
      const [result] = await this.db.query(query, [postId, ...scoped.params]);
      return result;
    } catch (err) {
      throw err;
    }
  }
  // get all users who liked a comment
  async getUsersWhoLikedComment(commentId) {
    try {
      const scoped = await this.getScopedCondition('likes', 'likes');
      const query = `
        SELECT users.username FROM likes
        JOIN users ON likes.user_id = users.user_id
        WHERE like_type = 'comment' AND comment_id = ?${scoped.sql}`;
      const [result] = await this.db.query(query, [commentId, ...scoped.params]);
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
        const hasPostCommunityId = await this.hasColumn('posts', 'community_id');
        const postScoped = hasPostCommunityId && this.activeCommunityId;
        queryPostOwner = `SELECT user_id FROM posts WHERE post_id = ?${postScoped ? ' AND community_id = ?' : ''}`;
        console.log(queryPostOwner);
        const [postOwner] = await this.db.query(
          queryPostOwner,
          postScoped ? [postId, this.activeCommunityId] : [postId],
        );
        
        console.log(postOwner);
        if (postOwner.length === 0) {
          throw new Error('Post not found');
        }

        const postOwnerId = postOwner[0].user_id;

      
        if (sourceUserId !== postOwnerId) {
          const hasNotifCommunity = await this.hasColumn('notifications', 'community_id');
          const query = hasNotifCommunity
            ? `INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, community_id)
               VALUES (?, 'like', ?, ?, ?)`
            : `INSERT INTO notifications (user_id, activity_type, source_user_id, post_id)
               VALUES (?, 'like', ?, ?)`;
          const params = hasNotifCommunity
            ? [postOwnerId, sourceUserId, postId, this.activeCommunityId]
            : [postOwnerId, sourceUserId, postId];
          const [result] = await this.db.query(query, params);
          return result;
        }
      } else if (commentId) {
        const hasCommentCommunityId = await this.hasColumn('comments', 'community_id');
        const commentScoped = hasCommentCommunityId && this.activeCommunityId;
        queryPostOwner = `SELECT user_id FROM comments WHERE comment_id = ?${commentScoped ? ' AND community_id = ?' : ''}`;
        const [commentOwner] = await this.db.query(
          queryPostOwner,
          commentScoped ? [commentId, this.activeCommunityId] : [commentId],
        );
        if (commentOwner.length === 0) {
          throw new Error('Comment not found');
        }

        const commentOwnerId = commentOwner[0].user_id;

        
        if (sourceUserId !== commentOwnerId) {
          const hasNotifCommunity = await this.hasColumn('notifications', 'community_id');
          const query = hasNotifCommunity
            ? `INSERT INTO notifications (user_id, activity_type, source_user_id, comment_id, community_id)
               VALUES (?, 'like', ?, ?, ?)`
            : `INSERT INTO notifications (user_id, activity_type, source_user_id, comment_id)
               VALUES (?, 'like', ?, ?)`;
          const params = hasNotifCommunity
            ? [commentOwnerId, sourceUserId, commentId, this.activeCommunityId]
            : [commentOwnerId, sourceUserId, commentId];
          const [result] = await this.db.query(query, params);
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
      const notifScoped = await this.getScopedCondition('notifications');
      if (postId) {
        query = `
          DELETE FROM notifications
          WHERE source_user_id = ? AND post_id = ? AND activity_type = 'like'${notifScoped.sql}`;
        const [result] = await this.db.query(query, [userId, postId, ...notifScoped.params]);
        return result;
      } else if (commentId) {
        query = `
          DELETE FROM notifications
          WHERE source_user_id = ? AND comment_id = ? AND activity_type = 'like'${notifScoped.sql}`;
        const [result] = await this.db.query(query, [userId, commentId, ...notifScoped.params]);
        return result;
      }
    } catch (err) {
      throw err;
    }
  }
}

export default LikesModel;
