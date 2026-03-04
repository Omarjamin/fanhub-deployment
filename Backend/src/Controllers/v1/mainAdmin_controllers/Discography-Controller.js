import DiscographyModel from '../../../Models/mainAdmin_model/Discography-Model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
  if (!ADMIN_DEBUG) return;
  console.log(`[ADMIN DEBUG][Discography][${scope}]`, payload);
};

class DiscographyController {
  constructor() {
    this.discModel = new DiscographyModel();
  }

  async resolveSiteId(req, res, explicit = null) {
    const candidateRaw = String(
      explicit ??
      req.query?.site_id ??
      req.query?.community_id ??
      req.body?.site_id ??
      req.body?.community_id ??
      req.body?.group_community_id ??
      resolveSiteSlug(req, res) ??
      ''
    ).trim();
    if (!candidateRaw) return null;

    const numeric = Number(candidateRaw);
    if (!Number.isNaN(numeric) && numeric > 0) return numeric;

    const site = await this.discModel.getSiteByKey(candidateRaw);
    return Number(site?.site_id || 0) || null;
  }

  async list(req, res) {
    try {
      const selectedSiteId = await this.resolveSiteId(req, res);
      debugLog('list:start', { selectedSiteId, query: req.query });
      const albums = await this.discModel.findAll(selectedSiteId);
      debugLog('list:done', { selectedSiteId, count: albums.length });
      return res.status(200).json({ success: true, data: albums, message: 'Discography list retrieved' });
    } catch (err) {
      console.error('Error in DiscographyController.list:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch discography', message: 'An error occurred' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, error: 'ID required', message: 'Provide an album ID' });
      const selectedSiteId = await this.resolveSiteId(req, res);
      debugLog('getById:start', { id, selectedSiteId });
      const album = await this.discModel.findById(id, selectedSiteId);
      debugLog('getById:done', { id, selectedSiteId, found: Boolean(album) });
      if (!album) return res.status(404).json({ success: false, error: 'Not found', message: 'Album not found' });
      return res.status(200).json({ success: true, data: album, message: 'Album retrieved' });
    } catch (err) {
      console.error('Error in DiscographyController.getById:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch album', message: 'An error occurred' });
    }
  }

  async create(req, res) {
    try {
      const body = req.body || {};
      const site_id = await this.resolveSiteId(
        req,
        res,
        body.site_id || body.community_id || body.group_community_id || null,
      );
      const name = body.name || body.title || null;
      const songs = body.songs ?? body.count_songs ?? null;
      const year = body.year || body.release_date || null;
      const img_url = body.img_url || body.cover_image || body.image_url || null;
      const album_link = body.album_link || body.album_lnk || body.external_link || null;
      const description = body.description || null;

      if (!site_id || !name) {
        return res.status(400).json({ success: false, error: 'Validation error', message: 'site_id and name are required' });
      }

      debugLog('create:start', { site_id, name, songs, year });
      const created = await this.discModel.create({
        site_id,
        name,
        songs,
        year,
        img_url,
        album_link,
        description,
      });
      debugLog('create:done', { album_id: created?.album_id, site_id });
      return res.status(201).json({ success: true, data: created, message: 'Album created' });
    } catch (err) {
      console.error('Error in DiscographyController.create:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to create album', message: 'An error occurred' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const body = req.body || {};
      const site_id = await this.resolveSiteId(
        req,
        res,
        body.site_id || body.community_id || body.group_community_id || null,
      );
      if (!site_id) {
        return res.status(400).json({ success: false, error: 'Validation error', message: 'site_id is required' });
      }
      const payload = {
        site_id,
        name: body.name || body.title,
        songs: body.songs ?? body.count_songs,
        year: body.year || body.release_date,
        img_url: body.img_url || body.cover_image || body.image_url,
        album_link: body.album_link || body.album_lnk || body.external_link,
        description: body.description
      };
      if (!id) return res.status(400).json({ success: false, error: 'ID required', message: 'Provide an album ID' });

      debugLog('update:start', { id, site_id });
      const updated = await this.discModel.update(id, payload);
      debugLog('update:done', { id, site_id, updated: Boolean(updated) });
      return res.status(200).json({ success: true, data: updated, message: 'Album updated' });
    } catch (err) {
      console.error('Error in DiscographyController.update:', err);
      if (err.message === 'Discography item not found') return res.status(404).json({ success: false, error: 'Not found', message: 'Album not found' });
      if (err.message === 'Validation error') return res.status(400).json({ success: false, error: 'Validation error', message: 'No fields to update' });
      return res.status(500).json({ success: false, error: err.message || 'Failed to update album', message: 'An error occurred' });
    }
  }

  async remove(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, error: 'ID required', message: 'Provide an album ID' });
      const selectedSiteId = await this.resolveSiteId(req, res);
      debugLog('remove:start', { id, selectedSiteId });
      if (!selectedSiteId) {
        return res.status(400).json({ success: false, error: 'Validation error', message: 'site_id is required' });
      }
      await this.discModel.delete(id, selectedSiteId);
      debugLog('remove:done', { id, selectedSiteId });
      return res.status(200).json({ success: true, message: 'Album deleted' });
    } catch (err) {
      console.error('Error in DiscographyController.remove:', err);
      if (err.message === 'Discography item not found') return res.status(404).json({ success: false, error: 'Not found', message: 'Album not found' });
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete album', message: 'An error occurred' });
    }
  }

  async getCommunities(req, res) {
    try {
      const rows = await this.discModel.getCommunities();
      debugLog('getCommunities:done', { count: rows.length });
      return res.status(200).json({ success: true, data: rows, message: 'Communities retrieved' });
    } catch (err) {
      console.error('Error in DiscographyController.getCommunities:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch communities', message: 'An error occurred' });
    }
  }

  // Debug: return detected column mapping and raw column list
  async debugColumns(req, res) {
    try {
      return res.status(200).json({
        success: true,
        message: 'Discography is now resolved per-site database at runtime.',
      });
    } catch (err) {
      console.error('Error in DiscographyController.debugColumns:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to introspect columns' });
    }
  }
}

export default DiscographyController;
