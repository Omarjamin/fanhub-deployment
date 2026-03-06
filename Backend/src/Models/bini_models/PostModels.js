import { connect, resolveCommunityContext } from '../../core/database.js';
import { moderateContent } from '../../core/moderation.js';
//s
class PostModel {
  constructor() {
    this.activeCommunityId = null;
    this.columnCache = new Map();
    this.reportReasonEnumCache = null;
    this.connect();
  }
  async connect() {
    this.db = await connect();
  }
  async ensureConnection(community_type) {
    try {
      this.db = await connect(community_type);
      const hasPosts = await this.hasTableOnPool(this.db, 'posts');
      const hasUsers = await this.hasTableOnPool(this.db, 'users');
      if (!hasPosts || !hasUsers) {
        console.warn(
          `[PostModel] Falling back to default DB because required tables are missing for community "${community_type}"`,
        );
        this.db = await connect();
      }
      this.columnCache.clear();
      const ctx = await resolveCommunityContext(community_type);
      this.activeCommunityId = Number(ctx?.community_id || 0) || null;
    } catch (err) {
      console.error('<error> PostModel.ensureConnection failed:', err?.message || err);
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
      const exists = (rows || []).some((row) => String(row?.Field || '').trim().toLowerCase() === String(columnName).trim().toLowerCase());
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
  isSingleDatabaseMode() {
    const explicitSingle = String(
      process.env.SINGLE_DB_MODE ||
      process.env.DB_SINGLE_MODE ||
      process.env.FORCE_SINGLE_DB ||
      '',
    ).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(explicitSingle)) return true;

    const appDb = String(process.env.DB_NAME || '').trim().toLowerCase();
    const adminDb = String(process.env.DB_NAME_ADMIN || '').trim().toLowerCase();
    return Boolean(appDb && adminDb && appDb === adminDb);
  }
  async getReportReasonEnumValues() {
    if (Array.isArray(this.reportReasonEnumCache)) return this.reportReasonEnumCache;
    try {
      const [rows] = await this.db.query(
        `SELECT COLUMN_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'reports'
           AND COLUMN_NAME = 'reason'
         LIMIT 1`,
      );
      const columnType = String(rows?.[0]?.COLUMN_TYPE || '').trim();
      const matches = [...columnType.matchAll(/'([^']+)'/g)];
      const values = matches
        .map((match) => String(match?.[1] || '').trim().toLowerCase())
        .filter(Boolean);
      this.reportReasonEnumCache = values;
      return values;
    } catch (_) {
      this.reportReasonEnumCache = [];
      return this.reportReasonEnumCache;
    }
  }
  pickReasonAlias(inputReason, enumValues = [], reportType = 'post') {
    const normalized = String(inputReason || '').trim().toLowerCase() || 'spam';
    if (!Array.isArray(enumValues) || enumValues.length === 0) return normalized;
    if (enumValues.includes(normalized)) return normalized;

    const aliases = {
      spam: ['sending fake links', 'harassment'],
      harassment: ['harassment', 'bullying', 'abuse'],
      'misleading information': ['sending fake links', 'harassment'],
      'inappropriate content': reportType === 'chat'
        ? ['inappropriate chat', 'inappropriate picture', 'harassment']
        : ['malicious photo', 'inappropriate picture', 'harassment'],
      other: ['harassment', 'sending fake links'],
    };

    const candidates = aliases[normalized] || [normalized];
    const match = candidates.find((candidate) => enumValues.includes(candidate));
    return match || enumValues[0] || normalized;
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

        // Prevent cross-community leakage when resolver falls back to default DB
        // in multi-DB mode only. In single-DB mode, scoping is done by community_id.
        if (!this.isSingleDatabaseMode() && requestedCommunity && defaultDb && currentDb === defaultDb && requestedCommunity !== 'bini') {
          console.warn(
            `[PostModel] Community DB fallback detected (requested=${requestedCommunity}, db=${currentDb}). Returning empty feed to prevent data leak.`
          );
          return [];
        }
      }
      const hasPostCommunityId = await this.hasColumn('posts', 'community_id');
      const scoped = hasPostCommunityId && this.activeCommunityId;
      const hashtagScoped = await this.getScopedCondition('hashtags', 'h');
      const userScoped = await this.getScopedCondition('users', 'u');
      if (community_type && hasPostCommunityId && !scoped) {
        console.warn(
          `[PostModel] Missing community_id context for "${community_type}". Returning empty feed to avoid cross-community posts.`,
        );
        return [];
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
        LEFT JOIN hashtags h ON p.post_id = h.post_id${hashtagScoped.sql}
        LEFT JOIN users u ON p.user_id = u.user_id${userScoped.sql}
        WHERE p.repost_id IS NULL
        ${scoped ? 'AND p.community_id = ?' : ''}
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const params = [
        ...hashtagScoped.params,
        ...userScoped.params,
        ...(scoped ? [this.activeCommunityId] : []),
        limit,
        offset,
      ];
      const [rows] = await db.query(query, params);

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
  async createPost(user_id, content, img_url, tags = [], community_type = '') {
    console.log('=== CREATEPOST CALLED ===');
    console.log('Content:', content);
    console.log('User ID:', user_id);
    try {
      // Moderate content before creating post
      const moderation = await moderateContent(content);
      if (moderation?.blocked || moderation?.flagged || moderation?.risk === 'high' || moderation?.risk === 'medium') {
        const moderationError = new Error(moderation?.warning || 'Suspicious words detected. Please revise your post.');
        moderationError.code = 'CONTENT_MODERATION_BLOCKED';
        moderationError.statusCode = 400;
        moderationError.moderation = moderation;
        throw moderationError;
      }

      await this.ensureConnection(community_type);
      const hasPostCommunityId = await this.hasColumn('posts', 'community_id');
      if (hasPostCommunityId && !this.activeCommunityId) {
        const err = new Error('community scope is required');
        err.code = 'SITE_SCOPE_NOT_FOUND';
        throw err;
      }
      const query = hasPostCommunityId
        ? `INSERT INTO posts (user_id, content, img_url, community_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
        : `INSERT INTO posts (user_id, content, img_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`;
      const params = hasPostCommunityId
        ? [user_id, content, img_url, this.activeCommunityId, new Date(), new Date()]
        : [user_id, content, img_url, new Date(), new Date()];
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

    const hasHashtagCommunityId = await this.hasColumn('hashtags', 'community_id');
    if (hasHashtagCommunityId && !this.activeCommunityId) {
      const err = new Error('community scope is required for hashtags');
      err.code = 'SITE_SCOPE_NOT_FOUND';
      throw err;
    }

    const placeholders = hasHashtagCommunityId
      ? tags.map(() => `(?, ?, ?)`).join(', ')
      : tags.map(() => `(?, ?)`).join(', ');
    const params = hasHashtagCommunityId
      ? tags.flatMap((tag) => [postId, tag, this.activeCommunityId])
      : tags.flatMap((tag) => [postId, tag]);

    const query = hasHashtagCommunityId
      ? `INSERT INTO hashtags (post_id, tag, community_id) VALUES ${placeholders}`
      : `INSERT INTO hashtags (post_id, tag) VALUES ${placeholders}`;

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
      const hasPostCommunityId = await this.hasColumn('posts', 'community_id');
      const scoped = hasPostCommunityId && this.activeCommunityId;
      const query = `
        SELECT p.*, u.fullname, u.profile_picture
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE p.post_id = ?
        ${scoped ? 'AND p.community_id = ?' : ''}
      `;
      const params = scoped ? [postId, this.activeCommunityId] : [postId];
      const [post] = await this.db.query(query, params);
      return post[0];
    } catch (err) {
      throw err;
    }
  }
  // Report a post
  async reportPost(reporter_id, reported_user_id, post_id, category, message_id = null, details = {}) {
    const enumValues = await this.getReportReasonEnumValues();
    const dbReason = this.pickReasonAlias(category, enumValues, 'post');
    const hasReportCommunityId = await this.hasColumn('reports', 'community_id');
    const hasReportType = await this.hasColumn('reports', 'report_type');
    const hasMessageId = await this.hasColumn('reports', 'message_id');
    const hasCategoryColumn = await this.hasColumn('reports', 'category');
    const hasReportCategoryColumn = await this.hasColumn('reports', 'report_category');
    const hasDetailsColumn = await this.hasColumn('reports', 'details');
    const hasDescriptionColumn = await this.hasColumn('reports', 'description');
    const hasReportReasonColumn = await this.hasColumn('reports', 'report_reason');
    const hasImageUrlColumn = await this.hasColumn('reports', 'image_url');
    const hasProofUrlColumn = await this.hasColumn('reports', 'proof_url');
    const hasEvidenceUrlColumn = await this.hasColumn('reports', 'evidence_url');
    const hasProofImageUrlColumn = await this.hasColumn('reports', 'proof_image_url');
    const hasAdminNotesColumn = await this.hasColumn('reports', 'admin_notes');

    const normalizedCategory = String(category || '').trim().toLowerCase();
    const normalizedReason = String(details?.reason || '').trim();
    const normalizedImageUrl = String(details?.image_url || details?.proof_url || '').trim() || null;
    const metadataJson = JSON.stringify({
      category: normalizedCategory,
      reason: normalizedReason,
      image_url: normalizedImageUrl,
      submitted_at: new Date().toISOString(),
    });
    const metadataText = `REPORT_META:${metadataJson}`;

    const columns = ['reporter_id', 'reported_user_id', 'post_id', 'reason'];
    const values = [reporter_id, reported_user_id, post_id, dbReason];

    if (hasReportType) {
      columns.push('report_type');
      values.push('post');
    }
    if (hasMessageId) {
      columns.push('message_id');
      values.push(message_id);
    }
    if (hasReportCommunityId) {
      columns.push('community_id');
      values.push(this.activeCommunityId);
    }
    if (hasCategoryColumn) {
      columns.push('category');
      values.push(normalizedCategory);
    }
    if (hasReportCategoryColumn) {
      columns.push('report_category');
      values.push(normalizedCategory);
    }
    if (hasDetailsColumn) {
      columns.push('details');
      values.push(normalizedReason);
    }
    if (hasDescriptionColumn) {
      columns.push('description');
      values.push(normalizedReason);
    }
    if (hasReportReasonColumn) {
      columns.push('report_reason');
      values.push(normalizedReason);
    }
    if (hasImageUrlColumn) {
      columns.push('image_url');
      values.push(normalizedImageUrl);
    }
    if (hasProofUrlColumn) {
      columns.push('proof_url');
      values.push(normalizedImageUrl);
    }
    if (hasEvidenceUrlColumn) {
      columns.push('evidence_url');
      values.push(normalizedImageUrl);
    }
    if (hasProofImageUrlColumn) {
      columns.push('proof_image_url');
      values.push(normalizedImageUrl);
    }
    if (hasAdminNotesColumn) {
      columns.push('admin_notes');
      values.push(metadataText);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const query = `
      INSERT INTO reports (${columns.join(', ')}, created_at)
      VALUES (${placeholders}, NOW())
    `;
    const [result] = await this.db.query(query, values);
    return result;
  }

  // Count distinct reporters for a reported user in the last 30 days
  async getPostReportCount(reported_user_id) {
    const reportScoped = await this.getScopedCondition('reports');
    const postScoped = await this.getScopedCondition('posts', 'p');

    if (reportScoped.sql) {
      const query = `
        SELECT COUNT(DISTINCT reporter_id) as unique_reporters
        FROM reports
        WHERE reported_user_id = ?
          ${reportScoped.sql}
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;
      const [rows] = await this.db.query(query, [reported_user_id, ...reportScoped.params]);
      return rows[0]?.unique_reporters || 0;
    }

    if (postScoped.sql) {
      const query = `
        SELECT COUNT(DISTINCT pr.reporter_id) as unique_reporters
        FROM reports pr
        JOIN posts p ON p.post_id = pr.post_id
        WHERE pr.reported_user_id = ?
          ${postScoped.sql}
          AND pr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;
      const [rows] = await this.db.query(query, [reported_user_id, ...postScoped.params]);
      return rows[0]?.unique_reporters || 0;
    }

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
    const reportScoped = await this.getScopedCondition('reports', 'pr');
    const postScoped = await this.getScopedCondition('posts', 'p');
    const scopedSql = `${reportScoped.sql}${postScoped.sql}`;
    const scopedParams = [...reportScoped.params, ...postScoped.params];
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
      ${scopedSql}
      GROUP BY p.post_id, u.user_id, u.fullname, u.email, u.profile_picture
      HAVING unique_reporters >= 3
      ORDER BY unique_reporters DESC, latest_report DESC
    `;
    const [rows] = await this.db.query(query, scopedParams);
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
    const reportScoped = await this.getScopedCondition('reports', 'pr');
    const postScoped = await this.getScopedCondition('posts', 'p');
    const query = `
      SELECT pr.*, r.fullname as reporter_name, r.email as reporter_email, p.content as post_content, p.img_url
      FROM reports pr
      JOIN users r ON pr.reporter_id = r.user_id
      LEFT JOIN posts p ON pr.post_id = p.post_id
      WHERE pr.post_id = ?${reportScoped.sql}${postScoped.sql}
      ORDER BY pr.created_at DESC
    `;
    const [rows] = await this.db.query(query, [postId, ...reportScoped.params, ...postScoped.params]);
    return rows;
  }
  // Update Post
  async updatePost(postId, userId, content, img_url) {
    try {
      const postScoped = await this.getScopedCondition('posts');
      const query = `
        UPDATE posts 
        SET content = ?, img_url = ?, updated_at = ? 
        WHERE post_id = ? AND user_id = ?${postScoped.sql}
      `;
      const params = [content, img_url, new Date(), postId, userId, ...postScoped.params];
      const [result] = await this.db.query(query, params);
      return result.affectedRows;
    } catch (err) {
      throw err;
    }
  }
  // Delete Post
  async deletePost(postId, userId) {
    try {
      const postScoped = await this.getScopedCondition('posts');
      const [ownedRows] = await this.db.query(
        `SELECT post_id FROM posts WHERE post_id = ? AND user_id = ?${postScoped.sql} LIMIT 1`,
        [postId, userId, ...postScoped.params],
      );
      if (!ownedRows?.length) {
        return 0;
      }

      const scopedDeletes = [
        { table: 'comments', column: 'post_id' },
        { table: 'likes', column: 'post_id' },
        { table: 'hashtags', column: 'post_id' },
        { table: 'reports', column: 'post_id' },
        { table: 'notifications', column: 'post_id' },
      ];

      for (const entry of scopedDeletes) {
        const hasTableColumn = await this.hasColumn(entry.table, entry.column);
        if (!hasTableColumn) continue;
        const scoped = await this.getScopedCondition(entry.table);
        await this.db.query(
          `DELETE FROM ${entry.table} WHERE ${entry.column} = ?${scoped.sql}`,
          [postId, ...scoped.params],
        );
      }

      const hasRepostIdColumn = await this.hasColumn('posts', 'repost_id');
      if (hasRepostIdColumn) {
        await this.db.query(
          `UPDATE posts SET repost_id = NULL WHERE repost_id = ?${postScoped.sql}`,
          [postId, ...postScoped.params],
        );
      }

      const query = `
        DELETE FROM posts 
        WHERE post_id = ? AND user_id = ?${postScoped.sql}
      `;
      const [result] = await this.db.query(query, [postId, userId, ...postScoped.params]);
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
      const hasPostCommunityId = await this.hasColumn('posts', 'community_id');
      if (hasPostCommunityId && !this.activeCommunityId) {
        const err = new Error('community scope is required');
        err.code = 'SITE_SCOPE_NOT_FOUND';
        throw err;
      }
      const query = hasPostCommunityId
        ? `INSERT INTO posts (user_id, content, img_url, repost_id, community_id) VALUES (?, ?, ?, ?, ?)`
        : `INSERT INTO posts (user_id, content, img_url, repost_id) VALUES (?, ?, ?, ?)`;
      const params = hasPostCommunityId
        ? [userId, contentToRepost, post.img_url || null, postId, this.activeCommunityId]
        : [userId, contentToRepost, post.img_url || null, postId];
      await this.db.query(query, params);

      const originalPostOwnerId = post.user_id;
      await this.createNotificationForRepost(originalPostOwnerId, userId, postId);
    } catch (err) {
      throw err;
    }
  }
  //
  //  Notification for Repost
  async createNotificationForRepost(originalPostOwnerId, sourceUserId, postId) {
    const hasNotifCommunity = await this.hasColumn('notifications', 'community_id');
    const query = hasNotifCommunity
      ? `
      INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, community_id, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `
      : `
      INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = hasNotifCommunity
      ? [originalPostOwnerId, 'repost', sourceUserId, postId, this.activeCommunityId, new Date()]
      : [originalPostOwnerId, 'repost', sourceUserId, postId, new Date()];
    await this.db.query(query, params);
  }
  // Get Other User Posts
  async getOtherUserPosts(userId) {
    try {
      const hasPostCommunityId = await this.hasColumn('posts', 'community_id');
      const scoped = hasPostCommunityId && this.activeCommunityId;
      const hashtagScoped = await this.getScopedCondition('hashtags', 'h');
      const userScoped = await this.getScopedCondition('users', 'u');
      const query = `
        SELECT p.post_id, p.user_id, p.content, p.img_url, p.created_at, p.updated_at, 
               GROUP_CONCAT(h.tag) AS tags,
               u.profile_picture, u.fullname 
        FROM posts p
        LEFT JOIN hashtags h ON p.post_id = h.post_id${hashtagScoped.sql}
        LEFT JOIN users u ON p.user_id = u.user_id${userScoped.sql} 
        WHERE p.user_id = ? AND repost_id IS NULL
        ${scoped ? 'AND p.community_id = ?' : ''}
        GROUP BY p.post_id
      `;
      const params = [
        ...hashtagScoped.params,
        ...userScoped.params,
        userId,
        ...(scoped ? [this.activeCommunityId] : []),
      ];
      const [rows] = await this.db.query(query, params);

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
      const hasPostCommunityId = await this.hasColumn('posts', 'community_id');
      const scoped = hasPostCommunityId && this.activeCommunityId;
      const hashtagScoped = await this.getScopedCondition('hashtags', 'h');
      const userScoped = await this.getScopedCondition('users', 'u');
      const query = `
        SELECT p.post_id, p.user_id, p.content, p.img_url, p.created_at, p.updated_at, 
               GROUP_CONCAT(h.tag) AS tags,
               u.profile_picture, u.fullname 
        FROM posts p
        LEFT JOIN hashtags h ON p.post_id = h.post_id${hashtagScoped.sql}
        LEFT JOIN users u ON p.user_id = u.user_id${userScoped.sql} 
        WHERE p.user_id = ? AND repost_id IS NULL
        ${scoped ? 'AND p.community_id = ?' : ''}
        GROUP BY p.post_id
      `;
      const params = [
        ...hashtagScoped.params,
        ...userScoped.params,
        userId,
        ...(scoped ? [this.activeCommunityId] : []),
      ];
      const [rows] = await this.db.query(query, params);

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
