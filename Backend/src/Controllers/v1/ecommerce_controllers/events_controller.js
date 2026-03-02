import SettingsModel from '../../../Models/mainAdmin_model/Settings-Model.js';

class EventsController {
  constructor() {
    this.settingsModel = new SettingsModel();
  }

  resolveCommunity(req, res) {
    const direct = String(
      req.query?.community ||
      req.query?.site_slug ||
      req.query?.community_type ||
      req.headers?.['x-site-slug'] ||
      req.headers?.['x-community-type'] ||
      res.locals?.siteSlug ||
      res.locals?.communityType ||
      ''
    ).trim().toLowerCase();
    if (direct) return direct;

    const referer = String(req?.headers?.referer || req?.headers?.referrer || '').trim();
    const match = referer.match(/\/fanhub\/(?:community-platform\/)?([^/?#]+)/i);
    return match ? String(match[1]).trim().toLowerCase() : '';
  }

  async getEventPosters(req, res) {
    try {
      const community = this.resolveCommunity(req, res);
      console.log('[events] getEventPosters request', {
        query: req.query || {},
        headerSite: req.headers?.['x-site-slug'] || '',
        headerCommunity: req.headers?.['x-community-type'] || '',
        referer: req.headers?.referer || req.headers?.referrer || '',
        resolvedCommunity: community,
      });
      if (!community) {
        return res.status(200).json({
          success: true,
          community: '',
          data: [],
        });
      }
      const data = await this.settingsModel.getEventPosters(community);
      console.log('[events] getEventPosters result', {
        resolvedCommunity: community,
        count: Array.isArray(data) ? data.length : 0,
        sample: Array.isArray(data) && data.length ? data[0] : null,
      });
      return res.status(200).json({
        success: true,
        community,
        data,
      });
    } catch (error) {
      console.error('[events] Error fetching ecommerce event posters:', error);
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Event posters unavailable, returned empty list',
      });
    }
  }
}

export default EventsController;
