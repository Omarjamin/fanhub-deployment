import { connect, connectAdmin, resolveCommunityContext } from '../../core/database.js';

class DiscographyModel {
  constructor() {
    this.adminDb = null;
    this.schemaCache = new Map();
  }

  async getAdminDb() {
    if (!this.adminDb) {
      this.adminDb = await connectAdmin();
    }
    return this.adminDb;
  }

  async hasAdminTable(db, tableName) {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    return Array.isArray(rows) && rows.length > 0;
  }

  async getAdminTableColumns(db, tableName) {
    if (!await this.hasAdminTable(db, tableName)) return new Set();
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    return new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
  }

  normalizeSiteKey(value = '') {
    return String(value || '').trim().toLowerCase().replace(/-website$/, '');
  }

  async resolveCommunityIdByTable(siteKey = '') {
    const scoped = this.normalizeSiteKey(siteKey);
    if (!scoped) return null;
    const db = await this.getAdminDb();
    const hasCommunityTable = await this.hasAdminTable(db, 'community_table');
    if (!hasCommunityTable) return null;

    const communityCols = await this.getAdminTableColumns(db, 'communities');
    const hasCommunities = communityCols.size > 0;
    const communityPk = communityCols.has('community_id')
      ? 'community_id'
      : (communityCols.has('id') ? 'id' : null);
    const hasCommunityName = communityCols.has('name');

    let query = `SELECT ct.community_id FROM community_table ct `;
    const params = [];
    if (hasCommunities && communityPk) {
      query += `LEFT JOIN communities c ON c.${communityPk} = ct.community_id `;
    }
    query += `
      WHERE LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
         OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
    `;
    params.push(scoped, scoped);
    query += ` OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?)) `;
    params.push(`${scoped}-website`);
    if (hasCommunities && hasCommunityName && communityPk) {
      query += ` OR LOWER(TRIM(c.name)) = LOWER(TRIM(?)) `;
      params.push(scoped);
    }
    query += ` LIMIT 1 `;

    const [rows] = await db.query(query, params);
    const communityId = Number(rows?.[0]?.community_id || 0);
    return communityId > 0 ? communityId : null;
  }

  async getActiveSites() {
    const db = await this.getAdminDb();
    const hasCommunityTable = await this.hasAdminTable(db, 'community_table');
    if (hasCommunityTable) {
      const communityCols = await this.getAdminTableColumns(db, 'communities');
      const communityPk = communityCols.has('community_id')
        ? 'community_id'
        : (communityCols.has('id') ? 'id' : null);
      const hasCommunityName = communityCols.has('name');
      const communityJoin = communityPk
        ? `LEFT JOIN communities c ON c.${communityPk} = ct.community_id`
        : '';
      const communityNameExpr = hasCommunityName && communityPk
        ? "NULLIF(c.name, '')"
        : "NULL";

      const [rows] = await db.query(
        `
          SELECT
            COALESCE(s.site_id, ct.community_id) AS site_id,
            COALESCE(NULLIF(TRIM(s.site_name), ''), NULLIF(TRIM(ct.site_name), ''), 'community') AS site_name,
            LOWER(TRIM(COALESCE(${communityNameExpr}, NULLIF(s.domain, ''), NULLIF(ct.domain, ''), NULLIF(ct.site_name, '')))) AS domain,
            LOWER(TRIM(COALESCE(s.status, ct.status, 'active'))) AS status,
            ct.community_id
          FROM community_table ct
          LEFT JOIN sites s ON s.community_id = ct.community_id
          ${communityJoin}
          WHERE LOWER(TRIM(COALESCE(s.status, ct.status, 'active'))) = 'active'
          ORDER BY site_name ASC
        `,
      );
      return rows || [];
    }

    const [rows] = await db.query(
      `SELECT site_id, site_name, domain, status FROM sites WHERE LOWER(TRIM(COALESCE(status, 'active'))) = 'active' ORDER BY site_name ASC`,
    );
    return rows || [];
  }

