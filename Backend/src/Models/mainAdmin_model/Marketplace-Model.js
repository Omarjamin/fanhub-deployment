import { connect } from '../../core/database.js';

class MarketplaceModel {
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

  /**
   * Get products with variants for admin marketplace view.
   * Currently uses the primary ecommerce DB (shared fanhubdb).
   * @returns {Promise<Array>}
   */
  async getProducts(communityType = '') {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
    const hasWeightColumn = await this.ensureVariantWeightColumn(db);

    // Fetch products with collection info
    const [products] = await db.query(
      `
        SELECT
          p.product_id,
          p.name,
          p.collection_id,
          p.product_category,
          p.image_url,
          p.created_at,
          c.name AS collection_name
        FROM products p
        LEFT JOIN collections c ON c.collection_id = p.collection_id
        ORDER BY p.created_at DESC
      `,
    );

    if (!products || products.length === 0) return [];

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
          ${hasWeightColumn ? 'weight_g' : '0 AS weight_g'}
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
      const totalStock = prodVariants.reduce(
        (sum, v) => sum + Number(v.stock || 0),
        0,
      );
      const minPrice =
        prodVariants.length > 0
          ? Math.min(...prodVariants.map(v => Number(v.price || 0)))
          : 0;

      result.push({
        product_id: row.product_id,
        name: row.name,
        collection_id: row.collection_id,
        collection_name: row.collection_name,
        product_category: row.product_category,
        image_url: row.image_url,
        created_at: row.created_at,
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
    let rows = [];
    try {
      const [withImage] = await db.query(
        'SELECT collection_id, name, img_url FROM collections ORDER BY name ASC',
      );
      rows = withImage || [];
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
      const [legacy] = await db.query(
        'SELECT collection_id, name FROM collections ORDER BY name ASC',
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
    const normalizedName = String(name || '').trim();
    const normalizedImage = imgUrl ? String(imgUrl).trim() : null;
    if (!normalizedName) throw new Error('Collection name is required');

    const [exists] = await db.query(
      `SELECT collection_id FROM collections
       WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
       LIMIT 1`,
      [normalizedName],
    );

    if (exists?.length) {
      return { collection_id: exists[0].collection_id, created: false };
    }

    let result;
    try {
      [result] = await db.query(
        `INSERT INTO collections (name, img_url) VALUES (?, ?)`,
        [normalizedName, normalizedImage],
      );
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
      [result] = await db.query(
        `INSERT INTO collections (name) VALUES (?)`,
        [normalizedName],
      );
    }
    return { collection_id: result?.insertId, created: true };
  }

  async getCategories(communityType = '', collectionId = null) {
    const scoped = String(communityType || '').trim().toLowerCase();
    const db = await connect(scoped);
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

    const [rows] = await db.query(
      `SELECT category_id, collection_id, category_name
       FROM collection_categories
       ORDER BY category_name ASC`,
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
    const name = String(collectionName || '').trim();
    if (!name) return null;

    const [rows] = await db.query(
      `SELECT collection_id FROM collections
       WHERE LOWER(TRIM(name)) = LOWER(?)
       LIMIT 1`,
      [name],
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
    const hasWeightColumn = await this.ensureVariantWeightColumn(db);
    const { name, collection_id, product_category, image_url, variants } = data;
    const collectionId = collection_id ?? null;
    const productCategory = String(product_category || 'Apparel').trim();
    const imageUrl = image_url ? String(image_url).trim() : null;

    const [prodResult] = await db.query(
      `INSERT INTO products (name, collection_id, product_category, image_url)
       VALUES (?, ?, ?, ?)`,
      [String(name || '').trim(), collectionId, productCategory, imageUrl],
    );
    const productId = prodResult?.insertId;
    if (!productId) throw new Error('Failed to create product');

    const variantList = Array.isArray(variants) ? variants : [];
    for (const v of variantList) {
      const vName = String(v.variant_name || v.variantName || 'Variant').trim();
      const vValues = String(v.variant_values ?? v.variantValue ?? '').trim();
      const price = Number(v.price);
      const stock = Number(v.stock) || 0;
      const weightG = Number(v.weight_g ?? v.weightG ?? v.weight ?? 0) || 0;
      if (isNaN(price) || price < 0) continue;
      if (hasWeightColumn) {
        await db.query(
          `INSERT INTO product_variants (product_id, variant_name, variant_values, price, stock, weight_g)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [productId, vName, vValues, price, stock, weightG],
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
    const hasWeightColumn = await this.ensureVariantWeightColumn(db);
    const id = Number(productId);
    if (Number.isNaN(id)) throw new Error('Invalid product ID');

    const { name, collection_id, product_category, image_url, variants } = data;
    const updates = [];
    const values = [];

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
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      values.push(image_url ? String(image_url).trim() : null);
    }

    if (updates.length) {
      values.push(id);
      await db.query(
        `UPDATE products SET ${updates.join(', ')} WHERE product_id = ?`,
        values,
      );
    }

    if (Array.isArray(variants)) {
      await db.query('DELETE FROM product_variants WHERE product_id = ?', [id]);
      for (const v of variants) {
        const vName = String(v.variant_name || v.variantName || 'Variant').trim();
        const vValues = String(v.variant_values ?? v.variantValue ?? '').trim();
        const price = Number(v.price);
        const stock = Number(v.stock) || 0;
        const weightG = Number(v.weight_g ?? v.weightG ?? v.weight ?? 0) || 0;
        if (isNaN(price) || price < 0) continue;
        if (hasWeightColumn) {
          await db.query(
            `INSERT INTO product_variants (product_id, variant_name, variant_values, price, stock, weight_g)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, vName, vValues, price, stock, weightG],
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
