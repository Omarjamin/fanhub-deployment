import { connect } from '../../core/database.js';
import { getSiteCommunityTypeMap } from './site-model.js';

class ReportModel {
  constructor() {
    this.connect();
    this.tableColumnsCache = new Map();
  }

  async connect() {
    this.db = await connect();
  }

  async getSiteDbContexts() {
    const rows = await getSiteCommunityTypeMap();
    const seen = new Set();
    const contexts = [];
    for (const row of rows || []) {
      const dbName = String(row?.db_name || '').trim();
      if (!dbName || seen.has(dbName)) continue;
      seen.add(dbName);
      contexts.push({
        db_name: dbName,
        site_name: row?.site_name || dbName,
        domain: row?.domain || '',
      });
    }
    return contexts;
  }

  async getTableColumns(db, tableName) {
    const [dbRows] = await db.query('SELECT DATABASE() AS current_db');
    const currentDb = String(dbRows?.[0]?.current_db || '').trim().toLowerCase();
    const cacheKey = `${currentDb}:${String(tableName || '').trim().toLowerCase()}`;
    if (this.tableColumnsCache.has(cacheKey)) return this.tableColumnsCache.get(cacheKey);

    const [rows] = await db.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      [tableName],
    );
    const set = new Set((rows || []).map((r) => String(r?.COLUMN_NAME || '').trim().toLowerCase()).filter(Boolean));
    this.tableColumnsCache.set(cacheKey, set);
    return set;
  }

  /**
   * Get available report types
   * @returns {Promise<Array>} List of report types
   */
  async getReportTypes() {
    try {
      const query = `
        SELECT id, name, description, 
               parameters, created_at, updated_at
        FROM report_types
        WHERE is_active = 1
        ORDER BY name
      `;
      
      const [reportTypes] = await this.db.query(query);
      return reportTypes || [];
      
    } catch (error) {
      console.error('Error in getReportTypes:', error);
      throw new Error(`Failed to fetch report types: ${error.message}`);
    }
  }

  /**
   * Generate a new report
   * @param {Object} reportData - Report generation parameters
   * @param {number} userId - ID of the user generating the report
   * @returns {Promise<Object>} Generated report details
   */
  async generateReport(reportData, userId) {
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();

      const { 
        report_type_id, 
        parameters = {},
        report_name,
        format = 'json'
      } = reportData;

      // Validate required fields
      if (!report_type_id) {
        throw new Error('Report type ID is required');
      }

      // Get report type details
      const [reportType] = await connection.query(
        'SELECT id, name, query_template FROM report_types WHERE id = ? AND is_active = 1',
        [report_type_id]
      );

      if (!reportType || reportType.length === 0) {
        throw new Error('Invalid report type or report type not found');
      }

      // In a real application, you would:
      // 1. Parse the query template with the provided parameters
      // 2. Execute the dynamic query
      // 3. Store the report results
      // 4. Generate the report in the requested format

      // For this example, we'll simulate report generation
      const reportId = Date.now();
      const reportName = report_name || `${reportType[0].name}_${new Date().toISOString().split('T')[0]}`;
      
      // Simulate report data (replace with actual query execution)
      const reportResults = await this.simulateReportGeneration(reportType[0].id, parameters);

      // Store report metadata
      const [result] = await connection.query(
        `INSERT INTO reports 
         (report_type_id, user_id, name, parameters, status, 
          format, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'completed', ?, NOW(), NOW())`,
        [
          report_type_id,
          userId,
          reportName,
          JSON.stringify(parameters),
          format
        ]
      );

      if (!result.insertId) {
        throw new Error('Failed to save report');
      }

      // Store report data (in a real app, this might be in a separate table or file storage)
      await connection.query(
        'UPDATE reports SET data = ? WHERE id = ?',
        [JSON.stringify(reportResults), result.insertId]
      );

      const [report] = await connection.query(
        'SELECT * FROM reports WHERE id = ?',
        [result.insertId]
      );

      await connection.commit();
      return report[0];
      
    } catch (error) {
      await connection.rollback();
      console.error('Error in generateReport:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get report by ID
   * @param {number} reportId - ID of the report
   * @param {number} userId - ID of the user requesting the report
   * @returns {Promise<Object>} Report details
   */
  async getReportById(reportId, userId) {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }

      const [report] = await this.db.query(
        `SELECT r.*, rt.name as report_type_name, 
                u.email as requested_by_email
         FROM reports r
         LEFT JOIN report_types rt ON r.report_type_id = rt.id
         LEFT JOIN users u ON r.user_id = u.user_id
         WHERE r.id = ? AND (r.user_id = ? OR ? IN (SELECT user_id FROM users WHERE role = 'admin'))`,
        [reportId, userId, userId]
      );

      if (!report || report.length === 0) {
        throw new Error('Report not found or access denied');
      }

      return report[0];
      
    } catch (error) {
      console.error(`Error in getReportById for report ${reportId}:`, error);
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  /**
   * Get list of generated reports with pagination
   * @param {Object} filters - Filter criteria
   * @param {number} userId - ID of the user
   * @returns {Promise<Object>} Paginated list of reports
   */
  async getReports(filters = {}, userId) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        report_type_id, 
        status,
        date_from,
        date_to
      } = filters;

      const offset = (page - 1) * limit;
      const params = [];
      let whereClause = 'WHERE 1=1';

      // Regular users can only see their own reports
      whereClause += ' AND (r.user_id = ? OR ? IN (SELECT user_id FROM users WHERE role = \'admin\'))';
      params.push(userId, userId);

      if (report_type_id) {
        whereClause += ' AND r.report_type_id = ?';
        params.push(report_type_id);
      }

      if (status) {
        whereClause += ' AND r.status = ?';
        params.push(status);
      }

      if (date_from) {
        whereClause += ' AND r.created_at >= ?';
        params.push(date_from);
      }

      if (date_to) {
        whereClause += ' AND r.created_at <= ?';
        params.push(date_to);
      }

      // Get total count for pagination
      const [countResult] = await this.db.query(
        `SELECT COUNT(*) as total 
         FROM reports r
         ${whereClause}`,
        params
      );

      // Get paginated results
      const [reports] = await this.db.query(
        `SELECT r.*, rt.name as report_type_name, 
                u.email as requested_by_email
         FROM reports r
         LEFT JOIN report_types rt ON r.report_type_id = rt.id
         LEFT JOIN users u ON r.user_id = u.user_id
         ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), parseInt(offset)]
      );

      return {
        data: reports || [],
        pagination: {
          total: countResult[0]?.total || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
        }
      };
      
    } catch (error) {
      console.error('Error in getReports:', error);
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }
  }

  /**
   * Get all reported posts for admin
   * @returns {Promise<Array>} List of reported posts with aggregation
   */
  async getReportedPosts() {
    try {
      const contexts = await this.getSiteDbContexts();
      const allRows = [];

      for (const ctx of contexts) {
        try {
          const db = await connect(ctx.db_name);
          const cols = await this.getTableColumns(db, 'reports');
          if (!cols.size) {
            console.log('[reports] getReportedPosts skip (no reports table)', { db: ctx.db_name });
            continue;
          }
          const hasPostId = cols.has('post_id');
          const hasReportType = cols.has('report_type');
          const hasReporterId = cols.has('reporter_id');
          const hasReportId = cols.has('report_id');
          const hasCreatedAt = cols.has('created_at');
          const hasReason = cols.has('reason');
          const hasStatus = cols.has('status');

          const filterParts = [];
          if (hasPostId) filterParts.push('pr.post_id IS NOT NULL');
          if (hasReportType) filterParts.push(`pr.report_type = 'post'`);
          const whereSql = filterParts.length ? `WHERE (${filterParts.join(' OR ')})` : '';

          const uniqueReportersExpr = hasReporterId ? 'COUNT(DISTINCT pr.reporter_id)' : 'COUNT(*)';
          const totalReportsExpr = hasReportId ? 'COUNT(pr.report_id)' : 'COUNT(*)';
          const latestReportExpr = hasCreatedAt ? 'MAX(pr.created_at)' : 'NULL';
          const reasonsExpr = hasReason ? 'GROUP_CONCAT(DISTINCT pr.reason)' : `''`;
          const latestStatusExpr = hasStatus
            ? `SUBSTRING_INDEX(GROUP_CONCAT(pr.status${hasCreatedAt ? ' ORDER BY pr.created_at DESC' : ''}), ',', 1)`
            : `'pending'`;

          const [rows] = await db.query(`
            SELECT
              u.user_id,
              u.fullname,
              u.email,
              u.profile_picture,
              p.post_id,
              p.content,
              p.img_url,
              ${uniqueReportersExpr} as unique_reporters,
              ${totalReportsExpr} as total_reports,
              ${latestReportExpr} as latest_report,
              ${reasonsExpr} as reasons,
              ${latestStatusExpr} as latest_status
            FROM reports pr
            JOIN posts p ON p.post_id = pr.post_id
            JOIN users u ON u.user_id = p.user_id
            ${whereSql}
            GROUP BY p.post_id, u.user_id, u.fullname, u.email, u.profile_picture
            HAVING unique_reporters >= 1
            ORDER BY unique_reporters DESC, latest_report DESC
          `);

          console.log('[reports] getReportedPosts', {
            db: ctx.db_name,
            rows: rows?.length || 0,
            usedFilters: filterParts,
          });

          (rows || []).forEach((row) => {
            allRows.push({
              ...row,
              db_name: ctx.db_name,
              community_name: ctx.site_name,
              site_name: ctx.site_name,
              domain: ctx.domain,
              community_type: ctx.domain || ctx.site_name,
            });
          });
        } catch (dbErr) {
          console.error(`Error in getReportedPosts for DB "${ctx.db_name}":`, dbErr);
        }
      }

      return allRows;
    } catch (error) {
      console.error('Error in getReportedPosts:', error);
      throw new Error(`Failed to fetch reported posts: ${error.message}`);
    }
  }

  /**
   * Get all reported users for admin
   * @returns {Promise<Array>} List of reported users with aggregation
   */
  async getReportedUsers() {
    try {
      const contexts = await this.getSiteDbContexts();
      const allRows = [];

      for (const ctx of contexts) {
        try {
          const db = await connect(ctx.db_name);
          const cols = await this.getTableColumns(db, 'reports');
          if (!cols.size) {
            console.log('[reports] getReportedUsers skip (no reports table)', { db: ctx.db_name });
            continue;
          }
          const hasMessageId = cols.has('message_id');
          const hasReportType = cols.has('report_type');
          const hasReporterId = cols.has('reporter_id');
          const hasReportId = cols.has('report_id');
          const hasCreatedAt = cols.has('created_at');
          const hasReason = cols.has('reason');
          const hasStatus = cols.has('status');

          const filterParts = [];
          if (hasMessageId) filterParts.push('ur.message_id IS NOT NULL');
          if (hasReportType) filterParts.push(`ur.report_type = 'chat'`);
          const whereSql = filterParts.length ? `WHERE (${filterParts.join(' OR ')})` : '';

          const uniqueReportersExpr = hasReporterId ? 'COUNT(DISTINCT ur.reporter_id)' : 'COUNT(*)';
          const totalReportsExpr = hasReportId ? 'COUNT(ur.report_id)' : 'COUNT(*)';
          const latestReportExpr = hasCreatedAt ? 'MAX(ur.created_at)' : 'NULL';
          const reasonsExpr = hasReason ? 'GROUP_CONCAT(DISTINCT ur.reason)' : `''`;
          const latestStatusExpr = hasStatus
            ? `SUBSTRING_INDEX(GROUP_CONCAT(ur.status${hasCreatedAt ? ' ORDER BY ur.created_at DESC' : ''}), ',', 1)`
            : `'pending'`;

          const [rows] = await db.query(`
            SELECT
              u.user_id,
              u.fullname,
              u.email,
              u.profile_picture,
              ${uniqueReportersExpr} as unique_reporters,
              ${totalReportsExpr} as total_reports,
              ${latestReportExpr} as latest_report,
              ${reasonsExpr} as reasons,
              ${latestStatusExpr} as latest_status
            FROM users u
            JOIN reports ur ON u.user_id = ur.reported_user_id
            ${whereSql}
            GROUP BY u.user_id, u.fullname, u.email, u.profile_picture
            HAVING unique_reporters >= 1
            ORDER BY unique_reporters DESC, latest_report DESC
          `);

          console.log('[reports] getReportedUsers', {
            db: ctx.db_name,
            rows: rows?.length || 0,
            usedFilters: filterParts,
          });

          (rows || []).forEach((row) => {
            allRows.push({
              ...row,
              db_name: ctx.db_name,
              community_name: ctx.site_name,
              site_name: ctx.site_name,
              domain: ctx.domain,
              community_type: ctx.domain || ctx.site_name,
            });
          });
        } catch (dbErr) {
          console.error(`Error in getReportedUsers for DB "${ctx.db_name}":`, dbErr);
        }
      }

      return allRows;
    } catch (error) {
      console.error('Error in getReportedUsers:', error);
      throw new Error(`Failed to fetch reported users: ${error.message}`);
    }
  }

  /**
   * Get detailed reports for a specific post
   * @param {number} postId - ID of the post
   * @returns {Promise<Array>} List of detailed reports
   */
  async getPostReports(postId) {
    try {
      const contexts = await this.getSiteDbContexts();
      const allRows = [];

      for (const ctx of contexts) {
        try {
          const db = await connect(ctx.db_name);
          const [rows] = await db.query(
            `
              SELECT
                pr.*,
                r.fullname as reporter_name,
                r.email as reporter_email,
                p.content as post_content,
                p.img_url
              FROM reports pr
              JOIN users r ON pr.reporter_id = r.user_id
              LEFT JOIN posts p ON pr.post_id = p.post_id
              WHERE pr.post_id = ?
              ORDER BY pr.created_at DESC
            `,
            [postId],
          );
          (rows || []).forEach((row) => allRows.push({ ...row, db_name: ctx.db_name, site_name: ctx.site_name, domain: ctx.domain }));
        } catch (dbErr) {
          console.error(`Error in getPostReports for DB "${ctx.db_name}":`, dbErr);
        }
      }

      return allRows;
    } catch (error) {
      console.error('Error in getPostReports:', error);
      throw new Error(`Failed to fetch post reports: ${error.message}`);
    }
  }

  /**
   * Get detailed reports for a specific user
   * @param {number} userId - ID of the user
   * @returns {Promise<Array>} List of detailed reports
   */
  async getUserReports(userId) {
    try {
      const contexts = await this.getSiteDbContexts();
      const allRows = [];

      for (const ctx of contexts) {
        try {
          const db = await connect(ctx.db_name);
          const [rows] = await db.query(
            `
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
              WHERE ur.reported_user_id = ? AND ur.message_id IS NOT NULL
              ORDER BY ur.created_at DESC
            `,
            [userId],
          );
          (rows || []).forEach((row) => allRows.push({ ...row, db_name: ctx.db_name, site_name: ctx.site_name, domain: ctx.domain }));
        } catch (dbErr) {
          console.error(`Error in getUserReports for DB "${ctx.db_name}":`, dbErr);
        }
      }

      return allRows;
    } catch (error) {
      console.error('Error in getUserReports:', error);
      throw new Error(`Failed to fetch user reports: ${error.message}`);
    }
  }

  async findDbContextByUserId(userId) {
    const contexts = await this.getSiteDbContexts();
    for (const ctx of contexts) {
      try {
        const db = await connect(ctx.db_name);
        const [rows] = await db.query('SELECT user_id FROM users WHERE user_id = ? LIMIT 1', [userId]);
        if (Array.isArray(rows) && rows.length > 0) return ctx;
      } catch (_) {}
    }
    return null;
  }

  async findDbContextByPostId(postId) {
    const contexts = await this.getSiteDbContexts();
    for (const ctx of contexts) {
      try {
        const db = await connect(ctx.db_name);
        const [rows] = await db.query('SELECT post_id FROM posts WHERE post_id = ? LIMIT 1', [postId]);
        if (Array.isArray(rows) && rows.length > 0) return ctx;
      } catch (_) {}
    }
    return null;
  }

  /**
   * Take action on reported user (warning or suspend)
   * @param {number} userId - ID of the user to take action on
   * @param {string} action - Action type: 'warning' or 'suspend'
   * @param {number} adminId - ID of the admin taking action
   * @param {string} reason - Reason for the action
   * @returns {Promise<Object>} Action result
   */
  async takeUserAction(userId, action, adminId, reason) {
    const ctx = await this.findDbContextByUserId(userId);
    if (!ctx?.db_name) {
      throw new Error('User not found in any site database');
    }

    const targetDb = await connect(ctx.db_name);
    const connection = await targetDb.getConnection();
    try {
      await connection.beginTransaction();

      const normalizedAction = String(action || "").toLowerCase();

      // Backward compatibility: treat legacy "ban" as "suspend".
      const effectiveAction = normalizedAction === "ban" ? "suspend" : normalizedAction;

      // Validate action
      if (!["warning", "suspend"].includes(effectiveAction)) {
        throw new Error('Invalid action. Must be "warning" or "suspend"');
      }

      // Check if user exists
      const [user] = await connection.query(
        'SELECT user_id, fullname, email FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user || user.length === 0) {
        throw new Error('User not found');
      }

      // Schema-compatible action handling:
      // no user_actions/admin_logs/users.status fields in current DB dump.
      const newStatus = 'resolved';
      const actionNote = `[${new Date().toISOString()}] admin:${adminId} action:${effectiveAction} reason:${reason}`;

      const [result] = await connection.query(
        `UPDATE reports
         SET status = ?, admin_notes = ?, updated_at = NOW()
         WHERE reported_user_id = ?`,
        [newStatus, actionNote, userId]
      );

      if (effectiveAction === "suspend") {
        await this.createOrExtendSuspension(connection, userId, adminId, reason, 3);
      }

      // Notify reported user about admin action.
      // warning -> policy warning message
      // ban -> account banned message
      try {
        await this.createAdminActionNotification(connection, userId, effectiveAction, adminId);
      } catch (notifyErr) {
        console.warn("Failed to create admin action notification:", notifyErr?.message || notifyErr);
      }

      await connection.commit();

      return {
        success: true,
        affected_reports: result.affectedRows || 0,
        user_id: userId,
        action: effectiveAction,
        message: effectiveAction === "warning" ? "User successfully warned" : "User successfully suspended"
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error in takeUserAction:', error);
      throw new Error(`Failed to take user action: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  async createAdminActionNotification(connection, userId, action, adminId) {
    const normalizedAction = String(action || "").toLowerCase();
    const activityType = normalizedAction === "suspend" || normalizedAction === "ban"
      ? "suspended"
      : "warning";

    // Best-effort support for schemas where notifications.activity_type enum
    // still only contains like/comment/repost/follow.
    await this.ensureNotificationActivityType(connection, activityType);

    await connection.query(
      `INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, created_at)
       VALUES (?, ?, ?, NULL, NOW())`,
      [userId, activityType, adminId || null]
    );
  }

  async createOrExtendSuspension(connection, userId, adminId, reason, durationDays = 3) {
    const [activeRows] = await connection.query(
      `SELECT suspension_id
       FROM user_suspensions
       WHERE user_id = ?
         AND status = 'active'
         AND starts_at <= NOW()
         AND ends_at > NOW()
       ORDER BY ends_at DESC
       LIMIT 1`,
      [userId]
    );

    if (activeRows.length > 0) {
      await connection.query(
        `UPDATE user_suspensions
         SET ends_at = DATE_ADD(NOW(), INTERVAL ? DAY),
             reason = ?,
             imposed_by_admin_id = ?,
             updated_at = NOW()
         WHERE suspension_id = ?`,
        [durationDays, reason, adminId || null, activeRows[0].suspension_id]
      );
      return;
    }

    await connection.query(
      `INSERT INTO user_suspensions
       (user_id, imposed_by_admin_id, reason, starts_at, ends_at, duration_days, status, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?, 'active', NOW(), NOW())`,
      [userId, adminId || null, reason, durationDays, durationDays]
    );
  }

  async ensureNotificationActivityType(connection, activityType) {
    const [rows] = await connection.query("SHOW COLUMNS FROM notifications LIKE 'activity_type'");
    const currentType = rows?.[0]?.Type || "";
    if (!currentType.startsWith("enum(") || currentType.includes(`'${activityType}'`)) {
      return;
    }

    const enumValues = currentType
      .slice(5, -1)
      .split(",")
      .map((v) => v.trim().replace(/^'/, "").replace(/'$/, ""));

    const merged = Array.from(new Set([...enumValues, activityType]));
    const enumSql = merged.map((v) => `'${v}'`).join(", ");
    await connection.query(
      `ALTER TABLE notifications MODIFY COLUMN activity_type ENUM(${enumSql}) NOT NULL`
    );
  }

  /**
   * Take action on reported post (delete or ignore)
   * @param {number} postId - ID of the post to take action on
   * @param {string} action - Action type: 'delete' or 'ignore'
   * @param {number} adminId - ID of the admin taking action
   * @param {string} reason - Reason for the action
   * @returns {Promise<Object>} Action result
   */
  async takePostAction(postId, action, adminId, reason) {
    const ctx = await this.findDbContextByPostId(postId);
    if (!ctx?.db_name) {
      throw new Error('Post not found in any site database');
    }

    const targetDb = await connect(ctx.db_name);
    const connection = await targetDb.getConnection();
    try {
      await connection.beginTransaction();

      // Validate action
      if (!['delete', 'ignore'].includes(action)) {
        throw new Error('Invalid action. Must be "delete" or "ignore"');
      }

      // Get post details
      const [post] = await connection.query(
        'SELECT p.*, u.fullname, u.email FROM posts p JOIN users u ON p.user_id = u.user_id WHERE p.post_id = ?',
        [postId]
      );

      if (!post || post.length === 0) {
        throw new Error('Post not found');
      }

      // Update post status based on action
      if (action === 'delete') {
        await connection.query('DELETE FROM posts WHERE post_id = ?', [postId]);
        await connection.query(
          `UPDATE reports
           SET status = ?, admin_notes = ?, updated_at = NOW()
           WHERE post_id = ?`,
          ['resolved', `[${new Date().toISOString()}] admin:${adminId} action:${action} reason:${reason}`, postId]
        );
      } else if (action === 'ignore') {
        // Enum in SQL dump: pending/reviewed/resolved/dismissed
        await connection.query(
          `UPDATE reports
           SET status = ?, admin_notes = ?, updated_at = NOW()
           WHERE post_id = ?`,
          ['dismissed', `[${new Date().toISOString()}] admin:${adminId} action:${action} reason:${reason}`, postId]
        );
      }

      await connection.commit();

      return {
        success: true,
        post_id: postId,
        action: action,
        message: `Post successfully ${action}d`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error in takePostAction:', error);
      throw new Error(`Failed to take post action: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get combined report statistics
   * @returns {Promise<Object>} Report statistics
   */
  async getReportStatistics() {
    try {
      const reportedPosts = await this.getReportedPosts();
      const reportedUsers = await this.getReportedUsers();

      return {
        total_reported_posts: reportedPosts.length,
        total_reported_users: reportedUsers.length,
        high_priority_posts: reportedPosts.filter(p => p.unique_reporters >= 5).length,
        high_priority_users: reportedUsers.filter(u => u.unique_reporters >= 5).length,
        recent_reports: [
          ...reportedPosts.slice(0, 5).map(p => ({ type: 'post', data: p })),
          ...reportedUsers.slice(0, 5).map(u => ({ type: 'user', data: u }))
        ].sort((a, b) => new Date(b.data.latest_report) - new Date(a.data.latest_report)).slice(0, 10)
      };
    } catch (error) {
      console.error('Error in getReportStatistics:', error);
      throw new Error(`Failed to fetch report statistics: ${error.message}`);
    }
  }

  attachCommunityType(rows = [], siteMapRows = []) {
    const siteMap = new Map(
      (siteMapRows || [])
        .filter((row) => row?.site_name && row?.community_type)
        .map((row) => [String(row.site_name).trim().toLowerCase(), row.community_type])
    );

    return (rows || []).map((row) => {
      const communityNames = String(row?.community_names || '').split(',').map((x) => x.trim()).filter(Boolean);
      const matchedType = communityNames
        .map((name) => siteMap.get(name.toLowerCase()))
        .find(Boolean);

      return {
        ...row,
        community_name: communityNames[0] || null,
        community_type: matchedType || (communityNames[0] || null),
      };
    });
  }
}

export default ReportModel;
