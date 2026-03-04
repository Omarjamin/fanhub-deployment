import { connect, resolveCommunityContext } from '../../core/database.js';

class DiscographyModel {
  constructor() {
    this.db = null;
    this.activeSite = '';
    this.activeCommunityId = null;
    this.schemaCache = new Map();
    this.columnCache = new Map();
  }

  async ensureDb(siteKey = '') {
    const normalizedSite = String(siteKey || '').trim().toLowerCase();
    if (!this.db || this.activeSite !== normalizedSite) {
      this.db = await connect(normalizedSite);
      // If resolved site DB is wrong/missing schema, fallback to default app DB.
      // This keeps single-database deployments working even with stale site mapping rows.
      if (normalizedSite) {
        const hasDiscographyTable = await this.hasTableOnPool(this.db, 'discography');
        if (!hasDiscographyTable) {
          this.db = await connect();
        }
      }
      this.activeSite = normalizedSite;
      try {
        const ctx = await resolveCommunityContext(normalizedSite);
        this.activeCommunityId = Number(ctx?.community_id || 0) || null;
      } catch (_) {
        this.activeCommunityId = null;
      }
    }
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
        (row) => String(row?.Field || '').trim().toLowerCase() === String(columnName).trim().toLowerCase(),
      );
      this.columnCache.set(key, exists);
      return exists;
    } catch (_) {
      this.columnCache.set(key, false);
      return false;
    }
  }

  async getAlbums(siteKey = '') {
    await this.ensureDb(siteKey);
    const schema = await this.getDiscographySchema(siteKey);
    const hasGroupCommunityId = await this.hasColumn('discography', 'group_community_id');
    const hasCommunityId = await this.hasColumn('discography', 'community_id');
    const scoped = this.activeCommunityId && (hasGroupCommunityId || hasCommunityId);
    const scopeColumn = hasGroupCommunityId ? 'group_community_id' : 'community_id';
    const query = `
      SELECT
        ${schema.albumId} AS album_id,
        ${schema.title} AS title,
        ${schema.year} AS year,
        ${schema.cover} AS cover_image,
        ${schema.songs} AS count_songs,
        ${schema.albumLink} AS album_link,
        ${schema.description} AS description
      FROM discography
      ${scoped ? `WHERE ${scopeColumn} = ?` : ''}
      ORDER BY ${schema.year} DESC, ${schema.albumId} DESC
    `;

    const [rows] = await this.db.query(query, scoped ? [this.activeCommunityId] : []);
    if ((rows || []).length) return rows;

    // Fallback to include legacy/global rows (NULL/0 community) if strict scope is empty.
    if (scoped) {
      const fallbackQuery = `
        SELECT
          ${schema.albumId} AS album_id,
          ${schema.title} AS title,
          ${schema.year} AS year,
          ${schema.cover} AS cover_image,
          ${schema.songs} AS count_songs,
          ${schema.albumLink} AS album_link,
          ${schema.description} AS description
        FROM discography
        WHERE COALESCE(${scopeColumn}, 0) IN (?, 0)
        ORDER BY ${schema.year} DESC, ${schema.albumId} DESC
      `;
      const [fallbackRows] = await this.db.query(fallbackQuery, [this.activeCommunityId]);
      if ((fallbackRows || []).length) return fallbackRows;
    }

    return rows;
  }

  async getTracksByAlbum(albumId, siteKey = '') {
    await this.ensureDb(siteKey);
    const hasGroupCommunityId = await this.hasColumn('music', 'group_community_id');
    const hasCommunityId = await this.hasColumn('music', 'community_id');
    const scoped = this.activeCommunityId && (hasGroupCommunityId || hasCommunityId);
    const scopeColumn = hasGroupCommunityId ? 'group_community_id' : 'community_id';
    const query = `
      SELECT *
      FROM music
      WHERE album_id = ?
      ${scoped ? `AND ${scopeColumn} = ?` : ''}
      ORDER BY title ASC
    `;

    const params = scoped ? [albumId, this.activeCommunityId] : [albumId];
    const [rows] = await this.db.query(query, params);
    if ((rows || []).length) return rows;

    if (scoped) {
      const fallbackQuery = `
      SELECT *
      FROM music
      WHERE album_id = ?
      AND COALESCE(${scopeColumn}, 0) IN (?, 0)
      ORDER BY title ASC
    `;
      const [fallbackRows] = await this.db.query(fallbackQuery, [albumId, this.activeCommunityId]);
      if ((fallbackRows || []).length) return fallbackRows;
    }

    return rows;
  }

  async getDiscographySchema(siteKey = '') {
    const cacheKey = String(siteKey || '').trim().toLowerCase() || '__default__';
    if (this.schemaCache.has(cacheKey)) return this.schemaCache.get(cacheKey);

    const [cols] = await this.db.query('SHOW COLUMNS FROM discography');
    const names = new Set((cols || []).map((c) => String(c?.Field || '').trim().toLowerCase()));

    const schema = {
      albumId: names.has('album_id') ? 'album_id' : (names.has('id') ? 'id' : 'album_id'),
      title: names.has('title') ? 'title' : (names.has('name') ? 'name' : "'Untitled'"),
      year: names.has('year')
        ? 'year'
        : (names.has('release_date') ? 'release_date' : (names.has('date') ? 'date' : 'NULL')),
      cover: names.has('cover_image')
        ? 'cover_image'
        : (names.has('img_url')
          ? 'img_url'
          : (names.has('image')
            ? 'image'
            : (names.has('album_link')
              ? 'album_link'
              : (names.has('album_lnk') ? 'album_lnk' : 'NULL')))),
      songs: names.has('count_songs') ? 'count_songs' : (names.has('songs') ? 'songs' : '0'),
      albumLink: names.has('album_link')
        ? 'album_link'
        : (names.has('album_lnk') ? 'album_lnk' : "''"),
      description: names.has('description') ? 'description' : "''",
    };

    this.schemaCache.set(cacheKey, schema);
    return schema;
  }
}

export default DiscographyModel;
