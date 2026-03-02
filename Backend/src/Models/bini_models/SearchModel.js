import { connect } from '../../core/database.js';

class SearchModel {
  constructor() {
    this.connect();
  }
  async connect() {
    this.db = await connect();
  }
  async ensureConnection(community_type = '') {
    try {
      this.db = await connect(community_type);
    } catch (err) {
      console.error('<error> SearchModel.ensureConnection failed:', err?.message || err);
      this.db = await connect();
    }
    return this.db;
  }
  // search users by keyword in fullname or username
  async searchUser(keyword) {
    try {
      // Search users only (limit 5)
      const userQuery = `
        SELECT user_id, fullname, username, profile_picture
        FROM users
        WHERE fullname LIKE ? OR username LIKE ?
        ORDER BY fullname
        LIMIT 5
      `;
      const userParams = [
        `%${keyword}%`,
        `%${keyword}%`
      ];
      const [userResults] = await this.db.query(userQuery, userParams);

      return {
        users: userResults
      };
    } catch (err) {
      console.error("Error in searchAll:", err);
      throw err;
    }
  }

  async searchPostsByHashtag(keyword) {
    try {
      const raw = String(keyword || '').trim();
      if (!raw) return { posts: [] };

      const hashtag = raw.startsWith('#') ? raw : `#${raw}`;

      const postQuery = `
        SELECT
          p.post_id,
          p.user_id,
          p.content,
          p.img_url,
          p.created_at,
          u.fullname,
          u.profile_picture,
          GROUP_CONCAT(h2.tag) AS tags
        FROM hashtags h
        JOIN posts p ON p.post_id = h.post_id
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN hashtags h2 ON h2.post_id = p.post_id
        WHERE LOWER(h.tag) = LOWER(?)
        GROUP BY p.post_id, p.user_id, p.content, p.img_url, p.created_at, u.fullname, u.profile_picture
        ORDER BY p.created_at DESC
        LIMIT 50
      `;

      const [rows] = await this.db.query(postQuery, [hashtag]);
      const posts = rows.map((post) => ({
        ...post,
        tags: post.tags ? String(post.tags).split(',') : [],
      }));

      return { posts };
    } catch (err) {
      console.error("Error in searchPostsByHashtag:", err);
      throw err;
    }
  }

  async searchPosts(keyword) {
    try {
      const raw = String(keyword || '').trim();
      if (!raw) return { posts: [] };

      const likeValue = `%${raw}%`;

      const postQuery = `
        SELECT
          p.post_id,
          p.user_id,
          p.content,
          p.img_url,
          p.created_at,
          u.fullname,
          u.profile_picture,
          GROUP_CONCAT(DISTINCT h.tag) AS tags
        FROM posts p
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN hashtags h ON h.post_id = p.post_id
        WHERE p.repost_id IS NULL
          AND (
            p.content LIKE ?
            OR h.tag LIKE ?
          )
        GROUP BY p.post_id, p.user_id, p.content, p.img_url, p.created_at, u.fullname, u.profile_picture
        ORDER BY p.created_at DESC
        LIMIT 100
      `;

      const [rows] = await this.db.query(postQuery, [likeValue, likeValue]);
      const posts = rows.map((post) => ({
        ...post,
        tags: post.tags ? String(post.tags).split(',') : [],
      }));

      return { posts };
    } catch (err) {
      console.error("Error in searchPosts:", err);
      throw err;
    }
  }
}

export default SearchModel;
