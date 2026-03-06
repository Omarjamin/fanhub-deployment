import { connect, resolveCommunityContext } from '../../core/database.js';

class SearchModel {
  constructor() {
    this.activeCommunityId = null;
    this.activeCommunityType = '';
    this.columnCache = new Map();
    this.connect();
  }
  async connect() {
    this.db = await connect();
  }
  async ensureConnection(community_type = '') {
    this.activeCommunityType = String(community_type || '').trim().toLowerCase();
    try {
      this.db = await connect(community_type);
      const ctx = await resolveCommunityContext(community_type);
      this.activeCommunityId = Number(ctx?.community_id || 0) || null;
    } catch (err) {
      console.error('<error> SearchModel.ensureConnection failed:', err?.message || err);
      this.db = await connect();
      this.activeCommunityId = null;
    }
    return this.db;
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
  // search users by keyword in fullname or username
  async searchUser(keyword) {
    try {
      const hasUsername = await this.hasColumn('users', 'username');
      const scoped = await this.getScopedCondition('users');
      if (this.activeCommunityType && !this.activeCommunityId && (await this.hasColumn('users', 'community_id'))) {
        return { users: [] };
      }

      const selectUsername = hasUsername ? 'username' : 'NULL AS username';
      const whereMatch = hasUsername
        ? '(fullname LIKE ? OR username LIKE ?)'
        : '(fullname LIKE ?)';

      // Search users only (limit 5)
      const userQuery = `
        SELECT user_id, fullname, ${selectUsername}, profile_picture
        FROM users
        WHERE ${whereMatch}
        ${scoped.sql}
        ORDER BY fullname
        LIMIT 5
      `;
      const baseParams = hasUsername
        ? [`%${keyword}%`, `%${keyword}%`]
        : [`%${keyword}%`];
      const userParams = [...baseParams, ...scoped.params];
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
      const postScoped = await this.getScopedCondition('posts', 'p');
      const hashtagScoped = await this.getScopedCondition('hashtags', 'h');
      const hashtagListScoped = await this.getScopedCondition('hashtags', 'h2');
      const userScoped = await this.getScopedCondition('users', 'u');
      if (this.activeCommunityType && !this.activeCommunityId && (await this.hasColumn('posts', 'community_id'))) {
        return { posts: [] };
      }

      const postQuery = `
        SELECT
          p.post_id,
          p.user_id,
          p.content,
          p.img_url,
          p.created_at,
          u.fullname,
          u.profile_picture,
          GROUP_CONCAT(DISTINCT h2.tag) AS tags
        FROM hashtags h
        JOIN posts p ON p.post_id = h.post_id
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN hashtags h2 ON h2.post_id = p.post_id${hashtagListScoped.sql}
        WHERE LOWER(h.tag) = LOWER(?)
        ${postScoped.sql}
        ${hashtagScoped.sql}
        ${userScoped.sql}
        GROUP BY p.post_id, p.user_id, p.content, p.img_url, p.created_at, u.fullname, u.profile_picture
        ORDER BY p.created_at DESC
        LIMIT 50
      `;

      const [rows] = await this.db.query(postQuery, [
        hashtag,
        ...hashtagListScoped.params,
        ...postScoped.params,
        ...hashtagScoped.params,
        ...userScoped.params,
      ]);
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
      const postScoped = await this.getScopedCondition('posts', 'p');
      const hashtagScoped = await this.getScopedCondition('hashtags', 'h');
      const userScoped = await this.getScopedCondition('users', 'u');
      if (this.activeCommunityType && !this.activeCommunityId && (await this.hasColumn('posts', 'community_id'))) {
        return { posts: [] };
      }

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
        LEFT JOIN hashtags h ON h.post_id = p.post_id${hashtagScoped.sql}
        WHERE p.repost_id IS NULL
          AND (
            p.content LIKE ?
            OR h.tag LIKE ?
          )
          ${postScoped.sql}
          ${userScoped.sql}
        GROUP BY p.post_id, p.user_id, p.content, p.img_url, p.created_at, u.fullname, u.profile_picture
        ORDER BY p.created_at DESC
        LIMIT 100
      `;

      const [rows] = await this.db.query(postQuery, [
        ...hashtagScoped.params,
        likeValue,
        likeValue,
        ...postScoped.params,
        ...userScoped.params,
      ]);
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
