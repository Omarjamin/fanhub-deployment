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
      const ctx = await resolveCommunityContext(community_type);
      this.activeCommunityId = Number(ctx?.community_id || 0) || null;
    } catch (err) {
      console.error("<error> MessageModel.ensureConnection failed:", err?.message || err);
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
      const query = `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`;
      const [result] = await this.db.query(query, [
        sender_id,
        receiver_id,
        content,
      ]);
      return result;
    } catch (err) {
      throw err;
    }
  }
  //get messages
  async getMessages(myId, userId) {
    try {
      const query = `
        SELECT m.*, u.profile_picture AS sender_profile_picture
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
      `;
      const [result] = await this.db.query(query, [myId, userId, userId, myId]);
      return result;
    } catch (err) {
      throw err;
    }
  }
  //mark as read
  async markAsRead(receiverId, senderId) {
    const sql = `
      UPDATE messages
      SET is_read = 1, read_at = NOW()
      WHERE receiver_id = ?
        AND sender_id   = ?
        AND is_read     = 0`;
    const [res] = await this.db.query(sql, [receiverId, senderId]);
    return res.affectedRows;
  }
  //get message previews
  async getMessagePreviews(userId) {
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
        CASE
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END AS other_user_id,
        MAX(message_id) AS last_message_id
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY
        CASE
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END
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
        WHERE receiver_id = ? AND is_read = 0
        GROUP BY sender_id
    ) unread_sub 
      ON unread_sub.other_id = u.user_id
    ORDER BY lm.created_at DESC;
  `;

    const [rows] = await this.db.execute(sql, [
      userId,
      userId,
      userId,
      userId,
      userId,
    ]);

    // console.log("Followed:", rows);
    return rows;
  }
  //get unread count
  async getUnreadCount(userId) {
    const sql = `
      SELECT COUNT(*) AS unread
      FROM messages
      WHERE receiver_id = ? AND is_read = 0`;
    const [rows] = await this.db.query(sql, [userId]);
    return rows[0]?.unread || 0;
  }

  //report user
  async reportUser(reporter_id, reported_user_id, reason, message_id = null) {
    try {
      const enumValues = await this.getReportReasonEnumValues();
      const dbReason = this.pickReasonAlias(reason, enumValues, 'chat');
      const hasReportCommunityId = await this.hasColumn('reports', 'community_id');
      const queryWithMessage = hasReportCommunityId
        ? `INSERT INTO reports (reporter_id, reported_user_id, report_type, reason, message_id, community_id, created_at) VALUES (?, ?, 'chat', ?, ?, ?, NOW())`
        : `INSERT INTO reports (reporter_id, reported_user_id, report_type, reason, message_id, created_at) VALUES (?, ?, 'chat', ?, ?, NOW())`;
      try {
        const paramsWithMessage = hasReportCommunityId
          ? [reporter_id, reported_user_id, dbReason, message_id, this.activeCommunityId]
          : [reporter_id, reported_user_id, dbReason, message_id];
        const [result] = await this.db.query(queryWithMessage, paramsWithMessage);
        return result;
      } catch (err) {
        // Some schemas might not include message_id column; fallback to insert without it
        if (
          err?.code === 'ER_BAD_FIELD_ERROR' &&
          (String(err.message).includes('message_id') || String(err.message).includes('community_id'))
        ) {
          const queryWithoutMessage = hasReportCommunityId
            ? `INSERT INTO reports (reporter_id, reported_user_id, report_type, reason, community_id, created_at) VALUES (?, ?, 'chat', ?, ?, NOW())`
            : `INSERT INTO reports (reporter_id, reported_user_id, report_type, reason, created_at) VALUES (?, ?, 'chat', ?, NOW())`;
          const paramsWithoutMessage = hasReportCommunityId
            ? [reporter_id, reported_user_id, dbReason, this.activeCommunityId]
            : [reporter_id, reported_user_id, dbReason];
          const [result] = await this.db.query(queryWithoutMessage, paramsWithoutMessage);
          return result;
        }
        // Fallback for older schemas without report_type column
        if (err?.code === 'ER_BAD_FIELD_ERROR' && String(err.message).includes('report_type')) {
          const queryLegacy = hasReportCommunityId
            ? `INSERT INTO reports (reporter_id, reported_user_id, reason, message_id, community_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())`
            : `INSERT INTO reports (reporter_id, reported_user_id, reason, message_id, created_at) VALUES (?, ?, ?, ?, NOW())`;
          const legacyParams = hasReportCommunityId
            ? [reporter_id, reported_user_id, dbReason, message_id, this.activeCommunityId]
            : [reporter_id, reported_user_id, dbReason, message_id];
          const [result] = await this.db.query(queryLegacy, legacyParams);
          return result;
        }
        throw err;
      }
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

      const query = `
        SELECT message_id
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY message_id DESC
        LIMIT 1
      `;
      const [rows] = await this.db.query(query, [userA, userB, userB, userA]);
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
