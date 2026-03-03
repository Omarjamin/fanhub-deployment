import DiscographyModel from '../../../Models/ecommerce_model/discography_model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

class DiscographyController {
  constructor() {
    this.discographyModel = new DiscographyModel();
  }

  resolveSiteKey(req, res) {
    return resolveSiteSlug(req, res);
  }

  async getAlbums(req, res) {
    try {
      const siteKey = this.resolveSiteKey(req, res);
      if (!siteKey) {
        return res.status(400).json({
          success: false,
          message: 'site/community scope is required',
        });
      }
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
      const siteKey = this.resolveSiteKey(req, res);
      if (!siteKey) {
        return res.status(400).json({
          success: false,
          message: 'site/community scope is required',
        });
      }

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
