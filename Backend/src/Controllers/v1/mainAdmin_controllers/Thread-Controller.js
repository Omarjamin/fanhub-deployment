import ThreadModel from '../../../Models/mainAdmin_model/Thread-Model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

class ThreadController {
  constructor() {
    this.threadModel = new ThreadModel();
  }

  async resolveSiteId(req, res, explicit = null) {
    const candidateRaw = String(
      explicit ??
      req.query?.site_id ??
      req.body?.site_id ??
      req.query?.community ??
      req.body?.community ??
      resolveSiteSlug(req, res) ??
      ''
    ).trim();
    if (!candidateRaw) return null;

    const numeric = Number(candidateRaw);
    if (!Number.isNaN(numeric) && numeric > 0) return numeric;

    const site = await this.threadModel.getSiteByKey(candidateRaw);
    return Number(site?.site_id || 0) || null;
  }

  // =========================
  // GET ALL THREADS (PUBLIC)
  // =========================
  async getAllThreads(req, res) {
    try {
      const siteId = await this.resolveSiteId(req, res);
      const threads = await this.threadModel.findAll(siteId);
      
      return res.status(200).json({
        success: true,
        data: threads,
        message: 'Threads retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllThreads:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch threads',
        message: 'An error occurred while fetching threads'
      });
    }
  }

  // =========================
  // GET THREAD BY ID (PUBLIC)
  // =========================
  async getThreadById(req, res) {
    try {
      const { id } = req.params;
      const siteId = await this.resolveSiteId(req, res);
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Thread ID is required',
          message: 'Please provide a valid thread ID'
        });
      }

      const thread = await this.threadModel.findById(id, siteId);
      
      if (!thread) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Thread not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: thread,
        message: 'Thread retrieved successfully'
      });
      
    } catch (error) {
      console.error(`Error in getThreadById: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch thread',
        message: 'An error occurred while fetching the thread'
      });
    }
  }

  // =========================
  // CREATE THREAD (ADMIN ONLY)
  // =========================
  async createThread(req, res) {
    try {
      const { title, venue, date, is_pinned } = req.body;
      const site_id = await this.resolveSiteId(req, res, req.body?.community ?? req.body?.site_id);
      const author = req.user?.username || 'Admin';

      // Input validation
      if (!title || !venue || !date || !site_id) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Title, venue, date, and site_id are required',
          fields: {
            title: !title ? 'Title is required' : undefined,
            venue: !venue ? 'Venue is required' : undefined,
            date: !date ? 'Date is required' : undefined,
            site_id: !site_id ? 'Site ID is required' : undefined
          }
        });
      }

      const newThread = await this.threadModel.create({
        title,
        venue,
        date,
        author,
        is_pinned: is_pinned || false,
        site_id
      });

      return res.status(201).json({
        success: true,
        data: newThread,
        message: 'Thread created successfully'
      });

    } catch (error) {
      console.error('Error in createThread:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create thread',
        message: 'An error occurred while creating the thread'
      });
    }
  }

  // =========================
  // UPDATE THREAD (ADMIN ONLY)
  // =========================
  async updateThread(req, res) {
    try {
      const { id } = req.params;
      const { title, venue, date, is_pinned } = req.body;
      const site_id = await this.resolveSiteId(req, res, req.body?.community ?? req.body?.site_id);

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Thread ID is required',
          message: 'Please provide a valid thread ID'
        });
      }

      if (!site_id) {
        return res.status(400).json({
          success: false,
          error: 'site_id is required',
          message: 'Please provide site_id for thread update'
        });
      }

      const updateData = {};
      if (title) updateData.title = title;
      if (venue) updateData.venue = venue;
      if (date) updateData.date = date;
      if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
      updateData.site_id = site_id;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'At least one field is required for update'
        });
      }

      const updatedThread = await this.threadModel.update(id, updateData);
      
      return res.status(200).json({
        success: true,
        data: updatedThread,
        message: 'Thread updated successfully'
      });

    } catch (error) {
      console.error(`Error in updateThread: ${error.message}`);
      
      if (error.message === 'Thread not found') {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Thread not found'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update thread',
        message: 'An error occurred while updating the thread'
      });
    }
  }

  // =========================
  // DELETE THREAD (ADMIN ONLY)
  // =========================
  async deleteThread(req, res) {
    try {
      const { id } = req.params;
      const siteId = await this.resolveSiteId(req, res);

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Thread ID is required',
          message: 'Please provide a valid thread ID'
        });
      }

      if (!siteId) {
        return res.status(400).json({
          success: false,
          error: 'site_id is required',
          message: 'Please provide site_id for thread delete'
        });
      }

      await this.threadModel.delete(id, siteId);
      
      return res.status(200).json({
        success: true,
        message: 'Thread deleted successfully'
      });

    } catch (error) {
      console.error(`Error in deleteThread: ${error.message}`);
      
      if (error.message === 'Thread not found') {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Thread not found'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete thread',
        message: 'An error occurred while deleting the thread'
      });
    }
  }

  // =========================
  // GET SITES (ADMIN ONLY)
  // =========================
  async getSites(req, res) {
    try {
      const sites = await this.threadModel.getSites();
      
      return res.status(200).json({
        success: true,
        data: sites,
        message: 'Sites retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getSites:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch sites',
        message: 'An error occurred while fetching sites'
      });
    }
  }
}

export default ThreadController;
