import { connect } from '../../core/database.js';
import { moderateContent } from '../../core/moderation.js';

class Comment {
  constructor() {
    this.init();
  }

  async init(community_type = "") {
    this.db = await connect(community_type);
  }
  async ensureConnection(community_type = "") {
    try {
      this.db = await connect(community_type);
    } catch (err) {
      console.error("<error> Comment.ensureConnection failed:", err?.message || err);
      this.db = await connect();
    }
    return this.db;
  }
  // get all comments for a post, including user info
  async getAllByPost(post_id) {
    try {
      const [results] = await this.db.execute(
        `SELECT c.comment_id, c.content, c.created_at, u.fullname AS username, u.fullname, c.parent_comment_id
         FROM comments c 
         JOIN users u ON c.user_id = u.user_id 
         WHERE c.post_id = ?`,
        [post_id]
      );

      const groupedComments = results.reduce((acc, comment) => {
        if (!comment.parent_comment_id) {
          acc[comment.comment_id] = { ...comment, replies: [] };
        } else {
          acc[comment.parent_comment_id]?.replies.push(comment);
        }
        return acc;
      }, {});

      return Object.values(groupedComments);
    } catch (err) {
      console.error('<error> comment.getAllByPost', err);
      throw err;
    }
  }
  // get all replies for a specific comment
  async getRepliesByComment(comment_id) {
  try {
    const [results] = await this.db.execute(
      `SELECT c.comment_id, c.content, c.created_at, u.fullname AS username, u.fullname, c.parent_comment_id
       FROM comments c 
       JOIN users u ON c.user_id = u.user_id 
       WHERE c.parent_comment_id = ?`, 
      [comment_id]
    );

    return results; 
  } catch (err) {
    console.error('<error> comment.getRepliesByComment', err);
    throw err;
  }
}

  // get all comments created by a specific user
  async getByUser(user_id) {
    try {
      const [results] = await this.db.execute(
        `SELECT c.comment_id, c.post_id, c.content, c.created_at, c.parent_comment_id
         FROM comments c
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC`,
        [user_id]
      );

      return results;
    } catch (err) {
      console.error('<error> comment.getByUser', err);
      throw err;
    }
  }
  // create a new comment
  async create(post_id, user_id, content, parent_comment_id) {
    try {
      // Moderate content before creating comment
      const moderation = await moderateContent(content);
      if (moderation.risk === 'high' || moderation.risk === 'medium') {
        throw new Error('Content not allowed due to policy violation');
      }

      const [results] = await this.db.execute(
        'INSERT INTO comments(post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
        [post_id, user_id, content, parent_comment_id]
      );

      const targetUserId = parent_comment_id 
        ? await this.getCommentOwner(parent_comment_id) 
        : await this.getPostOwner(post_id);

      if (targetUserId && targetUserId !== user_id) {
        await this.createNotification(targetUserId, 'comment', user_id, post_id);
      }

      return {
        ...results,
        moderation_result: moderation // Include moderation result for reference
      };
    } catch (err) {
      console.error('<error> comment.create', err);
      throw err;
    }
  }
  // create a notification
  async createNotification(user_id, activity_type, source_user_id, post_id) {
    try {
      const [results] = await this.db.execute(
        `INSERT INTO notifications(user_id, activity_type, source_user_id, post_id, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [user_id, activity_type, source_user_id, post_id]
      );
      return results;
    } catch (err) {
      console.error('<error> comment.createNotification', err);
      throw err;
    }
  }
  // get the owner of a post
  async getPostOwner(post_id) {
    try {
      const [result] = await this.db.execute(
        'SELECT user_id FROM posts WHERE post_id = ?',
        [post_id]
      );
      return result.length ? result[0].user_id : null;
    } catch (err) {
      console.error('<error> comment.getPostOwner', err);
      throw err;
    }
  }
  // get the owner of a comment
  async getCommentOwner(comment_id) {
    try {
      const [result] = await this.db.execute(
        'SELECT user_id FROM comments WHERE comment_id = ?',
        [comment_id]
      );
      return result.length ? result[0].user_id : null;
    } catch (err) {
      console.error('<error> comment.getCommentOwner', err);
      throw err;
    }
  }
  // create a reply to a comment
  async createReply(postId, userId, content, parent_comment_id) {
    try {
        console.log("createReply parameters: ", { postId, userId, content, parent_comment_id });
        
        // Moderate content before creating reply
        const moderation = await moderateContent(content);
        if (moderation.risk === 'high' || moderation.risk === 'medium') {
          throw new Error('Content not allowed due to policy violation');
        }
        
        // If postId is null, fetch it from the parent comment
        let finalPostId = postId;
        if (!postId) {
          const parentComment = await this.getCommentOwner(parent_comment_id);
          const [parentResult] = await this.db.execute(
            'SELECT post_id FROM comments WHERE comment_id = ?',
            [parent_comment_id]
          );
          if (parentResult.length > 0) {
            finalPostId = parentResult[0].post_id;
            console.log(`Resolved post_id from parent comment: ${finalPostId}`);
          }
        }
        
        const [results] = await this.db.execute(
            'INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
            [finalPostId || null, userId || null, content || null, parent_comment_id || null]
        );
        
        return {
          ...results,
          moderation_result: moderation // Include moderation result for reference
        };
    } catch (err) {
        console.error('<error> comment.reply!', err);
        throw err;
    }
}
  // update a comment
  async update(comment_id, content) {
    try {
      const [results] = await this.db.execute(
        'UPDATE comments SET content = ? WHERE comment_id = ?',
        [content, comment_id]
      );

      return results;
    } catch (err) {
      console.error('<error> comment.update', err);
      throw err;
    }
  }
  // delete a comment
  async delete(comment_id) {
    try {
      const [results] = await this.db.execute(
        'DELETE FROM comments WHERE comment_id = ?',
        [comment_id]
      );

      return results;
    } catch (err) {
      console.error('<error> comment.delete', err);
      throw err;
    }
  }
}

export default Comment;
