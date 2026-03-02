import { connect } from '../../core/database.js';

class DiscographyModel {
  constructor() {
    this.db = null;
    this.activeSite = '';
    this.schemaCache = new Map();
  }

  async ensureDb(siteKey = '') {
    const normalizedSite = String(siteKey || '').trim().toLowerCase();
    if (!this.db || this.activeSite !== normalizedSite) {
      this.db = await connect(normalizedSite);
      this.activeSite = normalizedSite;
    }
  }

  async getAlbums(siteKey = '') {
    await this.ensureDb(siteKey);
    const schema = await this.getDiscographySchema(siteKey);
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
      ORDER BY ${schema.year} DESC, ${schema.albumId} DESC
    `;

    const [rows] = await this.db.query(query);
    return rows;
  }

  async getTracksByAlbum(albumId, siteKey = '') {
    await this.ensureDb(siteKey);
    const query = `
      SELECT *
      FROM music
      WHERE album_id = ?
      ORDER BY title ASC
    `;

    const [rows] = await this.db.query(query, [albumId]);
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
