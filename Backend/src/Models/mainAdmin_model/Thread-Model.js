import { connect, connectAdmin } from '../../core/database.js';

class ThreadModel {
  constructor() {
    this.adminDb = null;
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

  async connectSiteDb(site) {
    const key = String(site?.domain || site?.site_name || '').trim().toLowerCase();
    if (!key) throw new Error('Invalid site database mapping');
    return connect(key);
  }

  async enforceSinglePinnedThread(siteDb) {
    const [pinnedRows] = await siteDb.query(
      `
        SELECT id
        FROM community_threads
        WHERE is_pinned = 1
        ORDER BY updated_at DESC, created_at DESC, id DESC
      `,
    );

    if (!Array.isArray(pinnedRows) || pinnedRows.length <= 1) return;
    const keepId = pinnedRows[0].id;
    await siteDb.query(
      'UPDATE community_threads SET is_pinned = 0 WHERE is_pinned = 1 AND id <> ?',
      [keepId],
    );
  }

  async findAll(siteId = null) {
    const selectedSiteId = Number(siteId || 0);

    if (selectedSiteId > 0) {
      const site = await this.getSiteById(selectedSiteId);
      if (!site) return [];
      try {
        const siteDb = await this.connectSiteDb(site);
        await this.enforceSinglePinnedThread(siteDb);
        const [threads] = await siteDb.query(
          `
            SELECT *
            FROM community_threads
            ORDER BY is_pinned DESC, created_at DESC
          `,
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
        await this.enforceSinglePinnedThread(siteDb);
        const [threads] = await siteDb.query(
          `
            SELECT *
            FROM community_threads
            ORDER BY is_pinned DESC, created_at DESC
          `,
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
      const [rows] = await siteDb.query(
        'SELECT * FROM community_threads WHERE id = ? LIMIT 1',
        [numericId],
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
        const [rows] = await siteDb.query(
          'SELECT * FROM community_threads WHERE id = ? LIMIT 1',
          [numericId],
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

    const conn = await siteDb.getConnection();
    try {
      await conn.beginTransaction();
      if (shouldPin) {
        await conn.query('UPDATE community_threads SET is_pinned = 0 WHERE is_pinned = 1');
      }

      const [result] = await conn.query(
        `
          INSERT INTO community_threads (title, venue, date, author, is_pinned)
          VALUES (?, ?, ?, ?, ?)
        `,
        [title, venue, parsedDate, author, shouldPin ? 1 : 0],
      );

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

    const siteDb = await this.connectSiteDb(site);
    const conn = await siteDb.getConnection();
    try {
      const updates = [];
      const params = [];

      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (venue !== undefined) {
        updates.push('venue = ?');
        params.push(venue);
      }
      if (date !== undefined) {
        updates.push('date = ?');
        params.push(new Date(date));
      }
      if (is_pinned !== undefined) {
        updates.push('is_pinned = ?');
        params.push(is_pinned ? 1 : 0);
      }

      if (!updates.length) {
        throw new Error('Thread not found');
      }

      await conn.beginTransaction();
      if (Boolean(is_pinned)) {
        await conn.query(
          'UPDATE community_threads SET is_pinned = 0 WHERE id <> ? AND is_pinned = 1',
          [numericId],
        );
      }

      params.push(numericId);
      const [result] = await conn.query(
        `
          UPDATE community_threads
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = ?
        `,
        params,
      );

      if (!result.affectedRows) {
        throw new Error('Thread not found');
      }

      await conn.commit();
      return await this.findById(numericId, site.site_id);
    } catch (err) {
      try { await conn.rollback(); } catch (_) {}
      if (err.message === 'Thread not found') throw err;
      console.error(`Error updating thread with ID ${numericId}:`, err);
      throw new Error('Failed to update thread');
    } finally {
      conn.release();
    }
  }

  async delete(id, siteId) {
    const numericId = Number(id);
    const site = await this.getSiteById(siteId);
    if (!numericId || Number.isNaN(numericId)) throw new Error('Thread not found');
    if (!site) throw new Error('Selected site does not exist');

    const siteDb = await this.connectSiteDb(site);
    try {
      const [result] = await siteDb.query(
        'DELETE FROM community_threads WHERE id = ?',
        [numericId],
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
        SELECT site_id, site_name, domain, status
        FROM sites
        WHERE LOWER(TRIM(COALESCE(status, 'active'))) = 'active'
        ORDER BY site_name ASC
      `,
    );
    return sites || [];
  }
}

export default ThreadModel;