  async getSiteById(siteId) {
    const numeric = Number(siteId);
    if (!numeric || Number.isNaN(numeric)) return null;

    const db = await this.getAdminDb();
    const communityCols = await this.getAdminTableColumns(db, 'communities');
    const communityPk = communityCols.has('community_id')
      ? 'community_id'
      : (communityCols.has('id') ? 'id' : null);
    const hasCommunityName = communityCols.has('name');
    const communityJoin = communityPk
      ? `LEFT JOIN communities c ON c.${communityPk} = s.community_id`
      : '';
    const communityNameExpr = hasCommunityName && communityPk
      ? "NULLIF(c.name, '')"
      : "NULL";

    const [rows] = await db.query(
      `
        SELECT
          s.site_id,
          s.site_name,
          LOWER(TRIM(COALESCE(${communityNameExpr}, NULLIF(s.domain, '')))) AS domain,
          s.status,
          COALESCE(s.community_id, s.site_id) AS community_id
        FROM sites s
        ${communityJoin}
        WHERE s.site_id = ?
           OR COALESCE(s.community_id, 0) = ?
        LIMIT 1
      `,
      [numeric, numeric],
    );
    if (rows?.[0]) return rows[0];

    // Fallback: resolve directly from community_table for deployments where
    // the selected value corresponds to community_id but no direct site_id row is present.
    const hasCommunityTable = await this.hasAdminTable(db, 'community_table');
    if (!hasCommunityTable) return null;

    const [communityRows] = await db.query(
      `
        SELECT
          COALESCE(s.site_id, ct.community_id) AS site_id,
          COALESCE(NULLIF(TRIM(s.site_name), ''), NULLIF(TRIM(ct.site_name), ''), 'community') AS site_name,
          LOWER(TRIM(COALESCE(${communityNameExpr}, NULLIF(s.domain, ''), NULLIF(ct.domain, ''), NULLIF(ct.site_name, '')))) AS domain,
          LOWER(TRIM(COALESCE(s.status, ct.status, 'active'))) AS status,
          ct.community_id
        FROM community_table ct
        LEFT JOIN sites s ON s.community_id = ct.community_id
        ${communityJoin}
        WHERE ct.community_id = ?
        LIMIT 1
      `,
      [numeric],
    );
    return communityRows?.[0] || null;
  }

  async getSiteByKey(siteKey) {
    const raw = String(siteKey || '').trim();
    if (!raw) return null;

    const numeric = Number(raw);
    if (!Number.isNaN(numeric) && numeric > 0) {
      return this.getSiteById(numeric);
    }

    const normalized = this.normalizeSiteKey(raw);
    const websiteForm = `${normalized}-website`;
    const db = await this.getAdminDb();
    const communityCols = await this.getAdminTableColumns(db, 'communities');
    const communityPk = communityCols.has('community_id')
      ? 'community_id'
      : (communityCols.has('id') ? 'id' : null);
    const hasCommunityName = communityCols.has('name');
    const communityJoin = communityPk
      ? `LEFT JOIN communities c ON c.${communityPk} = ct.community_id`
      : '';
    const communityNameExpr = hasCommunityName && communityPk
      ? "NULLIF(c.name, '')"
      : "NULL";
    const communityNameWhere = hasCommunityName && communityPk
      ? `OR LOWER(TRIM(${communityNameExpr})) = LOWER(TRIM(?))`
      : '';
    const params = [normalized, normalized, normalized, websiteForm];
    if (communityNameWhere) params.push(normalized);

    const [rows] = await db.query(
      `
        SELECT
          COALESCE(s.site_id, ct.community_id) AS site_id,
          COALESCE(NULLIF(TRIM(s.site_name), ''), NULLIF(TRIM(ct.site_name), ''), 'community') AS site_name,
          LOWER(TRIM(COALESCE(${communityNameExpr}, NULLIF(s.domain, ''), NULLIF(ct.domain, ''), NULLIF(ct.site_name, '')))) AS domain,
          LOWER(TRIM(COALESCE(s.status, ct.status, 'active'))) AS status,
          ct.community_id
        FROM community_table ct
        LEFT JOIN sites s ON s.community_id = ct.community_id
        ${communityJoin}
        WHERE LOWER(TRIM(COALESCE(${communityNameExpr}, NULLIF(s.domain, ''), NULLIF(ct.domain, ''), NULLIF(ct.site_name, '')))) = LOWER(TRIM(?))
           OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
           OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
           OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
           ${communityNameWhere}
        LIMIT 1
      `,
      params,
    );
    return rows?.[0] || this.getSiteById(numeric);
  }

