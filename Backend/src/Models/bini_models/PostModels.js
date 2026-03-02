import { connect } from '../../core/database.js';
import { moderateContent } from '../../core/moderation.js';

class PostModel {
  constructor() {
    this.connect();
  }
  async connect() {
    this.db = await connect();
  }
  async ensureConnection(community_type) {
    try {
      this.db = await connect(community_type);
    } catch (err) {
      console.error('<error> PostModel.ensureConnection failed:', err?.message || err);
      this.db = await connect();
    }
    return this.db;
  }
  // Get Random Posts with Pagination for Infinite Scrolling
  async getRandomPost(limit = 7, offset = 0, community_type = '') {
    try {
      const db = await this.ensureConnection(community_type);
      console.log(`[PostModel] getRandomPost -> using DB connection for community: "${community_type}"`);
      if (community_type) {
        const [dbRows] = await db.query('SELECT DATABASE() AS current_db');
        const currentDb = dbRows?.[0]?.current_db || '';
        const defaultDb = String(process.env.DB_NAME || '').trim();
        const requestedCommunity = String(community_type || '').trim().toLowerCase();

        // Prevent cross-community leakage when resolver falls back to default DB.
        if (requestedCommunity && defaultDb && currentDb === defaultDb && requestedCommunity !== 'bini') {
          console.warn(
            `[PostModel] Community DB fallback detected (requested=${requestedCommunity}, db=${currentDb}). Returning empty feed to prevent data leak.`
          );
          return [];
        }
      }
      const query = `
        SELECT 
          p.post_id,
          p.user_id,
          p.content,
          p.img_url,
          p.created_at,
          p.updated_at,
          GROUP_CONCAT(h.tag) AS tags,
          u.profile_picture,
          u.fullname
        FROM posts p
        LEFT JOIN hashtags h ON p.post_id = h.post_id
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE p.repost_id IS NULL
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await db.query(query, [limit, offset]);

      // Normalize tags to an array so the frontend can always rely on it
      const posts = rows.map(post => ({
        ...post,
        tags: post.tags ? post.tags.split(',') : [],
      }));

      return posts;
    } catch (err) {
      console.error('Error in getRandomPost:', err);
      throw err;
    }
  }
  // Create Post
  async createPost(user_id, content, img_url, tags = []) {
    console.log('=== CREATEPOST CALLED ===');
    console.log('Content:', content);
    console.log('User ID:', user_id);
    try {
      // Moderate content before creating post
      const moderation = await moderateContent(content);
      if (moderation.risk === 'high') {
        throw new Error('Content not allowed due to policy violation');
      }

      const query = `
        INSERT INTO posts (user_id, content, img_url, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [user_id, content, img_url, new Date(), new Date()];
      const [result] = await this.db.query(query, params);

      const postId = result.insertId;

      if (tags && tags.length > 0) {
        await this.addHashtags(postId, tags);
      }

      return {
        post_id: postId,
        user_id,
        content,
        img_url,
        created_at: new Date(),
        updated_at: new Date(),
        tags,
        moderation_result: moderation, // Include moderation result for reference
      };
    } catch (err) {
      console.error('PostModel.createPost', err);
      throw err;
    }
  }
  // Add Hashtags
  async addHashtags(postId, tags) {
    if (tags.length === 0) return;

    const placeholders = tags.map(() => `(?, ?)`).join(", ");
    const params = tags.flatMap(tag => [postId, tag]);

    const query = `
      INSERT INTO hashtags (post_id, tag) 
      VALUES ${placeholders}
    `;

    await this.db.query(query, params);
  }
  // Get Posts by User ID
  async getPostsByUserId(userId) {
    try {
      const query = `
        SELECT * 
        FROM posts 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `;
      const [posts] = await this.db.query(query, [userId]);
      return posts;
    } catch (err) {
      throw err;
    }
  }
  // Get Others' Reposts
  async getothersReposts(userId) {
    try {
      const query = `
        SELECT p.*, u.fullname, u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.repost_id IS NOT NULL AND p.user_id != ?
        ORDER BY p.created_at DESC
      `;
      const [reposts] = await this.db.query(query, [userId]);
      return reposts;
    } catch (err) {
      console.error('Error in getOthersReposts:', err);
      throw err;
    }
  }
  // Get Reposts
  async getReposts(userId) {
    try {
      const query = `
        SELECT p.*, u.fullname, u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.repost_id IS NOT NULL AND p.user_id = ?
        ORDER BY p.created_at DESC
      `;
      const [reposts] = await this.db.query(query, [userId]);
      return reposts;
    } catch (err) {
      console.error('Error in getReposts:', err);
      throw err;
    }
  }
  // Count Reposts for a specific post
  async getRepostCount(postId) {
    try {
      const query = `
        SELECT COUNT(*) as repostCount
        FROM posts
        WHERE repost_id = ?
      `;
      const [result] = await this.db.query(query, [postId]);
      return result[0].repostCount || 0;
    } catch (err) {
      console.error('Error in getRepostCount:', err);
      throw err;
    }
  }
  // Check if user has reposted a specific post
  async hasUserReposted(userId, postId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM posts
        WHERE repost_id = ? AND user_id = ?
      `;
      const [result] = await this.db.query(query, [postId, userId]);
      return result[0].count > 0;
    } catch (err) {
      console.error('Error in hasUserReposted:', err);
      throw err;
    }
  }

  // Get all reposts for a specific post  
  async getRepostsForPost(postId) {
    try {
      const query = `
        SELECT p.*, u.fullname, u.profile_picture, u.user_id
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.repost_id = ?
        ORDER BY p.created_at DESC
      `;
      const [reposts] = await this.db.query(query, [postId]);
      return reposts;
    } catch (err) {
      console.error('Error in getRepostsForPost:', err);
      throw err;
    }
  }

  // Get Post by ID
  async getPostById(postId) {
    try {
      const query = `
        SELECT p.*, u.fullname, u.profile_picture
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE p.post_id = ?
      `;
      const [post] = await this.db.query(query, [postId]);
      return post[0];
    } catch (err) {
      throw err;
    }
  }
  // Report a post
  async reportPost(reporter_id, reported_user_id, post_id, reason, message_id = null) {
    const queryWithMessage = `
      INSERT INTO reports (reporter_id, reported_user_id, report_type, post_id, reason, message_id, created_at)
      VALUES (?, ?, 'post', ?, ?, ?, NOW())
    `;

    try {
      const [result] = await this.db.query(queryWithMessage, [
        reporter_id,
        reported_user_id,
        post_id,
        reason,
        message_id,
      ]);
      return result;
    } catch (err) {
      // Some DB schemas do not include message_id for post_reports.
      if (err?.code === 'ER_BAD_FIELD_ERROR' && String(err.message).includes('message_id')) {
        const queryWithoutMessage = `
          INSERT INTO reports (reporter_id, reported_user_id, report_type, post_id, reason, created_at)
          VALUES (?, ?, 'post', ?, ?, NOW())
        `;
        const [result] = await this.db.query(queryWithoutMessage, [
          reporter_id,
          reported_user_id,
          post_id,
          reason,
        ]);
        return result;
      }
      if (err?.code === 'ER_BAD_FIELD_ERROR' && String(err.message).includes('report_type')) {
        const queryLegacy = `
          INSERT INTO reports (reporter_id, reported_user_id, post_id, reason, message_id, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await this.db.query(queryLegacy, [
          reporter_id,
          reported_user_id,
          post_id,
          reason,
          message_id,
        ]);
        return result;
      }
      throw err;
    }
  }

