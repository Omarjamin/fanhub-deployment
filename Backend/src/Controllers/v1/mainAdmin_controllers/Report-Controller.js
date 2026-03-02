import ReportModel from '../../../Models/mainAdmin_model/Report-Model.js';

class ReportController {
  constructor() {
    this.reportModel = new ReportModel();
  }

  async getReportedUsers(req, res) {
    try {
      const data = await this.reportModel.getReportedUsers();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportedUsers error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch reported users' });
    }
  }

  async getReportedPosts(req, res) {
    try {
      const data = await this.reportModel.getReportedPosts();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportedPosts error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch reported posts' });
    }
  }

  async getUserReports(req, res) {
    try {
      const userId = Number(req.params.userId);
      const data = await this.reportModel.getUserReports(userId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getUserReports error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch user reports' });
    }
  }

  async getPostReports(req, res) {
    try {
      const postId = Number(req.params.postId);
      const data = await this.reportModel.getPostReports(postId);
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
      const data = await this.reportModel.takeUserAction(userId, action, adminId, reason || '');
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
      const data = await this.reportModel.takePostAction(postId, action, adminId, reason || '');
      return res.status(200).json({ success: true, data, message: data?.message || 'Post action completed' });
    } catch (error) {
      console.error('takePostAction error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to take post action' });
    }
  }

  async getReportStats(req, res) {
    try {
      const data = await this.reportModel.getReportStatistics();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('getReportStats error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch report stats' });
    }
  }
}

export default ReportController;

