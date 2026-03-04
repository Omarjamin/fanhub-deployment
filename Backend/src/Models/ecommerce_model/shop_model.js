import { connect, resolveCommunityContext } from '../../core/database.js';

class ShopModel {
  constructor() {
    this.db = null;
    this.activeCommunityId = null;
    this.columnCache = new Map();
    this.connect();
  }

  async connect(community_type) {
    this.db = await connect(community_type);
  }

  async ensureConnection(community_type) {
    const scoped = String(community_type || '').trim().toLowerCase();
    const ctx = await resolveCommunityContext(community_type);
    const mappedCommunityId = Number(ctx?.community_id || 0) || null;

    // First try resolved site DB
    this.db = await connect(community_type);
    let effectiveCommunityId = await this.resolveEffectiveCommunityId(scoped, mappedCommunityId);
    let hasShopTables = await this.hasAnyShopTable(this.db);

    // Deploy safety: if site DB mapping is stale/wrong, retry using default app DB.
    // Scope remains strict by community_id (no cross-community fallback).
    if (scoped && (!hasShopTables || !effectiveCommunityId)) {
      const defaultDb = await connect();
      const defaultHasShopTables = await this.hasAnyShopTable(defaultDb);
      if (defaultHasShopTables) {
        this.db = defaultDb;
        effectiveCommunityId = await this.resolveEffectiveCommunityId(scoped, mappedCommunityId);
        hasShopTables = true;
      }
    }

    this.activeCommunityId = effectiveCommunityId;
    console.log('[shop_model] scope resolved', {
      site: scoped,
      mappedCommunityId,
      effectiveCommunityId: this.activeCommunityId,
      hasShopTables,
    });

    if (scoped && !this.activeCommunityId) {
      const scopeErr = new Error(`Site/community not found for "${scoped}"`);
      scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
      throw scopeErr;
    }

    return this.db;
  }
  async hasAnyShopTable(db) {
    try {
      const [rows] = await db.query(
        `SELECT TABLE_NAME
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME IN ('collections', 'products')
         LIMIT 1`,
      );
      return Boolean(rows?.length);
    } catch (_) {
      return false;
    }
  }
  buildSlugVariants(value = '') {
    const scoped = String(value || '').trim().toLowerCase();
    if (!scoped) return [];
    const set = new Set([scoped]);
    const withoutWebsite = scoped.replace(/-website$/i, '');
    if (withoutWebsite) set.add(withoutWebsite);
    if (!/-website$/i.test(scoped)) set.add(`${scoped}-website`);
    return Array.from(set).filter(Boolean);
  }
  async tableExists(tableName) {
    try {
      const [rows] = await this.db.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
         LIMIT 1`,
        [tableName],
      );
      return Number(rows?.[0]?.count || 0) > 0;
    } catch (_) {
      return false;
    }
  }
  async resolveEffectiveCommunityId(siteSlug = '', mappedCommunityId = null) {
    const scoped = String(siteSlug || '').trim().toLowerCase();
    const primaryId = Number(mappedCommunityId || 0) || null;
    if (!scoped) return primaryId;

    const hasCommunitiesTable = await this.tableExists('communities');
    if (!hasCommunitiesTable) return primaryId;

    const variants = this.buildSlugVariants(scoped);
    if (!variants.length) return primaryId;

    const [columns] = await this.db.query(`SHOW COLUMNS FROM communities`);
    const colSet = new Set((columns || []).map((c) => String(c?.Field || '').trim().toLowerCase()));
    if (!colSet.has('community_id')) return primaryId;

    const lookupCols = ['community_type', 'site_slug', 'domain', 'site_name', 'name']
      .filter((col) => colSet.has(col));
    if (!lookupCols.length) return primaryId;

    const placeholders = variants.map(() => '?').join(', ');
    const params = [...variants];
    const where = lookupCols.map((col) => `LOWER(TRIM(${col})) IN (${placeholders})`).join(' OR ');
    const allParams = lookupCols.flatMap(() => params);

    const [rows] = await this.db.query(
      `
      SELECT community_id
      FROM communities
      WHERE ${where}
      ORDER BY community_id ASC
      LIMIT 20
      `,
      allParams,
    );

    const ids = Array.from(
      new Set((rows || []).map((r) => Number(r?.community_id || 0)).filter((n) => Number.isFinite(n) && n > 0)),
    );

    if (!ids.length) return primaryId;
    if (primaryId && ids.includes(primaryId)) return primaryId;
    return ids[0];
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



  // Get all collections for a community
  async getCollections(community_type) {
      try {
        const db = await this.ensureConnection(community_type);
        const hasGroupCommunityId = await this.hasColumn('collections', 'group_community_id');
        const hasCommunityId = await this.hasColumn('collections', 'community_id');
        const scoped = Boolean(this.activeCommunityId && (hasGroupCommunityId || hasCommunityId));
        const scopeColumn = hasGroupCommunityId ? 'group_community_id' : 'community_id';
        if ((hasGroupCommunityId || hasCommunityId) && !scoped) {
          return [];
        }
        const query = `
          SELECT *
          FROM collections
          ${scoped ? `WHERE ${scopeColumn} = ?` : ''}
          ORDER BY created_at DESC
        `;
        const [rows] = await db.query(query, scoped ? [this.activeCommunityId] : []);
        return rows;

      } catch (err) {
        if (err?.code === 'SITE_SCOPE_NOT_FOUND') throw err;
        console.error('Failed to fetch collections:', err && err.message ? err.message : err);
        return [];
      }
  } 
  

  // 3️⃣ Get products by collection
  async getProductsByCollection(collection_id, community_type) {
    const db = await this.ensureConnection(community_type);
    const hasProductsCommunityId = await this.hasColumn('products', 'community_id');
    const hasCollectionsGroupCommunityId = await this.hasColumn('collections', 'group_community_id');
    const hasCollectionsCommunityId = await this.hasColumn('collections', 'community_id');
    const scopedByProducts = Boolean(this.activeCommunityId && hasProductsCommunityId);
    const scopedByCollections = Boolean(this.activeCommunityId && (hasCollectionsGroupCommunityId || hasCollectionsCommunityId));
    const collectionScopeColumn = hasCollectionsGroupCommunityId ? 'group_community_id' : 'community_id';
    if ((hasProductsCommunityId || hasCollectionsGroupCommunityId || hasCollectionsCommunityId) && !this.activeCommunityId) {
      return [];
    }
    const query = `
      SELECT *
      FROM products
      WHERE collection_id = ?
      ${scopedByProducts ? 'AND community_id = ?' : ''}
      ${scopedByCollections ? `AND collection_id IN (SELECT collection_id FROM collections WHERE ${collectionScopeColumn} = ?)` : ''}
      ORDER BY created_at DESC
    `;
    const params = [collection_id];
    if (scopedByProducts) params.push(this.activeCommunityId);
    if (scopedByCollections) params.push(this.activeCommunityId);
    const [rows] = await db.query(query, params);
    console.log('sa shop models Fetched products!:', rows);

    return rows;

  }

  // 4️⃣ Get product variants by product
  async getProductVariants(product_id, community_type) {
    const db = await this.ensureConnection(community_type);
    try {
      const query = `
        SELECT *, COALESCE(weight_g, 0) AS weight_g
        FROM product_variants
        WHERE product_id = ?
      `;
      const [rows] = await db.query(query, [product_id]);
      console.log('Fetched product variants:', rows);
      return rows;
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
      const query = `
        SELECT *
        FROM product_variants
        WHERE product_id = ?
      `;
      const [rows] = await db.query(query, [product_id]);
      return (rows || []).map((row) => ({ ...row, weight_g: 0 }));
    }
  }

  // 5️⃣ Get featured products (e.g., latest products across community)
  async getFeaturedProducts(community_id, limit = 10) {
    const scopedCommunityId = Number(community_id || 0) || this.activeCommunityId || null;
    const hasProductsCommunityId = await this.hasColumn('products', 'community_id');
    const hasCollectionsGroupCommunityId = await this.hasColumn('collections', 'group_community_id');
    const hasCollectionsCommunityId = await this.hasColumn('collections', 'community_id');
    const collectionScopeColumn = hasCollectionsGroupCommunityId ? 'group_community_id' : 'community_id';
    const scopeByProducts = scopedCommunityId && hasProductsCommunityId;
    const scopeByCollections = scopedCommunityId && (hasCollectionsGroupCommunityId || hasCollectionsCommunityId);
    const query = `
      SELECT p.*
      FROM products p
      JOIN collections c ON p.collection_id = c.collection_id
      ${scopeByProducts || scopeByCollections ? 'WHERE 1=1' : ''}
      ${scopeByProducts ? 'AND p.community_id = ?' : ''}
      ${scopeByCollections ? `AND c.${collectionScopeColumn} = ?` : ''}
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    try {
      const params = [];
      if (scopeByProducts) params.push(scopedCommunityId);
      if (scopeByCollections) params.push(scopedCommunityId);
      params.push(limit);
      const [rows] = await this.db.query(query, params);
      return rows;
    } catch (err) {
      console.error('Error in getFeaturedProducts:', err && err.message ? err.message : err);
      return [];
    }
  }
  

  // 6️⃣ Get events for a group community
  async getEvents(group_community_id) {
    const query = `
      SELECT *
      FROM events
      WHERE group_community_id = ?
      ORDER BY event_date ASC
    `;
    const [rows] = await this.db.query(query, [group_community_id]);
    return rows;
  }

  // 7️⃣ Get announcements for a group community
  async getAnnouncements(group_community_id) {
    const query = `
      SELECT a.*, u.username AS posted_by_username
      FROM announcements a
      JOIN users u ON a.posted_by = u.user_id
      WHERE a.group_community_id = ?
      ORDER BY a.created_at DESC
    `;
    const [rows] = await this.db.query(query, [group_community_id]);
    return rows;
  }

  // 8️⃣ Get star members for a group community
  async getStarMembers(group_community_id) {
    const query = `
      SELECT *
      FROM star_members
      WHERE group_community_id = ?
      ORDER BY name ASC
    `;
    const [rows] = await this.db.query(query, [group_community_id]);
    return rows;
  }

  // 9️⃣ Get discography (albums) for a group community
  async getDiscography(group_community_id) {
    const query = `
      SELECT *
      FROM discography
      WHERE group_community_id = ?
      ORDER BY release_date DESC
    `;
    const [rows] = await this.db.query(query, [group_community_id]);
    return rows;
  }

  // 🔟 Get music tracks by album
  async getMusicByAlbum(album_id) {
    const query = `
      SELECT *
      FROM music
      WHERE album_id = ?
      ORDER BY title ASC
    `;
    const [rows] = await this.db.query(query, [album_id]);
    return rows;
  }

  async getproductdetails(product_id, community_type) {
    const db = await this.ensureConnection(community_type);
    const hasProductsCommunityId = await this.hasColumn('products', 'community_id');
    const hasCollectionsGroupCommunityId = await this.hasColumn('collections', 'group_community_id');
    const hasCollectionsCommunityId = await this.hasColumn('collections', 'community_id');
    const scopedByProducts = Boolean(this.activeCommunityId && hasProductsCommunityId);
    const scopedByCollections = Boolean(this.activeCommunityId && (hasCollectionsGroupCommunityId || hasCollectionsCommunityId));
    const collectionScopeColumn = hasCollectionsGroupCommunityId ? 'group_community_id' : 'community_id';
    if ((hasProductsCommunityId || hasCollectionsGroupCommunityId || hasCollectionsCommunityId) && !this.activeCommunityId) {
      return [];
    }
    const query = `
      SELECT *
      FROM products
      WHERE product_id = ?
      ${scopedByProducts ? 'AND community_id = ?' : ''}
      ${scopedByCollections ? `AND collection_id IN (SELECT collection_id FROM collections WHERE ${collectionScopeColumn} = ?)` : ''}
    `;
    const params = [product_id];
    if (scopedByProducts) params.push(this.activeCommunityId);
    if (scopedByCollections) params.push(this.activeCommunityId);
    const [rows] = await db.query(query, params);
    return rows;
  }

// get product by id with variants
// cart integration
// about, events, announcement implemenetation



}



export default ShopModel;
