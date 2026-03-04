import ReportModel from '../../../Models/mainAdmin_model/Report-Model.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
  if (!ADMIN_DEBUG) return;
  console.log(`[ADMIN DEBUG][Reports][${scope}]`, payload);
};

class ReportController {
  constructor() {
    this.reportModel = new ReportModel();
  }

  resolveCommunity(req, res, { fallbackAll = true, allowHeaderScope = false } = {}) {
    const numericCommunityId = Number(
      req.query?.community_id ?? req.body?.community_id ?? 0,
    );
    if (Number.isFinite(numericCommunityId) && numericCommunityId > 0) {
      return String(numericCommunityId);
    }
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
      debugLog('getReportedUsers:start', { communityType });
      const data = await this.reportModel.getReportedUsers(communityType);
      debugLog('getReportedUsers:done', { communityType, count: Array.isArray(data) ? data.length : 0 });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportedUsers error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch reported users' });
    }
  }

  async getReportedPosts(req, res) {
    try {
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      debugLog('getReportedPosts:start', { communityType });
      const data = await this.reportModel.getReportedPosts(communityType);
      debugLog('getReportedPosts:done', { communityType, count: Array.isArray(data) ? data.length : 0 });
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
      debugLog('getUserReports:start', { userId, communityType });
      const data = await this.reportModel.getUserReports(userId, communityType);
      debugLog('getUserReports:done', { userId, communityType, count: Array.isArray(data) ? data.length : 0 });
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
      debugLog('getPostReports:start', { postId, communityType });
      const data = await this.reportModel.getPostReports(postId, communityType);
      debugLog('getPostReports:done', { postId, communityType, count: Array.isArray(data) ? data.length : 0 });
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
      debugLog('takeUserAction:start', { userId, action, communityType });
      const data = await this.reportModel.takeUserAction(
        userId,
        action,
        adminId,
        reason || '',
        communityType,
      );
      debugLog('takeUserAction:done', { userId, action, communityType, ok: true });
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
      debugLog('takePostAction:start', { postId, action, communityType });
      const data = await this.reportModel.takePostAction(
        postId,
        action,
        adminId,
        reason || '',
        communityType,
      );
      debugLog('takePostAction:done', { postId, action, communityType, ok: true });
      return res.status(200).json({ success: true, data, message: data?.message || 'Post action completed' });
    } catch (error) {
      console.error('takePostAction error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to take post action' });
    }
  }

  async getReportStats(req, res) {
    try {
      const communityType = this.resolveCommunity(req, res, { fallbackAll: true, allowHeaderScope: false });
      debugLog('getReportStats:start', { communityType });
      const data = await this.reportModel.getReportStatistics(communityType);
      debugLog('getReportStats:done', { communityType, keys: Object.keys(data || {}) });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportStats error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch report stats' });
    }
  }
}

export default ReportController;
