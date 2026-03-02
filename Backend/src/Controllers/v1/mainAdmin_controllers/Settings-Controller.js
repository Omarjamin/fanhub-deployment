import SettingsModel from '../../../Models/mainAdmin_model/Settings-Model.js';

class SettingsController {
  constructor() {
    this.settingsModel = new SettingsModel();
  }

  resolveCommunity(req, res) {
    const raw =
      req.body?.community ||
      req.query?.community ||
      req.headers['x-site-slug'] ||
      req.headers['x-community-type'] ||
      res.locals?.siteSlug ||
      'global';
    return String(raw || '').trim().toLowerCase();
  }

  async getShippingRegions(req, res) {
    try {
      const community = this.resolveCommunity(req, res);

      const data = await this.settingsModel.getShippingRegions(community);
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
      const community = this.resolveCommunity(req, res);

      const provinceRegions =
        req.body?.province_regions ||
        req.body?.provinceRegions ||
        {};
      const shippingRates =
        req.body?.shipping_rates ||
        req.body?.shippingRates ||
        null;

      const data = await this.settingsModel.saveShippingRegions(
        community,
        provinceRegions,
        shippingRates,
      );

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
      const data = await this.settingsModel.getEventPosters(community);
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async saveEventPosters(req, res) {
    try {
      const community = this.resolveCommunity(req, res);
      const posters = req.body?.posters || req.body?.events || [];
      const data = await this.settingsModel.saveEventPosters(community, posters);
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export default SettingsController;
