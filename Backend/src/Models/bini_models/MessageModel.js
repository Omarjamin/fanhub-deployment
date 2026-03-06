import { connect, resolveCommunityContext } from "../../core/database.js";

class MessageModel {
  constructor() {
    this.connect();
    this.reportReasonEnumCache = null;
    this.activeCommunityId = null;
    this.columnCache = new Map();
  }
  async connect() {
    this.db = await connect();
    if (!this.db) {
      console.error("Database connection failed");
    }
  }
  async ensureConnection(community_type) {
    try {
      this.db = await connect(community_type);
      const hasMessages = await this.hasTableOnPool(this.db, 'messages');
      const hasUsers = await this.hasTableOnPool(this.db, 'users');
      if (!hasMessages || !hasUsers) {
        console.warn(
          `[MessageModel] Falling back to default DB because messages/users table is missing for community "${community_type}"`,
        );
        this.db = await connect();
      }
      this.columnCache.clear();
      const ctx = await resolveCommunityContext(community_type);
      this.activeCommunityId = Number(ctx?.community_id || 0) || null;
      if (!this.activeCommunityId) {
        const err = new Error(`Site/community not found for "${community_type}"`);
        err.code = "SITE_SCOPE_NOT_FOUND";
        throw err;
      }
    } catch (err) {
      console.error("<error> MessageModel.ensureConnection failed:", err?.message || err);
      if (err?.code === "SITE_SCOPE_NOT_FOUND") throw err;
      this.db = await connect();
      this.columnCache.clear();
      const ctx = await resolveCommunityContext(community_type);
      this.activeCommunityId = Number(ctx?.community_id || 0) || null;
      if (!this.activeCommunityId) {
        const scopeErr = new Error(`Site/community not found for "${community_type}"`);
        scopeErr.code = "SITE_SCOPE_NOT_FOUND";
        throw scopeErr;
      }
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
        (row) => String(row?.Field || "").trim().toLowerCase() === String(columnName).trim().toLowerCase(),
      );
      this.columnCache.set(key, exists);
      return exists;
    } catch (_) {
      this.columnCache.set(key, false);
      return false;
    }
  }
  async getScopedCondition(tableName, alias = "") {
    const hasCommunityId = await this.hasColumn(tableName, "community_id");
    if (!hasCommunityId || !this.activeCommunityId) return { sql: "", params: [] };
    const col = alias ? `${alias}.community_id` : "community_id";
    return { sql: ` AND ${col} = ?`, params: [this.activeCommunityId] };
  }
  async getRequiredScopedCondition(tableName, alias = "") {
    const hasCommunityId = await this.hasColumn(tableName, "community_id");
    if (!hasCommunityId) return { sql: "", params: [] };
    if (!this.activeCommunityId) {
      const err = new Error("community scope is required");
      err.code = "SITE_SCOPE_NOT_FOUND";
      throw err;
    }
    const col = alias ? `${alias}.community_id` : "community_id";
    return { sql: ` AND ${col} = ?`, params: [this.activeCommunityId] };
  }
  async assertUserInActiveCommunity(userId) {
    const usersScoped = await this.getRequiredScopedCondition("users", "u");
    if (!usersScoped.sql) return true;
    const [rows] = await this.db.query(
      `SELECT 1 FROM users u WHERE u.user_id = ? ${usersScoped.sql} LIMIT 1`,
      [userId, ...usersScoped.params],
    );
    return Boolean(rows?.length);
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
      if (!/^enum\(/i.test(columnType)) {
        this.reportReasonEnumCache = [];
        return this.reportReasonEnumCache;
      }
      const values = [];
      const regex = /'([^']*)'/g;
      let match;
      while ((match = regex.exec(columnType)) !== null) {
        const token = String(match[1] || '').trim().toLowerCase();
        if (token) values.push(token);
      }
      this.reportReasonEnumCache = values;
      return values;
    } catch (_) {
      this.reportReasonEnumCache = [];
      return this.reportReasonEnumCache;
    }
  }

  pickReasonAlias(inputReason, enumValues = [], reportType = 'chat') {
    const normalized = String(inputReason || '').trim().toLowerCase() || 'harassment';
    if (!enumValues.length) return normalized;
    if (enumValues.includes(normalized)) return normalized;

    const aliases = {
      spam: ['sending fake links', 'misleading information', 'harassment'],
      'misleading information': ['sending fake links', 'spam', 'harassment'],
      'inappropriate content': reportType === 'chat'
        ? ['inappropriate chat', 'harassment']
        : ['inappropriate picture', 'malicious photo', 'harassment'],
      harassment: ['harassment'],
      other: ['harassment', 'sending fake links'],
    };

    const candidates = aliases[normalized] || [normalized];
    for (const candidate of candidates) {
      if (enumValues.includes(candidate)) return candidate;
    }
    return enumValues[0] || normalized;
  }
  //send message
  async sendMessage(sender_id, receiver_id, content) {
    try {
      const messagesHasCommunity = await this.hasColumn("messages", "community_id");
      if (messagesHasCommunity && !this.activeCommunityId) {
        const err = new Error("community scope is required");
        err.code = "SITE_SCOPE_NOT_FOUND";
        throw err;
      }

      if (!(await this.assertUserInActiveCommunity(sender_id)) || !(await this.assertUserInActiveCommunity(receiver_id))) {
        const err = new Error("Users must belong to the same community");
        err.code = "CROSS_COMMUNITY_NOT_ALLOWED";
        throw err;
      }

      const query = messagesHasCommunity
        ? `INSERT INTO messages (sender_id, receiver_id, content, community_id) VALUES (?, ?, ?, ?)`
        : `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`;
      const params = messagesHasCommunity
        ? [sender_id, receiver_id, content, this.activeCommunityId]
        : [sender_id, receiver_id, content];
      const [result] = await this.db.query(query, params);
      return result;
    } catch (err) {
      throw err;
    }
  }
  //get messages
  async getMessages(myId, userId) {
    try {
      const scoped = await this.getRequiredScopedCondition("messages", "m");
      const query = `
        SELECT m.*, u.profile_picture AS sender_profile_picture
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
        ${scoped.sql}
        ORDER BY m.created_at ASC
      `;
      const [result] = await this.db.query(query, [myId, userId, userId, myId, ...scoped.params]);
      return result;
    } catch (err) {
      throw err;
    }
  }
  //mark as read
  async markAsRead(receiverId, senderId) {
    const scoped = await this.getRequiredScopedCondition("messages");
    const sql = `
      UPDATE messages
      SET is_read = 1, read_at = NOW()
      WHERE receiver_id = ?
        AND sender_id   = ?
        AND is_read     = 0
        ${scoped.sql}`;
    const [res] = await this.db.query(sql, [receiverId, senderId, ...scoped.params]);
    return res.affectedRows;
  }
  //get message previews
  async getMessagePreviews(userId) {
    const scoped = await this.getRequiredScopedCondition("messages");
    const scopedSql = scoped.sql;
    const scopedParams = scoped.params;
    const sql = `
    SELECT
      u.user_id,
      u.fullname,
      u.email,
      u.profile_picture,
      lm.content AS last_message,
      lm.sender_id,
      lm.receiver_id,
      lm.created_at,
      COALESCE(unread_sub.unread_count, 0) AS unread_count
    FROM (
      SELECT
        merged.other_user_id,
        MAX(merged.last_message_id) AS last_message_id
      FROM (
        SELECT
          receiver_id AS other_user_id,
          MAX(message_id) AS last_message_id
        FROM messages
        WHERE sender_id = ?${scopedSql}
        GROUP BY receiver_id

        UNION ALL

        SELECT
          sender_id AS other_user_id,
          MAX(message_id) AS last_message_id
        FROM messages
        WHERE receiver_id = ?${scopedSql}
        GROUP BY sender_id
      ) merged
      GROUP BY merged.other_user_id
    ) conv
    JOIN users u
      ON u.user_id = conv.other_user_id
    LEFT JOIN messages lm
      ON lm.message_id = conv.last_message_id
    LEFT JOIN (
        SELECT
          sender_id AS other_id,
          COUNT(*) AS unread_count
        FROM messages
        WHERE receiver_id = ? AND is_read = 0${scopedSql}
        GROUP BY sender_id
    ) unread_sub 
      ON unread_sub.other_id = u.user_id
    ORDER BY lm.created_at DESC;
  `;

    const [rows] = await this.db.execute(sql, [
      userId,
      ...scopedParams,
      userId,
      ...scopedParams,
      userId,
      ...scopedParams,
    ]);

    // console.log("Followed:", rows);
    return rows;
  }
  //get unread count
  async getUnreadCount(userId) {
    const scoped = await this.getRequiredScopedCondition("messages");
    const sql = `
      SELECT COUNT(*) AS unread
      FROM messages
      WHERE receiver_id = ? AND is_read = 0${scoped.sql}`;
    const [rows] = await this.db.query(sql, [userId, ...scoped.params]);
    return rows[0]?.unread || 0;
  }

  //report user
  async reportUser(reporter_id, reported_user_id, category, message_id = null, details = {}) {
    try {
      const enumValues = await this.getReportReasonEnumValues();
      const dbReason = this.pickReasonAlias(category, enumValues, 'chat');
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

      const normalizedReason = String(details?.reason || '').trim();
      const normalizedImageUrl = String(details?.image_url || details?.proof_url || '').trim() || null;
      const metadataJson = JSON.stringify({
        category: String(category || '').trim().toLowerCase(),
        reason: normalizedReason,
        image_url: normalizedImageUrl,
        submitted_at: new Date().toISOString(),
      });
      const metadataText = `REPORT_META:${metadataJson}`;

      const columns = ['reporter_id', 'reported_user_id', 'reason'];
      const values = [reporter_id, reported_user_id, dbReason];

      if (hasReportType) {
        columns.push('report_type');
        values.push('chat');
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
        values.push(String(category || '').trim().toLowerCase());
      }
      if (hasReportCategoryColumn) {
        columns.push('report_category');
        values.push(String(category || '').trim().toLowerCase());
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
    } catch (err) {
      throw err;
    }
  }

  async getLatestConversationMessageId(userA, userB) {
    try {
      const [colRows] = await this.db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'messages'`,
      );
      const cols = new Set((colRows || []).map((r) => String(r?.COLUMN_NAME || '').trim().toLowerCase()));
      if (!cols.has('message_id')) return null;

      const scoped = await this.getRequiredScopedCondition("messages");
      const query = `
        SELECT message_id
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ${scoped.sql}
        ORDER BY message_id DESC
        LIMIT 1
      `;
      const [rows] = await this.db.query(query, [userA, userB, userB, userA, ...scoped.params]);
      const messageId = Number(rows?.[0]?.message_id || 0);
      return Number.isFinite(messageId) && messageId > 0 ? messageId : null;
    } catch (_) {
      return null;
    }
  }

  //get user report count
  async getUserReportCount(userId) {
    try {
      const [colRows] = await this.db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'reports'`,
      );
      const cols = new Set((colRows || []).map((r) => String(r?.COLUMN_NAME || '').trim().toLowerCase()));
      const hasMessageId = cols.has('message_id');
      const whereMessage = hasMessageId ? 'AND message_id IS NOT NULL' : '';
      const reportScoped = await this.getScopedCondition('reports');
      const query = `
        SELECT COUNT(DISTINCT reporter_id) as unique_reporters
        FROM reports
        WHERE reported_user_id = ? ${whereMessage} ${reportScoped.sql}
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;
      const [result] = await this.db.query(query, [userId, ...reportScoped.params]);
      return result[0]?.unique_reporters || 0;
    } catch (err) {
      throw err;
    }
  }

  //get user reports for admin
  async getUserReports(userId) {
    try {
      const reportScoped = await this.getScopedCondition('reports', 'ur');
      const query = `
        SELECT 
          ur.*,
          reporter.fullname as reporter_name,
          reporter.email as reporter_email,
          reported.fullname as reported_user_name,
          reported.email as reported_user_email,
          m.content as message_content
        FROM reports ur
        JOIN users reporter ON ur.reporter_id = reporter.user_id
        JOIN users reported ON ur.reported_user_id = reported.user_id
        LEFT JOIN messages m ON ur.message_id = m.message_id
        WHERE ur.reported_user_id = ? AND ur.message_id IS NOT NULL${reportScoped.sql}
        ORDER BY ur.created_at DESC
      `;
      const [result] = await this.db.query(query, [userId, ...reportScoped.params]);
      return result;
    } catch (err) {
      throw err;
    }
  }

  //get all reported users for admin
  async getAllReportedUsers() {
    try {
      const reportScoped = await this.getScopedCondition('reports', 'ur');
      const query = `
        SELECT 
          u.user_id,
          u.fullname,
          u.email,
          u.profile_picture,
          COUNT(DISTINCT ur.reporter_id) as unique_reporters,
          COUNT(ur.report_id) as total_reports,
          MAX(ur.created_at) as latest_report,
          GROUP_CONCAT(DISTINCT ur.reason) as reasons,
          SUBSTRING_INDEX(GROUP_CONCAT(ur.status ORDER BY ur.created_at DESC), ',', 1) as latest_status
        FROM users u
        JOIN reports ur ON u.user_id = ur.reported_user_id
        WHERE (ur.message_id IS NOT NULL OR ur.report_type = 'chat')
        ${reportScoped.sql}
        GROUP BY u.user_id, u.fullname, u.email, u.profile_picture
        HAVING unique_reporters >= 3
        ORDER BY unique_reporters DESC, latest_report DESC
      `;
      const [result] = await this.db.query(query, [...reportScoped.params]);
      return result;
    } catch (err) {
      throw err;
    }
  }
}

export default MessageModel;
