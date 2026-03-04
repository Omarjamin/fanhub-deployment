import { connect, resolveCommunityContext } from '../../core/database.js';

class Thread {
  constructor() {
    this.db = null;
    this.threadColumnSet = null;
    this.activeCommunityId = null;
    this.hasThreadsTable = false;
  }

  async ensureConnection(siteSlug = '') {
    try {
      this.db = await connect(siteSlug);
      const hasThreads = await this.hasTableOnPool(this.db, 'community_threads');
      if (!hasThreads) {
        console.warn(
          `[ThreadModel] Falling back to default DB because community_threads table is missing for site "${siteSlug}"`,
        );
        this.db = await connect();
        this.hasThreadsTable = await this.hasTableOnPool(this.db, 'community_threads');
      } else {
        this.hasThreadsTable = true;
      }
      this.threadColumnSet = null;
      const community = await resolveCommunityContext(siteSlug);
      this.activeCommunityId = Number(community?.community_id || 0) || null;
    } catch (err) {
      console.error('thread_model.ensureConnection failed:', err?.message || err);
      this.db = await connect();
      this.threadColumnSet = null;
      this.activeCommunityId = null;
      this.hasThreadsTable = await this.hasTableOnPool(this.db, 'community_threads');
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

  async getThreadColumns(db) {
    if (!this.hasThreadsTable) return new Set();
    if (this.threadColumnSet) return this.threadColumnSet;
    const [rows] = await db.query('SHOW COLUMNS FROM community_threads');
    this.threadColumnSet = new Set(
      (rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()),
    );
    return this.threadColumnSet;
  }

  async ensureCommunityColumn(db) {
    if (!this.hasThreadsTable) return;
    const columns = await this.getThreadColumns(db);
    if (!columns.has('community_id')) {
      try {
        await db.query('ALTER TABLE community_threads ADD COLUMN community_id INT NULL AFTER id');
      } catch (err) {
        // In production some schemas may be locked/read-only; continue without mutating schema.
        console.warn('[ThreadModel] Unable to add community_id column:', err?.message || err);
        return;
      }
      try {
        await db.query('ALTER TABLE community_threads ADD INDEX idx_community_threads_community_id (community_id)');
      } catch (_) {}
      this.threadColumnSet = null;
    }
  }

  async getThreads(siteSlug = '') {
    try {
      const db = await this.ensureConnection(siteSlug);
      if (!this.hasThreadsTable) return [];
      await this.ensureCommunityColumn(db);
      const columns = await this.getThreadColumns(db);

      const scoped = columns.has('community_id') && this.activeCommunityId;
      const whereClause = scoped ? 'WHERE community_id = ?' : '';
      const params = scoped ? [this.activeCommunityId] : [];
      const selectId = columns.has('id') ? 'id' : '0';
      const selectCommunity = columns.has('community_id') ? 'community_id,' : '';
      const selectTitle = columns.has('title') ? 'title' : "'' AS title";
      const selectVenue = columns.has('venue') ? 'venue' : "'' AS venue";
      const selectDate = columns.has('date') ? 'date' : 'NULL AS date';
      const selectAuthor = columns.has('author') ? 'author' : "'' AS author";
      const selectPinned = columns.has('is_pinned') ? 'is_pinned' : '0';
      const selectCreated = columns.has('created_at') ? 'created_at' : 'NULL AS created_at';
      const orderBy = columns.has('is_pinned') && columns.has('created_at')
        ? 'ORDER BY is_pinned DESC, created_at DESC'
        : columns.has('created_at')
          ? 'ORDER BY created_at DESC'
          : columns.has('id')
            ? 'ORDER BY id DESC'
            : '';

      const query = `
        SELECT
          ${selectId} AS id,
          ${selectCommunity}
          ${selectTitle},
          ${selectVenue},
          ${selectDate},
          ${selectAuthor},
          ${selectPinned} AS is_pinned,
          ${selectPinned} AS isPinned,
          ${selectCreated}
        FROM community_threads
        ${whereClause}
        ${orderBy}
      `;
      const [threads] = await db.query(query, params);
      return threads;
    } catch (err) {
      throw err;
    }
  }
}

export default Thread;
