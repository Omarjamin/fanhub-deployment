import CheckoutDraftModel from '../../../Models/ecommerce_model/checkout_draft_model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';
import { resolveCommunityContext } from '../../../core/database.js';

class CheckoutDraftController {
  constructor() {
    this.checkoutDraftModel = CheckoutDraftModel;
  }

  resolveSiteSlug(req = {}, res = {}) {
    return resolveSiteSlug(req, res);
  }

  async resolveCommunityId(siteSlug = '', fallback = null) {
    const parsedFallback = Number(fallback);
    if (Number.isFinite(parsedFallback) && parsedFallback > 0) return parsedFallback;

    const scoped = String(siteSlug || '').trim().toLowerCase();
    if (!scoped) return null;

    const context = await resolveCommunityContext(scoped);
    const communityId = Number(context?.community_id || 0);
    return Number.isFinite(communityId) && communityId > 0 ? communityId : null;
  }

  normalizeDraftPatch(body = {}) {
    const patch = {};
    const allowedKeys = [
      'current_step',
      'checkout_items',
      'summary_data',
      'shipping_address',
      'payment_data',
      'shipping_fee',
      'shipping_region',
      'checkout_weight_grams',
    ];

    allowedKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        patch[key] = body[key];
      }
    });

    return patch;
  }

  async getDraft(req, res) {
    try {
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);
      const communityId = await this.resolveCommunityId(
        siteSlug,
        req.query.community_id ?? res.locals.communityId,
      );

      if (!userId) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }
      if (!siteSlug || !communityId) {
        return res.status(400).json({ success: false, message: 'site/community scope is required' });
      }

      const draft = await this.checkoutDraftModel.getDraft(userId, communityId, siteSlug);
      return res.status(200).json({ success: true, draft });
    } catch (error) {
      console.error('Get checkout draft error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  async saveDraft(req, res) {
    try {
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);
      const communityId = await this.resolveCommunityId(
        siteSlug,
        req.body?.community_id ?? res.locals.communityId,
      );

      if (!userId) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }
      if (!siteSlug || !communityId) {
        return res.status(400).json({ success: false, message: 'site/community scope is required' });
      }

      const patch = this.normalizeDraftPatch(req.body || {});
      const draft = await this.checkoutDraftModel.saveDraft(userId, communityId, patch, siteSlug);
      return res.status(200).json({ success: true, draft });
    } catch (error) {
      console.error('Save checkout draft error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  async clearDraft(req, res) {
    try {
      const userId = res.locals.userId;
      const siteSlug = this.resolveSiteSlug(req, res);
      const communityId = await this.resolveCommunityId(
        siteSlug,
        req.query.community_id ?? req.body?.community_id ?? res.locals.communityId,
      );

      if (!userId) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }
      if (!siteSlug || !communityId) {
        return res.status(400).json({ success: false, message: 'site/community scope is required' });
      }

      const draft = await this.checkoutDraftModel.clearDraft(userId, communityId, siteSlug);
      return res.status(200).json({ success: true, draft });
    } catch (error) {
      console.error('Clear checkout draft error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
  }
}

export default new CheckoutDraftController();