  async connectSiteDb(site) {
    const key = String(site?.domain || site?.site_name || '').trim().toLowerCase();
    if (!key) throw new Error('Invalid site database mapping');
    return connect(key);
  }

  async resolveSiteCommunityId(site) {
    const key = String(site?.domain || site?.site_name || '').trim().toLowerCase();
    if (!key) return Number(site?.community_id || site?.site_id || 0) || null;
    return (
      await this.resolveCommunityIdByTable(key) ||
      Number((await resolveCommunityContext(key))?.community_id || 0) ||
      Number(site?.community_id || site?.site_id || 0) ||
      null
    );
  }

  async getPhysicalDbName(siteDb) {
    const [rows] = await siteDb.query('SELECT DATABASE() AS current_db');
    return String(rows?.[0]?.current_db || '').trim().toLowerCase();
  }

  async getSchema(siteDb, cacheKey = 'default') {
    if (this.schemaCache.has(cacheKey)) return this.schemaCache.get(cacheKey);

    const [cols] = await siteDb.query('SHOW COLUMNS FROM discography');
    const names = (cols || []).map((c) => String(c.Field || '').trim().toLowerCase());

    const schema = {
      albumId: names.includes('album_id') ? 'album_id' : (names.includes('id') ? 'id' : null),
      title: names.includes('title') ? 'title' : (names.includes('name') ? 'name' : null),
      songs: names.includes('count_songs') ? 'count_songs' : (names.includes('songs') ? 'songs' : null),
      year: names.includes('year')
        ? 'year'
        : (names.includes('release_date') ? 'release_date' : (names.includes('date') ? 'date' : null)),
      cover: names.includes('cover_image')
        ? 'cover_image'
        : (
          names.includes('album_link')
            ? 'album_link'
            : (
              names.includes('album_lnk')
                ? 'album_lnk'
                : (names.includes('img_url') ? 'img_url' : (names.includes('image') ? 'image' : null))
            )
        ),
      albumLink: names.includes('album_link')
        ? 'album_link'
        : (names.includes('album_lnk') ? 'album_lnk' : null),
      communityId: names.includes('community_id') ? 'community_id' : null,
      description: names.includes('description') ? 'description' : null,
      hasCreatedAt: names.includes('created_at'),
      hasUpdatedAt: names.includes('updated_at'),
    };

    this.schemaCache.set(cacheKey, schema);
    return schema;
  }

  mapAlbumRow(row, schema, site) {
    const resolvedCommunityId = Number(
      site?.resolved_community_id || site?.community_id || site?.site_id || 0,
    ) || null;
    return {
      album_id: row?.[schema.albumId || 'album_id'] ?? row?.album_id ?? row?.id ?? null,
      name: row?.[schema.title || 'title'] ?? row?.title ?? row?.name ?? '',
      songs: row?.[schema.songs || 'count_songs'] ?? row?.count_songs ?? row?.songs ?? 0,
      year: row?.[schema.year || 'year'] ?? row?.year ?? row?.release_date ?? null,
      img_url: row?.[schema.cover || 'cover_image'] ?? row?.cover_image ?? row?.album_link ?? row?.img_url ?? null,
      album_link:
        row?.[schema.albumLink || 'album_link'] ??
        row?.album_link ??
        row?.album_lnk ??
        null,
      description: row?.[schema.description || 'description'] ?? row?.description ?? null,
      created_at: schema.hasCreatedAt ? row?.created_at : null,
      updated_at: schema.hasUpdatedAt ? row?.updated_at : null,
      site_id: site.site_id,
      community_id: resolvedCommunityId,
      site_name: site.site_name,
      community_name: site.site_name,
      domain: site.domain,
      community: site.site_name,
    };
  }

