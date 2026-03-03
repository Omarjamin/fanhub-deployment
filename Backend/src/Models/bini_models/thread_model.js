import { connect, resolveCommunityContext } from '../../core/database.js';

class Thread {
  constructor() {
    this.db = null;
    this.threadColumnSet = null;
    this.activeCommunityId = null;
  }

  async ensureConnection(siteSlug = '') {
    try {
      this.db = await connect(siteSlug);
      this.threadColumnSet = null;
      const community = await resolveCommunityContext(siteSlug);
      this.activeCommunityId = Number(community?.community_id || 0) || null;
    } catch (err) {
      console.error('thread_model.ensureConnection failed:', err?.message || err);
      this.db = await connect();
      this.threadColumnSet = null;
      this.activeCommunityId = null;
    }
    return this.db;
  }

  async getThreadColumns(db) {
    if (this.threadColumnSet) return this.threadColumnSet;
    const [rows] = await db.query('SHOW COLUMNS FROM community_threads');
    this.threadColumnSet = new Set(
      (rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()),
    );
    return this.threadColumnSet;
  }

  async ensureCommunityColumn(db) {
    const columns = await this.getThreadColumns(db);
    if (!columns.has('community_id')) {
      await db.query('ALTER TABLE community_threads ADD COLUMN community_id INT NULL AFTER id');
      try {
        await db.query('ALTER TABLE community_threads ADD INDEX idx_community_threads_community_id (community_id)');
      } catch (_) {}
      this.threadColumnSet = null;
    }
  }

  async getThreads(siteSlug = '') {
    try {
      const db = await this.ensureConnection(siteSlug);
      await this.ensureCommunityColumn(db);
      const columns = await this.getThreadColumns(db);

      const scoped = columns.has('community_id') && this.activeCommunityId;
      const whereClause = scoped ? 'WHERE community_id = ?' : '';
      const params = scoped ? [this.activeCommunityId] : [];

      const query = `
        SELECT
          id,
          ${columns.has('community_id') ? 'community_id,' : ''}
          title,
          venue,
          date,
          author,
          is_pinned,
          is_pinned AS isPinned,
          created_at
        FROM community_threads
        ${whereClause}
        ORDER BY is_pinned DESC, created_at DESC
      `;
      const [threads] = await db.query(query, params);
      return threads;
    } catch (err) {
      throw err;
    }
  }
}

export default Thread;
