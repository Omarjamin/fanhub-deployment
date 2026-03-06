import MessageModel from "../../../Models/bini_models/MessageModel.js";
import { resolveSiteSlug } from "../../../utils/site-scope.js";

class MessageController {
  constructor() {
    this.messageModel = new MessageModel();
  }
  async ensureDbForRequest(req, res) {
    const communityType = resolveSiteSlug(req, res);
    if (!communityType) {
      const err = new Error("community_type is required");
      err.statusCode = 400;
      throw err;
    }
    await this.messageModel.ensureConnection(communityType);
  }
  // Send a message
  async sendMessage(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const { receiver_id, content } = req.body;
      const sender_id = req.user?.user_id || res.locals.userId;
      const communityType = resolveSiteSlug(req, res);
      if (!receiver_id || !content)
        return res
          .status(400)
          .json({ error: "receiver_id and content are required." });

      await this.messageModel.sendMessage(sender_id, receiver_id, content);

      const messageData = {
        sender_id,
        receiver_id,
        content,
        timestamp: new Date().toISOString(),
      };

      /* real-time message */
      req.io.to(receiver_id).emit("receive_message", messageData);
      req.io.to(sender_id).emit("message_sent", messageData);

      /* real-time unread badge */
      const unreadCount = await this.messageModel.getUnreadCount(receiver_id);
      req.io
        .to(receiver_id)
        .emit("unread_count_update", { unread_count: unreadCount });

      res
        .status(201)
        .json({ success: true, message: "Message sent.", data: messageData });
    } catch (err) {
      console.error("Error sending message:", err);
      res.status(500).json({ success: false, error: "Failed to send message" });
    }
  }
  // Get messages between current user and another user
  async getMessages(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const userId = req.params.userId;
      const myId = req.user?.user_id || res.locals.userId;

      if (!userId) {
        return res.status(400).json({ error: "userId is required." });
      }

      const rows = await this.messageModel.getMessages(myId, userId);

      res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
  // Get preview messages for chat list
  async getMessagePreviews(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const myId = req.user?.user_id || res.locals.userId;
      if (!myId) return res.status(401).json({ error: "Unauthorized" });

      console.log(myId);
      const previews = await this.messageModel.getMessagePreviews(myId);

      res.status(200).json(previews);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load message previews" });
    }
  }

  async markAsRead(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const myId = req.user?.user_id || res.locals.userId;
      const senderId = req.params.senderId;
      if (!senderId)
        return res.status(400).json({ error: "senderId required" });

      const affected = await this.messageModel.markAsRead(myId, senderId);
      res.json({ success: true, affected });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  }

  // Report a user
  async reportUser(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const { reported_user_id, category, reason, image_url, message_id } = req.body;
      const reporter_id = req.user?.user_id || res.locals.userId;

      if (!reported_user_id || !category || !reason || !image_url) {
        return res.status(400).json({ 
          error: "reported_user_id, category, reason, and image_url are required." 
        });
      }

      const normalizedCategory = String(category || "").trim().toLowerCase();
      const normalizedReason = String(reason || "").trim();
      const normalizedImageUrl = String(image_url || "").trim();
      const validReasons = [
        "spam",
        "harassment",
        "misleading information",
        "inappropriate content",
        "other",
      ];
      if (!validReasons.includes(normalizedCategory)) {
        return res.status(400).json({
          error: `Invalid category. Must be: ${validReasons.join(", ")}`,
        });
      }
      if (!normalizedReason) {
        return res.status(400).json({ error: "Reason is required." });
      }
      if (normalizedReason.length > 500) {
        return res.status(400).json({ error: "Reason must be less than 500 characters." });
      }

      // Prevent self-reporting
      if (reporter_id === reported_user_id) {
        return res.status(400).json({ 
          error: "You cannot report yourself." 
        });
      }

      let linkedMessageId = message_id ? Number(message_id) : null;
      if (!Number.isFinite(linkedMessageId) || linkedMessageId <= 0) {
        linkedMessageId = await this.messageModel.getLatestConversationMessageId(
          reporter_id,
          reported_user_id,
        );
      }

      await this.messageModel.reportUser(
        reporter_id,
        reported_user_id,
        normalizedCategory,
        linkedMessageId,
        {
          reason: normalizedReason,
          image_url: normalizedImageUrl,
        },
      );

      // Check report count for automated warnings/bans
      const reportCount = await this.messageModel.getUserReportCount(reported_user_id);
      
      let action = null;
      if (reportCount >= 4 && reportCount <= 5) {
        action = "ban_recommended";
      } else if (reportCount === 3) {
        action = "warning_issued";
      }

      // Notify admins about new report
      req.io.to('admin_room').emit('new_user_report', {
        reporter_id,
        reported_user_id,
        category: normalizedCategory,
        reason: normalizedReason,
        image_url: normalizedImageUrl,
        message_id: linkedMessageId,
        report_count: reportCount,
        action,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({ 
        success: true, 
        message: "User reported successfully.",
        data: {
          reporter_id,
          reported_user_id,
          category: normalizedCategory,
          reason: normalizedReason,
          image_url: normalizedImageUrl,
          message_id: linkedMessageId,
          report_count: reportCount,
          action
        }
      });
    } catch (err) {
      console.error("Error reporting user:", err);
      res.status(500).json({ success: false, error: "Failed to report user" });
    }
  }

  // Get all reported users (Admin only)
  async getAllReportedUsers(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const reportedUsers = await this.messageModel.getAllReportedUsers();
      
      res.status(200).json({
        success: true,
        data: reportedUsers
      });
    } catch (err) {
      console.error("Error getting reported users:", err);
      res.status(500).json({ error: "Failed to get reported users" });
    }
  }

  // Get specific user reports (Admin only)
  async getUserReports(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required." });
      }

      const reports = await this.messageModel.getUserReports(userId);
      
      res.status(200).json({
        success: true,
        data: reports
      });
    } catch (err) {
      console.error("Error getting user reports:", err);
      res.status(500).json({ error: "Failed to get user reports" });
    }
  }
}

export default MessageController;
