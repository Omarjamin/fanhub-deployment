import SettingsModel from '../../../Models/mainAdmin_model/Settings-Model.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
  if (!ADMIN_DEBUG) return;
  console.log(`[ADMIN DEBUG][Settings][${scope}]`, payload);
};

class SettingsController {
  constructor() {
    this.settingsModel = new SettingsModel();
  }

  resolvePreferredCommunityId(req) {
    const numericCommunityId = Number(
      req.body?.community_id ??
      req.query?.community_id ??
      0,
    );
    return Number.isFinite(numericCommunityId) && numericCommunityId > 0
      ? numericCommunityId
      : null;
  }

  resolveCommunity(req, res) {
    const raw =
      req.body?.community ||
      req.query?.community ||
      req.headers['x-site-slug'] ||
      req.headers['x-community-type'] ||
      res.locals?.siteSlug ||
      '';
    const normalizedRaw = String(raw || '').trim().toLowerCase();
    if (normalizedRaw && normalizedRaw !== 'global') {
      return normalizedRaw;
    }

    const numericCommunityId = Number(
      req.query?.community_id ?? req.body?.community_id ?? 0,
    );
    if (Number.isFinite(numericCommunityId) && numericCommunityId > 0) {
      return String(numericCommunityId);
    }
    return 'global';
  }

  resolveShippingScope(req, res) {
    return this.resolveCommunity(req, res);
  }

  async getShippingRegions(req, res) {
    try {
      const community = this.resolveShippingScope(req, res);
      debugLog('getShippingRegions:start', { community });

      const data = await this.settingsModel.getShippingRegions(community);
      debugLog('getShippingRegions:done', {
        community,
        provinceCount: Object.keys(data?.province_regions || {}).length,
      });
      return res.status(200).json({
        success: true,
        community,
        data,
      });
    } catch (error) {
      console.error('Error fetching shipping regions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch shipping regions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async saveShippingRegions(req, res) {
    try {
      const community = this.resolveShippingScope(req, res);

      const provinceRegions =
        req.body?.province_regions ||
        req.body?.provinceRegions ||
        {};
      const shippingRates =
        req.body?.shipping_rates ||
        req.body?.shippingRates ||
        null;
      const courierName =
        req.body?.courier_name ??
        req.body?.courierName ??
        '';
      const shippingRules =
        req.body?.shipping_rules ??
        req.body?.shippingRules ??
        [];

      debugLog('saveShippingRegions:start', {
        community,
        provinceCount: Object.keys(provinceRegions || {}).length,
        courierName,
        shippingRuleCount: Array.isArray(shippingRules) ? shippingRules.length : 0,
      });
      const data = await this.settingsModel.saveShippingRegions(
        community,
        provinceRegions,
        shippingRates,
        courierName,
        shippingRules,
      );
      debugLog('saveShippingRegions:done', { community, saved: data?.saved });

      return res.status(200).json({
        success: true,
        community,
        data,
      });
    } catch (error) {
      console.error('Error saving shipping regions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save shipping regions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async getEventPosters(req, res) {
    try {
      const community = this.resolveCommunity(req, res);
      const preferredCommunityId = this.resolvePreferredCommunityId(req);
      debugLog('getEventPosters:start', { community });
      const data = await this.settingsModel.getEventPosters(community, {
        includeEmpty: true,
        preferredCommunityId,
      });
      debugLog('getEventPosters:done', { community, count: Array.isArray(data) ? data.length : 0 });
      return res.status(200).json({
        success: true,
        community,
        data,
      });
    } catch (error) {
      console.error('Error fetching event posters:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch event posters',
        details: error?.message || 'Unknown error',
      });
    }
  }

  async saveEventPosters(req, res) {
    try {
      const community = this.resolveCommunity(req, res);
      const preferredCommunityId = this.resolvePreferredCommunityId(req);
      const posters = req.body?.posters || req.body?.events || [];
      debugLog('saveEventPosters:start', { community, count: posters.length });
      const data = await this.settingsModel.saveEventPosters(community, posters, {
        preferredCommunityId,
      });
      debugLog('saveEventPosters:done', { community, saved: data?.saved });
      return res.status(200).json({
        success: true,
        community,
        data,
      });
    } catch (error) {
      console.error('Error saving event posters:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save event posters',
        details: error?.message || 'Unknown error',
      });
    }
  }
}

export default SettingsController;
