import ReportModel from '../../../Models/mainAdmin_model/Report-Model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

class ReportController {
  constructor() {
    this.reportModel = new ReportModel();
  }

  resolveCommunity(req, res, { fallbackAll = true, allowHeaderScope = false } = {}) {
    const scoped = String(
      req.query?.community ||
      req.body?.community ||
      (allowHeaderScope ? resolveSiteSlug(req, res) : '') ||
      '',
    )
      .trim()
      .toLowerCase();
    if (!scoped && fallbackAll) return 'all';
    return scoped;
  }

  async getReportedUsers(req, res) {
    try {
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      const data = await this.reportModel.getReportedUsers(communityType);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportedUsers error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch reported users' });
    }
  }

  async getReportedPosts(req, res) {
    try {
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      const data = await this.reportModel.getReportedPosts(communityType);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportedPosts error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch reported posts' });
    }
  }

  async getUserReports(req, res) {
    try {
      const userId = Number(req.params.userId);
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      const data = await this.reportModel.getUserReports(userId, communityType);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getUserReports error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch user reports' });
    }
  }

  async getPostReports(req, res) {
    try {
      const postId = Number(req.params.postId);
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      const data = await this.reportModel.getPostReports(postId, communityType);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getPostReports error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch post reports' });
    }
  }

  async takeUserAction(req, res) {
    try {
      const userId = Number(req.params.userId);
      const adminId = Number(res.locals.userId || 0) || null;
      const { action, reason } = req.body || {};
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      const data = await this.reportModel.takeUserAction(
        userId,
        action,
        adminId,
        reason || '',
        communityType,
      );
      return res.status(200).json({ success: true, data, message: data?.message || 'User action completed' });
    } catch (error) {
      console.error('takeUserAction error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to take user action' });
    }
  }

  async takePostAction(req, res) {
    try {
      const postId = Number(req.params.postId);
      const adminId = Number(res.locals.userId || 0) || null;
      const { action, reason } = req.body || {};
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      const data = await this.reportModel.takePostAction(
        postId,
        action,
        adminId,
        reason || '',
        communityType,
      );
      return res.status(200).json({ success: true, data, message: data?.message || 'Post action completed' });
    } catch (error) {
      console.error('takePostAction error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to take post action' });
    }
  }

  async getReportStats(req, res) {
    try {
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      const data = await this.reportModel.getReportStatistics(communityType);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportStats error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch report stats' });
    }
  }
}

export default ReportController;
