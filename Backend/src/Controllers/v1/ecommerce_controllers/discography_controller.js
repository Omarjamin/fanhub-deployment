import DiscographyModel from '../../../Models/ecommerce_model/discography_model.js';

class DiscographyController {
  constructor() {
    this.discographyModel = new DiscographyModel();
  }

  resolveSiteKey(req) {
    const direct = String(
      req?.headers?.['x-site-slug'] ||
      req?.headers?.['x-community-type'] ||
      req?.query?.site_slug ||
      req?.query?.domain ||
      req?.body?.site_slug ||
      req?.body?.domain ||
      ''
    ).trim().toLowerCase();
    if (direct) return direct;

    const referer = String(req?.headers?.referer || req?.headers?.referrer || '').trim();
    const match = referer.match(/\/fanhub\/(?:community-platform\/)?([^/?#]+)/i);
    return match ? String(match[1]).trim().toLowerCase() : '';
  }

  async getAlbums(req, res) {
    try {
      const siteKey = this.resolveSiteKey(req);
      const albums = await this.discographyModel.getAlbums(siteKey);
      return res.status(200).json({
        success: true,
        data: albums,
        total: albums.length,
      });
    } catch (error) {
      console.error('getAlbums error:', error);
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: 'Discography unavailable, returned empty list',
      });
    }
  }

  async getTracksByAlbum(req, res) {
    try {
      const albumId = req.params.album_id || req.query.album_id;
      const siteKey = this.resolveSiteKey(req);

      if (!albumId) {
        return res.status(400).json({
          success: false,
          message: 'album_id is required',
        });
      }

      const tracks = await this.discographyModel.getTracksByAlbum(albumId, siteKey);
      return res.status(200).json({
        success: true,
        data: tracks,
        total: tracks.length,
      });
    } catch (error) {
      console.error('getTracksByAlbum error:', error);
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: 'Album tracks unavailable, returned empty list',
      });
    }
  }
}

export default DiscographyController;
