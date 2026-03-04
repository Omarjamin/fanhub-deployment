import MarketplaceModel from '../../../Models/mainAdmin_model/Marketplace-Model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
  if (!ADMIN_DEBUG) return;
  console.log(`[ADMIN DEBUG][Marketplace][${scope}]`, payload);
};

class MarketplaceController {
  constructor() {
    this.marketplaceModel = new MarketplaceModel();
  }

  resolveCommunity(req, res, { fallbackAll = true } = {}) {
    const scoped = String(
      req.query?.community ||
      req.body?.community ||
      resolveSiteSlug(req, res) ||
      '',
    )
      .trim()
      .toLowerCase();
    if (scoped) return scoped;

    const numericCommunityId = Number(
      req.query?.community_id ?? req.body?.community_id ?? 0,
    );
    if (Number.isFinite(numericCommunityId) && numericCommunityId > 0) {
      return String(numericCommunityId);
    }

    if (!scoped && fallbackAll) return 'all';
    return scoped;
  }

  /**
   * GET /v1/admin/marketplace
   * Optional query:
   *  - community: community key (e.g. 'bini') or 'all'
   */
  async listProducts(req, res) {
    try {
      const communityKey = this.resolveCommunity(req, res, { fallbackAll: true });
      const scopedCommunity = communityKey === 'all' ? '' : communityKey;
      debugLog('listProducts:start', { communityKey, scopedCommunity });
      const filtered = await this.marketplaceModel.getProducts(scopedCommunity);
      debugLog('listProducts:done', { scopedCommunity, count: filtered.length });

      return res.status(200).json({
        success: true,
        data: filtered,
        count: filtered.length,
      });
    } catch (error) {
      if (
        error?.code === 'ER_NO_SUCH_TABLE' ||
        /doesn'?t exist|no such table/i.test(String(error?.message || ''))
      ) {
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
          warning:
            'Marketplace tables are missing in the selected community database.',
        });
      }
      console.error('Error fetching marketplace products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch marketplace products',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }

