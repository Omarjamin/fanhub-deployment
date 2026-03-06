import { connect, resolveCommunityContext } from '../../core/database.js';
import { connectAdmin } from '../../core/database.js';
import { getSiteCommunityTypeMap } from './site-model.js';

class ReportModel {
  constructor() {
    this.connect();
    this.tableColumnsCache = new Map();
    this.contextCommunityIdCache = new Map();
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
      if (!dbName) continue;
      const communityId = Number(row?.community_id || row?.site_id || 0) || null;
      const dedupeKey = `${dbName.toLowerCase()}::${communityId || String(row?.domain || row?.site_name || '').trim().toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      contexts.push({
        db_name: dbName,
        site_name: row?.site_name || dbName,
        domain: row?.domain || '',
        community_id: communityId,
        site_id: Number(row?.site_id || 0) || null,
      });
    }
    return contexts;
  }

  normalizeScope(scope = '') {
    return String(scope || '').trim().toLowerCase().replace(/-website$/, '');
  }

  isScopeAll(scope = '') {
    const normalized = this.normalizeScope(scope);
    return !normalized || normalized === 'all';
  }

  matchesScope(ctx = {}, scope = '') {
    if (this.isScopeAll(scope)) return true;
    const normalized = this.normalizeScope(scope);
    const candidates = [
      ctx?.domain,
      ctx?.site_name,
      ctx?.community_type,
      ctx?.db_name,
    ]
      .map((value) => this.normalizeScope(value))
      .filter(Boolean);
    return candidates.includes(normalized);
  }

  async getScopedContexts(communityType = 'all') {
    const contexts = await this.getSiteDbContexts();
    if (this.isScopeAll(communityType)) return contexts;
    return contexts.filter((ctx) => this.matchesScope(ctx, communityType));
  }

  async resolveScopedCommunityId(communityType = 'all') {
    const normalized = this.normalizeScope(communityType);
    if (!normalized || normalized === 'all') return null;
    const numeric = Number(normalized);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;

    // Priority: resolve from community_table.
    try {
      const adminDB = await connectAdmin();
      const [hasCt] = await adminDB.query('SHOW TABLES LIKE ?', ['community_table']);
      if (Array.isArray(hasCt) && hasCt.length > 0) {
        const [rows] = await adminDB.query(
          `
            SELECT ct.community_id
            FROM community_table ct
            LEFT JOIN communities c ON c.community_id = ct.community_id OR c.id = ct.community_id
            WHERE LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
               OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
               OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
               OR LOWER(TRIM(c.name)) = LOWER(TRIM(?))
            LIMIT 1
          `,
          [normalized, normalized, `${normalized}-website`, normalized],
        );
        const fromTable = Number(rows?.[0]?.community_id || 0) || null;
        if (fromTable) return fromTable;
      }
    } catch (_) {}

    const ctx = await resolveCommunityContext(normalized);
    return Number(ctx?.community_id || 0) || null;
  }

  async resolveDbCommunityId(connection) {
    try {
      const communityCols = await this.getTableColumns(connection, 'communities');
      if (!communityCols.has('community_id')) return null;
      const [rows] = await connection.query(
        'SELECT community_id FROM communities ORDER BY community_id ASC LIMIT 1',
      );
      return Number(rows?.[0]?.community_id || 0) || null;
    } catch (_) {
      return null;
    }
  }

  async resolveContextCommunityId(ctx = {}) {
    const explicitCommunityId = Number(ctx?.community_id || ctx?.site_id || 0) || null;
    if (explicitCommunityId) return explicitCommunityId;
    const key = this.normalizeScope(ctx?.domain || ctx?.site_name || ctx?.db_name || '');
    if (!key) return null;
    if (this.contextCommunityIdCache.has(key)) {
      return this.contextCommunityIdCache.get(key);
    }
    const resolved = await this.resolveScopedCommunityId(key);
    this.contextCommunityIdCache.set(key, resolved || null);
    return resolved || null;
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
  async getReportedPosts(communityType = 'all') {
    try {
      const contexts = await this.getScopedContexts(communityType);
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
          const hasCreatedAt = cols.has('created_at');
          const hasReason = cols.has('reason');
          const hasStatus = cols.has('status');
          const hasReportCommunityId = cols.has('community_id');
          const hasCategory = cols.has('category');
          const hasReportCategory = cols.has('report_category');
          const hasAdminNotes = cols.has('admin_notes');
          const postCols = await this.getTableColumns(db, 'posts');
          const hasPostCommunityId = postCols.has('community_id');
          const userCols = await this.getTableColumns(db, 'users');
          const hasUserCommunityId = userCols.has('community_id');
          const contextCommunityId = await this.resolveContextCommunityId(ctx);

          const typeFilterParts = [];
          const scopeFilterParts = [];
          const queryParams = [];
          if (hasPostId) typeFilterParts.push('pr.post_id IS NOT NULL');
          if (hasReportType) typeFilterParts.push(`pr.report_type = 'post'`);
          if (contextCommunityId) {
            if (hasPostCommunityId && hasReportCommunityId) {
              scopeFilterParts.push('COALESCE(p.community_id, pr.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            } else if (hasPostCommunityId) {
              scopeFilterParts.push('COALESCE(p.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            } else if (hasUserCommunityId) {
              scopeFilterParts.push('COALESCE(u.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            } else if (hasReportCommunityId) {
              scopeFilterParts.push('COALESCE(pr.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            }
          }
          const whereClauses = [];
          if (typeFilterParts.length) whereClauses.push(`(${typeFilterParts.join(' OR ')})`);
          if (scopeFilterParts.length) whereClauses.push(`(${scopeFilterParts.join(' AND ')})`);
          const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

          const [rows] = await db.query(`
            SELECT
              pr.report_id,
              COALESCE(u.user_id, pr.reported_user_id) as user_id,
              COALESCE(u.fullname, 'Deleted User') as fullname,
              COALESCE(u.email, 'N/A') as email,
              u.profile_picture,
              reporter.user_id as reporter_id,
              reporter.fullname as reporter_name,
              reporter.email as reporter_email,
              pr.post_id,
              COALESCE(p.content, '[Post already deleted]') as content,
              p.img_url,
              ${hasCategory ? 'pr.category' : 'NULL'} as category,
              ${hasReportCategory ? 'pr.report_category' : 'NULL'} as report_category,
              ${hasAdminNotes ? 'pr.admin_notes' : 'NULL'} as admin_notes,
              ${hasReason ? 'pr.reason' : `''`} as reason,
              ${hasStatus ? 'pr.status' : `'pending'`} as status,
              ${hasCreatedAt ? 'pr.created_at' : 'NULL'} as created_at
            FROM reports pr
            LEFT JOIN posts p ON p.post_id = pr.post_id
            LEFT JOIN users u ON u.user_id = COALESCE(p.user_id, pr.reported_user_id)
            LEFT JOIN users reporter ON reporter.user_id = pr.reporter_id
            ${whereSql}
            ORDER BY ${hasCreatedAt ? 'pr.created_at DESC,' : ''} pr.report_id DESC
          `, queryParams);

          console.log('[reports] getReportedPosts', {
            db: ctx.db_name,
            rows: rows?.length || 0,
            usedTypeFilters: typeFilterParts,
            usedScopeFilters: scopeFilterParts,
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
  async getReportedUsers(communityType = 'all') {
    try {
      const contexts = await this.getScopedContexts(communityType);
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
          const hasCreatedAt = cols.has('created_at');
          const hasReason = cols.has('reason');
          const hasStatus = cols.has('status');
          const hasReportCommunityId = cols.has('community_id');
          const hasCategory = cols.has('category');
          const hasReportCategory = cols.has('report_category');
          const hasAdminNotes = cols.has('admin_notes');
          const userCols = await this.getTableColumns(db, 'users');
          const hasUserCommunityId = userCols.has('community_id');
          const contextCommunityId = await this.resolveContextCommunityId(ctx);

          const typeFilterParts = [];
          const scopeFilterParts = [];
          const queryParams = [];
          if (hasMessageId) typeFilterParts.push('ur.message_id IS NOT NULL');
          if (hasReportType) typeFilterParts.push(`ur.report_type = 'chat'`);
          if (contextCommunityId) {
            if (hasUserCommunityId) {
              scopeFilterParts.push('COALESCE(u.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            } else if (hasReportCommunityId) {
              scopeFilterParts.push('COALESCE(ur.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            }
          }
          const whereClauses = [];
          if (typeFilterParts.length) whereClauses.push(`(${typeFilterParts.join(' OR ')})`);
          if (scopeFilterParts.length) whereClauses.push(`(${scopeFilterParts.join(' AND ')})`);
          const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

          const [rows] = await db.query(`
            SELECT
              ur.report_id,
              u.user_id,
              u.fullname,
              u.email,
              u.profile_picture,
              reporter.user_id as reporter_id,
              reporter.fullname as reporter_name,
              reporter.email as reporter_email,
              ${hasCategory ? 'ur.category' : 'NULL'} as category,
              ${hasReportCategory ? 'ur.report_category' : 'NULL'} as report_category,
              ${hasAdminNotes ? 'ur.admin_notes' : 'NULL'} as admin_notes,
              ${hasReason ? 'ur.reason' : `''`} as reason,
              ${hasStatus ? 'ur.status' : `'pending'`} as status,
              ${hasCreatedAt ? 'ur.created_at' : 'NULL'} as created_at
            FROM users u
            JOIN reports ur ON u.user_id = ur.reported_user_id
            LEFT JOIN users reporter ON reporter.user_id = ur.reporter_id
            ${whereSql}
            ORDER BY ${hasCreatedAt ? 'ur.created_at DESC,' : ''} ur.report_id DESC
          `, queryParams);

          console.log('[reports] getReportedUsers', {
            db: ctx.db_name,
            rows: rows?.length || 0,
            usedTypeFilters: typeFilterParts,
            usedScopeFilters: scopeFilterParts,
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
  async getPostReports(postId, communityType = 'all') {
    try {
      const contexts = await this.getScopedContexts(communityType);
      const allRows = [];

      for (const ctx of contexts) {
        try {
          const db = await connect(ctx.db_name);
          const reportCols = await this.getTableColumns(db, 'reports');
          const postCols = await this.getTableColumns(db, 'posts');
          const contextCommunityId = await this.resolveContextCommunityId(ctx);
          const hasReportCommunityId = reportCols.has('community_id');
          const hasPostCommunityId = postCols.has('community_id');
          const whereParts = ['pr.post_id = ?'];
          const queryParams = [postId];
          if (contextCommunityId) {
            if (hasPostCommunityId) {
              whereParts.push('COALESCE(p.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            } else if (hasReportCommunityId) {
              whereParts.push('COALESCE(pr.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            }
          }
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
              WHERE ${whereParts.join(' AND ')}
              ORDER BY pr.created_at DESC
            `,
            queryParams,
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
  async getUserReports(userId, communityType = 'all') {
    try {
      const contexts = await this.getScopedContexts(communityType);
      const allRows = [];

      for (const ctx of contexts) {
        try {
          const db = await connect(ctx.db_name);
          const reportCols = await this.getTableColumns(db, 'reports');
          const userCols = await this.getTableColumns(db, 'users');
          const contextCommunityId = await this.resolveContextCommunityId(ctx);
          const hasReportCommunityId = reportCols.has('community_id');
          const hasUserCommunityId = userCols.has('community_id');
          const whereParts = ['ur.reported_user_id = ?', 'ur.message_id IS NOT NULL'];
          const queryParams = [userId];
          if (contextCommunityId) {
            if (hasUserCommunityId) {
              whereParts.push('COALESCE(reported.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            } else if (hasReportCommunityId) {
              whereParts.push('COALESCE(ur.community_id, 0) = ?');
              queryParams.push(contextCommunityId);
            }
          }
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
              WHERE ${whereParts.join(' AND ')}
              ORDER BY ur.created_at DESC
            `,
            queryParams,
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

  async findDbContextByUserId(userId, communityType = 'all') {
    const contexts = await this.getScopedContexts(communityType);
    for (const ctx of contexts) {
      try {
        const db = await connect(ctx.db_name);
        const userCols = await this.getTableColumns(db, 'users');
        const hasUserCommunityId = userCols.has('community_id');
        const contextCommunityId = await this.resolveContextCommunityId(ctx);
        const whereParts = ['user_id = ?'];
        const queryParams = [userId];
        if (contextCommunityId && hasUserCommunityId) {
          whereParts.push('COALESCE(community_id, 0) = ?');
          queryParams.push(contextCommunityId);
        }
        const [rows] = await db.query(
          `SELECT user_id FROM users WHERE ${whereParts.join(' AND ')} LIMIT 1`,
          queryParams,
        );
        if (Array.isArray(rows) && rows.length > 0) return ctx;
      } catch (_) {}
    }
    return null;
  }

  async findDbContextByPostId(postId, communityType = 'all') {
    const contexts = await this.getScopedContexts(communityType);
    for (const ctx of contexts) {
      try {
        const db = await connect(ctx.db_name);
        const postCols = await this.getTableColumns(db, 'posts');
        const hasPostCommunityId = postCols.has('community_id');
        const contextCommunityId = await this.resolveContextCommunityId(ctx);
        const whereParts = ['post_id = ?'];
        const queryParams = [postId];
        if (contextCommunityId && hasPostCommunityId) {
          whereParts.push('COALESCE(community_id, 0) = ?');
          queryParams.push(contextCommunityId);
        }
        const [rows] = await db.query(
          `SELECT post_id FROM posts WHERE ${whereParts.join(' AND ')} LIMIT 1`,
          queryParams,
        );
        if (Array.isArray(rows) && rows.length > 0) return ctx;
      } catch (_) {}
    }
    return null;
  }

  async findDbContextByReportedPostId(postId, communityType = 'all') {
    const contexts = await this.getScopedContexts(communityType);
    for (const ctx of contexts) {
      try {
        const db = await connect(ctx.db_name);
        const reportCols = await this.getTableColumns(db, 'reports');
        if (!reportCols.has('post_id')) continue;
        const hasReportCommunityId = reportCols.has('community_id');
        const contextCommunityId = await this.resolveContextCommunityId(ctx);
        const whereParts = ['post_id = ?'];
        const queryParams = [postId];
        if (contextCommunityId && hasReportCommunityId) {
          whereParts.push('COALESCE(community_id, 0) = ?');
          queryParams.push(contextCommunityId);
        }
        const [rows] = await db.query(
          `SELECT post_id FROM reports WHERE ${whereParts.join(' AND ')} LIMIT 1`,
          queryParams,
        );
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
  async takeUserAction(userId, action, adminId, reason, communityType = 'all') {
    const ctx = await this.findDbContextByUserId(userId, communityType);
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

      const userColumns = await this.getTableColumns(connection, 'users');
      const hasUserCommunityId = userColumns.has('community_id');

      // Check if user exists
      const [user] = await connection.query(
        `SELECT user_id, fullname, email${hasUserCommunityId ? ', community_id' : ''}
         FROM users
         WHERE user_id = ?`,
        [userId]
      );

      if (!user || user.length === 0) {
        throw new Error('User not found');
      }

      const scopedCommunityId = await this.resolveScopedCommunityId(communityType);
      const userCommunityId = hasUserCommunityId
        ? Number(user?.[0]?.community_id || 0) || null
        : null;
      const dbCommunityId = await this.resolveDbCommunityId(connection);
      const notificationCommunityId = userCommunityId || scopedCommunityId || dbCommunityId || null;

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
        await this.createAdminActionNotification(
          connection,
          userId,
          effectiveAction,
          adminId,
          notificationCommunityId,
        );
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

  async createAdminActionNotification(connection, userId, action, adminId, communityId = null) {
    const normalizedAction = String(action || "").toLowerCase();
    const activityType = normalizedAction === "suspend" || normalizedAction === "ban"
      ? "suspended"
      : "warning";

    // Best-effort support for schemas where notifications.activity_type enum
    // still only contains like/comment/repost/follow.
    await this.ensureNotificationActivityType(connection, activityType);

    const notificationColumns = await this.getTableColumns(connection, 'notifications');
    const hasCommunityId = notificationColumns.has('community_id');

    if (hasCommunityId) {
      const safeCommunityId = Number(communityId || 0) || null;
      await connection.query(
        `INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, community_id, created_at)
         VALUES (?, ?, ?, NULL, ?, NOW())`,
        [userId, activityType, adminId || null, safeCommunityId],
      );
      return;
    }

    await connection.query(
      `INSERT INTO notifications (user_id, activity_type, source_user_id, post_id, created_at)
       VALUES (?, ?, ?, NULL, NOW())`,
      [userId, activityType, adminId || null],
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
  async takePostAction(postId, action, adminId, reason, communityType = 'all') {
    const ctx = await this.findDbContextByPostId(postId, communityType)
      || await this.findDbContextByReportedPostId(postId, communityType);
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

      const postExists = Array.isArray(post) && post.length > 0;

      // Update post status based on action
      if (action === 'delete') {
        if (postExists) {
          const removableRefs = [
            { table: 'comments', column: 'post_id' },
            { table: 'likes', column: 'post_id' },
            { table: 'hashtags', column: 'post_id' },
            { table: 'notifications', column: 'post_id' },
          ];

          for (const ref of removableRefs) {
            const refCols = await this.getTableColumns(connection, ref.table);
            if (!refCols.has(ref.column)) continue;
            await connection.query(`DELETE FROM ${ref.table} WHERE ${ref.column} = ?`, [postId]);
          }

          const postCols = await this.getTableColumns(connection, 'posts');
          if (postCols.has('repost_id')) {
            await connection.query('UPDATE posts SET repost_id = NULL WHERE repost_id = ?', [postId]);
          }

          await connection.query('DELETE FROM posts WHERE post_id = ?', [postId]);
        }
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
        already_deleted: action === 'delete' && !postExists,
        message: action === 'delete' && !postExists
          ? 'Post already deleted.'
          : `Post successfully ${action}d`
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
  async getReportStatistics(communityType = 'all') {
    try {
      const reportedPosts = await this.getReportedPosts(communityType);
      const reportedUsers = await this.getReportedUsers(communityType);

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
