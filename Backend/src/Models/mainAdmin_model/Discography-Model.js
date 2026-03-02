import { connect, connectAdmin } from '../../core/database.js';

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

  async getActiveSites() {
    const db = await this.getAdminDb();
    const [rows] = await db.query(
      `
        SELECT site_id, site_name, domain, status
        FROM sites
        WHERE LOWER(TRIM(COALESCE(status, 'active'))) = 'active'
        ORDER BY site_name ASC
      `,
    );
    return rows || [];
  }

  async getSiteById(siteId) {
    const numeric = Number(siteId);
    if (!numeric || Number.isNaN(numeric)) return null;

    const db = await this.getAdminDb();
    const [rows] = await db.query(
      `
        SELECT site_id, site_name, domain, status
        FROM sites
        WHERE site_id = ?
        LIMIT 1
      `,
      [numeric],
    );
    return rows?.[0] || null;
  }

  async connectSiteDb(site) {
    const key = String(site?.domain || site?.site_name || '').trim().toLowerCase();
    if (!key) throw new Error('Invalid site database mapping');
    return connect(key);
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
      description: names.includes('description') ? 'description' : null,
      hasCreatedAt: names.includes('created_at'),
      hasUpdatedAt: names.includes('updated_at'),
    };

    this.schemaCache.set(cacheKey, schema);
    return schema;
  }

  mapAlbumRow(row, schema, site) {
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
      community_id: site.site_id,
      site_name: site.site_name,
      community_name: site.site_name,
      domain: site.domain,
      community: site.site_name,
    };
  }

  async fetchAlbumsForSite(site, specificAlbumId = null) {
    const siteDb = await this.connectSiteDb(site);
    const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));

    const albumIdCol = schema.albumId || 'album_id';
    let query = 'SELECT * FROM discography';
    const params = [];
    if (specificAlbumId) {
      query += ` WHERE ${albumIdCol} = ?`;
      params.push(Number(specificAlbumId));
    }
    query += ` ORDER BY ${schema.year || albumIdCol} DESC`;

    const [rows] = await siteDb.query(query, params);
    return (rows || []).map((row) => this.mapAlbumRow(row, schema, site));
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
    const all = [];
    for (const site of sites) {
      try {
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
    for (const site of sites) {
      try {
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

    if (!updates.length) throw new Error('Validation error');

    params.push(numericId);
    const [result] = await siteDb.query(
      `UPDATE discography SET ${updates.join(', ')} WHERE ${schema.albumId || 'album_id'} = ?`,
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

    const siteDb = await this.connectSiteDb(site);
    const schema = await this.getSchema(siteDb, String(site.site_id || site.domain || 'default'));
    const [result] = await siteDb.query(
      `DELETE FROM discography WHERE ${schema.albumId || 'album_id'} = ?`,
      [numericId],
    );
    if (!result.affectedRows) throw new Error('Discography item not found');
    return true;
  }

  async getCommunities() {
    const rows = await this.getActiveSites();
    return rows.map((site) => ({
      community_id: site.site_id,
      site_id: site.site_id,
      name: site.site_name,
      site_name: site.site_name,
      domain: site.domain,
      status: site.status,
    }));
  }
}

export default DiscographyModel;