  async fetchAlbumsForSite(site, specificAlbumId = null) {
    const siteDb = await this.connectSiteDb(site);
    const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));
    const resolvedCommunityId = await this.resolveSiteCommunityId(site);

    const albumIdCol = schema.albumId || 'album_id';
    const communityCol = schema.communityId;
    let query = 'SELECT * FROM discography';
    const params = [];
    const where = [];

    if (communityCol) {
      where.push(`${communityCol} = ?`);
      params.push(Number(resolvedCommunityId || 0));
    }
    if (specificAlbumId) {
      where.push(`${albumIdCol} = ?`);
      params.push(Number(specificAlbumId));
    }
    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }
    query += ` ORDER BY ${schema.year || albumIdCol} DESC`;

    const [rows] = await siteDb.query(query, params);
    const scopedSite = { ...site, resolved_community_id: resolvedCommunityId };
    return (rows || []).map((row) => this.mapAlbumRow(row, schema, scopedSite));
  }

  async findAll(siteId = null) {
    const numericSiteId = Number(siteId || 0);
    if (numericSiteId > 0) {
      const site = await this.getSiteById(numericSiteId);
      if (!site) return [];
      try {
        return await this.fetchAlbumsForSite(site);
      } catch (err) {
        console.error(`Error fetching discography for site "${site.domain}":`, err);
        return [];
      }
    }

    const sites = await this.getActiveSites();
    const processedPhysicalDbs = new Set();
    const all = [];
    for (const site of sites) {
      try {
        const siteDb = await this.connectSiteDb(site);
        const physicalDb = await this.getPhysicalDbName(siteDb);
        const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));
        // If schema has no community_id (legacy shared table), avoid duplicating
        // the same albums for every site pointing to one physical DB.
        if (!schema.communityId && physicalDb && processedPhysicalDbs.has(physicalDb)) {
          continue;
        }
        if (!schema.communityId && physicalDb) {
          processedPhysicalDbs.add(physicalDb);
        }
        const rows = await this.fetchAlbumsForSite(site);
        all.push(...rows);
      } catch (err) {
        console.error(`Error fetching discography for site "${site.domain}":`, err);
      }
    }
    return all;
  }

  async findById(id, siteId = null) {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) return null;

    const numericSiteId = Number(siteId || 0);
    if (numericSiteId > 0) {
      const site = await this.getSiteById(numericSiteId);
      if (!site) return null;
      const rows = await this.fetchAlbumsForSite(site, numericId);
      return rows[0] || null;
    }

    const sites = await this.getActiveSites();
    const processedPhysicalDbs = new Set();
    for (const site of sites) {
      try {
        const siteDb = await this.connectSiteDb(site);
        const physicalDb = await this.getPhysicalDbName(siteDb);
        const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));
        if (!schema.communityId && physicalDb && processedPhysicalDbs.has(physicalDb)) {
          continue;
        }
        if (!schema.communityId && physicalDb) {
          processedPhysicalDbs.add(physicalDb);
        }
        const rows = await this.fetchAlbumsForSite(site, numericId);
        if (rows.length) return rows[0];
      } catch (_) {}
    }
    return null;
  }

  async create({
    site_id,
    name,
    songs = null,
    year = null,
    img_url = null,
    album_link = null,
    description = null,
  }) {
    const site = await this.getSiteById(site_id);
    if (!site) throw new Error('Selected site does not exist');
    const resolvedCommunityId = await this.resolveSiteCommunityId(site);

    const siteDb = await this.connectSiteDb(site);
    const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));

    const cols = [];
    const values = [];
    const params = [];

    if (schema.title) {
      cols.push(schema.title);
      values.push('?');
      params.push(name);
    }
    if (schema.songs) {
      cols.push(schema.songs);
      values.push('?');
      params.push(songs);
    }
    if (schema.year) {
      cols.push(schema.year);
      values.push('?');
      params.push(year);
    }
    if (schema.cover) {
      cols.push(schema.cover);
      values.push('?');
      params.push(img_url);
    }
    if (schema.albumLink && schema.albumLink !== schema.cover) {
      cols.push(schema.albumLink);
      values.push('?');
      params.push(album_link);
    }
    if (schema.communityId) {
      cols.push(schema.communityId);
      values.push('?');
      params.push(Number(resolvedCommunityId || 0));
    }
    if (schema.description) {
      cols.push(schema.description);
      values.push('?');
      params.push(description);
    }
    if (schema.hasCreatedAt) {
      cols.push('created_at');
      values.push('NOW()');
    }
    if (schema.hasUpdatedAt) {
      cols.push('updated_at');
      values.push('NOW()');
    }

    if (!cols.length) throw new Error('Discography table schema is invalid');

    const [result] = await siteDb.query(
      `INSERT INTO discography (${cols.join(', ')}) VALUES (${values.join(', ')})`,
      params,
    );

    return this.findById(result.insertId, site.site_id);
  }

  async update(id, { site_id, name, songs, year, img_url, album_link, description }) {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) throw new Error('Discography item not found');

    const site = await this.getSiteById(site_id);
    if (!site) throw new Error('Selected site does not exist');
    const resolvedCommunityId = await this.resolveSiteCommunityId(site);

    const siteDb = await this.connectSiteDb(site);
    const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));

    const updates = [];
    const params = [];
    if (name !== undefined && schema.title) {
      updates.push(`${schema.title} = ?`);
      params.push(name);
    }
    if (songs !== undefined && schema.songs) {
      updates.push(`${schema.songs} = ?`);
      params.push(songs);
    }
    if (year !== undefined && schema.year) {
      updates.push(`${schema.year} = ?`);
      params.push(year);
    }
    if (img_url !== undefined && schema.cover) {
      updates.push(`${schema.cover} = ?`);
      params.push(img_url);
    }
    if (album_link !== undefined && schema.albumLink && schema.albumLink !== schema.cover) {
      updates.push(`${schema.albumLink} = ?`);
      params.push(album_link);
    }
    if (description !== undefined && schema.description) {
      updates.push(`${schema.description} = ?`);
      params.push(description);
    }
    if (schema.hasUpdatedAt) {
      updates.push('updated_at = NOW()');
    }
    if (schema.communityId) {
      updates.push(`${schema.communityId} = ?`);
      params.push(Number(resolvedCommunityId || 0));
    }

    if (!updates.length) throw new Error('Validation error');

    params.push(numericId);
    const scopedWhere = schema.communityId
      ? ` AND ${schema.communityId} = ${Number(resolvedCommunityId || 0)}`
      : '';
    const [result] = await siteDb.query(
      `UPDATE discography SET ${updates.join(', ')} WHERE ${schema.albumId || 'album_id'} = ?${scopedWhere}`,
      params,
    );
    if (!result.affectedRows) throw new Error('Discography item not found');

    return this.findById(numericId, site.site_id);
  }

  async delete(id, siteId) {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) throw new Error('Discography item not found');

    const site = await this.getSiteById(siteId);
    if (!site) throw new Error('Selected site does not exist');
    const resolvedCommunityId = await this.resolveSiteCommunityId(site);

    const siteDb = await this.connectSiteDb(site);
    const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));
    const params = [numericId];
    let scopedWhere = '';
    if (schema.communityId) {
      scopedWhere = ` AND ${schema.communityId} = ?`;
      params.push(Number(resolvedCommunityId || 0));
    }
    const [result] = await siteDb.query(
      `DELETE FROM discography WHERE ${schema.albumId || 'album_id'} = ?${scopedWhere}`,
      params,
    );
    if (!result.affectedRows) throw new Error('Discography item not found');
    return true;
  }

  async getCommunities() {
    const rows = await this.getActiveSites();
    return rows.map((site) => ({
      community_id: Number(site.community_id || site.site_id || 0) || null,
      site_id: site.site_id,
      name: site.site_name,
      site_name: site.site_name,
      domain: site.domain,
      status: site.status,
    }));
  }
}

export default DiscographyModel;