  /**
   * GET /v1/admin/marketplace/collections
   */
  async listCollections(req, res) {
    try {
      const communityKey = this.resolveCommunity(req, res, { fallbackAll: true });
      const scopedCommunity = communityKey === 'all' ? '' : communityKey;
      debugLog('listCollections:start', { communityKey, scopedCommunity });
      const data = await this.marketplaceModel.getCollections(scopedCommunity);
      debugLog('listCollections:done', { scopedCommunity, count: data.length });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      if (
        error?.code === 'ER_NO_SUCH_TABLE' ||
        /doesn'?t exist|no such table/i.test(String(error?.message || ''))
      ) {
        return res.status(200).json({
          success: true,
          data: [],
          warning:
            'Collection table is missing in the selected community database.',
        });
      }
      console.error('Error fetching collections:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch collections',
      });
    }
  }

  /**
   * POST /v1/admin/marketplace/collections
   * Body: { community, name }
   */
  async createCollection(req, res) {
    try {
      const body = req.body || {};
      const scopedCommunity = this.resolveCommunity(req, res, { fallbackAll: false });
      const name = String(body.name || '').trim();
      if (!scopedCommunity) {
        return res.status(400).json({
          success: false,
          error: 'community is required',
        });
      }
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Collection name is required',
        });
      }
      const imgUrl = String(body.img_url || body.image_url || '').trim() || null;
      debugLog('createCollection:start', { scopedCommunity, name, hasImage: Boolean(imgUrl) });
      const data = await this.marketplaceModel.createCollection(
        scopedCommunity,
        name,
        imgUrl,
      );
      debugLog('createCollection:done', data);
      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error creating collection:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create collection',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }

  /**
   * GET /v1/admin/marketplace/categories?community=&collection_id=
   */
  async listCategories(req, res) {
    try {
      const scopedCommunity = this.resolveCommunity(req, res, { fallbackAll: false });
      const collectionId = req.query.collection_id;
      debugLog('listCategories:start', { scopedCommunity, collectionId });
      if (!scopedCommunity) {
        return res.status(400).json({
          success: false,
          error: 'community is required',
        });
      }

      const data = await this.marketplaceModel.getCategories(
        scopedCommunity,
        collectionId,
      );
      debugLog('listCategories:done', { scopedCommunity, collectionId, count: data.length });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }

  /**
   * POST /v1/admin/marketplace/categories
   * Body: { community, collection_id?, collection?, category_name }
   */
  async createCategory(req, res) {
    try {
      const body = req.body || {};
      const scopedCommunity = this.resolveCommunity(req, res, { fallbackAll: false });
      const categoryName = String(body.category_name || body.category || '')
        .trim();
      let collectionId = body.collection_id;

      if (!scopedCommunity) {
        return res.status(400).json({
          success: false,
          error: 'community is required',
        });
      }

      if (collectionId == null && body.collection) {
        collectionId = await this.marketplaceModel.resolveCollectionId(
          scopedCommunity,
          body.collection,
        );
      }

      if (!collectionId) {
        return res.status(400).json({
          success: false,
          error: 'collection_id or valid collection is required',
        });
      }

      if (!categoryName) {
        return res.status(400).json({
          success: false,
          error: 'category_name is required',
        });
      }

      debugLog('createCategory:start', {
        scopedCommunity,
        collectionId,
        categoryName,
      });
      const data = await this.marketplaceModel.createCategory(
        scopedCommunity,
        collectionId,
        categoryName,
      );
      debugLog('createCategory:done', data);
      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create category',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }

  /**
   * POST /v1/admin/marketplace
   * Body: { name, collection_id?, community?, collection?, product_category?, image_url?, variants[] }
   */
  async createProduct(req, res) {
    try {
      const body = req.body || {};
      const scopedCommunity = this.resolveCommunity(req, res, { fallbackAll: false });
      let collectionId = body.collection_id;
      if (collectionId == null && scopedCommunity && body.collection) {
        collectionId = await this.marketplaceModel.resolveCollectionId(
          scopedCommunity,
          body.collection,
        );
      }
      if (!scopedCommunity) {
        return res.status(400).json({
          success: false,
          error: 'community is required',
        });
      }
      debugLog('createProduct:start', {
        scopedCommunity,
        name: body.name,
        collectionId,
        variantCount: Array.isArray(body.variants) ? body.variants.length : 0,
      });
      const payload = {
        name: body.name,
        collection_id: collectionId,
        product_category: body.product_category || 'Apparel',
        image_url: body.image_url || null,
        variants: body.variants || [],
      };
      const { product_id } = await this.marketplaceModel.createProduct(
        payload,
        scopedCommunity,
      );
      debugLog('createProduct:done', { product_id, scopedCommunity });
      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product_id },
      });
    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create product',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * PUT /v1/admin/marketplace/:productId
   * Body: { name?, collection_id?, community?, collection?, product_category?, image_url?, variants[] }
   */
  async updateProduct(req, res) {
    try {
      const productId = req.params.productId;
      const body = req.body || {};
      const scopedCommunity = this.resolveCommunity(req, res, { fallbackAll: false });
      let collectionId = body.collection_id;
      if (collectionId == null && scopedCommunity && body.collection) {
        collectionId = await this.marketplaceModel.resolveCollectionId(
          scopedCommunity,
          body.collection,
        );
      }
      if (!scopedCommunity) {
        return res.status(400).json({
          success: false,
          error: 'community is required',
        });
      }
      debugLog('updateProduct:start', {
        productId,
        scopedCommunity,
        collectionId,
      });
      const payload = {
        name: body.name,
        collection_id: collectionId,
        product_category: body.product_category,
        image_url: body.image_url,
        variants: body.variants,
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });
      await this.marketplaceModel.updateProduct(
        productId,
        payload,
        scopedCommunity,
      );
      debugLog('updateProduct:done', { productId, scopedCommunity });
      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
      });
    } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update product',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * DELETE /v1/admin/marketplace/:productId
   */
  async deleteProduct(req, res) {
    try {
      const productId = req.params.productId;
      const scopedCommunity = this.resolveCommunity(req, res, { fallbackAll: false });
      debugLog('deleteProduct:start', { productId, scopedCommunity });
      if (!scopedCommunity) {
        return res.status(400).json({
          success: false,
          error: 'community is required',
        });
      }
      const { deleted } = await this.marketplaceModel.deleteProduct(
        productId,
        scopedCommunity,
      );
      debugLog('deleteProduct:done', { productId, scopedCommunity, deleted });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete product',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }
}

export default MarketplaceController;
