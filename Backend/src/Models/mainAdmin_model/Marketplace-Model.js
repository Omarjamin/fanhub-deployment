import { connect, connectAdmin } from '../../core/database.js';
import { resolveCommunityContext } from '../../core/database.js';

class MarketplaceModel {
  async getCollectionCommunityScopeColumn(db) {
    if (await this.hasColumn(db, 'collections', 'group_community_id')) {
      return 'group_community_id';
    }
    if (await this.hasColumn(db, 'collections', 'community_id')) {
      return 'community_id';
    }
    return '';
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

  async resolveCommunityId(communityType = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    if (!scoped) return null;
    const numeric = Number(scoped);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;

    // Priority: community_table-based resolution.
    try {
      const adminDB = await connectAdmin();
      const hasCommunityTable = await this.hasAdminTable(adminDB, 'community_table');
      const communityCols = await this.getAdminTableColumns(adminDB, 'communities');
      const hasCommunities = communityCols.size > 0;
      const communityPk = communityCols.has('community_id')
        ? 'community_id'
        : (communityCols.has('id') ? 'id' : null);
      const hasCommunityName = communityCols.has('name');

      if (hasCommunityTable) {
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

        if (!scoped.endsWith('-website')) {
          query += ` OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?)) `;
          params.push(`${scoped}-website`);
        } else {
          const trimmed = scoped.replace(/-website$/, '');
          query += `
             OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
             OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
          `;
          params.push(trimmed, trimmed);
        }

        if (hasCommunities && hasCommunityName && communityPk) {
          query += ` OR LOWER(TRIM(c.name)) = LOWER(TRIM(?)) `;
          params.push(scoped);
        }
        query += ` LIMIT 1 `;

        const [rows] = await adminDB.query(query, params);
        const communityId = Number(rows?.[0]?.community_id || 0);
        if (communityId > 0) return communityId;
      }
    } catch (_) {}

    const ctx = await resolveCommunityContext(scoped);
    return Number(ctx?.community_id || 0) || null;
  }

  async hasColumn(db, tableName, columnName) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [tableName, columnName],
    );
    return Number(rows?.[0]?.count || 0) > 0;
  }

  async ensureVariantWeightColumn(db) {
    const exists = await this.hasColumn(db, 'product_variants', 'weight_g');
    if (exists) return true;

    try {
      await db.query(
        'ALTER TABLE product_variants ADD COLUMN weight_g DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER stock',
      );
      return true;
    } catch (error) {
      // If column was created by another request, continue.
      if (error?.code === 'ER_DUP_FIELDNAME') return true;
      return false;
    }
  }

  async ensureVariantDimensionColumn(db, columnName, afterColumn) {
    const exists = await this.hasColumn(db, 'product_variants', columnName);
    if (exists) return true;

    try {
      await db.query(
        `ALTER TABLE product_variants ADD COLUMN ${columnName} DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER ${afterColumn}`,
      );
      return true;
    } catch (error) {
      if (error?.code === 'ER_DUP_FIELDNAME') return true;
      return false;
    }
  }

  async ensureVariantShippingColumns(db) {
    const hasWeightColumn = await this.ensureVariantWeightColumn(db);
    const hasLengthColumn = await this.ensureVariantDimensionColumn(db, 'length_cm', 'weight_g');
    const hasWidthColumn = await this.ensureVariantDimensionColumn(db, 'width_cm', 'length_cm');
    const hasHeightColumn = await this.ensureVariantDimensionColumn(db, 'height_cm', 'width_cm');

    return {
      hasWeightColumn,
      hasLengthColumn,
      hasWidthColumn,
      hasHeightColumn,
    };
  }

  async ensureProductCommunityColumn(db) {
    const exists = await this.hasColumn(db, 'products', 'community_id');
    if (exists) return true;

    try {
      await db.query(
        'ALTER TABLE products ADD COLUMN community_id INT(11) NOT NULL DEFAULT 0 AFTER image_url',
      );
    } catch (error) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        return false;
      }
    }

    try {
      await db.query(
        'ALTER TABLE products ADD INDEX idx_products_community_id (community_id)',
      );
    } catch (error) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        // ignore non-critical index errors
      }
    }

    return true;
  }

  async ensureProductImageGalleryColumn(db) {
    const exists = await this.hasColumn(db, 'products', 'image_gallery');
    if (exists) return true;

    try {
      await db.query(
        'ALTER TABLE products ADD COLUMN image_gallery LONGTEXT NULL AFTER image_url',
      );
      return true;
    } catch (error) {
      if (error?.code === 'ER_DUP_FIELDNAME') return true;
      return false;
    }
  }

  async ensureProductImgUrlColumn(db) {
    const exists = await this.hasColumn(db, 'products', 'img_url');
    if (exists) return true;

    try {
      await db.query(
        'ALTER TABLE products ADD COLUMN img_url LONGTEXT NULL AFTER image_url',
      );
      return true;
    } catch (error) {
      if (error?.code === 'ER_DUP_FIELDNAME') return true;
      return false;
    }
  }

  parseImageGallery(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }

    const raw = String(value || '').trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter(Boolean);
      }
    } catch (_) {
      // keep raw fallback below
    }

    return [raw];
  }

  buildProductImageGallery(rawGallery = [], primaryImage = null, fallbackGallery = []) {
    const unique = [];
    const seen = new Set();
    const push = (candidate) => {
      const value = String(candidate || '').trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      unique.push(value);
    };

    push(primaryImage);
    this.parseImageGallery(rawGallery).forEach(push);
    this.parseImageGallery(fallbackGallery).forEach(push);
    return unique.slice(0, 3);
  }

  normalizeProductImageUrls(...sources) {
    const galleryImages = this.buildProductImageGallery(...sources);
    return galleryImages
      .map((url) => String(url || '').trim())
      .filter(Boolean);
  }

  async ensureCollectionCategoriesTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS collection_categories (
        category_id INT(11) NOT NULL AUTO_INCREMENT,
        collection_id INT(11) NOT NULL,
        category_name VARCHAR(120) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (category_id),
        UNIQUE KEY uniq_collection_category (collection_id, category_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  normalizeImageUrls(imageUrls) {
    if (Array.isArray(imageUrls)) {
      return imageUrls
        .map((url) => String(url || '').trim())
        .filter((url) => Boolean(url));
    }
    if (typeof imageUrls === 'string') {
      const raw = imageUrls.trim();
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((url) => String(url || '').trim())
            .filter((url) => Boolean(url));
        }
      } catch (_) {}
      if (raw.includes(',')) {
        return raw.split(',').map((url) => url.trim()).filter(Boolean);
      }
      return [raw];
    }
    return [];
  }

  async insertProductImages(db, productId, imageUrls = []) {
    if (!Array.isArray(imageUrls) || !imageUrls.length) return;
    for (let i = 0; i < imageUrls.length; i += 1) {
      const imageUrl = String(imageUrls[i] || '').trim();
      if (!imageUrl) continue;
      await db.query(
        `INSERT INTO product_images (product_id, image_url, sort_order)
         VALUES (?, ?, ?)`,
        [productId, imageUrl, i],
      );
    }
  }

  async replaceProductImages(db, productId, imageUrls = []) {
    await db.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
    await this.insertProductImages(db, productId, imageUrls);
  }

  /**
   * Get products with variants for admin marketplace view.
   * Currently uses the primary ecommerce DB (shared fanhubdb).
   * @returns {Promise<Array>}
   */
  async getProducts(communityType = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const scopedCommunityId = await this.resolveCommunityId(scoped);
    const hasProductCommunityId = await this.ensureProductCommunityColumn(db);
    const hasProductImgUrlColumn = await this.ensureProductImgUrlColumn(db);
    const hasImageGalleryColumn = await this.hasColumn(db, 'products', 'image_gallery');
    const collectionCommunityScopeColumn = await this.getCollectionCommunityScopeColumn(db);
    const hasCollectionCommunityId = Boolean(collectionCommunityScopeColumn);
    const {
      hasWeightColumn,
      hasLengthColumn,
      hasWidthColumn,
      hasHeightColumn,
    } = await this.ensureVariantShippingColumns(db);

    // Fetch products with collection info
    const queryParams = [];
    let scopeWhere = '';
    if (scopedCommunityId && hasCollectionCommunityId && hasProductCommunityId) {
      scopeWhere = `WHERE (COALESCE(c.${collectionCommunityScopeColumn}, 0) = ? OR COALESCE(p.community_id, 0) = ?)`;
      queryParams.push(scopedCommunityId, scopedCommunityId);
    } else if (scopedCommunityId && hasCollectionCommunityId) {
      scopeWhere = `WHERE COALESCE(c.${collectionCommunityScopeColumn}, 0) = ?`;
      queryParams.push(scopedCommunityId);
    } else if (scopedCommunityId && hasProductCommunityId) {
      scopeWhere = 'WHERE COALESCE(p.community_id, 0) = ?';
      queryParams.push(scopedCommunityId);
    }

    const [products] = await db.query(
      `
        SELECT
          p.product_id,
          p.name,
          p.collection_id,
          p.product_category,
          p.image_url,
          ${hasProductImgUrlColumn ? 'p.img_url,' : 'NULL AS img_url,'}
          ${hasImageGalleryColumn ? 'p.image_gallery,' : 'NULL AS image_gallery,'}
          ${hasProductCommunityId ? 'p.community_id,' : 'NULL AS community_id,'}
          p.created_at,
          c.name AS collection_name
        FROM products p
        LEFT JOIN collections c ON c.collection_id = p.collection_id
        ${scopeWhere}
        ORDER BY p.created_at DESC
      `,
      queryParams,
    );

    if (!products || products.length === 0) return [];

    const productIds = products
      .map((row) => Number(row?.product_id || 0))
      .filter((id) => id > 0);
    const imagesByProduct = new Map();
    if (productIds.length) {
      const placeholders = productIds.map(() => '?').join(',');
      const [images] = await db.query(
        `
          SELECT product_id, image_url, sort_order, image_id
          FROM product_images
          WHERE product_id IN (${placeholders})
          ORDER BY product_id ASC, sort_order ASC, image_id ASC
        `,
        productIds,
      );
      for (const row of images || []) {
        const list = imagesByProduct.get(row.product_id) || [];
        if (row.image_url) list.push(row.image_url);
        imagesByProduct.set(row.product_id, list);
      }
    }

    // Fetch all variants once and group by product_id
    const [variants] = await db.query(
      `
        SELECT
          variant_id,
          product_id,
          variant_name,
          variant_values,
          price,
          stock,
          ${hasWeightColumn ? 'weight_g' : '0 AS weight_g'},
          ${hasLengthColumn ? 'length_cm' : '0 AS length_cm'},
          ${hasWidthColumn ? 'width_cm' : '0 AS width_cm'},
          ${hasHeightColumn ? 'height_cm' : '0 AS height_cm'}
        FROM product_variants
      `,
    );

    const variantsByProduct = new Map();
    for (const v of variants || []) {
      const list = variantsByProduct.get(v.product_id) || [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }

    const community = {
      key: scoped || 'all',
      label: (scoped || 'all').toUpperCase(),
    };

    const result = [];

    for (const row of products) {
      const prodVariants = variantsByProduct.get(row.product_id) || [];
      const imageGallery = this.buildProductImageGallery(
        row.img_url,
        row.image_url,
        row.image_gallery,
      );
      const totalStock = prodVariants.reduce(
        (sum, v) => sum + Number(v.stock || 0),
        0,
      );
      const minPrice =
        prodVariants.length > 0
          ? Math.min(...prodVariants.map(v => Number(v.price || 0)))
          : 0;

      const baseImage = row.image_url ? String(row.image_url).trim() : '';
      let images = imagesByProduct.get(row.product_id) || [];
      if (baseImage) {
        if (!images.length) {
          images = [baseImage];
        } else if (!images.includes(baseImage)) {
          images = [baseImage, ...images];
        }
      }

      result.push({
        product_id: row.product_id,
        name: row.name,
        collection_id: row.collection_id,
        collection_name: row.collection_name,
        product_category: row.product_category,
        image_url: imageGallery[0] || row.image_url,
        img_url: hasProductImgUrlColumn
          ? (row.img_url || (imageGallery.length ? JSON.stringify(imageGallery) : null))
          : null,
        image_gallery: imageGallery,
        created_at: row.created_at,
        community_id: Number(row.community_id || scopedCommunityId || 0) || null,
        community_key: community.key,
        community_label: community.label,
        min_price: minPrice,
        total_stock: totalStock,
        variants: prodVariants,
      });
    }

    return result;
  }

  /**
   * Get collections for admin product form.
   */
  async getCollections(communityType = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const scopedCommunityId = await this.resolveCommunityId(scoped);
    const collectionCommunityScopeColumn = await this.getCollectionCommunityScopeColumn(db);
    const hasCommunityColumn = Boolean(collectionCommunityScopeColumn);
    const whereSql =
      scopedCommunityId && hasCommunityColumn ? `WHERE ${collectionCommunityScopeColumn} = ?` : '';
    const params = whereSql ? [scopedCommunityId] : [];
    let rows = [];
    try {
      const [withImage] = await db.query(
        `SELECT collection_id, name, img_url FROM collections ${whereSql} ORDER BY name ASC`,
        params,
      );
      rows = withImage || [];
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
      const [legacy] = await db.query(
        `SELECT collection_id, name FROM collections ${whereSql} ORDER BY name ASC`,
        params,
      );
      rows = legacy || [];
    }
    return (rows || []).map((r) => ({
      collection_id: r.collection_id,
      name: r.name?.trim(),
      img_url: r.img_url || null,
    }));
  }

  async createCollection(communityType = '', name = '', imgUrl = null) {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const scopedCommunityId = await this.resolveCommunityId(scoped);
    const collectionCommunityScopeColumn = await this.getCollectionCommunityScopeColumn(db);
    const hasCommunityColumn = Boolean(collectionCommunityScopeColumn);
    const normalizedName = String(name || '').trim();
    const normalizedImage = imgUrl ? String(imgUrl).trim() : null;
    if (!normalizedName) throw new Error('Collection name is required');

    const existsParams = [normalizedName];
    let existsScopeWhere = '';
    if (scopedCommunityId && hasCommunityColumn) {
      existsScopeWhere = `AND COALESCE(${collectionCommunityScopeColumn}, 0) = ?`;
      existsParams.push(scopedCommunityId);
    }
    const [exists] = await db.query(
      `SELECT collection_id FROM collections
       WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
       ${existsScopeWhere}
       LIMIT 1`,
      existsParams,
    );

    if (exists?.length) {
      return { collection_id: exists[0].collection_id, created: false };
    }

    let result;
    try {
      if (hasCommunityColumn) {
        [result] = await db.query(
          `INSERT INTO collections (${collectionCommunityScopeColumn}, name, img_url) VALUES (?, ?, ?)`,
          [scopedCommunityId || 0, normalizedName, normalizedImage],
        );
      } else {
        [result] = await db.query(
          `INSERT INTO collections (name, img_url) VALUES (?, ?)`,
          [normalizedName, normalizedImage],
        );
      }
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
      if (hasCommunityColumn) {
        [result] = await db.query(
          `INSERT INTO collections (${collectionCommunityScopeColumn}, name) VALUES (?, ?)`,
          [scopedCommunityId || 0, normalizedName],
        );
      } else {
        [result] = await db.query(
          `INSERT INTO collections (name) VALUES (?)`,
          [normalizedName],
        );
      }
    }
    return { collection_id: result?.insertId, created: true };
  }

  async getCategories(communityType = '', collectionId = null) {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const scopedCommunityId = await this.resolveCommunityId(scoped);
    const collectionCommunityScopeColumn = await this.getCollectionCommunityScopeColumn(db);
    const hasCommunityColumn = Boolean(collectionCommunityScopeColumn);
    await this.ensureCollectionCategoriesTable(db);

    const parsedCollectionId = Number(collectionId);
    if (!Number.isNaN(parsedCollectionId) && parsedCollectionId > 0) {
      const [rows] = await db.query(
        `SELECT category_id, collection_id, category_name
         FROM collection_categories
         WHERE collection_id = ?
         ORDER BY category_name ASC`,
        [parsedCollectionId],
      );
      return rows || [];
    }

    const queryParams = [];
    const whereSql =
      scopedCommunityId && hasCommunityColumn
        ? `WHERE cc.collection_id IN (
             SELECT c.collection_id FROM collections c WHERE COALESCE(c.${collectionCommunityScopeColumn}, 0) = ?
           )`
        : '';
    if (whereSql) queryParams.push(scopedCommunityId);
    const [rows] = await db.query(
      `SELECT cc.category_id, cc.collection_id, cc.category_name
       FROM collection_categories cc
       ${whereSql}
       ORDER BY cc.category_name ASC`,
      queryParams,
    );
    return rows || [];
  }

  async createCategory(communityType = '', collectionId, categoryName = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    await this.ensureCollectionCategoriesTable(db);

    const parsedCollectionId = Number(collectionId);
    const normalizedCategory = String(categoryName || '').trim();
    if (Number.isNaN(parsedCollectionId) || parsedCollectionId <= 0) {
      throw new Error('Valid collection_id is required');
    }
    if (!normalizedCategory) {
      throw new Error('Category name is required');
    }

    await db.query(
      `INSERT INTO collection_categories (collection_id, category_name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`,
      [parsedCollectionId, normalizedCategory],
    );

    const [rows] = await db.query(
      `SELECT category_id, collection_id, category_name
       FROM collection_categories
       WHERE collection_id = ? AND LOWER(TRIM(category_name)) = LOWER(TRIM(?))
       LIMIT 1`,
      [parsedCollectionId, normalizedCategory],
    );

    return rows?.[0] || null;
  }

  /**
   * Resolve collection_id from community label + collection name.
   * @param {string} communityLabel - e.g. 'BINI', 'SB19'
   * @param {string} collectionName - e.g. 'Biniverse', 'BINI World'
   */
  async resolveCollectionId(communityLabel, collectionName) {
    const scoped = String(communityLabel || '').trim().toLowerCase();
    const db = await connect(scoped);
    const scopedCommunityId = await this.resolveCommunityId(scoped);
    const collectionCommunityScopeColumn = await this.getCollectionCommunityScopeColumn(db);
    const hasCommunityColumn = Boolean(collectionCommunityScopeColumn);
    const name = String(collectionName || '').trim();
    if (!name) return null;

    const params = [name];
    let scopeWhere = '';
    if (scopedCommunityId && hasCommunityColumn) {
      scopeWhere = `AND COALESCE(${collectionCommunityScopeColumn}, 0) = ?`;
      params.push(scopedCommunityId);
    }
    const [rows] = await db.query(
      `SELECT collection_id FROM collections
       WHERE LOWER(TRIM(name)) = LOWER(?)
       ${scopeWhere}
       LIMIT 1`,
      params,
    );
    return rows?.[0]?.collection_id ?? null;
  }

  /**
   * Create a new product with variants.
   * @param {Object} data - { name, collection_id, product_category, image_url, variants[] }
   * @returns {Promise<{ product_id: number }>}
   */
  async createProduct(data, communityType = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const scopedCommunityId = await this.resolveCommunityId(scoped);
    const hasProductCommunityId = await this.ensureProductCommunityColumn(db);
    const hasProductImgUrlColumn = await this.ensureProductImgUrlColumn(db);
    const hasImageGalleryColumn = await this.ensureProductImageGalleryColumn(db);
    const {
      hasWeightColumn,
      hasLengthColumn,
      hasWidthColumn,
      hasHeightColumn,
    } = await this.ensureVariantShippingColumns(db);
    const { name, collection_id, product_category, image_url, image_gallery, img_url, variants } = data;
    const collectionId = collection_id ?? null;
    const productCategory = String(product_category || 'Apparel').trim();
    const normalizedImageUrls = this.normalizeProductImageUrls(img_url, image_url, image_gallery);
    const galleryImages = [...normalizedImageUrls];
    if (galleryImages.length > 1 && !hasImageGalleryColumn && !hasProductImgUrlColumn) {
      throw new Error('Multiple product images are not available on this database yet. Please contact support or retry after the img_url/image_gallery column is enabled.');
    }
    const imageUrl = galleryImages[0] || (image_url ? String(image_url).trim() : null);
    const productImgUrlPayload =
      hasProductImgUrlColumn && galleryImages.length
        ? JSON.stringify(galleryImages)
        : null;
    const imageGalleryPayload =
      hasImageGalleryColumn && galleryImages.length
        ? JSON.stringify(galleryImages)
        : null;

    const insertColumns = ['name', 'collection_id', 'product_category', 'image_url'];
    const insertValues = [
      String(name || '').trim(),
      collectionId,
      productCategory,
      imageUrl,
    ];

    if (hasProductImgUrlColumn) {
      insertColumns.push('img_url');
      insertValues.push(productImgUrlPayload);
    }
    if (hasImageGalleryColumn) {
      insertColumns.push('image_gallery');
      insertValues.push(imageGalleryPayload);
    }
    if (hasProductCommunityId) {
      insertColumns.push('community_id');
      insertValues.push(scopedCommunityId || 0);
    }

    const [prodResult] = await db.query(
      `INSERT INTO products (${insertColumns.join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      insertValues,
    );
    const productId = prodResult?.insertId;
    if (!productId) throw new Error('Failed to create product');

    if (normalizedImageUrls.length) {
      await this.insertProductImages(db, productId, normalizedImageUrls);
    }

    const variantList = Array.isArray(variants) ? variants : [];
    for (const v of variantList) {
      const vName = String(v.variant_name || v.variantName || 'Variant').trim();
      const vValues = String(v.variant_values ?? v.variantValue ?? '').trim();
      const price = Number(v.price);
      const stock = Number(v.stock) || 0;
      const weightG = Number(v.weight_g ?? v.weightG ?? v.weight ?? 0) || 0;
      const lengthCm = Number(v.length_cm ?? v.lengthCm ?? v.length ?? 0) || 0;
      const widthCm = Number(v.width_cm ?? v.widthCm ?? v.width ?? 0) || 0;
      const heightCm = Number(v.height_cm ?? v.heightCm ?? v.height ?? 0) || 0;
      if (isNaN(price) || price < 0) continue;
      if (hasWeightColumn && hasLengthColumn && hasWidthColumn && hasHeightColumn) {
        await db.query(
          `INSERT INTO product_variants (
            product_id,
            variant_name,
            variant_values,
            price,
            stock,
            weight_g,
            length_cm,
            width_cm,
            height_cm
          )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [productId, vName, vValues, price, stock, weightG, lengthCm, widthCm, heightCm],
        );
      } else {
        await db.query(
          `INSERT INTO product_variants (product_id, variant_name, variant_values, price, stock)
           VALUES (?, ?, ?, ?, ?)`,
          [productId, vName, vValues, price, stock],
        );
      }
    }
    return { product_id: productId };
  }

  /**
   * Update a product and replace its variants.
   * @param {number|string} productId
   * @param {Object} data - { name, collection_id, product_category, image_url, variants[] }
   */
  async updateProduct(productId, data, communityType = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const scopedCommunityId = await this.resolveCommunityId(scoped);
    const hasProductCommunityId = await this.ensureProductCommunityColumn(db);
    const hasProductImgUrlColumn = await this.ensureProductImgUrlColumn(db);
    const hasImageGalleryColumn = await this.ensureProductImageGalleryColumn(db);
    const {
      hasWeightColumn,
      hasLengthColumn,
      hasWidthColumn,
      hasHeightColumn,
    } = await this.ensureVariantShippingColumns(db);
    const id = Number(productId);
    if (Number.isNaN(id)) throw new Error('Invalid product ID');

    const { name, collection_id, product_category, image_url, image_gallery, img_url, variants } = data;
    const updates = [];
    const values = [];
    const hasImagePayload =
      image_url !== undefined ||
      image_gallery !== undefined ||
      img_url !== undefined;
    const normalizedImageUrls = hasImagePayload
      ? this.normalizeProductImageUrls(img_url, image_url, image_gallery)
      : [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(String(name).trim());
    }
    if (collection_id !== undefined) {
      updates.push('collection_id = ?');
      values.push(collection_id ? Number(collection_id) : null);
    }
    if (product_category !== undefined) {
      updates.push('product_category = ?');
      values.push(String(product_category).trim());
    }
    if (hasImagePayload) {
      const galleryImages = [...normalizedImageUrls];
      if (galleryImages.length > 1 && !hasImageGalleryColumn && !hasProductImgUrlColumn) {
        throw new Error('Multiple product images are not available on this database yet. Please contact support or retry after the img_url/image_gallery column is enabled.');
      }
      updates.push('image_url = ?');
      values.push(galleryImages[0] || null);
      if (hasProductImgUrlColumn) {
        updates.push('img_url = ?');
        values.push(galleryImages.length ? JSON.stringify(galleryImages) : null);
      }
      if (hasImageGalleryColumn) {
        updates.push('image_gallery = ?');
        values.push(galleryImages.length ? JSON.stringify(galleryImages) : null);
      }
    }
    if (hasProductCommunityId && scopedCommunityId) {
      updates.push('community_id = ?');
      values.push(scopedCommunityId);
    }

    if (updates.length) {
      values.push(id);
      await db.query(
        `UPDATE products SET ${updates.join(', ')} WHERE product_id = ?`,
        values,
      );
    }

    if (hasImagePayload) {
      await this.replaceProductImages(db, id, normalizedImageUrls);
    }

    if (Array.isArray(variants)) {
      await db.query('DELETE FROM product_variants WHERE product_id = ?', [id]);
      for (const v of variants) {
        const vName = String(v.variant_name || v.variantName || 'Variant').trim();
        const vValues = String(v.variant_values ?? v.variantValue ?? '').trim();
        const price = Number(v.price);
        const stock = Number(v.stock) || 0;
        const weightG = Number(v.weight_g ?? v.weightG ?? v.weight ?? 0) || 0;
        const lengthCm = Number(v.length_cm ?? v.lengthCm ?? v.length ?? 0) || 0;
        const widthCm = Number(v.width_cm ?? v.widthCm ?? v.width ?? 0) || 0;
        const heightCm = Number(v.height_cm ?? v.heightCm ?? v.height ?? 0) || 0;
        if (isNaN(price) || price < 0) continue;
        if (hasWeightColumn && hasLengthColumn && hasWidthColumn && hasHeightColumn) {
          await db.query(
            `INSERT INTO product_variants (
              product_id,
              variant_name,
              variant_values,
              price,
              stock,
              weight_g,
              length_cm,
              width_cm,
              height_cm
            )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, vName, vValues, price, stock, weightG, lengthCm, widthCm, heightCm],
          );
        } else {
          await db.query(
            `INSERT INTO product_variants (product_id, variant_name, variant_values, price, stock)
             VALUES (?, ?, ?, ?, ?)`,
            [id, vName, vValues, price, stock],
          );
        }
      }
    }
    return { updated: true };
  }

  /**
   * Delete a product and its variants from the database.
   * Deletes product_variants first (FK constraint), then the product.
   * @param {number|string} productId
   * @returns {Promise<{ deleted: boolean }>}
   */
  async deleteProduct(productId, communityType = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const id = Number(productId);
    if (Number.isNaN(id)) {
      throw new Error('Invalid product ID');
    }

    await db.query('DELETE FROM product_variants WHERE product_id = ?', [id]);
    const [result] = await db.query('DELETE FROM products WHERE product_id = ?', [id]);

    const deleted = result?.affectedRows > 0;
    return { deleted };
  }
}

export default MarketplaceModel;