  // Count distinct reporters for a reported user in the last 30 days
  async getPostReportCount(reported_user_id) {
    const query = `
      SELECT COUNT(DISTINCT reporter_id) as unique_reporters
      FROM reports
      WHERE reported_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    const [rows] = await this.db.query(query, [reported_user_id]);
    return rows[0]?.unique_reporters || 0;
  }

  // Admin: list reported posts (aggregated)
  async getAllReportedPosts() {
    const query = `
      SELECT
        u.user_id,
        u.fullname,
        u.email,
        u.profile_picture,
        p.post_id,
        p.content,
        p.img_url,
        COUNT(DISTINCT pr.reporter_id) as unique_reporters,
        COUNT(pr.report_id) as total_reports,
        MAX(pr.created_at) as latest_report,
        GROUP_CONCAT(DISTINCT pr.reason) as reasons,
        SUBSTRING_INDEX(GROUP_CONCAT(pr.status ORDER BY pr.created_at DESC), ',', 1) as latest_status
      FROM reports pr
      JOIN posts p ON p.post_id = pr.post_id
      JOIN users u ON u.user_id = p.user_id
      WHERE (pr.post_id IS NOT NULL OR pr.report_type = 'post')
      GROUP BY p.post_id, u.user_id, u.fullname, u.email, u.profile_picture
      HAVING unique_reporters >= 3
      ORDER BY unique_reporters DESC, latest_report DESC
    `;
    const [rows] = await this.db.query(query);
    // Debug: log rows returned for admin reported posts
    try {
      console.log('[PostModel] getAllReportedPosts -> rows:', JSON.stringify(rows || []));
    } catch (e) {
      console.log('[PostModel] getAllReportedPosts -> rows (non-serializable)');
    }
    return rows;
  }

  // Admin: get reports for a specific post
  async getPostReports(postId) {
    const query = `
    FROM reports pr
    SELECT pr.*, r.fullname as reporter_name, r.email as reporter_email, p.content as post_content, p.img_url
      JOIN users r ON pr.reporter_id = r.user_id
      LEFT JOIN posts p ON pr.post_id = p.post_id
      WHERE pr.post_id = ?
      ORDER BY pr.created_at DESC
    `;
    const [rows] = await this.db.query(query, [postId]);
    return rows;
  }
  // Update Post
  async updatePost(postId, userId, content, img_url) {
    try {
      const query = `
        UPDATE posts 
        SET content = ?, img_url = ?, updated_at = ? 
        WHERE post_id = ? AND user_id = ?
      `;
      const params = [content, img_url, new Date(), postId, userId];
      const [result] = await this.db.query(query, params);
      return result.affectedRows;
    } catch (err) {
      throw err;
    }
  }
  // Delete Post
  async deletePost(postId, userId) {
    try {
      const query = `
        DELETE FROM posts 
        WHERE post_id = ? AND user_id = ?
      `;
      const [result] = await this.db.query(query, [postId, userId]);
      return result.affectedRows;
    } catch (err) {
      throw err;
      
    }
  }
  // Repost Post
  async repostPost(userId, postId) {
    try {
      const post = await this.getPostById(postId);
      if (!post) throw new Error('Post not found');

      const hasReposted = await this.hasUserReposted(userId, postId);
      if (hasReposted) {
        throw new Error('You have already reposted this post.');
      }

      const contentToRepost = post.content || 'Original post content unavailable';
      const query = `
        INSERT INTO posts (user_id, content, img_url, repost_id) 
        VALUES (?, ?, ?, ?)
      `;
      const params = [userId, contentToRepost, post.img_url || null, postId];
      await this.db.query(query, params);

      const originalPostOwnerId = post.user_id;
      await this.createNotificationForRepost(originalPostOwnerId, userId, postId);
    } catch (err) {
      throw err;
    }
  }
  // Create Notification for Repost
  async createNotificationForRepost(originalPostOwnerId, sourceUserId, postId) {
    const query = `
      INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [originalPostOwnerId, 'repost', sourceUserId, postId, new Date()];
    await this.db.query(query, params);
  }
  // Get Other User Posts
  async getOtherUserPosts(userId) {
    try {
      const query = `
        SELECT p.post_id, p.user_id, p.content, p.img_url, p.created_at, p.updated_at, 
               GROUP_CONCAT(h.tag) AS tags,
               u.profile_picture, u.fullname 
        FROM posts p
        LEFT JOIN hashtags h ON p.post_id = h.post_id
        LEFT JOIN users u ON p.user_id = u.user_id 
        WHERE p.user_id = ? AND repost_id IS NULL
        GROUP BY p.post_id
      `;
      const [rows] = await this.db.query(query, [userId]);

      const posts = rows.map(post => ({
        ...post,
        tags: post.tags ? post.tags.split(',') : [],
      }));

      return posts;
    } catch (err) {
      throw err;
    }
  }
  // Get User Posts
  async getUserPosts(userId) {
    try {
      const query = `
        SELECT p.post_id, p.user_id, p.content, p.img_url, p.created_at, p.updated_at, 
               GROUP_CONCAT(h.tag) AS tags,
               u.profile_picture, u.fullname 
        FROM posts p
        LEFT JOIN hashtags h ON p.post_id = h.post_id
        LEFT JOIN users u ON p.user_id = u.user_id 
        WHERE p.user_id = ? AND repost_id IS NULL
        GROUP BY p.post_id
      `;
      const [rows] = await this.db.query(query, [userId]);

      const posts = rows.map(post => ({
        ...post,
        tags: post.tags ? post.tags.split(',') : [],
      }));

      return posts;
    } catch (err) {
      throw err;
    }
  }
  // Get Following Posts
  async getFollowingPosts(userId) {
    try {
      const query = `
        SELECT posts.* 
        FROM posts
        JOIN followers ON followers.following_user_id = posts.user_id
        WHERE followers.user_id = ?
        ORDER BY posts.created_at DESC
      `;
      const [posts] = await this.db.query(query, [userId]);
      return posts;
    } catch (err) {
      throw err;
    }
  }  
}

export default PostModel;
