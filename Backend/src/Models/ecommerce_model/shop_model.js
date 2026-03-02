import { connect } from '../../core/database.js';

class ShopModel {
  constructor() {
    this.db = null;
    this.connect();
  }

  async connect(community_type) {
    this.db = await connect(community_type);
  }

  async ensureConnection(community_type) {
    try {
      this.db = await connect(community_type);
    } catch (err) {
      console.error('shop_model.ensureConnection failed:', err?.message || err);
      this.db = await connect();
    }
    return this.db;
  }



  // Get all collections for a community
  async getCollections(community_type) {
      try {
        const db = await this.ensureConnection(community_type);
        const [rows] = await db.query('SELECT * FROM collections ORDER BY created_at DESC');
        return rows;

      } catch (err) {
        console.error('Failed to fetch all collections fallback:', err && err.message ? err.message : err);
        return [];
      }
  } 
  

  // 3️⃣ Get products by collection
  async getProductsByCollection(collection_id, community_type) {
    const db = await this.ensureConnection(community_type);
    const query = `
      SELECT *
      FROM products
      WHERE collection_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(query, [collection_id]);
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
    const query = `
      SELECT p.*
      FROM products p
      JOIN collections c ON p.collection_id = c.collection_id
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    try {
      const [rows] = await this.db.query(query, [limit]);
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
    const query = `
      SELECT *
      FROM products
      WHERE product_id = ?
    `;
    const [rows] = await db.query(query, [product_id]);
    return rows;
  }

// get product by id with variants
// cart integration
// about, events, announcement implemenetation



}



export default ShopModel;
