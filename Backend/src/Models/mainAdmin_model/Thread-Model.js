import { connect, connectAdmin, resolveCommunityContext } from '../../core/database.js';

class ThreadModel {
  constructor() {
    this.adminDb = null;
    this.columnCache = new Map();
  }

  async hasColumn(db, tableName, columnName) {
    const [dbRows] = await db.query('SELECT DATABASE() AS current_db');
    const currentDb = String(dbRows?.[0]?.current_db || '').trim().toLowerCase();
    const cacheKey = `${currentDb}:${String(tableName || '').toLowerCase()}:${String(columnName || '').toLowerCase()}`;
    if (this.columnCache.has(cacheKey)) return this.columnCache.get(cacheKey);

    const [rows] = await db.query(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
      `,
      [tableName, columnName],
    );
    const exists = Number(rows?.[0]?.count || 0) > 0;
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  async hasTable(db, tableName) {
    const [dbRows] = await db.query('SELECT DATABASE() AS current_db');
    const currentDb = String(dbRows?.[0]?.current_db || '').trim().toLowerCase();
    const cacheKey = `${currentDb}:table:${String(tableName || '').toLowerCase()}`;
    if (this.columnCache.has(cacheKey)) return this.columnCache.get(cacheKey);

    const [rows] = await db.query(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
      `,
      [tableName],
    );
    const exists = Number(rows?.[0]?.count || 0) > 0;
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  async resolveScopedCommunityId(siteDb, site = {}) {
    const explicitSiteCommunity = Number(site?.community_id || 0) || null;
    if (explicitSiteCommunity) return explicitSiteCommunity;

    const siteKey = String(site?.domain || site?.site_name || '').trim().toLowerCase();
    if (siteKey) {
      try {
        const ctx = await resolveCommunityContext(siteKey);
        const mapped = Number(ctx?.community_id || 0) || null;
        if (mapped) return mapped;
      } catch (_) {}
    }

    try {
      const hasCommunitiesTable = await this.hasTable(siteDb, 'communities');
      const hasCommunityIdColumn = hasCommunitiesTable
        ? await this.hasColumn(siteDb, 'communities', 'community_id')
        : false;
      if (hasCommunitiesTable && hasCommunityIdColumn) {
        const [rows] = await siteDb.query(
          'SELECT community_id FROM communities ORDER BY community_id ASC LIMIT 1',
        );
        const fromDb = Number(rows?.[0]?.community_id || 0) || null;
        if (fromDb) return fromDb;
      }
    } catch (_) {}
    return null;
  }

  async buildCommunityScope(siteDb, site = {}, alias = '') {
    await this.ensureCommunityThreadsScopeSchema(siteDb);
    const scopedCommunityId = await this.resolveScopedCommunityId(siteDb, site);
    const hasCommunityId = await this.hasColumn(siteDb, 'community_threads', 'community_id');
    if (!hasCommunityId || !scopedCommunityId) return { sql: '', params: [] };
    const col = alias ? `${alias}.community_id` : 'community_id';
    return {
      sql: ` AND COALESCE(${col}, 0) = ?`,
      params: [scopedCommunityId],
    };
  }

  async ensureCommunityThreadsScopeSchema(siteDb) {
    const hasTable = await this.hasTable(siteDb, 'community_threads');
    if (!hasTable) return;

    const hasCommunityId = await this.hasColumn(siteDb, 'community_threads', 'community_id');
    if (!hasCommunityId) {
      await siteDb.query(
        'ALTER TABLE community_threads ADD COLUMN community_id INT(11) NOT NULL DEFAULT 0 AFTER id',
      );
    }

    const [idxRows] = await siteDb.query(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'community_threads'
          AND INDEX_NAME = 'idx_community_threads_community_id'
      `,
    );
    if (Number(idxRows?.[0]?.count || 0) === 0) {
      await siteDb.query(
        'ALTER TABLE community_threads ADD INDEX idx_community_threads_community_id (community_id)',
      );
    }
  }

  async getAdminDb() {
    if (!this.adminDb) {
      this.adminDb = await connectAdmin();
    }
    return this.adminDb;
  }

  async getSitesWithDb() {
    const db = await this.getAdminDb();
    const [rows] = await db.query(
      `
        SELECT
          s.site_id,
          s.community_id,
          s.site_name,
          s.domain,
          s.status
        FROM sites s
        WHERE LOWER(TRIM(COALESCE(s.status, 'active'))) = 'active'
        ORDER BY s.site_name ASC
      `,
    );
    return rows || [];
  }

  async getSiteById(siteId) {
    const numericSiteId = Number(siteId);
    if (!numericSiteId || Number.isNaN(numericSiteId)) return null;

    const db = await this.getAdminDb();
    const [rows] = await db.query(
      `
        SELECT
          s.site_id,
          s.community_id,
          s.site_name,
          s.domain,
          s.status
        FROM sites s
        WHERE s.site_id = ?
        LIMIT 1
      `,
      [numericSiteId],
    );
    return rows?.[0] || null;
  }

  async getSiteByKey(siteKey) {
    const raw = String(siteKey || '').trim();
    if (!raw) return null;

    const numeric = Number(raw);
    if (!Number.isNaN(numeric) && numeric > 0) {
      return this.getSiteById(numeric);
    }

    const normalized = raw.toLowerCase();
    const db = await this.getAdminDb();
    const [rows] = await db.query(
      `
        SELECT
          s.site_id,
          s.community_id,
          s.site_name,
          s.domain,
          s.status
        FROM sites s
        WHERE LOWER(TRIM(s.domain)) = LOWER(TRIM(?))
           OR LOWER(TRIM(s.site_name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [normalized, normalized],
    );
    return rows?.[0] || null;
  }

  async connectSiteDb(site) {
    const key = String(site?.domain || site?.site_name || '').trim().toLowerCase();
    if (!key) throw new Error('Invalid site database mapping');
    return connect(key);
  }

  async enforceSinglePinnedThread(siteDb, site = null) {
    const scoped = await this.buildCommunityScope(siteDb, site);
    const [pinnedRows] = await siteDb.query(
      `
        SELECT id
        FROM community_threads
        WHERE is_pinned = 1${scoped.sql}
        ORDER BY updated_at DESC, created_at DESC, id DESC
      `,
      scoped.params,
    );

    if (!Array.isArray(pinnedRows) || pinnedRows.length <= 1) return;
    const keepId = pinnedRows[0].id;
    await siteDb.query(
      `UPDATE community_threads
       SET is_pinned = 0
       WHERE is_pinned = 1
         AND id <> ?${scoped.sql}`,
      [keepId, ...scoped.params],
    );
  }

  async findAll(siteId = null) {
    const selectedSiteId = Number(siteId || 0);

    if (selectedSiteId > 0) {
      const site = await this.getSiteById(selectedSiteId);
      if (!site) return [];
      try {
        const siteDb = await this.connectSiteDb(site);
        await this.enforceSinglePinnedThread(siteDb, site);
        const scoped = await this.buildCommunityScope(siteDb, site);
        const [threads] = await siteDb.query(
          `
            SELECT *
            FROM community_threads
            WHERE 1=1${scoped.sql}
            ORDER BY is_pinned DESC, created_at DESC
          `,
          scoped.params,
        );
        return (threads || []).map((thread) => ({
          ...thread,
          site_id: site.site_id,
          site_name: site.site_name,
          domain: site.domain,
          community_type: site.domain,
        }));
      } catch (err) {
        console.error(`Error fetching threads for site "${site.domain}":`, err);
        return [];
      }
    }

    const sites = await this.getSitesWithDb();
    const allThreads = [];

    for (const site of sites) {
      try {
        const siteDb = await this.connectSiteDb(site);
        await this.enforceSinglePinnedThread(siteDb, site);
        const scoped = await this.buildCommunityScope(siteDb, site);
        const [threads] = await siteDb.query(
          `
            SELECT *
            FROM community_threads
            WHERE 1=1${scoped.sql}
            ORDER BY is_pinned DESC, created_at DESC
          `,
          scoped.params,
        );
        for (const thread of threads || []) {
          allThreads.push({
            ...thread,
            site_id: site.site_id,
            site_name: site.site_name,
            domain: site.domain,
            community_type: site.domain,
          });
        }
      } catch (err) {
        console.error(`Error fetching threads for site "${site.domain}":`, err);
      }
    }

    allThreads.sort((a, b) => {
      const pinA = Number(Boolean(a.is_pinned));
      const pinB = Number(Boolean(b.is_pinned));
      if (pinA !== pinB) return pinB - pinA;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return allThreads;
  }

  async findById(id, siteId = null) {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) return null;

    const numericSiteId = Number(siteId || 0);
    if (numericSiteId > 0) {
      const site = await this.getSiteById(numericSiteId);
      if (!site) return null;
      const siteDb = await this.connectSiteDb(site);
      const scoped = await this.buildCommunityScope(siteDb, site);
      const [rows] = await siteDb.query(
        `SELECT * FROM community_threads WHERE id = ?${scoped.sql} LIMIT 1`,
        [numericId, ...scoped.params],
      );
      const row = rows?.[0] || null;
      if (!row) return null;
      return {
        ...row,
        site_id: site.site_id,
        site_name: site.site_name,
        domain: site.domain,
        community_type: site.domain,
      };
    }

    const sites = await this.getSitesWithDb();
    for (const site of sites) {
      try {
        const siteDb = await this.connectSiteDb(site);
        const scoped = await this.buildCommunityScope(siteDb, site);
        const [rows] = await siteDb.query(
          `SELECT * FROM community_threads WHERE id = ?${scoped.sql} LIMIT 1`,
          [numericId, ...scoped.params],
        );
        const row = rows?.[0] || null;
        if (!row) continue;
        return {
          ...row,
          site_id: site.site_id,
          site_name: site.site_name,
          domain: site.domain,
          community_type: site.domain,
        };
      } catch (_) {}
    }

    return null;
  }

  async create({ title, venue, date, author, is_pinned = 0, site_id }) {
    const site = await this.getSiteById(site_id);
    if (!site) {
      throw new Error('Selected site does not exist');
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date value');
    }

    const siteDb = await this.connectSiteDb(site);
    const shouldPin = Boolean(is_pinned);
    const scoped = await this.buildCommunityScope(siteDb, site);
    const hasCommunityId = await this.hasColumn(siteDb, 'community_threads', 'community_id');
    const scopedCommunityId = await this.resolveScopedCommunityId(siteDb, site);

    const conn = await siteDb.getConnection();
    try {
      await conn.beginTransaction();
      if (shouldPin) {
        await conn.query(
          `UPDATE community_threads
           SET is_pinned = 0
           WHERE is_pinned = 1${scoped.sql}`,
          scoped.params,
        );
      }

      let insertSql = `
        INSERT INTO community_threads (title, venue, date, author, is_pinned)
        VALUES (?, ?, ?, ?, ?)
      `;
      const insertParams = [title, venue, parsedDate, author, shouldPin ? 1 : 0];
      if (hasCommunityId) {
        insertSql = `
          INSERT INTO community_threads (title, venue, date, author, is_pinned, community_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        insertParams.push(scopedCommunityId || 0);
      }
      const [result] = await conn.query(insertSql, insertParams);

      await conn.commit();
      return await this.findById(result.insertId, site.site_id);
    } catch (err) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Error creating thread:', err);
      throw new Error('Failed to create thread');
    } finally {
      conn.release();
    }
  }

  async update(id, { title, venue, date, is_pinned, site_id }) {
    const numericId = Number(id);
    const site = await this.getSiteById(site_id);
    if (!numericId || Number.isNaN(numericId)) throw new Error('Thread not found');
    if (!site) throw new Error('Selected site does not exist');

    const buildUpdateParts = () => {
      const updates = [];
      const values = [];
      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (venue !== undefined) {
        updates.push('venue = ?');
        values.push(venue);
      }
      if (date !== undefined) {
        updates.push('date = ?');
        values.push(new Date(date));
      }
      if (is_pinned !== undefined) {
        updates.push('is_pinned = ?');
        values.push(is_pinned ? 1 : 0);
      }
      return { updates, values };
    };

    const applyUpdateInSite = async (targetSite, { syncCommunityId = null } = {}) => {
      const targetDb = await this.connectSiteDb(targetSite);
      const scoped = await this.buildCommunityScope(targetDb, targetSite);
      const hasCommunityId = await this.hasColumn(targetDb, 'community_threads', 'community_id');
      const conn = await targetDb.getConnection();
      try {
        const { updates, values } = buildUpdateParts();
        if (!updates.length) throw new Error('Thread not found');

        await conn.beginTransaction();
        if (Boolean(is_pinned)) {
          await conn.query(
            `UPDATE community_threads
             SET is_pinned = 0
             WHERE id <> ?
               AND is_pinned = 1${scoped.sql}`,
            [numericId, ...scoped.params],
          );
        }

        let result = null;
        const scopedParams = [...values, numericId, ...scoped.params];
        [result] = await conn.query(
          `
            UPDATE community_threads
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = ?${scoped.sql}
          `,
          scopedParams,
        );

        if (!result.affectedRows) {
          const fallbackUpdates = [...updates];
          const fallbackParams = [...values];

          if (hasCommunityId && syncCommunityId) {
            fallbackUpdates.push('community_id = ?');
            fallbackParams.push(syncCommunityId);
          }

          fallbackParams.push(numericId);
          [result] = await conn.query(
            `
              UPDATE community_threads
              SET ${fallbackUpdates.join(', ')}, updated_at = NOW()
              WHERE id = ?
            `,
            fallbackParams,
          );
        }

        if (!result.affectedRows) {
          throw new Error('Thread not found');
        }

        await conn.commit();
        return true;
      } catch (err) {
        try { await conn.rollback(); } catch (_) {}
        throw err;
      } finally {
        conn.release();
      }
    };

    const siteDbForCommunity = await this.connectSiteDb(site);
    const scopedCommunityId = await this.resolveScopedCommunityId(siteDbForCommunity, site);
    try {
      await applyUpdateInSite(site, { syncCommunityId: scopedCommunityId });
      const updatedInTarget = await this.findById(numericId, site.site_id);
      if (updatedInTarget) return updatedInTarget;
      const updatedAny = await this.findById(numericId, null);
      if (updatedAny) return updatedAny;
      throw new Error('Thread not found');
    } catch (err) {
      if (err.message !== 'Thread not found') {
        console.error(`Error updating thread with ID ${numericId}:`, err);
        throw new Error('Failed to update thread');
      }

      // Cross-site fallback: update the site where the thread currently exists,
      // then sync community_id to selected target (single-db safe).
      const located = await this.findById(numericId, null);
      if (!located?.site_id) throw err;
      const sourceSite = await this.getSiteById(located.site_id);
      if (!sourceSite) throw err;

      try {
        await applyUpdateInSite(sourceSite, { syncCommunityId: scopedCommunityId });
      } catch (innerErr) {
        if (innerErr.message === 'Thread not found') throw err;
        console.error(`Error updating fallback thread with ID ${numericId}:`, innerErr);
        throw new Error('Failed to update thread');
      }

      const updatedInTarget = await this.findById(numericId, site.site_id);
      if (updatedInTarget) return updatedInTarget;
      const updatedInSource = await this.findById(numericId, sourceSite.site_id);
      if (updatedInSource) return updatedInSource;
      throw err;
    }
  }

  async delete(id, siteId) {
    const numericId = Number(id);
    const site = await this.getSiteById(siteId);
    if (!numericId || Number.isNaN(numericId)) throw new Error('Thread not found');
    if (!site) throw new Error('Selected site does not exist');

    const siteDb = await this.connectSiteDb(site);
    try {
      const scoped = await this.buildCommunityScope(siteDb, site);
      const [result] = await siteDb.query(
        `DELETE FROM community_threads WHERE id = ?${scoped.sql}`,
        [numericId, ...scoped.params],
      );
      if (!result.affectedRows) {
        throw new Error('Thread not found');
      }
      return true;
    } catch (err) {
      if (err.message === 'Thread not found') throw err;
      console.error(`Error deleting thread with ID ${numericId}:`, err);
      throw new Error('Failed to delete thread');
    }
  }

  async getSites() {
    const db = await this.getAdminDb();
    const [sites] = await db.query(
      `
        SELECT site_id, community_id, site_name, domain, status
        FROM sites
        WHERE LOWER(TRIM(COALESCE(status, 'active'))) = 'active'
        ORDER BY site_name ASC
      `,
    );
    return sites || [];
  }
}

export default ThreadModel;
