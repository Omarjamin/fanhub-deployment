import SuggestionModel from "../../../Models/mainAdmin_model/Suggestion-Model.js";

class SuggestionController {
  constructor() {
    this.suggestionModel = new SuggestionModel();
  }

  async createPublicSuggestion(req, res) {
    try {
      const communityName = String(req.body?.community_name || req.body?.communityName || "").trim();
      const suggestionText = String(req.body?.suggestion_text || req.body?.suggestionText || req.body?.note || "").trim();
      const contactEmailRaw = String(req.body?.contact_email || req.body?.contactEmail || "").trim();

      if (!communityName || !suggestionText) {
        return res.status(400).json({
          success: false,
          message: "community_name and suggestion_text are required",
        });
      }

      const contactEmail = contactEmailRaw || null;
      const created = await this.suggestionModel.createSuggestion({
        communityName,
        suggestionText,
        contactEmail,
      });

      return res.status(201).json({
        success: true,
        message: "Suggestion submitted successfully",
        data: created,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to submit suggestion",
      });
    }
  }

  async getUnreadSuggestions(req, res) {
    try {
      const limit = Number(req.query?.limit || 30);
      const rows = await this.suggestionModel.getUnreadSuggestions(limit);
      return res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch suggestions",
      });
    }
  }

  async markSuggestionRead(req, res) {
    try {
      const suggestionId = Number(req.params?.suggestionId);
      if (!Number.isFinite(suggestionId) || suggestionId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid suggestion id",
        });
      }

      const ok = await this.suggestionModel.markSuggestionRead(suggestionId);
      return res.status(ok ? 200 : 404).json({
        success: ok,
        message: ok ? "Suggestion marked as read" : "Suggestion not found",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to mark suggestion as read",
      });
    }
  }

  async markAllSuggestionsRead(req, res) {
    try {
      const updated = await this.suggestionModel.markAllRead();
      return res.status(200).json({
        success: true,
        message: "All suggestions marked as read",
        data: { updated },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to mark all suggestions as read",
      });
    }
  }
}

export default SuggestionController;
